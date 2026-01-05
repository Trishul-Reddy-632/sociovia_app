// CreativeEditor.tsx
import { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Sparkles, PenLine, Globe, Link2, Plus } from 'lucide-react';
import logo from '@/assets/sociovia_logo.png';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCampaignStore } from '@/store/campaignStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config';

const WORKSPACE_API_ROOT = API_BASE_URL;
const API_URL = API_BASE_URL;

const ctaOptions = [
  { value: 'SHOP_NOW', label: 'Shop Now' },
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'APPLY_NOW', label: 'Apply Now' },
  { value: 'CONTACT_US', label: 'Contact Us' },
];

type LocalImg = { id: string; url: string };
type AISuggestion = {
  id: string;
  primaryText?: string;
  headline?: string;
  description?: string;
  cta?: string;
  url?: string;
  score?: number;
  rawCtaText?: string;
};

// CTA fuzz mapping
function mapCtaStringToValue(ctastr?: string): string {
  if (!ctastr || typeof ctastr !== 'string') return 'LEARN_MORE';
  const s = ctastr.trim().toLowerCase();
  if (/\b(shop|buy|purchase|order|get)\b/.test(s)) return 'SHOP_NOW';
  if (/\b(learn|learn more|more info|discover|explore)\b/.test(s)) return 'LEARN_MORE';
  if (/\b(sign|register|join|create account)\b/.test(s)) return 'SIGN_UP';
  if (/\b(apply|apply now|submit application)\b/.test(s)) return 'APPLY_NOW';
  if (/\b(contact|get in touch|contact us|call)\b/.test(s)) return 'CONTACT_US';
  if (s.includes('buy') || s.includes('shop') || s.includes('order')) return 'SHOP_NOW';
  if (s.includes('learn') || s.includes('discover') || s.includes('explore')) return 'LEARN_MORE';
  if (s.includes('sign') || s.includes('register') || s.includes('join')) return 'SIGN_UP';
  if (s.includes('apply')) return 'APPLY_NOW';
  if (s.includes('contact')) return 'CONTACT_US';
  return 'LEARN_MORE';
}

// Try to read cookie by name
function getCookie(name: string): string | null {
  try {
    const m = document.cookie.match(new RegExp('(^|; )' + name.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1') + '=([^;]*)'));
    return m ? decodeURIComponent(m[2]) : null;
  } catch {
    return null;
  }
}

// Attempt to extract a user id from common places
function detectUserIdFromClient(store: any): string | null {
  // 1) check sessionStorage and localStorage known keys
  const candidates = [
    'sv_user_id',
    'sv_userid',
    'user_id',
    'userId',
    'current_user_id',
    'sv_current_user_id',
    'sv_user',
    'user',
  ];
  for (const k of candidates) {
    try {
      const v = sessionStorage.getItem(k) ?? localStorage.getItem(k);
      if (!v) continue;
      // if value looks like JSON, try parse for id
      if (v.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(v);
          if (parsed && (parsed.id || parsed.user_id || parsed.userId)) {
            return String(parsed.id ?? parsed.user_id ?? parsed.userId);
          }
        } catch { }
      }
      // numeric or string id
      if (v && v.trim().length > 0) return v.trim();
    } catch { }
  }

  // 2) check sv_user JSON in storage
  try {
    const raw = sessionStorage.getItem('sv_user') ?? localStorage.getItem('sv_user');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.id || parsed.user_id || parsed.userId)) return String(parsed.id ?? parsed.user_id ?? parsed.userId);
      } catch { }
    }
  } catch { }

  // 3) try to read a cookie often used: 'sv_user', 'user', 'session'
  const cookieCandidates = ['sv_user', 'user', 'session', 'sv_session'];
  for (const c of cookieCandidates) {
    const val = getCookie(c);
    if (!val) continue;
    if (val.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(val);
        if (parsed && (parsed.id || parsed.user_id || parsed.userId)) return String(parsed.id ?? parsed.user_id ?? parsed.userId);
      } catch { }
    } else {
      if (val && val.trim().length > 0) return val.trim();
    }
  }

  // 4) check zustand store if it contains user info
  try {
    if (store && (store.user || store.currentUser || store.authUser)) {
      const u = store.user ?? store.currentUser ?? store.authUser;
      if (u && (u.id || u.user_id || u.userId)) return String(u.id ?? u.user_id ?? u.userId);
    }
  } catch { }

  return null;
}

export default function CreativeEditor(): JSX.Element {
  const creative = useCampaignStore((s: any) => s.creative);
  const setCreative = useCampaignStore((s: any) => s.setCreative);
  const setStep = useCampaignStore((s: any) => s.setStep);
  const storeWorkspace = useCampaignStore((s: any) => s.workspace);
  // pass the entire store to user-id detector (may be undefined in some cases)
  const entireStore = useCampaignStore.getState();
  const selectedImages = useCampaignStore((s: any) => s.selectedImages);

  const navigate = useNavigate();

  const [localImage, setLocalImage] = useState<LocalImg | null>(null);
  const [primaryText, setPrimaryText] = useState<string>(creative?.primaryText ?? '');
  const [headline, setHeadline] = useState<string>(creative?.headline ?? '');
  const [description, setDescription] = useState<string>(creative?.description ?? '');
  const [cta, setCta] = useState<string>(creative?.cta ?? 'SHOP_NOW');
  const [url, setUrl] = useState<string>(creative?.url ?? '');

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);

  // AI rewrite loading states for each field
  const [rewritingPrimaryText, setRewritingPrimaryText] = useState(false);
  const [rewritingHeadline, setRewritingHeadline] = useState(false);
  const [rewritingDescription, setRewritingDescription] = useState(false);

  // State to track which field is showing suggestions and what those suggestions are
  const [rewriteState, setRewriteState] = useState<{
    field: 'primaryText' | 'headline' | 'description' | null;
    options: string[];
    isOpen: boolean;
  }>({
    field: null,
    options: [],
    isOpen: false,
  });

  const [showDebug] = useState(false);

  const extractUrl = (item: any): string | null => {
    if (!item) return null;
    if (typeof item === 'string') return item.trim() || null;
    if (typeof item === 'object') {
      return (item.url ?? item.src ?? item.path ?? item.image ?? item.storage_url ?? null) as string | null;
    }
    return null;
  };

  const mapSelectedImages = (sel: any): LocalImg[] => {
    if (!sel || !Array.isArray(sel.images)) return [];
    return sel.images
      .map((it: any, idx: number) => {
        const url = extractUrl(it.url ?? it);
        const id = it.id ? String(it.id) : `sel-${idx}`;
        return url ? { id, url } : null;
      })
      .filter(Boolean) as LocalImg[];
  };

  const mapWorkspaceToImages = (w: any): LocalImg[] => {
    if (!w) return [];
    const out: LocalImg[] = [];
    const push = (u: any, idSeed: string) => {
      const url = extractUrl(u);
      if (!url) return;
      out.push({ id: `${idSeed}-${out.length}`, url });
    };
    if (Array.isArray(w?.creatives_path) && w.creatives_path.length) {
      w.creatives_path.forEach((it: any, i: number) => push(it, `ws-${w.id ?? 'x'}-cp-${i}`));
    }
    if (out.length === 0 && Array.isArray(w?.creatives) && w.creatives.length) {
      w.creatives.forEach((it: any, i: number) => push(it, `ws-${w.id ?? 'x'}-c-${i}`));
    }
    if (out.length === 0 && Array.isArray(w?.images) && w.images.length) {
      w.images.forEach((it: any, i: number) => push(it, it?.id ? `img-${it.id}` : `ws-${w.id ?? 'x'}-img-${i}`));
    }
    if (out.length === 0 && w?.workspace && Array.isArray(w.workspace.creatives_path)) {
      w.workspace.creatives_path.forEach((it: any, i: number) => push(it, `ws-${w.workspace.id ?? 'x'}-cp-${i}`));
    }
    return out;
  };

  const readWorkspaceFromLocalStorageFallback = (): any | null => {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('workspace_'));
      if (keys.length === 0) return null;
      const chosen = keys.sort().reverse()[0];
      const raw = localStorage.getItem(chosen);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.workspace ?? parsed;
    } catch (e) {
      if (showDebug) console.error('Failed to read workspace from localStorage', e);
      return null;
    }
  };

  const readLastSavedImageFromLocalSavedImages = (): LocalImg | null => {
    try {
      const raw = localStorage.getItem('local_saved_images');
      if (!raw) return null;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr) || arr.length === 0) return null;
      const last = arr[arr.length - 1];
      const url = (last && (last.url || last.path || last.storage_url)) ?? null;
      if (!url) return null;
      const id = last.id ? String(last.id) : `local_saved_${arr.length - 1}`;
      return { id, url };
    } catch (e) {
      if (showDebug) console.error('Failed to read local_saved_images', e);
      return null;
    }
  };

  const applySavedImage = (img: LocalImg | null) => {
    if (!img) return;
    setLocalImage(img);
    try {
      const current = useCampaignStore.getState().creative ?? {};
      const currentUrl = current.imageUrl ?? null;
      if (!currentUrl || currentUrl !== img.url) {
        setCreative({ imageUrl: img.url, imageId: img.id });
      }
    } catch (err) {
      try {
        setCreative({ imageUrl: img.url, imageId: img.id });
      } catch (e) {
        if (showDebug) console.error('Failed to set creative on store', e);
      }
    }
  };

  useEffect(() => {
    setPrimaryText(creative?.primaryText ?? '');
    setHeadline(creative?.headline ?? '');
    setDescription(creative?.description ?? '');
    setCta(creative?.cta ?? 'SHOP_NOW');
    setUrl(creative?.url ?? '');
    if (creative?.imageUrl) {
      setLocalImage((prev) => (prev && prev.url === creative.imageUrl ? prev : { id: creative.imageId ?? 'store', url: creative.imageUrl }));
    }
     
  }, [creative?.primaryText, creative?.headline, creative?.description, creative?.cta, creative?.url, creative?.imageUrl, creative?.imageId]);

  useEffect(() => {
    try {
      let firstImage: LocalImg | null = null;
      const selImgs = mapSelectedImages(selectedImages);
      if (selImgs.length > 0) firstImage = selImgs[0];
      if (!firstImage) {
        const wsImgs = mapWorkspaceToImages(storeWorkspace);
        if (wsImgs.length > 0) firstImage = wsImgs[0];
      }
      if (!firstImage) {
        const ls = readWorkspaceFromLocalStorageFallback();
        const lsImgs = mapWorkspaceToImages(ls);
        if (lsImgs.length > 0) firstImage = lsImgs[0];
      }
      if (!firstImage) {
        const lastSaved = readLastSavedImageFromLocalSavedImages();
        if (lastSaved) firstImage = lastSaved;
      }
      if (firstImage) {
        setLocalImage(firstImage);
        if (!creative?.imageUrl) {
          setCreative({ imageUrl: firstImage.url, imageId: firstImage.id });
        }
      }
    } catch (err) {
      console.error('Unexpected error in image mapping effect', err);
    }
     
  }, [selectedImages, storeWorkspace]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'local_saved_images') {
        const lastSaved = readLastSavedImageFromLocalSavedImages();
        if (lastSaved) applySavedImage(lastSaved);
      }
    };

    const onCustom = (e: Event) => {
      try {
        const ce = e as CustomEvent;
        const detail = ce?.detail ?? null;
        if (detail && (detail.url || detail.path || detail.storage_url)) {
          const url = detail.url ?? detail.path ?? detail.storage_url;
          const id = detail.id ? String(detail.id) : `local_saved_${Date.now()}`;
          applySavedImage({ id, url });
          return;
        }
        const lastSaved = readLastSavedImageFromLocalSavedImages();
        if (lastSaved) applySavedImage(lastSaved);
      } catch (err) {
        if (showDebug) console.error('Error handling local_saved_images_updated', err);
      }
    };

    try {
      const initial = readLastSavedImageFromLocalSavedImages();
      if (initial) applySavedImage(initial);
    } catch (e) {
      if (showDebug) console.error('Initial read of local_saved_images failed', e);
    }

    window.addEventListener('storage', onStorage);
    window.addEventListener('local_saved_images_updated', onCustom as EventListener);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('local_saved_images_updated', onCustom as EventListener);
    };
     
  }, []);

  const onPrimaryTextChange = (v: string) => {
    setPrimaryText(v);
    setCreative({ primaryText: v });
  };
  const onHeadlineChange = (v: string) => {
    setHeadline(v);
    setCreative({ headline: v });
  };
  const onDescriptionChange = (v: string) => {
    setDescription(v);
    setCreative({ description: v });
  };
  const onCtaChange = (v: string) => {
    setCta(v);
    setCreative({ cta: v });
  };
  const onUrlChange = (v: string) => {
    setUrl(v);
    setCreative({ url: v });
  };

  const buildWorkspaceSummary = (w: any) => {
    if (!w) return null;
    try {
      return {
        id: w.id ?? null,
        name: w.name ?? w.business_name ?? w.organization_name ?? null,
        business_type: w.business_type ?? null,
        industry: w.industry ?? w.category ?? null,
        website: w.website ?? w.website_url ?? w.site ?? null,
        description: w.description ?? w.describe_business ?? w.summary ?? null,
        creatives_count: Array.isArray(w.creatives) ? w.creatives.length : Array.isArray(w.creatives_path) ? w.creatives_path.length : 0,
        creatives_preview: (Array.isArray(w.creatives) ? w.creatives : Array.isArray(w.creatives_path) ? w.creatives_path : []).slice(0, 6).map((c: any) => ({
          id: c?.id ?? null,
          url: extractUrl(c) ?? null,
        })),
        raw: w,
      };
    } catch (err) {
      return { raw: w };
    }
  };

  // Enhanced workspace fetch: includes user_id (from session/local/cookie/store) and tries param variants and POST fallback
  const fetchWorkspaceFromSessionIfNeeded = async (): Promise<any | null> => {
    if (storeWorkspace) return storeWorkspace;
    try {
      const rawSid = sessionStorage.getItem('sv_selected_workspace_id') ?? localStorage.getItem('sv_selected_workspace_id');
      if (!rawSid) {
        console.debug('[WS] no sv_selected_workspace_id in sessionStorage/localStorage');
        return null;
      }
      const wsId = Number(rawSid);
      if (!Number.isFinite(wsId) || wsId <= 0) {
        console.warn('[WS] invalid workspace id from storage:', rawSid);
        return null;
      }

      // try detect user id
      const detectedUserId = detectUserIdFromClient(entireStore);
      if (!detectedUserId) {
        console.warn('[WS] no user id detected in sessionStorage/localStorage/cookies/store — endpoint requires user_id');
      }

      const paramVars = ['workspace_id', 'workspaceId', 'id'];
      for (const paramName of paramVars) {
        const endpoint = `${WORKSPACE_API_ROOT}/api/workspace?${encodeURIComponent(paramName)}=${encodeURIComponent(String(wsId))}` + (detectedUserId ? `&user_id=${encodeURIComponent(detectedUserId)}` : '');
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 6000);
          const headers: any = { Accept: 'application/json' };
          if (detectedUserId) headers['X-User-Id'] = String(detectedUserId);
          const res = await fetch(endpoint, { method: 'GET', signal: controller.signal, headers, mode: 'cors' });
          clearTimeout(timeout);
          if (res && res.ok) {
            const json = await res.json().catch(() => null);
            const ws = (json && (json.workspace ?? json)) || null;
            console.debug(`[WS] fetched workspace via GET ${paramName}`, ws);
            return ws;
          }
          if (res) {
            const body = await res.text().catch(() => '<no-body>');
            console.warn(`[WS] GET ${endpoint} -> ${res.status} ${res.statusText} body:`, body);
            // continue trying other param variants
          }
        } catch (err: any) {
          if (err.name === 'AbortError') console.warn(`[WS] GET ${paramName} aborted (timeout)`);
          else console.warn(`[WS] GET ${paramName} failed`, err);
        }
      }

      // POST fallback (send workspace_id + user_id)
      try {
        const controller2 = new AbortController();
        const timeout2 = setTimeout(() => controller2.abort(), 6000);
        const bodyObj: any = { workspace_id: wsId };
        if (detectedUserId) bodyObj.user_id = detectedUserId;
        const postRes = await fetch(`${WORKSPACE_API_ROOT}/api/workspace`, {
          method: 'POST',
          signal: controller2.signal,
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(detectedUserId ? { 'X-User-Id': String(detectedUserId) } : {}) },
          body: JSON.stringify(bodyObj),
          mode: 'cors',
        });
        clearTimeout(timeout2);
        if (postRes.ok) {
          const j = await postRes.json().catch(() => null);
          const ws = (j && (j.workspace ?? j)) || null;
          console.debug('[WS] fetched workspace via POST fallback', ws);
          return ws;
        } else {
          const bodyText = await postRes.text().catch(() => '<no-body>');
          console.warn(`[WS] POST fallback returned ${postRes.status} ${postRes.statusText} -> body:`, bodyText);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') console.warn('[WS] POST fallback aborted (timeout)');
        else console.warn('[WS] POST fallback error', err);
      }

      return null;
    } catch (err) {
      console.error('[WS] unexpected error in fetchWorkspaceFromSessionIfNeeded', err);
      return null;
    }
  };

  // fetch AI suggestions — attaches workspace (from store or session) to payload
  const fetchAiSuggestions = async () => {
    setAiError(null);
    setAiSuggestions([]);
    setAiLoading(true);

    let usedWorkspace = storeWorkspace ?? null;
    let workspaceIdToSend: number | null = null;

    try {
      if (!usedWorkspace) {
        const fetched = await fetchWorkspaceFromSessionIfNeeded();
        if (fetched) {
          usedWorkspace = fetched;
          if (usedWorkspace?.id) workspaceIdToSend = Number(usedWorkspace.id);
        }
      } else {
        if (usedWorkspace?.id) workspaceIdToSend = Number(usedWorkspace.id);
      }

      const imageUrl = creative?.imageUrl || localImage?.url || null;
      const payload: any = {
        workspace: buildWorkspaceSummary(usedWorkspace) ?? null,
        workspace_id: workspaceIdToSend ?? null,
        imageUrl,
        selectedImages: mapSelectedImages(selectedImages),
        context: {
          objective: useCampaignStore.getState().objective ?? null,
          audience: useCampaignStore.getState().audience ?? null,
          workspaceWebsite: usedWorkspace?.website ?? usedWorkspace?.website_url ?? null,
          campaignBudget: useCampaignStore.getState().budget ?? null,
        },
        timestamp: new Date().toISOString(),
      };

      console.debug('[AI] sending payload to backend', payload);

      const res = await fetch(`${API_URL}/api/v1/generate-copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`AI suggestion API failed: ${res.status} ${text}`);
      }

      const json = await res.json().catch(() => ({}));
      let suggestions: any[] = Array.isArray(json?.suggestions) ? json.suggestions : [];

      if ((!suggestions || suggestions.length === 0) && Array.isArray(json?.data)) suggestions = json.data;
      if ((!suggestions || suggestions.length === 0) && Array.isArray(json?.result)) suggestions = json.result;
      if ((!suggestions || suggestions.length === 0) && Array.isArray(json?.variations)) suggestions = json.variations;

      const backendWorkspace = json?.workspace ?? null;
      const workspaceFallback = (usedWorkspace || backendWorkspace) ?? null;
      const workspaceUrlFallback = workspaceFallback?.website ?? workspaceFallback?.website_url ?? '';

      const normalized = (Array.isArray(suggestions) ? suggestions : [])
        .map((s: any, idx: number) => {
          const rawHeadline = s.headline ?? s.title ?? s.heading ?? undefined;
          const rawDescription = s.description ?? s.desc ?? s.body ?? s.text ?? undefined;
          const rawCta = s.cta ?? s.call_to_action ?? s.button ?? undefined;
          const rawUrl = extractUrl(s.url ?? s.destination ?? s.link ?? undefined) ?? undefined;
          const mappedCtaValue = mapCtaStringToValue(typeof rawCta === 'string' ? rawCta : undefined);
          return {
            id: s.id ?? String(idx),
            headline: typeof rawHeadline === 'string' ? rawHeadline.trim() : undefined,
            description: typeof rawDescription === 'string' ? rawDescription.trim() : undefined,
            primaryText: typeof rawDescription === 'string' ? rawDescription.trim() : undefined,
            cta: mappedCtaValue,
            rawCtaText: typeof rawCta === 'string' ? rawCta.trim() : undefined,
            url: rawUrl || workspaceUrlFallback || undefined,
            score: typeof s.score === 'number' ? s.score : undefined,
          } as AISuggestion;
        })
        .filter((s: any) => (s.headline || s.description || s.primaryText));

      if (normalized.length === 0 && typeof json?.raw_model_text === 'string') {
        try {
          const raw = json.raw_model_text;
          const chunks = raw.split(/---CANDIDATES---|---REPAIR_CANDIDATE---/gi);
          for (const chunk of chunks) {
            const trimmed = chunk.trim();
            if (!trimmed) continue;
            const bracketMatch = trimmed.match(/(\[\s*\{[\s\S]*?\}\s*\])/);
            if (bracketMatch) {
              const parsed = JSON.parse(bracketMatch[1]);
              if (Array.isArray(parsed)) {
                for (const item of parsed) {
                  const id = item.id ?? String(Math.random()).slice(2, 8);
                  const mappedCtaValue = mapCtaStringToValue(item.cta ?? undefined);
                  normalized.push({
                    id,
                    headline: item.headline ?? item.title ?? undefined,
                    description: item.description ?? item.desc ?? undefined,
                    primaryText: item.description ?? item.desc ?? undefined,
                    cta: mappedCtaValue,
                    rawCtaText: item.cta ?? undefined,
                    url: extractUrl(item.url) || workspaceUrlFallback || undefined,
                    score: item.score ?? undefined,
                  } as AISuggestion);
                }
              }
            } else {
              normalized.push({
                id: String(Math.random()).slice(2, 8),
                description: trimmed,
                primaryText: trimmed,
                cta: mapCtaStringToValue(undefined),
                url: workspaceUrlFallback || undefined,
                score: undefined,
              } as AISuggestion);
            }
          }
        } catch (e) {
          console.warn('Failed to parse raw_model_text', e);
        }
      }

      const sorted = normalized.slice().sort((a: any, b: any) => {
        const sa = typeof a.score === 'number' ? a.score : 0;
        const sb = typeof b.score === 'number' ? b.score : 0;
        return sb - sa;
      });

      const topTwo = sorted.slice(0, 2).map((s) => ({
        ...s,
        url: s.url || workspaceUrlFallback || '',
      }));

      setAiSuggestions(topTwo);
      toast.success(`Fetched ${topTwo.length} AI suggestion(s)`);

      if (topTwo.length === 0) {
        setAiError('No suggestions returned by AI');
      }
    } catch (err: any) {
      console.error('[AI] suggestion fetch error', err);
      setAiError(err?.message ?? 'Failed to fetch AI suggestions');
      toast.error('Failed to fetch AI suggestions');
    } finally {
      setAiLoading(false);
    }
  };

  const applySuggestion = (s: AISuggestion & { rawCtaText?: string }) => {
    const patch: any = {};
    if (s.headline !== undefined) patch.headline = s.headline;
    if (s.description !== undefined) {
      patch.primaryText = s.description;
      patch.description = s.description;
    } else if (s.primaryText !== undefined) {
      patch.primaryText = s.primaryText;
      patch.description = s.primaryText;
    }
    if (s.cta !== undefined) patch.cta = s.cta;
    const finalUrl = (s.url && String(s.url).length > 0) ? s.url : (storeWorkspace?.website ?? storeWorkspace?.website_url ?? '');
    if (finalUrl) patch.url = finalUrl;

    setCreative(patch);

    if (patch.primaryText !== undefined) setPrimaryText(patch.primaryText);
    if (patch.headline !== undefined) setHeadline(patch.headline);
    if (patch.description !== undefined) setDescription(patch.description);
    if (patch.cta !== undefined) setCta(patch.cta);
    if (patch.url !== undefined) setUrl(patch.url);

    toast.success('AI suggestion applied (CTA auto-mapped)');
  };

  const rewriteWithAI = async (field: 'primaryText' | 'headline' | 'description', currentText: string) => {
    if (!currentText || currentText.trim().length === 0) {
      toast.error('Please enter some text first to rewrite');
      return;
    }

    // 1. UI Loading State
    if (field === 'primaryText') setRewritingPrimaryText(true);
    else if (field === 'headline') setRewritingHeadline(true);
    else if (field === 'description') setRewritingDescription(true);

    // Clear previous suggestions
    setRewriteState({ field: null, options: [], isOpen: false });

    try {
      // 2. Prepare Workspace Context (Keep minimal necessary context)
      let usedWorkspace = storeWorkspace ?? null;
      if (!usedWorkspace) {
        const fetched = await fetchWorkspaceFromSessionIfNeeded();
        if (fetched) usedWorkspace = fetched;
      }

      const workspaceIdToSend = usedWorkspace?.id ? Number(usedWorkspace.id) : null;

      // 3. Construct Specific Payload
      const payload = {
        workspace_id: workspaceIdToSend,
        // We instruct the backend specifically for this task
        prompt: `
        TASK: Rewrite the following ${field} text.
        ORIGINAL TEXT: "${currentText}"
        
        REQUIREMENTS:
        1. Generate exactly 3 distinct variations.
        2. Keep the tone professional yet engaging.
        3. Maintain the original meaning but improve clarity and impact.
        4. Return ONLY JSON format.
      `,
        // Force the backend to give us 3 results
        count: 3,
        product: {
          // We pass context so the rewrite is relevant to the brand
          title: creative?.headline || 'Ad Creative',
          description: currentText
        },
        workspace: buildWorkspaceSummary(usedWorkspace) ?? null,
      };

      console.debug(`[AI Rewrite ${field}] sending payload`, payload);

      // 4. Call API
      const res = await fetch(`${API_URL}/api/v1/generate-copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('AI request failed');

      const json = await res.json();

      // 5. Parse Results to string[]
      let options: string[] = [];

      // Handle your specific backend response structure (variations array)
      if (Array.isArray(json?.variations)) {
        options = json.variations.map((v: any) => {
          // Map based on the field we are editing
          if (field === 'headline') return v.headline || v.title || v.primary_text;
          return v.primary_text || v.description || v.text;
        });
      }
      // Fallback check for suggestions array
      else if (Array.isArray(json?.suggestions)) {
        options = json.suggestions.map((s: any) =>
          s.primaryText || s.headline || s.description || s.text
        );
      }

      // Filter out empties and limit to 3
      options = options.filter(Boolean).slice(0, 3);

      if (options.length > 0) {
        setRewriteState({
          field: field,
          options: options,
          isOpen: true
        });
        toast.success("Select a variation below");
      } else {
        toast.error("Could not generate variations. Please try again.");
      }

    } catch (err: any) {
      console.error('[AI Rewrite] error', err);
      toast.error('Failed to generate rewrites');
    } finally {
      setRewritingPrimaryText(false);
      setRewritingHeadline(false);
      setRewritingDescription(false);
    }
  };

  const handleContinue = () => {
    if (!primaryText || primaryText.trim().length === 0) {
      toast.error('Please fill in primary text');
      return;
    }
    if (!headline || headline.trim().length === 0) {
      toast.error('Please fill in headline');
      return;
    }
    if (!url || url.trim().length === 0) {
      toast.error('Please enter a destination URL');
      return;
    }

    const finalImageUrl = creative?.imageUrl || localImage?.url || null;
    if (!finalImageUrl) {
      toast.error('Please ensure an image is available for the ad');
      return;
    }

    setCreative({
      primaryText,
      headline,
      description,
      cta,
      url,
      imageUrl: finalImageUrl,
      imageId: creative?.imageId || localImage?.id || '',
    });

    setTimeout(() => {
      setStep(6);
      navigate('/review');
      toast.success('Creative saved successfully');
    }, 50);
  };

  const handleBack = () => {
    setStep(4);
    navigate('/placements');
  };

  const debugJson = useMemo(
    () => ({
      localStorageKeys: Object.keys(localStorage).filter((k) => k.startsWith('workspace_')),
      local_saved_images: (() => { try { return JSON.parse(localStorage.getItem('local_saved_images') || '[]'); } catch { return null; } })(),
      selectedImages,
      storeWorkspace,
      resolvedLocalImage: localImage,
      creative,
      localForm: { primaryText, headline, description, cta, url },
      aiSuggestions,
    }),
    [localImage, selectedImages, storeWorkspace, creative, primaryText, headline, description, cta, url, aiSuggestions]
  );

  const RewriteOptionsSelector = ({
    field,
    onSelect
  }: {
    field: 'primaryText' | 'headline' | 'description',
    onSelect: (text: string) => void
  }) => {
    // Only render if this is the active field and it's open
    if (rewriteState.field !== field || !rewriteState.isOpen) return null;

    return (
      <div className="mt-2 p-3 bg-secondary/10 border border-primary/20 rounded-md animate-in fade-in slide-in-from-top-2">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Select a variation:</span>
          <button
            onClick={() => setRewriteState(prev => ({ ...prev, isOpen: false }))}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
        <div className="space-y-2">
          {rewriteState.options.map((option, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onSelect(option);
                setRewriteState({ field: null, options: [], isOpen: false }); // Close after selection
              }}
              className="w-full text-left text-sm p-2.5 bg-white hover:bg-primary/5 border border-gray-200 hover:border-primary rounded-md transition-all duration-200 group"
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 text-xs bg-primary/10 text-primary rounded px-1.5 py-0.5">V{idx + 1}</span>
                <span className="text-gray-700 group-hover:text-gray-900">{option}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-1 flex items-center gap-3">
            <img src={logo} alt="Sociovia" className="w-8 h-8" />
            Design your ad creative
          </h1>
          <p className="text-lg text-muted-foreground">Use AI to generate copy suggestions from your workspace & image, or write your own.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => console.log('debugJson', debugJson)}>
            Debug
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Image preview */}
        <div className="h-full">
          <Card className="shadow-medium h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" />
                Ad Image
              </CardTitle>
              <CardDescription>Preview — mapped image is shown directly here</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="aspect-square bg-secondary rounded-lg flex items-center justify-center border-2 border-border overflow-hidden">
                {(creative && creative.imageUrl) || localImage?.url ? (
                  <img
                    key={(creative && creative.imageUrl) || localImage?.url}
                    src={((creative && creative.imageUrl) || localImage?.url || '').trim()}
                    alt="Ad preview"
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      console.error('Image failed to load:', (e.currentTarget as HTMLImageElement).src);
                      (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/400x400?text=Image+Unavailable';
                    }}
                  />
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No image available</p>
                  </div>
                )}
              </div>


            </CardContent>
          </Card>
        </div>

        {/* Copy fields */}
        <div className="h-full">
          <Card className="shadow-medium border-2 border-primary/10 flex flex-col h-full max-h-[620px]">
            <CardHeader className="pb-4 flex-shrink-0">
              <CardTitle className="text-xl font-bold">Ad Copy</CardTitle>
              <CardDescription className="text-muted-foreground">Write compelling text for your ad or apply a suggestion</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 overflow-y-auto flex-1">
              {/* Primary Text */}
              <div className="space-y-2">
                <Label htmlFor="primary-text" className="text-sm font-medium">Primary Text</Label>
                <div className="relative">
                  <Textarea
                    id="primary-text"
                    placeholder="Tell people about your product or service..."
                    rows={4}
                    value={primaryText}
                    onChange={(e) => onPrimaryTextChange(e.target.value)}
                    className="pr-12 resize-none border-gray-200 focus:border-primary/50 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => rewriteWithAI('primaryText', primaryText)}
                    disabled={rewritingPrimaryText || !primaryText.trim()}
                    className="absolute right-3 top-3 p-1.5 rounded-md hover:bg-primary/10 text-primary/70 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Rewrite with AI"
                  >
                    {rewritingPrimaryText ? (
                      <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                    ) : (
                      <PenLine className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Insert the selector here */}
                <RewriteOptionsSelector
                  field="primaryText"
                  onSelect={(text) => onPrimaryTextChange(text)}
                />
              </div>

              {/* Headline */}
              <div className="space-y-2">
                <Label htmlFor="headline" className="text-sm font-medium">Headline</Label>
                <div className="relative">
                  <Input
                    id="headline"
                    placeholder="Grab attention with a headline"
                    value={headline}
                    onChange={(e) => onHeadlineChange(e.target.value)}
                    className="pr-12 border-gray-200 focus:border-primary/50 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => rewriteWithAI('headline', headline)}
                    disabled={rewritingHeadline || !headline.trim()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-primary/10 text-primary/70 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Rewrite with AI"
                  >
                    {rewritingHeadline ? (
                      <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                    ) : (
                      <PenLine className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Insert the selector here */}
                <RewriteOptionsSelector
                  field="headline"
                  onSelect={(text) => onHeadlineChange(text)}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">Description (Optional)</Label>
                <div className="relative">
                  <Input
                    id="description"
                    placeholder="Additional details..."
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    className="pr-12 border-gray-200 focus:border-primary/50 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => rewriteWithAI('description', description)}
                    disabled={rewritingDescription || !description.trim()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-primary/10 text-primary/70 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Rewrite with AI"
                  >
                    {rewritingDescription ? (
                      <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                    ) : (
                      <PenLine className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Insert the selector here */}
                <RewriteOptionsSelector
                  field="description"
                  onSelect={(text) => onDescriptionChange(text)}
                />
              </div>

              {/* Generate with AI Button */}
              <div className="pt-2">
                <Button
                  onClick={fetchAiSuggestions}
                  disabled={aiLoading}
                  className="bg-primary hover:bg-primary/90 text-white font-medium"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {aiLoading ? 'Generating…' : 'Generate with AI'}
                </Button>
                {aiError && <span className="text-sm text-red-500 ml-3">{aiError}</span>}
              </div>

              {/* AI Suggestions Section */}
              {aiSuggestions.length > 0 && (
                <div className="space-y-3 pt-2">
                  <Label className="text-sm font-medium text-muted-foreground">AI Suggestions</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {aiSuggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => applySuggestion(s as AISuggestion & { rawCtaText?: string })}
                        className="p-3 text-left bg-gray-50 hover:bg-primary/5 border border-gray-200 hover:border-primary/30 rounded-full flex items-center justify-between gap-2 transition-all group"
                      >
                        <span className="text-sm text-gray-700 truncate">{s.headline ?? s.description ?? '—'}</span>
                        <Plus className="w-4 h-4 text-primary/60 group-hover:text-primary flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA Selection */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <Globe className="w-5 h-5 text-primary/70" />
                  <Select value={cta ?? ''} onValueChange={(v) => onCtaChange(v)}>
                    <SelectTrigger className="border-0 bg-transparent shadow-none focus:ring-0 h-auto p-0 font-medium">
                      <SelectValue placeholder="Select CTA" />
                    </SelectTrigger>
                    <SelectContent>
                      {ctaOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Link2 className="w-4 h-4 text-primary/50 ml-auto" />
                </div>
              </div>

              {/* Destination URL */}
              <div className="space-y-2">
                <Label htmlFor="url" className="text-sm font-medium">Destination URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://your-website.com"
                  value={url}
                  onChange={(e) => onUrlChange(e.target.value)}
                  className="border-gray-200 focus:border-primary/50 focus:ring-primary/20"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={handleBack}>Back</Button>
        <div className="flex gap-3">
          <Button onClick={handleContinue}>Continue to Review</Button>
        </div>
      </div>

      {showDebug && (
        <Card className="mt-6 bg-muted/5">
          <CardHeader>
            <CardTitle>Debug — resolved image</CardTitle>
            <CardDescription>Visible only when `showDebug` is true</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(debugJson, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}