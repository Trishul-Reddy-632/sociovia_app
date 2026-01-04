// src/components/FinalPreview_with_sanitizer.tsx
import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, Eye, Save, ClipboardCopy, ExternalLink } from "lucide-react";
import type { ProductData, CreativeData, CopyVariation, CampaignConfigData } from "@/pages/AICampaignBuilder";
import { useToast } from "@/hooks/use-toast";

// API Base URL from environment
const API_BASE = (import.meta.env.VITE_API_BASE ?? "").toString().replace(/\/$/, "");

/**
 * FinalPreview_with_sanitizer.tsx
 *
 * - Sanitizes preview HTML (removes <script>, meta-refresh, link[rel=preload], inline on* handlers)
 * - Auto-fetches Meta previews when creative/selectedCopy arrive (debounced)
 * - Uses AbortController to cancel inflight preview requests
 * - Renders the preview directly as an <iframe> using width/height parsed from preview HTML
 * - Extracts inner iframe src from preview_html markup to avoid nested iframes; forces remote load with allow-scripts
 * - Forces allow-scripts for remote FB iframes (trusted domain)
 * - Optional: Suppresses preload console warnings (dev-only)
 */

// -----------------------------
// Helper: sanitize preview HTML
// -----------------------------
function sanitizePreviewHtml(html: string, baseHref?: string) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Remove script tags
    doc.querySelectorAll("script").forEach((n) => n.remove());

    // Remove meta refresh tags
    doc.querySelectorAll('meta[http-equiv="refresh"]').forEach((n) => n.remove());

    // Remove link rel=preload (avoids preload warnings)
    doc.querySelectorAll('link[rel="preload"]').forEach((n) => n.remove());

    // Remove inline event handlers (on*) to reduce inline scripts
    doc.querySelectorAll("*").forEach((el) => {
      const attrs = Array.from(el.attributes || []);
      attrs.forEach((attr) => {
        if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
      });
    });

    // Inject base href if provided so relative URLs resolve correctly
    if (baseHref) {
      let base = doc.querySelector("base");
      if (!base) {
        base = doc.createElement("base");
        doc.head.insertBefore(base, doc.head.firstChild);
      }
      base.setAttribute("href", baseHref);
    }

    return "<!doctype html>\n" + doc.documentElement.outerHTML;
  } catch (err) {
    // Fallback: conservative regex-based stripping
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<meta[^>]*http-equiv=[\"']?refresh[\"']?[^>]*>/gi, "")
      .replace(/<link[^>]*rel=[\"']?preload[\"']?[^>]*>/gi, "");
  }
}

// -----------------------------
// Extract inner iframe src from markup
// -----------------------------
function extractInnerIframeSrc(previewHtml?: string | null): string | null {
  if (!previewHtml) return null;
  const match = previewHtml.match(/<iframe\s+[^>]*src\s*=\s*(?:"([^"]+)"|'([^']+)')/i);
  if (match) {
    const src = match[1] || match[2];
    return src ? src.replace(/&amp;/g, "&") : null;
  }
  return null;
}

// -----------------------------
// Small helper: parse width/height from iframe markup
// -----------------------------
function parseIframeDimensions(fragment?: string | null) {
  if (!fragment) return { width: undefined as string | undefined, height: undefined as string | undefined };
  try {
    const wMatch = fragment.match(/width=(?:'|")?(\d+%?)(?:'|")?/i) || fragment.match(/width=["']?(\d+%?)["']?/i);
    const hMatch = fragment.match(/height=(?:'|")?(\d+%?)(?:'|")?/i) || fragment.match(/height=["']?(\d+%?)["']?/i);

    const width = wMatch && wMatch[1] ? wMatch[1] : undefined;
    const height = hMatch && hMatch[1] ? hMatch[1] : undefined;
    return { width, height };
  } catch {
    return { width: undefined, height: undefined };
  }
}

// -----------------------------
// Component props
// -----------------------------
interface FinalPreviewProps {
  productData: ProductData | null;
  creative: CreativeData | null;
  selectedCopy: CopyVariation | undefined;
  config: CampaignConfigData;
  onLaunch?: () => void;
  allowUnsafeScripts?: boolean;
  autoFetch?: boolean;
  suppressPreloadWarnings?: boolean; // NEW: Dev flag to quiet console
}

export default function FinalPreviewWithSanitizer({
  productData,
  creative,
  selectedCopy,
  config,
  onLaunch,
  allowUnsafeScripts = false,
  autoFetch = true,
  suppressPreloadWarnings = true, // Default: on for cleaner dev experience
}: FinalPreviewProps) {
  const { toast } = useToast();

  // Helper to parse preview errors into user-friendly messages
  const parsePreviewError = (err: any): { title: string; message: string; isSessionError: boolean } => {
    const errStr = typeof err === 'string' ? err : (err?.message || err?.error || JSON.stringify(err) || '');

    if (errStr.toLowerCase().includes('session') || errStr.toLowerCase().includes('token') ||
      errStr.includes('invalidated') || errStr.includes('OAuthException')) {
      return {
        title: 'Meta Session Expired',
        message: 'Your Meta session has expired. Please reconnect your account.',
        isSessionError: true
      };
    }
    if (errStr.toLowerCase().includes('permission') || errStr.includes('#200')) {
      return {
        title: 'Permission Required',
        message: 'Additional permissions may be required for previews.',
        isSessionError: true
      };
    }
    if (errStr.toLowerCase().includes('cors') || errStr.toLowerCase().includes('network') ||
      errStr.toLowerCase().includes('failed to fetch')) {
      return {
        title: 'Network Error',
        message: 'Unable to connect to the server. Please check your connection.',
        isSessionError: false
      };
    }
    if (errStr.toLowerCase().includes('sandbox') || errStr.toLowerCase().includes('iframe')) {
      return {
        title: 'Preview Blocked',
        message: 'Preview couldn\'t load due to security restrictions. Try "Open in new tab".',
        isSessionError: false
      };
    }
    return {
      title: 'Preview Unavailable',
      message: 'Unable to generate preview. You can still publish your campaign.',
      isSessionError: false
    };
  };

  // publishing state
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<any | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  // preview states
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<{ title: string; message: string; isSessionError: boolean } | null>(null);

  const [previewList, setPreviewList] = useState<any[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  // local toggle for scripts (user-controlled, but overridden for remote FB)
  const [allowScriptsLocal, setAllowScriptsLocal] = useState<boolean>(allowUnsafeScripts);
  const [sanitizedHtml, setSanitizedHtml] = useState<string | null>(null);

  // abort controller for preview fetch
  const previewControllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  // NEW: Suppress preload warnings (dev-only hack)
  useEffect(() => {
    if (!suppressPreloadWarnings) return;
    const originalWarn = console.warn;
    const suppressed = (...args: any[]) => {
      if (typeof args[0] === "string" && args[0].includes("preloaded using link preload but not used")) {
        return; // Ignore FB preload noise
      }
      originalWarn(...args);
    };
    console.warn = suppressed;
    return () => {
      console.warn = originalWarn;
    };
  }, [suppressPreloadWarnings]);

  useEffect(() => {
    if (!autoFetch) return;
    if (!creative || !selectedCopy) return;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      handleTestPreview();
    }, 300);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creative, selectedCopy, config?.destinationUrl]);

  useEffect(() => {
    return () => {
      if (previewControllerRef.current) previewControllerRef.current.abort();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    // whenever previewHtml or chosen preview changes, sanitize
    const raw = previewHtml ?? (previewList[previewIndex]?.preview_html ?? null);
    if (!raw) {
      setSanitizedHtml(null);
      return;
    }
    // attempt to infer baseHref from iframe src if present
    let baseHref: string | undefined;
    try {
      const iframeSrc = previewList[previewIndex]?.iframe_src;
      if (iframeSrc) baseHref = new URL(iframeSrc).origin;
    } catch (e) {
      baseHref = undefined;
    }
    const sanitized = sanitizePreviewHtml(raw, baseHref);
    setSanitizedHtml(sanitized);
  }, [previewHtml, previewList, previewIndex]);

  const currentPreview = previewList[previewIndex] ?? null;
  const isRemoteSrc = !!currentPreview?.iframe_src;

  // -----------------------------
  // Build publish payload
  // -----------------------------
  const buildPublishPayload = () => {
    const campaign_name = config.campaignName || `Campaign - ${productData?.title || "Untitled"}`;
    const adset_name = config.adsetName || `Adset - ${productData?.title || "Untitled"}`;
    const ad_name = config.adName || `Ad - ${productData?.title || "Untitled"}`;

    const daily_budget = Number(config.budget || 100);
    const start_in_days = computeStartInDays(config.startDate);
    const duration_days = Number(config.durationDays || 7);

    const creative_payload = {
      primaryText: selectedCopy?.description || selectedCopy?.headline || creative?.altText || "",
      headline: selectedCopy?.headline || productData?.title || "",
      description: selectedCopy?.description || (productData as any)?.shortDescription || "",
      cta: (selectedCopy as any)?.cta || "LEARN_MORE",
      url: (config as any).destinationUrl || (creative as any)?.link || (productData as any)?.pageUrl || "https://www.sociovia.com",
      image_url: (creative as any)?.imageUrl,
      object_story_spec: (creative as any)?.object_story_spec ?? undefined,
    };

    const payload: any = {
      campaign_name,
      adset_name,
      ad_name,
      creative: creative_payload,
      daily_budget,
      start_in_days,
      duration_days,
      countries: Array.isArray(config.countries) ? config.countries : (config.country ? [config.country] : ["US"]),
      objective: config.objective || "TRAFFIC",
      special_ad_categories: (config as any).special_ad_categories || [],
      bid_strategy: (config as any).bid_strategy || undefined,
      bid_amount: (config as any).bid_amount || undefined,
    };

    payload.product = {
      title: productData?.title,
      asin: (productData as any)?.asin || null,
      source_urls: (productData as any)?.source_urls || (productData as any)?.sourceUrls || undefined,
    };

    return payload;
  };

  async function handlePublish() {
    if (publishing) return;
    setPublishing(true);
    setPublishError(null);
    setPublishResult(null);

    const payload = buildPublishPayload();

    // Get workspace_id and user_id from localStorage for token lookup
    let workspaceIdStr = localStorage.getItem("sv_selected_workspace_id");
    let userIdStr = localStorage.getItem("sv_user_id");

    if (!workspaceIdStr || !userIdStr) {
      const userObjRaw = localStorage.getItem("sv_user");
      if (userObjRaw) {
        try {
          const u = JSON.parse(userObjRaw);
          if (u.id) userIdStr = String(u.id);
        } catch (e) {
          console.error("Failed to parse sv_user", e);
        }
      }
    }

    if (!workspaceIdStr || !userIdStr) {
      setPublishError("Missing workspace or user context. Please refresh the page or log in again.");
      setPublishing(false);
      return;
    }

    const workspaceId = Number(workspaceIdStr);
    const userId = Number(userIdStr);

    const publishPayload = {
      ...payload,
      workspace_id: workspaceId,
      user_id: userId,
    };

    try {
      const res = await fetch(`${API_BASE}/api/publish_v2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(publishPayload),
      });

      const json = await (async () => {
        try {
          return await res.json();
        } catch {
          const t = await res.text().catch(() => "");
          return { ok: false, error: `invalid_json_response: ${t || res.statusText}`, status: res.status };
        }
      })();

      if (!res.ok) {
        const msg = json?.details || json?.error || json?.message || `HTTP ${res.status}`;
        setPublishError(String(msg));
        toast({ title: "Publish failed", description: String(msg), variant: "destructive" });
      } else {
        setPublishResult(json);
        toast({ title: "Publish succeeded", description: "Campaign created in Facebook (paused)" });
        if (typeof onLaunch === "function") onLaunch();
      }
    } catch (err: any) {
      setPublishError(String(err?.message ?? err));
      toast({ title: "Network error", description: String(err?.message ?? err), variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  }

  // -----------------------------
  // preview fetch (backend FB adpreviews)
  // -----------------------------
  async function handleTestPreview() {
    if (previewControllerRef.current) previewControllerRef.current.abort();
    const controller = new AbortController();
    previewControllerRef.current = controller;

    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewHtml(null);
    setPreviewList([]);
    setPreviewIndex(0);

    if (!creative || !selectedCopy) {
      setPreviewError({ title: 'Missing Data', message: 'Missing creative or copy to create preview.', isSessionError: false });
      setPreviewLoading(false);
      return;
    }

    const creativeForPreview = {
      title: selectedCopy.headline || (creative as any).altText || productData?.title || "",
      body: selectedCopy.description || (creative as any).altText || (productData as any)?.shortDescription || "",
      object_url: (config as any).destinationUrl || (creative as any).link || (productData as any).pageUrl || "https://www.sociovia.com",
      image_url: (creative as any).imageUrl,
      object_story_spec: (creative as any)?.object_story_spec ?? undefined,
    };

    // Get workspace_id and user_id from localStorage for token lookup
    let workspaceId: string | number | null = null;
    let userId: string | number | null = null;
    try {
      const rawWs = localStorage.getItem('sv_selected_workspace_id');
      if (rawWs && String(rawWs).trim() !== '') workspaceId = Number.isFinite(Number(rawWs)) ? Number(rawWs) : rawWs;
      const rawUser = localStorage.getItem('sv_user_id');
      if (rawUser && String(rawUser).trim() !== '') userId = Number.isFinite(Number(rawUser)) ? Number(rawUser) : rawUser;
    } catch { }

    const reqBody = {
      ad_formats: ["MOBILE_FEED_STANDARD", "INSTAGRAM_STANDARD"],
      creative: creativeForPreview,
      preview_options: {},
      workspace_id: workspaceId ?? undefined,
      user_id: userId ?? undefined
    };

    try {
      const res = await fetch(`${API_BASE}/api/facebook/adpreviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
        signal: controller.signal,
      });

      const json = await res.json().catch(() => ({ ok: false, error: "invalid_json" }));

      if (!res.ok || !json.ok) {
        const err = json?.error || json?.detail || json?.message || `HTTP ${res.status}`;
        setPreviewError(parsePreviewError(err));
        setPreviewLoading(false);
        return;
      }

      const previews = Array.isArray(json.previews) ? json.previews : [];
      if (previews.length === 0) {
        setPreviewError({ title: 'No Previews', message: 'No previews returned from backend.', isSessionError: false });
        setPreviewLoading(false);
        return;
      }

      const normalized = previews.map((p: any) => {
        const raw = p.raw ?? p;
        let iframe_src = p.iframe_src ?? null;
        let preview_html_local = p.preview_html ?? null;

        if (!iframe_src && raw && raw.data && Array.isArray(raw.data) && raw.data[0]) {
          const first = raw.data[0];
          if (first.iframe) iframe_src = first.iframe;
          else if (first.body && !preview_html_local) preview_html_local = first.body;
          else if (first.html && !preview_html_local) preview_html_local = first.html;
        }
        if (!preview_html_local && raw && typeof raw.text === "string" && raw.text.trim()) {
          preview_html_local = raw.text;
        }

        if (iframe_src) {
          iframe_src = htmlDecode(iframe_src)?.replace(/&amp;/g, "&") ?? iframe_src;
          const extracted = extractIframeSrc(iframe_src);
          if (extracted) iframe_src = extracted;
        }
        if (preview_html_local) preview_html_local = htmlDecode(preview_html_local);

        let iframe_markup = null;

        if (preview_html_local && preview_html_local.includes("<iframe")) {
          const innerSrc = extractInnerIframeSrc(preview_html_local);
          if (innerSrc) {
            iframe_src = innerSrc;
            iframe_markup = preview_html_local;
            preview_html_local = null;
          }
        }

        let effectiveSrc = null;
        let effectiveHtml = null;
        if (preview_html_local) {
          effectiveSrc = null;
          effectiveHtml = preview_html_local;
        } else if (iframe_src) {
          effectiveSrc = iframe_src;
          effectiveHtml = null;
        }

        return {
          format: p.format || (raw && raw.format) || "preview",
          iframe_src: effectiveSrc,
          preview_html: effectiveHtml,
          iframe_markup,
          raw,
          ok: p.ok !== false,
        };
      });

      console.log("[FinalPreview Debug]", { normalized, hasHtml: normalized.some((n) => !!n.preview_html), hasRemote: normalized.some((n) => !!n.iframe_src) });

      setPreviewList(normalized);

      const firstIdx = normalized.findIndex((n: any) => n.iframe_src || n.preview_html);
      const chosenIndex = firstIdx >= 0 ? firstIdx : 0;
      setPreviewIndex(chosenIndex);

      const chosen = normalized[chosenIndex];
      if (chosen) {
        if (chosen.iframe_src) setPreviewHtml(null);
        else if (chosen.preview_html) setPreviewHtml(chosen.preview_html);
        else setPreviewHtml(null);
      }

      if (normalized.some((n) => !!n.iframe_src)) {
        toast({
          title: "Preview Tip",
          description: "Using remote iframe (limited by FB). For best results, enable backend sanitization.",
          duration: 4000,
        });
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        console.info("[FinalPreview] preview fetch aborted");
      } else {
        setPreviewError(parsePreviewError(err));
      }
    } finally {
      setPreviewLoading(false);
      previewControllerRef.current = null;
    }
  }

  const selectPreview = (idx: number) => {
    setPreviewIndex(idx);
    setPreviewError(null);
    const chosen = previewList[idx];
    if (!chosen) {
      setPreviewHtml(null);
      return;
    }
    if (chosen.iframe_src) setPreviewHtml(null);
    else if (chosen.preview_html) setPreviewHtml(chosen.preview_html);
    else setPreviewHtml(null);
  };

  const handleIframeError = (e?: any) => {
    console.error("[Iframe Error]", e);
    setPreviewError({ title: 'Preview Blocked', message: 'Preview couldn\'t load due to security restrictions. Try "Open in new tab".', isSessionError: false });
    toast({
      title: "Load Error",
      description: "Iframe blocked—likely scripts/redirects. Enable full scripts or check backend.",
      variant: "destructive",
    });
  };

  const openPreviewInTab = () => {
    const chosen = previewList[previewIndex];
    const raw = chosen?.iframe_src ?? chosen?.preview_html ?? chosen?.iframe_markup;
    const decoded = htmlDecode(raw);
    const url = extractIframeSrc(decoded) ?? extractInnerIframeSrc(decoded) ?? decoded;
    if (url) window.open(url, "_blank", "noopener");
    else toast({ title: "No preview URL", description: "No preview URL available to open in new tab.", variant: "destructive" });
  };

  const copyPreviewUrl = async () => {
    const chosen = previewList[previewIndex];
    const raw = chosen?.iframe_src ?? chosen?.preview_html ?? chosen?.iframe_markup;
    const decoded = htmlDecode(raw);
    const url = extractIframeSrc(decoded) ?? extractInnerIframeSrc(decoded) ?? decoded;
    if (!url) return toast({ title: "No preview URL", description: "No preview URL available to copy.", variant: "destructive" });
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Copied", description: "Preview URL copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Could not copy preview URL to clipboard." });
    }
  };

  if (!productData || !creative || !selectedCopy) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground text-center">Complete all previous steps to see your campaign preview</p>
        </CardContent>
      </Card>
    );
  }

  const iframeSrcForRender = currentPreview?.iframe_src ?? null;
  const srcDocForRender = sanitizedHtml ?? previewHtml ?? currentPreview?.preview_html ?? null;

  const isFbDomain = iframeSrcForRender && iframeSrcForRender.includes("facebook.com");
  const effectiveSandbox =
    allowScriptsLocal || isRemoteSrc || isFbDomain
      ? "allow-same-origin allow-popups allow-forms allow-scripts allow-top-navigation-by-user-activation"
      : "allow-same-origin allow-popups allow-forms";

  const iframeMarkup =
    currentPreview?.iframe_markup ??
    (currentPreview?.preview_html as string | undefined) ??
    (Array.isArray(currentPreview?.raw?.data) && currentPreview.raw.data[0]?.body) ??
    null;

  const { width: parsedWidth, height: parsedHeight } = parseIframeDimensions(iframeMarkup);

  const widthProp = parsedWidth ? (parsedWidth.trim().endsWith("%") ? parsedWidth.trim() : Number(parsedWidth.trim())) : undefined;
  const heightProp = parsedHeight ? (parsedHeight.trim().endsWith("%") ? parsedHeight.trim() : Number(parsedHeight.trim())) : undefined;

  // LIMITS for preview sizes (prevents overflowing UI)
  const PREVIEW_MAX_HEIGHT = 420; // px
  const PREVIEW_MIN_HEIGHT = 180; // px

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Final Campaign Preview</CardTitle>
          <CardDescription>Review your AI-generated campaign before launch</CardDescription>
        </CardHeader>

        <CardContent>
          {/* Grid: smaller preview on large screens (2 of 4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Ad Preview</h3>
                <div className="text-xs text-muted-foreground">Auto-loaded from Meta previews</div>
              </div>

              <Card className="border-primary/20">
                <CardContent className="p-0 relative">
                  <div
                    className="w-full bg-muted rounded-t-lg overflow-hidden"
                    style={{ minHeight: PREVIEW_MIN_HEIGHT, maxHeight: PREVIEW_MAX_HEIGHT }}
                  >
                    {previewLoading && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center">
                        <div className="animate-pulse p-6 text-center">
                          <div className="h-6 w-48 bg-gray-300 rounded mb-4" />
                          <div className="h-3 w-64 bg-gray-200 rounded mb-2" />
                          <div className="h-3 w-40 bg-gray-200 rounded" />
                        </div>
                      </div>
                    )}

                    {/* === DIRECT IFRAME RENDER === */}
                    {srcDocForRender ? (
                      <iframe
                        key={`srcdoc-${previewIndex}`}
                        title="ad-preview-srcdoc"
                        srcDoc={srcDocForRender}
                        width={widthProp as any}
                        height={heightProp as any || PREVIEW_MAX_HEIGHT}
                        style={{
                          border: "none",
                          display: "block",
                          width: widthProp === undefined ? "100%" : undefined,
                          maxHeight: PREVIEW_MAX_HEIGHT,
                        }}
                        sandbox={effectiveSandbox}
                        onError={handleIframeError}
                        loading="eager"
                      />
                    ) : iframeSrcForRender ? (
                      <iframe
                        key={String(iframeSrcForRender)}
                        title={`ad-preview-${previewIndex}`}
                        src={iframeSrcForRender}
                        width={widthProp as any}
                        height={heightProp as any || PREVIEW_MAX_HEIGHT}
                        style={{
                          border: "none",
                          display: "block",
                          width: widthProp === undefined ? "100%" : undefined,
                          maxHeight: PREVIEW_MAX_HEIGHT,
                        }}
                        sandbox={effectiveSandbox}
                        onError={handleIframeError}
                        loading="eager"
                      />
                    ) : (
                      <img
                        src={(creative as any).imageUrl}
                        alt="Ad Creative"
                        style={{ width: "100%", height: "auto", display: "block", border: "none", maxHeight: PREVIEW_MAX_HEIGHT }}
                      />
                    )}
                  </div>

                  <div className="p-2 flex justify-between items-center">
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" onClick={openPreviewInTab} className="min-w-0">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        <span className="truncate">Open in new tab</span>
                      </Button>
                      <Button variant="ghost" onClick={copyPreviewUrl} className="min-w-0">
                        <ClipboardCopy className="w-4 h-4 mr-2" />
                        <span className="truncate">Copy URL</span>
                      </Button>
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">If preview requires login or looks broken, open in new tab.</span>
                  </div>

                  {/* Warning for remote loads */}
                  {isRemoteSrc && (
                    <div className="m-3 p-3 rounded bg-yellow-50 border border-yellow-100 text-sm text-yellow-800">
                      Remote FB preview loaded with scripts enabled (for full functionality).{" "}
                      <button onClick={() => setAllowScriptsLocal(false)} className="underline">
                        Disable scripts
                      </button>{" "}
                      for extra safety (may break interactions).
                    </div>
                  )}
                  {((previewList[previewIndex]?.raw && (String(previewList[previewIndex].raw).includes("<script") || String(previewList[previewIndex].raw).includes('http-equiv="refresh"'))) ||
                    previewHtml) &&
                    !allowScriptsLocal &&
                    !isRemoteSrc && (
                      <div className="m-3 p-3 rounded bg-yellow-50 border border-yellow-100 text-sm text-yellow-800">
                        Scripts and meta-refresh were removed from the preview for safety. If you trust the preview source,{" "}
                        <button onClick={() => setAllowScriptsLocal(true)} className="underline">
                          enable scripts
                        </button>{" "}
                        (runs remote JS).
                      </div>
                    )}
                </CardContent>
              </Card>

              <div>
                {previewError && (
                  <div className={`p-3 rounded-lg border ${previewError.isSessionError ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm font-medium ${previewError.isSessionError ? 'text-amber-700' : 'text-red-700'}`}>{previewError.title}</p>
                        <p className={`text-xs mt-0.5 ${previewError.isSessionError ? 'text-amber-600' : 'text-red-600'}`}>{previewError.message}</p>
                      </div>
                      <button
                        onClick={() => setPreviewError(null)}
                        className={`text-xs px-2 py-1 rounded hover:bg-opacity-50 ${previewError.isSessionError ? 'text-amber-600 hover:bg-amber-100' : 'text-red-600 hover:bg-red-100'}`}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
                {!previewHtml && !previewLoading && !previewError && <div className="text-xs text-muted-foreground">Preview auto-fetched — still no preview? Click "Test Preview".</div>}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-semibold">Campaign Details</h3>
              <div className="space-y-3 border rounded p-3">
                <DetailRow label="Product" value={(productData as any).title || ""} />
                <DetailRow label="Objective" value={config.objective || "TRAFFIC"} />
                <DetailRow label="Budget" value={`₹${config.budget || "100"}/day`} />
                <DetailRow label="Duration" value={`${config.startDate || "Today"} — ${config.endDate || "End"}`} />
                <DetailRow label="Audience" value={Array.isArray((config as any).countries) ? (config as any).countries.join(", ") : (config as any).audience || "Default"} />
                <DetailRow label="Placement" value={(config as any).placement || "Auto"} />
              </div>

              <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                <h4 className="font-medium text-sm text-success mb-2">Ready to Launch</h4>
                <p className="text-xs text-muted-foreground">All campaign elements are configured and ready for deployment</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-2 flex-wrap">
                <Button variant="outline" className="flex-1 min-w-0" onClick={() => toast({ title: "Draft Saved", description: "Your campaign has been saved as a draft." })}>
                  <Save className="w-4 h-4 mr-2" />
                  <span className="truncate">Save as Draft</span>
                </Button>

                <Button variant="outline" className="flex-1 min-w-0" onClick={handleTestPreview} disabled={previewLoading}>
                  <Eye className="w-4 h-4 mr-2" />
                  <span className="truncate">{previewLoading ? "Fetching…" : "Test Preview"}</span>
                </Button>

                <Button className="flex-1 min-w-0 gradient-primary" onClick={handlePublish} disabled={publishing}>
                  {publishing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4 mr-2" />
                      <span className="truncate">Launch Campaign</span>
                    </>
                  )}
                </Button>
              </div>

              {previewList.length > 1 && (
                <div className="pt-2">
                  <div className="flex gap-2 flex-wrap">
                    {previewList.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => selectPreview(i)}
                        className={`text-xs px-3 py-1 rounded ${i === previewIndex ? "bg-primary text-white" : "bg-muted"}`}
                      >
                        {p.format}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {publishError && (
                <div className="p-3 rounded border border-red-200 bg-red-50 text-sm text-red-800">
                  <strong>Publish error:</strong> {publishError}
                </div>
              )}

              {publishResult && (
                <div className="p-3 rounded border border-green-200 bg-green-50 text-sm text-green-900 space-y-2">
                  <div>
                    <strong>Publish response (backend):</strong>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs p-2 bg-white rounded border">{JSON.stringify(publishResult, null, 2)}</pre>
                  {publishResult?.campaign_id && <div>Campaign ID: <code>{publishResult.campaign_id}</code></div>}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// -----------------------------
// Small helpers copied from your original file
// -----------------------------
function computeStartInDays(startDate?: string | null) {
  try {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const now = new Date();
    const ms = start.getTime() - now.getTime();
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  } catch {
    return 0;
  }
}

function htmlDecode(input?: string | null) {
  if (!input) return input;
  try {
    const txt = document.createElement("textarea");
    txt.innerHTML = input;
    return txt.value;
  } catch {
    return input.replace(/&amp;/g, "&");
  }
}

function extractIframeSrc(fragment?: string | null) {
  if (!fragment) return null;
  const decoded = htmlDecode(fragment);
  const m = decoded.match(/<iframe[^>]+src=(?:'|")([^'"]+)(?:'|")/i);
  if (m && m[1]) {
    return m[1].replace(/&amp;/g, "&");
  }
  if (/^https?:\/\//i.test(decoded)) return decoded;
  return null;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium truncate" style={{ maxWidth: 220 }}>
        {value}
      </span>
    </div>
  );
}
