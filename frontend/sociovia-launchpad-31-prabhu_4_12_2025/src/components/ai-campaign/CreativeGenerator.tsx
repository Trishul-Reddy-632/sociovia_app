import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Loader2, RefreshCw, Upload, ExternalLink, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductData, CreativeData } from "@/pages/AICampaignBuilder";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/config";

interface CreativeGeneratorProps {
  productData: ProductData;
  onCreativeGenerated: (creative: CreativeData) => void;
}

export default function CreativeGenerator({ productData, onCreativeGenerated }: CreativeGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [creative, setCreative] = useState<CreativeData | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [lastResponseDebug, setLastResponseDebug] = useState<any>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [adPlan, setAdPlan] = useState<any | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState("1:1"); // Default to square

  // Aspect ratio options
  const aspectRatioOptions = [
    { value: "1:1", label: "1:1 Square", desc: "Instagram Feed" },
    { value: "4:5", label: "4:5 Vertical", desc: "Instagram/Facebook" },
    { value: "9:16", label: "9:16 Story", desc: "Stories/Reels" },
    { value: "16:9", label: "16:9 Landscape", desc: "YouTube/LinkedIn" },
  ];

  // default can be changed by tests; keep devtunnel for local testing
  const apiBaseRef = useRef<string>(API_BASE_URL);
  const { toast } = useToast();

  const buildPrompt = () => {
    const grounded = (productData as any).raw ?? {
      title: productData.title,
      short_description: productData.description,
      price: productData.price,
      category: productData.category,
      image: productData.image,
    };
    return `Using the product information provided, generate a high-quality ad creative image suitable for social media advertising. Highlight the product effectively and include a clear call-to-action. Provide images in requested aspect ratios and return either public URLs or file names (if uploaded) in the JSON response. Product info: ${JSON.stringify(grounded)}`;
  };

  // maps short filenames (like "out_0.png") -> full public url using our api base as fallback
  const resolveToPublicUrl = (maybe: string): string | null => {
    if (!maybe) return null;
    if (maybe.startsWith("http://") || maybe.startsWith("https://") || maybe.startsWith("file://")) return maybe;
    const base = apiBaseRef.current.replace(/\/$/, "");
    return `${base}/outputs/${maybe}`;
  };

  // Normalize many server-side response shapes to a list of public URLs
  const normalizeResponseToUrls = (resp: any): string[] => {
    const out: string[] = [];
    if (!resp) return out;

    // explicit convenience fields
    if (typeof resp?.imageUrl === "string") out.push(resp.imageUrl);
    if (typeof resp?.result?.imageUrl === "string") out.push(resp.result.imageUrl);
    if (typeof resp?.data?.imageUrl === "string") out.push(resp.data.imageUrl);

    // items (streaming / generate-from-prodlink)
    if (Array.isArray(resp.items)) {
      resp.items.forEach((it: any) => {
        if (typeof it?.url === "string") out.push(it.url);
        else if (typeof it?.meta?.url === "string") out.push(it.meta.url);
        else if (typeof it?.filename === "string") out.push(resolveToPublicUrl(it.filename) || it.filename);
      });
    }

    // results -> generated list (generate-creatives/generate-creatives-from-base shape)
    if (Array.isArray(resp.results)) {
      resp.results.forEach((r: any) => {
        if (Array.isArray(r.generated)) {
          r.generated.forEach((g: any) => {
            if (typeof g?.url === "string") out.push(g.url);
            else if (typeof g?.meta?.url === "string") out.push(g.meta.url);
            else if (typeof g?.s3_meta?.url === "string") out.push(g.s3_meta.url);
            else if (typeof g?.local_path === "string") out.push(g.local_path);
            else if (typeof g?.filename === "string") out.push(resolveToPublicUrl(g.filename) || g.filename);
          });
        }
        // legacy fields
        if (Array.isArray(r.files)) r.files.forEach((f: any) => typeof f === "string" && out.push(resolveToPublicUrl(f) || f));
        if (Array.isArray(r.urls)) r.urls.forEach((u: any) => typeof u === "string" && out.push(u));
      });
    }

    // top-level arrays
    if (Array.isArray(resp.urls)) resp.urls.forEach((u: any) => typeof u === "string" && out.push(u));
    if (Array.isArray(resp.files)) resp.files.forEach((f: any) => typeof f === "string" && out.push(resolveToPublicUrl(f) || f));

    // fallback deep-scan for http strings
    const queue: any[] = [resp];
    while (queue.length) {
      const cur = queue.shift();
      if (!cur) continue;
      if (typeof cur === "string") {
        if (cur.startsWith("http://") || cur.startsWith("https://")) out.push(cur);
      } else if (Array.isArray(cur)) {
        queue.push(...cur);
      } else if (typeof cur === "object") {
        queue.push(...Object.values(cur));
      }
    }

    // dedupe + filter
    return Array.from(new Set(out)).filter(Boolean);
  };

  // --- Simplified network call using Chat UI's proven endpoint ---
  const callGenerateEndpoint = async () => {
    setGenerating(true);
    setLastResponseDebug(null);
    setGalleryUrls([]);
    setSelectedUrl(null);
    setAdPlan(null);

    // Gather product info for the prompt
    const raw = (productData as any).raw ?? {};
    const title = (raw.product?.title) || raw.title || productData.title || "Product";
    const desc = (raw.product?.short_description) || raw.short_description || productData.description || "";
    const tagline = raw.ad_campaign_ready?.one_sentence_tagline || "";
    const usps = raw.ad_campaign_ready?.top_3_usps || [];
    const uspText = usps.slice(0, 2).join(" | ");

    // Find the first Sociovia snapshot URL to use as reference image
    let referenceImageUrl: string | null = null;
    const sourceUrls = raw.product?.source_urls || raw.source_urls || [];
    for (const url of sourceUrls) {
      if (typeof url === "string" && url.includes("sociovia.blr1.cdn.digitaloceanspaces.com/snapshots/")) {
        referenceImageUrl = url;
        break;
      }
    }

    // Fallback to any image
    if (!referenceImageUrl) {
      const fallbacks = [
        raw.product?.image,
        raw.image,
        productData.image,
        (productData as any).imageUrl,
      ];
      for (const fb of fallbacks) {
        if (typeof fb === "string" && fb.startsWith("http")) {
          referenceImageUrl = fb;
          break;
        }
      }
    }

    if (!referenceImageUrl) {
      toast({
        title: "No reference image",
        description: "Could not find a reference image URL from the analyzed product.",
        variant: "destructive",
      });
      setGenerating(false);
      return;
    }

    // Build a marketing-focused prompt (same style as Chat UI)
    const prompt = `Create a professional, scroll-stopping social media ad creative.

PRODUCT: ${title}
${tagline ? `TAGLINE: ${tagline}` : ""}
${desc ? `DESCRIPTION: ${desc.slice(0, 200)}` : ""}
${uspText ? `KEY BENEFITS: ${uspText}` : ""}

REQUIREMENTS:
1. Create a MODERN, PREMIUM marketing visual suitable for Instagram/Facebook ads
2. Use BOLD, READABLE typography with high contrast
3. Include a COMPELLING headline that grabs attention
4. Design should look PROFESSIONAL and trustworthy
5. Add a clear CALL-TO-ACTION element
6. Use vibrant colors and clean layout

DO NOT include placeholder text like "Headline" or "Lorem ipsum".
Generate a polished, ready-to-publish ad creative.`;

    // Use the Chat UI's endpoint which produces consistent results
    const endpoint = `${apiBaseRef.current.replace(/\/$/, "")}/api/v1/generate-from-image`;

    // Build FormData (matches Chat UI approach)
    const fd = new FormData();
    fd.append("prompt", prompt);
    fd.append("aspect_ratio", aspectRatio); // User-selected aspect ratio
    fd.append("file_uri", referenceImageUrl);

    const controller = new AbortController();
    const TIMEOUT_MS = 180_000;
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, TIMEOUT_MS);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: fd,
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        const txt = await res.text().catch(() => "");
        json = txt || { status: res.status };
      }

      setLastResponseDebug(json);

      if (!res.ok) {
        const msg = (json && (json.error || json.detail || json.message)) || `HTTP ${res.status}`;
        toast({ title: "Generation failed", description: String(msg), variant: "destructive" });
        return;
      }

      // Extract URLs from response (same normalization as before)
      const urls = normalizeResponseToUrls(json);
      if (urls.length) {
        setGalleryUrls(urls);
        setSelectedUrl(urls[0]);
        setCreative({ imageUrl: urls[0], type: "image" });
        toast({ title: "Creative Generated", description: `Generated ${urls.length} image(s) successfully` });
      } else {
        toast({ title: "No image URL", description: "Server returned no usable image URL.", variant: "destructive" });
      }
    } catch (err: any) {
      window.clearTimeout(timeoutId);
      if (err?.name === "AbortError") {
        toast({ title: "Request timed out", description: "Generation took too long. Try again.", variant: "destructive" });
      } else {
        console.error("generate-from-image error", err);
        toast({ title: "Network error", description: String(err?.message ?? err), variant: "destructive" });
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleUseThis = () => {
    const url = selectedUrl ?? creative?.imageUrl;
    if (!url) {
      toast({ title: "No creative", description: "Generate first", variant: "destructive" });
      return;
    }
    const sel: CreativeData = { imageUrl: url, type: creative?.type ?? "image" };
    setCreative(sel);
    onCreativeGenerated(sel);
    toast({ title: "Creative selected" });
  };

  // --- Lightbox helpers ---
  const openLightboxAt = (index: number) => {
    if (!galleryUrls || galleryUrls.length === 0) return;
    const i = Math.max(0, Math.min(index, galleryUrls.length - 1));
    setLightboxIndex(i);
    setLightboxOpen(true);
  };
  const closeLightbox = () => setLightboxOpen(false);
  const nextLightbox = () => setLightboxIndex((i) => (galleryUrls.length ? (i + 1) % galleryUrls.length : i));
  const prevLightbox = () => setLightboxIndex((i) => (galleryUrls.length ? (i - 1 + galleryUrls.length) % galleryUrls.length : i));

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") nextLightbox();
      if (e.key === "ArrowLeft") prevLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, galleryUrls]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          AI-Generated Creative
        </CardTitle>
        <CardDescription>AI-powered image generation based on your product</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!creative ? (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
            <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No creative generated yet</p>

            {/* Aspect Ratio Selector */}
            <div className="mb-4 w-full max-w-md">
              <label className="block text-sm font-medium text-muted-foreground mb-2 text-center">Select Aspect Ratio</label>
              <div className="grid grid-cols-2 gap-2">
                {aspectRatioOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAspectRatio(opt.value)}
                    className={`px-3 py-2 text-sm rounded-md border transition-all ${aspectRatio === opt.value
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-gray-200 hover:border-gray-300 text-muted-foreground"
                      }`}
                  >
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-xs opacity-70">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={callGenerateEndpoint} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Creative
                </>
              ) : (
                "Generate Image"
              )}
            </Button>

            <div className="mt-3 flex gap-2">
              <Button variant="ghost" onClick={() => setShowDebug((d) => !d)}>{showDebug ? "Hide debug" : "Show debug"}</Button>
            </div>

            {showDebug && lastResponseDebug && (
              <pre className="mt-4 max-h-48 overflow-auto text-xs bg-slate-50 p-2 rounded border">{JSON.stringify(lastResponseDebug, null, 2)}</pre>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden">
              {imageLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
              )}

              {/* Main image: click thumbnail below to change selectedUrl. Use the overlayed Open button to open in new tab. Click image area to open lightbox */}
              <div className="relative">
                <img
                  role="button"
                  onClick={() => openLightboxAt(galleryUrls.indexOf(selectedUrl ?? creative.imageUrl))}
                  src={selectedUrl ?? creative.imageUrl}
                  alt="Ad Creative"
                  className="w-full max-h-96 object-contain cursor-zoom-in bg-gray-100"
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    toast({ title: "Image loadfailed", description: "Could not load generated image", variant: "destructive" });
                  }}
                  onLoadStart={() => setImageLoading(true)}
                />

                <div className="absolute top-2 right-2 flex items-center gap-2">
                  <a
                    href={selectedUrl ?? creative.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-white/90 text-black px-2 py-1 rounded text-xs font-medium shadow"
                    title="Open image in a new tab"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open
                  </a>

                  <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">AI Generated</div>
                </div>
              </div>
            </div>

            {/* ad_plan preview */}
            {adPlan && (
              <div className="p-3 bg-muted/10 rounded">
                {adPlan.tagline && <div className="text-sm font-semibold mb-1">Tagline: {adPlan.tagline}</div>}
                {adPlan.caption && <div className="text-xs text-muted-foreground mb-1">{adPlan.caption}</div>}
                {Array.isArray(adPlan.hashtags) && <div className="text-xs text-muted-foreground">Hashtags: {adPlan.hashtags.join(" ")}</div>}
              </div>
            )}

            {galleryUrls.length > 1 && (
              <div className="grid grid-cols-3 gap-2">
                {galleryUrls.map((u, i) => (
                  <button
                    key={u + i}
                    onClick={() => {
                      setSelectedUrl(u);
                    }}
                    className={`border rounded overflow-hidden ${selectedUrl === u ? "ring-2 ring-primary" : ""}`}
                    title={`Select candidate ${i + 1}`}>
                    <img src={u} alt={`candidate-${i + 1}`} className="w-full h-24 object-cover cursor-pointer" />
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={callGenerateEndpoint} disabled={generating}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
              <Button variant="outline" onClick={() => toast({ title: "Upload", description: "Open upload dialog (implement)" })}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Custom
              </Button>
              <Button onClick={handleUseThis}>Use This</Button>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground"><strong>Note:</strong> Video creative support coming soon</p>

              <div className="mt-2">
                <Button size="sm" variant="ghost" onClick={() => setShowDebug((s) => !s)}>{showDebug ? "Hide OCR Debug" : "Show OCR Debug"}</Button>
                {showDebug && lastResponseDebug && (
                  <pre className="mt-2 max-h-48 overflow-auto text-xs bg-slate-50 p-2 rounded border">{JSON.stringify(lastResponseDebug?.results ?? lastResponseDebug, null, 2)}</pre>
                )}
              </div>
            </div>

            {/* LIGHTBOX */}
            {lightboxOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
                role="dialog"
                aria-modal="true"
                onClick={(e) => {
                  // close when clicking on overlay backdrop (not the inner image container)
                  if (e.target === e.currentTarget) closeLightbox();
                }}
              >
                <div className="relative max-w-[90%] max-h-[90%] p-4">
                  <button
                    onClick={closeLightbox}
                    className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow z-50"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Prev */}
                  {galleryUrls.length > 1 && (
                    <button
                      onClick={prevLightbox}
                      className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow z-40"
                      aria-label="Previous">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                  )}

                  {/* Next */}
                  {galleryUrls.length > 1 && (
                    <button
                      onClick={nextLightbox}
                      className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow z-40"
                      aria-label="Next">
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  )}

                  <div className="flex items-center justify-center">
                    <img
                      src={galleryUrls[lightboxIndex]}
                      alt={`creative-large-${lightboxIndex + 1}`}
                      className="max-w-full max-h-[80vh] rounded"
                    />
                  </div>

                  <div className="mt-2 text-center text-xs text-white/90">
                    <div>{lightboxIndex + 1} / {galleryUrls.length}</div>
                    <div className="mt-1">
                      <a href={galleryUrls[lightboxIndex]} target="_blank" rel="noopener noreferrer" className="underline">Open original in new tab</a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
