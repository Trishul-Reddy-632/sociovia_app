// src/pages/CreativeChoice.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Upload, ArrowRight, Link as LinkIcon } from "lucide-react";
import { API_BASE_URL } from "@/config";

type CreativeMode = "ai" | "upload" | "link";
const STORAGE_KEY = "sv_lastCreativeMode";

const API_BASE = API_BASE_URL;

function getAuthTokenFromLocalStorage(): string | null {
  try {
    const token = localStorage.getItem("sv_token");
    if (token) return token;
    const raw = localStorage.getItem("sv_user");
    if (!raw) return null;
    const userData = JSON.parse(raw);
    return userData?.token ?? null;
  } catch {
    return null;
  }
}

function getUserIdFromLocalStorage(): number | null {
  try {
    const raw = localStorage.getItem("sv_user");
    if (!raw) return null;
    const userData = JSON.parse(raw);
    const id = userData?.id ?? null;
    return typeof id === "number" ? id : (id ? Number(id) : null);
  } catch {
    return null;
  }
}

function saveMode(mode: CreativeMode) {
  const payload = { mode, ts: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
}

export default function CreativeChoice() {
  const navigate = useNavigate();
  const location = useLocation();
  const [preflightDone, setPreflightDone] = useState(false);
  const [hasAccounts, setHasAccounts] = useState<boolean | null>(null); // null = unknown, true/false = known
  const [preflightError, setPreflightError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      setPreflightError(null);
      try {
        const userId = getUserIdFromLocalStorage();
        const token = getAuthTokenFromLocalStorage();

        const u = new URL("/api/social/management", API_BASE);
        if (userId != null) u.searchParams.set("user_id", String(userId));

        const headers: Record<string, string> = { Accept: "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(u.toString(), {
          method: "GET",
          credentials: "include",
          headers,
          signal: ctrl.signal,
        });

        // treat 204/200 with empty body as "no accounts"
        if (!res.ok) {
          // If auth/403 -> user may be unauthenticated; treat as no accounts (we'll let fb_user handle flow)
          // but surface a helpful message and still allow the page to render (user can attempt login).
          setHasAccounts(false);
          setPreflightError(`Preflight request returned ${res.status}`);
          setPreflightDone(true);
          return;
        }

        const body = await res.json().catch(() => ({} as any));
        const accounts = Array.isArray(body?.accounts) ? body.accounts : [];

        if (accounts.length === 0) {
          // No linked accounts:
          setHasAccounts(false);

          // Build a returnTo path so fb_user can know to come back here after a successful bind.
          // Use encodeURIComponent and include current location.pathname + search to restore state.
          const currentPath = `${location.pathname}${location.search || ""}`;
          const returnTo = encodeURIComponent(currentPath);

          // Use navigate with full path including returnTo param
          // Important: we pass replace: false so user can still hit back if needed.
          navigate(`/fb_user?returnTo=${returnTo}`, { replace: false });
          return; // don't render this page (we navigated away)
        }

        // We have accounts
        setHasAccounts(true);
      } catch (err) {
        // keep page usable on network errors: allow user to proceed.
        console.error("CreativeChoice preflight failed:", err);
        setPreflightError("Network/check failed — continuing anyway.");
        setHasAccounts(null); // unknown
      } finally {
        setPreflightDone(true);
      }
    })();

    return () => ctrl.abort();
  }, [navigate, location.pathname, location.search]);

  const selectAndGo = (mode: CreativeMode, path: string) => {
    saveMode(mode);

    // If preflight finished and we know there are no accounts, redirect to fb_user with returnTo
    if (preflightDone && hasAccounts === false) {
      const currentPath = `${location.pathname}${location.search || ""}`;
      navigate(`/fb_user?returnTo=${encodeURIComponent(currentPath)}`, { replace: false });
      return;
    }

    // else proceed to the requested flow
    navigate(path);
  };

  // Minimal loading skeleton during preflight check
  if (!preflightDone) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
        <div className="animate-pulse text-sm text-muted-foreground">
          Checking your linked accounts…
        </div>
      </div>
    );
  }

  // If preflight finished and hasAccounts === false, we already navigated to /fb_user above.
  // But in case navigation did not happen (edge cases), show a friendly message with a CTA.
  if (preflightDone && hasAccounts === false) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
        <div className="max-w-xl text-center">
          <h2 className="text-2xl font-semibold mb-2">No linked accounts found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            To create campaigns you need to link at least one social account. Click the button below to link accounts.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => {
              const currentPath = `${location.pathname}${location.search || ""}`;
              navigate(`/fb_user?returnTo=${encodeURIComponent(currentPath)}`);
            }}>
              Link Accounts
            </Button>
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          </div>
          {preflightError && <div className="mt-4 text-xs text-destructive">{preflightError}</div>}
        </div>
      </div>
    );
  }

  // normal render when we have accounts (or preflight unknown but continued)
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
      <div className="max-w-6xl w-full space-y-8 animate-fade-in">
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold">How would you like to start?</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose whether to generate AI-powered creative content, upload your own assets, or provide a product / website link to auto-extract details and generate a campaign.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Generate with AI */}
          <Card
            className="group hover:shadow-large transition-all duration-300 cursor-pointer border-2 hover:border-primary/50"
            onClick={() => selectAndGo("ai", "/objective")}
          >
            <CardContent className="p-8 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="w-8 h-8 text-white" />
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl font-bold">Generate with AI</h2>
                <p className="text-muted-foreground">
                  Let our AI create stunning visuals and compelling copy for your campaign in seconds
                </p>
              </div>

              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" />AI-powered image generation</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" />Smart caption suggestions</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" />Voice input support</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" />Multiple variations</li>
              </ul>

              <Button
                className="w-full gradient-primary2 group-hover:shadow-lg transition-shadow"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  selectAndGo("ai", "/objective");
                }}
              >
                Start Generating
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          {/* Upload Assets */}
          <Card
            className="group hover:shadow-large transition-all duration-300 cursor-pointer border-2 hover:border-primary/50"
            onClick={() => selectAndGo("upload", "/objective")}
          >
            <CardContent className="p-8 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-secondary/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-white" />
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl font-bold">Upload Images</h2>
                <p className="text-muted-foreground">
                  Already have your creative ready? Upload your images and start configuring your campaign
                </p>
              </div>

              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-secondary" />Upload multiple images</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-secondary" />Drag & drop support</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-secondary" />Quick campaign setup</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-secondary" />Asset management</li>
              </ul>

              <Button
                variant="secondary"
                className="w-full group-hover:shadow-lg transition-shadow"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  selectAndGo("upload", "/objective");
                }}
              >
                Upload & Continue
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          {/* Generate from Link */}
          <Card
            className="group hover:shadow-large transition-all duration-300 cursor-pointer border-2 hover:border-primary/50"
            onClick={() => selectAndGo("link", "/ai-campaign-builder")}
          >
            <CardContent className="p-8 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                <LinkIcon className="w-8 h-8 text-white" />
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl font-bold">Generate from Link</h2>
                <p className="text-muted-foreground">
                  Paste a product page or website URL and we’ll extract details, images and auto-generate creatives and campaign suggestions
                </p>
              </div>

              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" />Automatic product details extraction</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" />AI-generated images & captions</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" />Audience & budget suggestions</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" />One-click campaign draft</li>
              </ul>

              <Button
                variant="outline"
                className="w-full group-hover:shadow-lg transition-shadow"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  selectAndGo("link", "/ai-campaign-builder");
                }}
              >
                Paste Link & Start
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            View Dashboard Instead
          </Button>
        </div>
      </div>
    </div>
  );
}
