// src/pages/CreativeEditor.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Image as ImageIcon, Trash2, ClipboardCheck, PenLine, Globe, Link2, Plus, Video, X, Upload } from 'lucide-react';
import logo from '@/assets/sociovia_logo.png';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCampaignStore, useVideoStore } from '@/store/campaignStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config';

/* =========================
   Config
========================= */
const API_ORIGIN = API_BASE_URL;

const STORAGE_KEY = 'sv_creative_draft';           // only imageUrl + cta
const GEN_CTA_KEY = 'sv_workspace_default_cta';    // optional default CTA

const ctaOptions = [
  { value: 'SHOP_NOW', label: 'Shop Now' },
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'APPLY_NOW', label: 'Apply Now' },
  { value: 'CONTACT_US', label: 'Contact Us' },
];

/* =========================
   Types
========================= */
type Variation = { id: string; headline?: string; description?: string; cta?: string; primaryText?: string };

type Workspace = {
  id: number;
  name?: string;
  sector?: string;
  website?: string;
  url?: string;
  logo?: string;
  logo_url?: string;
  image?: string;
  defaultCta?: string;
  [k: string]: any;
};

/* =========================
   Helpers
========================= */
function isValidUrl(u: string) {
  try { const url = new URL(u); return !!url.protocol && !!url.hostname; } catch { return false; }
}

async function safeFetchJson(url: string, init: RequestInit = {}) {
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        accept: 'application/json',
        ...(init.headers || {}),
      },
    });
    const text = await res.text();
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return null;
    try { return JSON.parse(text); } catch { return null; }
  } catch {
    return null;
  }
}

function mapWorkspace(raw: any): Workspace {
  return {
    id: Number(raw?.id ?? raw?.workspace_id ?? raw?.user_id ?? 0),
    name: raw?.business_name || raw?.name || `Workspace ${raw?.id ?? raw?.user_id ?? ''}`,
    sector: raw?.industry || raw?.sector || undefined,
    website: raw?.website || raw?.site || undefined,
    url: raw?.url || raw?.website || raw?.site || undefined,
    logo: raw?.logo || raw?.logo_url || raw?.image || undefined,
    logo_url: raw?.logo_url || undefined,
    image: raw?.image || undefined,
    defaultCta: raw?.defaultCta || raw?.default_cta || undefined,
    _raw: raw,
  };
}

/* =========================
   Robust JSON parsing for model-ish responses
========================= */
function extractJsonBlock(text: string): string | null {
  if (!text) return null;
  const mFence = text.match(/```json\s*([\s\S]*?)```/i);
  if (mFence && mFence[1]) return mFence[1].trim();

  const firstArr = text.indexOf('[');
  const lastArr = text.lastIndexOf(']');
  if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
    return text.slice(firstArr, lastArr + 1);
  }
  const firstObj = text.indexOf('{');
  const lastObj = text.lastIndexOf('}');
  if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
    return text.slice(firstObj, lastObj + 1);
  }
  return null;
}

function cleanAlmostJson(s: string): string {
  if (!s) return s;
  let txt = s.trim();
  txt = txt.replace(/“|”/g, '"').replace(/‘|’/g, "'");
  txt = txt.replace(/^`+|`+$/g, '');
  if (txt.includes("'") && !txt.includes('"')) txt = txt.replace(/'/g, '"');
  txt = txt.replace(/,\s*(\}|\])/g, '$1');
  txt = txt.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false').replace(/\bNone\b/g, 'null');
  return txt;
}

function tryParseJson<T = any>(raw: any): T | null {
  if (raw == null) return null;
  if (typeof raw !== 'string') {
    try { return JSON.parse(JSON.stringify(raw)); } catch { return null; }
  }
  const text = String(raw);
  try { return JSON.parse(text) as T; } catch { }
  const block = extractJsonBlock(text);
  if (block) {
    try { return JSON.parse(block) as T; } catch { }
  }
  const cleaned = cleanAlmostJson(block || text);
  try { return JSON.parse(cleaned) as T; } catch { }
  return null;
}

function normalizeVariations(input: any, count = 3): Variation[] {
  const maxN = Math.max(1, count);
  if (Array.isArray(input)) {
    const out: Variation[] = [];
    for (let i = 0; i < Math.min(maxN, input.length); i++) {
      const item = input[i];
      if (item && typeof item === 'object') {
        out.push({
          id: String(item.id ?? i + 1),
          headline: String(item.headline ?? item.title ?? item.heading ?? '').slice(0, 100),
          description: String(item.description ?? item.body ?? item.text ?? '').slice(0, 280),
          primaryText: String(item.primaryText ?? item.primary_text ?? item.description ?? item.body ?? item.text ?? '').slice(0, 280),
          cta: String(item.cta ?? item.call_to_action ?? item.button ?? 'Learn More').slice(0, 60),
        });
      }
    }
    if (out.length) return out;
  }

  if (input && typeof input === 'object') {
    const candidates = input.variations || input.data || input.results || input.suggestions || null;
    if (Array.isArray(candidates)) {
      return normalizeVariations(candidates, maxN);
    }
    if (input.workspace || input.product || input.draft) {
      if (Array.isArray(input.output)) return normalizeVariations(input.output, maxN);
    }
  }

  if (typeof input === 'string' && input.trim()) {
    const lines = input.trim().split(/\n+/);
    const headline = (lines[0] || '').slice(0, 100);
    const desc = (lines.slice(1).join(' ') || input).slice(0, 280);
    return [
      { id: '1', headline, description: desc, primaryText: desc, cta: 'Learn More' },
    ];
  }

  return [];
}

/* =========================
   Hook: fetch workspaces list by user, then select sv_selected_workspace_id
========================= */
function useSelectedWorkspaceViaUserList() {
  const [wsId, setWsId] = useState<number | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const persisted = localStorage.getItem('sv_selected_workspace_id');
    const idNum = persisted ? Number(persisted) : null;
    setWsId(Number.isFinite(idNum as number) ? (idNum as number) : null);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function run() {
      setLoading(true);
      let userId: number | null = null;
      try {
        const raw = localStorage.getItem('sv_user');
        if (raw) {
          const u = JSON.parse(raw);
          userId = Number(u?.id ?? u?.user_id ?? null);
        }
      } catch { }

      if (!userId) {
        const me = await safeFetchJson(`${API_ORIGIN}/api/me`, { credentials: 'include' });
        const u = (me as any)?.user ?? me;
        userId = Number(u?.id ?? u?.user_id ?? null) || null;
      }

      if (!userId) {
        if (mounted) { setWorkspace(null); setLoading(false); }
        return;
      }

      const data = await safeFetchJson(`${API_ORIGIN}/api/workspaces?user_id=${userId}`);
      let list: any[] = [];
      if (Array.isArray(data)) list = data;
      else if (data?.workspaces && Array.isArray(data.workspaces)) list = data.workspaces;
      else if (data?.data && Array.isArray(data.data)) list = data.data;

      let picked: any = null;
      if (wsId) {
        picked = list.find(
          (w) => Number(w?.id ?? w?.workspace_id ?? w?.user_id) === wsId
        );
      }
      if (!picked && list.length) picked = list[0];

      if (mounted) {
        setWorkspace(picked ? mapWorkspace(picked) : null);
        setLoading(false);
      }
    }
    run();
    return () => { mounted = false; };
  }, [wsId]);

  return { wsId, workspace, loading };
}

/* =========================
   Payload builder for generate-copy
========================= */
function buildGeneratePayload(
  creative: {
    headline?: string;
    description?: string;
    primaryText?: string;
    url?: string;
  },
  ws?: Workspace | null,
  count = 3
) {
  const website = creative.url || ws?.website || ws?.url || undefined;
  return {
    product: {
      title: creative.headline || ws?.name || creative.primaryText || 'Product',
      short_description: creative.description || creative.primaryText || ws?.sector || '',
      brand: ws?.name,
      website,
      category: ws?.sector,
    },
    workspace: ws
      ? {
        id: ws.id,
        name: ws.name,
        sector: ws.sector,
        website: ws.website || ws.url || undefined,
        logo: ws.logo || ws.logo_url || ws.image || undefined,
        defaultCta: ws.defaultCta,
      }
      : null,
    draft: {
      headline: creative.headline || '',
      primaryText: creative.primaryText || '',
      description: creative.description || '',
      url: website || '',
    },
    count,
  };
}

/* =========================
   Component (without live preview)
========================= */
export default function CreativeEditor() {
  const { creative, setCreative, setStep, workspace: storeWs } = useCampaignStore();
  const {
    videoUrl: storedVideoUrl,
    videoFile: storedVideoFile,
    thumbnailUrl: storedThumbnailUrl,
    thumbnailFile: storedThumbnailFile,
    setVideoUrl,
    setVideoFile,
    setThumbnailUrl,
    setThumbnailFile,
    clearVideo: clearVideoStore,
    clearThumbnail: clearThumbnailStore
  } = useVideoStore();
  const navigate = useNavigate();

  const { workspace: ws, loading: wsLoading } = useSelectedWorkspaceViaUserList();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [mediaMode, setMediaMode] = useState<'image' | 'video'>('image'); // Track which mode is active

  const [aiVariations, setAiVariations] = useState<Variation[]>([]);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);

  // AI rewrite loading states
  const [rewritingPrimaryText, setRewritingPrimaryText] = useState(false);
  const [rewritingHeadline, setRewritingHeadline] = useState(false);
  const [rewritingDescription, setRewritingDescription] = useState(false);

  // New state for rewrite options selection
  const [rewriteState, setRewriteState] = useState<{
    field: 'primaryText' | 'headline' | 'description' | null;
    options: string[];
    isOpen: boolean;
  }>({
    field: null,
    options: [],
    isOpen: false,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && typeof saved === 'object') {
        setCreative({
          imageUrl: saved.imageUrl ?? creative.imageUrl ?? '',
          cta: saved.cta ?? creative.cta ?? undefined,
        });
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ imageUrl: creative.imageUrl ?? '', cta: creative.cta ?? '' }));
      } catch { /* ignore */ }
    }, 250);
    return () => window.clearTimeout(id);
  }, [creative]);

  const workspaceDefaultCta = useMemo(() => {
    const fromStore = (storeWs && (storeWs as any).defaultCta) as string | undefined;
    if (fromStore) return fromStore;
    if (ws?.defaultCta) return ws.defaultCta;
    const generic = localStorage.getItem(GEN_CTA_KEY) || undefined;
    return generic || 'LEARN_MORE';
  }, [storeWs, ws]);

  useEffect(() => {
    if (!creative.cta && workspaceDefaultCta) {
      setCreative({ cta: workspaceDefaultCta });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceDefaultCta]);

  useEffect(() => {
    if (!creative.url && ws) {
      const maybe = ws.website || ws.url;
      if (maybe && /^https?:\/\//i.test(maybe)) {
        setCreative({ url: maybe });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws]);

  /* ---------- Image Upload Helpers ---------- */
  const openFileDialog = () => fileInputRef.current?.click();

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const validateImage = (file: File): string | null => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) return 'Unsupported image type. Use PNG, JPG, GIF, or WEBP.';
    if (file.size > 10 * 1024 * 1024) return 'File is too large. Max 10 MB.';
    return null;
  };

  const ensureDimensions = (src: string): Promise<{ w: number; h: number }> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.onerror = reject;
      img.src = src;
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const err = validateImage(f);
    if (err) {
      toast.error(err);
      e.currentTarget.value = '';
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(f);
      const { w, h } = await ensureDimensions(dataUrl);
      const ratio = (w / h).toFixed(2);
      toast.message('Image added', { description: `Detected ${w}×${h} (${ratio}). Recommended: 1080×1080 or 1200×628.` });
      setCreative({ imageUrl: dataUrl, videoUrl: '' }); // Clear video when image is added
      setMediaMode('image');
    } catch {
      toast.error('Could not load image');
    } finally {
      setUploading(false);
      if (e.currentTarget) e.currentTarget.value = '';
    }
  };

  const onPasteImage = async () => {
    try {
      const items = await (navigator as any).clipboard.read();
      for (const item of items) {
        const type = item.types.find((t: string) => t.startsWith('image/'));
        if (type) {
          const blob = await item.getType(type);
          const file = new File([blob], 'pasted-image', { type });
          const err = validateImage(file);
          if (err) return toast.error(err);
          const dataUrl = await readFileAsDataUrl(file);
          setCreative({ imageUrl: dataUrl, videoUrl: '' }); // Clear video when image is pasted
          setMediaMode('image');
          toast.success('Image pasted from clipboard');
          return;
        }
      }
      toast.error('No image found in clipboard');
    } catch {
      toast.error('Clipboard access denied or no image found');
    }
  };

  const clearImage = () => setCreative({ imageUrl: '' });

  /* ---------- Video Upload Helpers ---------- */
  const openVideoDialog = () => videoInputRef.current?.click();

  const validateVideo = (file: File): string | null => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-matroska'];
    if (!allowed.includes(file.type)) return 'Unsupported video type. Use MP4, MOV, WEBM, AVI, or MKV.';
    if (file.size > 500 * 1024 * 1024) return 'File is too large. Max 500 MB.';
    return null;
  };

  // Convert file to base64 - used only when needed (on Continue)
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const err = validateVideo(f);
    if (err) {
      toast.error(err);
      e.currentTarget.value = '';
      return;
    }
    setUploadingVideo(true);
    try {
      // Always use blob URL for preview (instant, no memory issues)
      const blobUrl = URL.createObjectURL(f);
      setVideoFile(f); // Store file in video store for later base64 conversion
      setVideoUrl(blobUrl); // Store blob URL in video store for preview
      setCreative({ imageUrl: '' }); // Clear image from campaign store
      toast.success('Video added', { description: `File: ${f.name} (${(f.size / (1024 * 1024)).toFixed(2)} MB)` });
      setMediaMode('video');
    } catch (error) {
      console.error('Video upload error:', error);
      toast.error('Could not load video.');
    } finally {
      setUploadingVideo(false);
      if (e.currentTarget) e.currentTarget.value = '';
    }
  };

  const processDroppedVideo = async (f: File) => {
    const err = validateVideo(f);
    if (err) return toast.error(err);
    setUploadingVideo(true);
    try {
      // Always use blob URL for preview
      const blobUrl = URL.createObjectURL(f);
      setVideoFile(f); // Store file in video store
      setVideoUrl(blobUrl); // Store blob URL in video store
      setCreative({ imageUrl: '' }); // Clear image from campaign store
      toast.success('Video loaded', { description: `${f.name} (${(f.size / (1024 * 1024)).toFixed(2)} MB)` });
      setMediaMode('video');
    } catch (error) {
      console.error('Video drop error:', error);
      toast.error('Failed to load video');
    } finally {
      setUploadingVideo(false);
    }
  };

  const processDroppedImage = async (f: File) => {
    const err = validateImage(f);
    if (err) return toast.error(err);
    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(f);
      await ensureDimensions(dataUrl);
      toast.success('Image loaded');
      setCreative({ imageUrl: dataUrl });
      clearVideoStore(); // Clear video from video store
      setMediaMode('image');
    } catch {
      toast.error('Failed to read dropped image');
    } finally {
      setUploading(false);
    }
  };

  const clearVideo = () => clearVideoStore();

  /* ---------- Thumbnail Upload Helpers (for Video Ads) ---------- */
  const openThumbnailDialog = () => thumbnailInputRef.current?.click();

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate it's an image
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file for thumbnail');
      e.currentTarget.value = '';
      return;
    }

    // Validate file size (max 5MB for thumbnail)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Thumbnail must be under 5MB');
      e.currentTarget.value = '';
      return;
    }

    try {
      const previewUrl = URL.createObjectURL(file);
      setThumbnailFile(file);
      setThumbnailUrl(previewUrl);
      toast.success('Thumbnail added');
    } catch {
      toast.error('Failed to load thumbnail');
    } finally {
      if (e.currentTarget) e.currentTarget.value = '';
    }
  };

  // Extract thumbnail from video at current position
  const extractThumbnailFromVideo = () => {
    const video = document.querySelector('video') as HTMLVideoElement | null;
    if (!video) {
      toast.error('No video found to extract thumbnail from');
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setThumbnailUrl(thumbnailDataUrl);
        setThumbnailFile(null); // Clear file since we're using extracted data
        toast.success('Thumbnail extracted from video');
      }
    } catch (err) {
      console.error('Failed to extract thumbnail:', err);
      toast.error('Failed to extract thumbnail from video');
    }
  };

  const clearThumbnail = () => clearThumbnailStore();

  const handleGenerateImage = async () => {
    setGeneratingImage(true);
    try {
      await new Promise((r) => setTimeout(r, 900));
      const placeholder =
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080">
            <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6EE7F9"/><stop offset="100%" stop-color="#A78BFA"/></linearGradient></defs>
            <rect width="100%" height="100%" fill="url(#g)"/>
            <text x="50%" y="50%" font-size="54" fill="#111" text-anchor="middle" dominant-baseline="middle" font-family="system-ui">AI Image</text>
          </svg>`
        );
      setCreative({ imageUrl: placeholder });
      toast.success('Generated example image (replace with your API)');
    } catch (err: any) {
      toast.error(err?.message || 'Image generation failed');
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleGenerateCopyWithApi = async (count = 3) => {
    setGeneratingCopy(true);
    setAiVariations([]);
    setSelectedVariationId(null);

    try {
      const payload = buildGeneratePayload(creative, ws || undefined, count);

      const headers = { 'Content-Type': 'application/json' };
      const req1 = await fetch(`${API_ORIGIN}/api/v1/generate-copy`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      let body: any = null;
      if (!req1.ok) {
        const req2 = await fetch(`${API_ORIGIN}/v1/generate-copy`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        const raw2 = await req2.text();
        body = tryParseJson<any>(raw2) ?? { success: false, raw: raw2 };
        if (!req2.ok) throw new Error('Copy generation failed');
      } else {
        const raw1 = await req1.text();
        body = tryParseJson<any>(raw1) ?? { success: false, raw: raw1 };
      }

      let final: Variation[] = [];
      if (body?.success && Array.isArray(body?.variations)) {
        final = normalizeVariations(body.variations, count);
      } else if (Array.isArray(body)) {
        final = normalizeVariations(body, count);
      } else if (typeof body === 'string') {
        const parsed = tryParseJson<any>(body);
        final = parsed ? normalizeVariations(parsed, count) : normalizeVariations(body, count);
      } else if (body?.raw_model_text) {
        const parsed = tryParseJson<any>(body.raw_model_text);
        final = parsed ? normalizeVariations(parsed, count) : normalizeVariations(body.raw_model_text, count);
      } else if (body?.raw) {
        const parsed = tryParseJson<any>(body.raw);
        final = parsed ? normalizeVariations(parsed, count) : normalizeVariations(body.raw, count);
      }

      if (!final.length) {
        final = [
          { id: '1', headline: creative.headline || `${ws?.name || 'Your brand'}`, description: creative.primaryText || 'Discover what makes us different.', primaryText: creative.primaryText || 'Discover what makes us different.', cta: 'Learn More' },
          { id: '2', headline: 'Limited time offer', description: 'Save big on your favorites. Shop now!', primaryText: 'Save big on your favorites. Shop now!', cta: 'Shop Now' },
          { id: '3', headline: 'Don’t miss out', description: 'Free shipping and easy returns.', primaryText: 'Free shipping and easy returns.', cta: 'Learn More' },
        ].slice(0, count);
      }

      setAiVariations(final);

      if ((!creative.primaryText && !creative.headline) && final[0]) {
        setCreative({
          primaryText: final[0].description?.slice(0, 125) ?? creative.primaryText,
          headline: final[0].headline?.slice(0, 40) ?? creative.headline,
          description: final[0].description?.slice(0, 30) ?? creative.description,
          cta: final[0].cta || creative.cta || workspaceDefaultCta,
        });
        setSelectedVariationId(final[0].id);
      }

      toast.success('Generated AI variations using workspace context');
    } catch (err: any) {
      await new Promise((r) => setTimeout(r, 500));
      const suggestedHeadline = creative.headline || (ws?.name ? `${ws.name} — Limited Offer` : 'Limited Offer');
      const suggestedPrimary = creative.primaryText || `Discover ${ws?.name || 'our product'} at unbeatable prices. Don’t miss out!`;
      const suggestedDesc = creative.description || (ws?.sector ? `Best in ${ws.sector}.` : 'Free shipping and easy returns.');

      const fb: Variation[] = [
        { id: '1', headline: suggestedHeadline, description: suggestedPrimary, primaryText: suggestedPrimary, cta: workspaceDefaultCta },
        { id: '2', headline: 'Hurry—ends soon', description: suggestedPrimary.slice(0, 125), primaryText: suggestedPrimary.slice(0, 125), cta: workspaceDefaultCta },
        { id: '3', headline: 'Don’t miss out', description: suggestedDesc, primaryText: suggestedDesc, cta: workspaceDefaultCta },
      ];
      setAiVariations(fb);

      if ((!creative.primaryText && !creative.headline) && fb[0]) {
        setCreative({
          primaryText: fb[0].description?.slice(0, 125) ?? creative.primaryText,
          headline: fb[0].headline?.slice(0, 40) ?? creative.headline,
          description: fb[0].description?.slice(0, 30) ?? creative.description,
          cta: fb[0].cta || creative.cta || workspaceDefaultCta,
        });
        setSelectedVariationId(fb[0].id);
      }

      toast.success('Generated example copy (backend fallback)');
    } finally {
      setGeneratingCopy(false);
    }
  };

  const applyVariation = (v: Variation) => {
    setCreative({
      primaryText: v.primaryText ?? v.description ?? creative.primaryText,
      headline: v.headline ?? creative.headline,
      description: v.description ?? creative.description,
      cta: v.cta ?? creative.cta ?? workspaceDefaultCta,
    });
    setSelectedVariationId(v.id);
    toast.success('Applied variation');
  };

  // ------------------------------------------
  // Rewrite Logic
  // ------------------------------------------

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
      let usedWorkspace: Workspace | null = ws || null;
      // If not loaded via hook yet, maybe try local storage or skip (hook handles it mostly)

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
          4. Return ONLY JSON format with a "variations" or "suggestions" array.
        `,
        // Force the backend to give us 3 results
        count: 3,
        product: {
          // We pass context so the rewrite is relevant to the brand
          title: creative?.headline || 'Ad Creative',
          description: currentText,
          brand: usedWorkspace?.name
        },
        workspace: usedWorkspace ? {
          id: usedWorkspace.id,
          name: usedWorkspace.name,
          sector: usedWorkspace.sector
        } : null,
      };

      console.debug(`[AI Rewrite ${field}] sending payload`, payload);

      // 4. Call API
      const headers = { 'Content-Type': 'application/json' };
      // Try /api/v1 first
      let res = await fetch(`${API_ORIGIN}/api/v1/generate-copy`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Fallback to /v1 if needed
        res = await fetch(`${API_ORIGIN}/v1/generate-copy`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error('AI request failed');

      const json = await res.json();

      // 5. Parse Results to string[]
      let options: string[] = [];

      // Handle your specific backend response structure (variations array)
      if (Array.isArray(json?.variations)) {
        options = json.variations.map((v: any) => {
          // Map based on the field we are editing
          if (field === 'headline') return v.headline || v.title || v.primary_text;
          return v.primary_text || v.description || v.text || v.primaryText;
        });
      }
      // Fallback check for suggestions array
      else if (Array.isArray(json?.suggestions)) {
        options = json.suggestions.map((s: any) =>
          s.primaryText || s.headline || s.description || s.text
        );
      }
      // Fallback check for direct data array
      else if (Array.isArray(json?.data)) {
        options = json.data.map((d: any) =>
          field === 'headline' ? (d.headline || d.title) : (d.primaryText || d.description || d.text)
        );
      }

      // Filter out empties/duplicates and limit to 3
      options = Array.from(new Set(options.filter(Boolean))).slice(0, 3);

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

  /* ---------- Navigation ---------- */
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);

  const handleContinue = async () => {
    if (!creative.primaryText || !creative.headline) return toast.error('Please fill in primary text and headline');
    if (!creative.url || !isValidUrl(creative.url)) return toast.error('Please enter a valid destination URL (including https://)');
    if (!creative.imageUrl && !storedVideoUrl) return toast.error('Please upload an image or video for your ad');

    // If we have a video file stored, convert to base64 before navigating
    // This base64 is stored in the non-persisted video store, not localStorage
    if (storedVideoFile && storedVideoUrl?.startsWith('blob:')) {
      setIsProcessingVideo(true);
      toast.loading('Processing video...', { id: 'video-processing' });
      try {
        const base64Video = await convertFileToBase64(storedVideoFile);
        setVideoUrl(base64Video); // Store base64 in video store (not persisted to localStorage)
        setVideoFile(null); // Clear the file reference
        toast.success('Video processed successfully', { id: 'video-processing' });
      } catch (error) {
        console.error('Failed to process video:', error);
        toast.error('Failed to process video. Please try again.', { id: 'video-processing' });
        setIsProcessingVideo(false);
        return;
      }
    }

    // Convert thumbnail file to base64 if exists
    if (storedThumbnailFile && storedThumbnailUrl?.startsWith('blob:')) {
      try {
        const base64Thumbnail = await convertFileToBase64(storedThumbnailFile);
        setThumbnailUrl(base64Thumbnail);
        setThumbnailFile(null);
      } catch (error) {
        console.error('Failed to process thumbnail:', error);
        // Don't block navigation, thumbnail is optional
      }
    }

    setIsProcessingVideo(false);
    setStep(6);
    navigate('/review');
    toast.success('Creative saved successfully');
  };

  const handleBack = () => {
    setStep(4);
    navigate('/placements');
  };

  const DropClasses = useMemo(
    () =>
      `aspect-square rounded-lg border-2 border-dashed transition 
      ${isOver ? 'border-primary bg-primary/5' : 'border-border bg-secondary'} 
      flex items-center justify-center`,
    [isOver]
  );

  // ------------------------------------------
  // Helper Component for Selection UI
  // ------------------------------------------
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
            className="text-xs text-gray-500 hover:text-gray-700"
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
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Design your ad creative</h1>
        <p className="text-lg text-gray-600">
          {wsLoading ? 'Loading workspace…' : ws ? `Using workspace ${ws.name}` : 'No workspace found'}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-stretch">
        {/* Media Section - Combined Image & Video */}
        <div className="h-full">
          <Card className="shadow-medium h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                {creative.videoUrl ? (
                  <Video className="w-5 h-5 text-primary" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-primary" />
                )}
                Ad Media
              </CardTitle>
              <CardDescription>Upload an image or video for your ad creative</CardDescription>

              {/* Media Type Toggle */}
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setMediaMode('image');
                    if (creative.videoUrl) { clearVideo(); }
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border ${mediaMode === 'image'
                    ? 'bg-primary text-white shadow-md border-primary'
                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMediaMode('video');
                    if (creative.imageUrl) { clearImage(); }
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border ${mediaMode === 'video'
                    ? 'bg-primary text-white shadow-md border-primary'
                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                >
                  <Video className="w-4 h-4" />
                  <span>Video</span>
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Unified Drop Zone */}
              <div
                className={`${DropClasses} cursor-pointer`}
                onClick={() => mediaMode === 'video' ? openVideoDialog() : openFileDialog()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsOver(true); }}
                onDragLeave={() => setIsOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (!file) return;
                  if (file.type.startsWith('video/')) {
                    processDroppedVideo(file);
                  } else if (file.type.startsWith('image/')) {
                    processDroppedImage(file);
                  } else {
                    toast.error('Unsupported file type. Use images or videos.');
                  }
                }}
              >
                {storedVideoUrl ? (
                  <video
                    src={storedVideoUrl}
                    controls
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-full object-cover rounded-lg max-h-[280px]"
                  />
                ) : creative.imageUrl ? (
                  <img src={creative.imageUrl} alt="Ad preview" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <div className="text-center px-6 py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                      {mediaMode === 'video' ? (
                        <Video className="w-8 h-8 text-primary" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-primary" />
                      )}
                    </div>
                    <p className="text-gray-700 font-medium text-sm mb-2">
                      {mediaMode === 'video'
                        ? <>Drag & drop a <span className="font-bold text-primary">video</span> here</>
                        : <>Drag & drop an <span className="font-bold text-primary">image</span> here</>
                      }
                    </p>
                    <p className="text-gray-500 text-xs">
                      or click to browse your files
                    </p>
                  </div>
                )}
              </div>

              {/* Hidden File Inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*,.mp4,.mov,.avi,.webm,.mkv"
                className="hidden"
                onChange={handleVideoFileChange}
              />

              {/* Dynamic Action Buttons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-white text-gray-700 border-gray-200 hover:bg-primary/5 hover:border-primary/30 hover:text-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={mediaMode === 'video' ? openVideoDialog : openFileDialog}
                  disabled={uploading || uploadingVideo}
                >
                  {mediaMode === 'video' ? (
                    <>
                      <Video className="w-4 h-4 mr-1.5" />
                      {uploadingVideo ? 'Uploading…' : 'Upload'}
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 mr-1.5" />
                      {uploading ? 'Uploading…' : 'Upload'}
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-white text-gray-700 border-gray-200 hover:bg-primary/5 hover:border-primary/30 hover:text-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={onPasteImage}
                  disabled={mediaMode === 'video'}
                  title={mediaMode === 'video' ? 'Paste not available for video' : 'Paste from clipboard'}
                >
                  <ClipboardCheck className="w-4 h-4 mr-1.5" />
                  Paste
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-white text-gray-700 border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={mediaMode === 'video' ? clearVideo : clearImage}
                  disabled={!creative.imageUrl && !storedVideoUrl}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Remove
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-white text-gray-700 border-gray-200 hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleGenerateImage}
                  disabled={generatingImage || mediaMode === 'video'}
                  title={mediaMode === 'video' ? 'AI generation not available for video' : 'Generate with AI'}
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  {generatingImage ? 'Generating…' : 'AI Generate'}
                </Button>
              </div>

              {/* Hidden Thumbnail Input */}
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleThumbnailUpload}
              />

              {/* Thumbnail Section - Only visible when video is selected */}
              {storedVideoUrl && mediaMode === 'video' && (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 space-y-3 animate-in fade-in-50 slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Video Thumbnail
                      <span className="text-xs font-normal text-purple-500">(Optional)</span>
                    </Label>
                    {storedThumbnailUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 px-2"
                        onClick={clearThumbnail}
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>

                  {storedThumbnailUrl ? (
                    <div className="relative aspect-video bg-white rounded-lg overflow-hidden border border-purple-200 shadow-sm max-w-[200px]">
                      <img
                        src={storedThumbnailUrl}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                        Thumbnail
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white text-purple-700 border-purple-200 hover:bg-purple-50 hover:border-purple-300"
                        onClick={() => thumbnailInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-1.5" />
                        Upload Thumbnail
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300"
                        onClick={extractThumbnailFromVideo}
                      >
                        <Sparkles className="w-4 h-4 mr-1.5" />
                        Extract from Video
                      </Button>
                    </div>
                  )}

                  <p className="text-xs text-purple-600">
                    Add a custom thumbnail or extract one from your video. This appears in feeds before users play.
                  </p>
                </div>
              )}

              {/* Format Tips - Context Aware */}
              <div className={`rounded-lg p-3 transition-all ${mediaMode === 'video'
                ? 'bg-purple-50 border border-purple-100'
                : 'bg-blue-50 border border-blue-100'
                }`}>
                <p className="text-xs">
                  {mediaMode === 'video' ? (
                    <>
                      <strong className="text-purple-700">Video Tips:</strong>{' '}
                      <span className="text-purple-600">MP4, MOV, WEBM supported. Max 500 MB. Use 9:16 for Stories, 1:1 or 4:5 for Feed.</span>
                    </>
                  ) : (
                    <>
                      <strong className="text-blue-700">Image Tips:</strong>{' '}
                      <span className="text-blue-600">1080×1080 (1:1) or 1200×628 (1.91:1). Keep text under 20% of the image.</span>
                    </>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Copy Section (no live preview) */}
        <div className="h-full">
          <Card className="shadow-medium border-2 border-primary/10 flex flex-col h-full max-h-[800px]">
            <CardHeader className="pb-4 flex-shrink-0">
              <CardTitle className="text-xl font-bold">Ad Copy</CardTitle>
              <CardDescription className="text-gray-600">Write compelling text for your ad or apply a suggestion</CardDescription>
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
                    value={creative.primaryText}
                    onChange={(e) => setCreative({ primaryText: e.target.value })}
                    className="pr-12 resize-none border-gray-200 focus:border-primary/50 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => rewriteWithAI('primaryText', creative.primaryText || '')}
                    disabled={rewritingPrimaryText || !creative.primaryText?.trim()}
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
                <RewriteOptionsSelector
                  field="primaryText"
                  onSelect={(text) => setCreative({ primaryText: text })}
                />
              </div>

              {/* Headline */}
              <div className="space-y-2">
                <Label htmlFor="headline" className="text-sm font-medium">Headline</Label>
                <div className="relative">
                  <Input
                    id="headline"
                    placeholder="Grab attention with a headline"
                    value={creative.headline}
                    onChange={(e) => setCreative({ headline: e.target.value })}
                    className="pr-12 border-gray-200 focus:border-primary/50 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => rewriteWithAI('headline', creative.headline || '')}
                    disabled={rewritingHeadline || !creative.headline?.trim()}
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
                <RewriteOptionsSelector
                  field="headline"
                  onSelect={(text) => setCreative({ headline: text })}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">Description (Optional)</Label>
                <div className="relative">
                  <Input
                    id="description"
                    placeholder="Additional details..."
                    value={creative.description}
                    onChange={(e) => setCreative({ description: e.target.value })}
                    className="pr-12 border-gray-200 focus:border-primary/50 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => rewriteWithAI('description', creative.description || '')}
                    disabled={rewritingDescription || !creative.description?.trim()}
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
                <RewriteOptionsSelector
                  field="description"
                  onSelect={(text) => setCreative({ description: text })}
                />
              </div>

              {/* Generate with AI Button */}
              <div className="pt-2">
                <Button
                  onClick={() => handleGenerateCopyWithApi(3)}
                  disabled={generatingCopy}
                  className="bg-primary hover:bg-primary/90 text-white font-medium"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {generatingCopy ? 'Generating…' : 'Generate with AI'}
                </Button>
              </div>

              {/* AI Suggestions Section */}
              {aiVariations.length > 0 && (
                <div className="space-y-3 pt-2">
                  <Label className="text-sm font-medium text-gray-700">AI Suggestions</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {aiVariations.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => applyVariation(v)}
                        className={`p-3 text-left bg-gray-50 hover:bg-primary/5 border hover:border-primary/30 rounded-full flex items-center justify-between gap-2 transition-all group ${selectedVariationId === v.id ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
                      >
                        <span className="text-sm text-gray-700 truncate">{v.headline ?? v.description ?? '—'}</span>
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
                  <Select
                    value={creative.cta || workspaceDefaultCta}
                    onValueChange={(value) => setCreative({ cta: value })}
                  >
                    <SelectTrigger className="border-0 bg-transparent shadow-none focus:ring-0 h-auto p-0 font-medium">
                      <SelectValue placeholder="Select CTA" />
                    </SelectTrigger>
                    <SelectContent>
                      {ctaOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
                  value={creative.url}
                  onChange={(e) => setCreative({ url: e.target.value })}
                  onBlur={(e) => {
                    const val = e.target.value?.trim();
                    if (val && !isValidUrl(val)) {
                      toast.error('That URL looks invalid. Include the protocol, e.g. https://');
                    }
                  }}
                  className="border-gray-200 focus:border-primary/50 focus:ring-primary/20"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={handleBack} disabled={isProcessingVideo}>
          Back
        </Button>
        <Button onClick={handleContinue} disabled={isProcessingVideo}>
          {isProcessingVideo ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Processing Video...
            </>
          ) : (
            'Continue to Review'
          )}
        </Button>
      </div>
    </div >
  );
}