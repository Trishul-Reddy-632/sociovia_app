import { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, Loader2 } from "lucide-react";
import type { ProductData, MetricsData } from "@/pages/AICampaignBuilder";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/config";

interface LinkAnalyzerProps {
  onAnalyzed: (data: ProductData) => void;
  onMetrics: (metrics: MetricsData) => void;
}

export default function LinkAnalyzer({ onAnalyzed, onMetrics }: LinkAnalyzerProps) {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [progressText, setProgressText] = useState<string>("");
  const [parsedJson, setParsedJson] = useState<any | null>(null);
  const { toast } = useToast();
  const streamAbortRef = useRef<AbortController | null>(null);

  const deriveConfidencePercent = (fieldConfidenceObj: Record<string, any> | undefined) => {
    if (!fieldConfidenceObj || typeof fieldConfidenceObj !== "object") return 75;
    const values = Object.values(fieldConfidenceObj);
    if (!values.length) return 75;
    let sum = 0;
    for (const v of values) {
      if (v === "high" || v === 1 || v === 1.0) sum += 100;
      else if (v === "medium" || v === 0.6) sum += 60;
      else sum += 30;
    }
    return Math.round(sum / values.length);
  };

  const handleLinkChange = (v: string) => {
    setLink(v);
    if (analyzed || parsedJson) {
      setAnalyzed(false);
      setParsedJson(null);
    }
  };

  const generateEstimatesFromParsed = async (finalJson: any) => {
    try {
      const adReady = finalJson?.ad_campaign_ready ?? {};
      const suggested = adReady?.suggested_targeting_params ?? {};
      const kpis = adReady?.kpi_suggestions ?? {};

      const estimatedReach = (Array.isArray(suggested.locations) ? suggested.locations.join(", ") : "") || "N/A";
      const estimatedCPC = kpis?.cpa_target_inr ? `₹${kpis.cpa_target_inr}` : "N/A";
      const engagementRate = kpis?.ctr_target_pct ? `${kpis.ctr_target_pct}%` : "N/A";
      const confidencePercent = deriveConfidencePercent(finalJson?.notes_and_confidence?.field_confidence);

      const metrics: MetricsData = {
        estimatedReach,
        estimatedCPC,
        engagementRate,
        confidenceLevel: confidencePercent,
        raw: finalJson?.ad_campaign_ready ?? {},
      } as unknown as MetricsData;

      onMetrics(metrics);
      toast({ title: "Estimates Generated", description: "Metrics were generated and sent." });
    } catch (err) {
      console.error("generateEstimatesFromParsed error:", err);
      toast({ title: "Estimate Failed", description: "Could not generate estimates.", variant: "destructive" });
    }
  };

  const tryExtractFencedJson = (text: string | null) => {
    if (!text) return null;
    const m = text.match(/```json\s*([\s\S]*?)\s*```/i);
    if (m && m[1]) {
      try {
        return JSON.parse(m[1]);
      } catch {}
    }
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      try {
        return JSON.parse(text.slice(first, last + 1));
      } catch {}
    }
    return null;
  };

  const handleAnalyze = async () => {
    if (!link.trim()) {
      toast({
        title: "Invalid Link",
        description: "Please enter a valid product or website link.",
        variant: "destructive",
      });
      return;
    }

    if (streamAbortRef.current) {
      try { streamAbortRef.current.abort(); } catch {}
      streamAbortRef.current = null;
    }

    setLoading(true);
    setAnalyzed(false);
    setProgressText("Analyzing...");
    setParsedJson(null);

    const abortController = new AbortController();
    streamAbortRef.current = abortController;

    try {
      const apiBase = API_BASE_URL;
      const endpoint = `${apiBase.replace(/\/$/, "")}/generatec`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link.trim(), max_snapshots: 3 }),
        signal: abortController.signal,
      });

      const text = await res.text().catch(() => "");
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch {}

      if (!res.ok) {
        const serverMsg = json?.error ?? text ?? `HTTP ${res.status}`;
        throw new Error(serverMsg);
      }

      const parsed = json?.parsed_json ?? tryExtractFencedJson(json?.model_text ?? null);
      if (!parsed) throw new Error("Analyzer returned no parsed JSON.");

      setParsedJson(parsed);

      const prod = parsed.product ?? {};
      const productData: ProductData = {
        title: prod.title ?? "Untitled",
        description: (prod.short_description ?? prod.long_description ?? "").slice(0, 800),
        price: prod.price?.raw_text ?? null,
        category: prod.page_type ?? null,
        image: null, // removed image display
        raw: parsed,
      } as unknown as ProductData;

      onAnalyzed(productData);
      setAnalyzed(true);

      toast({
        title: "Analysis Complete",
        description: "Product data extracted successfully.",
      });
    } catch (err: any) {
      console.error("Analysis error:", err);
      const userMsg = err?.message ?? String(err);
      toast({
        title: "Analysis Failed",
        description: userMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setTimeout(() => setProgressText(""), 3500);
      if (streamAbortRef.current === abortController) streamAbortRef.current = null;
    }
  };

  const previewProduct = () => {
    if (!parsedJson) return null;
    const p = parsedJson.product ?? {};
    return {
      title: p.title ?? "Untitled product",
      desc: (p.short_description ?? p.long_description ?? "").slice(0, 160),
      price: p.price?.raw_text ?? "—",
      category: p.page_type ?? "—",
    };
  };

  const preview = previewProduct();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="w-5 h-5" />
          Product Link Analysis
        </CardTitle>
        <CardDescription>Paste your product or website link to get started</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com/product"
            value={link}
            onChange={(e) => handleLinkChange(e.target.value)}
            disabled={loading}
          />
          <Button onClick={handleAnalyze} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing
              </>
            ) : (
              "Analyze Link"
            )}
          </Button>
        </div>

        {loading && (
          <div className="rounded-md border p-3 text-sm bg-muted-foreground/5">
            <strong>Analyzing…</strong>
            <div className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
              {progressText || "Fetching page and extracting data..."}
            </div>
          </div>
        )}

        {/* ✅ Show product info only (no JSON, no image) */}
        {analyzed && preview && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div>
                <h3 className="font-semibold">{preview.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{preview.desc}</p>
                <div className="flex gap-4 mt-2">
                  <span className="text-sm font-medium">{preview.price}</span>
                  <span className="text-sm text-muted-foreground">{preview.category}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
