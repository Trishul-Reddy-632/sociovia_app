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
import { Link, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/config";

interface UrlInputStepProps {
    onGenerated: (data: any) => void;
}

export default function UrlInputStep({ onGenerated }: UrlInputStepProps) {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [progressText, setProgressText] = useState<string>("");
    const { toast } = useToast();
    const streamAbortRef = useRef<AbortController | null>(null);

    const handleAnalyze = async () => {
        if (!url.trim()) {
            toast({
                title: "Invalid Link",
                description: "Please enter a valid product or website link.",
                variant: "destructive",
            });
            return;
        }

        if (streamAbortRef.current) {
            try { streamAbortRef.current.abort(); } catch { }
            streamAbortRef.current = null;
        }

        setLoading(true);
        setProgressText("Initializing AI agent...");

        // Simulate progress steps for better UX
        const timers: NodeJS.Timeout[] = [];
        timers.push(setTimeout(() => setProgressText("Crawling page content & images..."), 1500));
        timers.push(setTimeout(() => setProgressText("Analyzing product details..."), 4000));
        timers.push(setTimeout(() => setProgressText("Generating ad copy & targeting strategy..."), 8000));
        timers.push(setTimeout(() => setProgressText("Finalizing campaign suggestions..."), 12000));

        const abortController = new AbortController();
        streamAbortRef.current = abortController;

        try {
            const apiBase = API_BASE_URL;
            const endpoint = `${apiBase.replace(/\/$/, "")}/generatec`;

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: url.trim(), max_snapshots: 4 }),
                signal: abortController.signal,
            });

            const text = await res.text().catch(() => "");
            let json: any = null;
            try { json = text ? JSON.parse(text) : null; } catch { }

            if (!res.ok) {
                const serverMsg = json?.error ?? text ?? `HTTP ${res.status}`;
                throw new Error(serverMsg);
            }

            // Check for success flag in the new backend response
            if (json.ok === false) {
                throw new Error(json.error || "Generation failed on server.");
            }

            // Logic to extract the "best" JSON block if multiple exist, 
            // or use the one parsed by the backend
            const resultData = json.parsed_json || json;

            if (!resultData) {
                throw new Error("AI returned no usable data.");
            }

            toast({
                title: "Generation Complete",
                description: "AI has created your campaign draft.",
            });

            // Pass the FULL backend response to the parent, so Editor can use it all
            // We pass 'json' which contains { parsed_json, snapshots, etc. }
            onGenerated(json);

        } catch (err: any) {
            if (err.name === 'AbortError') return;
            console.error("Analysis error:", err);
            toast({
                title: "Generation Failed",
                description: err?.message ?? "Could not generate campaign.",
                variant: "destructive",
            });
        } finally {
            timers.forEach(clearTimeout);
            setLoading(false);
            setProgressText("");
            if (streamAbortRef.current === abortController) streamAbortRef.current = null;
        }
    };

    return (
        <Card className="max-w-3xl mx-auto border-dashed border-2">
            <CardHeader className="text-center pb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                    <Sparkles className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl">Start with a Link</CardTitle>
                <CardDescription className="text-base">
                    Paste your product URL. Our AI will crawl the page, extract images, write copy, and define your audience.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="https://yourstore.com/products/awesome-sneakers"
                            className="pl-9 h-12 text-base"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            disabled={loading}
                            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                        />
                    </div>
                    <Button
                        onClick={handleAnalyze}
                        disabled={loading}
                        size="lg"
                        className="h-12 px-8 font-semibold text-base shrink-0"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            "Generate Campaign"
                        )}
                    </Button>
                </div>

                {loading && (
                    <div className="rounded-lg border bg-slate-50 p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2 h-2 rounded-full bg-primary animate-bounce"></span>
                        </div>
                        <p className="text-sm font-medium text-slate-600">
                            {progressText || "Connecting to AI..."}
                        </p>
                        <p className="text-xs text-muted-foreground">This usually takes 15-30 seconds.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
