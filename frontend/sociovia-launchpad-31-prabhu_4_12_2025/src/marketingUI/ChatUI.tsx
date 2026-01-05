"use client";
 
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Send, PanelsTopLeft, Menu, X, Edit, Trash2, Loader2, Copy, Download, Check, Sparkles, Plus, Wand2, Clock, Shield, ImagePlay, Film, Upload, ImageOff } from "lucide-react";
import logo from "@/assets/sociovia_logo.png";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MoreVertical, MicIcon, StampIcon as StopIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useVoice } from "@/hooks/use-voice";
import { useNavigate } from 'react-router-dom';
import { useCampaignStore } from '@/store/campaignStore';

// ---------- SafeImage Component ----------
// Handles broken/expired images with proper fallback
interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackText?: string;
  fallbackClassName?: string;
  hideOnError?: boolean;
}

function SafeImage({ 
  src, 
  alt, 
  className, 
  fallbackText = "Image unavailable", 
  fallbackClassName,
  hideOnError = false,
  onClick,
  ...props 
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reset error state when src changes
  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  if (!src || hasError) {
    if (hideOnError) return null;
    return (
      <div 
        className={cn(
          "flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400",
          fallbackClassName || className
        )}
        onClick={onClick as any}
      >
        <ImageOff className="h-8 w-8 mb-1 opacity-50" />
        <span className="text-[10px] text-center px-2">{fallbackText}</span>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className={cn("flex items-center justify-center bg-gray-100 animate-pulse", className)}>
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn(className, isLoading && "hidden")}
        onClick={onClick}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        {...props}
      />
    </>
  );
}

// ---------- Types ----------
type TemplateKind = "post" | "carousel" | "story";
type PostCandidate = {
  id: string;
  type: "post";
  caption?: string;
  image_hints?: string[];
  suggestions?: string[];
  subtitle?: string;
  meta?: any;
};
type CarouselCandidate = {
  id: string;
  type: "carousel";
  slides: { caption?: string; image_hint?: string }[];
  suggestions?: string[];
  subtitle?: string;
  meta?: any;
};
type Candidate = PostCandidate | CarouselCandidate;
type ConversationItem = {
  id: string;
  sessionId: string; // Groups multiple prompts into same chat session
  prompt: string;
  title?: string;
  theme: string | null;
  template: TemplateKind;
  candidates: Candidate[];
  createdAt: number;
  uploads?: UploadItem[]; // Store uploads used for this generation
};
type UploadItem = {
  id: string;
  url: string;
  name?: string;
  size?: number;
  type?: string;
  file?: File | null
};
type SocialRow = {
  db: any;
  fb_raw?: any | null;
  error?: any | null;
};
// ---------- Config ----------
const FALLBACK_BACKEND = (import.meta.env.VITE_API_BASE ?? "").toString().replace(/\/$/, "");
const BACKEND_BASE = FALLBACK_BACKEND;
if (!BACKEND_BASE) {
  console.warn("BACKEND_BASE not configured. Images/requests may fail.");
}
const API_BASE = BACKEND_BASE;
// ---------- Utilities ----------
function buildBackendUrl(path: string) {
  if (!BACKEND_BASE) return path;
  if (!path.startsWith("/")) path = "/" + path;
  return `${BACKEND_BASE}${path}`;
}
function getUserIdFromLocalStorage(): number | null {
  try {
    const raw = localStorage.getItem("sv_user");
    if (!raw) return null;
    const userData = JSON.parse(raw);
    const id = userData?.id ?? null;
    return typeof id === "number" ? id : (id ? Number(id) : null);
  } catch (err) {
    console.error("Failed to get user from localStorage", err);
    return null;
  }
}
function makeUrl(path: string, query: Record<string, any> = {}) {
  const u = new URL(path, API_BASE);
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  });
  return u.toString();
}
// ----- Local storage helper -----
const IMAGE_EXPIRY_DAYS = 15;
const EXPIRY_WARNING_DAYS = 3; // Warn user 3 days before expiration

type SavedImageRecord = {
  id: string;
  url: string;
  savedAt: string;
  expiresAt: string;
  isPermanent?: boolean; // If true, won't be auto-deleted
};

function addToLocalSavedImages(record: { id: string; url: string }) {
  try {
    const raw = localStorage.getItem("local_saved_images");
    const arr: SavedImageRecord[] = raw ? JSON.parse(raw) : [];
    const exists = Array.isArray(arr) && arr.some((r: any) => r.url === record.url);
    if (!exists) {
      const savedAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + IMAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
      arr.push({
        id: record.id,
        url: record.url,
        savedAt,
        expiresAt,
        isPermanent: false
      });
      localStorage.setItem("local_saved_images", JSON.stringify(arr));
    }
  } catch (err) {
    console.warn("Could not save to local_saved_images:", err);
  }
}

function getLocalSavedImages(): SavedImageRecord[] {
  try {
    const raw = localStorage.getItem("local_saved_images");
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

function getExpiringImages(): SavedImageRecord[] {
  const images = getLocalSavedImages();
  const now = new Date();
  const warningDate = new Date(now.getTime() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000);

  return images.filter(img => {
    if (img.isPermanent) return false;
    const expiresAt = new Date(img.expiresAt);
    return expiresAt <= warningDate && expiresAt > now;
  });
}

function getExpiredImages(): SavedImageRecord[] {
  const images = getLocalSavedImages();
  const now = new Date();

  return images.filter(img => {
    if (img.isPermanent) return false;
    const expiresAt = new Date(img.expiresAt);
    return expiresAt <= now;
  });
}

function deleteExpiredImages(): SavedImageRecord[] {
  const images = getLocalSavedImages();
  const now = new Date();
  const deleted: SavedImageRecord[] = [];

  const remaining = images.filter(img => {
    if (img.isPermanent) return true;
    const expiresAt = new Date(img.expiresAt);
    if (expiresAt <= now) {
      deleted.push(img);
      return false;
    }
    return true;
  });

  localStorage.setItem("local_saved_images", JSON.stringify(remaining));
  return deleted;
}

function markImageAsPermanent(imageId: string): boolean {
  try {
    const images = getLocalSavedImages();
    const updated = images.map(img =>
      img.id === imageId ? { ...img, isPermanent: true } : img
    );
    localStorage.setItem("local_saved_images", JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}

function getDaysUntilExpiry(expiresAt: string): number {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}
/* mapBackendResultsToCandidates */
function mapBackendResultsToCandidates(items: any): Candidate[] {
  if (!items) return [];
  if (!Array.isArray(items) && typeof items === "object" && (Array.isArray(items.results) || Array.isArray(items.files) || Array.isArray(items.urls))) {
    const resp = items as { files?: string[]; urls?: string[]; results?: any[]; themes?: any[]; success?: boolean };
    const files = Array.isArray(resp.files) ? resp.files : [];
    const urls = Array.isArray(resp.urls) ? resp.urls : [];
    const results = Array.isArray(resp.results) ? resp.results : [];
    const resolveFilenameToUrl = (fname: string | undefined, fallbackIndex?: number): string | null => {
      if (!fname) return null;
      const byEnds = urls.find((u: string) => typeof u === "string" && u.endsWith(fname));
      if (byEnds) return byEnds;
      const fi = files.indexOf(fname);
      if (fi >= 0 && urls[fi]) return urls[fi];
      if (typeof fallbackIndex === "number" && urls[fallbackIndex]) return urls[fallbackIndex];
      if (BACKEND_BASE && fname && !fname.startsWith("http")) return `${BACKEND_BASE}/outputs/${fname}`;
      return null;
    };
    if (results.length > 0) {
      return results.map((r: any, idx: number) => {
        const themeIndex = typeof r?.theme_index === "number" ? r.theme_index : idx;
        const theme = r?.theme || (Array.isArray(resp.themes) ? resp.themes[themeIndex] : undefined) || {};
        let caption = (theme?.one_line && String(theme.one_line)) || (theme?.title && String(theme.title)) || (theme?.name && String(theme.name)) || "";
        let subtitle = theme?.title ? String(theme.title) : "";
        let imageHints: string[] = [];
        if (Array.isArray(r?.files) && r.files.length) {
          imageHints = r.files.map((fname: string, fi: number) => {
            const url = resolveFilenameToUrl(fname, fi);
            return url || fname || null;
          }).filter(Boolean) as string[];
        } else if (Array.isArray(r?.urls) && r.urls.length) {
          imageHints = r.urls.slice();
        } else {
          const candidateUrl = (urls[themeIndex] || urls[idx]) || null;
          if (candidateUrl) imageHints = [candidateUrl];
          else if (files[themeIndex]) imageHints = [files[themeIndex]];
        }
        let suggestions: string[] = Array.isArray(r?.suggestions) ? r.suggestions : [];
        let meta: any = { theme };
        if (r?.content) {
          const content = r.content;
          if (content.caption) caption = content.caption;
          if (Array.isArray(content.hashtags)) suggestions = content.hashtags;
          if (content.cta) subtitle = content.cta;
          meta = { ...meta, content };
        }
        if (imageHints.length > 1) {
          const slides = imageHints.map((ih) => ({ caption, image_hint: ih }));
          return {
            id: (typeof theme?.id === "string" && theme.id) || (typeof r?.id === "string" && r.id) || `carousel-${themeIndex}-${Math.random().toString(36).slice(2, 8)}`,
            type: "carousel",
            subtitle,
            slides,
            suggestions,
            meta,
          } as CarouselCandidate;
        }
        return {
          id: (typeof theme?.id === "string" && theme.id) || (typeof r?.id === "string" && r.id) || `post-${themeIndex}-${Math.random().toString(36).slice(2, 8)}`,
          type: "post",
          caption,
          subtitle,
          image_hints: imageHints.length ? imageHints : [],
          suggestions,
          meta,
        } as PostCandidate;
      });
    }
    if (urls.length > 0 || files.length > 0) {
      const source = urls.length > 0 ? urls : files.map((f) => (BACKEND_BASE && !f.startsWith("http") ? `${BACKEND_BASE}/outputs/${f}` : f));
      return source.map((u: string, i: number) => ({
        id: `f-${Date.now()}-${i}`,
        type: "post",
        caption: "",
        image_hints: [u],
      })) as Candidate[];
    }
    return [];
  }
  if (!Array.isArray(items)) return [];
  return items.map((it: any, idx: number) => {
    if (Array.isArray(it?.slides)) {
      const slides = it.slides.map((s: any) => ({ caption: s?.caption ?? "", image_hint: s?.image_hint ?? s?.image_url ?? "" }));
      return {
        id: (it?.id as string) || `carousel-${idx}-${Math.random().toString(36).slice(2, 8)}`,
        type: "carousel",
        slides,
        suggestions: Array.isArray(it?.suggestions) ? it.suggestions : [],
        meta: { title: it?.title ?? undefined },
      } as CarouselCandidate;
    }
    const caption = it?.caption ?? it?.title ?? it?.text ?? "";
    const imageHint = (Array.isArray(it?.urls) && it.urls[0]) || it?.url || it?.image_hint || (Array.isArray(it?.image_hints) && it.image_hints[0]) || it?.image_url || "";
    return {
      id: (it?.id as string) || `post-${idx}-${Math.random().toString(36).slice(2, 8)}`,
      type: "post",
      caption: typeof caption === "string" ? caption : String(caption),
      subtitle: it?.title ? String(it.title) : undefined,
      image_hints: imageHint ? [String(imageHint)] : [],
      suggestions: Array.isArray(it?.suggestions) ? it.suggestions : [],
      meta: { item: it },
    } as PostCandidate;
  });
}
function resolveHintToUrl(hint: string | undefined, kind: "post" | "slide", uploads?: UploadItem[]) {
  const postPh = "/creative-thumbnail.jpg";
  const slidePh = "/slide-thumbnail.jpg";
  const ph = kind === "post" ? postPh : slidePh;
  if (!hint) return ph;
  if (hint.startsWith("uploaded_")) {
    const found = uploads?.find((u) => u.id === hint)?.url;
    return found || ph;
  }
  if (hint.startsWith("data:")) return hint;
  if (hint.startsWith("http://") || hint.startsWith("https://")) return hint;
  if (hint.startsWith("//")) return window.location.protocol + hint;
  if (hint.startsWith("/")) {
    if (hint.startsWith("/outputs/") && BACKEND_BASE) {
      return `${BACKEND_BASE}${hint}`;
    }
    return hint;
  }
  if (BACKEND_BASE) return `${BACKEND_BASE}/outputs/${hint}`;
  return `/outputs/${hint}`;
}
// small local mock generator fallback if backend fails
async function clientMockGenerate(_: any) {
  return {
    candidates: [
      {
        id: `mock-${Date.now()}-1`,
        type: "post",
        caption: "Mock caption 1",
        image_hints: ["/creative-thumbnail.jpg"]
      } as PostCandidate,
      {
        id: `mock-${Date.now()}-2`,
        type: "post",
        caption: "Mock short caption 2",
        image_hints: ["/creative-thumbnail.jpg"]
      } as PostCandidate,
    ],
  };
}
function onDropBindToCandidate(candidateId: string, uploadId: string) {
  const ev = new CustomEvent("bind-to-candidate", { detail: { candidateId, uploadId } });
  window.dispatchEvent(ev);
}
// ---------- Component ----------
export default function ChatUIPage() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [theme, setTheme] = useState<string | null>(null);
  const [template, setTemplate] = useState<TemplateKind>("post");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showPanelsMobile, setShowPanelsMobile] = useState(false);
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bindings, setBindings] = useState<Record<string, string[]>>({});
  const [editCandidate, setEditCandidate] = useState<Candidate | null>(null);
  const [editPrompt, setEditPrompt] = useState<string>("");
  const [editBoundUploads, setEditBoundUploads] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showAssets, setShowAssets] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const attachInputRef = useRef<HTMLInputElement | null>(null);
  const controlsPanelRef = useRef<HTMLDivElement | null>(null);
  const controlsPanelDesktopRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [viewedImage, setViewedImage] = useState<string | null>(null);
  const [viewedVideo, setViewedVideo] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [newChatTitle, setNewChatTitle] = useState("");
  const [workspaceInfo, setWorkspaceInfo] = useState<any>({});
  const [showWorkspaceDialog, setShowWorkspaceDialog] = useState(false);
  const [savedByUrl, setSavedByUrl] = useState<Record<string, { id: string; url: string }>>({});
  const [assetsToSave, setAssetsToSave] = useState<Set<string>>(new Set());
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [postImage, setPostImage] = useState<{ id: string; url: string } | null>(null);
  const [postPlatforms, setPostPlatforms] = useState<string[]>([]);
  const [isWorkspaceMode, setIsWorkspaceMode] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceDetails, setWorkspaceDetails] = useState<any>(null);
  const [showAssetSelectionDialog, setShowAssetSelectionDialog] = useState(false);
  const [selectedAssetsForGeneration, setSelectedAssetsForGeneration] = useState<Set<string>>(new Set());
  const [workspaceAssets, setWorkspaceAssets] = useState<UploadItem[]>([]);
  const [validatedAssets, setValidatedAssets] = useState<UploadItem[]>([]); // Only live/valid assets
  const [isValidatingAssets, setIsValidatingAssets] = useState(false);
  const [workspaceCreatives, setWorkspaceCreatives] = useState<any[]>([]);
  const [user, setUser] = useState<{ id: number; email: string } | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialRow[]>([]);
  const [showAccountSelectionDialog, setShowAccountSelectionDialog] = useState(false);
  const [selectedAccountForPost, setSelectedAccountForPost] = useState<SocialRow | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [showUploadHighlight, setShowUploadHighlight] = useState(false);
  const [imageUrlsFromLastSelection, setImageUrlsFromLastSelection] = useState<string[]>([]);
  const [editCaption, setEditCaption] = useState("");
  // Image edit states
  const [showImageEditDialog, setShowImageEditDialog] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<{ url: string; candidate: Candidate | null } | null>(null);
  const [editInstructions, setEditInstructions] = useState("");
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [editedImageResult, setEditedImageResult] = useState<string | null>(null);
  // Image expiration states
  const [showExpirationWarning, setShowExpirationWarning] = useState(false);
  const [expiringImages, setExpiringImages] = useState<SavedImageRecord[]>([]);
  const [expiredImages, setExpiredImages] = useState<SavedImageRecord[]>([]);

  // Onboarding tooltips states
  const [showOnboardingTooltips, setShowOnboardingTooltips] = useState(false);
  const [showControlsTooltip, setShowControlsTooltip] = useState(false);
  const [showMediaTooltip, setShowMediaTooltip] = useState(false);
  const [suggestedPrompt, setSuggestedPrompt] = useState<string | null>(null);
  const [showPromptSuggestion, setShowPromptSuggestion] = useState(false);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const { isSupported, isListening, interimTranscript, startListening, stopListening, resetTranscript } = useVoice({
    lang: "en-US",
    interimResults: true,
    onFinal: (finalText: string) => {
      setPrompt((prev) => (prev ? prev + " " + finalText : finalText));
    },
  } as any);
  const navigate = useNavigate();
  const { setSelectedImages } = useCampaignStore();
  useEffect(() => {
    try {
      const rv = localStorage.getItem("sv_user");
      if (rv) {
        setUser(JSON.parse(rv));
      }
    } catch (err) {
      console.error("Error loading user:", err);
    }
  }, []);

  // Check for expiring and expired images on mount and periodically
  useEffect(() => {
    const checkImageExpiration = () => {
      // First, delete any already expired images
      const deleted = deleteExpiredImages();
      if (deleted.length > 0) {
        setExpiredImages(deleted);
        toast({
          title: "Images Expired",
          description: `${deleted.length} image(s) have been automatically deleted after 15 days.`,
        });
      }

      // Then check for images expiring soon
      const expiring = getExpiringImages();
      if (expiring.length > 0) {
        setExpiringImages(expiring);
        setShowExpirationWarning(true);
      }
    };

    // Check immediately on mount
    checkImageExpiration();

    // Check every hour
    const interval = setInterval(checkImageExpiration, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [toast]);

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/workspace\/(\d+)\/chat$/);
    if (match) {
      setIsWorkspaceMode(true);
      setWorkspaceId(match[1]);
    }
  }, []);
  const authHeaders = useMemo(() => {
    if (!user) return {};
    return {
      'X-User-Id': user.id.toString(),
      'X-User-Email': user.email,
    };
  }, [user]);
  useEffect(() => {
    if (isWorkspaceMode && workspaceId && user) {
      setLoadingConversations(true);
      (async () => {
        try {
          const res = await fetch(buildBackendUrl(`/api/workspace?user_id=${user.id}`), {
            headers: {
              ...authHeaders,
              'Content-Type': 'application/json',
            },
          });
          if (res.ok) {
            const j = await res.json();
            const workspaces = Array.isArray(j.workspaces) ? j.workspaces : Array.isArray(j) ? j : [];
            const ws = workspaces.find((w: any) => String(w.id) === workspaceId);
            if (ws) {
              setWorkspaceDetails(ws);
              setWorkspaceInfo(ws);
              const singleRes = await fetch(buildBackendUrl(`/api/workspace?workspace_id=${workspaceId}&user_id=${user.id}`), {
                headers: {
                  ...authHeaders,
                  'Content-Type': 'application/json',
                },
              });
              if (singleRes.ok) {
                const singleJ = await singleRes.json();
                if (singleJ.success) {
                  setWorkspaceDetails(singleJ.workspace);
                  setWorkspaceCreatives(singleJ.creatives || []);
                  const mappedCreatives = (singleJ.creatives || []).map((c: any) => ({
                    id: c.id,
                    url: c.url,
                    name: c.filename,
                    type: c.type,
                    file: null,
                  }));
                  setWorkspaceAssets((prev) => {
                    const logo = ws.logo_path ? {
                      id: 'workspace-logo',
                      url: buildBackendUrl(`/${ws.logo_path}`),
                      name: 'Logo',
                      file: null
                    } : null;
                    return logo ? [logo, ...mappedCreatives] : mappedCreatives;
                  });
                }
              }
              const gensRes = await fetch(buildBackendUrl(`/api/generations?workspace_id=${workspaceId}`), {
                headers: authHeaders,
              });
              if (gensRes.ok) {
                const gensJ = await gensRes.json();
                const gens = Array.isArray(gensJ.generations) ? gensJ.generations : Array.isArray(gensJ) ? gensJ : [];
                const mapped = gens.map((g: any) => {
                  let parsed;
                  try {
                    parsed = JSON.parse(g.response);
                  } catch {
                    parsed = {};
                  }
                  const candidates = mapBackendResultsToCandidates(parsed);
                  return {
                    id: g.id,
                    sessionId: g.session_id || g.id, // Use backend session_id or fallback to id for legacy data
                    prompt: g.prompt,
                    title: g.title || g.prompt.slice(0, 50) + (g.prompt.length > 50 ? '...' : ''),
                    theme: null,
                    template: "post",
                    candidates,
                    createdAt: new Date(g.created_at).getTime(),
                  };
                }).sort((a: ConversationItem, b: ConversationItem) => b.createdAt - a.createdAt);
                setConversation(mapped);
                // Don't auto-select first chat - keep showing new chat view
              }
              if (ws.description || ws.usp) {
                setTheme(ws.description + " " + ws.usp);
              }
            } else {
              toast({ description: "Workspace not found." });
            }
          } else {
            toast({ description: "Failed to fetch workspaces." });
          }
        } catch (err) {
          console.error("Error fetching workspaces:", err);
          toast({ description: "Error fetching workspace details." });
        } finally {
          setLoadingConversations(false);
        }
      })();
    }
  }, [isWorkspaceMode, workspaceId, user, toast, authHeaders]);
  useEffect(() => {
    if (!isWorkspaceMode && user) {
      setLoadingConversations(true);
      (async () => {
        try {
          const res = await fetch(buildBackendUrl(`/api/workspace/me`), {
            headers: {
              ...authHeaders,
              'Content-Type': 'application/json',
            },
          });
          if (res.ok) {
            const j = await res.json();
            const ws = j?.workspace || j || {};
            setWorkspaceInfo(ws);
            setWorkspaceCreatives(j.creatives || []);
            const mappedCreatives = (j.creatives || []).map((c: any) => ({
              id: c.id,
              url: c.url,
              name: c.filename,
              type: c.type,
              file: null,
            }));
            setWorkspaceAssets((prev) => {
              const logo = ws.logo_path ? {
                id: 'workspace-logo',
                url: buildBackendUrl(`/${ws.logo_path}`),
                name: 'Logo',
                file: null
              } : null;
              return logo ? [logo, ...mappedCreatives] : mappedCreatives;
            });
            const gensRes = await fetch(buildBackendUrl(`/api/generations/me`), {
              headers: authHeaders,
            });
            if (gensRes.ok) {
              const gensJ = await gensRes.json();
              const gens = Array.isArray(gensJ.generations) ? gensJ.generations : Array.isArray(gensJ) ? gensJ : [];
              const mapped = gens.map((g: any) => {
                let parsed;
                try {
                  parsed = JSON.parse(g.response);
                } catch {
                  parsed = {};
                }
                const candidates = mapBackendResultsToCandidates(parsed);
                return {
                  id: g.id,
                  sessionId: g.session_id || g.id, // Use backend session_id or fallback to id for legacy data
                  prompt: g.prompt,
                  title: g.title || g.prompt.slice(0, 50) + (g.prompt.length > 50 ? '...' : ''),
                  theme: null,
                  template: "post",
                  candidates,
                  createdAt: new Date(g.created_at).getTime(),
                };
              }).sort((a: ConversationItem, b: ConversationItem) => b.createdAt - a.createdAt);
              setConversation(mapped);
              // Don't auto-select first chat - keep showing new chat view
            }
            if (ws.description || ws.usp) {
              setTheme(ws.description + " " + ws.usp);
            }
          }
        } catch (err) {
          // not critical
        } finally {
          setLoadingConversations(false);
        }
      })();
    }
  }, [isWorkspaceMode, user, authHeaders]);
  const fetchSocialAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const userId = getUserIdFromLocalStorage();
      const url = makeUrl("/api/social/management", { user_id: userId ?? undefined });
      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json"
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (!body.success) throw new Error(body.error || "Failed to load accounts");
      const rawAccounts = body?.accounts ?? [];
      const activeAccount = body?.active_account;
      
      const normalizedRows: SocialRow[] = rawAccounts.map((it: any) => ({
        db: it.db ?? it,
        fb_raw: it.fb_raw ?? it.page ?? null,
        error: it.error ?? null,
      }));
      
      // Deduplicate accounts by account_name + platform to prevent showing duplicates
      // (keep the first/most recent entry as accounts are ordered by id desc)
      const uniqueRows = normalizedRows.filter((row, index, self) => 
        index === self.findIndex(r => 
          r.db.account_name === row.db.account_name && 
          r.db.platform === row.db.platform
        )
      );
      
      // If there's an active account, filter to show only that one
      // Otherwise show all unique accounts
      let finalRows = uniqueRows;
      if (activeAccount?.id) {
        const activeRow = uniqueRows.find(r => r.db.id === activeAccount.id);
        if (activeRow) {
          finalRows = [activeRow];
        }
      }
      
      setSocialAccounts(finalRows);
      if (finalRows.length === 0) {
        toast({ description: "No linked accounts found. Please connect one first." });
        return false;
      }
      
      return true;
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message || "Failed to load accounts" });
      return false;
    } finally {
      setLoadingAccounts(false);
    }
  }, [toast]);
  const saveWorkspaceData = useCallback(async () => {
    console.log('ðŸ”§ [DEBUG] Starting saveWorkspaceData()');
    const currentUserId = user?.id || null;
    const currentWorkspaceId = workspaceId || workspaceInfo?.id || null;
    const workspaceData = workspaceDetails || workspaceInfo || {};
    try {
      const key = `workspace_${currentWorkspaceId || 'default'}`;
      localStorage.setItem(key, JSON.stringify({
        ...workspaceData,
        user_id: currentUserId,
        workspace_id: currentWorkspaceId,
        saved_at: new Date().toISOString()
      }));
      console.log('âœ… [DEBUG] Workspace data saved locally with key:', key);
      toast({ description: "Workspace data saved locally." });
      return true;
    } catch (err) {
      console.error('ðŸ”§ [DEBUG] saveWorkspaceData local error:', err);
      toast({ description: "Workspace save failed (local)." });
      return false;
    }
  }, [user, workspaceId, workspaceInfo, workspaceDetails, toast]);
  // ------------------ auth helpers ------------------
  function getCurrentUserIdFromWindowOrLS(): string | null {
    // check window-level var (older code)
    if ((window as any).currentUserId) return String((window as any).currentUserId);
    // check your sv_user pattern in localStorage
    try {
      const raw = localStorage.getItem("sv_user");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.id) return String(parsed.id);
      }
    } catch (e) { /* ignore */ }
    // fallbacks for other keys
    const ls = localStorage.getItem("currentUserId") || localStorage.getItem("userId") || localStorage.getItem("user_id");
    if (ls) return ls;
    // cookie fallback
    const m = document.cookie.match(/(?:^|;\s*)user_id=([^;]+)/);
    if (m) return decodeURIComponent(m[1] || "");
    return null;
  }
  function getAuthToken(): string | null {
    if ((window as any).authToken) return String((window as any).authToken);
    return localStorage.getItem("authToken") || localStorage.getItem("token") || null;
  }
  async function fetchMeForUserId(): Promise<string | null> {
    try {
      const resp = await fetch(`${API_BASE.replace(/\/$/, "")}/api/me`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include", // ensure cookies are sent
      });
      if (!resp.ok) return null;
      const body = await resp.json().catch(() => null);
      const u = body?.user ?? body;
      return u?.id ? String(u.id) : null;
    } catch (e) {
      console.error("fetchMeForUserId failed:", e);
      return null;
    }
  }
  async function ensureUserId(): Promise<string | null> {
    // 1) try local sources first (sv_user etc)
    const local = getCurrentUserIdFromWindowOrLS();
    if (local) return local;
    // 2) fallback to /api/me (session cookie)
    const fromMe = await fetchMeForUserId();
    if (fromMe) {
      // persist minimal sv_user shape for next time
      try { localStorage.setItem("sv_user", JSON.stringify({ id: fromMe })); } catch { }
      return fromMe;
    }
    return null;
  }
  function buildHeaders(opts?: { json?: boolean; userId?: string }) {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (opts?.json) headers["Content-Type"] = "application/json";
    const token = getAuthToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (opts?.userId) headers["X-User-Id"] = String(opts.userId);
    return headers;
  }
  async function readResponseText(resp: Response) {
    try {
      const txt = await resp.text();
      try { return JSON.stringify(JSON.parse(txt), null, 2); } catch { return txt; }
    } catch (e) {
      return `<unreadable response: ${e}>`;
    }
  }
  // ------------------ UI handlers ------------------
  const handleRenameChat = useCallback((chatId: string) => {
    const chat = conversation.find(c => c.id === chatId);
    if (chat) {
      setNewChatTitle(chat.title || (chat.prompt || "").slice(0, 50));
      setEditingChatId(chatId);
    }
  }, [conversation]);
  const confirmRenameChat = useCallback(async () => {
    if (!editingChatId || !newChatTitle.trim()) {
      toast({ description: "Please enter a title." });
      return;
    }
    const userId = await ensureUserId();
    if (!userId) {
      toast({ description: "You must be signed in to rename a chat." });
      return;
    }
    const trimmed = newChatTitle.trim();
    const url = `${API_BASE.replace(/\/$/, "")}/api/v1/conversations/${encodeURIComponent(editingChatId)}/rename`;
    const headers = buildHeaders({ json: true, userId });
    console.info("[confirmRenameChat] PATCH", url, headers);
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers,
        credentials: "include", // send cookies if any
        body: JSON.stringify({ title: trimmed }),
      });
      console.info("[confirmRenameChat] status", resp.status);
      if (!resp.ok) {
        const txt = await readResponseText(resp);
        console.error("[confirmRenameChat] server error:", resp.status, txt);
        toast({ description: `Rename failed: ${resp.status}. See console.` });
        return;
      }
      // success: update UI
      setConversation(prev => prev.map(c => c.id === editingChatId ? { ...c, title: trimmed } : c));
      setEditingChatId(null);
      setNewChatTitle("");
      toast({ description: "Chat renamed." });
    } catch (e) {
      console.error("confirmRenameChat error:", e);
      toast({ description: "Network error: could not rename chat." });
    }
  }, [editingChatId, newChatTitle, toast]);
  const handleDeleteChat = useCallback(async (chatId: string, hardDelete = false) => {
    if (!confirm("Are you sure you want to delete this chat? This cannot be undone.")) return;
    const userId = await ensureUserId();
    if (!userId) {
      toast({ description: "You must be signed in to delete a chat." });
      return;
    }
    const url = `${API_BASE.replace(/\/$/, "")}/api/v1/conversations/${encodeURIComponent(chatId)}${hardDelete ? "?hard=true" : ""}`;
    const headers = buildHeaders({ userId });
    console.info("[handleDeleteChat] DELETE", url, headers);
    try {
      const resp = await fetch(url, {
        method: "DELETE",
        headers,
        credentials: "include",
      });
      console.info("[handleDeleteChat] status", resp.status);
      if (!resp.ok) {
        const txt = await readResponseText(resp);
        console.error("[handleDeleteChat] server error:", resp.status, txt);
        try {
          const parsed = JSON.parse(txt);
          if (parsed?.error === "missing_user_id_header") {
            toast({ description: "Delete failed: missing user identity. Sign in and try again." });
            return;
          }
        } catch (_) { }
        toast({ description: `Delete failed: ${resp.status}. See console.` });
        return;
      }
      // success â€” update UI
      setConversation(prev => {
        const newConv = prev.filter(c => c.id !== chatId);
        if (activeId === chatId) setActiveId(newConv.length > 0 ? newConv[0].id : null);
        return newConv;
      });
      toast({ description: "Chat deleted." });
    } catch (e) {
      console.error("handleDeleteChat error:", e);
      toast({ description: "Network error: could not delete chat." });
    }
  }, [activeId, toast]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter") {
        e.preventDefault();
        handleGenerate();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "m") {
        e.preventDefault();
        toggleMic();
      }
      if (e.key === "?") {
        e.preventDefault();
        setShowHelp((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isListening, prompt, template, theme]);
  // Always start with a fresh/new chat view when page opens (but keep existing chats in sidebar)
  useEffect(() => {
    // Only reset the active selection to show "new chat" view
    // Don't clear conversations - they will be loaded from backend
    setActiveId(null);
    setPrompt("");
  }, []);

  // Onboarding tooltips - show on first visit or when no active session
  useEffect(() => {
    // Check if user has seen onboarding before (in this session)
    const hasSeenOnboarding = sessionStorage.getItem('chat_onboarding_seen');

    if (!hasSeenOnboarding && !activeSessionId) {
      // Start showing button tooltips after a short delay
      const timer = setTimeout(() => {
        setShowOnboardingTooltips(true);
        setShowControlsTooltip(true);
        setShowMediaTooltip(true);

        // Hide button tooltips after 7 seconds
        setTimeout(() => {
          setShowControlsTooltip(false);
          setShowMediaTooltip(false);
        }, 7000);

        // Mark as seen
        sessionStorage.setItem('chat_onboarding_seen', 'true');
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [activeSessionId]);

  // Track if prompt has already been generated to avoid duplicates
  const promptGeneratedRef = useRef(false);

  // Auto-generate prompt suggestion on page load - ONLY ONCE per session
  useEffect(() => {
    // Skip if already generated or if there's an active session
    if (promptGeneratedRef.current || activeSessionId) return;

    // Hide suggestion if user starts typing
    if (prompt.trim()) {
      setShowPromptSuggestion(false);
      return;
    }

    const generateInitialPrompt = async () => {
      // Get workspace data
      const workspaceData = workspaceDetails || workspaceInfo || {};
      const businessName = workspaceData.business_name || workspaceData.name || '';

      // Check if workspace is still loading (no meaningful data yet)
      const isWorkspaceLoaded = businessName && businessName.length > 0;

      if (!isWorkspaceLoaded) {
        // Show loading state while workspace is loading
        setIsLoadingSuggestion(true);
        return;
      }

      // Mark as generated to prevent duplicates
      promptGeneratedRef.current = true;
      setIsLoadingSuggestion(true);

      try {
        const industry = workspaceData.industry || '';
        const usp = workspaceData.usp || workspaceData.unique_selling_point || '';
        const targetAudience = workspaceData.target_audience || '';
        const brandTone = workspaceData.brand_tone || workspaceData.tone || '';
        const currentTemplate = template || 'post';

        // Create advanced, detailed prompt suggestions
        const advancedPrompts = [
          `Design a high-converting ${currentTemplate} for ${businessName}${industry ? ` (${industry})` : ''} that showcases ${usp || 'our unique value proposition'} with bold visuals, compelling copy, and a clear call-to-action${targetAudience ? ` targeting ${targetAudience}` : ''}. Use ${brandTone || 'professional yet engaging'} tone.`,

          `Create a scroll-stopping ${currentTemplate} campaign for ${businessName} featuring vibrant imagery, attention-grabbing headlines, and persuasive storytelling${usp ? ` highlighting: ${usp}` : ''}. Make it memorable, shareable, and optimized for social media engagement.`,

          `Generate a premium ${currentTemplate} design for ${businessName}${industry ? ` in the ${industry} space` : ''} with modern aesthetics, clean typography, and strategic messaging${usp ? ` emphasizing ${usp}` : ''}. Include a strong visual hierarchy and compelling value proposition.`,

          `Craft an engaging ${currentTemplate} for ${businessName} that tells our brand story, connects emotionally with viewers${targetAudience ? ` (${targetAudience})` : ''}, and drives action${usp ? `. Key message: ${usp}` : ''}. Use eye-catching colors and professional layout.`,
        ];

        // Pick a random advanced prompt
        const selectedPrompt = advancedPrompts[Math.floor(Math.random() * advancedPrompts.length)];

        // Show AFTER button tooltips disappear (7.5s delay to match 7s tooltip duration)
        setTimeout(() => {
          setSuggestedPrompt(selectedPrompt);
          setShowPromptSuggestion(true);
          setIsLoadingSuggestion(false);
        }, 7500);

      } catch (err) {
        console.error('Failed to generate prompt suggestion:', err);
        setIsLoadingSuggestion(false);
      }
    };

    generateInitialPrompt();
  }, [workspaceDetails, workspaceInfo, activeSessionId, prompt]);

  // Reset textarea height when prompt is cleared
  useEffect(() => {
    if (!prompt && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.overflowY = 'hidden';
    }
  }, [prompt]);

  // Auto-resize textarea when prompt is set programmatically (e.g., from suggested prompt)
  useEffect(() => {
    if (prompt && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const maxHeight = 96; // 4 lines * ~24px line height
      textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, [prompt]);

  // Close controls panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPanelsMobile) {
        const clickedInsideMobile = controlsPanelRef.current?.contains(event.target as Node);
        const clickedInsideDesktop = controlsPanelDesktopRef.current?.contains(event.target as Node);
        if (!clickedInsideMobile && !clickedInsideDesktop) {
          setShowPanelsMobile(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPanelsMobile]);

  // Removed auto-select of first chat - we want to always show new chat view on page load
  // Users can click on a chat in sidebar to view it
  useEffect(() => {
    const onBind = (e: Event) => {
      const anyEvt = e as CustomEvent<{ candidateId: string; uploadId: string }>;
      const detail = anyEvt?.detail;
      if (!detail?.candidateId || !detail?.uploadId) return;
      setBindings((prev) => {
        const current = prev[detail.candidateId] || [];
        if (current.includes(detail.uploadId)) return prev;
        return {
          ...prev,
          [detail.candidateId]: [...current, detail.uploadId]
        };
      });
    };
    window.addEventListener("bind-to-candidate", onBind as EventListener);
    return () => window.removeEventListener("bind-to-candidate", onBind as EventListener);
  }, []);
  const toggleMic = () => {
    if (!isSupported) {
      toast({ description: "Voice input is not supported in this browser." });
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };
  // ---------- CORE: handleGenerate ----------




  const includeCredentials = false;

  const performGenerate = useCallback(
    async (finalPrompt: string, finalUploads: UploadItem[]) => {
      console.log("Starting generation with prompt:", finalPrompt);
      console.log("Assets provided:", finalUploads.length);

      setIsGenerating(true);
      setSelected(new Set());

      const jobId = Date.now().toString();
      // Use existing session or create new one
      const sessionId = activeSessionId || jobId;

      const pending: ConversationItem = {
        id: jobId,
        sessionId: sessionId,
        prompt: finalPrompt,
        title:
          finalPrompt.slice(0, 50) +
          (finalPrompt.length > 50 ? "..." : ""),
        theme,
        template,
        candidates: [],
        createdAt: Date.now(),
        uploads: finalUploads, // Store uploads for regeneration
      };

      // Add to conversation
      setConversation((prev) => [pending, ...prev]);
      setActiveId(jobId);
      setActiveSessionId(sessionId);

      // clear prompt and reset voice transcript
      setPrompt("");
      try {
        resetTranscript();
      } catch { }

      try {
        // prepare workspace + prompt
        const currentWorkspaceId = workspaceId || workspaceInfo?.id || null;
        const currentUserId = user?.id || null;
        const workspaceData = workspaceDetails || workspaceInfo || {};

        let workspaceJson = "{}";
        try {
          workspaceJson = JSON.stringify(workspaceData);
        } catch (e) {
          workspaceJson = "{}";
        }

        const promptWithWorkspace = `${finalPrompt}\n\n---\nWorkspace Details (JSON):\n${workspaceJson}\n---\nPlease use the workspace context above when generating.`;

        // gather files/urls
        const localFiles = finalUploads
          .filter((u) => !!u.file)
          .map((u) => u.file as File);

        const remoteUrls = finalUploads
          .filter(
            (u) =>
              !u.file &&
              typeof u.url === "string" &&
              u.url.trim().length > 0
          )
          .map((u) => u.url.trim());

        const totalAssets = localFiles.length + remoteUrls.length;
        console.log("Total assets (local + remote):", totalAssets);

        const repairUrl = (candidate?: string | null) => {
          if (!candidate) return null;
          let s = candidate.trim();
          if (!s) return null;

          if (BACKEND_BASE) {
            try {
              const escapedBase = BACKEND_BASE.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
              );
              const regex = new RegExp(
                `^${escapedBase}/?(https?:\\/\\/.*)$`,
                "i"
              );
              const m = s.match(regex);
              if (m && m[1]) s = m[1];
            } catch (e) {
              /* ignore */
            }
          }
          return s;
        };

        // build FormData
        const fd = new FormData();
        fd.append("prompt", promptWithWorkspace);
        fd.append("template", template);
        // FIX: Send aspect ratio as a direct field
        fd.append("aspect_ratio", aspectRatio);

        if (theme) fd.append("theme", theme);

        // Send user_id and workspace_id for backend to save the generation
        if (currentUserId) fd.append("user_id", currentUserId.toString());
        if (currentWorkspaceId) fd.append("workspace_id", currentWorkspaceId.toString());

        // Send session_id so backend can group multiple prompts in same session
        fd.append("session_id", sessionId);

        // You can keep this for backward compatibility or remove it
        fd.append(
          "params",
          JSON.stringify({ num_candidates: 4, aspect_ratio: aspectRatio })
        );

        // ðŸ”  BLOCK 1: when user provided local/remote assets
        if (totalAssets > 0) {
          // attach local files
          localFiles.forEach((file, i) => {
            fd.append(
              "files[]",
              file,
              file.name || `image-${i + 1}.jpg`
            );
          });

          // attach remote URLs as file_uri + file_uri[] + image_urls[]
          remoteUrls.forEach((url) => {
            const repaired = repairUrl(url) || url;

            // main fields backend error hints at
            fd.append("file_uri", repaired);
            fd.append("file_uri[]", repaired);

            // keep this as extra; harmless and useful if backend reads it
            fd.append("image_urls[]", repaired);
          });

          console.log(
            "Calling /api/v1/generate-from-image with user assets (files[] + file_uri / image_urls[])"
          );
        } else {
          // ðŸ”  BLOCK 2: no explicit assets -> fallback to workspace logo
          let logoCandidate: string | null = null;

          // prefer workspaceData.logo_path
          if (
            workspaceData &&
            typeof (workspaceData as any).logo_path === "string" &&
            (workspaceData as any).logo_path.trim()
          ) {
            logoCandidate = (workspaceData as any).logo_path.trim();
          }

          // fallback to loaded workspace asset
          const workspaceLogoAsset = workspaceAssets.find(
            (a) => a.id === "workspace-logo"
          );
          if (!logoCandidate && workspaceLogoAsset?.url) {
            logoCandidate = workspaceLogoAsset.url;
          }

          if (logoCandidate) {
            let repaired = repairUrl(logoCandidate) || logoCandidate;

            // normalize to absolute URL
            if (repaired && repaired.startsWith("/") && BACKEND_BASE) {
              repaired = `${BACKEND_BASE}${repaired}`;
            }
            if (repaired && repaired.startsWith("//")) {
              repaired = window.location.protocol + repaired;
            }

            console.log(
              "No explicit assets provided â€” attaching workspace logo URL as file_uri / image_url:",
              repaired
            );

            // main fields backend likely checks
            fd.append("file_uri", repaired);
            fd.append("file_uri[]", repaired);

            // extra compatibility fields
            fd.append("image_url", repaired);
            fd.append("image_urls[]", repaired);
          } else {
            console.log(
              "No workspace logo found â€” sending request to /api/v1/generate-from-image without file_uri; backend may respond file_or_file_uri_required."
            );
          }
        }

        const url = buildBackendUrl("/api/v1/generate-from-image");
        console.log("[fetch] sending request to", url);

        const fetchOptions: RequestInit = {
          method: "POST",
          headers: {
            ...authHeaders, // do not set Content-Type for FormData
          },
          body: fd,
          ...(includeCredentials
            ? { credentials: "include" as RequestCredentials }
            : {}),
        };

        // single fetch â€” wait until resolved or network error thrown
        const res = await fetch(url, fetchOptions);
        console.log(
          "[fetch] got response status",
          res?.status,
          "for jobId",
          jobId
        );

        let rawText = "";
        try {
          rawText = await res.text();
        } catch (e) {
          console.warn("Could not read response text", e);
          rawText = "";
        }

        if (!res.ok) {
          const headersObj: Record<string, string> = {};
          try {
            res.headers.forEach(
              (v, k) => (headersObj[k] = v)
            );
          } catch (e) { }

          console.error(
            "generate-from-image returned non-OK:",
            res.status,
            { headers: headersObj, body: rawText }
          );

          const data = await clientMockGenerate({
            prompt: finalPrompt,
            template,
          });

          setConversation((prev) =>
            prev.map((it) =>
              it.id === jobId
                ? {
                  ...it,
                  candidates: data
                    .candidates as Candidate[],
                }
                : it
            )
          );

          toast({
            description:
              "Backend returned error; using mock results.",
          });
          setIsGenerating(false);
          return;
        }

        // parse JSON safely
        let json: any = {};
        try {
          json = rawText ? JSON.parse(rawText) : {};
        } catch (e) {
          console.warn(
            "Failed to parse JSON from backend; raw text:",
            rawText
          );
          json = {};
        }

        const candidates: Candidate[] =
          mapBackendResultsToCandidates(json);

        setConversation((prev) =>
          prev.map((it) =>
            it.id === jobId
              ? { ...it, candidates }
              : it
          )
        );

        toast({ description: "Generated candidates." });
        setGenerationCount(prev => prev + 1);
        // Trigger 10-second highlight animation
        setShowUploadHighlight(true);
        setTimeout(() => setShowUploadHighlight(false), 10000);
      } catch (err: any) {
        console.error("performGenerate error:", err);

        const data = await clientMockGenerate({
          prompt: finalPrompt,
          template,
        });

        setConversation((prev) =>
          prev.map((it) =>
            it.id === jobId
              ? {
                ...it,
                candidates: data
                  .candidates as Candidate[],
              }
              : it
          )
        );

        toast({
          description:
            "Network error while contacting backend; used mock results. See console for details.",
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [
      theme,
      template,
      aspectRatio,
      toast,
      resetTranscript,
      user,
      workspaceId,
      workspaceInfo,
      workspaceDetails,
      authHeaders,
      workspaceAssets,
      activeSessionId,
    ]
  );

  // Validate which images are still live (not expired/deleted)
  // Validate images using Image element (bypasses CORS restrictions)
  const validateAssets = useCallback(async (assets: UploadItem[]): Promise<UploadItem[]> => {
    const validAssets: UploadItem[] = [];
    
    // Check each asset in parallel using Image elements (no CORS issues)
    const results = await Promise.allSettled(
      assets.map((asset) => {
        return new Promise<{ asset: UploadItem; isValid: boolean }>((resolve) => {
          const img = new Image();
          const timeoutId = setTimeout(() => {
            img.src = ''; // Cancel loading
            resolve({ asset, isValid: false });
          }, 3000); // 3 second timeout for faster response
          
          img.onload = () => {
            clearTimeout(timeoutId);
            resolve({ asset, isValid: true });
          };
          
          img.onerror = () => {
            clearTimeout(timeoutId);
            resolve({ asset, isValid: false });
          };
          
          img.src = asset.url;
        });
      })
    );
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.isValid) {
        validAssets.push(result.value.asset);
      }
    });
    
    return validAssets;
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast({ description: "Please enter a prompt." });
      return;
    }
    const finalPrompt = prompt;
    const finalUploads = uploads;
    if (isWorkspaceMode && workspaceDetails && (uploads.length > 0 || workspaceAssets.length > 0)) {
      setSelectedAssetsForGeneration(new Set());
      
      // Show dialog immediately with loading state, validate in background
      const allAssets = [...uploads, ...workspaceAssets];
      setValidatedAssets([]); // Clear previous
      setIsValidatingAssets(true);
      setShowAssetSelectionDialog(true); // Show dialog immediately
      
      // Validate assets in background
      const liveAssets = await validateAssets(allAssets);
      setValidatedAssets(liveAssets);
      setIsValidatingAssets(false);
      
      if (liveAssets.length === 0) {
        toast({ description: "No valid assets found. All images may have expired. Generating without assets..." });
        setShowAssetSelectionDialog(false);
        await performGenerate(finalPrompt, []);
        return;
      }
      
      return;
    }
    await performGenerate(finalPrompt, finalUploads);
  }, [prompt, theme, template, aspectRatio, uploads, toast, resetTranscript, isWorkspaceMode, workspaceDetails, workspaceAssets, performGenerate, validateAssets]);

  const handleConfirmAssets = async () => {
    const finalPrompt = prompt;
    // Use validated assets (only live images) instead of all assets
    const finalUploads = validatedAssets.filter(u => selectedAssetsForGeneration.has(u.id));
    setShowAssetSelectionDialog(false);
    await performGenerate(finalPrompt, finalUploads);
  };

  const generateFromImageFor = useCallback(
    async (cand: Candidate, captionOverride?: string, overrideUploads?: string[]) => {
      setIsRefining(true);
      const candidateUploads = overrideUploads ?? (bindings[cand.id] || []);
      const templateForEdit = cand.type as TemplateKind;
      const promptForEdit =
        captionOverride ??
        (cand.type === "post"
          ? (cand as PostCandidate).caption ?? ""
          : (cand as CarouselCandidate).slides.map((s) => s.caption).filter(Boolean).join("; "));
      console.log("Refining with prompt:", promptForEdit);

      try {
        // Resolve candidateUploads into three buckets:
        //  - localFiles: File objects we can attach
        //  - uploadIds: ids like "uploaded_..." that do NOT map to local Files (server-side asset refs)
        //  - remoteUrls: http/https strings
        const localFiles: File[] = [];
        const uploadIds: string[] = [];
        const remoteUrls: string[] = [];

        for (const item of candidateUploads || []) {
          if (!item || typeof item !== "string") continue;
          if (item.startsWith("http://") || item.startsWith("https://")) {
            remoteUrls.push(item);
            continue;
          }
          // try to find a local File in uploads state for this id
          const found = uploads.find((u) => u.id === item && u.file);
          if (found && found.file) {
            localFiles.push(found.file as File);
          } else {
            // treat as server-side asset
            uploadIds.push(item);
          }
        }

        console.log("Resolved assets â€” localFiles:", localFiles.length, "remoteUrls:", remoteUrls.length, "uploadIds:", uploadIds.length);

        // Build initial FormData with core fields
        const fd = new FormData();
        fd.append("prompt", promptForEdit || "");
        fd.append("template", templateForEdit);
        fd.append(
          "params",
          JSON.stringify({
            num_candidates: 2,
            ...(typeof aspectRatio !== "undefined" ? { aspect_ratio: aspectRatio } : {}),
          })
        );
        const currentUserId = user?.id || null;
        const currentWorkspaceId = workspaceId || workspaceInfo?.id || null;
        if (currentUserId) fd.append("user_id", currentUserId.toString());
        if (currentWorkspaceId) fd.append("workspace_id", currentWorkspaceId);
        // Send session_id so backend can group multiple prompts in same session
        if (activeSessionId) fd.append("session_id", activeSessionId);
        fd.append("workspace_details", JSON.stringify(workspaceDetails || workspaceInfo || {}));
        fd.append("edit_only", "1");

        // Attach any local files first
        let attachedFileCount = 0;
        localFiles.forEach((file, i) => {
          // append as files[] because even a single file is often accepted under files[]
          fd.append("files[]", file, file.name || `image-${i + 1}.jpg`);
          attachedFileCount++;
        });

        // For uploadIds (server-side asset references), append them as uploaded_files[] only if there is no local file mapped
        // We already separated uploadIds to mean "no local file found".
        if (uploadIds.length > 0) {
          uploadIds.forEach((id) => fd.append("uploaded_files[]", id));
        }

        // Try to fetch remote URLs and attach as files. If fetch fails for a URL, keep it in fallbackImageUrls
        const fallbackImageUrls: string[] = [];
        for (let i = 0; i < remoteUrls.length; i++) {
          const url = remoteUrls[i];
          try {
            const fetchRes = await fetch(url);
            if (!fetchRes.ok) throw new Error(`fetch ${url} returned ${fetchRes.status}`);
            const blob = await fetchRes.blob();
            const segs = new URL(url).pathname.split("/");
            const nameHint = segs.filter(Boolean).pop() || `remote-${i + 1}.jpg`;
            const fileLike = new File([blob], nameHint, { type: blob.type || "application/octet-stream" });
            fd.append("files[]", fileLike, nameHint);
            attachedFileCount++;
          } catch (fetchErr) {
            console.warn("Could not fetch remote image to attach as file; will send URL as fallback:", url, fetchErr);
            fallbackImageUrls.push(url);
          }
        }

        // If we didn't attach any files but we have fallbackImageUrls, append them as image_url(s)
        if (attachedFileCount === 0 && fallbackImageUrls.length > 0) {
          if (fallbackImageUrls.length === 1) {
            fd.append("image_url", fallbackImageUrls[0]);
          } else {
            fallbackImageUrls.forEach((u) => fd.append("image_urls[]", u));
          }
        } else if (attachedFileCount > 0 && fallbackImageUrls.length > 0) {
          // We attached files AND have fallback urls â€” include them as image_urls[] as well
          fallbackImageUrls.forEach((u) => fd.append("image_urls[]", u));
        }

        // Now compute final attachments heuristic (files attached + fallback urls + upload ids)
        // We interpret uploadIds as server-side assets that count toward the asset count
        const finalFilesAttached = Array.from(fd.entries()).filter(([k]) => k === "files[]").length;
        const finalImageUrls = Array.from(fd.entries()).filter(([k]) => k === "image_urls[]" || k === "image_url").length;
        const finalUploadedIds = Array.from(fd.entries()).filter(([k]) => k === "uploaded_files[]" || k === "uploaded_files").length;
        const finalAssetCount = finalFilesAttached + finalImageUrls + finalUploadedIds;

        console.log("FormData counts -> files[]:", finalFilesAttached, "image_urls:", finalImageUrls, "uploaded_ids:", finalUploadedIds, "totalAssets:", finalAssetCount);

        // Debug: enumerate FormData entries (shows File objects and strings)
        for (const entry of fd.entries()) {
          const [k, v] = entry;
          if (v instanceof File) {
            console.log("FormData ->", k, "File:", v.name, v.size, v.type);
          } else {
            console.log("FormData ->", k, v);
          }
        }

        // Ensure prompt present
        if (!promptForEdit || promptForEdit.trim().length === 0) {
          throw new Error("prompt_required");
        }

        // If server requires at least one asset, abort early to avoid 400
        if (finalAssetCount === 0) {
          // decide whether to attach workspace logo here or bail â€” keeping previous behavior minimal:
          throw new Error("file_or_image_url_required");
        }

        // Choose endpoint based on actual attachments
        const endpoint = finalAssetCount > 1 ? "/api/v1/generate-from-images" : "/api/v1/generate-from-image";
        const url = buildBackendUrl(endpoint);
        console.log("Calling endpoint for refine:", endpoint);

        const fetchOptions: RequestInit = {
          method: "POST",
          headers: { ...authHeaders }, // do not set Content-Type for FormData
          body: fd,
          ...(includeCredentials ? { credentials: "include" as RequestCredentials } : {}),
        };

        const res = await fetch(url, fetchOptions);
        console.log("Refine response status:", res?.status);
        let rawText = "";
        try {
          rawText = await res.text();
        } catch (e) {
          console.warn("Could not read refine response text", e);
        }

        if (!res.ok) {
          console.error("generate-with-image failed:", res.status, rawText);
          const data = await clientMockGenerate({ prompt: promptForEdit, template: templateForEdit });
          const newId = "edit-" + Date.now().toString();
          const newConv: ConversationItem = {
            id: newId,
            sessionId: activeSessionId || newId,
            prompt: promptForEdit,
            title: promptForEdit.slice(0, 50) + (promptForEdit.length > 50 ? "..." : ""),
            theme,
            template: templateForEdit,
            candidates: data.candidates as Candidate[],
            createdAt: Date.now(),
          };
          setConversation((prev) => [newConv, ...prev]);
          toast({ description: "Generate-with-image failed; used mock." });
          return;
        }

        // parse JSON safely
        let json: any = {};
        try {
          json = rawText ? JSON.parse(rawText) : {};
        } catch (e) {
          console.warn("Failed to parse refine JSON; rawText:", rawText);
          json = {};
        }

        const candidates: Candidate[] = mapBackendResultsToCandidates(json);
        const newId2 = "edit-" + Date.now().toString();
        const newConv: ConversationItem = {
          id: newId2,
          sessionId: activeSessionId || newId2,
          prompt: promptForEdit,
          title: promptForEdit.slice(0, 50) + (promptForEdit.length > 50 ? "..." : ""),
          theme,
          template: templateForEdit,
          candidates,
          createdAt: Date.now(),
        };
        setConversation((prev) => [newConv, ...prev]);
        toast({ description: "Generated from image." });
      } catch (err: any) {
        console.error("generateFromImageFor caught:", err);
        // Provide specific toasts for helpful debugging
        if (err.message === "prompt_required") {
          toast({ description: "Cannot refine: prompt is empty." });
        } else if (err.message === "file_or_image_url_required") {
          toast({ description: "Cannot refine: no file or image URL provided." });
        } else {
          // fallback to mock generate
          try {
            const data = await clientMockGenerate({ prompt: promptForEdit, template: templateForEdit ?? "post" });
            const newId3 = "edit-" + Date.now().toString();
            const newConv: ConversationItem = {
              id: newId3,
              sessionId: activeSessionId || newId3,
              prompt: promptForEdit,
              title: promptForEdit.slice(0, 50) + (promptForEdit.length > 50 ? "..." : ""),
              theme,
              template: templateForEdit ?? "post",
              candidates: data.candidates as Candidate[],
              createdAt: Date.now(),
            };
            setConversation((prev) => [newConv, ...prev]);
            toast({ description: "An error occurred; used mock results." });
          } catch (mockErr) {
            console.error("Mock generate also failed:", mockErr);
            toast({ description: "An error occurred while refining." });
          }
        }
      } finally {
        setIsRefining(false);
      }
    },
    [theme, aspectRatio, toast, user, workspaceId, workspaceInfo, workspaceDetails, authHeaders, bindings, uploads, activeSessionId]
  );
  // ---------- Upload handling ----------
  const onAttachFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const items: UploadItem[] = Array.from(files).map((f) => ({
      id: `uploaded_${crypto.randomUUID().slice(0, 8)}`,
      url: URL.createObjectURL(f),
      name: f.name,
      size: f.size,
      type: f.type,
      file: f
    }));
    setUploads((prev) => [...prev, ...items]);
    const imageCount = items.filter(i => i.type?.startsWith('image/')).length;
    const videoCount = items.filter(i => i.type?.startsWith('video/')).length;
    const parts = [];
    if (imageCount > 0) parts.push(`${imageCount} image${imageCount > 1 ? 's' : ''}`);
    if (videoCount > 0) parts.push(`${videoCount} video${videoCount > 1 ? 's' : ''}`);
    toast({ description: `${parts.join(' and ')} attached.` });
    if (attachInputRef.current) attachInputRef.current.value = "";
  }, [toast]);
  const removeUpload = useCallback((uploadId: string) => {
    setUploads((prev) => {
      const found = prev.find((u) => u.id === uploadId);
      try {
        if (found?.url && (found.url.startsWith("blob:") || found.url.startsWith("blob"))) {
          URL.revokeObjectURL(found.url);
        }
      } catch (err) {
        /* ignore */
      }
      return prev.filter((u) => u.id !== uploadId);
    });
    setBindings((prev) => {
      const next: Record<string, string[]> = {};
      Object.entries(prev).forEach(([candId, arr]) => {
        const filtered = arr.filter((id) => id !== uploadId);
        if (filtered.length > 0) next[candId] = filtered;
      });
      return next;
    });
    setEditBoundUploads((prev) => prev.filter((id) => id !== uploadId));
    toast({ description: "Attachment removed." });
  }, [toast]);
  const unbindFromCandidate = useCallback((candidateId: string, uploadId: string) => {
    setBindings((prev) => {
      const copy = { ...prev };
      const arr = (copy[candidateId] || []).filter((id) => id !== uploadId);
      if (arr.length === 0) delete copy[candidateId];
      else copy[candidateId] = arr;
      return copy;
    });
    toast({ description: "Removed bound asset from candidate." });
  }, [toast]);
  const visibleGroups = useMemo(() => {
    if (!activeSessionId) return [];
    return conversation
      .filter((g) => g.sessionId === activeSessionId)
      .sort((a, b) => a.createdAt - b.createdAt); // Show oldest first (chronological order)
  }, [conversation, activeSessionId]);
  const allCandidates = useMemo(() => conversation.flatMap((g) => g.candidates).filter((c) => !(typeof c.id === "string" && c.id.startsWith("mock-"))), [conversation]);
  const toggleSelect = useCallback((id: string) => setSelected((prev) => {
    const ns = new Set(prev);
    if (ns.has(id)) {
      ns.delete(id);
    } else {
      ns.add(id);
    }
    return ns;
  }), []);
  const openEditDialogFor = useCallback((cand: Candidate) => {
    setEditCandidate(cand);
    const defaultPrompt = cand.type === "post" ? (cand as PostCandidate).caption ?? "" : (cand as CarouselCandidate).slides.map((s) => s.caption ?? "").join("; ");
    setEditPrompt(defaultPrompt);
    const existing = bindings[cand.id] || [];
    setEditBoundUploads(existing);
    setShowEditDialog(true);
  }, [bindings]);
  const getCandidateMainUrlById = useCallback((candId: string) => {
    const c = conversation.flatMap(g => g.candidates).find((c) => c.id === candId);
    if (!c) return "";
    const mainHint = c.type === "post" ? (c as PostCandidate).image_hints?.[0] ?? "" : (c as CarouselCandidate).slides?.[0]?.image_hint ?? "";
    return resolveHintToUrl ? resolveHintToUrl(mainHint ?? "", c.type === "post" ? "post" : "slide", uploads) : (mainHint || "");
  }, [conversation, uploads]);
  const handleRefineFromDialog = useCallback(async () => {
    if (!editCandidate) return;
    if (!editPrompt.trim()) {
      toast({ description: "Please enter a refine prompt." });
      return;
    }
    const finalUploads = editBoundUploads.map((id) => {
      if (typeof id === "string" && id.startsWith("candidate-")) {
        const parts = id.split("-");
        const candId = parts.slice(1, parts.length - (parts.length > 2 ? 1 : 0)).join("-");
        const resolved = getCandidateMainUrlById(candId || id.replace(/^candidate-/, ""));
        return resolved;
      }
      return id;
    }).filter(Boolean);
    if (finalUploads.length === 0) {
      toast({ description: "Please add at least one asset to refine from." });
      return;
    }
    setBindings((prev) => ({ ...prev, [editCandidate.id]: [...editBoundUploads] }));
    setShowEditDialog(false);
    await generateFromImageFor(editCandidate, editPrompt, finalUploads);
  }, [editCandidate, editBoundUploads, editPrompt, generateFromImageFor, getCandidateMainUrlById, toast]);

  // ---------- Image Edit Handler ----------
  const openImageEditDialog = useCallback((imageUrl: string, candidate: Candidate | null) => {
    setImageToEdit({ url: imageUrl, candidate });
    setEditInstructions("");
    setEditedImageResult(null);
    setShowImageEditDialog(true);
  }, []);

  const handleEditImage = useCallback(async () => {
    if (!imageToEdit?.url || !editInstructions.trim()) {
      toast({ description: "Please enter edit instructions." });
      return;
    }

    setIsEditingImage(true);
    setEditedImageResult(null);

    try {
      const currentUserId = user?.id || null;
      const currentWorkspaceId = workspaceId || workspaceInfo?.id || null;

      // Try multiple approaches - first JSON, then FormData with file
      let res: Response | null = null;
      let lastError = "";

      // Approach 1: Try JSON payload first (as per backend docs)
      try {
        const jsonPayload = {
          file_uri: imageToEdit.url,
          instructions: editInstructions,
          prompt: editInstructions,
          edit_instructions: editInstructions,
          user_id: currentUserId,
          workspace_id: currentWorkspaceId,
          aspect_ratio: aspectRatio,
        };

        console.log("[handleEditImage] Trying JSON approach to /api/v1/edit-image");
        const jsonRes = await fetch(buildBackendUrl("/api/v1/edit-image"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify(jsonPayload),
        });

        if (jsonRes.ok) {
          res = jsonRes;
        } else {
          lastError = `edit-image JSON: ${jsonRes.status}`;
          console.warn("[handleEditImage] JSON approach failed:", jsonRes.status);
        }
      } catch (err) {
        console.warn("[handleEditImage] JSON approach error:", err);
        lastError = `edit-image JSON: ${err}`;
      }

      // Approach 2: Try /api/v1/edit-image2 with JSON
      if (!res || !res.ok) {
        try {
          const jsonPayload2 = {
            file_uri: imageToEdit.url,
            edit_instructions: editInstructions,
            prompt: editInstructions,
            user_id: currentUserId,
            workspace_id: currentWorkspaceId,
          };

          console.log("[handleEditImage] Trying JSON approach to /api/v1/edit-image2");
          const jsonRes2 = await fetch(buildBackendUrl("/api/v1/edit-image2"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...authHeaders,
            },
            body: JSON.stringify(jsonPayload2),
          });

          if (jsonRes2.ok) {
            res = jsonRes2;
          } else {
            lastError = `edit-image2 JSON: ${jsonRes2.status}`;
            console.warn("[handleEditImage] edit-image2 JSON failed:", jsonRes2.status);
          }
        } catch (err) {
          console.warn("[handleEditImage] edit-image2 error:", err);
          lastError = `edit-image2: ${err}`;
        }
      }

      // Approach 3: Try FormData with fetched file to /api/v1/generate-from-image
      if (!res || !res.ok) {
        try {
          console.log("[handleEditImage] Trying FormData approach to /api/v1/generate-from-image");

          // Try to fetch the image first
          let imageBlob: Blob | null = null;
          try {
            const imgResponse = await fetch(imageToEdit.url, { mode: 'cors' });
            if (imgResponse.ok) {
              imageBlob = await imgResponse.blob();
            }
          } catch (fetchErr) {
            console.warn("Could not fetch image blob:", fetchErr);
          }

          const fd = new FormData();

          if (imageBlob) {
            const file = new File([imageBlob], 'image-to-edit.png', { type: imageBlob.type || 'image/png' });
            fd.append("files[]", file);
          } else {
            fd.append("image_url", imageToEdit.url);
            fd.append("image_urls[]", imageToEdit.url);
          }

          fd.append("prompt", editInstructions);
          if (currentUserId) fd.append("user_id", currentUserId.toString());
          if (currentWorkspaceId) fd.append("workspace_id", currentWorkspaceId.toString());
          fd.append("aspect_ratio", aspectRatio);
          fd.append("edit_only", "1");
          fd.append("params", JSON.stringify({ num_candidates: 1, aspect_ratio: aspectRatio }));

          const fdRes = await fetch(buildBackendUrl("/api/v1/generate-from-image"), {
            method: "POST",
            headers: { ...authHeaders },
            body: fd,
          });

          if (fdRes.ok) {
            res = fdRes;
          } else {
            lastError = `generate-from-image FormData: ${fdRes.status}`;
            console.warn("[handleEditImage] FormData approach failed:", fdRes.status);
          }
        } catch (err) {
          console.warn("[handleEditImage] FormData approach error:", err);
          lastError = `generate-from-image: ${err}`;
        }
      }

      // Check if any approach succeeded
      if (!res || !res.ok) {
        const errText = res ? await res.text().catch(() => "") : "";
        console.error("All edit image approaches failed. Last error:", lastError, errText);
        toast({
          description: `Edit failed. The backend may not support this feature yet. (${lastError})`,
        });
        return;
      }

      const json = await res.json();
      console.log("[handleEditImage] Success response:", json);

      // Extract the edited image URL from response
      let editedUrl = json?.url || json?.image_url || json?.result?.url || json?.result?.image_url || json?.edited_url;

      // Check in results array
      if (!editedUrl && Array.isArray(json?.results) && json.results.length > 0) {
        const firstResult = json.results[0];
        editedUrl = firstResult?.url || firstResult?.image_url ||
          (firstResult?.urls && firstResult.urls[0]) ||
          (firstResult?.image_hints && firstResult.image_hints[0]);
      }

      // Check in urls array
      if (!editedUrl && Array.isArray(json?.urls) && json.urls.length > 0) {
        editedUrl = json.urls[0];
      }

      // Check in files array
      if (!editedUrl && Array.isArray(json?.files) && json.files.length > 0) {
        editedUrl = json.files[0];
      }

      if (editedUrl) {
        // Resolve URL if needed
        if (!editedUrl.startsWith("http") && BACKEND_BASE) {
          editedUrl = `${BACKEND_BASE}${editedUrl.startsWith('/') ? '' : '/outputs/'}${editedUrl}`;
        }
        setEditedImageResult(editedUrl);
        toast({ description: "Image edited successfully!" });

        // Add the edited image as a new candidate in the conversation
        const newCandidateId = `edited-${Date.now()}`;
        const newCandidate: PostCandidate = {
          id: newCandidateId,
          type: "post",
          caption: editInstructions,
          image_hints: [editedUrl],
        };

        const newConvItem: ConversationItem = {
          id: `edit-conv-${Date.now()}`,
          sessionId: activeSessionId || `edit-session-${Date.now()}`,
          prompt: `Edit: ${editInstructions}`,
          title: `Edited: ${editInstructions.slice(0, 30)}...`,
          theme,
          template: "post",
          candidates: [newCandidate],
          createdAt: Date.now(),
        };

        setConversation(prev => [newConvItem, ...prev]);
        if (!activeSessionId) {
          setActiveSessionId(newConvItem.sessionId);
        }
        setActiveId(newConvItem.id);
      } else {
        console.warn("No image URL found in response:", json);
        toast({ description: "Edit completed but no image URL in response." });
      }
    } catch (err: any) {
      console.error("handleEditImage error:", err);
      toast({ description: err.message || "Failed to edit image." });
    } finally {
      setIsEditingImage(false);
    }
  }, [imageToEdit, editInstructions, user, workspaceId, workspaceInfo, aspectRatio, authHeaders, toast, theme, activeSessionId]);

  const isUrlSaved = useCallback((url: string) => {
    return !!savedByUrl[url];
  }, [savedByUrl]);
  // ---------- MODIFIED: saveImage (ENHANCED DEBUG + WORKSPACE SAVE + localStorage) ----------
  const saveImage = useCallback(async (url: string) => {
    console.log('ðŸ’¾ [DEBUG] saveImage STARTED for URL:', url);
    if (!url) {
      console.log('â Œ [DEBUG] No URL provided - ABORTING');
      return null;
    }
    if (isUrlSaved(url)) {
      console.log('â„¹ï¸  [DEBUG] Image already saved:', savedByUrl[url].id);
      try {
        addToLocalSavedImages({ id: savedByUrl[url].id, url });
      } catch { }
      return savedByUrl[url].id;
    }
    console.log('ðŸ’¾ [DEBUG] Saving workspace data before image save...');
    await saveWorkspaceData();
    const currentUserId = user?.id || null;
    const currentWorkspaceId = workspaceId || workspaceInfo?.id || null;
    try {
      const res = await fetch(buildBackendUrl("/api/v1/save-image"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify({
          url,
          user_id: currentUserId,
          workspace_id: currentWorkspaceId,
          workspace: workspaceDetails || workspaceInfo,
          expires_at: new Date(Date.now() + IMAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
          expiry_days: IMAGE_EXPIRY_DAYS,
        }),
      });
      console.log('ðŸ’¾ [DEBUG] Save response status:', res.status);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error('â Œ [DEBUG] Save failed:', res.status, txt);
        toast({ description: `Save failed: ${res.status}` });
        return null;
      }
      const j = await res.json();
      console.log('âœ… [DEBUG] Save success response:', j);
      if (j?.success && j?.id) {
        setSavedByUrl((prev) => ({ ...prev, [url]: { id: j.id, url } }));
        try {
          addToLocalSavedImages({ id: j.id, url });
        } catch (err) {
          console.warn(err);
        }
        toast({ description: `Image saved! Will expire in ${IMAGE_EXPIRY_DAYS} days unless saved permanently.` });
        return j.id;
      } else {
        console.error('â Œ [DEBUG] Save invalid response:', j);
        toast({ description: "Save failed." });
        return null;
      }
    } catch (err) {
      console.error('ðŸ”Œ [DEBUG] saveImage network error:', err);
      toast({ description: "Save failed (network)." });
      return null;
    }
  }, [isUrlSaved, savedByUrl, toast, user, workspaceId, workspaceInfo, workspaceDetails, authHeaders, saveWorkspaceData]);
  const saveMultipleUrls = useCallback(async (urls: string[]) => {
    for (const u of urls) {
      await saveImage(u);
    }
    setAssetsToSave(new Set());
  }, [saveImage]);
  const onToggleAssetToSave = useCallback((url: string) => {
    setAssetsToSave((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }, []);
  const openPostDialogForSaved = useCallback((savedId: string, url: string) => {
    setPostImage({ id: savedId, url });
    setPostPlatforms([]);
    setShowPostDialog(true);
  }, []);
  const doPostSavedImage = useCallback(async () => {
    console.log('ðŸ“¤ [DEBUG] doPostSavedImage STARTED');
    console.log('ðŸ–¼ï¸  [DEBUG] Post image:', postImage);
    console.log('ðŸŒ  [DEBUG] Platforms:', postPlatforms);
    if (!postImage) {
      console.log('â Œ [DEBUG] No post image - ABORTING');
      return;
    }
    console.log('ðŸ’¾ [DEBUG] Saving workspace data before posting...');
    await saveWorkspaceData();
    const currentUserId = user?.id || null;
    const currentWorkspaceId = workspaceId || workspaceInfo?.id || null;
    try {
      const res = await fetch(buildBackendUrl("/api/v1/post-image"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify({
          image_id: postImage.id,
          platforms: postPlatforms,
          user_id: currentUserId,
          workspace_id: currentWorkspaceId,
          workspace: workspaceDetails || workspaceInfo
        }),
      });
      console.log('ðŸ“¤ [DEBUG] Post response status:', res.status);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error('â Œ [DEBUG] Post failed:', res.status, txt);
        toast({ description: `Post failed: ${res.status}` });
        return;
      }
      const j = await res.json();
      console.log('âœ… [DEBUG] Post success response:', j);
      if (j?.success) {
        console.log('ðŸŽ‰ [DEBUG] Post COMPLETED successfully to platforms:', postPlatforms);
        toast({ description: "Posted to selected platforms." });
        setShowPostDialog(false);
      } else {
        console.error('â Œ [DEBUG] Post invalid response:', j);
        toast({ description: "Post failed." });
      }
    } catch (err) {
      console.error('ðŸ”Œ [DEBUG] doPostSavedImage network error:', err);
      toast({ description: "Post failed (network)." });
    }
    console.log('ðŸš€ [DEBUG] doPostSavedImage COMPLETED');
  }, [postImage, postPlatforms, toast, user, workspaceId, workspaceInfo, workspaceDetails, authHeaders, saveWorkspaceData]);

  // ---------- FIXED: handlePostSelected ----------
  const handlePostSelected = useCallback(async () => {
    console.log('ðŸš€ [DEBUG] handlePostSelected STARTED');
    if (selected.size === 0) {
      console.log('â Œ [DEBUG] No images selected. ABORTING.');
      toast({ description: "Please select one or more images to continue." });
      return;
    }
    console.log(`ðŸ”§ [DEBUG] ${selected.size} images selected.`);

    console.log('ðŸ’¾ [DEBUG] Step 1: Saving workspace data...');
    await saveWorkspaceData();

    // Flatten all candidates from all visible groups to find the selected ones
    const allVisibleCandidates = visibleGroups.flatMap(g => g.candidates);
    const selectedCands = allVisibleCandidates.filter(c => selected.has(c.id));

    console.log('ðŸ”§ [DEBUG] Found selected candidates:', selectedCands.length, selectedCands.map(c => c.id));

    if (selectedCands.length === 0) {
      console.error('â Œ [DEBUG] Mismatch: Selected IDs do not match any visible candidates. ABORTING.');
      toast({ description: "Could not find selected images. Please try again." });
      return;
    }

    const imageUrls = selectedCands.map(cand => {
      const mainHint = cand.type === "post" ? cand.image_hints?.[0] : cand.slides?.[0]?.image_hint;
      return resolveHintToUrl(mainHint ?? "", cand.type === "post" ? "post" : "slide", uploads);
    }).filter(Boolean); // Filter out any candidates that didn't resolve to a URL

    console.log('ðŸ”§ [DEBUG] Resolved image URLs to process:', imageUrls.length, imageUrls);
    setImageUrlsFromLastSelection(imageUrls);

    const finalSavedImages: { id: string; url: string }[] = [];

    // Use a for...of loop to handle async operations sequentially
    for (const url of imageUrls) {
      console.log(`ðŸ”§ [DEBUG] Processing URL: ${url}`);

      // Check if the image is already saved by looking at the state
      let savedId = savedByUrl[url]?.id;

      if (savedId) {
        console.log(`âœ… [DEBUG] Image already saved. ID: ${savedId}`);
        finalSavedImages.push({ id: savedId, url });
      } else {
        console.log(`ðŸ’¾ [DEBUG] Image not saved yet. Calling saveImage API...`);
        savedId = await saveImage(url); // saveImage returns the ID on success or null on failure

        if (savedId) {
          console.log(`âœ… [DEBUG] Image successfully saved. New ID: ${savedId}`);
          finalSavedImages.push({ id: savedId, url });
        } else {
          console.error(`â Œ [DEBUG] Failed to save image: ${url}. It will be skipped.`);
        }
      }
    }

    console.log('ðŸ”§ [DEBUG] Final collection of saved images:', finalSavedImages.length, finalSavedImages);

    // CRITICAL CHECK: Abort if NO images (either old or new) could be secured.
    if (finalSavedImages.length === 0) {
      toast({
        title: "Action Failed",
        description: "Could not save any of the selected images. Please check the console for errors and try again.",
        variant: "destructive",
      });
      console.error('â Œ [DEBUG] Aborting because no images were successfully saved.');
      return;
    }

    // Show a partial success message if some images failed to save
    if (finalSavedImages.length < imageUrls.length) {
      toast({
        title: "Partial Success",
        description: `Successfully prepared ${finalSavedImages.length} of ${imageUrls.length} selected images.`,
      });
    }

    console.log('ðŸ”— [DEBUG] Fetching social accounts...');
    const hasAccounts = await fetchSocialAccounts();
    console.log('ðŸ”— [DEBUG] Has accounts:', hasAccounts);

    if (hasAccounts) {
      console.log('âœ… [DEBUG] Accounts found. Showing account selection dialog.');
      setShowAccountSelectionDialog(true);
    } else {
      console.log('âš ï¸  [DEBUG] No accounts found. Navigating directly to creative page.');
      setSelectedImages({
        images: finalSavedImages,
        workspace: workspaceDetails || workspaceInfo,
        account: null,
        isCarousel: finalSavedImages.length >= 2
      });
      navigate('/creative');
    }

    console.log('ðŸš€ [DEBUG] handlePostSelected COMPLETED');
  }, [selected, visibleGroups, uploads, savedByUrl, saveImage, setSelectedImages, navigate, toast, workspaceDetails, workspaceInfo, fetchSocialAccounts, saveWorkspaceData]);

  const confirmAccountSelection = useCallback(async () => {
    console.log('âœ… [DEBUG] confirmAccountSelection STARTED');
    console.log('ðŸ”— [DEBUG] Selected account:', selectedAccountForPost?.db?.account_name || selectedAccountForPost?.db?.provider_user_id);
    if (!selectedAccountForPost) {
      console.log('â Œ [DEBUG] No account selected - ABORTING');
      return;
    }
    console.log('ðŸ’¾ [DEBUG] Saving workspace data before account confirmation...');
    await saveWorkspaceData();
    const finalImages = Object.values(savedByUrl).filter(img => imageUrlsFromLastSelection?.includes(img.url));
    console.log('ðŸ”§ [DEBUG] Final images for store:', finalImages.length);
    setSelectedImages({
      images: finalImages,
      workspace: workspaceDetails || workspaceInfo,
      account: selectedAccountForPost,
      isCarousel: finalImages.length >= 2
    });
    console.log('âœ… [DEBUG] Store updated with:', {
      imagesCount: finalImages.length,
      workspaceId: (workspaceDetails || workspaceInfo)?.id,
      accountName: selectedAccountForPost.db.account_name
    });
    setShowAccountSelectionDialog(false);
    setSelectedAccountForPost(null);
    navigate('/budget');
    console.log('ðŸš€ [DEBUG] confirmAccountSelection COMPLETED');
  }, [selectedAccountForPost, savedByUrl, workspaceDetails, workspaceInfo, setSelectedImages, navigate, saveWorkspaceData, imageUrlsFromLastSelection]);


  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showEnhanceNotice, setShowEnhanceNotice] = useState(false);

  const handleSuggestPrompt = useCallback(
    async () => {
      setIsSuggesting(true);

      // Hide any existing notice
      setShowEnhanceNotice(false);

      try {
        const userText = prompt.trim();
        const isGenerateMode = !userText; // Empty prompt = generate mode

        console.log(isGenerateMode ? "Generating prompt from workspace..." : "Enhancing user text:", userText);

        // Build comprehensive workspace context
        const workspaceData = workspaceDetails || workspaceInfo || {};
        const workspaceContext = {
          business_name: workspaceData.business_name || workspaceData.name || "",
          industry: workspaceData.industry || "",
          usp: workspaceData.usp || workspaceData.unique_selling_point || "",
          target_audience: workspaceData.target_audience || workspaceData.audience || "",
          location: workspaceData.location || workspaceData.address || "",
          logo_path: workspaceData.logo_path || workspaceData.logo || "",
          brand_colors: workspaceData.brand_colors || workspaceData.colors || "",
          tagline: workspaceData.tagline || workspaceData.slogan || "",
          description: workspaceData.description || workspaceData.about || "",
        };

        // Build a generation prompt from workspace details for the backend
        const generationHint = [
          `Generate a creative ${template} prompt for`,
          workspaceContext.business_name || "this business",
          workspaceContext.industry ? `in the ${workspaceContext.industry} sector` : "",
          workspaceContext.usp ? `highlighting: ${workspaceContext.usp}` : "",
          workspaceContext.target_audience ? `targeting ${workspaceContext.target_audience}` : "",
          workspaceContext.location ? `based in ${typeof workspaceContext.location === 'object' ? workspaceContext.location.country || workspaceContext.location.city || '' : workspaceContext.location}` : "",
          `Style: ${theme || 'professional'}`,
          `Format: ${aspectRatio}`,
        ].filter(Boolean).join(". ");

        // Build the request body based on mode
        const body = isGenerateMode ? {
          // Generate mode: create a new prompt from workspace details
          action: "generate",
          // Backend requires 'text' field - send a generation instruction
          text: generationHint,
          prompt: generationHint,
          hint: generationHint,
          template: template,
          theme: theme || "professional",
          aspect_ratio: aspectRatio,
          user_id: user?.id,
          workspace_id: workspaceId,
          workspace_details: JSON.stringify(workspaceContext),
          // Include all workspace fields for better prompt generation
          business_name: workspaceContext.business_name,
          industry: workspaceContext.industry,
          usp: workspaceContext.usp,
          target_audience: workspaceContext.target_audience,
          location: workspaceContext.location,
          tagline: workspaceContext.tagline,
          description: workspaceContext.description,
        } : {
          // Enhance mode: improve existing text
          action: "enhance",
          text: userText,
          prompt: userText,
          hint: `enhance and improve this text professionally: ${userText}`,
          base_prompt: userText,
          original_text: userText,
          template: template,
          theme: theme || "professional",
          aspect_ratio: aspectRatio,
          user_id: user?.id,
          workspace_id: workspaceId,
          workspace_details: JSON.stringify(workspaceContext),
        };

        console.log(`Sending ${isGenerateMode ? 'generate' : 'enhance'} request to /api/enhance-prompt:`, body);

        const res = await fetch(
          `${API_BASE}/api/enhance-prompt`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...authHeaders,
            },
            body: JSON.stringify(body),
          }
        );

        if (!res.ok) {
          const errorText = await res.text().catch(() => "");
          console.error(`${isGenerateMode ? 'Generate' : 'Enhance'} failed:`, res.status, errorText);
          toast({ description: `Failed to ${isGenerateMode ? 'generate' : 'enhance'} prompt. Please try again.` });
          return;
        }

        const json: any = await res.json();
        console.log(`${isGenerateMode ? 'Generate' : 'Enhance'} response:`, json);

        // Extract result from response - check various field names
        let result = "";

        if (json?.generated_prompt) {
          result = json.generated_prompt;
        } else if (json?.prompt) {
          result = json.prompt;
        } else if (json?.enhanced_text) {
          result = json.enhanced_text;
        } else if (json?.enhanced) {
          result = json.enhanced;
        } else if (json?.result) {
          result = json.result;
        } else if (json?.text) {
          result = json.text;
        } else if (Array.isArray(json?.prompts) && json.prompts.length > 0) {
          result = json.prompts[0];
        }

        // Clean up the response
        if (result && typeof result === "string") {
          result = result.trim();

          // Remove leading/trailing quotes if present
          if ((result.startsWith('"') && result.endsWith('"')) ||
            (result.startsWith("'") && result.endsWith("'"))) {
            result = result.slice(1, -1);
          }

          // Remove common AI prefixes
          const prefixes = [
            "Enhanced prompt:", "Enhanced:", "Here's the enhanced prompt:",
            "Improved prompt:", "Here's the improved version:", "Enhanced version:",
            "Here is the enhanced text:", "Revised:", "Generated prompt:",
            "Here's a prompt:", "Prompt:", "Suggested prompt:"
          ];
          for (const prefix of prefixes) {
            if (result.toLowerCase().startsWith(prefix.toLowerCase())) {
              result = result.slice(prefix.length).trim();
              break;
            }
          }
        }

        // Update prompt if we got a valid result
        if (result && result.length > 0 && result !== userText) {
          setPrompt(result);
          toast({ description: isGenerateMode ? "Prompt generated!" : "Prompt enhanced!" });
        } else {
          console.log("No result returned or same as input. Response:", json);
          if (isGenerateMode) {
            // Fallback: generate a basic prompt from workspace details
            const fallbackParts = [];
            if (workspaceContext.business_name) fallbackParts.push(`Create a ${template} for ${workspaceContext.business_name}`);
            if (workspaceContext.industry) fallbackParts.push(`in the ${workspaceContext.industry} industry`);
            if (workspaceContext.usp) fallbackParts.push(`highlighting: ${workspaceContext.usp}`);
            if (workspaceContext.target_audience) fallbackParts.push(`targeting ${workspaceContext.target_audience}`);

            if (fallbackParts.length > 0) {
              const fallbackPrompt = fallbackParts.join(" ") + `. Style: ${theme || 'professional'}, Format: ${aspectRatio}.`;
              setPrompt(fallbackPrompt);
              toast({ description: "Prompt generated from workspace details." });
            } else {
              toast({ description: "Please add workspace details first to generate a prompt." });
            }
          } else {
            toast({ description: "Enhancement not available. Try modifying your text manually." });
          }
        }
      } catch (err) {
        console.error("Prompt generation/enhancement error:", err);
        toast({ description: "Error processing prompt." });
      } finally {
        setIsSuggesting(false);
      }
    },
    [workspaceDetails, workspaceInfo, prompt, user, workspaceId, authHeaders, toast, template, theme, aspectRatio]
  );

  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const handleRegenerate = useCallback(async (groupId: string) => {
    const group = conversation.find(g => g.id === groupId);
    if (!group) return;
    setRegeneratingId(groupId);

    // Store existing candidates to preserve them
    const existingCandidates = [...group.candidates];

    try {
      // Re-generate using same payload structure as performGenerate
      const finalPrompt = group.prompt;
      const currentUserId = user?.id || null;
      const currentWorkspaceId = workspaceId || workspaceInfo?.id || null;
      const workspaceData = workspaceDetails || workspaceInfo || {};
      let workspaceJson = "{}";
      try { workspaceJson = JSON.stringify(workspaceData); } catch { }
      const promptWithWorkspace = `${finalPrompt}\n\n---\nWorkspace Details (JSON):\n${workspaceJson}\n---\nPlease use the workspace context above when generating.`;

      // Get the uploads that were used for this generation
      const groupUploads = group.uploads || uploads;
      const localFiles = groupUploads.filter((u) => !!u.file).map((u) => u.file as File);
      const remoteUrls = groupUploads
        .filter((u) => !u.file && typeof u.url === "string" && u.url.trim().length > 0)
        .map((u) => u.url.trim());
      const totalAssets = localFiles.length + remoteUrls.length;

      console.log("Regenerating with assets - localFiles:", localFiles.length, "remoteUrls:", remoteUrls.length);

      const repairUrl = (candidate?: string | null) => {
        if (!candidate) return null;
        let s = candidate.trim();
        if (!s) return null;
        if (BACKEND_BASE) {
          if (s.startsWith("/")) return `${BACKEND_BASE}${s}`;
          if (s.startsWith("//")) return window.location.protocol + s;
        }
        return s;
      };

      const fd = new FormData();
      fd.append("prompt", promptWithWorkspace);
      fd.append("template", group.template);
      fd.append("aspect_ratio", aspectRatio);
      if (group.theme) fd.append("theme", group.theme);

      // Send user_id and workspace_id for backend to save the generation
      if (currentUserId) fd.append("user_id", currentUserId.toString());
      if (currentWorkspaceId) fd.append("workspace_id", currentWorkspaceId.toString());

      // Send session_id so backend can group multiple prompts in same session
      fd.append("session_id", group.sessionId);

      fd.append("params", JSON.stringify({ num_candidates: 3, aspect_ratio: aspectRatio }));

      // Attach assets - same logic as performGenerate
      if (totalAssets > 0) {
        localFiles.forEach((file, i) => {
          fd.append("files[]", file, file.name || `image-${i + 1}.jpg`);
        });
        remoteUrls.forEach((url) => {
          const repaired = repairUrl(url) || url;
          fd.append("file_uri", repaired);
          fd.append("file_uri[]", repaired);
          fd.append("image_urls[]", repaired);
        });
        console.log("Regenerating with user assets (files[] + file_uri / image_urls[])");
      } else {
        // Fallback to workspace logo
        let logoCandidate: string | null = null;
        if (workspaceData && typeof (workspaceData as any).logo_path === "string" && (workspaceData as any).logo_path.trim()) {
          logoCandidate = (workspaceData as any).logo_path.trim();
        }
        const workspaceLogoAsset = workspaceAssets.find((a) => a.id === "workspace-logo");
        if (!logoCandidate && workspaceLogoAsset?.url) {
          logoCandidate = workspaceLogoAsset.url;
        }
        if (logoCandidate) {
          let repaired = repairUrl(logoCandidate) || logoCandidate;
          if (repaired && repaired.startsWith("/") && BACKEND_BASE) {
            repaired = `${BACKEND_BASE}${repaired}`;
          }
          if (repaired && repaired.startsWith("//")) {
            repaired = window.location.protocol + repaired;
          }
          fd.append("file_uri", repaired);
          fd.append("file_uri[]", repaired);
          fd.append("image_url", repaired);
          fd.append("image_urls[]", repaired);
          console.log("Regenerating with workspace logo:", repaired);
        }
      }

      const url = buildBackendUrl("/api/v1/generate-from-image");
      const res = await fetch(url, {
        method: "POST",
        headers: { ...authHeaders },
        body: fd,
      });

      let rawText = "";
      try { rawText = await res.text(); } catch { }

      let json: any = {};
      try { json = rawText ? JSON.parse(rawText) : {}; } catch { }

      const newCandidates = mapBackendResultsToCandidates(json);

      // Append new candidates to existing ones (don't overwrite)
      setConversation(prev => prev.map(g =>
        g.id === groupId ? { ...g, candidates: [...existingCandidates, ...newCandidates] } : g
      ));

      toast({ description: `Added ${newCandidates.length} new images.` });
      setGenerationCount(prev => prev + 1);
      // Trigger 10-second highlight animation
      setShowUploadHighlight(true);
      setTimeout(() => setShowUploadHighlight(false), 10000);
    } catch (e) {
      console.error("Regenerate failed", e);
      toast({ description: "Regeneration failed." });
      // On failure, keep existing candidates
      setConversation(prev => prev.map(g =>
        g.id === groupId ? { ...g, candidates: existingCandidates } : g
      ));
    } finally {
      setRegeneratingId(null);
    }
  }, [conversation, aspectRatio, workspaceId, workspaceInfo, workspaceDetails, authHeaders, toast, user, uploads, workspaceAssets]);

  // ---------- Assets sheet component ----------
  const AssetsSheet = () => (
    <Sheet open={showAssets} onOpenChange={setShowAssets}>
      <SheetContent side="right" className="w-[420px] sm:w-[540px] p-4">
        <SheetHeader><SheetTitle>Assets</SheetTitle></SheetHeader>
        <div className="mt-2">
          <div className="text-xs font-medium">NOTE</div>
          <div className="mt-1 text-sm text-yellow-700 bg-yellow-100 p-2 rounded">
            Generated images are **temporary** on the server and may be deleted. Save images permanently if you want to keep and post them.
          </div>
        </div>
        <div className="mt-4">
          <div className="text-xs font-medium">Uploaded</div>
          <div className="mt-2 grid grid-cols-2 gap-2 overflow-y-auto max-h-60">
            {uploads.map((u) => (
              <div key={u.id} className="rounded border p-2 relative">
                <SafeImage src={u.url} className="h-24 w-full object-cover rounded cursor-pointer" alt={u.name} onClick={() => setViewedImage(u.url)} fallbackText="Image expired" />
                <div className="absolute top-2 left-2">
                  <Badge>{isUrlSaved(u.url) ? "Saved" : "Uploaded"}</Badge>
                </div>
              </div>
            ))}
            {uploads.length === 0 && <div className="text-sm text-muted-foreground">No local uploads</div>}
          </div>
        </div>
        <div className="mt-4">
          <div className="text-xs font-medium">Workspace Assets</div>
          <div className="mt-2 grid grid-cols-2 gap-2 overflow-y-auto max-h-60">
            {workspaceAssets.map((a) => (
              <div key={a.id} className="rounded border p-2 relative">
                <SafeImage src={(a.url).replace(API_BASE, "")} className="h-24 w-full object-cover rounded cursor-pointer" alt={a.name} onClick={() => setViewedImage((a.url).replace(API_BASE, ""))} fallbackText="Asset unavailable" />
              </div>
            ))}
            {workspaceAssets.length === 0 && <div className="text-sm text-muted-foreground">No workspace assets</div>}
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium">Generated</div>
            <div>
              <Button size="sm" onClick={() => {
                if (assetsToSave.size === 0) {
                  toast({ description: "No assets selected to save." });
                  return;
                }
                saveMultipleUrls(Array.from(assetsToSave));
              }}>Save Selected</Button>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 overflow-y-auto max-h-60">
            {allCandidates.map((cand) => {
              const url = cand.type === "post" ? (cand as PostCandidate).image_hints?.[0] : (cand as CarouselCandidate).slides?.[0]?.image_hint;
              if (!url) return null;
              const resolved = resolveHintToUrl(url, cand.type === "post" ? "post" : "slide", uploads);
              return (
                <div key={`asset-${cand.id}`} className="rounded border overflow-hidden relative p-0">
                  <SafeImage src={resolved} className="h-24 w-full object-cover cursor-pointer" onClick={() => setViewedImage(resolved)} fallbackText="Expired" hideOnError={false} />
                  <div className="absolute top-1 left-1">
                    <input type="checkbox" checked={assetsToSave.has(resolved)} onChange={() => onToggleAssetToSave(resolved)} aria-label="Select to save" />
                  </div>
                  <div className="absolute top-1 right-1">
                    <Badge>{isUrlSaved(resolved) ? "Saved" : "Unsaved"}</Badge>
                  </div>
                  <div className="p-1 bg-white/80 flex gap-1">
                    <Button size="sm" onClick={() => {
                      const active = activeId ? conversation.find(g => g.id === activeId) : null;
                      if (active && active.candidates.length > 0) {
                        const firstCand = active.candidates[0];
                        setBindings((prev) => {
                          const cur = prev[firstCand.id] || [];
                          const widgetId = `candidate-${firstCand.id}`;
                          if (cur.includes(widgetId)) return prev;
                          return { ...prev, [firstCand.id]: [...cur, widgetId] };
                        });
                        toast({ description: "Bound generated asset to the first candidate of active conversation." });
                      } else {
                        toast({ description: "Select a conversation to bind this asset to a candidate, or use Edit -> Add assets." });
                      }
                    }}>Bind</Button>
                    <Button size="sm" onClick={async () => {
                      const id = await saveImage(resolved);
                      if (id) openPostDialogForSaved(id, resolved);
                    }}>Save</Button>
                  </div>
                </div>
              );
            })}
            {allCandidates.length === 0 && <div className="text-sm text-muted-foreground">No generated assets yet</div>}
          </div>
        </div>
        <div className="mt-4 flex justify-end"><Button size="sm" onClick={() => setShowAssets(false)}>Close</Button></div>
      </SheetContent>
    </Sheet>
  );

  const getGuidingText = () => (
    <div className="text-center py-12">
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-2">Welcome to Creative Assistant</h3>
          <p className="text-sm text-muted-foreground mb-4">
            This is where you can generate engaging social media content like posts, carousels, and stories. Use the prompt below to describe what you want, attach images, and hit Generate.
          </p>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>Try: "Create a summer sale post for fashion brand"</li>
            <li>Select templates: Post, Carousel, or Story</li>
            <li>Attach your logo or assets for branded content</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );

  const handleProceedFromPreview = useCallback(async (imageUrl: string) => {
    const savedId = await saveImage(imageUrl);
    if (savedId) {
      setSelectedImages({
        images: [{ id: savedId, url: imageUrl }],
        workspace: workspaceDetails || workspaceInfo,
        account: null
      });
      navigate('/creative');
      toast({ description: "Proceeding to campaign builder with selected asset." });
    }
  }, [saveImage, setSelectedImages, navigate, workspaceDetails, workspaceInfo, toast]);

  // Helper to generate conversation summary
  const getConversationSummary = (conv: ConversationItem) => {
    const candidateCount = conv.candidates.length;
    const type = conv.template === 'carousel' ? 'carousel' : conv.template === 'story' ? 'story' : 'post';
    return `${candidateCount} ${type}${candidateCount !== 1 ? 's' : ''} generated`;
  };

  // Get unique sessions for sidebar (show first item of each session)
  const sessions = useMemo(() => {
    const sessionMap = new Map<string, ConversationItem>();
    // Sort by createdAt descending, then take first of each session
    const sorted = [...conversation].sort((a, b) => b.createdAt - a.createdAt);
    for (const item of sorted) {
      if (!sessionMap.has(item.sessionId)) {
        sessionMap.set(item.sessionId, item);
      }
    }
    return Array.from(sessionMap.values());
  }, [conversation]);

  // Get session summary (total candidates across all items in session)
  const getSessionSummary = (sessionId: string) => {
    const items = conversation.filter(c => c.sessionId === sessionId);
    const totalCandidates = items.reduce((sum, item) => sum + item.candidates.length, 0);
    const prompts = items.length;
    return `${prompts} prompt${prompts !== 1 ? 's' : ''}, ${totalCandidates} image${totalCandidates !== 1 ? 's' : ''}`;
  };

  // Get earliest expiration for a session's images
  const getSessionExpiration = (sessionId: string) => {
    const items = conversation.filter(c => c.sessionId === sessionId);
    const localImages = getLocalSavedImages();
    let earliestDays: number | null = null;
    let hasPermanent = false;

    for (const item of items) {
      // Calculate expiration from item's createdAt (15 days from creation)
      if (item.createdAt && item.candidates.length > 0) {
        const expiresAt = new Date(item.createdAt + IMAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        const now = new Date();
        const diffMs = expiresAt.getTime() - now.getTime();
        const daysFromCreation = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

        // Check if any images in this item are saved permanently
        for (const cand of item.candidates) {
          const hint = cand.type === "post"
            ? (cand as PostCandidate).image_hints?.[0]
            : (cand as CarouselCandidate).slides?.[0]?.image_hint;
          const url = resolveHintToUrl(hint, cand.type === "post" ? "post" : "slide", uploads);
          const saved = localImages.find(img => img.url === url);
          if (saved?.isPermanent) {
            hasPermanent = true;
          }
        }

        // Use the creation-based expiration if not permanent
        if (!hasPermanent && daysFromCreation > 0) {
          if (earliestDays === null || daysFromCreation < earliestDays) {
            earliestDays = daysFromCreation;
          }
        }
      }
    }

    return { earliestDays, hasPermanent };
  };

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header - Compact and modern */}
      <header className="flex-shrink-0 border-b bg-white/80 backdrop-blur-sm px-4 py-2 md:px-6 relative z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">{workspaceInfo?.business_name ?? "Creative Studio"}</h1>
            <button onClick={() => setShowWorkspaceDialog(true)} className="text-xs text-muted-foreground hover:text-primary transition-colors">
              View workspace details →
            </button>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={0}>
              <Tooltip open={showUploadHighlight}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/start2')}
                    className={cn(
                      "hidden sm:flex gap-2 text-muted-foreground hover:text-primary transition-all relative overflow-hidden",
                      showUploadHighlight && "text-primary border border-primary/50 bg-gradient-to-r from-primary/5 via-primary/20 to-primary/5 shadow-[0_0_20px_rgba(52,178,51,0.5),0_0_40px_rgba(52,178,51,0.3)]"
                    )}
                  >
                    {/* Neon shimmer overlay */}
                    {showUploadHighlight && (
                      <span className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                    )}
                    <Upload className={cn("h-4 w-4 relative z-10", showUploadHighlight && "animate-bounce text-primary")} />
                    <span className="relative z-10">Upload Images</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  sideOffset={8}
                  className="bg-primary text-primary-foreground font-medium px-3 py-2 shadow-lg z-[9999]"
                  style={{ zIndex: 9999 }}
                >
                  <p>You can upload your own posts! 🖼️</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="ghost" size="sm" onClick={() => setShowAssets(true)} className="hidden sm:flex gap-2 text-muted-foreground hover:text-primary">
              <ImagePlay className="h-4 w-4" />
              Assets
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar - Hidden on mobile */}
        <aside className="hidden md:flex w-72 flex-col border-r bg-white/50 backdrop-blur-sm">
          <div className="p-4 border-b bg-white/80">
            <Button
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
              onClick={() => { setActiveId(null); setActiveSessionId(null); setPrompt(""); }}
            >
              <span className="mr-2">+</span> New Creative
            </Button>
          </div>
          <div className="p-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Recent Sessions</h3>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
            {loadingConversations ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Loader2 className="h-5 w-5 text-primary/60 animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground">Loading sessions...</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Checking history</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Send className="h-5 w-5 text-primary/60" />
                </div>
                <p className="text-sm text-muted-foreground">No sessions yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Start creating!</p>
              </div>
            ) : (
              sessions.map((it) => {
                const displayTitle = it.title || it.prompt.slice(0, 40) + (it.prompt.length > 40 ? '...' : '');
                const summary = getSessionSummary(it.sessionId);
                const expiration = getSessionExpiration(it.sessionId);
                const isActive = activeSessionId === it.sessionId;
                return (
                  <div
                    key={it.sessionId}
                    className={cn(
                      "group relative rounded-xl p-3 cursor-pointer transition-all duration-200",
                      isActive
                        ? "bg-primary/10 border border-primary/20 shadow-sm"
                        : "bg-white hover:bg-gray-50 border border-transparent hover:border-gray-200 hover:shadow-sm"
                    )}
                    onClick={() => { setActiveId(it.id); setActiveSessionId(it.sessionId); }}
                    title={it.createdAt ? `Created: ${new Date(it.createdAt).toLocaleString()}` : undefined}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium truncate", isActive ? "text-primary" : "text-gray-700")}>
                          {displayTitle}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-primary" : "bg-gray-300")}></span>
                          {summary}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRenameChat(it.id)}>
                            <Edit className="mr-2 h-4 w-4" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteChat(it.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-48 md:pb-36">
            {/* Welcome Screen - Show when no chat is selected (new chat mode) */}
            {!activeSessionId && !isGenerating && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-4">
                  {/* Sociovia Logo */}
                  <div className="w-16 h-16 relative flex items-center justify-center mx-auto mb-4">
                    {/* Gradient Border Ring */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-purple-400 p-[2px]">
                      <div className="h-full w-full bg-white rounded-[14px]"></div>
                    </div>
                    {/* Logo Image */}
                    <div className="absolute inset-0 rounded-2xl bg-primary/5 backdrop-blur-sm flex items-center justify-center p-3">
                      <img src={logo} alt="Sociovia" className="w-10 h-10 object-contain" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Creative Assistant</h2>
                  <p className="text-sm text-muted-foreground mb-5">
                    Generate AI-powered social media content tailored to your brand
                  </p>

                  {/* Quick steps */}
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-5">
                    <span className="flex items-center gap-1"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-medium flex items-center justify-center">1</span> Describe</span>
                    <span className="text-gray-300">→</span>
                    <span className="flex items-center gap-1"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-medium flex items-center justify-center">2</span> Generate</span>
                    <span className="text-gray-300">→</span>
                    <span className="flex items-center gap-1"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-medium flex items-center justify-center">3</span> Select</span>
                  </div>

                  {/* Content types */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { icon: "📷", title: "Posts" },
                      { icon: "🎠", title: "Carousels" },
                      { icon: "📱", title: "Stories" },
                    ].map((item) => (
                      <div key={item.title} className="p-3 rounded-lg bg-white border border-gray-100 hover:border-primary/30 transition-all">
                        <div className="text-xl mb-1">{item.icon}</div>
                        <div className="text-xs font-medium">{item.title}</div>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    💡 Try: "Summer sale post with bright colors"
                  </p>
                </div>
              </div>
            )}

            {/* Generated Content */}
            {visibleGroups.map((group) => (
              <div key={group.id} className="space-y-6">
                {/* User Prompt */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] md:max-w-[70%] rounded-2xl rounded-tr-md bg-gray-100 text-gray-800 px-4 py-3 shadow-sm border border-gray-200">
                    <p className="text-sm">{group.prompt}</p>
                  </div>
                </div>

                {/* AI Response */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                        <span className="text-[10px] text-white font-bold">AI</span>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {group.candidates.length} {group.template}{group.candidates.length !== 1 ? 's' : ''} created
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRegenerate(group.id)}
                      disabled={regeneratingId === group.id}
                      className="text-xs"
                    >
                      {regeneratingId === group.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "↻ Regenerate"}
                    </Button>
                  </div>
                  {group.candidates.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          className="rounded-2xl border border-primary/20 bg-white p-4 shadow-lg overflow-hidden relative"
                          style={{ animationDelay: `${i * 150}ms` }}
                        >
                          {/* Shimmer overlay */}
                          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: `${i * 200}ms` }} />

                          {/* Image placeholder with gradient animation */}
                          <div className="aspect-square rounded-xl mb-3 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-100/50 to-primary/5 animate-pulse" />
                            <div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-[shimmer_1.5s_infinite]"
                              style={{ animationDelay: `${i * 300}ms` }}
                            />
                            {/* Floating icon */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-white/80 shadow-lg flex items-center justify-center animate-bounce" style={{ animationDelay: `${i * 100}ms`, animationDuration: '1.5s' }}>
                                <svg className="w-6 h-6 text-primary animate-spin" style={{ animationDuration: '3s' }} fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* Text placeholders with staggered animation */}
                          <div className="space-y-2">
                            <div
                              className="h-3 rounded-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse"
                              style={{ width: `${75 - i * 10}%`, animationDelay: `${i * 100}ms` }}
                            />
                            <div
                              className="h-3 rounded-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse"
                              style={{ width: `${50 - i * 5}%`, animationDelay: `${i * 150}ms` }}
                            />
                          </div>

                          {/* Generating label */}
                          <div className="mt-3 flex items-center gap-2 text-xs text-primary/70">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                            <span className="animate-pulse">Generating...</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {group.candidates.map((c) => (
                        <CandidateCard
                          key={c.id}
                          candidate={c}
                          checked={selected.has(c.id)}
                          onCheckedChange={() => toggleSelect(c.id)}
                          boundUploadIds={bindings[c.id] || []}
                          uploads={uploads}
                          onDropUpload={(uploadId) => onDropBindToCandidate(c.id, uploadId)}
                          onCopy={() => {
                            const t = c.type === "post" ? c.caption ?? "" : (c.slides || []).map(s => s.caption ?? "").join("\n");
                            navigator.clipboard.writeText(t || "");
                            toast({ description: "Copied text." });
                          }}
                          onDownloadJSON={() => {
                            const blob = new Blob([JSON.stringify(c, null, 2)], { type: "application/json" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${c.id}.json`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                          }}
                          onPreview={(cand) => openEditDialogFor(cand)}
                          onEditImage={(url: string, cand: Candidate) => openImageEditDialog(url, cand)}
                          resolveHintToUrl={(h, k) => resolveHintToUrl(h, k, uploads)}
                          onRemoveBoundUpload={(uploadId) => unbindFromCandidate(c.id, uploadId)}
                          savedByUrl={savedByUrl}
                          onSaveImage={async (url: string) => {
                            const id = await saveImage(url);
                            if (id) openPostDialogForSaved(id, url);
                          }}
                          onPostSavedImage={(savedId: string, url: string) => {
                            openPostDialogForSaved(savedId, url);
                          }}
                          onViewImage={setViewedImage}
                          localSavedImages={getLocalSavedImages()}
                          createdAt={group.createdAt}
                        />
                      ))}
                      {/* Show loading skeletons while regenerating */}
                      {regeneratingId === group.id && [0, 1, 2].map(i => (
                        <div
                          key={`regen-skeleton-${i}`}
                          className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-white to-primary/5 p-4 shadow-lg overflow-hidden relative animate-slide-in-up"
                          style={{ animationDelay: `${i * 120}ms`, opacity: 0 }}
                        >
                          {/* Shimmer overlay */}
                          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/80 to-transparent" style={{ animationDelay: `${i * 200}ms` }} />

                          {/* Image placeholder with gradient animation */}
                          <div className="aspect-square rounded-xl mb-3 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-purple-100/60 to-primary/10 animate-pulse" />
                            <div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/15 to-transparent animate-[shimmer_1.2s_infinite]"
                              style={{ animationDelay: `${i * 250}ms` }}
                            />
                            {/* Floating sparkle icon */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-14 h-14 rounded-full bg-white/90 shadow-xl flex items-center justify-center animate-bounce" style={{ animationDelay: `${i * 80}ms`, animationDuration: '1.2s' }}>
                                <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path className="animate-pulse" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* Text placeholders */}
                          <div className="space-y-2">
                            <div
                              className="h-3 rounded-full bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 animate-pulse"
                              style={{ width: `${80 - i * 8}%`, animationDelay: `${i * 100}ms` }}
                            />
                            <div
                              className="h-3 rounded-full bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 animate-pulse"
                              style={{ width: `${55 - i * 5}%`, animationDelay: `${i * 150}ms` }}
                            />
                          </div>

                          {/* Regenerating label */}
                          <div className="mt-3 flex items-center gap-2 text-xs text-primary font-medium">
                            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-ping" />
                            <span className="animate-pulse">Adding new image...</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Only show continue button if this group has selected candidates */}
                  {group.candidates.some(c => selected.has(c.id)) && (
                    <div className="mt-6 flex justify-end">
                      <Button
                        onClick={handlePostSelected}
                        className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
                      >
                        Continue with {group.candidates.filter(c => selected.has(c.id)).length} selected →
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* Spacer to ensure bottom content is visible above fixed input bar */}
            <div className="h-24 md:h-20"></div>
          </div>
        </div>
      </div>

      {/* Bottom Input Bar - Fixed */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur-md shadow-lg">
        <div className="max-w-5xl mx-auto p-2 md:p-4">
          {/* Desktop: Single row, Mobile: Two rows */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile Menu Button - Only visible on mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebarMobile(true)}
              className="md:hidden flex-shrink-0 hover:bg-primary/10 h-9 w-9"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Mobile: Single "+" button that opens menu with Controls + Upload */}
            <div className="md:hidden relative flex-shrink-0" ref={controlsPanelRef}>
              <Button
                variant={showPanelsMobile ? "default" : "secondary"}
                size="icon"
                onClick={() => setShowPanelsMobile(!showPanelsMobile)}
                aria-label="Open menu"
                title="Controls & Upload"
                className={`h-9 w-9 transition-all duration-300 ${showPanelsMobile ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'hover:bg-primary/10 hover:text-primary'}`}
              >
                <Plus className={`h-5 w-5 transition-transform duration-300 ${showPanelsMobile ? 'rotate-45' : ''}`} />
              </Button>

              {/* Floating Controls Overlay - Mobile */}
              <div className={`absolute bottom-full left-0 mb-3 transition-all duration-300 ease-out origin-bottom-left ${showPanelsMobile ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'}`}>
                <div className="bg-white rounded-2xl shadow-2xl border border-primary/20 p-4 min-w-[280px] max-w-[320px]">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-primary/10">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                      Controls
                    </h3>
                    <button
                      onClick={() => setShowPanelsMobile(false)}
                      className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>

                  {/* Upload Button inside mobile menu */}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Add Media</label>
                    <Button
                      variant="outline"
                      onClick={() => { attachInputRef.current?.click(); setShowPanelsMobile(false); }}
                      className="w-full justify-start gap-3 py-3 hover:bg-gradient-to-r hover:from-primary/5 hover:to-purple-500/5 hover:border-primary/30 transition-all group"
                    >
                      <div className="relative">
                        <ImagePlay className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="text-left">
                        <span className="font-medium">Upload Images</span>
                        <span className="block text-[10px] text-muted-foreground">JPG, PNG, GIF, WEBP...</span>
                      </div>
                    </Button>
                  </div>

                  {/* Theme */}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Theme</label>
                    <input
                      value={theme ?? ""}
                      onChange={(e) => setTheme(e.target.value || null)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      aria-label="Theme"
                      title="Theme"
                      placeholder="e.g. summer sale"
                    />
                  </div>

                  {/* Template - Beautiful Segmented Pills */}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Template</label>
                    <div className="relative bg-gray-100 rounded-2xl p-1 flex gap-1">
                      {/* Animated background pill */}
                      <div
                        className="absolute top-1 bottom-1 bg-white rounded-xl shadow-lg transition-all duration-300 ease-out"
                        style={{
                          left: template === 'post' ? '4px' : template === 'carousel' ? 'calc(33.33% + 2px)' : 'calc(66.66%)',
                          width: 'calc(33.33% - 4px)',
                        }}
                      />
                      {[
                        { value: 'post', label: 'Post', icon: '📷', desc: 'Single image' },
                        { value: 'carousel', label: 'Carousel', icon: '🎠', desc: 'Multi-slide' },
                        { value: 'story', label: 'Story', icon: '📱', desc: 'Vertical' },
                      ].map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setTemplate(t.value as TemplateKind)}
                          className={`relative z-10 flex-1 flex flex-col items-center py-2.5 px-2 rounded-xl transition-all duration-200 group ${template === t.value
                            ? 'text-primary'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                          <span className={`text-xl mb-0.5 transition-transform duration-200 ${template === t.value ? 'scale-110' : 'group-hover:scale-105'}`}>
                            {t.icon}
                          </span>
                          <span className={`text-[11px] font-semibold transition-all ${template === t.value ? 'text-primary' : ''}`}>
                            {t.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Aspect Ratio */}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Aspect Ratio</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "1:1", label: "Square", icon: "⬜", ratio: "1:1" },
                        { value: "9:16", label: "Portrait", icon: "📱", ratio: "9:16" },
                      ].map((ratio) => (
                        <button
                          key={ratio.value}
                          onClick={() => setAspectRatio(ratio.value)}
                          className={`px-3 py-2.5 text-xs rounded-xl border-2 transition-all duration-200 ${aspectRatio === ratio.value ? 'bg-primary/10 text-primary border-primary shadow-md scale-[1.02]' : 'bg-gray-50 border-gray-200 hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.01]'}`}
                        >
                          <span className="block text-lg mb-0.5">{ratio.icon}</span>
                          <span className="font-medium">{ratio.label}</span>
                          <span className="block text-[10px] text-gray-400 mt-0.5">{ratio.ratio}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Uploads Preview */}
                  {uploads.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
                        Uploads ({uploads.length})
                      </label>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {uploads.slice(0, 4).map(u => (
                          <div key={u.id} className="relative flex-shrink-0">
                            <SafeImage
                              src={u.url}
                              alt={u.name ?? `Uploaded image ${u.id}`}
                              className="h-12 w-12 rounded-lg object-cover border-2 border-primary/20 cursor-pointer hover:border-primary transition-colors"
                              onClick={() => setViewedImage(u.url)}
                              fallbackText=""
                              fallbackClassName="h-12 w-12 rounded-lg border-2 border-red-200"
                            />
                            <button
                              type="button"
                              aria-label={`Remove ${u.name}`}
                              title="Remove upload"
                              onClick={() => removeUpload(u.id)}
                              className="absolute -top-1 -right-1 rounded-full bg-red-500 text-white p-0.5 shadow hover:bg-red-600 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {uploads.length > 4 && (
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                            +{uploads.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Decorative arrow pointing to button */}
                  <div className="absolute -bottom-2 left-4 w-4 h-4 bg-white border-r border-b border-primary/20 transform rotate-45"></div>
                </div>
              </div>
            </div>

            {/* Desktop: Separate Controls Button with Floating Overlay */}
            <div className="hidden md:block relative flex-shrink-0" ref={controlsPanelDesktopRef}>
              <Button
                variant={showPanelsMobile ? "default" : "secondary"}
                size="icon"
                onClick={() => setShowPanelsMobile(!showPanelsMobile)}
                aria-label="Toggle controls"
                title="Toggle controls"
                className={`h-10 w-10 transition-all duration-300 ${showPanelsMobile ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'hover:bg-primary/10 hover:text-primary'}`}
              >
                <PanelsTopLeft className={`h-5 w-5 transition-transform duration-300 ${showPanelsMobile ? 'rotate-180' : ''}`} />
              </Button>

              {/* Controls Button Tooltip - positioned to the left of the icon */}
              {showControlsTooltip && !showPanelsMobile && (
                <div className="absolute top-1/2 right-full -translate-y-1/2 mr-3 z-[60] animate-in fade-in zoom-in-95 slide-in-from-right-2 duration-300">
                  <div className="bg-gradient-to-r from-primary to-blue-600 text-white px-4 py-2.5 rounded-xl shadow-xl whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <PanelsTopLeft className="h-4 w-4" />
                      <span className="text-sm font-medium">Customize theme & template</span>
                    </div>
                    <div className="absolute top-1/2 -translate-y-1/2 -right-2 w-4 h-4 bg-blue-600 transform rotate-45"></div>
                  </div>
                </div>
              )}

              {/* Desktop: Floating Controls Overlay */}
              <div className={`hidden md:block absolute bottom-full left-0 mb-3 transition-all duration-300 ease-out origin-bottom-left ${showPanelsMobile ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'}`}>
                <div className="bg-white rounded-2xl shadow-2xl border border-primary/20 p-4 min-w-[280px] max-w-[320px]">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-primary/10">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                      Controls
                    </h3>
                    <button
                      onClick={() => setShowPanelsMobile(false)}
                      className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>

                  {/* Theme */}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Theme</label>
                    <input
                      value={theme ?? ""}
                      onChange={(e) => setTheme(e.target.value || null)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      aria-label="Theme"
                      title="Theme"
                      placeholder="e.g. summer sale"
                    />
                  </div>

                  {/* Template - Beautiful Segmented Pills */}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Template</label>
                    <div className="relative bg-gray-100 rounded-2xl p-1 flex gap-1">
                      {/* Animated background pill */}
                      <div
                        className="absolute top-1 bottom-1 bg-white rounded-xl shadow-lg transition-all duration-300 ease-out"
                        style={{
                          left: template === 'post' ? '4px' : template === 'carousel' ? 'calc(33.33% + 2px)' : 'calc(66.66%)',
                          width: 'calc(33.33% - 4px)',
                        }}
                      />
                      {[
                        { value: 'post', label: 'Post', icon: '📷', desc: 'Single image' },
                        { value: 'carousel', label: 'Carousel', icon: '🎠', desc: 'Multi-slide' },
                        { value: 'story', label: 'Story', icon: '📱', desc: 'Vertical' },
                      ].map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setTemplate(t.value as TemplateKind)}
                          className={`relative z-10 flex-1 flex flex-col items-center py-2.5 px-2 rounded-xl transition-all duration-200 group ${template === t.value
                            ? 'text-primary'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                          <span className={`text-xl mb-0.5 transition-transform duration-200 ${template === t.value ? 'scale-110' : 'group-hover:scale-105'}`}>
                            {t.icon}
                          </span>
                          <span className={`text-[11px] font-semibold transition-all ${template === t.value ? 'text-primary' : ''}`}>
                            {t.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Aspect Ratio */}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Aspect Ratio</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "1:1", label: "Square", icon: "⬜", ratio: "1:1" },
                        { value: "9:16", label: "Portrait", icon: "📱", ratio: "9:16" },
                      ].map((ratio) => (
                        <button
                          key={ratio.value}
                          onClick={() => setAspectRatio(ratio.value)}
                          className={`px-3 py-2.5 text-xs rounded-xl border-2 transition-all duration-200 ${aspectRatio === ratio.value ? 'bg-primary/10 text-primary border-primary shadow-md scale-[1.02]' : 'bg-gray-50 border-gray-200 hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.01]'}`}
                        >
                          <span className="block text-lg mb-0.5">{ratio.icon}</span>
                          <span className="font-medium">{ratio.label}</span>
                          <span className="block text-[10px] text-gray-400 mt-0.5">{ratio.ratio}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Uploads Preview */}
                  {uploads.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
                        Uploads ({uploads.length})
                      </label>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {uploads.slice(0, 4).map(u => (
                          <div key={u.id} className="relative flex-shrink-0">
                            <img
                              src={u.url}
                              alt={u.name ?? `Uploaded image ${u.id}`}
                              className="h-12 w-12 rounded-lg object-cover border-2 border-primary/20 cursor-pointer hover:border-primary transition-colors"
                              onClick={() => setViewedImage(u.url)}
                            />
                            <button
                              type="button"
                              aria-label={`Remove ${u.name}`}
                              title="Remove upload"
                              onClick={() => removeUpload(u.id)}
                              className="absolute -top-1 -right-1 rounded-full bg-red-500 text-white p-0.5 shadow hover:bg-red-600 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {uploads.length > 4 && (
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                            +{uploads.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Decorative arrow pointing to button */}
                  <div className="absolute -bottom-2 left-4 w-4 h-4 bg-white border-r border-b border-primary/20 transform rotate-45"></div>
                </div>
              </div>
            </div>

            {/* Desktop-only: Attach Button */}
            <div className="hidden md:block relative flex-shrink-0">
              <Button variant="secondary" size="icon" onClick={() => attachInputRef.current?.click()} aria-label="Attach media" title="Upload images" className="flex h-10 w-10 hover:bg-gradient-to-br hover:from-primary/20 hover:to-purple-500/20 hover:text-primary transition-all group">
                <ImagePlay className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </Button>

              {/* Media Button Tooltip - positioned to the left to avoid overlap */}
              {showMediaTooltip && (
                <div className="absolute bottom-full right-0 mb-3 z-[60] animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300">
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl shadow-xl whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <ImagePlay className="h-4 w-4" />
                      <span className="text-sm font-medium">Upload images</span>
                    </div>
                    <div className="absolute -bottom-2 right-4 w-4 h-4 bg-indigo-600 transform rotate-45"></div>
                  </div>
                </div>
              )}
            </div>
            {/* Video support temporarily disabled - uncomment to re-enable:
            <input ref={attachInputRef} type="file" multiple accept="image/*,video/*,.jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.mov,.avi,.webm,.mkv" onChange={(e) => onAttachFiles(e.currentTarget.files)} className="hidden" aria-label="Hidden attach input" title="Upload images and videos" />
            */}
            <input ref={attachInputRef} type="file" multiple accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.svg" onChange={(e) => onAttachFiles(e.currentTarget.files)} className="hidden" aria-label="Hidden attach input" title="Upload images" />

            {/* Textarea - Takes remaining space */}
            <div className="flex-1 relative min-w-0">
              {/* Loading Animation - Shows while waiting for workspace to load */}
              {isLoadingSuggestion && !showPromptSuggestion && !prompt.trim() && !activeSessionId && (
                <div className="absolute bottom-full left-0 right-0 mb-3 z-50 animate-in fade-in slide-in-from-bottom-3 duration-500">
                  <div className="bg-gradient-to-r from-primary/80 via-purple-500/80 to-pink-500/80 p-[2px] rounded-2xl shadow-xl">
                    <div className="bg-white rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg relative overflow-hidden">
                          <Sparkles className="h-5 w-5 text-white animate-pulse" />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-semibold text-primary uppercase tracking-wide">Generating Suggestion</span>
                            <div className="flex gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                          </div>
                          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-full animate-pulse" style={{ backgroundSize: '200% 100%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Clickable Prompt Suggestion Tooltip */}
              {showPromptSuggestion && suggestedPrompt && !prompt.trim() && (
                <div className="absolute bottom-full left-0 right-0 mb-3 z-50 animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-500">
                  <button
                    onClick={() => {
                      setPrompt(suggestedPrompt);
                      setShowPromptSuggestion(false);
                      toast({ description: "Prompt added! Click Generate to create your content." });
                    }}
                    className="w-full group"
                  >
                    <div className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 p-[2px] rounded-2xl shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 hover:scale-[1.02]">
                      <div className="bg-white rounded-2xl px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg">
                            <Sparkles className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Suggested Prompt</span>
                              <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full">Click to use</span>
                            </div>
                            <p className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors line-clamp-2">
                              {suggestedPrompt}
                            </p>
                          </div>
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Plus className="h-4 w-4 text-primary" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                  {/* Dismiss button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPromptSuggestion(false);
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors shadow-md"
                  >
                    <X className="h-3 w-3 text-gray-600" />
                  </button>
                </div>
              )}

              {/* Notice for empty prompt when enhance is clicked */}
              {showEnhanceNotice && (
                <div className="absolute -top-12 left-0 right-0 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2 rounded-lg shadow-md flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>Please enter something to enhance</span>
                    <div className="absolute -bottom-1 left-6 w-2 h-2 bg-amber-50 border-r border-b border-amber-200 transform rotate-45"></div>
                  </div>
                </div>
              )}

              {/* Uploaded Media Preview - Shows above textarea when files attached */}
              {uploads.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-2 z-10 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-lg">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      {uploads.map((upload) => {
                        const isVideo = upload.type?.startsWith('video/');
                        return (
                          <div
                            key={upload.id}
                            className="relative flex-shrink-0 group"
                            title={upload.name || 'Uploaded file'}
                          >
                            {isVideo ? (
                              <div
                                className="relative h-14 w-14 rounded-lg overflow-hidden border-2 border-purple-200 bg-purple-50 cursor-pointer hover:border-purple-400 transition-colors"
                                onClick={() => setViewedVideo(upload.url)}
                              >
                                <video
                                  src={upload.url}
                                  className="h-full w-full object-cover"
                                  muted
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors">
                                  <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center">
                                    <div className="w-0 h-0 border-l-[8px] border-l-purple-600 border-y-[5px] border-y-transparent ml-0.5"></div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <img
                                src={upload.url}
                                alt={upload.name || 'Uploaded image'}
                                className="h-14 w-14 rounded-lg object-cover border-2 border-primary/20 hover:border-primary transition-colors cursor-pointer"
                                onClick={() => setViewedImage(upload.url)}
                              />
                            )}
                            {/* Remove button */}
                            <button
                              type="button"
                              aria-label={`Remove ${upload.name || 'file'}`}
                              title="Remove"
                              onClick={() => removeUpload(upload.id)}
                              className="absolute -top-1.5 -right-1.5 rounded-full bg-red-500 text-white p-0.5 shadow-md hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            {/* File type badge */}
                            <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase shadow-sm ${isVideo ? 'bg-purple-500 text-white' : 'bg-primary/90 text-white'}`}>
                              {isVideo ? 'VID' : 'IMG'}
                            </div>
                          </div>
                        );
                      })}
                      {/* Add more button */}
                      <button
                        onClick={() => attachInputRef.current?.click()}
                        className="h-14 w-14 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-0.5 transition-all flex-shrink-0 group"
                        title="Add more files"
                      >
                        <Plus className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
                        <span className="text-[9px] text-gray-400 group-hover:text-primary transition-colors">Add</span>
                      </button>
                    </div>
                    {/* File count indicator */}
                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100">
                      <span className="text-[10px] text-gray-500">
                        {uploads.length} file{uploads.length !== 1 ? 's' : ''} attached
                      </span>
                      <button
                        onClick={() => {
                          uploads.forEach(u => {
                            if (u.url.startsWith('blob:')) URL.revokeObjectURL(u.url);
                          });
                          setUploads([]);
                          toast({ description: "All attachments removed." });
                        }}
                        className="text-[10px] text-red-500 hover:text-red-600 hover:underline transition-colors"
                      >
                        Clear all
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={prompt + (interimTranscript ? ` ${interimTranscript}` : "")}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    // Hide notice when user starts typing
                    if (showEnhanceNotice) setShowEnhanceNotice(false);
                    // Auto-resize up to 4 lines (~96px), then show scrollbar
                    e.target.style.height = 'auto';
                    const maxHeight = 96; // 4 lines * ~24px line height
                    e.target.style.height = Math.min(e.target.scrollHeight, maxHeight) + 'px';
                    // Add overflow-y-auto when content exceeds 4 lines
                    e.target.style.overflowY = e.target.scrollHeight > maxHeight ? 'auto' : 'hidden';
                  }}
                  onWheel={(e) => {
                    // Prevent background scroll when scrolling inside textarea
                    const target = e.currentTarget;
                    const isScrollable = target.scrollHeight > target.clientHeight;
                    if (isScrollable) {
                      e.stopPropagation();
                      const atTop = target.scrollTop === 0;
                      const atBottom = target.scrollTop + target.clientHeight >= target.scrollHeight;
                      // Only stop propagation if not at boundaries, or prevent default if at boundary
                      if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
                        e.preventDefault();
                      }
                    }
                  }}
                  placeholder="Message Creative Assistant..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      // Reset textarea height before generating
                      e.currentTarget.style.height = 'auto';
                      e.currentTarget.style.overflowY = 'hidden';
                      handleGenerate();
                    }
                  }}
                  aria-label="Message Creative Assistant"
                  className={`w-full min-h-[40px] max-h-[96px] px-3 py-2 text-sm md:text-base rounded-lg border border-gray-200 bg-white ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all ${!prompt.trim() && !interimTranscript ? 'pr-10 md:pr-3' : ''}`}
                  style={{ overflowY: 'hidden' }}
                  rows={1}
                />
                {/* Mobile: Mic inside textarea when empty */}
                {!prompt.trim() && !interimTranscript && (
                  <button
                    onClick={toggleMic}
                    className={`md:hidden absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-primary hover:bg-primary/10'}`}
                    aria-label="Microphone"
                    title="Toggle microphone"
                  >
                    {isListening ? <StopIcon className="h-4 w-4" /> : <MicIcon className="h-4 w-4" />}
                    {isListening && <span className="absolute -top-0.5 -right-0.5 inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />}
                  </button>
                )}
              </div>
            </div>

            {/* Desktop: Mic Button */}
            <div className="hidden md:block relative flex-shrink-0">
              <Button variant={isListening ? "destructive" : "outline"} size="icon" onClick={toggleMic} aria-label="Microphone" title="Toggle microphone" className={`h-10 w-10 ${!isListening ? "hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors" : ""}`}>
                {isListening ? <StopIcon className="h-5 w-5" /> : <MicIcon className="h-5 w-5" />}
              </Button>
              {isListening && <span className="absolute -top-1 -right-1 inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden="true" />}
            </div>

            {/* Action buttons - Generate/Enhance shows magic icon on mobile, full text on desktop */}
            <Button onClick={handleSuggestPrompt} disabled={isSuggesting || isValidatingAssets} className="h-9 w-9 md:h-10 md:w-auto md:px-4 text-sm bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-50 flex-shrink-0" title={prompt.trim() ? "Enhance Prompt" : "Generate Prompt"}>
              {isSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Wand2 className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">{prompt.trim() ? "Enhance Prompt" : "Generate Prompt"}</span></>}
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating || isValidatingAssets} aria-label="Generate creatives" title={isValidatingAssets ? "Checking assets..." : "Generate creatives"} size="icon" className="h-9 w-9 md:h-10 md:w-10 bg-primary hover:bg-primary/90 text-white shadow-md transition-all flex-shrink-0">
              {(isGenerating || isValidatingAssets) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 md:h-5 md:w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={showSidebarMobile} onOpenChange={setShowSidebarMobile}>
        <SheetContent side="left" className="w-[85vw] sm:max-w-sm p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="text-left">Sessions</SheetTitle>
            </SheetHeader>
            <div className="p-4 border-b">
              <Button
                className="w-full bg-gradient-to-r from-primary to-primary/80"
                onClick={() => { setActiveId(null); setActiveSessionId(null); setPrompt(""); setShowSidebarMobile(false) }}
              >
                <span className="mr-2">+</span> New Creative
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingConversations ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Loader2 className="h-5 w-5 text-primary/60 animate-spin" />
                  </div>
                  <p className="text-sm text-muted-foreground">Loading sessions...</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Checking history</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Send className="h-5 w-5 text-primary/60" />
                  </div>
                  <p className="text-sm text-muted-foreground">No sessions yet</p>
                </div>
              ) : (
                sessions.map((it) => {
                  const displayTitle = it.title || it.prompt.slice(0, 40) + (it.prompt.length > 40 ? '...' : '');
                  const summary = getSessionSummary(it.sessionId);
                  const expiration = getSessionExpiration(it.sessionId);
                  const isActive = activeSessionId === it.sessionId;
                  return (
                    <div
                      key={it.sessionId}
                      className={cn(
                        "group relative rounded-xl p-3 cursor-pointer transition-all",
                        isActive ? "bg-primary/10 border border-primary/20" : "bg-white border border-gray-100 hover:border-gray-200"
                      )}
                      onClick={() => { setActiveId(it.id); setActiveSessionId(it.sessionId); setShowSidebarMobile(false) }}
                      title={it.createdAt ? `Created: ${new Date(it.createdAt).toLocaleString()}` : undefined}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-medium truncate", isActive ? "text-primary" : "text-gray-700")}>
                            {displayTitle}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-primary" : "bg-gray-300")}></span>
                            {summary}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleRenameChat(it.id)}><Edit className="mr-2 h-4 w-4" />Rename</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteChat(it.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })
              )}
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Controls Sheet removed - now using floating overlay above */}

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent>
          <DialogHeader><DialogTitle>Help & Tips</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p><strong>Prompts:</strong> Be specific. "Summer sale post for fashion brand, minimalist style."</p>
            <p><strong>Uploads:</strong> Attach your logo or product photos to include them.</p>
            <p><strong>Templates:</strong> Switch between Post, Carousel, or Story for different formats.</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingChatId} onOpenChange={(o) => !o && setEditingChatId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Chat</DialogTitle></DialogHeader>
          <div className="flex gap-2">
            <Input value={newChatTitle} onChange={(e) => setNewChatTitle(e.target.value)} placeholder="New name" />
            <Button onClick={confirmRenameChat}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showWorkspaceDialog} onOpenChange={setShowWorkspaceDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Workspace Details</DialogTitle></DialogHeader>
          {workspaceInfo ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><strong>Business:</strong> {workspaceInfo.business_name}</div>
                <div><strong>Website:</strong> {workspaceInfo.website}</div>
              </div>
              <div><strong>Description:</strong> {workspaceInfo.description}</div>
              <div><strong>Audience:</strong> {workspaceInfo.audience_description}</div>
              <div><strong>USP:</strong> {workspaceInfo.usp}</div>
            </div>
          ) : <div>No workspace info loaded.</div>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCandidate} onOpenChange={(o) => !o && setEditCandidate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Refine Creative</DialogTitle></DialogHeader>
          {editCandidate && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Caption</label>
                  <Textarea value={editCaption} onChange={(e) => setEditCaption(e.target.value)} rows={6} />
                </div>
                {editCandidate.type === "post" && (
                  <div>
                    <label className="text-sm font-medium">Image Prompt</label>
                    <div className="flex gap-2">
                      <Input value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} />
                      <Button size="sm" onClick={() => generateFromImageFor(editCandidate, editPrompt)}>Generate</Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="text-sm font-medium">Preview</div>
                <div className="rounded border p-4 bg-muted/10 flex justify-center">
                  {editCandidate.type === "post" ? (
                    <div className="max-w-xs">
                      {(() => {
                        const url = (editCandidate as PostCandidate).image_hints?.[0];
                        if (!url) return <div className="h-48 w-48 bg-muted flex items-center justify-center text-muted-foreground">No image</div>;
                        const resolved = resolveHintToUrl(url, "post", uploads);
                        return <SafeImage src={resolved} className="w-full rounded shadow-sm" fallbackText="Image expired" fallbackClassName="w-full h-48 rounded" />;
                      })()}
                      <p className="mt-2 text-sm whitespace-pre-wrap">{editCaption}</p>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Preview not available for this type yet.</div>
                  )}
                </div>
                {editCandidate.type === "post" && (editCandidate as PostCandidate).image_hints?.[0] && (
                  <div className="flex justify-end">
                    <Button onClick={() => handleProceedFromPreview(resolveHintToUrl((editCandidate as PostCandidate).image_hints![0], "post", uploads))}>
                      Use This & Proceed
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Beautiful Image Edit Dialog */}
      <Dialog open={showImageEditDialog} onOpenChange={(o) => { if (!o) { setShowImageEditDialog(false); setImageToEdit(null); setEditedImageResult(null); } }}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden p-0 bg-gradient-to-br from-slate-50 to-white">
          <div className="flex flex-col h-full max-h-[95vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-white/80 backdrop-blur-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                    <Wand2 className="h-5 w-5" />
                  </div>
                  <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent font-bold">
                    AI Image Editor
                  </span>
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Describe what changes you want to make to this image
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Original Image */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <Label className="text-sm font-semibold text-slate-700">Original Image</Label>
                  </div>
                  <div className="relative group rounded-2xl overflow-hidden border-2 border-slate-200 shadow-lg bg-slate-100">
                    {imageToEdit?.url ? (
                      <img
                        src={imageToEdit.url}
                        alt="Original"
                        className="w-full aspect-square object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/creative-thumbnail.jpg';
                        }}
                      />
                    ) : (
                      <div className="w-full aspect-square flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                        <ImagePlay className="h-16 w-16 text-slate-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Right: Edit Controls & Result */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-violet-500" />
                    <Label className="text-sm font-semibold text-slate-700">
                      {editedImageResult ? "Edited Result" : "Edit Instructions"}
                    </Label>
                  </div>

                  {editedImageResult ? (
                    <div className="space-y-4">
                      <div className="relative group rounded-2xl overflow-hidden border-2 border-violet-300 shadow-lg bg-gradient-to-br from-violet-50 to-purple-50">
                        <img
                          src={editedImageResult}
                          alt="Edited"
                          className="w-full aspect-square object-cover"
                        />
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0 shadow-lg">
                            <Sparkles className="h-3 w-3 mr-1" /> Edited
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setEditedImageResult(null)}
                        >
                          Edit Again
                        </Button>
                        <Button
                          className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg"
                          onClick={() => {
                            setShowImageEditDialog(false);
                            toast({ description: "Edited image added to your creatives!" });
                          }}
                        >
                          <Check className="h-4 w-4 mr-2" /> Use This Image
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Instruction Input */}
                      <div className="relative">
                        <Textarea
                          placeholder="Describe how you want to edit this image...&#10;&#10;Examples:&#10;• Change the background to a sunset beach&#10;• Add a festive holiday decoration&#10;• Make the colors more vibrant&#10;• Remove the person on the left&#10;• Add a product logo in the corner"
                          value={editInstructions}
                          onChange={(e) => setEditInstructions(e.target.value)}
                          className="min-h-[200px] resize-none border-2 border-slate-200 focus:border-violet-400 rounded-xl p-4 text-sm bg-white shadow-inner transition-colors"
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                          {editInstructions.length} characters
                        </div>
                      </div>

                      {/* Quick Edit Suggestions */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Quick suggestions:</Label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "Make it brighter",
                            "Add warm tones",
                            "Remove background",
                            "Make it festive",
                            "Add text overlay",
                            "Enhance colors"
                          ].map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => setEditInstructions(prev => prev ? `${prev}, ${suggestion.toLowerCase()}` : suggestion)}
                              className="px-3 py-1.5 text-xs rounded-full bg-slate-100 hover:bg-violet-100 hover:text-violet-700 transition-colors border border-slate-200 hover:border-violet-300"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Loading State */}
                      {isEditingImage && (
                        <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-8">
                          <div className="flex flex-col items-center justify-center gap-4">
                            <div className="relative">
                              <div className="w-16 h-16 rounded-full border-4 border-violet-200 border-t-violet-500 animate-spin" />
                              <Wand2 className="absolute inset-0 m-auto h-6 w-6 text-violet-500 animate-pulse" />
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-violet-700">AI is editing your image...</p>
                              <p className="text-sm text-muted-foreground">This may take a few seconds</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-white/80 backdrop-blur-sm">
              <div className="flex justify-between items-center">
                <Button
                  variant="ghost"
                  onClick={() => { setShowImageEditDialog(false); setImageToEdit(null); setEditedImageResult(null); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-2" /> Cancel
                </Button>
                {!editedImageResult && (
                  <Button
                    onClick={handleEditImage}
                    disabled={isEditingImage || !editInstructions.trim()}
                    className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                  >
                    {isEditingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Editing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" /> Apply Edit
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAccountSelectionDialog} onOpenChange={setShowAccountSelectionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Select Account to Post</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {socialAccounts.length === 0 ? <div>No accounts connected.</div> : socialAccounts.map(acc => (
              <Button key={acc.db.id} variant={selectedAccountForPost?.db.id === acc.db.id ? "default" : "outline"} className="w-full justify-start" onClick={() => setSelectedAccountForPost(acc)}>
                {acc.db.platform} - {acc.db.account_name}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAccountSelectionDialog(false)}>Cancel</Button>
            <Button onClick={confirmAccountSelection} disabled={!selectedAccountForPost}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Post to Social Media</DialogTitle></DialogHeader>
          {postImage && (
            <div className="space-y-4">
              <div className="aspect-square w-full relative bg-muted rounded overflow-hidden">
                <SafeImage src={postImage.url} className="object-cover w-full h-full" fallbackText="Image no longer available" fallbackClassName="w-full h-full" />
              </div>
              <p className="text-sm text-muted-foreground">Ready to post this image?</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPostDialog(false)}>Cancel</Button>
                <Button onClick={() => {
                  setSelectedImages({ images: [{ id: postImage.id, url: postImage.url }], workspace: workspaceDetails || workspaceInfo, account: null });
                  navigate('/creative');
                }}>Proceed to Campaign</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewedImage} onOpenChange={(o) => !o && setViewedImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-0 shadow-none">
          {viewedImage && (
            <div className="relative flex items-center justify-center">
              <SafeImage src={viewedImage} className="max-h-[90vh] max-w-full rounded shadow-2xl" alt="Preview" fallbackText="Image expired or unavailable" fallbackClassName="h-64 w-64 rounded shadow-2xl" />
              <button onClick={() => setViewedImage(null)} className="absolute top-2 right-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70">
                <X className="h-6 w-6" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Viewer Dialog */}
      <Dialog open={!!viewedVideo} onOpenChange={(o) => !o && setViewedVideo(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-0 shadow-2xl">
          {viewedVideo && (
            <div className="relative flex items-center justify-center p-4">
              <video
                src={viewedVideo}
                className="max-h-[85vh] max-w-full rounded-lg shadow-2xl"
                controls
                autoPlay
                playsInline
              />
              <button
                onClick={() => setViewedVideo(null)}
                className="absolute top-2 right-2 rounded-full bg-white/20 p-2 text-white hover:bg-white/40 transition-colors backdrop-blur-sm"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAssetSelectionDialog} onOpenChange={setShowAssetSelectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Assets</DialogTitle>
            {validatedAssets.length < (uploads.length + workspaceAssets.length) && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ {(uploads.length + workspaceAssets.length) - validatedAssets.length} expired image(s) were removed
              </p>
            )}
          </DialogHeader>
          {isValidatingAssets ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Checking for valid images...</p>
            </div>
          ) : validatedAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ImageOff className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No valid images available</p>
              <p className="text-xs text-muted-foreground mt-1">All images may have expired</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              {validatedAssets.map(u => (
                <div key={u.id} className="relative cursor-pointer" onClick={() => {
                  const next = new Set(selectedAssetsForGeneration);
                  if (next.has(u.id)) next.delete(u.id);
                  else next.add(u.id);
                  setSelectedAssetsForGeneration(next);
                }}>
                  <img src={u.url} className={cn("h-20 w-full object-cover rounded border-2", selectedAssetsForGeneration.has(u.id) ? "border-primary" : "border-transparent")} alt="" />
                  {selectedAssetsForGeneration.has(u.id) && <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5"><Check className="h-3 w-3" /></div>}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssetSelectionDialog(false)}>Cancel</Button>
            <Button onClick={handleConfirmAssets} disabled={isValidatingAssets}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Expiration Warning Dialog */}
      <Dialog open={showExpirationWarning} onOpenChange={setShowExpirationWarning}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Images Expiring Soon
            </DialogTitle>
            <DialogDescription>
              The following images will be permanently deleted. Save them permanently to keep them.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {expiringImages.map((img) => {
              const daysLeft = getDaysUntilExpiry(img.expiresAt);
              return (
                <div key={img.id} className="flex items-center gap-3 p-2 rounded-lg border bg-amber-50 border-amber-200">
                  <SafeImage
                    src={img.url}
                    alt="Expiring"
                    className="w-16 h-16 object-cover rounded"
                    fallbackText="Expired"
                    fallbackClassName="w-16 h-16 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {img.url.split('/').pop() || 'Image'}
                    </p>
                    <p className="text-xs text-amber-600 font-medium">
                      {daysLeft <= 0 ? 'Expires today!' : `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={img.isPermanent ? "secondary" : "default"}
                    disabled={img.isPermanent}
                    onClick={async () => {
                      // Save permanently to backend
                      try {
                        const res = await fetch(buildBackendUrl("/api/v1/save-image-permanent"), {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            ...authHeaders
                          },
                          body: JSON.stringify({
                            image_id: img.id,
                            url: img.url,
                            user_id: user?.id,
                            workspace_id: workspaceId || workspaceInfo?.id,
                          }),
                        });

                        if (res.ok) {
                          markImageAsPermanent(img.id);
                          setExpiringImages(prev => prev.map(i =>
                            i.id === img.id ? { ...i, isPermanent: true } : i
                          ));
                          toast({ description: "Image saved permanently!" });
                        } else {
                          toast({ description: "Failed to save permanently." });
                        }
                      } catch (err) {
                        console.error("Save permanent failed:", err);
                        // Still mark locally as permanent
                        markImageAsPermanent(img.id);
                        setExpiringImages(prev => prev.map(i =>
                          i.id === img.id ? { ...i, isPermanent: true } : i
                        ));
                        toast({ description: "Saved locally (offline mode)." });
                      }
                    }}
                    className="flex-shrink-0"
                  >
                    {img.isPermanent ? (
                      <><Check className="h-4 w-4 mr-1" /> Saved</>
                    ) : (
                      "Keep Forever"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                // Save all permanently
                for (const img of expiringImages) {
                  if (!img.isPermanent) {
                    try {
                      await fetch(buildBackendUrl("/api/v1/save-image-permanent"), {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          ...authHeaders
                        },
                        body: JSON.stringify({
                          image_id: img.id,
                          url: img.url,
                          user_id: user?.id,
                          workspace_id: workspaceId || workspaceInfo?.id,
                        }),
                      });
                    } catch { }
                    markImageAsPermanent(img.id);
                  }
                }
                setExpiringImages(prev => prev.map(i => ({ ...i, isPermanent: true })));
                toast({ description: "All images saved permanently!" });
                setShowExpirationWarning(false);
              }}
              className="w-full sm:w-auto"
            >
              Save All Permanently
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                // Let them expire naturally
                setShowExpirationWarning(false);
                toast({
                  description: "Images will be deleted when they expire.",
                });
              }}
              className="w-full sm:w-auto"
            >
              Let Them Expire
            </Button>
            <Button
              onClick={() => setShowExpirationWarning(false)}
              className="w-full sm:w-auto"
            >
              Remind Me Later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssetsSheet />
    </main>
  );
}

function CandidateCard({ candidate, checked, onCheckedChange, boundUploadIds, uploads, onDropUpload, onCopy, onDownloadJSON, onPreview, onEditImage, resolveHintToUrl, onRemoveBoundUpload, savedByUrl, onSaveImage, onPostSavedImage, onViewImage, localSavedImages, createdAt }: any) {
  const mainImageUrl = candidate.type === "post" ? (candidate as PostCandidate).image_hints?.[0] : (candidate as CarouselCandidate).slides?.[0]?.image_hint;
  const resolvedMainUrl = mainImageUrl ? resolveHintToUrl(mainImageUrl, candidate.type === "post" ? "post" : "slide") : "";

  // Find saved image info for expiration display
  const savedImageInfo = localSavedImages?.find((img: any) => img.url === resolvedMainUrl);
  const isPermanent = savedImageInfo?.isPermanent === true;
  const isSaved = !!savedByUrl[resolvedMainUrl];

  // Calculate days left based on creation time (15 days from creation)
  const calculateDaysLeft = () => {
    if (isPermanent) return null;

    // If saved, use saved image expiry
    if (savedImageInfo?.expiresAt) {
      return getDaysUntilExpiry(savedImageInfo.expiresAt);
    }

    // Otherwise calculate from creation time
    if (createdAt) {
      const expiresAt = new Date(createdAt + IMAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      const now = new Date();
      const diffMs = expiresAt.getTime() - now.getTime();
      return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    }

    return null;
  };

  const daysLeft = calculateDaysLeft();

  return (
    <div className="group relative flex flex-col justify-between rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md">
      {/* Expiration badge - only show when daysLeft <= 14 (not brand new images) */}
      {resolvedMainUrl && (
        <div className="absolute top-2 left-2 z-10">
          {isPermanent ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/90 text-white text-[10px] font-medium shadow-sm" title="Saved permanently">
              <Shield className="h-3 w-3" />
              <span>Permanent</span>
            </div>
          ) : daysLeft !== null && daysLeft <= 14 && daysLeft > 0 ? (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium shadow-sm",
              daysLeft <= 3 ? "bg-red-500/90 text-white animate-pulse" :
                daysLeft <= 7 ? "bg-amber-500/90 text-white" :
                  "bg-blue-500/90 text-white"
            )} title={`${isSaved ? 'Expires' : 'Auto-deletes'} in ${daysLeft} days`}>
              <Clock className="h-3 w-3" />
              <span>{daysLeft}d left</span>
            </div>
          ) : daysLeft !== null && daysLeft <= 0 ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-600/90 text-white text-[10px] font-medium shadow-sm animate-pulse" title="Expired - will be deleted soon">
              <Clock className="h-3 w-3" />
              <span>Expired</span>
            </div>
          ) : null}
        </div>
      )}
      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button variant="secondary" size="icon" className="h-6 w-6" onClick={onCopy} title="Copy text"><Copy className="h-3 w-3" /></Button>
        <Button variant="secondary" size="icon" className="h-6 w-6" onClick={onDownloadJSON} title="Download JSON"><Download className="h-3 w-3" /></Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-6 w-6 hover:bg-violet-100 hover:text-violet-700 transition-colors"
          onClick={(e) => { e.stopPropagation(); onEditImage(resolvedMainUrl, candidate); }}
          title="Edit Image"
        >
          <Wand2 className="h-3 w-3" />
        </Button>
      </div>
      <div className="mb-3 cursor-pointer" onClick={() => onPreview(candidate)}>
        {resolvedMainUrl ? (
          <SafeImage src={resolvedMainUrl} alt="Candidate" className="h-40 w-full rounded object-cover" onClick={(e) => { e.stopPropagation(); onViewImage(resolvedMainUrl); }} fallbackText="Image expired" fallbackClassName="h-40 w-full rounded" />
        ) : (
          <div className="flex h-40 w-full items-center justify-center rounded bg-muted text-xs text-muted-foreground">No image generated</div>
        )}
      </div>
      <div className="space-y-2">
        <div className="line-clamp-3 text-xs text-muted-foreground whitespace-pre-wrap">
          {candidate.type === "post" ? (candidate as PostCandidate).caption : (candidate as CarouselCandidate).slides?.[0]?.caption}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={checked} onChange={onCheckedChange} className="h-4 w-4" />
            <span className="text-xs text-muted-foreground">Select</span>
          </div>
          {resolvedMainUrl && (
            <Button size="sm" variant="outline" onClick={async () => {
              if (savedByUrl[resolvedMainUrl]) {
                onPostSavedImage(savedByUrl[resolvedMainUrl].id, resolvedMainUrl);
              } else {
                await onSaveImage(resolvedMainUrl);
              }
            }}>
              {savedByUrl[resolvedMainUrl] ? "Post" : "Save & Post"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}