"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PanelsTopLeft, Search, ImageIcon, Sparkles } from "lucide-react";
import { useToast as useToastImport } from "@/hooks/use-toast";
import { useVoice as useVoiceImport } from "@/hooks/use-voice";
import { useNavigate } from 'react-router-dom';
import { useCampaignStore } from '@/store/campaignStore';

import { ChatSidebar } from "./chat-components/ChatSidebar";
import { AssetsSheet } from "./chat-components/AssetsSheet";
import { ComposeBar } from "./chat-components/ComposeBar";
import { CandidateCard } from "./chat-components/CandidateCard";
import { EditDialog } from "./chat-components/EditDialog";
import { PostDialog } from "./chat-components/PostDialog";
import { Candidate, ConversationItem, PostCandidate, TemplateKind, UploadItem } from "./types";
import { API_BASE_URL } from "@/config";

// --- Hooks Polyfills ---
let useToast = (useToastImport as any) || null;
if (!useToast) {
    useToast = () => ({ toast: ({ description }: any) => alert(description) });
}

let useVoice = (useVoiceImport as any) || null;
if (!useVoice) {
    useVoice = () => ({
        isSupported: false,
        isListening: false,
        interimTranscript: "",
        startListening: () => { },
        stopListening: () => { },
        resetTranscript: () => { },
    });
}

// --- Config ---
const FALLBACK_BACKEND = API_BASE_URL;
const BACKEND_BASE = API_BASE_URL;
const API_BASE = API_BASE_URL;

// --- Utilities ---
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

                // Fallback caption if empty
                if (!caption && r.caption) caption = r.caption;

                if (imageHints.length > 1) {
                    const slides = imageHints.map((ih) => ({ caption, image_hint: ih }));
                    return {
                        id: (typeof theme?.id === "string" && theme.id) || (typeof r?.id === "string" && r.id) || `carousel-${themeIndex}-${Math.random().toString(36).slice(2, 8)}`,
                        type: "carousel",
                        subtitle,
                        slides,
                        suggestions,
                        meta,
                    } as Candidate; // Cast to Candidate (CarouselCandidate is a subtype)
                }

                return {
                    id: (typeof theme?.id === "string" && theme.id) || (typeof r?.id === "string" && r.id) || `post-${themeIndex}-${Math.random().toString(36).slice(2, 8)}`,
                    type: "post",
                    caption,
                    subtitle,
                    image_hints: imageHints.length ? imageHints : [],
                    suggestions,
                    meta,
                } as Candidate; // Cast to Candidate (PostCandidate is a subtype)
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

    // Handle array of strings (simple URLs)
    if (items.length > 0 && typeof items[0] === 'string') {
        return items.map((u: string, i: number) => ({
            id: `f-${Date.now()}-${i}`,
            type: "post",
            caption: "",
            image_hints: [u],
        })) as Candidate[];
    }

    return items.map((it: any, idx: number) => {
        if (Array.isArray(it?.slides)) {
            const slides = it.slides.map((s: any) => ({ caption: s?.caption ?? "", image_hint: s?.image_hint ?? s?.image_url ?? "" }));
            return {
                id: (it?.id as string) || `carousel-${idx}-${Math.random().toString(36).slice(2, 8)}`,
                type: "carousel",
                slides,
                suggestions: Array.isArray(it?.suggestions) ? it.suggestions : [],
                meta: { title: it?.title ?? undefined },
            } as Candidate;
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
        } as Candidate;
    });
}

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

function getAuthToken(): string | null {
    if ((window as any).authToken) return String((window as any).authToken);
    return localStorage.getItem("authToken") || localStorage.getItem("token") || null;
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

// --- Main Component ---
export default function ChatUI2() {
    // Hooks
    const { toast } = useToast();
    const navigate = useNavigate();
    const { setSelectedImages } = useCampaignStore();
    const { isSupported, isListening, interimTranscript, startListening, stopListening, resetTranscript } = useVoice({
        lang: "en-US",
        interimResults: true,
        onFinal: (finalText: string) => {
            setPrompt((prev) => (prev ? prev + " " + finalText : finalText));
        },
    } as any);

    // State
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [conversation, setConversation] = useState<ConversationItem[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [uploads, setUploads] = useState<UploadItem[]>([]);

    // User & Workspace
    const [user, setUser] = useState<{ id: number; email: string } | null>(null);
    const [workspaceInfo, setWorkspaceInfo] = useState<any>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isAssetsOpen, setIsAssetsOpen] = useState(false);

    // Workspace Mode
    const [isWorkspaceMode, setIsWorkspaceMode] = useState(false);
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);

    // Dialog States
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editCandidate, setEditCandidate] = useState<Candidate | null>(null);
    const [editPrompt, setEditPrompt] = useState("");

    const [showPostDialog, setShowPostDialog] = useState(false);
    const [postCandidate, setPostCandidate] = useState<Candidate | null>(null);

    // Asset Selection for Generation
    const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

    // Social Accounts
    const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
    const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
    const [isPosting, setIsPosting] = useState(false);

    // Derived
    const activeConversation = conversation.find(c => c.id === activeId);
    const authHeaders = useMemo(() => {
        if (!user) return {};
        return {
            'X-User-Id': user.id.toString(),
            'X-User-Email': user.email,
        };
    }, [user]);

    // Effects
    useEffect(() => {
        const uId = getUserIdFromLocalStorage();
        if (uId) {
            setUser({ id: uId, email: "user@example.com" }); // Mock email if not in LS
        }
    }, []);

    useEffect(() => {
        const path = window.location.pathname;
        const match = path.match(/^\/workspace\/(\d+)\/chat$/);
        if (match) {
            setIsWorkspaceMode(true);
            setWorkspaceId(match[1]);
        }
    }, []);

    useEffect(() => {
        if (isWorkspaceMode && workspaceId && user) {
            // Fetch workspace data
            (async () => {
                try {
                    const res = await fetch(buildBackendUrl(`/api/workspace?workspace_id=${workspaceId}&user_id=${user.id}`), {
                        headers: { ...authHeaders, 'Content-Type': 'application/json' }
                    });
                    if (res.ok) {
                        const j = await res.json();
                        if (j.success) setWorkspaceInfo(j.workspace);
                    }

                    // Fetch generations
                    const gensRes = await fetch(buildBackendUrl(`/api/generations?workspace_id=${workspaceId}`), {
                        headers: authHeaders
                    });
                    if (gensRes.ok) {
                        const gensJ = await gensRes.json();
                        const gens = Array.isArray(gensJ.generations) ? gensJ.generations : [];
                        const mapped = gens.map((g: any) => {
                            let parsed;
                            try { parsed = JSON.parse(g.response); } catch { parsed = {}; }
                            return {
                                id: g.id,
                                prompt: g.prompt,
                                title: g.title || g.prompt.slice(0, 50),
                                theme: null,
                                template: "post",
                                candidates: mapBackendResultsToCandidates(parsed),
                                createdAt: new Date(g.created_at).getTime(),
                            };
                        }).sort((a: ConversationItem, b: ConversationItem) => b.createdAt - a.createdAt);
                        setConversation(mapped);
                        if (mapped.length > 0 && !activeId) setActiveId(mapped[0].id);
                    }
                } catch (err) {
                    console.error("Error fetching workspace data:", err);
                }
            })();
        }
    }, [isWorkspaceMode, workspaceId, user, authHeaders, toast]);

    // Fetch Social Accounts when Post Dialog opens
    useEffect(() => {
        if (showPostDialog && user) {
            fetch(buildBackendUrl("/api/social/management"), { headers: authHeaders })
                .then(r => r.json())
                .then(data => {
                    if (data.success && Array.isArray(data.accounts)) {
                        setSocialAccounts(data.accounts);
                    }
                })
                .catch(err => console.error("Failed to fetch accounts", err));
        }
    }, [showPostDialog, user, authHeaders]);

    // Handlers
    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast({ description: "Please enter a prompt." });
            return;
        }
        setIsGenerating(true);

        try {
            const formData = new FormData();
            formData.append("prompt", prompt);
            formData.append("template", "post"); // Default
            formData.append("params", JSON.stringify({ num_candidates: 2, aspect_ratio: "1:1" }));
            if (user?.id) formData.append("user_id", String(user.id));
            if (workspaceId) formData.append("workspace_id", workspaceId);
            if (workspaceInfo) formData.append("workspace_details", JSON.stringify(workspaceInfo));

            // Append selected assets
            selectedAssets.forEach(id => {
                const upload = uploads.find(u => u.id === id);
                if (upload?.file) {
                    formData.append("images", upload.file);
                }
            });

            const url = buildBackendUrl("/api/v1/generate-from-image");
            const res = await fetch(url, {
                method: "POST",
                body: formData,
                headers: {
                    // Content-Type is set by browser for FormData
                    ...(user?.id ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
                }
            });

            let data;
            if (res.ok) {
                data = await res.json();
            } else {
                console.warn("Backend failed, using mock");
                data = await clientMockGenerate({});
            }

            const newCandidates = mapBackendResultsToCandidates(data);
            const newConversationItem: ConversationItem = {
                id: Date.now().toString(),
                prompt,
                title: prompt.slice(0, 30),
                theme: null,
                template: "post",
                candidates: newCandidates,
                createdAt: Date.now()
            };

            setConversation(prev => [newConversationItem, ...prev]);
            setActiveId(newConversationItem.id);
            setPrompt("");
            setSelectedAssets([]); // Clear selection after generation

        } catch (err) {
            console.error("Generation error:", err);
            toast({ description: "Generation failed." });
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleMic = () => {
        if (!isSupported) return;
        if (isListening) stopListening();
        else {
            resetTranscript();
            startListening();
        }
    };

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newUploads: UploadItem[] = Array.from(e.target.files).map(file => ({
                id: `local-${Date.now()}-${Math.random()}`,
                url: URL.createObjectURL(file),
                name: file.name,
                size: file.size,
                type: file.type,
                file
            }));
            setUploads(prev => [...prev, ...newUploads]);
            setIsAssetsOpen(true);
        }
    };

    const removeUpload = (id: string) => {
        setUploads(prev => prev.filter(u => u.id !== id));
        setSelectedAssets(prev => prev.filter(x => x !== id));
    };

    const handleEdit = (candidate: Candidate) => {
        setEditCandidate(candidate);
        setEditPrompt(candidate.type === 'post' ? candidate.caption || "" : "");
        setShowEditDialog(true);
    };

    const handlePost = (candidate: Candidate) => {
        setPostCandidate(candidate);
        setShowPostDialog(true);
    };

    const handleSave = async (candidate: Candidate) => {
        const imgHint = candidate.type === 'post'
            ? candidate.image_hints?.[0]
            : candidate.slides?.[0]?.image_hint;

        if (!imgHint) return;

        try {
            const imgUrl = resolveHintToUrl(imgHint, candidate.type === 'post' ? 'post' : 'slide', uploads);
            const res = await fetch(buildBackendUrl("/api/v1/save-image"), {
                method: "POST",
                headers: { ...authHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: imgUrl,
                    workspace_id: workspaceId,
                    metadata: candidate.meta
                })
            });
            if (res.ok) toast({ description: "Image saved to workspace." });
            else toast({ description: "Failed to save image." });
        } catch (e) {
            console.error(e);
            toast({ description: "Error saving image." });
        }
    };

    const handlePostConfirm = async () => {
        if (!postCandidate || selectedAccountIds.length === 0) return;
        setIsPosting(true);
        try {
            const imgHint = postCandidate.type === 'post'
                ? postCandidate.image_hints?.[0]
                : postCandidate.slides?.[0]?.image_hint;

            const caption = postCandidate.type === 'post' ? postCandidate.caption : postCandidate.slides?.[0]?.caption;

            const imgUrl = resolveHintToUrl(imgHint, postCandidate.type === 'post' ? 'post' : 'slide', uploads);
            const res = await fetch(buildBackendUrl("/api/v1/post-image"), {
                method: "POST",
                headers: { ...authHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageUrl: imgUrl,
                    caption: caption,
                    accountIds: selectedAccountIds,
                    workspaceId
                })
            });
            const data = await res.json();
            if (data.success) {
                toast({ description: "Posted successfully!" });
                setShowPostDialog(false);
                setSelectedAccountIds([]);
            } else {
                toast({ description: "Failed to post: " + (data.error || "Unknown error") });
            }
        } catch (e) {
            console.error(e);
            toast({ description: "Error posting image." });
        } finally {
            setIsPosting(false);
        }
    };

    const toggleAssetSelection = (id: string) => {
        setSelectedAssets(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleSaveEdit = () => {
        if (editCandidate) {
            setConversation(prev => prev.map(item => ({
                ...item,
                candidates: item.candidates.map(c => {
                    if (c.id === editCandidate.id) {
                        if (c.type === 'post') {
                            return { ...c, caption: editPrompt };
                        }
                    }
                    return c;
                })
            })));
            setShowEditDialog(false);
            toast({ description: "Changes saved." });
        }
    };

    const handlePostSelected = () => {
        if (selectedAssets.length === 0) return;

        // Create a temporary candidate for posting
        const selectedUploads = uploads.filter(u => selectedAssets.includes(u.id));
        if (selectedUploads.length === 0) return;

        // For now, we'll just post the first one, or create a carousel if multiple?
        // Let's assume single post for simplicity or first image
        const firstAsset = selectedUploads[0];

        const tempCandidate: Candidate = {
            id: `temp-${Date.now()}`,
            type: 'post',
            caption: "", // User can edit in dialog
            image_hints: [firstAsset.url],
            suggestions: [],
            meta: { isUpload: true }
        };

        setPostCandidate(tempCandidate);
        setShowPostDialog(true);
        setIsAssetsOpen(false); // Close sheet
    };

    const handleSuggestPrompt = async () => {
        try {
            const res = await fetch(buildBackendUrl("/api/suggest-prompt"), {
                method: "POST",
                headers: { ...authHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({ context: prompt })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.suggestion) setPrompt(data.suggestion);
            } else {
                // Fallback mock
                const suggestions = [
                    "Create a vibrant social media post about our new summer collection.",
                    "Write a professional LinkedIn update sharing our latest milestone.",
                    "Design a carousel showcasing 5 tips for better productivity."
                ];
                setPrompt(suggestions[Math.floor(Math.random() * suggestions.length)]);
            }
        } catch (e) {
            console.error(e);
            // Fallback mock
            setPrompt("Create a vibrant social media post about...");
        }
    };

    const handleRenameConversation = async (id: string, newTitle: string) => {
        // Optimistic update
        setConversation(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));

        try {
            await fetch(buildBackendUrl(`/api/v1/conversations/${id}/rename`), {
                method: "POST",
                headers: { ...authHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({ title: newTitle })
            });
            toast({ description: "Conversation renamed." });
        } catch (e) {
            console.error("Failed to rename", e);
            toast({ description: "Failed to rename conversation." });
            // Revert on failure could be added here
        }
    };

    const handleDeleteConversation = async (id: string) => {
        if (!confirm("Are you sure you want to delete this chat?")) return;

        // Optimistic update
        setConversation(prev => prev.filter(c => c.id !== id));
        if (activeId === id) setActiveId(null);

        try {
            await fetch(buildBackendUrl(`/api/v1/conversations/${id}`), {
                method: "DELETE",
                headers: authHeaders
            });
            toast({ description: "Conversation deleted." });
        } catch (e) {
            console.error("Failed to delete", e);
            toast({ description: "Failed to delete conversation." });
        }
    };

    return (
        <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
            {/* Sidebar */}
            {/* Sidebar */}
            <ChatSidebar
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                conversation={conversation}
                activeId={activeId}
                setActiveId={setActiveId}
                onRename={handleRenameConversation}
                onDelete={handleDeleteConversation}
                user={user}
                workspaceInfo={workspaceInfo}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 relative bg-muted/5">
                {/* Header */}
                <header className="h-14 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 sticky top-0">
                    <div className="flex items-center gap-2">
                        {!isSidebarOpen && (
                            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
                                <PanelsTopLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <h1 className="font-semibold text-lg bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                            Sociovia AI
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsAssetsOpen(true)} className="text-muted-foreground hover:text-foreground">
                            <ImageIcon className="mr-2 h-4 w-4" /> Assets
                            {(uploads.length > 0 || selectedAssets.length > 0) && (
                                <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                                    {uploads.length} / {selectedAssets.length}
                                </Badge>
                            )}
                        </Button>
                    </div>
                </header>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-8 scroll-smooth">
                    {conversation.length === 0 && !activeId ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-6 animate-in fade-in duration-500">
                            <div className="p-6 bg-primary/5 rounded-full ring-1 ring-primary/10">
                                <Sparkles className="h-10 w-10 text-primary" />
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-xl font-semibold text-foreground">What would you like to create today?</p>
                                <p className="text-sm max-w-md mx-auto">
                                    Generate social media posts, carousels, and more with the power of AI.
                                </p>
                            </div>
                        </div>
                    ) : (
                        activeConversation && (
                            <div className="max-w-3xl mx-auto space-y-8 pb-10">
                                {/* User Prompt Bubble */}
                                <div className="flex justify-end animate-in slide-in-from-bottom-2 duration-300">
                                    <div className="bg-primary text-primary-foreground px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-md max-w-[80%]">
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{activeConversation.prompt}</p>
                                    </div>
                                </div>

                                {/* AI Response Area */}
                                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 delay-150">
                                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                        <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-[10px] text-white shadow-sm">
                                            AI
                                        </div>
                                        <span>Generated Content</span>
                                    </div>

                                    <div className="grid gap-6">
                                        {activeConversation.candidates.map((candidate, idx) => (
                                            <CandidateCard
                                                key={candidate.id}
                                                candidate={candidate}
                                                idx={idx}
                                                uploads={uploads}
                                                resolveHintToUrl={resolveHintToUrl}
                                                handleSave={handleSave}
                                                handleEdit={handleEdit}
                                                handlePost={handlePost}
                                                setPrompt={setPrompt}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>

                {/* Compose Bar */}
                <ComposeBar
                    prompt={prompt}
                    setPrompt={setPrompt}
                    isGenerating={isGenerating}
                    handleGenerate={handleGenerate}
                    handleUpload={handleUpload}
                    isListening={isListening}
                    toggleMic={toggleMic}
                    handleSuggestPrompt={handleSuggestPrompt}
                />
            </main>

            {/* Assets Sheet */}
            <AssetsSheet
                isAssetsOpen={isAssetsOpen}
                setIsAssetsOpen={setIsAssetsOpen}
                uploads={uploads}
                selectedAssets={selectedAssets}
                toggleAssetSelection={toggleAssetSelection}
                removeUpload={removeUpload}
                handleUpload={handleUpload}
                onPostSelected={handlePostSelected}
            />

            {/* Edit Dialog */}
            <EditDialog
                showEditDialog={showEditDialog}
                setShowEditDialog={setShowEditDialog}
                editPrompt={editPrompt}
                setEditPrompt={setEditPrompt}
                handleSaveEdit={handleSaveEdit}
            />

            {/* Post Dialog */}
            <PostDialog
                showPostDialog={showPostDialog}
                setShowPostDialog={setShowPostDialog}
                socialAccounts={socialAccounts}
                selectedAccountIds={selectedAccountIds}
                setSelectedAccountIds={setSelectedAccountIds}
                isPosting={isPosting}
                handlePostConfirm={handlePostConfirm}
            />
        </div>
    );
}
