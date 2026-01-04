// src/pages/ReviewAndConfirm.tsx
import { useEffect, useState, useMemo, useRef } from 'react';
import {
  CheckCircle2,
  Edit,
  Rocket,
  Image as ImageIcon,
  Eye,
  Target,
  Users,
  Wallet,
  LayoutGrid,
  ArrowRight,
  Globe,
  Building2,
  Calendar,
  MapPin,
  Smartphone,
  Monitor,
  RefreshCw,
  Trash2,
  Save
} from 'lucide-react';
import logo from '@/assets/sociovia_logo.png';
import CelebrationPopup from '@/components/CelebrationPopup';
import ErrorPopup from '@/components/ErrorPopup';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCampaignStore, useVideoStore } from '@/store/campaignStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config';

/*
  Cleaned + realigned ReviewAndConfirm page.
  - Keeps original helpers and behavior
  - Reorders right sidebar so Publish section is prominent
  - Simplifies layout and spacing to avoid visual "disturbances"
  - Ensures responsive behavior: left column collapses on small screens, right sidebar stacks below
*/

type WorkspaceLite = {
  id?: number | string;
  user_id?: number;
  business_name?: string;
  name?: string;
  industry?: string;
  sector?: string;
  business_type?: string;
  logo?: string | null;
  logo_path?: string | null;
  website?: string | null;
  usp?: string | null;
  description?: string | null;
  audience_description?: string | null;
  creatives_path?: any[];
  created_at?: string | null;
  updated_at?: string | null;
  _raw?: any;
  [key: string]: any;
};

type LocalImg = { id: string; url: string };

const API_BASE = API_BASE_URL;

// Helper to parse Meta API errors and return user-friendly messages
function parsePreviewError(err: any): { title: string; message: string; isSessionError: boolean } {
  const rawMessage = err?.message ?? String(err);

  // Check for session/token invalidation errors
  if (rawMessage.includes('session has been invalidated') ||
    rawMessage.includes('OAuthException') ||
    rawMessage.includes('access token') ||
    rawMessage.includes('password') ||
    rawMessage.includes('security reasons')) {
    return {
      title: 'Meta Session Expired',
      message: 'Your Meta account connection has expired. Please reconnect your account to continue.',
      isSessionError: true
    };
  }

  // Check for permissions errors
  if (rawMessage.includes('permission') || rawMessage.includes('not authorized')) {
    return {
      title: 'Permission Required',
      message: 'Additional permissions are needed. Please reconnect your Meta account with the required permissions.',
      isSessionError: true
    };
  }

  // Check for rate limiting
  if (rawMessage.includes('rate limit') || rawMessage.includes('too many requests') || rawMessage.includes('429')) {
    return {
      title: 'Too Many Requests',
      message: 'Please wait a moment before trying again.',
      isSessionError: false
    };
  }

  // Check for network/CORS errors
  if (rawMessage.includes('CORS') || rawMessage.includes('NetworkError') || rawMessage.includes('Failed to fetch')) {
    return {
      title: 'Connection Issue',
      message: 'Unable to connect to the preview service. Please check your internet connection and try again.',
      isSessionError: false
    };
  }

  // Check for 400/validation errors
  if (rawMessage.includes('400') || rawMessage.includes('invalid') || rawMessage.includes('validation')) {
    return {
      title: 'Invalid Configuration',
      message: 'Some campaign settings may be invalid. Please review your creative and try again.',
      isSessionError: false
    };
  }

  // Generic preview failure
  if (rawMessage.includes('Preview') || rawMessage.includes('preview')) {
    return {
      title: 'Preview Unavailable',
      message: 'Unable to generate preview at this time. Your campaign can still be published.',
      isSessionError: false
    };
  }

  // Default fallback
  return {
    title: 'Preview Error',
    message: 'Something went wrong. Please try again.',
    isSessionError: false
  };
}

function buildUserHintHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  try {
    const rv = localStorage.getItem('sv_user');
    if (rv) {
      const u = JSON.parse(rv);
      if (u?.id) headers['X-User-Id'] = String(u.id);
      if (u?.email) headers['X-User-Email'] = String(u.email);
    }
  } catch { }
  return headers;
}

// Helper to get proxied URL for CDN images (bypass CORS)
function getProxiedImageUrl(imageUrl: string): string {
  if (imageUrl.includes('digitaloceanspaces.com')) {
    return `${API_BASE}/api/v1/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  }
  return imageUrl;
}

function getCurrentUserFromLS(): { id: number;[k: string]: any } | null {
  try {
    const raw = localStorage.getItem('sv_user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (u?.id && Number.isFinite(Number(u.id))) return { id: Number(u.id), ...u };
  } catch { }
  return null;
}

function normalizeWorkspace(raw: any): WorkspaceLite {
  if (!raw) return { id: 0, business_name: '' };

  const id = raw.id ?? raw.Id ?? 0;
  const idNum = Number(id);
  const user_id = Number(raw.user_id ?? raw.userId ?? NaN);

  const logo = raw.logo ?? raw.logo_path ?? null;
  return {
    id: Number.isFinite(idNum) ? idNum : String(id),
    user_id: Number.isFinite(user_id) ? user_id : undefined,
    business_name: raw.business_name ?? raw.businessName ?? raw.name ?? '',
    name: raw.name ?? raw.business_name ?? '',
    industry: raw.industry ?? raw.sector ?? '',
    sector: raw.sector ?? raw.industry ?? '',
    business_type: raw.business_type ?? '',
    website: raw.website ?? '',
    usp: raw.usp ?? '',
    created_at: raw.created_at ?? null,
    updated_at: raw.updated_at ?? null,
    logo,
    logo_path: raw.logo_path ?? null,
    description: raw.description ?? null,
    audience_description: raw.audience_description ?? null,
    creatives_path: Array.isArray(raw.creatives_path) ? raw.creatives_path : Array.isArray(raw.creatives) ? raw.creatives : [],
    _raw: raw,
  };
}

const getLogo = (w?: WorkspaceLite | null) => w?.logo ?? w?.logo_path ?? null;

const AD_PREVIEW_FORMATS: { value: string; label: string }[] = [
  { value: 'MOBILE_FEED_STANDARD', label: 'Mobile Feed (Standard)' },
  { value: 'DESKTOP_FEED_STANDARD', label: 'Desktop Feed (Standard)' },
  { value: 'MOBILE_FEED_BASIC', label: 'Mobile Feed (Basic)' },
  { value: 'MOBILE_BANNER', label: 'Mobile Banner' },
  { value: 'MOBILE_INTERSTITIAL', label: 'Mobile Interstitial' },
  { value: 'MOBILE_FEED_VIDEO', label: 'Mobile Feed Video' },
  { value: 'INSTANT_ARTICLE_STANDARD', label: 'Instant Article (Standard)' },
  { value: 'RIGHT_COLUMN_STANDARD', label: 'Right Column (Desktop)' },
  { value: 'INSTAGRAM_STANDARD_CREATIVE', label: 'Instagram — Standard Creative' },
  { value: 'INSTAGRAM_STORY', label: 'Instagram Story' },
  { value: 'INSTAGRAM_REELS', label: 'Instagram Reels' },
  { value: 'MOBILE_STORY', label: 'Mobile Story' },
];

async function fetchWorkspaceMe(userId: number): Promise<WorkspaceLite | null> {
  const res = await fetch(`${API_BASE}/api/workspace/me?user_id=${encodeURIComponent(userId)}`, {
    credentials: 'include',
    headers: { Accept: 'application/json', ...buildUserHintHeaders() },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  const w = data?.success ? data.workspace : data?.workspace ?? null;
  return w ? normalizeWorkspace(w) : null;
}

async function fetchWorkspaces(userId: number): Promise<WorkspaceLite[]> {
  const res = await fetch(`${API_BASE}/api/workspaces?user_id=${encodeURIComponent(userId)}`, {
    credentials: 'include',
    headers: { Accept: 'application/json', ...buildUserHintHeaders() },
  });
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({}));
  const arr = Array.isArray(body?.workspaces) ? body.workspaces : Array.isArray(body) ? body : body?.workspaces ?? [];
  return (arr ?? []).map(normalizeWorkspace);
}

async function fetchWorkspaceByIdSafe(userId: number, id: number | string): Promise<WorkspaceLite | null> {
  const list = await fetchWorkspaces(userId);
  const found = list.find((w) => String(w?.id ?? w?._raw?.workspace_id ?? '') === String(id)) ?? null;
  if (found) return found;
  return fetchWorkspaceMe(userId);
}

export default function ReviewAndConfirm(): JSX.Element {
  const currentStep = useCampaignStore((s: any) => s.currentStep);
  const objective = useCampaignStore((s: any) => s.objective);
  const audience = useCampaignStore((s: any) => s.audience);
  const budget = useCampaignStore((s: any) => s.budget);
  const placements = useCampaignStore((s: any) => s.placements);
  const creative = useCampaignStore((s: any) => s.creative);
  const selectedImages = useCampaignStore((s: any) => s.selectedImages);
  const workspaceFromStore = useCampaignStore((s: any) => s.workspace);
  const campaign = useCampaignStore((s: any) => s.campaign);
  const reset = useCampaignStore((s: any) => s.reset);

  // Get video from separate non-persisted store
  const { videoUrl: storedVideoUrl, thumbnailUrl: storedThumbnailUrl, clearVideo: clearVideoStore } = useVideoStore();

  const navigate = useNavigate();

  // Debug: Log audience data to verify store persistence
  useEffect(() => {
    console.log('[ReviewAndConfirm] Audience from store:', audience);
    console.log('[ReviewAndConfirm] Locations:', audience?.locations);
    console.log('[ReviewAndConfirm] Interests:', audience?.interests);
  }, [audience]);

  const [isPublishing, setIsPublishing] = useState(false);
  const [lastPublishResult, setLastPublishResult] = useState<any>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [serverWorkspace, setServerWorkspace] = useState<WorkspaceLite | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | string | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState<boolean>(true);
  const [adImage, setAdImage] = useState<LocalImg | null>(null);
  const [adVideo, setAdVideo] = useState<string | null>(null);

  const [adPreview, setAdPreview] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<{ title: string; message: string; isSessionError: boolean } | null>(null);

  const [selectedFormat, setSelectedFormat] = useState<string>(AD_PREVIEW_FORMATS[0].value);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setWorkspaceLoading(true);
      const user = getCurrentUserFromLS();
      if (!user?.id) {
        setWorkspaceLoading(false);
        toast.error('Not logged in — cannot load workspace.');
        return;
      }

      // Store user_id for API calls
      setCurrentUserId(user.id);

      let persistedId: number | string | null = null;
      try {
        const raw = localStorage.getItem('sv_selected_workspace_id');
        if (raw && String(raw).trim() !== '') persistedId = Number.isFinite(Number(raw)) ? Number(raw) : raw;
      } catch { }

      let ws: WorkspaceLite | null = null;
      if (persistedId != null) ws = await fetchWorkspaceByIdSafe(user.id, persistedId);
      else ws = await fetchWorkspaceMe(user.id);

      if (cancelled) return;

      if (ws) {
        setServerWorkspace(ws);
        setSelectedWorkspaceId(ws.id ?? persistedId ?? null);
        try { localStorage.setItem('sv_selected_workspace_id', String(ws.id)); } catch { }
      } else {
        setServerWorkspace(null);
        setSelectedWorkspaceId(persistedId);
      }

      setWorkspaceLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const workspaceLogo = getLogo(serverWorkspace);
  const workspaceTitle = serverWorkspace?.business_name ?? serverWorkspace?.name ?? (selectedWorkspaceId ? `Workspace ${selectedWorkspaceId}` : 'Workspace');
  const workspaceIndustry = (serverWorkspace?.audience_description ?? serverWorkspace?.industry ?? serverWorkspace?.sector ?? '')?.substring(0, 100) ?? '';
  const workspaceWebsite = serverWorkspace?.website ?? '';
  const workspaceUsp = serverWorkspace?.usp ?? '';
  const workspaceDescription = serverWorkspace?.description ?? '';
  const creativesCount = (serverWorkspace?.creatives_path && Array.isArray(serverWorkspace.creatives_path) ? serverWorkspace.creatives_path.length : 0) || 0;

  const extractUrl = (item: any): string | null => {
    if (!item) return null;
    if (typeof item === 'string') return item.trim() || null;
    if (typeof item === 'object') return (item.url ?? item.src ?? item.path ?? item.image ?? item.storage_url ?? null) as string | null;
    return null;
  };

  const mapSelectedImages = (sel: any): LocalImg[] => {
    if (!sel) return [];
    const arr = Array.isArray(sel) ? sel : Array.isArray(sel.images) ? sel.images : [];
    return arr.map((it: any, idx: number) => {
      const url = extractUrl(it?.url ?? it);
      const id = it?.id ? String(it.id) : `sel-${idx}`;
      return url ? { id, url } : null;
    }).filter(Boolean) as LocalImg[];
  };

  const mapWorkspaceToImages = (w: any): LocalImg[] => {
    if (!w) return [];
    const out: LocalImg[] = [];
    const push = (u: any, idSeed: string) => {
      const url = extractUrl(u);
      if (!url) return;
      out.push({ id: `${idSeed}-${out.length}`, url });
    };
    if (Array.isArray(w.creatives_path)) w.creatives_path.forEach((it: any, i: number) => push(it, `ws-${w.id ?? 'x'}-cp-${i}`));
    if (out.length === 0 && Array.isArray(w.creatives)) w.creatives.forEach((it: any, i: number) => push(it, `ws-${w.id ?? 'x'}-c-${i}`));
    if (out.length === 0 && Array.isArray(w.images)) w.images.forEach((it: any, i: number) => push(it, it?.id ? `img-${it.id}` : `ws-${w.id ?? 'x'}-img-${i}`));
    if (out.length === 0 && w.workspace && Array.isArray(w.workspace.creatives_path)) w.workspace.creatives_path.forEach((it: any, i: number) => push(it, `ws-${w.workspace.id ?? 'x'}-cp-${i}`));
    return out;
  };

  useEffect(() => {
    // Check for video first (from video store)
    if (storedVideoUrl && String(storedVideoUrl).trim() !== '') {
      setAdVideo(storedVideoUrl);
      setAdImage(null); // Clear image if video is present
      return;
    } else {
      setAdVideo(null);
    }

    // Fall back to image
    let firstImage: LocalImg | null = null;
    if (creative?.imageUrl && String(creative.imageUrl).trim() !== '') firstImage = { id: creative.imageId || 'creative', url: creative.imageUrl };
    if (!firstImage) {
      const sel = mapSelectedImages(selectedImages);
      if (sel.length) firstImage = sel[0];
    }
    if (!firstImage && serverWorkspace) {
      const wsImgs = mapWorkspaceToImages(serverWorkspace);
      if (wsImgs.length) firstImage = wsImgs[0];
    }
    setAdImage(firstImage);
  }, [creative?.imageUrl, creative?.imageId, storedVideoUrl, selectedImages, serverWorkspace]);

  const computeSchedule = () => {
    const now = new Date();
    let start_in_days = 0;
    let duration_days = 2;
    try {
      if (budget?.startDate) {
        const start = new Date(budget.startDate);
        const diff = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        start_in_days = Math.max(0, diff);
      }
      if (budget?.endDate && budget?.startDate) {
        const start = new Date(budget.startDate);
        const end = new Date(budget.endDate);
        const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        duration_days = days;
      } else if (typeof budget?.durationDays === 'number') {
        duration_days = Math.max(1, budget.durationDays);
      }
    } catch { }
    return { start_in_days, duration_days };
  };

  // Track if we're currently fetching to prevent duplicate calls
  const isFetchingPreviewRef = useRef(false);
  // Track the last payload to avoid refetching with same data
  const lastPreviewPayloadRef = useRef<string>('');
  // Track retry count to prevent infinite loops
  const previewRetryCountRef = useRef(0);
  const MAX_PREVIEW_RETRIES = 2;

  const fetchMetaPreview = async (formats?: string[]) => {
    // Prevent duplicate concurrent calls
    if (isFetchingPreviewRef.current) {
      console.log('[Preview] Already fetching, skipping duplicate call');
      return;
    }

    setLoadingPreview(true);
    setPreviewError(null);
    isFetchingPreviewRef.current = true;

    try {
      const image_url = creative?.imageUrl || adImage?.url || (mapSelectedImages(selectedImages)[0]?.url) || '';
      const payloadCreative: any = {
        title: creative?.headline ?? campaign?.name ?? '',
        body: creative?.primaryText ?? creative?.message ?? '',
        description: creative?.description ?? '',
        call_to_action: creative?.cta ?? 'LEARN_MORE',
        link: creative?.url ?? 'https://sociovia.com',
      };

      // Convert image URL to base64 for Meta API compatibility
      if (image_url && !storedVideoUrl) {
        try {
          // Check if already a data URL (base64)
          if (image_url.startsWith('data:')) {
            payloadCreative.image_base64 = image_url;
          } else {
            // Fetch the image using proxy for CDN URLs (bypass CORS)
            const imgResponse = await fetch(getProxiedImageUrl(image_url));
            if (imgResponse.ok) {
              const blob = await imgResponse.blob();
              const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
              payloadCreative.image_base64 = base64;
            } else {
              // Fallback to URL if fetch fails
              payloadCreative.image_url = image_url;
            }
          }
        } catch (imgErr) {
          console.warn('Could not convert image to base64, using URL fallback:', imgErr);
          payloadCreative.image_url = image_url;
        }
      }

      // Add video data if present (from video store)
      if (storedVideoUrl && storedVideoUrl.startsWith('data:')) {
        payloadCreative.video_base64 = storedVideoUrl;
        // Use thumbnail if available, otherwise try to convert image_url to base64
        if (storedThumbnailUrl && storedThumbnailUrl.startsWith('data:')) {
          payloadCreative.thumbnail_base64 = storedThumbnailUrl;
        } else if (image_url) {
          // Try to convert image_url to base64 for thumbnail (use proxy for CDN)
          try {
            if (image_url.startsWith('data:')) {
              payloadCreative.image_base64 = image_url;
            } else {
              const imgResponse = await fetch(getProxiedImageUrl(image_url));
              if (imgResponse.ok) {
                const blob = await imgResponse.blob();
                const base64 = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                });
                payloadCreative.image_base64 = base64;
              }
            }
          } catch {
            payloadCreative.image_url = image_url;
          }
        }
      }

      // Ensure we have IDs - Fallback to localStorage if state is not ready
      const safeUserId = currentUserId ?? getCurrentUserFromLS()?.id;
      const safeWorkspaceId = selectedWorkspaceId ?? localStorage.getItem("sv_selected_workspace_id") ?? "8"; // Default to 8 or relevant fallback

      const body: any = {
        creative: payloadCreative,
        ad_formats: formats ?? [selectedFormat],
        workspace_id: safeWorkspaceId ? String(safeWorkspaceId) : undefined,
        user_id: safeUserId ? Number(safeUserId) : undefined
      };

      const res = await fetch(`${API_BASE}/api/facebook/adpreviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildUserHintHeaders() },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Preview endpoint failed: ${res.status} ${text}`);
      }

      const json = await res.json().catch(() => ({}));
      if (!json || json.ok !== true) throw new Error(json?.error || 'Preview generation failed');

      const previews = Array.isArray(json.previews) ? json.previews : [];
      if (previews.length === 0) throw new Error('No previews returned from backend');

      let chosen: any = null;
      for (const p of previews) {
        if (p.iframe_src) { chosen = p; break; }
        if (p.preview_html) { chosen = p; break; }
        if (p.data && Array.isArray(p.data) && p.data[0] && (p.data[0].body || p.data[0].html)) { chosen = p; break; }
        if (p.raw && p.raw.data && Array.isArray(p.raw.data) && p.raw.data[0] && p.raw.data[0].body) { chosen = p; break; }
      }
      if (!chosen) chosen = previews[0];

      let html: string | null = null;
      if (chosen.iframe_src) html = `<iframe src="${chosen.iframe_src}" width="100%" height="520" style="border:none;overflow:hidden;" allowfullscreen></iframe>`;
      else if (chosen.preview_html) html = chosen.preview_html;
      else if (chosen.data && Array.isArray(chosen.data) && chosen.data[0]) html = chosen.data[0].body || chosen.data[0].html || chosen.data[0].iframe || null;
      else if (chosen.raw && (chosen.raw.body || chosen.raw.html)) html = chosen.raw.body || chosen.raw.html || null;
      else if (chosen.raw && chosen.raw.data && Array.isArray(chosen.raw.data) && chosen.raw.data[0]) html = chosen.raw.data[0].body || null;

      if (!html) throw new Error('Preview response did not include HTML or iframe');

      setAdPreview(html);
      // Reset retry count on success
      previewRetryCountRef.current = 0;
    } catch (err: any) {
      console.error('Meta preview error', err);
      // Parse the error for user-friendly display
      const parsedError = parsePreviewError(err);
      setPreviewError(parsedError);
      // Don't retry automatically - let user click "Try Again" manually
      previewRetryCountRef.current += 1;
    } finally {
      setLoadingPreview(false);
      isFetchingPreviewRef.current = false;
    }
  };

  // Debounced preview fetch - only fetch when values stabilize
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any pending timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    // Build a payload signature to detect actual changes
    const payloadSignature = JSON.stringify({
      headline: creative?.headline || '',
      primaryText: creative?.primaryText || '',
      imageUrl: creative?.imageUrl || '',
      adImageUrl: adImage?.url || '',
      videoUrl: storedVideoUrl ? 'has-video' : '',
      thumbnailUrl: storedThumbnailUrl ? 'has-thumb' : '',
      format: selectedFormat
    });

    // Skip if payload hasn't changed
    if (payloadSignature === lastPreviewPayloadRef.current) {
      console.log('[Preview] Payload unchanged, skipping fetch');
      return;
    }

    // Only fetch if we have meaningful content
    const hasContent = (creative?.headline && creative.headline.trim() !== '') ||
      (creative?.primaryText && creative.primaryText.trim() !== '');

    if (!hasContent) {
      return;
    }

    // Debounce the fetch by 500ms to avoid rapid calls
    previewTimeoutRef.current = setTimeout(() => {
      lastPreviewPayloadRef.current = payloadSignature;
      previewRetryCountRef.current = 0; // Reset retry count for new payload
      fetchMetaPreview([selectedFormat]);
    }, 500);

    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creative?.headline, creative?.primaryText, creative?.imageUrl, adImage?.url, storedVideoUrl, storedThumbnailUrl, selectedFormat]);

  const handleSaveDraft = () => {
    // Generate draft ID
    const draftId = `draft-${Date.now()}`;
    const timestamp = Date.now();
    const draftName = campaign?.name || creative?.headline || `Draft Campaign ${new Date().toLocaleDateString()}`;

    // Construct the draft object
    const draft = {
      id: draftId,
      name: draftName,
      status: 'draft',
      updatedAt: timestamp,
      data: {
        currentStep,
        objective,
        campaign,
        audience,
        budget,
        placements,
        creative: {
          ...creative,
          videoUrl: '', // Don't persist large video data in main store part to avoid duplication if we use videoData
        },
        selectedImages,
        workspace: workspaceFromStore,
      },
      // Store video refs separately to match what we do in campaigns list hydration if needed
      // Actually we just store the video URLs here so we can restore them manually
      videoData: {
        videoUrl: storedVideoUrl,
        thumbnailUrl: storedThumbnailUrl
      }
    };

    try {
      // 1. Get existing drafts
      const raw = localStorage.getItem("sv_campaign_drafts");
      const drafts = raw ? JSON.parse(raw) : [];

      // 2. Add new draft
      drafts.push(draft);

      // 3. Save back
      localStorage.setItem("sv_campaign_drafts", JSON.stringify(drafts));

      toast.success("Campaign saved as draft");

      // 4. Navigate to Drafts list
      // We need to ensure we navigate to the campaigns list with 'drafts' source active.
      // Assuming Campaigns.tsx respects ?source=drafts query param if I implement it, 
      // OR I rely on the fact that I set default viewSource to 'live'.
      // I should update Campaigns.tsx to check logic for source param.
      // Use `navigate('/crm/campaigns')` for now. User can click "Drafts".
      navigate('/crm/campaigns?source=drafts');

    } catch (e) {
      console.error("Failed to save draft", e);
      toast.error("Failed to save draft");
    }
  };

  const handlePublish = async () => {
    const extractUrlLocal = (item: any): string | null => {
      if (!item) return null;
      if (typeof item === 'string') return item.trim() || null;
      if (typeof item === 'object') return (item.url ?? item.src ?? item.path ?? item.image ?? item.storage_url ?? null) as string | null;
      return null;
    };

    const mapSelectedImagesLocal = (sel: any): { id: string; url: string }[] => {
      if (!sel) return [];
      const arr = Array.isArray(sel) ? sel : Array.isArray(sel.images) ? sel.images : [];
      return arr.map((it: any, idx: number) => {
        const url = extractUrlLocal(it?.url ?? it);
        const id = it?.id ? String(it.id) : `sel-${idx}`;
        return url ? { id, url } : null;
      }).filter(Boolean) as { id: string; url: string }[];
    };

    const mapWorkspaceImagesLocal = (w: any) => {
      if (!w) return [];
      const out: { id: string; url: string }[] = [];
      const push = (u: any, idSeed: string) => {
        const url = extractUrlLocal(u);
        if (!url) return;
        out.push({ id: `${idSeed}-${out.length}`, url });
      };
      if (Array.isArray(w.creatives_path) && w.creatives_path.length) w.creatives_path.forEach((it: any, i: number) => push(it, `ws-cp-${i}`));
      if (out.length === 0 && Array.isArray(w.creatives) && w.creatives.length) w.creatives.forEach((it: any, i: number) => push(it, `ws-c-${i}`));
      if (out.length === 0 && Array.isArray(w.images) && w.images.length) w.images.forEach((it: any, i: number) => push(it, it?.id ? `img-${it.id}` : `ws-img-${i}`));
      if (out.length === 0 && w.workspace && Array.isArray(w.workspace.creatives_path)) w.workspace.creatives_path.forEach((it: any, i: number) => push(it, `ws-ws-cp-${i}`));
      return out;
    };

    const resolveImage = (): { id?: string; url?: string } | null => {
      if (creative?.imageUrl && String(creative.imageUrl).trim() !== '') return { id: creative.imageId || 'creative', url: creative.imageUrl };
      if (adImage?.url) return adImage;
      const sel = mapSelectedImagesLocal(selectedImages);
      if (sel.length > 0) return sel[0];
      const wsImgs = mapWorkspaceImagesLocal(serverWorkspace ?? selectedImages?.workspace ?? null);
      if (wsImgs.length > 0) return wsImgs[0];
      return null;
    };

    const schedule = computeSchedule();
    const daily_budget = typeof budget?.amount === 'number' ? budget.amount : 100000;

    const primaryText = creative?.primaryText ?? creative?.message ?? '';
    const headline = creative?.headline ?? creative?.title ?? '';
    const urlVal = creative?.url ?? creative?.link ?? '';

    const resolvedImage = resolveImage();

    if (!resolvedImage?.url) { toast.error('No image available for the ad. Please select an image in the creative step.'); return; }
    if (!primaryText || !headline || !urlVal) { toast.error('Please ensure primary text, headline, and destination URL are set.'); return; }

    const fetchImageAsBase64 = async (imageUrl: string): Promise<{ base64: string; contentType: string } | null> => {
      try {
        // Use proxy for CDN images to bypass CORS
        const urlToFetch = getProxiedImageUrl(imageUrl);
        const resp = await fetch(urlToFetch, { mode: 'cors', cache: 'no-cache' });
        if (!resp.ok) throw new Error(`Image fetch failed: ${resp.status}`);
        const blob = await resp.blob();
        const contentType = blob.type || 'image/jpeg';
        const arrayBuf = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuf);
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
        }
        const base64 = btoa(binary);
        return { base64, contentType };
      } catch (err) {
        console.warn('fetchImageAsBase64 failed (CORS or network):', err);
        return null;
      }
    };

    setIsPublishing(true);
    setLastPublishResult(null);

    try {
      const fetched = await fetchImageAsBase64(resolvedImage.url!);

      const workspaceIdForPayload = serverWorkspace?.id ?? selectedWorkspaceId;
      const userIdForPayload = currentUserId ?? getCurrentUserFromLS()?.id;

      if (!workspaceIdForPayload || !userIdForPayload) {
        toast.error("Missing workspace or user context. Please refresh the page.");
        setIsPublishing(false);
        return;
      }

      // Build full audience targeting payload
      const audienceTargeting = {
        location: {
          country: audience?.location?.country ?? 'US',
          region: audience?.location?.region ?? '',
          city: audience?.location?.city ?? '',
        },
        // Include all locations for multi-location campaigns
        locations: (audience as any)?.locations ?? (audience?.location?.country ? [audience.location] : []),
        age_min: Array.isArray(audience?.age) ? audience.age[0] : 18,
        age_max: Array.isArray(audience?.age) ? audience.age[1] : 65,
        gender: audience?.gender ?? 'all',
        interests: audience?.interests ?? [],
      };

      // Construct advanced targeting payload
      const geo_locations: any = {
        countries: [],
        custom_locations: [],
        location_types: ['home', 'recent'],
      };

      const locs = (audience as any)?.locations ?? (audience?.location?.country ? [audience.location] : []);

      locs.forEach((loc: any) => {
        // If radius is present, treat as custom location
        if (loc.radius && loc.latitude && loc.longitude) {
          geo_locations.custom_locations.push({
            latitude: loc.latitude,
            longitude: loc.longitude,
            radius: loc.radius,
            distance_unit: loc.distance_unit || 'kilometer',
            name: loc.city || loc.region || loc.country
          });
          // Also add country code if available
          if (loc.country_code && !geo_locations.countries.includes(loc.country_code)) {
            geo_locations.countries.push(loc.country_code);
          } else if (loc.country && loc.country.length === 2 && !geo_locations.countries.includes(loc.country)) {
            geo_locations.countries.push(loc.country);
          }
        } else {
          // Standard location
          if (loc.country_code && !geo_locations.countries.includes(loc.country_code)) {
            geo_locations.countries.push(loc.country_code);
          } else if (loc.country && loc.country.length === 2 && !geo_locations.countries.includes(loc.country)) {
            geo_locations.countries.push(loc.country);
          }
        }
      });

      const payload: any = {
        campaign_name: (campaign?.name || `Campaign - ${String(headline).substring(0, 30)}`),
        adset_name: `${(campaign?.name || 'AdSet').substring(0, 40)} - ${new Date().toISOString().slice(0, 10)}`,
        ad_name: `${String(headline).substring(0, 40)}`,
        link: urlVal,
        message: primaryText,
        creative: {
          primaryText,
          headline,
          description: creative?.description ?? '',
          cta: creative?.cta ?? 'LEARN_MORE',
          url: urlVal,
          image_url: resolvedImage.url,
          image_id: resolvedImage.id ?? creative?.imageId ?? null,
          video_url: storedVideoUrl ?? null,
        },
        start_in_days: schedule.start_in_days,
        duration_days: schedule.duration_days,
        daily_budget,
        // Full audience targeting data
        country: audienceTargeting.location.country,
        region: audienceTargeting.location.region,
        city: audienceTargeting.location.city,
        locations: audienceTargeting.locations,
        age_min: audienceTargeting.age_min,
        age_max: audienceTargeting.age_max,
        gender: audienceTargeting.gender,
        interests: audienceTargeting.interests,
        // Advanced targeting
        targeting: {
          geo_locations: geo_locations,
        },
        interest_keywords: audienceTargeting.interests,
        // Legacy audience object for backward compatibility
        audience: audienceTargeting,
        workspace_id: Number(workspaceIdForPayload),
        user_id: Number(userIdForPayload),
      };

      if (fetched) {
        payload.creative.image_base64 = fetched.base64;
        payload.creative.image_content_type = fetched.contentType;
        payload.creative.image_filename = `creative_${payload.ad_name.substring(0, 20).replace(/\s+/g, '_')}.jpg`;
      }

      // Handle video if present (from video store)
      if (storedVideoUrl && storedVideoUrl.startsWith('data:')) {
        // Video is already base64 encoded (data URL)
        const videoMatch = storedVideoUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (videoMatch) {
          payload.creative.video_base64 = videoMatch[2];
          payload.creative.video_content_type = videoMatch[1];
          payload.creative.video_filename = `creative_${payload.ad_name.substring(0, 20).replace(/\s+/g, '_')}.mp4`;
        }

        // Handle thumbnail if present
        if (storedThumbnailUrl && storedThumbnailUrl.startsWith('data:')) {
          const thumbMatch = storedThumbnailUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (thumbMatch) {
            payload.creative.thumbnail_base64 = thumbMatch[2];
            payload.creative.thumbnail_content_type = thumbMatch[1];
            payload.creative.thumbnail_filename = `thumbnail_${payload.ad_name.substring(0, 20).replace(/\s+/g, '_')}.jpg`;
          }
        }
      }

      const res = await fetch(`${API_BASE}/api/publish_v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildUserHintHeaders() },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = (json && (json.error || json.details || JSON.stringify(json))) || `HTTP ${res.status}`;
        setErrorMessage(errMsg);
        setShowError(true);
        setLastPublishResult({ ok: false, details: json });
        return;
      }

      toast.success('Campaign published successfully! 🎉', { description: 'Your ad is now being reviewed and will go live soon.' });
      setLastPublishResult({ ok: true, details: json });
      setShowCelebration(true);
      reset && reset();

    } catch (err: any) {
      console.error('❌ [ERROR] Failed to publish campaign:', err);
      setErrorMessage(err?.message || String(err));
      setShowError(true);
      setLastPublishResult({ ok: false, details: String(err) });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleBack = () => navigate('/creative');
  const handleEdit = (step: number) => {
    const routes = ['', '/objective', '/audience', '/budget', '/placements', '/creative', '/review'];
    navigate(routes[step]);
  };

  const previewPrimary = useCampaignStore.getState().creative?.primaryText ?? '';
  const previewHeadline = useCampaignStore.getState().creative?.headline ?? '';
  const previewDescription = useCampaignStore.getState().creative?.description ?? '';
  const previewCta = useCampaignStore.getState().creative?.cta ?? 'CALL_TO_ACTION';
  const previewUrl = useCampaignStore.getState().creative?.url ?? '';

  return (
    <>
      <CelebrationPopup
        isOpen={showCelebration}
        onClose={() => {
          console.log('[ReviewAndConfirm] CelebrationPopup onClose called');
          setShowCelebration(false);
          // Use setTimeout to ensure state update happens first
          setTimeout(() => {
            console.log('[ReviewAndConfirm] Navigating to dashboard');
            navigate('/dashboard');
          }, 100);
        }}
        title="Campaign Published Successfully!"
        subtitle="Your ad is now being reviewed and will go live soon."
        duration={3500}
      />
      <ErrorPopup
        isOpen={showError}
        onClose={() => setShowError(false)}
        onRetry={handlePublish}
        title="Publication Failed"
        errorMessage={errorMessage}
      />

      <div className="min-h-screen bg-slate-50/50 pb-20">
        {/* Header Section */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <img src={logo} alt="Sociovia" className="w-6 h-6" />
                  Review & Launch
                </h1>
                <p className="text-sm text-slate-500 mt-1">Double-check your campaign details before going live</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => toast('Saved draft (client-side)')} className="hidden md:flex">
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={isPublishing || workspaceLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 min-w-[160px]"
                >
                  {isPublishing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      Publish Campaign
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
          {workspaceLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              <span className="ml-3 text-slate-500">Loading workspace details...</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Configuration Summary */}
            <div className="lg:col-span-7 space-y-6">

              {/* Workspace Card */}
              <Card className="border-none shadow-md bg-gradient-to-br from-white to-slate-50 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                <CardContent className="p-6">
                  <div className="flex items-start gap-5">
                    <div className="relative group">
                      {workspaceLogo ? (
                        <img src={workspaceLogo} alt="workspace logo" className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-sm group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100 shadow-sm group-hover:scale-105 transition-transform duration-300">
                          <Building2 className="w-8 h-8 text-emerald-600" />
                        </div>
                      )}
                      <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm border border-slate-100">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] uppercase tracking-wider font-semibold">
                          Workspace
                        </Badge>
                        <span className="text-xs text-slate-400">ID: {serverWorkspace?.id || 'N/A'}</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 truncate">{workspaceTitle}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                        {workspaceIndustry && (
                          <span className="flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5" />
                            {workspaceIndustry}
                          </span>
                        )}
                        {workspaceWebsite && (
                          <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                            <Globe className="w-3.5 h-3.5" />
                            {workspaceWebsite}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Assets</div>
                      <div className="text-2xl font-bold text-slate-900">{creativesCount}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Campaign Configuration Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Objective */}
                <Card className="group hover:shadow-md transition-all duration-200 border-slate-200">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                        <Target className="w-4 h-4 text-blue-600" />
                      </div>
                      <CardTitle className="text-sm font-medium text-slate-600">Objective</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => handleEdit(1)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-semibold text-slate-900 capitalize">
                      {objective?.replace(/_/g, ' ').toLowerCase() || 'Not set'}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Campaign Goal</p>
                  </CardContent>
                </Card>

                {/* Audience */}
                <Card className="group hover:shadow-md transition-all duration-200 border-slate-200">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                        <Users className="w-4 h-4 text-purple-600" />
                      </div>
                      <CardTitle className="text-sm font-medium text-slate-600">Audience</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-purple-600" onClick={() => handleEdit(2)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className={audience?.mode === 'AI' ? "bg-purple-100 text-purple-700 hover:bg-purple-100" : "bg-slate-100 text-slate-700"}>
                        {audience?.mode === 'AI' ? 'AI Smart Audience' : 'Manual'}
                      </Badge>
                    </div>
                    {/* Display all locations */}
                    <div className="flex flex-wrap items-center gap-1 text-sm text-slate-600 mt-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      {(() => {
                        const locations = (audience as any)?.locations;
                        if (Array.isArray(locations) && locations.length > 0) {
                          return locations.map((loc: any, idx: number) => {
                            const parts = [loc.city, loc.region, loc.country].filter(Boolean);
                            const display = parts.join(', ') || 'Unknown';
                            const radiusInfo = loc.radius ? ` (${loc.radius} km)` : '';
                            return (
                              <span key={idx} className="inline-flex items-center">
                                {display}{radiusInfo}
                                {idx < locations.length - 1 && <span className="mx-1 text-slate-300">•</span>}
                              </span>
                            );
                          });
                        }
                        // Fallback to single location
                        const loc = audience?.location;
                        if (loc?.country) {
                          const parts = [loc.city, loc.region, loc.country].filter(Boolean);
                          return parts.join(', ') || loc.country;
                        }
                        return 'Global';
                      })()}
                    </div>
                    {/* Display age range */}
                    {Array.isArray(audience?.age) && (
                      <div className="text-xs text-slate-500 mt-1">
                        Age: {audience.age[0]} - {audience.age[1]} • {audience?.gender === 'all' ? 'All genders' : audience?.gender}
                      </div>
                    )}
                    {/* Display interests if any */}
                    {Array.isArray(audience?.interests) && audience.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {audience.interests.slice(0, 3).map((interest: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                            {interest}
                          </Badge>
                        ))}
                        {audience.interests.length > 3 && (
                          <Badge variant="outline" className="text-xs bg-slate-50 text-slate-500 border-slate-200">
                            +{audience.interests.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Budget */}
                <Card className="group hover:shadow-md transition-all duration-200 border-slate-200">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                        <Wallet className="w-4 h-4 text-green-600" />
                      </div>
                      <CardTitle className="text-sm font-medium text-slate-600">Budget</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-green-600" onClick={() => handleEdit(3)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-semibold text-slate-900">
                      ₹{budget?.amount?.toLocaleString() ?? '0'}
                      <span className="text-xs font-normal text-slate-500 ml-1 capitalize">/ {budget?.type || 'day'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-2">
                      <Calendar className="w-3 h-3" />
                      {budget?.startDate ? `${new Date(budget.startDate).toLocaleDateString()} - ${budget?.endDate ? new Date(budget.endDate).toLocaleDateString() : 'Ongoing'}` : 'No dates set'}
                    </div>
                  </CardContent>
                </Card>

                {/* Placements */}
                <Card className="group hover:shadow-md transition-all duration-200 border-slate-200">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                        <LayoutGrid className="w-4 h-4 text-orange-600" />
                      </div>
                      <CardTitle className="text-sm font-medium text-slate-600">Placements</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-orange-600" onClick={() => handleEdit(4)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {placements?.automatic ? (
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        Automatic (Recommended)
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(placements?.manual) && placements.manual.length > 0 ? (
                          placements.manual.slice(0, 3).map((p: string) => (
                            <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-white">
                              {p.replace(/_/g, ' ')}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">None selected</span>
                        )}
                        {placements?.manual?.length > 3 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-slate-50">+{placements.manual.length - 3}</Badge>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-slate-500 mt-2">
                      {placements?.automatic ? 'Optimized across all platforms' : 'Manual platform selection'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Live Preview Section */}
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                        <Eye className="w-5 h-5 text-slate-700" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold text-slate-900">Live Preview</CardTitle>
                        <CardDescription className="text-xs">Real-time rendering from Meta</CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                      <div className="w-48">
                        <Select value={selectedFormat} onValueChange={(v) => setSelectedFormat(v)}>
                          <SelectTrigger className="h-8 border-none focus:ring-0 text-xs font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AD_PREVIEW_FORMATS.map((f) => <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <Separator orientation="vertical" className="h-4" />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-emerald-600" onClick={() => fetchMetaPreview([selectedFormat])} title="Refresh">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600" onClick={() => { setAdPreview(null); setPreviewError(null); }} title="Clear">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0 bg-slate-100/50 min-h-[400px] flex items-center justify-center relative">
                  {loadingPreview && (
                    <div className="flex flex-col items-center justify-center p-8 text-slate-500 animate-pulse">
                      <RefreshCw className="w-8 h-8 mb-3 animate-spin text-emerald-500" />
                      <p className="text-sm font-medium">Generating preview from Meta...</p>
                    </div>
                  )}

                  {!loadingPreview && previewError && (
                    <div className="text-center p-8 max-w-md mx-auto">
                      <div className={`w-12 h-12 ${previewError.isSessionError ? 'bg-amber-50' : 'bg-red-50'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                        <Target className={`w-6 h-6 ${previewError.isSessionError ? 'text-amber-500' : 'text-red-500'}`} />
                      </div>
                      <h3 className="text-slate-900 font-medium mb-2">{previewError.title}</h3>
                      <p className="text-sm text-slate-500 mb-4">{previewError.message}</p>
                      <div className="flex gap-2 justify-center">
                        {previewError.isSessionError ? (
                          <Button size="sm" variant="default" onClick={() => window.open('/workspace/bind-meta', '_blank')}>
                            Reconnect Meta
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => fetchMetaPreview([selectedFormat])}>
                            Try Again
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setPreviewError(null)}>
                          Dismiss
                        </Button>
                      </div>
                      <p className="text-xs text-slate-400 mt-4">
                        Preview is optional — you can still publish your campaign.
                      </p>
                    </div>
                  )}

                  {!loadingPreview && adPreview && (
                    <div className="w-full h-full flex justify-center p-4">
                      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 max-w-[500px] w-full">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                            <div className="w-2 h-2 rounded-full bg-green-400"></div>
                          </div>
                          <div className="flex-1 text-center text-[10px] text-slate-400 font-mono">facebook.com</div>
                        </div>
                        <div dangerouslySetInnerHTML={{ __html: adPreview }} className="preview-container" />
                      </div>
                    </div>
                  )}

                  {!loadingPreview && !adPreview && !previewError && (
                    <div className="text-center p-12">
                      <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <Eye className="w-8 h-8" />
                      </div>
                      <h3 className="text-slate-900 font-medium mb-1">No Preview Available</h3>
                      <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">Click refresh to generate a live preview from Meta's servers.</p>
                      <Button onClick={() => fetchMetaPreview([selectedFormat])} variant="outline" className="bg-white">
                        Generate Preview
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Sidebar */}
            <div className="lg:col-span-5 space-y-6">

              {/* Static Preview Card */}
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/30">
                  <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-slate-500" />
                    Creative Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative aspect-video bg-slate-100 group overflow-hidden">
                    {adVideo ? (
                      <>
                        <video
                          src={adVideo}
                          controls
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 bg-purple-600 text-white text-[10px] font-semibold px-2 py-1 rounded-full">
                          VIDEO AD
                        </div>
                      </>
                    ) : adImage?.url ? (
                      <>
                        <img
                          src={adImage.url}
                          alt="ad creative"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x400?text=Image+Unavailable'; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                          <p className="text-white text-xs font-medium truncate w-full">{previewHeadline}</p>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                        <span className="text-xs">No media selected</span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 space-y-4 bg-white">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1 block">Headline</label>
                      <p className="text-sm font-medium text-slate-900 leading-snug">{previewHeadline || <span className="text-slate-300 italic">No headline set</span>}</p>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1 block">Primary Text</label>
                      <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{previewPrimary || <span className="text-slate-300 italic">No primary text set</span>}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1 block">Call to Action</label>
                        <Badge variant="outline" className="bg-slate-50 font-normal text-slate-700 border-slate-200">
                          {previewCta.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1 block">Destination</label>
                        <div className="flex items-center gap-1.5 text-xs text-blue-600 truncate">
                          <Globe className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{previewUrl || 'Not set'}</span>
                        </div>
                      </div>
                    </div>

                    <Button variant="outline" size="sm" onClick={handleBack} className="w-full mt-2 text-xs h-8 border-dashed">
                      <Edit className="w-3 h-3 mr-1.5" />
                      Edit Creative
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Publish Card - Sticky on Desktop */}
              <div className="sticky top-24 space-y-4">
                <Card className="border-emerald-100 shadow-lg bg-gradient-to-b from-white to-emerald-50/30 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100 rounded-full blur-3xl opacity-50 -mr-10 -mt-10 pointer-events-none"></div>

                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-emerald-600" />
                      Ready to Publish?
                    </CardTitle>
                    <CardDescription>
                      Your campaign will be submitted to Meta for review immediately.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-4">
                    <div className="bg-white/60 rounded-lg p-3 border border-emerald-100 text-xs text-slate-600 space-y-2">
                      <div className="flex justify-between">
                        <span>Daily Budget:</span>
                        <span className="font-medium text-slate-900">₹{budget?.amount?.toLocaleString() ?? '0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Est. Reach:</span>
                        <span className="font-medium text-slate-900">~1.2k - 3.5k / day</span>
                      </div>
                    </div>

                    <Button
                      onClick={handlePublish}
                      disabled={isPublishing || workspaceLoading}
                      className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {isPublishing ? (
                        <>
                          <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          Publish Campaign Now
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>

                    <p className="text-[10px] text-center text-slate-400 px-4">
                      By publishing, you agree to Meta's Advertising Policies and Terms of Service.
                    </p>

                    {lastPublishResult && (
                      <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                        <div className="text-xs font-medium text-slate-500 mb-1.5">Last attempt result:</div>
                        <pre className="text-[10px] max-h-32 overflow-auto bg-slate-900 text-slate-50 p-3 rounded-lg font-mono border border-slate-800 custom-scrollbar">
                          {JSON.stringify(lastPublishResult.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-center">
                  <Button variant="link" className="text-slate-400 hover:text-slate-600 text-xs" onClick={handleSaveDraft}>
                    Save as Draft & Exit
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
