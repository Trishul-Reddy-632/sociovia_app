// src/pages/Workspace.tsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, PlusCircle, ChevronDown, LayoutDashboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/config";

interface Workspace {
  id: number;
  user_id?: number;
  business_name: string;
  industry: string;
  business_type?: string;
  website?: string;
  usp?: string;
  created_at?: string;
  updated_at?: string;
  logo_path?: string | null;
  logo_url?: string | null; // API may provide either
  [k: string]: any;
}

type Metrics = {
  workspace_id: number;
  total_spend: number;
  leads: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  last_updated?: string;
};

const API_BASE = API_BASE_URL;

export default function WorkspacePage(): JSX.Element {
  const navigate = useNavigate();
  const { id: paramId } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [user, setUser] = useState<{ id?: number; name?: string } | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [metricsMap, setMetricsMap] = useState<Record<number, Metrics>>({});
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const switcherRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const avatarButtonRef = useRef<HTMLButtonElement | null>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width?: number } | null>(null);

  const zeroMetricsFor = useCallback((id: number): Metrics => ({
    workspace_id: id,
    total_spend: 0,
    leads: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    cpm: 0,
    last_updated: undefined,
  }), []);

  // Robust avatar resolver (tries multiple sensible URL forms and logs them)
  const avatarFor = (w: Workspace) => {
    try {
      const raw = (w as any).logo_url ?? (w as any).logo_path ?? w.logo_url ?? w.logo_path ?? "/assets/default-ws.png";
      // console.debug("[avatarFor] raw:", raw);

      if (!raw) return "/assets/default-ws.png";
      const s = String(raw).trim();

      // Already absolute URL
      if (/^https?:\/\//i.test(s)) {
        // console.debug("[avatarFor] absolute URL ->", s);
        return s;
      }

      // Build candidate URLs
      const safe = s.startsWith("/") ? s : `/${s}`;
      const candidates = [
        `${API_BASE}${safe}`,            // API_BASE + /path or /uploads/...
        `${API_BASE}/uploads${safe}`,    // API_BASE + /uploads/path
        `${API_BASE}/static${safe}`,     // API_BASE + /static/path
        s,                               // raw fallback
      ];

      // console.debug("[avatarFor] candidates:", candidates);
      // Return first candidate — <img onError> will handle actual fallback if the resource isn't reachable
      return candidates[0];
    } catch (err) {
      console.warn("[avatarFor] error resolving avatar", err);
      return "/assets/default-ws.png";
    }
  };

  // Persist selection to localStorage
  const persistSelection = (id: number | null) => {
    try {
      if (id) localStorage.setItem("sv_selected_workspace_id", String(id));
      else localStorage.removeItem("sv_selected_workspace_id");
    } catch {
      // ignore
    }
  };

  // Normalize workspace structure from API or localStorage entry
  const normalizeWorkspace = (item: any): Workspace => ({
    id: Number(item.id ?? item.workspace_id ?? Date.now()),
    user_id: item.user_id ?? item.userId ?? undefined,
    business_name: item.business_name ?? item.name ?? item.title ?? `Workspace ${item.id ?? ""}`,
    industry: item.industry ?? item.sector ?? "—",
    business_type: item.business_type ?? item.type ?? undefined,
    website: item.website ?? item.website_url ?? undefined,
    usp: item.usp ?? item.description ?? undefined,
    created_at: item.created_at ?? item.createdAt ?? undefined,
    updated_at: item.updated_at ?? item.updatedAt ?? undefined,
    logo_path: item.logo_path ?? item.logo ?? item.logo_url ?? null,
    logo_url: item.logo_url ?? null,
    ...item,
  });

  // Load user/workspaces — prefer API; fallback to localStorage
  const loadWorkspacesFromApi = async () => {
    setLoading(true);
    setErrorMsg(null);

    // Get user_id from localStorage for authentication
    let userId: string | null = null;
    try {
      const rawUser = localStorage.getItem("sv_user") ?? localStorage.getItem("sv_profile");
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        userId = parsed?.id ? String(parsed.id) : null;
      }
    } catch (err) {
      console.warn("[Workspace] Failed to parse user from localStorage", err);
    }

    try {
      // Build URL with user_id query param if available
      const url = new URL(`${API_BASE}/api/workspace`);
      if (userId) {
        url.searchParams.set("user_id", userId);
      }

      console.info("[Workspace] fetching from API:", url.toString());
      const resp = await fetch(url.toString(), {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept": "application/json",
          ...(userId ? { "X-User-Id": userId } : {}),
        },
      });

      if (!resp.ok) {
        console.warn("[Workspace] API fetch failed:", resp.status, resp.statusText);
        throw new Error(`API error ${resp.status}`);
      }

      const json = await resp.json();
      console.debug("[Workspace] API response:", json);

      if (json && Array.isArray(json.workspaces) && json.workspaces.length > 0) {
        const normalized = json.workspaces.map(normalizeWorkspace);
        setWorkspaces(normalized);
        localStorage.setItem("sv_workspace_list", JSON.stringify(normalized));

        const urlId = paramId ? Number(paramId) : 0;
        const persisted = Number(localStorage.getItem("sv_selected_workspace_id") || 0);

        const pick = (urlId && normalized.find((w) => w.id === urlId))
          ?? (persisted && normalized.find((w) => w.id === persisted))
          ?? normalized[0]
          ?? null;

        setWorkspace(pick);
        if (pick) setMetricsMap((prev) => ({ ...prev, [pick.id]: zeroMetricsFor(pick.id) }));
        setLoading(false);
        return;
      }

      // If API returned success but no workspaces, fallback to localStorage
      console.info("[Workspace] API returned no workspaces; falling back to localStorage.");
      throw new Error("no workspaces");
    } catch (err) {
      // fallback to localStorage
      console.debug("[Workspace] Falling back to localStorage due to:", err);
      try {
        const raw = localStorage.getItem("sv_workspace_list");
        const list = raw ? JSON.parse(raw) : [];
        const normalized: Workspace[] = Array.isArray(list) ? list.map(normalizeWorkspace) : [];
        setWorkspaces(normalized);

        const urlId = paramId ? Number(paramId) : 0;
        const persisted = Number(localStorage.getItem("sv_selected_workspace_id") || 0);

        const pick = (urlId && normalized.find((w) => w.id === urlId))
          ?? (persisted && normalized.find((w) => w.id === persisted))
          ?? normalized[0]
          ?? null;

        setWorkspace(pick);
        if (pick) setMetricsMap((prev) => ({ ...prev, [pick.id]: zeroMetricsFor(pick.id) }));
      } catch (err2) {
        console.error("[Workspace] localStorage fallback failed", err2);
        setWorkspaces([]);
        setWorkspace(null);
        setErrorMsg("Failed to load workspaces.");
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // try load user from localStorage (non-blocking)
    try {
      const rawUser = localStorage.getItem("sv_user") ?? localStorage.getItem("sv_profile");
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        setUser({ id: parsed?.id, name: parsed?.name ?? parsed?.business_name ?? undefined });
      } else {
        setUser(null);
      }
    } catch (err) {
      console.warn("[Workspace] parse sv_user failed", err);
      setUser(null);
    }

    loadWorkspacesFromApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramId]);

  // Switch workspace
  const switchWorkspace = (id: number) => {
    const next = workspaces.find((w) => w.id === id) ?? null;
    setWorkspace(next);
    persistSelection(next?.id ?? null);
    if (next) {
      setMetricsMap((prev) => ({ ...prev, [next.id]: zeroMetricsFor(next.id) }));
      navigate(`/workspace/${next.id}`);
    }
    setSwitcherOpen(false);
  };

  // Close switcher when clicking outside
  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      if (!switcherOpen) return;
      const target = ev.target as Node;
      if (switcherRef.current && switcherRef.current.contains(target)) return;
      if (avatarButtonRef.current && avatarButtonRef.current.contains(target)) return;
      setSwitcherOpen(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [switcherOpen]);

  // compute panel position anchored to avatar button
  const computePanelPosition = useCallback(() => {
    const btn = avatarButtonRef.current;
    if (!btn || typeof window === "undefined") {
      setPanelPos(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    const panelWidth = 320;
    const top = Math.max(8, rect.bottom + 8);
    const left = Math.min(Math.max(8, rect.right - panelWidth), Math.max(8, (window.innerWidth || 1024) - (panelWidth + 24)));
    setPanelPos({ top, left, width: panelWidth });
  }, []);

  useEffect(() => {
    if (!switcherOpen) return;
    computePanelPosition();
    const onWindowChange = () => computePanelPosition();
    window.addEventListener("resize", onWindowChange);
    window.addEventListener("scroll", onWindowChange, true);
    return () => {
      window.removeEventListener("resize", onWindowChange);
      window.removeEventListener("scroll", onWindowChange, true);
    };
  }, [switcherOpen, computePanelPosition]);

  const openSwitcher = () => {
    computePanelPosition();
    setSwitcherOpen(true);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const filteredWorkspaces = () => {
    const q = filter.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter((w) => (w.business_name || "").toLowerCase().includes(q) || (w.industry || "").toLowerCase().includes(q));
  };

  // Manual refresh (re-fetch from API)
  const handleRefresh = async () => {
    setLoading(true);
    await loadWorkspacesFromApi();
    toast({ title: "Refreshed", description: "Workspace list reloaded." });
  };

  const currentMetricsValue = <T,>(fn: (m: Metrics | null) => T): T => {
    if (!workspace) return fn(null);
    const m = metricsMap[workspace.id] ?? zeroMetricsFor(workspace.id);
    return fn(m);
  };

  const currentMetrics = currentMetricsValue((m) => m);

  const panel = (
    <div
      ref={switcherRef}
      className="fixed bg-white border border-slate-100 shadow-2xl rounded-xl z-[10000] p-3 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200"
      style={{
        top: panelPos ? panelPos.top : 80,
        left: panelPos ? panelPos.left : (typeof window !== "undefined" ? Math.max(8, (window.innerWidth || 1024) - 344) : 24),
        width: panelPos?.width ?? 320,
      }}
      role="dialog"
      aria-label="Workspace switcher"
    >
      <div className="flex gap-2">
        <input
          ref={searchRef}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search workspaces..."
          aria-label="Filter workspaces"
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 max-h-[240px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent pb-1">
        {filteredWorkspaces().length === 0 ? (
          <div className="col-span-full text-center py-8 text-slate-400 text-xs">No workspaces found.</div>
        ) : (
          filteredWorkspaces().map((w) => {
            const active = workspace?.id === w.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => switchWorkspace(w.id)}
                className={`flex flex-col items-center gap-2 p-2 rounded-lg transition-all border
                  ${active
                    ? "bg-blue-50/50 border-blue-200 ring-1 ring-blue-100"
                    : "bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-100"
                  }`}
                title={w.business_name}
                aria-current={active ? "true" : undefined}
              >
                <img
                  src={avatarFor(w)}
                  alt={w.business_name}
                  className="h-10 w-10 rounded-full object-cover border border-slate-100 shadow-sm bg-white"
                  onError={(e) => {
                    const el = e.currentTarget as HTMLImageElement;
                    console.warn("[switcher img:onError] failed to load:", el.src, "falling back to placeholder");
                    el.onerror = null;
                    el.src = "https://via.placeholder.com/80?text=WS";
                  }}
                />
                <span className="text-[10px] font-medium text-center truncate w-full px-1 text-slate-600">
                  {w.business_name}
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setSwitcherOpen(false); navigate("/workspace/create"); }}
          className="text-xs h-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
        >
          <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
          Add New
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setSwitcherOpen(false); navigate("/workspace/list"); }}
          className="text-xs h-8 text-slate-500 hover:text-slate-800"
        >
          Manage All
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {errorMsg && (
        <Card>
          <CardContent>
            <div className="text-sm text-rose-600">Error: {errorMsg}</div>
          </CardContent>
        </Card>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 className="text-2xl font-semibold">Workspace</h1>
          <p className="text-sm text-muted-foreground">Realtime workspace view (data fetched from API with local fallback).</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/workspaces")} className="h-9">
            <LayoutDashboard className="w-3.5 h-3.5 mr-2" /> Workspaces
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="h-9">
            <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh
          </Button>
          <Button variant="default" size="sm" onClick={() => navigate("/workspace/create")} className="h-9">
            <PlusCircle className="w-3.5 h-3.5 mr-2" /> New Workspace
          </Button>

          <div className="relative">
            <button
              ref={avatarButtonRef}
              type="button"
              onClick={() => setSwitcherOpen((s) => !s)}
              className="flex items-center gap-3 rounded-full border border-slate-200 bg-white pl-1.5 pr-4 py-1.5 hover:shadow-md hover:border-indigo-100 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              {workspace ? (
                <img
                  src={avatarFor(workspace)}
                  alt={workspace.business_name}
                  className="h-8 w-8 rounded-full object-cover border border-slate-100"
                  onError={(e) => {
                    const el = e.currentTarget as HTMLImageElement;
                    el.onerror = null;
                    el.src = "/assets/default-ws.png";
                  }}
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">WS</div>
              )}
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-semibold text-slate-700 leading-none">{workspace?.business_name ?? "Select Workspace"}</span>
                {workspace && <span className="text-[10px] text-slate-400 mt-0.5">ID: {workspace.id}</span>}
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${switcherOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {switcherOpen && typeof document !== "undefined" ? createPortal(panel, document.body) : null}

      <Card className="shadow-lg shadow-slate-200/40 border-slate-100 rounded-2xl overflow-hidden bg-gradient-to-br from-white to-slate-50/50">
        <CardHeader className="bg-white/50 backdrop-blur-sm border-b border-slate-100/50">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <span className="w-2 h-6 bg-indigo-500 rounded-full" />
            Workspace Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          {!workspace ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <PlusCircle className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">No workspace selected</h3>
              <p className="text-sm text-slate-500 mt-1 mb-6 max-w-sm">
                Create a new workspace or select one from the list to view details and analytics.
              </p>
              <div className="flex gap-4">
                <Button onClick={() => navigate("/workspace/create")}>Create Workspace</Button>
                <Button variant="outline" onClick={handleRefresh}>Reload List</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="relative group">
                <div className="absolute inset-0 bg-blue-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all opacity-50" />
                <img
                  src={avatarFor(workspace)}
                  alt={`${workspace.business_name} logo`}
                  className="relative h-28 w-28 rounded-2xl object-cover border-4 border-white shadow-xl"
                  onError={(e) => {
                    const el = e.currentTarget as HTMLImageElement;
                    el.onerror = null;
                    el.src = "/assets/default-ws.png";
                  }}
                />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{workspace.business_name}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {workspace.industry || "General"}
                    </span>
                    {workspace.business_type && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        {workspace.business_type}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mt-6">
                  {workspace.website && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Website</label>
                      <div>
                        <a className="text-blue-600 hover:text-blue-700 hover:underline font-medium" href={workspace.website} target="_blank" rel="noreferrer">
                          {workspace.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    </div>
                  )}

                  {workspace.usp && (
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">USP / Description</label>
                      <p className="text-slate-600 leading-relaxed text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {workspace.usp}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-6 mt-2 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                  <span>Last updated: {workspace.updated_at ? new Date(workspace.updated_at).toLocaleString() : "—"}</span>
                  <span>•</span>
                  <span>ID: {workspace.id}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Spend", value: `$${(currentMetrics?.total_spend || 0).toLocaleString()}`, icon: "💰" },
          { label: "Leads", value: `${currentMetrics?.leads || 0}`, icon: "👥" },
          { label: "Impressions", value: `${(currentMetrics?.impressions || 0).toLocaleString()}`, icon: "👀" },
          { label: "Clicks", value: `${(currentMetrics?.clicks || 0).toLocaleString()}`, icon: "🖱️" },
        ].map((k) => (
          <Card key={k.label} className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{k.label}</div>
                <span className="opacity-50 grayscale contrast-0">{k.icon}</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{k.value}</div>
              <div className="text-[10px] text-slate-400 mt-2">
                Last updated: {currentMetrics?.last_updated ? new Date(currentMetrics.last_updated).toLocaleTimeString() : "—"}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
