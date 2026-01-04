import { useState, useEffect, useRef } from "react";
import { convertImageToJpegBase64 } from "@/lib/utils";
import { AdSetTabs } from "./AdSetTabs";
import { Separator } from "@/components/ui/separator";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Pencil,
    Target,
    Wallet,
    Image as ImageIcon,
    Calendar,
    Check,
    Sparkles,
    Loader2,
    FileText,
    MapPin,
    Plus,
    X,
    Copy,
    Wand2,
    Trash2,
    Eye,
    RefreshCw,
    Globe,
    CheckCircle2,
    AlertOctagon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import apiClient from "@/lib/apiClient";
import LeadFormBuilder from "@/components/LeadFormBuilder";
import MapPicker from "@/components/ui/map-picker";
import { LeadFormConfig } from "@/store/campaignStore";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config";
import { LocationPicker, LocationResult } from "@/components/ui/location-picker";
import { Interest, InterestPicker } from "@/components/ui/interest-picker";

// --- Types ---

export interface AdSet {
    id: string;
    name: string;

    // Targeting
    locations: LocationResult[];
    location?: string; // Fallback legacy
    ageMin: number;
    ageMax: number;
    gender: string;
    interests: Interest[];

    // Creative (Multi-Asset)
    headlines: string[];
    primaryTexts: string[];
    imageUrls: string[];

    description: string; // Context for the ad set itself
    destinationUrl: string;
    cta: string;
}

export interface EditorState {
    // Campaign Level Strategy
    objective: string;
    budget: number;
    startDate: string;
    endDate: string;

    // Ad Sets / Variations
    adSets: AdSet[];
    leadingAdSetId: string;

    // Global Lead Form
    leadForm?: LeadFormConfig;

    // AI Tools
    masterPrompt: string;
}

interface CampaignEditorStepProps {
    initialData: any;
    onChange: (state: EditorState) => void;
}

const DEFAULT_LEAD_FORM: LeadFormConfig = {
    form_name: 'Quick Lead Form',
    intro_text: 'Sign up for updates',
    privacy_policy_url: '',
    questions: [
        { id: 'q1', type: 'FULL_NAME', label: 'Full Name', required: true },
        { id: 'q2', type: 'EMAIL', label: 'Email', required: true }
    ],
    thank_you_text: 'Thanks! We will contact you shortly.',
};

// --- Preview Helpers (Ported from ReviewAndConfirm.tsx) ---

// Helper to get proxied URL for CDN images (bypass CORS)
function getProxiedImageUrl(imageUrl: string): string {
    const API_BASE = API_BASE_URL;
    if (imageUrl.includes('digitaloceanspaces.com')) {
        return `${API_BASE} /api/v1 / image - proxy ? url = ${encodeURIComponent(imageUrl)} `;
    }
    return imageUrl;
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

function parsePreviewError(err: any): { title: string; message: string; isSessionError: boolean } {
    const rawMessage = err?.message ?? String(err);
    // ... Simplified parsing for editor context
    if (rawMessage.includes('session has been invalidated') || rawMessage.includes('OAuthException')) {
        return { title: 'Meta Session Expired', message: 'Reconnect your account.', isSessionError: true };
    }
    if (rawMessage.includes('rate limit')) return { title: 'Too Many Requests', message: 'Please wait...', isSessionError: false };
    return { title: 'Preview Unavailable', message: 'Could not generate preview.', isSessionError: false };
}

// --- Sub-Component: AdSetPreview ---
function AdSetPreview({ adSet, forceUpdate }: { adSet: AdSet, forceUpdate: boolean }) {
    const [adPreviewHtml, setAdPreviewHtml] = useState<string | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [previewError, setPreviewError] = useState<{ title: string; message: string } | null>(null);

    const lastPreviewPayloadRef = useRef<string>('');
    const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch Logic
    const fetchAdPreview = async () => {
        setLoadingPreview(true);
        setPreviewError(null);

        try {
            const workspaceId = localStorage.getItem("sv_selected_workspace_id") ?? "8";
            let userId = localStorage.getItem("sv_user_id");
            if (!userId) {
                const u = localStorage.getItem("sv_user");
                if (u) userId = JSON.parse(u).id;
            }

            const payloadCreative: any = {
                title: adSet.headlines?.[0] || "",
                body: adSet.primaryTexts?.[0] || "",
                call_to_action: adSet.cta,
                link: adSet.destinationUrl || "https://example.com",
                url: adSet.destinationUrl || "https://example.com",
                website_url: adSet.destinationUrl || "https://example.com"
            };

            const imgUrl = adSet.imageUrls?.[0];
            if (imgUrl) {
                try {
                    if (imgUrl.startsWith('data:')) {
                        payloadCreative.image_base64 = imgUrl;
                    } else {
                        payloadCreative.image_base64 = await convertImageToJpegBase64(imgUrl, API_BASE_URL);
                    }
                } catch (e) {
                    console.warn("Image conversion failed, falling back to URL", e);
                    payloadCreative.image_url = imgUrl;
                }
            }

            const payload = {
                creative: payloadCreative,
                ad_formats: ['MOBILE_FEED_STANDARD'],
                workspace_id: workspaceId,
                user_id: userId ? Number(userId) : undefined
            };

            const res = await apiClient.post('/facebook/adpreviews', payload);
            if (!res.ok) throw new Error(res.error?.message || "Preview failed");

            const json = res.data;
            if (!json?.ok) throw new Error(json?.error || 'Preview generation failed');

            const previews = Array.isArray(json.previews) ? json.previews : [];
            let chosen = previews.find((p: any) => p.iframe_src) ||
                previews.find((p: any) => p.preview_html) ||
                previews.find((p: any) => p.raw?.data?.[0]?.body) ||
                previews.find((p: any) => p.data?.[0]?.body) ||
                previews[0];

            if (!chosen) throw new Error('No previews returned');

            let html: string | null = null;
            if (chosen.iframe_src) {
                html = `< iframe src = "${chosen.iframe_src}" width = "100%" height = "520" style = "border:none;overflow:hidden;" allowfullscreen ></iframe > `;
            } else if (chosen.preview_html) {
                html = chosen.preview_html;
            } else if (chosen.data?.[0]?.body) {
                html = chosen.data[0].body;
            } else if (chosen.raw?.data?.[0]?.body) {
                html = chosen.raw.data[0].body;
            }

            if (!html) throw new Error('Preview response invalid');
            setAdPreviewHtml(html);

        } catch (e: any) {
            console.error("Preview fetch failed", e);
            setPreviewError(parsePreviewError(e));
        } finally {
            setLoadingPreview(false);
        }
    };

    useEffect(() => {
        if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);

        // Debounce
        const payloadSignature = JSON.stringify({
            h: adSet.headlines?.[0],
            p: adSet.primaryTexts?.[0],
            i: adSet.imageUrls?.[0],
            c: adSet.cta
        });

        if (payloadSignature === lastPreviewPayloadRef.current && !forceUpdate) return;

        if (adSet.headlines?.[0] && adSet.primaryTexts?.[0]) {
            previewTimeoutRef.current = setTimeout(() => {
                lastPreviewPayloadRef.current = payloadSignature;
                fetchAdPreview();
            }, 800);
        }
        return () => { if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current); };
    }, [adSet.headlines, adSet.primaryTexts, adSet.imageUrls, adSet.cta, forceUpdate]);

    return (
        <div className="w-full h-full bg-white shadow-sm pointer-events-none select-none relative">
            {loadingPreview && !adPreviewHtml && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            )}
            {loadingPreview && adPreviewHtml && (
                <div className="absolute top-2 right-2 z-20"><Loader2 className="w-4 h-4 animate-spin text-indigo-500" /></div>
            )}
            {!adPreviewHtml && !loadingPreview && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm p-10">
                    <p>{previewError?.title || "Preview Unavailable"}</p>
                    <p className="text-xs mt-1">{previewError?.message}</p>
                </div>
            )}
            {adPreviewHtml && (
                <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: adPreviewHtml }} />
            )}
        </div>
    );
}

// --- Sub-Component: AdSetCard (Preview + Edit) ---

function AdSetCard({
    adSet,
    onUpdate,
    onDelete,
    availableImages,
    onGenerateMore,
    isGenerating,
    isOpen,
    onToggle,
}: {
    adSet: AdSet;
    onUpdate: (id: string, updates: Partial<AdSet>) => void;
    onDelete: (id: string) => void;
    availableImages: string[];
    onGenerateMore: () => void;
    isGenerating: boolean;
    isOpen: boolean;
    onToggle: () => void;
}) {
    const [previewImageUrl, setPreviewImageUrl] = useState(adSet.imageUrls?.[0] || "");
    const [previewHeadline, setPreviewHeadline] = useState(adSet.headlines?.[0] || "");
    const [previewPrimaryText, setPreviewPrimaryText] = useState(adSet.primaryTexts?.[0] || "");

    // Sync local state when adSet updates
    useEffect(() => {
        if (adSet.imageUrls?.[0]) setPreviewImageUrl(adSet.imageUrls[0]);
        if (adSet.headlines?.[0]) setPreviewHeadline(adSet.headlines[0]);
        if (adSet.primaryTexts?.[0]) setPreviewPrimaryText(adSet.primaryTexts[0]);
    }, [adSet.id, adSet.imageUrls, adSet.headlines, adSet.primaryTexts]);

    // Handle Location Change from LocationPicker
    const handleLocationChange = (locationName: string, details?: LocationResult) => {
        if (details) {
            // Replace existing locations with the new single selection for now
            // We store the full LocationResult object
            onUpdate(adSet.id, { locations: [details] });
        } else {
            onUpdate(adSet.id, { locations: [] });
        }
    };

    const currentLocation = adSet.locations?.[0] as unknown as LocationResult | undefined;
    // Handle legacy string case or new object case
    const currentLocationName = currentLocation?.city || currentLocation?.country || (typeof adSet.locations?.[0] === 'string' ? adSet.locations[0] : "") || "";

    return (
        <Card className="overflow-hidden border-border/60 shadow-sm transition-all hover:shadow-md h-full flex flex-col">
            <CardHeader className="p-4 py-3 bg-muted/40 border-b flex flex-row items-center justify-between space-y-0 flex-shrink-0">
                <div className="font-semibold flex items-center gap-2">
                    <div className="w-2 h-8 bg-blue-500 rounded-full" />
                    <Input
                        value={adSet.name}
                        onChange={(e) => onUpdate(adSet.id, { name: e.target.value })}
                        className="h-8 w-40 font-bold border-transparent hover:border-border/50 focus:border-primary px-2 text-sm bg-transparent"
                    />
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => onDelete(adSet.id)}>
                    <Trash2 className="w-4 h-4" />
                </Button>
            </CardHeader>

            <CardContent className="p-0 flex-1 flex flex-col">
                {/* 1. Preview Area */}
                <div className="bg-slate-50 border-b border-border/40 min-h-[300px] relative">
                    <div className="scale-[0.8] origin-top w-full h-[500px]">
                        <AdSetPreview
                            adSet={{
                                ...adSet,
                                imageUrls: [previewImageUrl],
                                headlines: [previewHeadline],
                                primaryTexts: [previewPrimaryText]
                            }}
                            forceUpdate={false}
                        />
                    </div>
                </div>

                {/* 2. Unified Editor Controls */}
                <div className="p-5 space-y-6 flex-1 bg-white">

                    {/* Creative Assets */}
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3" /> Image Asset
                                </Label>
                                <Button variant="ghost" size="sm" className="h-5 text-[10px] text-blue-600 px-0" onClick={onGenerateMore} disabled={isGenerating}>
                                    {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> Generate New</span>}
                                </Button>
                            </div>

                            {/* Horizontal Image Scroll */}
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                                {availableImages.map((img, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            setPreviewImageUrl(img);
                                            onUpdate(adSet.id, { imageUrls: [img] });
                                        }}
                                        className={`
                                            relative flex - shrink - 0 w - 16 h - 16 rounded - lg cursor - pointer overflow - hidden border - 2 transition - all snap - start
                                            ${previewImageUrl === img ? 'border-primary ring-2 ring-primary/20' : 'border-transparent opacity-70 hover:opacity-100'}
`}
                                    >
                                        <img src={getProxiedImageUrl(img)} className="w-full h-full object-cover" loading="lazy" />
                                        {previewImageUrl === img && (
                                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                <div className="bg-primary text-white p-1 rounded-full shadow-sm">
                                                    <Check className="w-3 h-3" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600">Headline</Label>
                                <Input
                                    value={previewHeadline}
                                    onChange={(e) => {
                                        setPreviewHeadline(e.target.value);
                                        onUpdate(adSet.id, { headlines: [e.target.value] });
                                    }}
                                    className="font-semibold text-sm bg-slate-50/50 focus:bg-white transition-colors h-9"
                                    placeholder="Catchy headline..."
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600">Primary Text</Label>
                                <Textarea
                                    value={previewPrimaryText}
                                    onChange={(e) => {
                                        setPreviewPrimaryText(e.target.value);
                                        onUpdate(adSet.id, { primaryTexts: [e.target.value] });
                                    }}
                                    className="min-h-[80px] text-sm resize-none bg-slate-50/50 focus:bg-white transition-colors"
                                    placeholder="Enter the main text for your ad..."
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600">Destination URL</Label>
                                <Input
                                    value={adSet.destinationUrl || ""}
                                    onChange={(e) => onUpdate(adSet.id, { destinationUrl: e.target.value })}
                                    className="font-semibold text-sm bg-slate-50/50 focus:bg-white transition-colors h-9"
                                    placeholder="https://example.com"
                                />
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-border/60" />

                    {/* Targeting - Toggled via Prop */}
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={onToggle}
                            className="flex items-center justify-between w-full text-left group"
                        >
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 rounded-md px-2 py-1">
                                    <Target className="w-3 h-3" /> Targeting
                                </Badge>
                                <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors truncate max-w-[200px]">
                                    {(currentLocationName || "Global")}, {adSet.ageMin}-{adSet.ageMax}+
                                </span>
                            </div>
                            <span className="text-xs text-blue-600 font-medium group-hover:underline transition-all">
                                {isOpen ? 'Hide' : 'Edit'}
                            </span>
                        </button>

                        {isOpen && (
                            <div className="p-4 bg-slate-50 rounded-xl border border-border/50 space-y-4 animate-in fade-in slide-in-from-top-1">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> Location
                                    </Label>
                                    <LocationPicker
                                        value={currentLocationName}
                                        placeholder="Search location (e.g. New Delhi)"
                                        initialLocation={currentLocation}
                                        defaultRadius={currentLocation?.radius || 40}
                                        onChange={handleLocationChange}
                                        className="bg-white"
                                    />
                                    <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                                        <span>Radius: {currentLocation?.radius || 40} km</span>
                                        <span>{currentLocation?.country_code || "Global"}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-600">Age Range ({adSet.ageMin} - {adSet.ageMax})</Label>
                                    <Slider
                                        defaultValue={[adSet.ageMin, adSet.ageMax]}
                                        max={65}
                                        min={13}
                                        step={1}
                                        onValueChange={(val) => onUpdate(adSet.id, { ageMin: val[0], ageMax: val[1] })}
                                        className="py-1"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-600">Detailed Targeting</Label>
                                    <InterestPicker
                                        selected={adSet.interests || []}
                                        onChange={(interests) => onUpdate(adSet.id, { interests })}
                                        className="w-full"
                                    />
                                    <p className="text-[10px] text-muted-foreground">Type interests separated by commas.</p>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </CardContent>
        </Card>
    );
}


// --- Main Editor Component ---

export default function CampaignEditorStep({ initialData, onChange }: CampaignEditorStepProps) {

    // Helper to extract safe initial data
    const parsed = initialData?.parsed_json || {};
    const product = parsed.product || initialData?.product || {};
    const adReady = parsed.ad_campaign_ready || {};
    const targeting = adReady.suggested_targeting_params || {};
    const creative = adReady.creative_suggestions || {};

    const snapshots = initialData?.snapshot_urls || [];
    const extractedImages = initialData?.extracted_metadata?.images || [];
    const baseImages = [...snapshots, ...extractedImages].filter((url: any) => typeof url === 'string' && url.length > 0 && !url.startsWith('file:'));

    // Initialize State
    const [state, setState] = useState<EditorState>(() => {
        // Initial setup logic
        const initialAdSets: AdSet[] = [{
            id: "adset_1",
            name: "Ad Set 1",
            locations: Array.isArray(targeting.locations)
                ? targeting.locations.map((l: any) => typeof l === 'string' ? { display_name: l, country: l } : l)
                : [{ display_name: "United States", country: "United States", country_code: "US" }],
            ageMin: Array.isArray(targeting.age_range) ? targeting.age_range[0] : 18,
            ageMax: Array.isArray(targeting.age_range) ? targeting.age_range[1] : 65,
            gender: targeting.gender || "all",
            interests: Array.isArray(targeting.interests)
                ? targeting.interests.map((i: any) => typeof i === 'string' ? { id: `legacy_${i}`, name: i } : i)
                : [],
            headlines: [(creative.headline || product.title || "")],
            primaryTexts: [(creative.primary_text || product.description || "")],
            imageUrls: baseImages.length > 0 ? [baseImages[0]] : [],
            description: product.short_description || "",
            destinationUrl: initialData?.page_url || "",
            cta: "LEARN_MORE"
        }];

        return {
            objective: "TRAFFIC",
            budget: 500,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            adSets: initialAdSets,
            leadingAdSetId: initialAdSets[0].id,
            leadForm: DEFAULT_LEAD_FORM,
            masterPrompt: ""
        };
    });

    const [availableImages, setAvailableImages] = useState<string[]>(baseImages);
    const [isGeneratingImages, setIsGeneratingImages] = useState(false);
    const [openAdSetTargeting, setOpenAdSetTargeting] = useState<Record<string, boolean>>({});

    // Initial sync
    useEffect(() => { onChange(state); }, [state, onChange]);

    // Updater Helpers
    const updateCampaign = <K extends keyof EditorState>(key: K, value: EditorState[K]) => {
        setState(prev => ({ ...prev, [key]: value }));
    };

    const updateAdSet = (id: string, updates: Partial<AdSet>) => {
        setState(prev => ({
            ...prev,
            adSets: prev.adSets.map(a => a.id === id ? { ...a, ...updates } : a)
        }));
    };

    const deleteAdSet = (id: string) => {
        if (state.adSets.length <= 1) {
            toast.error("You must have at least one Ad Set.");
            return;
        }
        setState(prev => ({ ...prev, adSets: prev.adSets.filter(a => a.id !== id) }));
    };

    const addAdSet = () => {
        const nextIdx = state.adSets.length + 1;
        const newId = `adset_${Date.now()} `; // safer ID

        // Smart Distribute: Next unused image
        const usedImages = new Set(state.adSets.flatMap(a => a.imageUrls));
        const nextImage = availableImages.find(img => !usedImages.has(img)) || availableImages[0] || "";

        // Clone settings from first ad set but clean creative
        const base = state.adSets[0];
        const newAdSet: AdSet = {
            ...base,
            id: newId,
            name: `Ad Set ${nextIdx} `,
            imageUrls: [nextImage],
            headlines: [base.headlines[0] || ""],
            primaryTexts: [base.primaryTexts[0] || ""],
        };

        setState(prev => ({ ...prev, adSets: [...prev.adSets, newAdSet] }));
        toast.success(`Ad Set ${nextIdx} added`);

        // Auto-scroll to bottom?
        setTimeout(() => {
            document.getElementById('grid-bottom')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const generateMoreImages = async () => {
        setIsGeneratingImages(true);
        const sourceUrls = snapshots.length > 0 ? snapshots : extractedImages.slice(0, 5);
        if (sourceUrls.length === 0) {
            toast.error("No source images found.");
            setIsGeneratingImages(false);
            return;
        }

        try {
            toast.info("Generating creative variations...");
            const productTitle = product.title || "Product";
            const res = await apiClient.generateFromProdLink({
                product: { source_urls: sourceUrls, title: productTitle },
                prompt: `Create high - performing ads for ${productTitle}.Focus on lifestyle.`,
                model_id: "aws_titan",
                export_resizes: true
            });

            const payload = res.data || res;
            if (payload && payload.items && Array.isArray(payload.items)) {
                const newUrls = payload.items
                    .map((item: any) => item.images && item.images.length > 0 ? item.images[0] : null)
                    .filter(Boolean);

                if (newUrls.length > 0) {
                    setAvailableImages(prev => [...newUrls, ...prev]);
                    toast.success(`Generated ${newUrls.length} new variations!`);
                } else {
                    toast.warning("No images returned.");
                }
            }
        } catch (e) {
            console.error(e);
            toast.error("Error generating images.");
        } finally {
            setIsGeneratingImages(false);
        }
    };


    // --- Auto-Generation Logic ---
    const hasAutoGenerated = useRef(false);
    const [isAutoGenerating, setIsAutoGenerating] = useState(false);

    useEffect(() => {
        const triggerAutoGeneration = async () => {
            if (hasAutoGenerated.current) return;
            // Only run if we have a valid URL and haven't generated yet or if explicitly requested via initialData flags
            if (!initialData?.productUrl) return;

            // Check if we already have meaningful ad sets (user might be coming back to edit)
            // If we have >1 ad set or the first one has images, we assume work has been done.
            if (state.adSets.length > 1 || (state.adSets.length === 1 && state.adSets[0].imageUrls.length > 0)) {
                hasAutoGenerated.current = true;
                return;
            }

            hasAutoGenerated.current = true;
            setIsAutoGenerating(true);

            try {
                toast.info("AI is crafting your campaign...", { description: "Generating images and copy options." });

                // Parallel generation
                // 1. Images
                const sourceUrls = snapshots.length > 0 ? snapshots : extractedImages.slice(0, 5);
                const imgPromise = apiClient.generateFromProdLink({
                    product: { source_urls: sourceUrls, title: product.title || "Product" },
                    prompt: `Create high - performing ads for ${product.title || "product"}.Focus on lifestyle.`,
                    model_id: "aws_titan",
                    export_resizes: true
                }).catch(e => ({ error: e }));

                // 2. Copy
                const copyPromise = apiClient.generateCopy({
                    product: {
                        title: product.title || "This Product",
                        description: initialData.productUrl || ""
                    },
                    prompt: "Write 3 persuasive headlines and 3 primary texts for Facebook Ads.",
                    count: 3
                }).catch(e => ({ error: e }));

                const [imgRes, copyRes] = await Promise.all([imgPromise, copyPromise]);

                // Process Images
                let newImages: string[] = [];
                if (imgRes && !(imgRes as any).error) {
                    const data = (imgRes as any).data || (imgRes as any);
                    const items = data?.items;
                    if (Array.isArray(items)) {
                        newImages = items.map((i: any) => i.images?.[0]).filter(Boolean);
                    }
                }

                if (newImages.length > 0) {
                    setAvailableImages(prev => [...prev, ...newImages]);
                }

                // Process Copy
                let newHeadlines: string[] = [];
                let newPrimaryTexts: string[] = [];

                if (copyRes && !(copyRes as any).error) {
                    const data = (copyRes as any).data || (copyRes as any);
                    const candidates = data?.candidates || data?.data; // handle potential nesting variations
                    if (Array.isArray(candidates)) {
                        newHeadlines = candidates.map((c: any) => c.headline);
                        newPrimaryTexts = candidates.map((c: any) => c.primaryText);
                    }
                }

                // Fallbacks if generation failed or returned empty - essential for the grid to look okay
                if (newImages.length === 0) newImages = ["https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=1000&q=80"];
                if (newHeadlines.length === 0) newHeadlines = [product.title || "Amazing Product"];
                if (newPrimaryTexts.length === 0) newPrimaryTexts = [product.description || "Check out this amazing product today!"];

                // Distribute into 3 Ad Sets
                const generatedSets: AdSet[] = [];
                // We want exactly 3 sets if possible
                for (let i = 0; i < 3; i++) {
                    const img = newImages[i % newImages.length];
                    const head = newHeadlines[i % newHeadlines.length];
                    const prim = newPrimaryTexts[i % newPrimaryTexts.length];

                    generatedSets.push({
                        id: `adset_auto_${i}_${Date.now()} `,
                        name: `Ad Set ${i + 1} `,
                        locations: state.adSets[0].locations, // Use initial ad set's location structure
                        ageMin: state.adSets[0].ageMin,
                        ageMax: state.adSets[0].ageMax,
                        gender: state.adSets[0].gender,
                        interests: state.adSets[0].interests,
                        headlines: [head],
                        primaryTexts: [prim],
                        imageUrls: [img],
                        description: '',
                        destinationUrl: initialData.page_url || '',
                        cta: 'SHOP_NOW'
                    });
                }

                if (generatedSets.length > 0) {
                    setState(prev => ({
                        ...prev,
                        adSets: generatedSets,
                        leadingAdSetId: generatedSets[0].id
                    }));
                    toast.success("Campaign Auto-Generated!", { description: "3 Optimized Ad Sets created." });
                }

            } catch (error) {
                console.error("Auto-generation failed", error);
                toast.error("Auto-generation failed", { description: "Please manually add creative assets." });
            } finally {
                setIsAutoGenerating(false);
            }
        };

        triggerAutoGeneration();
    }, [initialData?.productUrl]); // Dependency on the URL

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 h-[calc(100vh-140px)] relative">
            {/* GLOBAL LOADER OVERLAY */}
            {isAutoGenerating && (
                <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 rounded-lg border border-indigo-50">
                    <div className="bg-white p-8 rounded-2xl shadow-xl border border-indigo-100 max-w-md w-full animate-in fade-in zoom-in duration-500">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
                            <Loader2 className="w-16 h-16 text-indigo-600 animate-spin relative z-10 mx-auto" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">AI is Crafting Your Campaign</h3>
                        <p className="text-slate-500 mb-6">
                            Analyzing <strong>{initialData?.productUrl || 'your link'}</strong>...<br />
                            Generating high-converting images and copy...
                        </p>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden w-full">
                            <div className="h-full bg-indigo-600 rounded-full w-2/3 animate-[shimmer_2s_infinite]"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER CONTROLS REMOVED AS PER USER REQUEST */}
            {/* Minimal Add Button - Keeping it in the global view or just rely on the grid card */}
            <div className="flex justify-end px-1">
                <Button onClick={addAdSet} className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                    <Plus className="w-4 h-4" /> Add Ad Set
                </Button>
            </div>

            {/* AD SET GRID */}
            <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
                <div className={`grid gap - 6 pb - 10 ${state.adSets.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'} `}>
                    {state.adSets.map(adSet => (
                        <div key={adSet.id} className="min-w-0">
                            <AdSetCard
                                adSet={adSet}
                                onUpdate={updateAdSet}
                                onDelete={deleteAdSet}
                                availableImages={availableImages}
                                onGenerateMore={generateMoreImages}
                                isGenerating={isGeneratingImages}
                                isOpen={!!openAdSetTargeting[adSet.id]}
                                onToggle={() => setOpenAdSetTargeting(prev => ({ ...prev, [adSet.id]: !prev[adSet.id] }))}
                            />
                        </div>
                    ))}
                    <div id="grid-bottom" />
                </div>
            </div>

            {/* Info Tip */}
            <div className="bg-blue-50 p-3 rounded text-xs text-blue-700 text-center flex-shrink-0">
                <Sparkles className="w-3 h-3 inline-block mr-1" />
                Each card represents a unique Ad Set. Meta will optimize delivery for each set independently.
            </div>
        </div>
    );
}
