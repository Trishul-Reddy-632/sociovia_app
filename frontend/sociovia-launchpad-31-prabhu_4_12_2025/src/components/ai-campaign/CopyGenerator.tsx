import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import type { ProductData, CopyVariation } from '@/pages/AICampaignBuilder';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { API_ENDPOINT } from '@/config';

interface CopyGeneratorProps {
  productData: ProductData;
  onCopyGenerated: (variations: CopyVariation[]) => void;
}

const FETCH_TIMEOUT_MS = 40000;
const FETCH_RETRIES = 2;
const INITIAL_BACKOFF_MS = 700;

export default function CopyGenerator({ productData, onCopyGenerated }: CopyGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<CopyVariation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null); // per-item spinner
  const { toast } = useToast();

  // helper: network fetch with retries + timeout (same idea as earlier)
  const fetchWithTimeoutAndRetry = async (url: string, opts: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS, retries = FETCH_RETRIES, backoffMs = INITIAL_BACKOFF_MS) => {
    let attempt = 0;
    let lastErr: any = null;
    while (attempt <= retries) {
      const controller = new AbortController();
      const signal = controller.signal;
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { ...opts, signal });
        clearTimeout(timer);
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          const errMsg = txt || `HTTP ${res.status}`;
          if (res.status >= 500 && attempt < retries) {
            attempt++;
            await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, attempt - 1)));
            continue;
          }
          const e = new Error(errMsg);
          (e as any).status = res.status;
          throw e;
        }
        return res;
      } catch (err: any) {
        clearTimeout(timer);
        lastErr = err;
        const isAbort = err?.name === 'AbortError' || String(err).toLowerCase().includes('timeout');
        if ((isAbort || err instanceof TypeError || (err?.status && err.status >= 500)) && attempt < retries) {
          attempt++;
          await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, attempt - 1)));
          continue;
        }
        throw err;
      }
    }
    throw lastErr ?? new Error("fetchWithTimeoutAndRetry: unknown error");
  };

  const extractJsonBlock = (text: string): string | null => {
    if (!text) return null;
    const fenced = /```json\s*([\s\S]*?)\s*```/i.exec(text);
    if (fenced && fenced[1]) return fenced[1].trim();
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) return text.slice(first, last + 1);
    const a = text.indexOf('[');
    const b = text.lastIndexOf(']');
    if (a !== -1 && b !== -1 && b > a) return text.slice(a, b + 1);
    return null;
  };

  const tryParseJson = (text: string) => {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      const block = extractJsonBlock(text);
      if (!block) return null;
      try { return JSON.parse(block); } catch { return null; }
    }
  };

  // normalize helper (reused by generate + regenerate)
  const normalizeToVariation = (raw: any, fallbackId?: string): CopyVariation => {
    return {
      id: fallbackId ?? String(raw?.id ?? Math.random().toString(36).slice(2, 9)),
      headline: String(raw?.headline || raw?.title || raw?.heading || "").slice(0, 100),
      description: String(raw?.description || raw?.body || raw?.text || "").slice(0, 280),
      cta: String(raw?.cta || raw?.call_to_action || raw?.button || "Learn More").slice(0, 60),
    };
  };

  // Trigger generation (all)
  const handleGenerate = async () => {
    setGenerating(true);
    toast({ title: "Generating copy", description: "AI is creating ad copy variations..." });

    const promptText = `Generate 3 ad copy variations for: ${productData.title}. Description: ${productData.description}. Each should have a headline (max 40 chars), description (max 125 chars), and CTA. Return valid JSON array. IMPORTANT: Ensure strict adherence to Meta Advertising Standards: no misleading claims, no personal attributes assertions, clear and accurate language. Verify spelling and grammar are perfect.`;

    try {
      const res = await fetchWithTimeoutAndRetry(`${API_ENDPOINT}/v1/generate-copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: { title: productData.title, description: productData.description }, prompt: promptText, count: 3 })
      });

      const text = await res.text().catch(() => "");
      let parsed = tryParseJson(text);
      if (!parsed) {
        try {
          const clone = await res.clone().json().catch(() => null);
          if (clone) parsed = clone;
        } catch {}
      }

      // Normalize parsed to variations array
      let newVars: CopyVariation[] = [];
      if (Array.isArray(parsed)) {
        newVars = parsed.map((v, i) => normalizeToVariation(v, String(i + 1)));
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.get?.('variations') ?? parsed.variations ?? null)) {
        const arr = parsed.get?.('variations') ?? parsed.variations;
        newVars = arr.map((v: any, i: number) => normalizeToVariation(v, String(i + 1)));
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.variations)) {
        newVars = parsed.variations.map((v: any, i: number) => normalizeToVariation(v, String(i + 1)));
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed?.data)) {
        newVars = parsed.data.map((v: any, i: number) => normalizeToVariation(v, String(i + 1)));
      }

      // If backend returned wrapper { success: true, variations: [...] }
      if ((!newVars || newVars.length === 0) && parsed && parsed.variations && Array.isArray(parsed.variations)) {
        newVars = parsed.variations.map((v: any, i: number) => normalizeToVariation(v, String(i + 1)));
      }

      // final fallback default
      if (!newVars || newVars.length === 0) {
        newVars = [
          { id: '1', headline: `Get ${productData.title} Today`, description: (productData.description || "").slice(0, 125), cta: 'Shop Now' },
          { id: '2', headline: `Discover ${productData.title}`, description: (productData.description || "").slice(0, 125), cta: 'Learn More' },
          { id: '3', headline: `Limited Offer: ${productData.title}`, description: (productData.description || "").slice(0, 125), cta: 'Get Offer' },
        ];
        toast({ title: "Used fallback copy", description: "Could not parse AI response.", variant: "destructive" });
      }

      // ensure ids & trim sizes
      newVars = newVars.slice(0, 10).map((v, i) => ({ ...v, id: String(i + 1) }));
      setVariations(newVars);
      setSelectedId(newVars[0]?.id ?? null);
      onCopyGenerated(newVars);
      toast({ title: "Copy Generated", description: `${newVars.length} variations loaded` });
    } catch (err: any) {
      console.error("Copy generation error", err);
      toast({ title: "Copy generation failed", description: String(err?.message ?? err), variant: "destructive" });
      // fallback
      const fallback = [
        { id: '1', headline: `Get ${productData.title} Today`, description: (productData.description || "").slice(0, 125), cta: 'Shop Now' }
      ];
      setVariations(fallback);
      setSelectedId(fallback[0].id);
      onCopyGenerated(fallback);
    } finally {
      setGenerating(false);
    }
  };

  // Editable fields handlers
  const updateVariationField = (id: string, field: keyof CopyVariation, value: string) => {
    setVariations(prev => {
      const next = prev.map(v => v.id === id ? { ...v, [field]: value } : v);
      // keep parent in sync
      onCopyGenerated(next);
      return next;
    });
  };

  const handleUseSelected = () => {
    const sel = variations.filter(v => v.id === selectedId);
    if (!sel || sel.length === 0) {
      toast({ title: "No selection", description: "Select a variation first", variant: "destructive" });
      return;
    }
    onCopyGenerated(sel);
    toast({ title: "Selected copy applied" });
  };

  // NEW: regenerate one variation using the SAME /generate-copy endpoint (count:1)
  const handleRegenerateOne = async (id: string) => {
    const existing = variations.find(v => v.id === id);
    if (!existing) {
      toast({ title: "Variation not found", variant: "destructive" });
      return;
    }

    setRegeneratingId(id);
    toast({ title: "Regenerating", description: "Requesting single variation from server..." });

    try {
      const promptForOne = `Regenerate a single ad copy variation for product "${productData.title}". 
Current variation: headline="${existing.headline}", description="${existing.description}", cta="${existing.cta}".
Product description: ${productData.description}.
Produce one fresh variation (headline max 40 chars, description max 125 chars, short CTA).
Return ONLY a JSON object or a single-item JSON array.
IMPORTANT: Ensure strict adherence to Meta Advertising Standards: no misleading claims, no personal attributes assertions, clear and accurate language. Verify spelling and grammar are perfect.`;

      const res = await fetchWithTimeoutAndRetry(`${API_ENDPOINT}/v1/generate-copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: { title: productData.title, description: productData.description },
          prompt: promptForOne,
          count: 1
        })
      });

      const text = await res.text().catch(() => "");
      let parsed = tryParseJson(text);
      if (!parsed) {
        try { parsed = await res.clone().json().catch(() => null); } catch {}
      }

      // Normalize to single variation object
      let newVarRaw: any = null;
      if (Array.isArray(parsed) && parsed.length > 0) newVarRaw = parsed[0];
      else if (parsed && typeof parsed === 'object') {
        // prefer an object directly, or variations/data wrapper
        if (parsed.variations && Array.isArray(parsed.variations) && parsed.variations.length > 0) newVarRaw = parsed.variations[0];
        else if (parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) newVarRaw = parsed.data[0];
        else newVarRaw = parsed;
      }

      if (!newVarRaw) {
        throw new Error("Could not parse regenerated variation from server");
      }

      const normalized = normalizeToVariation(newVarRaw, id);

      // Replace in-place
      setVariations(prev => {
        const next = prev.map(v => v.id === id ? normalized : v);
        // sync parent
        onCopyGenerated(next);
        return next;
      });

      toast({ title: "Variation regenerated" });
      // Keep selected if it was selected
      if (selectedId === id) setSelectedId(id);
    } catch (err: any) {
      console.error("Regenerate one error", err);
      toast({ title: "Regeneration failed", description: String(err?.message ?? err), variant: "destructive" });
    } finally {
      setRegeneratingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              AI-Generated Ad Copy
            </CardTitle>
            <CardDescription>Generate, edit and select your ad copy</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="suggestions" className="text-sm">Smart Suggestions</Label>
            <Switch id="suggestions" checked={showSuggestions} onCheckedChange={setShowSuggestions} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {variations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No copy generated yet</p>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Copy
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Copy Variations
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {variations.map((v, idx) => (
              <Card key={v.id} className="border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="selectedVariation" checked={selectedId === v.id} onChange={() => setSelectedId(v.id)} />
                      <CardTitle className="text-base">Variation {idx + 1}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleRegenerateOne(v.id)} disabled={!!regeneratingId && regeneratingId !== v.id}>
                        {regeneratingId === v.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Regenerating
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Regenerate
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Headline</Label>
                    <Input value={v.headline} className="mt-1" onChange={(e) => updateVariationField(v.id, 'headline', e.target.value)} />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea value={v.description} className="mt-1" rows={3} onChange={(e) => updateVariationField(v.id, 'description', e.target.value)} />
                  </div>

                  <div>
                    <Label>Call-to-Action</Label>
                    <Input value={v.cta} className="mt-1" onChange={(e) => updateVariationField(v.id, 'cta', e.target.value)} />
                  </div>

                  {showSuggestions && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                      <p className="text-xs font-medium mb-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI Suggestions
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {['premium', 'exclusive', 'limited-time', 'best-seller', 'high-quality'].map(keyword => (
                          <span key={keyword} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">{keyword}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-2">
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Regenerating...</>) : 'Regenerate All'}
              </Button>
              <Button onClick={handleUseSelected} variant="primary">Use Selected</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
