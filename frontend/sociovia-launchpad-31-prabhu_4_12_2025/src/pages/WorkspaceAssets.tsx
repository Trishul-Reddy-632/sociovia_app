import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Download, AlertTriangle } from "lucide-react";
import { API_BASE_URL } from "@/config";

/**
 * WorkspaceAssets
 * Route: /workspace/:id/assets
 *
 * Frontend-only route to display saved assets for a workspace.
 * - Fetches from API_BASE (/api/workspace/assets?workspace_id=...), logs responses.
 * - Supports multiple response shapes:
 *    - { success: true, assets: [{ name, url, type }] }
 *    - { workspace: { creatives_paths: ["<path>", ...] } }
 *    - { creatives_paths: '["/uploads/..."]' } or array
 * - If backend not implemented or returns 404/401, component shows friendly message and no dummy data.
 */

type Asset = {
  id?: string | number;
  name: string;
  url: string;
  type?: string; // "image", "video", "pdf", "other"
  size?: number;
};

function isImageUrl(url: string) {
  return /\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?.*)?$/i.test(url);
}

function getUserIdFromLocalStorage(): number | null {
  try {
    const raw = localStorage.getItem('sv_user');
    if (!raw) return null;
    const ud = JSON.parse(raw);
    const id = ud?.id ?? null;
    if (typeof id === 'number') return id;
    if (typeof id === 'string' && id.trim()) return Number(id);
    return null;
  } catch (err) {
    return null;
  }
}

async function safeFetchJson(url: string, options: RequestInit = {}) {
  try {
    const res = await fetch(url, options);
    const clone = res.clone();
    const text = await clone.text().catch(() => "");
    console.groupCollapsed(`[API] ${res.status} ${res.statusText} — ${url}`);
    try {
      const headersObj: Record<string, string> = {};
      res.headers.forEach((v, k) => (headersObj[k] = v));
      console.log("headers:", headersObj);
    } catch (e) {
      console.warn("failed to read headers", e);
    }
    console.log("body raw:", text);
    console.groupEnd();

    if (!res.ok) {
      return { ok: false, status: res.status, bodyText: text };
    }

    const ctype = res.headers.get("content-type") ?? "";
    if (ctype.includes("application/json")) {
      try {
        const json = JSON.parse(text);
        return { ok: true, json };
      } catch (err) {
        console.warn("JSON parse failed", err);
        return { ok: false, status: res.status, bodyText: text };
      }
    }
    // not JSON
    return { ok: true, json: text };
  } catch (err) {
    console.error("fetch error", err);
    return { ok: false, error: err };
  }
}

export default function WorkspaceAssets(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const API_BASE = API_BASE_URL;

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setStatusMessage(null);
      setAssets([]);

      if (!id) {
        setStatusMessage("Missing workspace id in URL.");
        setLoading(false);
        return;
      }

      if (!API_BASE) {
        setStatusMessage("API base not configured (VITE_API_BASE).");
        setLoading(false);
        return;
      }

      // Primary endpoint we will call — backend may vary; adjust if needed
      const userId = getUserIdFromLocalStorage();
      const endpointsToTry = [
        `${API_BASE}/api/workspace/assets?workspace_id=${encodeURIComponent(id)}${userId ? `&user_id=${userId}` : ''}`,
        `${API_BASE}/api/workspace?workspace_id=${encodeURIComponent(id)}${userId ? `&user_id=${userId}` : ''}`,
        `${API_BASE}/api/workspaces?user_id=${encodeURIComponent(userId ? String(userId) : id)}`,
        `${API_BASE}/api/workspace/list?user_id=${encodeURIComponent(userId ? String(userId) : id)}`,
      ];

      let foundAssets: Asset[] = [];
      let lastErr: any = null;

      for (const url of endpointsToTry) {
        try {
          const resp = await safeFetchJson(url, { 
            credentials: "include",
            headers: userId ? { 'X-User-Id': String(userId) } : {}
          });
          // handle non-JSON ok or errors
          if (!resp || resp.ok === false) {
            lastErr = resp;
            // If 401/403/404, don't try other endpoints? we continue to allow other shapes
            continue;
          }
          const body = resp.json;

          // Body shapes we support:
          // 1) { success: true, assets: [...] }
          if (body && typeof body === "object") {
            if (Array.isArray(body.assets)) {
              foundAssets = body.assets.map((a: any, idx: number) => ({
                id: a.id ?? `${url}-a-${idx}`,
                name: a.name ?? a.filename ?? a.url ?? `asset-${idx}`,
                url: a.url ?? a.path ?? a.src ?? a,
                type: a.type ?? (isImageUrl(a.url ?? a.path ?? "") ? "image" : "other"),
                size: a.size,
              }));
            } else if (body.workspace && body.workspace.creatives_paths) {
              // creatives_paths might be JSON string or array
              const cp = typeof body.workspace.creatives_paths === "string" ? JSON.parse(body.workspace.creatives_paths || "[]") : body.workspace.creatives_paths;
              if (Array.isArray(cp)) {
                foundAssets = cp.map((p: string, idx: number) => ({
                  id: `cp-${idx}`,
                  name: p.split("/").pop() ?? `asset-${idx}`,
                  url: p,
                  type: isImageUrl(p) ? "image" : "other",
                }));
              }
            } else if (Array.isArray(body)) {
              // fallback: top-level array
              foundAssets = body.map((a: any, idx: number) => ({
                id: a.id ?? idx,
                name: a.name ?? a.filename ?? a.url ?? `asset-${idx}`,
                url: a.url ?? a.path ?? a,
                type: isImageUrl(a.url ?? a.path ?? "") ? "image" : "other",
              }));
            } else if (body.creatives_paths) {
              const cp = typeof body.creatives_paths === "string" ? JSON.parse(body.creatives_paths || "[]") : body.creatives_paths;
              if (Array.isArray(cp)) {
                foundAssets = cp.map((p: string, idx: number) => ({
                  id: `cp2-${idx}`,
                  name: p.split("/").pop() ?? `asset-${idx}`,
                  url: p,
                  type: isImageUrl(p) ? "image" : "other",
                }));
              }
            } else if (Array.isArray(body.files)) {
              foundAssets = body.files.map((f: any, idx: number) => ({
                id: f.id ?? idx,
                name: f.name ?? f.filename ?? `file-${idx}`,
                url: f.url ?? f.path ?? "",
                type: f.type ?? (isImageUrl(f.url ?? f.path ?? "") ? "image" : "other"),
                size: f.size,
              }));
            } else if (body.success && body.workspace) {
              const w = body.workspace;
              // try several fields
              if (w.creatives_paths) {
                const cp = typeof w.creatives_paths === "string" ? JSON.parse(w.creatives_paths || "[]") : w.creatives_paths;
                if (Array.isArray(cp)) {
                  foundAssets = cp.map((p: string, idx: number) => ({ id: `cw-${idx}`, name: p.split("/").pop() ?? `asset-${idx}`, url: p, type: isImageUrl(p) ? "image" : "other" }));
                }
              } else if (w.creatives) {
                foundAssets = (w.creatives as any[]).map((c: any, idx: number) => ({ id: c.id ?? idx, name: c.name ?? c.filename ?? `creative-${idx}`, url: c.url ?? c.path ?? "", type: isImageUrl(c.url ?? c.path ?? "") ? "image" : "other" }));
              }
            }
          }

          // if we found assets, stop trying other endpoints
          if (foundAssets.length > 0) {
            break;
          }

        } catch (err) {
          lastErr = err;
        }
      } // end endpoints loop

      if (!mounted) return;

      if (foundAssets.length > 0) {
        setAssets(foundAssets);
        setStatusMessage(null);
      } else {
        // No assets found explicitly; set empty state message but not dummy data.
        if (lastErr && lastErr.status === 401) {
          setStatusMessage("Not authenticated. Please log in to view assets.");
        } else if (lastErr && lastErr.status === 404) {
          setStatusMessage("Assets endpoint not found on the server (404).");
        } else {
          setStatusMessage("No assets available for this workspace.");
        }
        setAssets([]);
      }

      setLoading(false);
    }

    load();
    return () => { mounted = false; };
  }, [id, API_BASE, toast]);

  function handleOpen(url: string) {
    // open in new tab
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleDownload(url: string, suggestedName?: string) {
    // Attempt fetch-then-download to preserve filename
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName ?? "";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Workspace Assets {id ? `— #${id}` : ""}</h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => window.location.reload()}>Refresh</Button>
          <Button size="sm" variant="ghost" onClick={() => navigate(-1)}>Back</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saved assets</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">Loading assets…</div>
          ) : statusMessage ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <div className="mb-3">{statusMessage}</div>
              <div>
                {statusMessage.toLowerCase().includes("not authenticated") ? (
                  <Button size="sm" onClick={() => { toast({ title: "Login required", description: "Please log in." }); navigate("/login"); }}>Login</Button>
                ) : (
                  <Button size="sm" onClick={() => window.location.reload()}>Try again</Button>
                )}
              </div>
            </div>
          ) : assets.length === 0 ? (
            <div className="py-8 text-center">
              <div className="text-lg font-medium">No assets available</div>
              <div className="text-sm text-muted-foreground mt-2">The workspace doesn't have any saved assets yet.</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {assets.map((a) => (
                <div key={String(a.id ?? a.url)} className="border rounded p-2 flex flex-col">
                  <div className="flex-1 mb-2">
                    {a.type === "image" || isImageUrl(a.url) ? (
                      <img src={a.url} alt={a.name} className="w-full h-36 object-cover rounded" onError={(e) => {
                        const t = e.currentTarget as HTMLImageElement;
                        t.src = "/assets/default-ws.png";
                      }} />
                    ) : (
                      <div className="w-full h-36 flex items-center justify-center bg-muted/10 rounded">
                        <div className="text-sm text-center">
                          <div className="font-medium">{a.name}</div>
                          <div className="text-xs text-muted-foreground">File</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm">{a.name}</div>
                    <div className="flex items-center gap-1">
                      <button title="Open" onClick={() => handleOpen(a.url)} className="p-1">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button title="Download" onClick={() => handleDownload(a.url, a.name)} className="p-1">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
