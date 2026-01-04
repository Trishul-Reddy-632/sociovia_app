// src/pages/AudienceSetup.tsx
import { useEffect, useRef, useState } from 'react';
import { Sparkles, Plus, X } from 'lucide-react';
import logo from '@/assets/sociovia_logo.png';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LocationPicker } from '@/components/ui/location-picker';
import { useCampaignStore } from '@/store/campaignStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config';

type Workspace = {
  id: string;
  name?: string;
  sector?: string;
  business_name?: string;
  industry?: string;
  logo?: string | null;
  website?: string | null;
  [key: string]: any;
};

// Set your API base here (falls back to known devtunnel)
const API_BASE = API_BASE_URL;

// === Remember creative mode selected earlier ===
type CreativeMode = 'ai' | 'upload' | 'link';
const LAST_MODE_KEY = 'sv_lastCreativeMode';
const CREATIVE_EDITOR_PATH = '/start2'; // adjust if your route differs

function getLastCreativeMode(): CreativeMode | null {
  try {
    const raw = localStorage.getItem(LAST_MODE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const mode = parsed?.mode;
    if (mode === 'ai' || mode === 'upload' || mode === 'link') return mode;
    return null;
  } catch {
    return null;
  }
}

function getUserIdFromLocalStorage(): number | null {
  try {
    const raw = localStorage.getItem('sv_user');
    if (!raw) return null;
    const ud = JSON.parse(raw);
    const id = ud?.id ?? null;
    if (typeof id === 'number') return id;
    if (typeof id === 'string' && id.trim()) return Number(id);
    return null;
  } catch (err) {
    return null;
  }
}

function dedupeById<T extends { id: string }>(arr: T[]) {
  return Array.from(new Map(arr.map((x) => [String(x.id), x])).values());
}

const _COUNTRY_FALLBACK_NAMES: Record<string, string> = {
  IN: 'India',
  US: 'United States',
  GB: 'United Kingdom',
  AU: 'Australia',
  CA: 'Canada',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  BR: 'Brazil',
  MX: 'Mexico',
  CN: 'China',
  JP: 'Japan',
  RU: 'Russia',
  GLOBAL: 'Global',
};

function iso2ToName(code?: string | null) {
  if (!code) return null;
  try {
    if (typeof (Intl as any).DisplayNames === 'function') {
      const dn = new (Intl as any).DisplayNames(['en'], { type: 'region' });
      const name = dn.of(code.toUpperCase());
      if (name && typeof name === 'string') return name;
    }
  } catch {
    // ignore
  }
  return _COUNTRY_FALLBACK_NAMES[(code || '').toUpperCase()] ?? code;
}

// Format number in Indian numbering system (lakhs, crores)
function formatIndianNumber(num: number | null | undefined): string {
  if (num == null || isNaN(num)) return '0';
  // Use Indian locale for proper lakh/crore comma placement
  return num.toLocaleString('en-IN');
}

export default function AudienceSetup() {
  const { audience, setAudience, setStep, campaign, selectedImages, budget } = useCampaignStore();
  const navigate = useNavigate();

  // UI fields for AI mode (kept even though there's no separate toggle)
  const [industry, setIndustry] = useState<string>(audience.location?.industry || '');
  const [creativeDesc, setCreativeDesc] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  // workspaces for context (fetched from server)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  // NEW: workspace fetched directly from sessionStorage-selected id (server canonical workspace)
  const [sessionWorkspace, setSessionWorkspace] = useState<any | null>(null);

  // lookalike upload (optional, manual mode)
  const [lookalikeFile, setLookalikeFile] = useState<File | null>(null);
  const [lookalikePreviewName, setLookalikePreviewName] = useState<string | null>(null);
  const [lookalikePreviewRows, setLookalikePreviewRows] = useState<string[][] | null>(null);

  // suggestion polling
  const [suggestionId, setSuggestionId] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<any>(null);
  const pollingRef = useRef<number | null>(null);

  // Track which AI suggestions have been applied (to remove hover effect after clicking)
  const [appliedSuggestions, setAppliedSuggestions] = useState<{
    location: boolean;
    age: boolean;
    gender: boolean;
    interests: boolean;
  }>({ location: false, age: false, gender: false, interests: false });

  // Multiple locations support
  const [locations, setLocations] = useState<Array<{
    country: string;
    country_code?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    distance_unit?: string;
  }>>(() => {
    // Initialize with existing locations array from store, or fallback to single location
    const storedLocations = (audience as any)?.locations;
    if (Array.isArray(storedLocations) && storedLocations.length > 0) {
      return storedLocations;
    }
    // Fallback: use primary location if available
    const initial = audience.location?.country ? [{ ...audience.location }] : [{ country: '' }];
    return initial;
  });
  const [activeLocationIndex, setActiveLocationIndex] = useState<number>(0);
  const [showOptionalLocation, setShowOptionalLocation] = useState(() => {
    // Show optional location UI if we have more than 1 location stored
    const storedLocations = (audience as any)?.locations;
    return Array.isArray(storedLocations) && storedLocations.length > 1;
  });

  // Estimates: meta predicted metrics
  const [estimates, setEstimates] = useState<any | null>(null);
  const [estimatesLoading, setEstimatesLoading] = useState(false);
  const [estimatesError, setEstimatesError] = useState<{ title: string; message: string; isSessionError: boolean } | null>(null);
  const estimateAbortRef = useRef<AbortController | null>(null);
  const estimateDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    const sessionWsId = sessionStorage.getItem('sv_selected_workspace_id');
    if (sessionWsId) {
      setSelectedWorkspaceId(String(sessionWsId));
      fetchWorkspaceFromSessionId(sessionWsId);
    } else {
      const persisted = localStorage.getItem('sv_selected_workspace_id');
      if (persisted) setSelectedWorkspaceId(String(persisted));
    }

    fetchWorkspacesFromServer();

    return () => {
      stopPolling();
      cancelPendingEstimate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImages]);

  const fetchWorkspacesFromServer = async () => {
    const userId = getUserIdFromLocalStorage();
    const baseCandidates = [API_BASE];
    if (API_BASE.endsWith('/api')) baseCandidates.push(API_BASE.replace(/\/api$/, ''));

    const pathCandidates = ['/api/workspaces', '/api/workspace', '/workspaces', '/workspace', '/workspaces/list', '/workspace/me', '/workspaces/me'];

    let items: any[] = [];

    for (const base of baseCandidates) {
      for (const p of pathCandidates) {
        try {
          const url = `${base}${p}${userId ? `?user_id=${userId}` : ''}`;
          const res = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } });
          if (!res.ok) {
            if (res.status === 404) continue;
            const txt = await res.text().catch(() => '');
            console.warn(`[workspaces] ${res.status} from ${url} — ${txt.slice(0, 200)}`);
            continue;
          }

          const body = await res.json().catch(() => null);
          if (!body) continue;

          if (Array.isArray(body)) items = body;
          else if (Array.isArray(body?.workspaces)) items = body.workspaces;
          else if (Array.isArray(body?.data)) items = body.data;
          else if (body?.workspace && Array.isArray(body.workspace)) items = body.workspace;

          if (items && items.length > 0) {
            const mapped: Workspace[] = items.map((it: any, idx: number) => ({
              id: String(it.id ?? it.workspace_id ?? it.user_id ?? `server-${idx}`),
              name: it.name ?? it.business_name ?? it.title ?? null,
              sector: it.sector ?? it.industry ?? null,
              business_name: it.business_name ?? it.name ?? null,
              industry: it.industry ?? null,
              logo: it.logo_url ?? it.logo ?? null,
              website: it.website ?? it.website_url ?? null,
              ...it,
            }));

            const deduped = dedupeById(mapped);
            setWorkspaces(deduped);

            const serverSelected = body?.selected_workspace ?? body?.selected_workspace_id ?? null;
            if (serverSelected) {
              const sid = String(serverSelected.id ?? serverSelected.workspace_id ?? serverSelected);
              setSelectedWorkspaceId(sid);
              try { localStorage.setItem('sv_selected_workspace_id', sid); } catch { }
            } else {
              const persisted = localStorage.getItem('sv_selected_workspace_id');
              if (persisted && deduped.find((w) => String(w.id) === String(persisted))) {
                setSelectedWorkspaceId(String(persisted));
              } else if (!selectedWorkspaceId && deduped.length > 0) {
                setSelectedWorkspaceId(deduped[0].id);
                try { localStorage.setItem('sv_selected_workspace_id', deduped[0].id); } catch { }
              }
            }

            return; // success
          }
        } catch (err) {
          console.debug('[workspaces] fetch error (ignored)', err);
          continue;
        }
      }
    }

    // fallback: read workspace_x keys from localStorage
    const keys = Object.keys(localStorage).filter((key) => key.startsWith('workspace_'));
    const localItems: Workspace[] = [];

    for (const key of keys) {
      try {
        const value = localStorage.getItem(key);
        if (!value) continue;
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object') {
          localItems.push({
            id: parsed.id?.toString() || key.replace('workspace_', ''),
            name: parsed.name || parsed.business_name || 'Untitled Workspace',
            sector: parsed.sector,
            business_name: parsed.business_name,
            industry: parsed.industry,
            logo: parsed.logo || null,
            website: parsed.website ?? null,
            ...parsed,
          });
        }
      } catch (err) {
        console.warn(`Error parsing workspace data for key ${key}`, err);
      }
    }

    if (selectedImages?.workspace && selectedImages.workspace.id) {
      const wsId = String(selectedImages.workspace.id);
      const existingIndex = localItems.findIndex((w) => w.id === wsId);
      if (existingIndex === -1) {
        localItems.unshift({
          id: wsId,
          name: selectedImages.workspace.name || selectedImages.workspace.business_name || 'Untitled Workspace',
          sector: selectedImages.workspace.sector,
          business_name: selectedImages.workspace.business_name,
          industry: selectedImages.workspace.industry,
          logo: selectedImages.workspace.logo || null,
          website: selectedImages.workspace.website ?? null,
          ...selectedImages.workspace,
        });
      }
    }

    const dedupLocal = dedupeById(localItems.map((it, idx) => ({ ...it, id: String(it.id ?? `local-${idx}`) })));

    setWorkspaces(dedupLocal);
    if (dedupLocal.length > 0) {
      const persisted = localStorage.getItem('sv_selected_workspace_id');
      if (persisted && dedupLocal.find((w) => String(w.id) === String(persisted))) {
        setSelectedWorkspaceId(String(persisted));
      } else if (!selectedWorkspaceId) {
        setSelectedWorkspaceId(dedupLocal[0].id);
        try { localStorage.setItem('sv_selected_workspace_id', dedupLocal[0].id); } catch { }
      }
    } else {
      setSelectedWorkspaceId(null);
    }
  };

  const fetchWorkspaceFromSessionId = async (wsId: string) => {
    if (!wsId) return;
    try {
      const userId = getUserIdFromLocalStorage();
      const url = `${API_BASE}/api/workspace?workspace_id=${encodeURIComponent(String(wsId))}${userId ? `&user_id=${userId}` : ''}`;
      const res = await fetch(url, {
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          ...(userId ? { 'X-User-Id': String(userId) } : {})
        }
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        console.warn('[sessionWorkspace] fetch non-ok', res.status, body);
        return;
      }
      const ws = body?.workspace ?? body;
      if (ws) {
        setSessionWorkspace(ws);
        setSelectedWorkspaceId(String(wsId));
        try { localStorage.setItem('sv_selected_workspace_id', String(wsId)); } catch { }
      }
    } catch (err) {
      console.error('[sessionWorkspace] fetch failed', err);
    }
  };

  const persistSelectedWorkspace = (workspaceId: string | null) => {
    try {
      if (!workspaceId) {
        localStorage.removeItem('sv_selected_workspace_id');
        sessionStorage.removeItem('sv_selected_workspace_id');
      } else {
        localStorage.setItem('sv_selected_workspace_id', String(workspaceId));
        sessionStorage.setItem('sv_selected_workspace_id', String(workspaceId));
      }
    } catch (err) {
      console.warn('persistSelectedWorkspace localStorage/sessionStorage failed', err);
    }
  };

  const handleWorkspaceChange = (id: string | null) => {
    setSelectedWorkspaceId(id);
    persistSelectedWorkspace(id);
    setAudience({ ...audience, workspace_id: id ?? undefined });
    if (id) fetchWorkspaceFromSessionId(id);
  };

  const onLookalikeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      setLookalikeFile(null);
      setLookalikePreviewName(null);
      setLookalikePreviewRows(null);
      setAudience({ ...audience, lookalike_uploaded: false, lookalike_filename: undefined });
      return;
    }
    const isCSV = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
    if (!isCSV) {
      toast.error('Please upload a CSV file for lookalike (optional).');
      return;
    }
    setLookalikeFile(file);
    setLookalikePreviewName(file.name);
    setAudience({ ...audience, lookalike_uploaded: true, lookalike_filename: file.name });

    // Parse CSV for tiny preview (first 3 rows, max 4 columns)
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const lines = text.split('\n').filter(l => l.trim()).slice(0, 3);
        const rows = lines.map(line =>
          line.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')).slice(0, 4)
        );
        setLookalikePreviewRows(rows);
      }
    };
    reader.readAsText(file);

    toast.success('Lookalike file selected (optional). Will be used if you upload in the next step.');
  };

  const removeLookalikeFile = () => {
    setLookalikeFile(null);
    setLookalikePreviewName(null);
    setLookalikePreviewRows(null);
    setAudience({ ...audience, lookalike_uploaded: false, lookalike_filename: undefined });
  };

  const prefillFromWorkspace = () => {
    if (!selectedWorkspaceId) {
      toast.error('No workspace selected to prefill from');
      return;
    }
    const ws =
      workspaces.find((w) => w.id === selectedWorkspaceId) ||
      (sessionWorkspace && String(sessionWorkspace.id) === String(selectedWorkspaceId) ? sessionWorkspace : null);
    if (!ws) {
      toast.error('Selected workspace not found');
      return;
    }

    const willOverwriteIndustry = industry && industry.trim().length > 0;
    const willOverwriteCreative = creativeDesc && creativeDesc.trim().length > 0;

    if ((willOverwriteIndustry || willOverwriteCreative) && !confirm('Prefill will overwrite current inputs. Continue?')) return;

    if (ws.industry && (!industry || industry.trim() === '')) setIndustry(ws.industry);
    if (ws.sector && (!industry || industry.trim() === '')) setIndustry((prev) => prev || ws.sector);

    if (ws.business_name && (!creativeDesc || creativeDesc.trim() === '')) {
      setCreativeDesc(`Promoting ${ws.business_name} to ${ws.sector ?? ws.industry ?? 'relevant customers'}`);
    } else if (!creativeDesc || creativeDesc.trim() === '') {
      setCreativeDesc(
        `Promoting ${ws.name ?? ws.business_name ?? 'your product'} to ${ws.sector ?? ws.industry ?? 'relevant customers'}`
      );
    }

    toast.success('Prefilled inputs from selected workspace');
  };

  const startPolling = (id: string) => {
    stopPolling();
    pollingRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/ai_suggestions/${id}`, { credentials: 'include' });
        if (!res.ok) {
          stopPolling();
          return;
        }
        const data = await res.json();
        if (data && data.status) {
          if (data.status === 'READY' || data.status === 'FAILED') {
            stopPolling();
            setSuggestion(data);
            setGenerating(false);
          } else {
            setSuggestion((prev) => ({ ...prev, status: data.status }));
          }
        }
      } catch (err) {
        console.error('poll error', err);
        stopPolling();
        setGenerating(false);
      }
    }, 1200);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleGenerateAISuggestions = async () => {
    setGenerating(true);
    setSuggestion(null);
    setSuggestionId(null);

    let fullWs = sessionWorkspace ?? selectedImages?.workspace ?? null;
    const uiWs = workspaces.find((w) => w.id === selectedWorkspaceId) ?? null;
    const wsIdForUrl = uiWs?.id ?? selectedWorkspaceId ?? '0';

    if (!fullWs) {
      try {
        const raw = localStorage.getItem(`workspace_${wsIdForUrl}`) || localStorage.getItem(String(wsIdForUrl));
        if (raw) fullWs = JSON.parse(raw);
      } catch { }
    }

    const payloadWorkspace = {
      workspace: sessionWorkspace ?? fullWs ?? undefined,
      industry: (industry || (fullWs && (fullWs.industry || fullWs.sector)) || '').trim(),
      creative_desc:
        (creativeDesc && creativeDesc.trim()) ||
        `Promoting ${fullWs?.business_name ?? fullWs?.name ?? uiWs?.business_name ?? 'your product'} to ${fullWs?.sector ?? fullWs?.industry ?? uiWs?.sector ?? 'relevant customers'
        }`,
      workspace_preview: fullWs
        ? {
          id: fullWs.id,
          business_name: fullWs.business_name ?? fullWs.name,
          sector: fullWs.sector,
          industry: fullWs.industry,
          website: fullWs.website,
        }
        : uiWs
          ? {
            id: uiWs.id,
            business_name: uiWs.business_name ?? uiWs.name,
            sector: uiWs.sector,
            industry: uiWs.industry,
          }
          : undefined,
    };

    try {
      const url = `${API_BASE}/api/workspace/${encodeURIComponent(String(wsIdForUrl))}/ai-suggest-audience`;
      console.debug('[AI] POST ->', url, payloadWorkspace);

      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payloadWorkspace),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error('[AI] non-OK response', body);
        toast.error(body?.error || body?.message || 'AI generation failed (server error)');
        setGenerating(false);
        return;
      }

      console.debug('[AI] response body', body);

      // Check if suggestion exists in response
      if (body && body.suggestion) {
        setSuggestion({
          status: 'READY',
          suggestion: body.suggestion,
          confidence: body.confidence ?? null,
          explanation: body.explanation ?? body.reasons?.join('. ') ?? null,
        });
        setGenerating(false);
        toast.success('AI suggestion ready');
        return;
      }

      // Check for async polling case
      const id = body.suggestion_id || body.id || body.suggestionId;
      if (id) {
        setSuggestionId(String(id));
        startPolling(String(id));
        toast.success('AI suggestion requested — generating now');
        return;
      }

      // Handle case where ok is true but suggestion is missing or parsing failed
      if (body.ok === false || body.error) {
        toast.error(body.error || 'AI failed to generate suggestion');
        setGenerating(false);
        return;
      }

      // Fallback: try to extract suggestion from different response structures
      // Some backends might return the suggestion at top level
      const possibleSuggestion = body.location || body.age || body.interests
        ? body  // The body itself might be the suggestion
        : null;

      if (possibleSuggestion) {
        setSuggestion({
          status: 'READY',
          suggestion: possibleSuggestion,
          confidence: null,
          explanation: null,
        });
        setGenerating(false);
        toast.success('AI suggestion ready');
        return;
      }

      // If we get here, something unexpected happened
      console.warn('[AI] Unexpected response format:', body);
      toast.error('AI returned an unexpected response format. Check console for details.');
      setGenerating(false);
    } catch (err: any) {
      console.error('[AI] fetch error', err);
      toast.error(
        err?.message ? `Failed to contact AI service: ${err.message}` : 'Failed to contact AI service — check network/CORS'
      );
      setGenerating(false);
    }
  };

  const handleApplySuggestion = async () => {
    if (!suggestion || !suggestion.suggestion) {
      toast.error('No suggestion to apply');
      return;
    }
    const a = suggestion.suggestion;

    // Update locations array for the new multi-location system
    if (a.location) {
      const loc = a.location;
      const newLocation = {
        country: loc.country || loc,
        region: loc.state || loc.region,
        city: loc.city,
      };
      const newLocations = [...locations];
      newLocations[0] = newLocation;
      setLocations(newLocations);
    }

    setAudience({
      mode: 'AI',
      location: a.location ?? audience.location,
      age: [a.age_min ?? a.age?.[0] ?? 18, a.age_max ?? a.age?.[1] ?? 65],
      gender: a.gender ?? 'all',
      interests: a.interests ?? [],
    });

    // Mark all suggestions as applied
    setAppliedSuggestions({ location: true, age: true, gender: true, interests: true });

    toast.success('AI suggestion applied to audience');
  };

  // Build estimate payload for a specific location
  const buildEstimatePayloadForLocation = async (location: { country: string; region?: string; city?: string }) => {
    const uiWs = workspaces.find((w) => w.id === selectedWorkspaceId) ?? null;
    const fullWs = sessionWorkspace ?? selectedImages?.workspace ?? uiWs ?? null;
    const creativeObj =
      (campaign && (campaign as any).creative) ||
      (selectedImages && (selectedImages as any).images && (selectedImages as any).images[0]) ||
      null;

    // Use budget from store, fallback to campaign budget, then default
    const budgetPayload = budget ?? (campaign && (campaign as any).budget) ?? { amount: 10000, currency: 'INR', type: 'daily' };

    return {
      workspace: fullWs ?? undefined,
      audience: {
        location: location ?? {},
        age: audience.age ?? [18, 65],
        gender: audience.gender ?? 'all',
        interests: audience.interests ?? [],
      },
      budget: budgetPayload,
      creative: creativeObj ?? { image_url: (creativeObj && creativeObj.url) ?? null },
      objective: (campaign && (campaign as any).objective) ?? 'TRAFFIC',
    };
  };

  // Legacy function for backward compatibility
  const buildEstimatePayload = async () => {
    return buildEstimatePayloadForLocation(audience.location);
  };

  const cancelPendingEstimate = () => {
    if (estimateAbortRef.current) {
      estimateAbortRef.current.abort();
      estimateAbortRef.current = null;
    }
    if (estimateDebounceRef.current) {
      window.clearTimeout(estimateDebounceRef.current);
      estimateDebounceRef.current = null;
    }
  };

  // Parse estimate errors into user-friendly messages
  const parseEstimateError = (err: any, statusCode?: number): { title: string; message: string; isSessionError: boolean } => {
    const errStr = typeof err === 'string' ? err : (err?.message || err?.error || JSON.stringify(err) || '');

    // Check for session/token issues
    if (errStr.toLowerCase().includes('session') || errStr.toLowerCase().includes('token') ||
      errStr.includes('invalidated') || errStr.includes('OAuthException')) {
      return {
        title: 'Meta Session Expired',
        message: 'Your Meta session has expired. Please reconnect your account to continue.',
        isSessionError: true
      };
    }

    // Check for permissions issues
    if (errStr.toLowerCase().includes('permission') || errStr.includes('#200') || errStr.includes('access')) {
      return {
        title: 'Permission Required',
        message: 'Additional permissions may be required for Meta estimates. Please reconnect your account.',
        isSessionError: true
      };
    }

    // Check for rate limiting
    if (errStr.toLowerCase().includes('rate') || errStr.includes('throttl') || statusCode === 429) {
      return {
        title: 'Too Many Requests',
        message: 'Please wait a moment and try again.',
        isSessionError: false
      };
    }

    // Check for CORS/network errors
    if (errStr.toLowerCase().includes('cors') || errStr.toLowerCase().includes('network') ||
      errStr.toLowerCase().includes('failed to fetch') || errStr.toLowerCase().includes('load failed')) {
      return {
        title: 'Network Error',
        message: 'Unable to connect to the server. Please check your connection and try again.',
        isSessionError: false
      };
    }

    // Check for 400 bad request (targeting issues)
    if (statusCode === 400) {
      return {
        title: 'Invalid Configuration',
        message: 'The targeting configuration may not be valid. Try adjusting your audience settings.',
        isSessionError: false
      };
    }

    // Generic fallback
    return {
      title: 'Estimate Unavailable',
      message: 'Unable to fetch performance estimates. This won\'t affect your campaign.',
      isSessionError: false
    };
  };

  const postProcessMetaEstimates = (body: any) => {
    if (!body || typeof body !== 'object') return body;

    const out: any = { ...body };

    try {
      if ((out.estimated_reach === 0 || out.estimated_reach == null) && out.meta_raw) {
        const metaRaw = out.meta_raw;
        const data = metaRaw.data ?? metaRaw;
        const lower = (data && (data.users_lower_bound ?? data.lower_bound)) ?? null;
        const upper = (data && (data.users_upper_bound ?? data.upper_bound)) ?? null;
        if ((lower != null || upper != null) && (Number.isFinite(lower) || Number.isFinite(upper))) {
          const lnum = Number.isFinite(lower) ? Number(lower) : null;
          const unum = Number.isFinite(upper) ? Number(upper) : null;
          let derived = 0;
          if (lnum != null && unum != null) derived = Math.round((lnum + unum) / 2);
          else if (unum != null) derived = Number(unum);
          else if (lnum != null) derived = Number(lnum);
          if (!Number.isNaN(derived) && derived > 0) {
            out.estimated_reach = derived;
            out.estimated_daily_impressions = Math.max(1, Math.round(derived * 2.5));
            out.estimated_daily_clicks = Math.max(0, Math.round(out.estimated_daily_impressions * 0.03));
            out.estimated_conversions_per_week = Math.max(
              0,
              Math.round((out.estimated_daily_clicks * 7) * 0.02)
            );
            out.estimated_leads = Math.max(0, Math.round(out.estimated_conversions_per_week * 0.25));
            if (!out.estimated_cpc || out.estimated_cpc <= 0) out.estimated_cpc = null;
            if (!out.estimated_cpa || out.estimated_cpa <= 0) out.estimated_cpa = null;
          }
        }
      }
    } catch (e) {
      console.warn('postProcessMetaEstimates: failed to derive reach from meta_raw', e);
    }

    try {
      const metaRaw = out.meta_raw ?? null;
      if (metaRaw) {
        const data = metaRaw.data ?? metaRaw;
        const predicted: any = out.predicted_audience ?? {};
        if (data) {
          if (data.users_lower_bound && data.users_upper_bound) {
            predicted.users_lower_bound = Number(data.users_lower_bound);
            predicted.users_upper_bound = Number(data.users_upper_bound);
          }
          if (data.location && data.location.country) {
            predicted.location = predicted.location || {};
            predicted.location.country = data.location.country;
          }
          if (metaRaw.predicted_audience && typeof metaRaw.predicted_audience === 'object') {
            predicted.location = predicted.location || metaRaw.predicted_audience.location;
            predicted.age = predicted.age || metaRaw.predicted_audience.age;
            predicted.gender = predicted.gender || metaRaw.predicted_audience.gender;
            predicted.interests = predicted.interests || metaRaw.predicted_audience.interests;
          }
        }
        if (predicted.location && predicted.location.country) {
          const c = predicted.location.country;
          predicted.location.country_display = iso2ToName(String(c).toUpperCase()) ?? String(c);
        }
        out.predicted_audience = { ...out.predicted_audience, ...predicted };
      }
    } catch (e) {
      console.warn('postProcessMetaEstimates: failed to extract predicted_audience from meta_raw', e);
    }

    return out;
  };

  // Helper function to average multiple estimate results
  const averageEstimates = (estimatesArray: any[]): any => {
    if (!estimatesArray || estimatesArray.length === 0) return null;
    if (estimatesArray.length === 1) return estimatesArray[0];

    const numericFields = [
      'estimated_reach',
      'estimated_daily_impressions',
      'estimated_daily_clicks',
      'estimated_conversions_per_week',
      'estimated_leads',
      'estimated_cpc',
      'estimated_cpa',
      'confidence',
    ];

    const averaged: any = { ...estimatesArray[0] };

    // Calculate sum for each numeric field
    for (const field of numericFields) {
      let sum = 0;
      let count = 0;
      for (const est of estimatesArray) {
        const val = est?.[field];
        if (val != null && !isNaN(Number(val))) {
          sum += Number(val);
          count++;
        }
      }
      if (count > 0) {
        // For reach and impressions, we SUM them (combined audience)
        // For rates like CPC, CPA, confidence, we AVERAGE them
        if (field === 'estimated_reach' || field === 'estimated_daily_impressions' ||
          field === 'estimated_daily_clicks' || field === 'estimated_conversions_per_week' ||
          field === 'estimated_leads') {
          averaged[field] = Math.round(sum); // Sum for combined reach
        } else {
          averaged[field] = sum / count; // Average for rates
        }
      }
    }

    // Combine meta_raw bounds if available
    if (estimatesArray.some(e => e?.meta_raw?.data)) {
      let lowerSum = 0;
      let upperSum = 0;
      let hasData = false;
      for (const est of estimatesArray) {
        const data = est?.meta_raw?.data;
        if (data?.users_lower_bound) {
          lowerSum += Number(data.users_lower_bound);
          hasData = true;
        }
        if (data?.users_upper_bound) {
          upperSum += Number(data.users_upper_bound);
          hasData = true;
        }
      }
      if (hasData) {
        averaged.meta_raw = averaged.meta_raw || {};
        averaged.meta_raw.data = averaged.meta_raw.data || {};
        averaged.meta_raw.data.users_lower_bound = lowerSum;
        averaged.meta_raw.data.users_upper_bound = upperSum;
      }
    }

    // Store location count for display
    averaged.locations_count = estimatesArray.length;
    averaged.locations_used = estimatesArray.map((_, idx) => locations[idx]?.country || locations[idx]?.city).filter(Boolean);

    return averaged;
  };

  const scheduleEstimateFetch = (delay = 700) => {
    if (estimateDebounceRef.current) {
      window.clearTimeout(estimateDebounceRef.current);
      estimateDebounceRef.current = null;
    }
    if (estimateAbortRef.current) {
      estimateAbortRef.current.abort();
      estimateAbortRef.current = null;
    }

    estimateDebounceRef.current = window.setTimeout(async () => {
      const controller = new AbortController();
      estimateAbortRef.current = controller;
      setEstimatesLoading(true);
      setEstimatesError(null);

      try {
        // Filter out empty locations
        const validLocations = locations.filter(loc => loc.country && loc.country.trim() !== '');

        if (validLocations.length === 0) {
          // No valid locations - set a special state to show dashes
          setEstimates({ no_location_selected: true });
          setEstimatesLoading(false);
          return;
        }

        // Fetch estimates for each valid location
        const estimatesResults: any[] = [];

        for (let i = 0; i < validLocations.length; i++) {
          if (controller.signal.aborted) return;

          const loc = validLocations[i];
          const payload = await buildEstimatePayloadForLocation(loc);
          const fetchBody = { ...payload, run: true };

          try {
            const res = await fetch(`${API_BASE}/api/meta/estimate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fetchBody),
              signal: controller.signal,
            });

            const body = await res.json().catch(() => ({}));

            if (res.ok) {
              const processed = postProcessMetaEstimates(body || {});
              if (processed) {
                estimatesResults.push(processed);
              }
            } else {
              console.warn(`Estimate fetch failed for location ${loc.country}:`, body?.error || body?.message);
            }
          } catch (locErr: any) {
            if (locErr?.name === 'AbortError') return;
            console.warn(`Estimate fetch error for location ${loc.country}:`, locErr);
          }
        }

        if (estimatesResults.length === 0) {
          setEstimates(null);
          setEstimatesError(parseEstimateError('Failed to get estimates for any location'));
          setEstimatesLoading(false);
          return;
        }

        // Average or combine all estimates
        const combinedEstimates = averageEstimates(estimatesResults);
        setEstimates(combinedEstimates);
        setEstimatesLoading(false);

      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('estimate fetch error', err);
        setEstimates(null);
        setEstimatesError(parseEstimateError(err));
        setEstimatesLoading(false);
      } finally {
        estimateAbortRef.current = null;
      }
    }, delay);
  };

  useEffect(() => {
    // Always fetch estimates in the merged UI (was conditional before)
    scheduleEstimateFetch(700);
    return () => {
      cancelPendingEstimate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience, budget, selectedWorkspaceId, industry, creativeDesc, selectedImages, sessionWorkspace, locations]);

  const refreshEstimates = () => {
    cancelPendingEstimate();
    scheduleEstimateFetch(0);
  };

  const onManualLocationChange = (val: string) => {
    setAudience({ location: { ...audience.location, country: val } });
  };

  const handleContinue = async () => {
    setStep(3);

    try {
      if (selectedWorkspaceId) {
        localStorage.setItem('sv_selected_workspace_id', String(selectedWorkspaceId));
        sessionStorage.setItem('sv_selected_workspace_id', String(selectedWorkspaceId));
      }
    } catch (err) {
      console.warn('Failed to persist selected workspace id', err);
    }

    // Build the primary location from the locations array (first valid location)
    const validLocations = locations.filter(loc => loc.country && loc.country.trim() !== '');
    const primaryLocation = validLocations.length > 0
      ? {
        country: validLocations[0].country,
        country_code: validLocations[0].country_code,
        region: validLocations[0].region,
        city: validLocations[0].city,
        industry: industry || audience.location?.industry,
        latitude: validLocations[0].latitude,
        longitude: validLocations[0].longitude,
        radius: validLocations[0].radius,
        distance_unit: validLocations[0].distance_unit,
      }
      : audience.location;

    // Build additional locations array for multi-location support
    const additionalLocations = validLocations.length > 1 ? validLocations.slice(1) : [];

    setAudience({
      ...audience,
      location: primaryLocation,
      // Store all locations for multi-location campaigns
      locations: validLocations,
      // Ensure interests are preserved
      interests: audience.interests ?? [],
      workspace_id: selectedWorkspaceId ?? undefined,
      lookalike_uploaded: !!lookalikeFile,
      lookalike_filename: lookalikeFile ? lookalikeFile.name : undefined,
    });

    const mode = getLastCreativeMode();
    if (mode === 'upload') {
      navigate(CREATIVE_EDITOR_PATH);
      toast.success('Opening Creative Editor (upload mode)');
      return;
    }

    const targetWorkspace = selectedWorkspaceId ?? '7';
    navigate(`/workspace/${encodeURIComponent(String(targetWorkspace))}/chat`);
    toast.success('Audience settings saved');
  };

  const handleBack = () => {
    setStep(1);
    navigate('/objective');
  };

  const continueCta = (getLastCreativeMode() === 'upload' ? 'Continue to Creative Editor' : 'Continue to Image Generation');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-fade-in">
        {/* Header with Brand Gradient */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 mb-4">
            <img src={logo} alt="Sociovia" className="w-4 h-4" />
            <span className="text-sm font-medium text-primary">AI-Powered Targeting</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text mb-3 md:mb-4">
            Define Your Audience
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Combine AI-powered suggestions with manual controls for precision targeting
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-6 border-b border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
                  <div className="w-10 h-10 rounded-xl bg-white border border-primary/20 flex items-center justify-center shadow-lg">
                    <img src={logo} alt="Sociovia" className="w-6 h-6" />
                  </div>
                  Audience Configuration
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-2">Fine-tune your target audience with AI assistance</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchWorkspacesFromServer()} className="border-primary/30 hover:bg-primary/5 hover:border-primary/50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
                  Refresh
                </Button>
                <Button variant="ghost" size="sm" onClick={prefillFromWorkspace} className="hover:bg-accent/10 hover:text-accent">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5"><path d="M12 3v12" /><path d="m8 11 4 4 4-4" /><path d="M8 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4" /></svg>
                  Prefill
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-8 pt-6">
            {/* Workspace selector */}
            <div className="p-5 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 rounded-2xl border border-primary/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></svg>
                </div>
                <Label htmlFor="workspace" className="font-semibold text-foreground">Select Workspace</Label>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  id="workspace"
                  value={selectedWorkspaceId ?? ''}
                  onChange={(e) => handleWorkspaceChange(e.target.value || null)}
                  className="flex-1 px-4 py-3 border border-border/50 rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm hover:border-primary/30"
                >
                  <option value="">Choose workspace (optional)</option>
                  {workspaces.map((w, i) => (
                    <option key={`${String(w.id)}-${i}`} value={w.id}>
                      {w.business_name ?? w.name ?? w.sector ?? w.id}
                    </option>
                  ))}
                </select>
                <Button variant="outline" size="default" onClick={() => prefillFromWorkspace()} className="shrink-0 border-primary/30 hover:bg-primary/5 hover:border-primary/50 px-5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2"><path d="M12 3v12" /><path d="m8 11 4 4 4-4" /><path d="M8 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4" /></svg>
                  Prefill from Workspace
                </Button>
              </div>
            </div>

            {/* Industry + Creative brief */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="industry" className="font-semibold text-foreground flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /></svg>
                  Industry / Business Type
                </Label>
                <Input
                  id="industry"
                  placeholder="e.g., Fashion, Technology, Food & Beverage"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="h-12 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creative-desc" className="font-semibold text-foreground flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" /></svg>
                  Describe Your Ad Creative
                </Label>
                <Input
                  id="creative-desc"
                  placeholder="e.g., Promoting summer sneaker collection for young adults"
                  value={creativeDesc}
                  onChange={(e) => setCreativeDesc(e.target.value)}
                  className="h-12 border-border/50 focus:border-accent focus:ring-accent/20 rounded-xl"
                />
              </div>
            </div>

            {/* Two Column Layout: Manual Controls + AI Suggestions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Manual Controls */}
              <div className="space-y-6 p-6 bg-gradient-to-br from-card to-card/80 rounded-2xl border border-border/30 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-lg">Manual Controls</h4>
                    <p className="text-xs text-muted-foreground">Fine-tune targeting parameters</p>
                  </div>
                </div>

                {/* Locations */}
                <div className="space-y-3">
                  <Label className="font-semibold text-foreground flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                    Location
                  </Label>

                  {/* Location 1 (Primary) */}
                  <div
                    className={`relative ${activeLocationIndex === 0 ? 'ring-2 ring-primary/50 rounded-xl' : ''}`}
                    onClick={() => setActiveLocationIndex(0)}
                  >
                    <LocationPicker
                      key="location-picker-0"
                      value={locations[0]?.country || ''}
                      initialLocation={locations[0]?.latitude && locations[0]?.longitude ? {
                        lat: locations[0].latitude,
                        lon: locations[0].longitude,
                        display_name: locations[0].country,
                        country: locations[0].country,
                        country_code: locations[0].country_code,
                        city: locations[0].city,
                        state: locations[0].region,
                        radius: locations[0].radius,
                        distance_unit: locations[0].distance_unit
                      } : undefined}
                      onChange={(location, details) => {
                        const newLocations = [...locations];
                        newLocations[0] = {
                          country: location,
                          country_code: details?.country_code,
                          region: details?.state,
                          city: details?.city,
                          latitude: details?.lat,
                          longitude: details?.lon,
                          radius: details?.radius,
                          distance_unit: details?.distance_unit,
                        };
                        setLocations(newLocations);
                        // Update audience with first location as primary
                        setAudience({
                          location: {
                            ...audience.location,
                            country: location,
                            country_code: details?.country_code,
                            region: details?.state,
                            city: details?.city,
                            latitude: details?.lat,
                            longitude: details?.lon,
                            radius: details?.radius,
                            distance_unit: details?.distance_unit,
                          }
                        });
                      }}
                      placeholder="Search for countries, regions, or cities..."
                    />
                  </div>

                  {/* Location 2 (Optional) */}
                  {(showOptionalLocation || locations.length > 1) && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Location 2 (Optional)</Label>
                      <div
                        className={`relative ${activeLocationIndex === 1 ? 'ring-2 ring-primary/50 rounded-xl' : ''}`}
                        onClick={() => setActiveLocationIndex(1)}
                      >
                        <div className="relative">
                          <LocationPicker
                            key="location-picker-1"
                            value={locations[1]?.country || ''}
                            initialLocation={locations[1]?.latitude && locations[1]?.longitude ? {
                              lat: locations[1].latitude,
                              lon: locations[1].longitude,
                              display_name: locations[1].country,
                              country: locations[1].country,
                              country_code: locations[1].country_code,
                              city: locations[1].city,
                              state: locations[1].region,
                              radius: locations[1].radius,
                              distance_unit: locations[1].distance_unit
                            } : undefined}
                            onChange={(location, details) => {
                              const newLocations = [...locations];
                              if (newLocations.length < 2) {
                                newLocations.push({ country: '', region: undefined, city: undefined });
                              }
                              newLocations[1] = {
                                country: location,
                                country_code: details?.country_code,
                                region: details?.state,
                                city: details?.city,
                                latitude: details?.lat,
                                longitude: details?.lon,
                                radius: details?.radius,
                                distance_unit: details?.distance_unit,
                              };
                              setLocations(newLocations);
                            }}
                            placeholder="Search for second location..."
                          />
                          {locations.length > 1 && locations[1]?.country && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const newLocations = locations.filter((_, i) => i !== 1);
                                setLocations(newLocations);
                                if (activeLocationIndex === 1) setActiveLocationIndex(0);
                                if (newLocations.length === 1) setShowOptionalLocation(false);
                              }}
                              className="absolute top-2 right-2 w-6 h-6 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center text-red-500 z-10"
                              title="Remove location"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Locations (3+) */}
                  {locations.slice(2).map((loc, idx) => {
                    const actualIndex = idx + 2;
                    return (
                      <div key={actualIndex} className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Location {actualIndex + 1} (Optional)</Label>
                        <div
                          className={`relative ${activeLocationIndex === actualIndex ? 'ring-2 ring-primary/50 rounded-xl' : ''}`}
                          onClick={() => setActiveLocationIndex(actualIndex)}
                        >
                          <div className="relative">
                            <LocationPicker
                              key={`location-picker-${actualIndex}`}
                              value={loc?.country || ''}
                              initialLocation={loc?.latitude && loc?.longitude ? {
                                lat: loc.latitude,
                                lon: loc.longitude,
                                display_name: loc.country,
                                country: loc.country,
                                country_code: loc.country_code,
                                city: loc.city,
                                state: loc.region,
                                radius: loc.radius,
                                distance_unit: loc.distance_unit
                              } : undefined}
                              onChange={(location, details) => {
                                const newLocations = [...locations];
                                newLocations[actualIndex] = {
                                  country: location,
                                  country_code: details?.country_code,
                                  region: details?.state,
                                  city: details?.city,
                                  latitude: details?.lat,
                                  longitude: details?.lon,
                                  radius: details?.radius,
                                  distance_unit: details?.distance_unit,
                                };
                                setLocations(newLocations);
                              }}
                              placeholder={`Search for location ${actualIndex + 1}...`}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const newLocations = locations.filter((_, i) => i !== actualIndex);
                                setLocations(newLocations);
                                if (activeLocationIndex >= actualIndex) {
                                  setActiveLocationIndex(Math.max(0, activeLocationIndex - 1));
                                }
                              }}
                              className="absolute top-2 right-2 w-6 h-6 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center text-red-500 z-10"
                              title="Remove location"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add Location Button */}
                  {!showOptionalLocation && locations.length === 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionalLocation(true);
                        if (locations.length === 1) {
                          setLocations([...locations, { country: '' }]);
                        }
                        setActiveLocationIndex(1);
                      }}
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors py-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add another location
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const newLocations = [...locations, { country: '' }];
                        setLocations(newLocations);
                        setActiveLocationIndex(newLocations.length - 1);
                      }}
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors py-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add location {locations.length + 1}
                    </button>
                  )}

                  {/* Display all selected locations */}
                  {locations.filter(loc => loc.country).length > 1 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {locations.filter(loc => loc.country).map((loc, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                          {loc.city || loc.region || loc.country}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Age Range */}
                <div className="space-y-4 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-xl border border-primary/10">
                  <Label className="font-semibold text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                      Age Range
                    </span>
                    <span className="px-3 py-1 bg-primary/10 text-primary font-bold rounded-full text-sm">
                      {audience.age[0]} - {audience.age[1]} yrs
                    </span>
                  </Label>
                  <div className="px-2">
                    <Slider
                      min={18}
                      max={65}
                      step={1}
                      value={[audience.age[0], audience.age[1]]}
                      onValueChange={(value) => {
                        if (Array.isArray(value) && value.length === 2) {
                          setAudience({ age: [value[0], value[1]] as [number, number] });
                        }
                      }}
                      className="py-2 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2 [&_[role=slider]]:border-primary [&_[role=slider]]:bg-white [&_[role=slider]]:shadow-lg [&_[role=slider]]:shadow-primary/20"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground font-medium">
                    <span>18 years</span>
                    <span>65 years</span>
                  </div>
                </div>

                {/* Gender */}
                <div className="space-y-3">
                  <Label className="font-semibold text-foreground flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent"><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 1 0-16 0" /></svg>
                    Gender
                  </Label>
                  <RadioGroup
                    value={audience.gender}
                    onValueChange={(value: string) => setAudience({ gender: value as 'all' | 'male' | 'female' })}
                    className="grid grid-cols-3 gap-3"
                  >
                    <label
                      htmlFor="gender-all"
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${audience.gender === 'all' ? 'border-primary bg-primary/10 shadow-sm' : 'border-border/50 hover:border-primary/50 hover:bg-primary/5'}`}
                    >
                      <RadioGroupItem value="all" id="gender-all" className="sr-only" />
                      <span className={`text-sm font-medium ${audience.gender === 'all' ? 'text-primary' : ''}`}>All</span>
                    </label>
                    <label
                      htmlFor="gender-male"
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${audience.gender === 'male' ? 'border-primary bg-primary/10 shadow-sm' : 'border-border/50 hover:border-primary/50 hover:bg-primary/5'}`}
                    >
                      <RadioGroupItem value="male" id="gender-male" className="sr-only" />
                      <span className={`text-sm font-medium ${audience.gender === 'male' ? 'text-primary' : ''}`}>Male</span>
                    </label>
                    <label
                      htmlFor="gender-female"
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${audience.gender === 'female' ? 'border-primary bg-primary/10 shadow-sm' : 'border-border/50 hover:border-primary/50 hover:bg-primary/5'}`}
                    >
                      <RadioGroupItem value="female" id="gender-female" className="sr-only" />
                      <span className={`text-sm font-medium ${audience.gender === 'female' ? 'text-primary' : ''}`}>Female</span>
                    </label>
                  </RadioGroup>
                </div>

                {/* Interests */}
                <div className="space-y-3">
                  <Label htmlFor="interests" className="font-semibold text-foreground flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                    Interests
                    <span className="text-xs font-normal text-muted-foreground">(comma-separated)</span>
                  </Label>
                  <Input
                    id="interests"
                    placeholder="e.g., Fitness, Technology, Travel, Fashion"
                    value={audience.interests.join(', ')}
                    onChange={(e) => setAudience({ interests: e.target.value.split(',').map((i) => i.trim()).filter(Boolean) })}
                    className="h-12 border-border/50 focus:border-primary focus:ring-primary/20 rounded-xl"
                  />
                </div>

                {/* Lookalike Upload - COMMENTED OUT
              <div className="space-y-3 pt-4 border-t border-border/30">
                <Label className="font-semibold text-foreground flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  Lookalike Seed List
                  <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                </Label>
                
                {!lookalikePreviewName ? (
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-accent/5 to-accent/10 hover:from-accent/10 hover:to-accent/15 rounded-xl border border-accent/20 hover:border-accent/40 cursor-pointer transition-all text-sm font-semibold text-accent shadow-sm hover:shadow-md">
                      <input type="file" accept=".csv,text/csv" onChange={onLookalikeFileChange} className="hidden" />
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      <span>Upload CSV</span>
                    </label>
                    <span className="text-xs text-muted-foreground">Upload a seed list to create lookalike audiences</span>
                  </div>
                ) : (
                  <div>
                    <div className="inline-flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-accent/5 to-primary/5 rounded-xl border border-accent/20 shadow-md">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate max-w-[160px] sm:max-w-[200px]" title={lookalikePreviewName}>
                          {lookalikePreviewName}
                        </p>
                        {lookalikePreviewRows && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {lookalikePreviewRows.length} rows • {lookalikePreviewRows[0]?.length || 0} columns
                          </p>
                        )}
                      </div>
                      
                      <button
                        type="button"
                        onClick={removeLookalikeFile}
                        className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-500 hover:text-red-600 transition-all shadow-sm hover:shadow"
                        title="Remove file"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              */}
              </div>

              {/* Right Column: AI Suggestions & Estimates */}
              <div className="relative rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 via-primary/5 to-accent/5 shadow-lg overflow-hidden">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-gradient-to-r from-accent/10 to-primary/10 backdrop-blur-sm border-b border-accent/10">
                  <div className="px-6 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-lg shadow-accent/25">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-lg">AI Suggestions</h4>
                      <p className="text-xs text-muted-foreground">Powered by machine learning</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-5 p-6">

                  {/* AI Suggestion Content */}
                  <div className="space-y-4">
                    {!suggestion && !generating && (
                      <div className="p-5 bg-white/60 rounded-xl border border-border/30 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                          </div>
                          <div>
                            <p className="text-foreground font-medium">Ready for AI suggestions</p>
                            <p className="text-sm text-muted-foreground mt-1">Click "Generate AI Suggestions" below to get smart targeting recommendations based on your workspace and creative brief.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {generating && (
                      <div className="p-5 bg-white/60 rounded-xl border border-accent/30 shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                          </div>
                          <div>
                            <p className="text-foreground font-medium">Generating suggestions...</p>
                            <p className="text-sm text-muted-foreground">Our AI is analyzing your workspace data</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {suggestion && suggestion.status === 'READY' && suggestion.suggestion && (
                      <div className="space-y-4 p-5 bg-white/80 rounded-xl border border-accent/20 shadow-md">
                        <div className="grid grid-cols-2 gap-3 pb-6">
                          {/* Location - Clickable */}
                          <button
                            type="button"
                            onClick={async () => {
                              const loc = suggestion.suggestion.location;
                              if (loc) {
                                // Build search query from location parts
                                const locationParts = [
                                  loc.city,
                                  loc.state || loc.region,
                                  loc.country || (typeof loc === 'string' ? loc : '')
                                ].filter(Boolean);
                                const searchQuery = locationParts.join(', ') || (typeof loc === 'string' ? loc : '');

                                toast.info(`Geocoding location: ${searchQuery}...`);

                                try {
                                  // Geocode the location using Nominatim API
                                  const response = await fetch(
                                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`,
                                    {
                                      headers: {
                                        'Accept-Language': 'en',
                                        // User-Agent is required by Nominatim usage policy
                                        'User-Agent': 'SocioviaLaunchpad/1.0',
                                      },
                                    }
                                  );
                                  const data = await response.json();

                                  if (data && data.length > 0) {
                                    const item = data[0];
                                    const newLocation = {
                                      country: item.address?.country || loc.country || loc,
                                      country_code: item.address?.country_code?.toUpperCase() || '',
                                      region: item.address?.state || item.address?.region || item.address?.province || loc.state || loc.region || '',
                                      city: item.address?.city || item.address?.town || item.address?.village || item.address?.municipality || loc.city || '',
                                      latitude: parseFloat(item.lat),
                                      longitude: parseFloat(item.lon),
                                      radius: 25, // Default radius
                                      distance_unit: 'km' as const,
                                    };

                                    // Update the locations array (for multi-location UI)
                                    const newLocations = [...locations];
                                    newLocations[0] = newLocation;
                                    setLocations(newLocations);

                                    // Also update audience for backward compatibility
                                    setAudience({
                                      location: {
                                        ...audience.location,
                                        ...newLocation,
                                      }
                                    });

                                    setAppliedSuggestions(prev => ({ ...prev, location: true }));
                                    toast.success(`Location applied: ${newLocation.country} (${newLocation.latitude.toFixed(2)}, ${newLocation.longitude.toFixed(2)})`);
                                  } else {
                                    // Fallback: apply without coordinates if geocoding fails
                                    const newLocation = {
                                      country: loc.country || loc,
                                      region: loc.state || loc.region || '',
                                      city: loc.city || '',
                                    };
                                    const newLocations = [...locations];
                                    newLocations[0] = newLocation;
                                    setLocations(newLocations);
                                    setAudience({
                                      location: {
                                        ...audience.location,
                                        ...newLocation,
                                      }
                                    });
                                    setAppliedSuggestions(prev => ({ ...prev, location: true }));
                                    toast.warning(`Location applied without coordinates (geocoding failed): ${loc.country || loc}`);
                                  }
                                } catch (error) {
                                  console.error('Geocoding failed:', error);
                                  // Fallback: apply without coordinates
                                  const newLocation = {
                                    country: loc.country || loc,
                                    region: loc.state || loc.region || '',
                                    city: loc.city || '',
                                  };
                                  const newLocations = [...locations];
                                  newLocations[0] = newLocation;
                                  setLocations(newLocations);
                                  setAudience({
                                    location: {
                                      ...audience.location,
                                      ...newLocation,
                                    }
                                  });
                                  setAppliedSuggestions(prev => ({ ...prev, location: true }));
                                  toast.error(`Location applied without coordinates (error): ${loc.country || loc}`);
                                }
                              }
                            }}
                            className={`group relative p-4 rounded-xl border-2 transition-all cursor-pointer text-left ${appliedSuggestions.location
                              ? 'bg-green-50 border-green-200'
                              : 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30 shadow-sm hover:shadow-md hover:border-primary/50'
                              }`}
                          >
                            <div className="text-xs text-muted-foreground flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                Location
                              </span>
                              {!appliedSuggestions.location && (
                                <span className="text-[10px] px-2 py-0.5 bg-primary text-white rounded-full font-medium">Apply</span>
                              )}
                              {appliedSuggestions.location && (
                                <span className="text-[10px] px-2 py-0.5 bg-green-500 text-white rounded-full font-medium">✓ Done</span>
                              )}
                            </div>
                            <div className="font-semibold text-foreground mt-2">{suggestion.suggestion.location?.country || suggestion.suggestion.location || '—'}</div>
                            {/* Floating tooltip - positioned inside button */}
                            {!appliedSuggestions.location && (
                              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-100 transition-all duration-200 pointer-events-none z-20" style={{ animation: 'bounce 2s infinite' }}>
                                <div className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                  📍 Click to apply
                                </div>
                              </div>
                            )}
                          </button>

                          {/* Age Range - Clickable */}
                          <button
                            type="button"
                            onClick={() => {
                              const age = suggestion.suggestion.age;
                              if (age && Array.isArray(age) && age.length === 2) {
                                setAudience({ age: [age[0], age[1]] as [number, number] });
                                setAppliedSuggestions(prev => ({ ...prev, age: true }));
                                toast.success(`Age range applied: ${age[0]} - ${age[1]}`);
                              }
                            }}
                            className={`group relative p-4 rounded-xl border-2 transition-all cursor-pointer text-left ${appliedSuggestions.age
                              ? 'bg-green-50 border-green-200'
                              : 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30 shadow-sm hover:shadow-md hover:border-primary/50'
                              }`}
                          >
                            <div className="text-xs text-muted-foreground flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                                Age Range
                              </span>
                              {!appliedSuggestions.age && (
                                <span className="text-[10px] px-2 py-0.5 bg-primary text-white rounded-full font-medium">Apply</span>
                              )}
                              {appliedSuggestions.age && (
                                <span className="text-[10px] px-2 py-0.5 bg-green-500 text-white rounded-full font-medium">✓ Done</span>
                              )}
                            </div>
                            <div className="font-semibold text-foreground mt-2">
                              {(suggestion.suggestion.age && `${suggestion.suggestion.age[0]} - ${suggestion.suggestion.age[1]} years`) || '—'}
                            </div>
                            {!appliedSuggestions.age && (
                              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-100 transition-all duration-200 pointer-events-none z-20" style={{ animation: 'bounce 2s infinite', animationDelay: '0.2s' }}>
                                <div className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                  🎂 Click to apply
                                </div>
                              </div>
                            )}
                          </button>

                          {/* Gender - Clickable */}
                          <button
                            type="button"
                            onClick={() => {
                              const gender = suggestion.suggestion.gender;
                              if (gender) {
                                setAudience({ gender: gender });
                                setAppliedSuggestions(prev => ({ ...prev, gender: true }));
                                toast.success(`Gender applied: ${gender}`);
                              }
                            }}
                            className={`group relative p-4 rounded-xl border-2 transition-all cursor-pointer text-left ${appliedSuggestions.gender
                              ? 'bg-green-50 border-green-200'
                              : 'bg-gradient-to-br from-accent/5 to-accent/10 border-accent/30 shadow-sm hover:shadow-md hover:border-accent/50'
                              }`}
                          >
                            <div className="text-xs text-muted-foreground flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent"><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 1 0-16 0" /></svg>
                                Gender
                              </span>
                              {!appliedSuggestions.gender && (
                                <span className="text-[10px] px-2 py-0.5 bg-accent text-white rounded-full font-medium">Apply</span>
                              )}
                              {appliedSuggestions.gender && (
                                <span className="text-[10px] px-2 py-0.5 bg-green-500 text-white rounded-full font-medium">✓ Done</span>
                              )}
                            </div>
                            <div className="font-semibold text-foreground mt-2 capitalize">{suggestion.suggestion.gender || 'all'}</div>
                            {!appliedSuggestions.gender && (
                              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-100 transition-all duration-200 pointer-events-none z-20" style={{ animation: 'bounce 2s infinite', animationDelay: '0.4s' }}>
                                <div className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                  👤 Click to apply
                                </div>
                              </div>
                            )}
                          </button>

                          {/* Confidence - Display only */}
                          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                              Confidence
                            </div>
                            <div className="font-bold text-lg mt-2 text-green-600">
                              {typeof suggestion.confidence === 'number' ? `${(suggestion.confidence * 100).toFixed(0)}%` : '—'}
                            </div>
                          </div>
                        </div>

                        {/* Interests - Clickable */}
                        <div className="pb-6">
                          <button
                            type="button"
                            onClick={() => {
                              const interests = suggestion.suggestion.interests;
                              if (interests && Array.isArray(interests) && interests.length > 0) {
                                setAudience({ interests: interests });
                                setAppliedSuggestions(prev => ({ ...prev, interests: true }));
                                toast.success(`Interests applied: ${interests.slice(0, 3).join(', ')}${interests.length > 3 ? '...' : ''}`);
                              }
                            }}
                            className={`group relative w-full p-4 rounded-xl border-2 transition-all cursor-pointer text-left ${appliedSuggestions.interests
                              ? 'bg-green-50 border-green-200'
                              : 'bg-gradient-to-br from-primary/5 to-accent/5 border-primary/30 shadow-sm hover:shadow-md hover:border-primary/50'
                              }`}
                          >
                            <div className="text-xs text-muted-foreground flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                                Interests
                              </span>
                              {!appliedSuggestions.interests && (
                                <span className="text-[10px] px-2 py-0.5 bg-primary text-white rounded-full font-medium">Apply</span>
                              )}
                              {appliedSuggestions.interests && (
                                <span className="text-[10px] px-2 py-0.5 bg-green-500 text-white rounded-full font-medium">✓ Done</span>
                              )}
                            </div>
                            <div className="font-semibold text-foreground mt-2">{(suggestion.suggestion.interests || []).slice(0, 5).join(', ') || '—'}</div>
                            {!appliedSuggestions.interests && (
                              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-100 transition-all duration-200 pointer-events-none z-20" style={{ animation: 'bounce 2s infinite', animationDelay: '0.6s' }}>
                                <div className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                  💡 Click to apply
                                </div>
                              </div>
                            )}
                          </button>
                        </div>

                        {suggestion.explanation && (
                          <div className="p-4 bg-gradient-to-r from-accent/5 to-primary/5 rounded-xl border border-accent/10">
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                              AI Explanation
                            </div>
                            <div className="text-sm text-foreground">{suggestion.explanation}</div>
                          </div>
                        )}

                        <div className="flex gap-3 pt-2">
                          <Button onClick={handleApplySuggestion} size="default" className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25">Apply All Suggestions</Button>
                          <Button variant="outline" size="default" onClick={() => { setSuggestion(null); setSuggestionId(null); }} className="border-border/50 hover:bg-muted/50">Dismiss</Button>
                        </div>
                      </div>
                    )}

                    {suggestion && suggestion.status !== 'READY' && (
                      <div className="p-4 bg-white/60 rounded-xl border border-border/30">
                        <p className="text-foreground">Suggestion status: <span className="font-medium text-accent">{suggestion.status}</span></p>
                      </div>
                    )}
                  </div>

                  {/* Meta Predicted Performance */}
                  <div className="border-t border-accent/10 pt-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
                        </div>
                        <h5 className="font-bold text-foreground">Meta Predicted Performance</h5>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${estimatesLoading ? 'bg-yellow-100 text-yellow-700' : estimates ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {estimatesLoading ? '⚡ Updating…' : estimates ? '✓ Live' : '● Idle'}
                      </span>
                    </div>

                    {estimatesError && (
                      <div className={`p-4 rounded-xl mb-4 ${estimatesError.isSessionError ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${estimatesError.isSessionError ? 'bg-amber-100' : 'bg-red-100'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={estimatesError.isSessionError ? 'text-amber-500' : 'text-red-500'}>
                              {estimatesError.isSessionError ? (
                                <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>
                              ) : (
                                <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>
                              )}
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-semibold ${estimatesError.isSessionError ? 'text-amber-700' : 'text-red-700'}`}>{estimatesError.title}</p>
                            <p className={`text-xs mt-0.5 ${estimatesError.isSessionError ? 'text-amber-600' : 'text-red-600'}`}>{estimatesError.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">Estimates are optional — you can continue with your campaign.</p>
                          </div>
                          <button
                            onClick={() => setEstimatesError(null)}
                            className={`text-xs px-2 py-1 rounded ${estimatesError.isSessionError ? 'text-amber-600 hover:bg-amber-100' : 'text-red-600 hover:bg-red-100'}`}
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}

                    {!estimates && !estimatesLoading && (
                      <div className="p-5 bg-white/60 rounded-xl border border-border/30">
                        <p className="text-muted-foreground">Predicted reach & performance will appear here based on your audience settings.</p>
                      </div>
                    )}

                    {estimatesLoading && (
                      <div className="p-5 bg-white/60 rounded-xl border border-blue-100 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <div>
                          <p className="text-foreground font-medium">Fetching estimates...</p>
                          <p className="text-sm text-muted-foreground">Connecting to Meta Ads API</p>
                        </div>
                      </div>
                    )}

                    {estimates && (
                      <div className="space-y-4">
                        {/* Show message when no location is selected */}
                        {estimates.no_location_selected && (
                          <div className="group relative">
                            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 flex items-center gap-3 cursor-help">
                              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-amber-700">No location selected</p>
                                <p className="text-xs text-amber-600/80 mt-0.5">Select a location above to get Meta predictions</p>
                              </div>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                            </div>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                              Select location to get Meta predictions
                              <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 -mt-1"></div>
                            </div>
                          </div>
                        )}

                        {estimates.no_location_selected && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200 opacity-60">
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                Estimated Reach
                              </div>
                              <div className="font-bold text-xl text-gray-400 mt-2">— —</div>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200 opacity-60">
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                Daily Impressions
                              </div>
                              <div className="font-bold text-xl text-gray-400 mt-2">— —</div>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200 opacity-60">
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                                Daily Clicks
                              </div>
                              <div className="font-bold text-xl text-gray-400 mt-2">— —</div>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200 opacity-60">
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                Confidence
                              </div>
                              <div className="font-bold text-xl text-gray-400 mt-2">— —</div>
                            </div>
                          </div>
                        )}

                        {/* Show combined locations info if multiple locations */}
                        {!estimates.no_location_selected && estimates.locations_count && estimates.locations_count > 1 && (
                          <div className="p-3 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl border border-primary/20 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-primary">Combined from {estimates.locations_count} locations</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {estimates.locations_used?.join(', ') || 'Multiple regions'}
                              </p>
                            </div>
                            <span className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">Aggregated</span>
                          </div>
                        )}

                        {!estimates.no_location_selected && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                Estimated Reach
                              </div>
                              <div className="font-bold text-xl text-primary mt-2">{formatIndianNumber(estimates.estimated_reach || 0)}</div>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-accent/5 to-accent/10 rounded-xl border border-accent/20">
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                Daily Impressions
                              </div>
                              <div className="font-bold text-xl text-accent mt-2">{formatIndianNumber(estimates.estimated_daily_impressions || 0)}</div>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-200">
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                                Daily Clicks
                              </div>
                              <div className="font-bold text-xl text-blue-600 mt-2">{formatIndianNumber(estimates.estimated_daily_clicks || 0)}</div>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-100/50 rounded-xl border border-green-200">
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                Confidence
                              </div>
                              <div className="font-bold text-xl text-green-600 mt-2">
                                {typeof estimates.confidence === 'number' ? `${(estimates.confidence * 100).toFixed(0)}%` : '—'}
                              </div>
                            </div>
                          </div>
                        )}

                        {!estimates.no_location_selected && (
                          <div className="p-4 bg-white/80 rounded-xl border border-border/30">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-500"><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 18V6" /></svg>
                                  Estimated CPA
                                </div>
                                <div className="font-bold text-xl text-orange-600 mt-1">₹{estimates.estimated_cpa ? `${Number(estimates.estimated_cpa).toFixed(2)}` : '—'}</div>
                              </div>
                              {estimates.breakdown && <span className="text-xs bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full font-medium">Breakdown available</span>}
                            </div>
                            {estimates.meta_raw && estimates.meta_raw.data && (estimates.meta_raw.data.users_lower_bound || estimates.meta_raw.data.users_upper_bound) && (
                              <div className="mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                Meta bounds: {formatIndianNumber(estimates.meta_raw.data.users_lower_bound)} — {formatIndianNumber(estimates.meta_raw.data.users_upper_bound)}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-3">
                          <Button
                            variant="default"
                            size="default"
                            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25"
                            disabled={estimates.no_location_selected}
                            onClick={() => {
                              const predicted = estimates?.predicted_audience ?? estimates?.audience ?? null;
                              if (!predicted) {
                                toast.error('No audience prediction included in estimates to apply.');
                                return;
                              }
                              const country = predicted.location?.country_display ?? predicted.location?.country ?? predicted.location?.country;
                              setAudience({
                                mode: 'AI',
                                location: { ...audience.location, country: country ?? audience.location?.country },
                                age: predicted.age ?? audience.age,
                                gender: predicted.gender ?? audience.gender,
                                interests: predicted.interests ?? audience.interests ?? [],
                              });
                              toast.success('Applied predicted audience from estimates');
                            }}
                          >
                            Apply Predicted Audience
                          </Button>
                          <Button variant="outline" size="default" onClick={() => refreshEstimates()} className="border-border/50 hover:bg-muted/50">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
                            Refresh
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Generate AI Suggestions + Clear Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-border/30">
              <Button
                onClick={handleGenerateAISuggestions}
                disabled={generating}
                className="flex-1 h-14 text-base font-bold bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent shadow-xl shadow-accent/30"
                size="lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {generating ? 'Generating AI Suggestions...' : 'Generate AI Suggestions'}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14 px-8 border-2 border-border/50 hover:bg-muted/50 hover:border-border"
                onClick={() => {
                  setIndustry('');
                  setCreativeDesc('');
                  setSuggestion(null);
                  setSuggestionId(null);
                  setAudience({
                    mode: 'MANUAL',
                    location: { country: '' },
                    age: [18, 65],
                    gender: 'all',
                    interests: [],
                  });
                  toast.success('All fields cleared');
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-8 md:mt-10">
          <Button
            variant="outline"
            onClick={handleBack}
            size="lg"
            className="h-12 px-8 border-2 border-border/50 hover:bg-muted/50 hover:border-border gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
            Back
          </Button>
          <Button
            onClick={handleContinue}
            size="lg"
            className="h-12 px-8 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-xl shadow-primary/30 gap-2 font-bold"
          >
            {continueCta}
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
