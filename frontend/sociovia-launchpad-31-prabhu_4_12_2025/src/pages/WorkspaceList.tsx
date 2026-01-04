// src/pages/EnhancedWorkspaceDashboard.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search as SearchIcon,
  Settings,
  Plus,
  ExternalLink,
  Download,
  RefreshCw,
  Filter,
  MoreHorizontal,
  TrendingUp,
  Activity,
  Users,
  DollarSign
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// --- Types ---
type WorkspaceItem = {
  url?: string;
  id: number;
  name: string;
  sector?: string;
  role?: string;
  created_at?: string;
  logo?: string;
};

type WorkspaceMetrics = {
  workspace_id: number;
  total_spend: number;
  leads: number;
  active_campaigns: number;
  reach: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  last_updated?: string;
};

// --- Helpers ---
function makeTimeSeriesFromMetric(m: WorkspaceMetrics | undefined, points = 7) {
  const baseImp = (m?.impressions ?? 0) || 1000;
  // randomized mock data based on current totals for sparkline
  return Array.from({ length: points }).map((_, i) => ({
    name: `d${i}`,
    val: Math.max(0, Math.round(baseImp * (0.5 + Math.random() * 0.5) / points)),
  }));
}

function mapRemoteWorkspace(remote: any): WorkspaceItem {
  return {
    id: Number(remote.id ?? remote.user_id ?? remote.workspace_id ?? 0),
    name: remote.business_name || remote.name || `Workspace ${remote.id ?? ""}`,
    sector: remote.industry || remote.sector || undefined,
    created_at: remote.created_at || remote.createdAt || undefined,
    logo: remote.logo_url || remote.logo_path || remote.logo || undefined,
    url: remote.logo_url || remote.logo || undefined,
  };
}

async function safeFetchJson(url: string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) return null; // Suppress errors for non-2xx responses
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return await response.json().catch(() => null);
    }
    return null;
  } catch (error) {
    // console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

function exportCSV(workspaces: WorkspaceItem[], metricsMap: Record<number, WorkspaceMetrics>, selectedIds?: number[]) {
  const header = ["id", "name", "sector", "spend", "leads", "reach", "impressions", "clicks", "ctr", "cpm"];
  const rows = workspaces
    .filter((w) => !selectedIds || selectedIds.length === 0 || selectedIds.includes(w.id))
    .map((w) => {
      const m = metricsMap[w.id];
      return [
        w.id,
        `"${(w.name ?? "").replace(/"/g, '""')}"`,
        w.sector ?? "",
        m?.total_spend ?? 0,
        m?.leads ?? 0,
        m?.reach ?? 0,
        m?.impressions ?? 0,
        m?.clicks ?? 0,
        m?.ctr ?? 0,
        m?.cpm ?? 0,
      ].join(",");
    });

  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `workspaces_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EnhancedWorkspaceDashboard(): JSX.Element {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Data State
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [metricsMap, setMetricsMap] = useState<Record<number, WorkspaceMetrics>>({});
  const [loading, setLoading] = useState(true);

  // Realtime State
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const pollRef = useRef<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filter State
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"spend" | "leads" | "reach">("spend");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");

  // Selection & Pagination
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(9);

  // --- Fetch Logic ---

  async function fetchWorkspacesAndMetrics(userId: number, API_BASE: string) {
    setLoading(true);
    try {
      // 1. Fetch Workspaces
      let got: WorkspaceItem[] = [];
      const wsResp = await safeFetchJson(`${API_BASE}/api/workspaces?user_id=${userId}`, { credentials: "include" });
      if (wsResp) {
        const raw = (wsResp as any).workspaces ?? (Array.isArray(wsResp) ? wsResp : []);
        got = Array.isArray(raw) ? raw.map(mapRemoteWorkspace) : [];
      }

      // Fallback
      if (got.length === 0) {
        const meResp = await safeFetchJson(`${API_BASE}/api/workspace/me?user_id=${userId}`, { credentials: "include" });
        if (meResp) {
          const raw = (meResp as any).workspace ?? meResp;
          if (Array.isArray(raw)) got = raw.map(mapRemoteWorkspace);
          else if (raw) got = [mapRemoteWorkspace(raw)];
        }
      }

      setWorkspaces(got);

      // 2. Fetch Metrics (Parallel)
      const mm: Record<number, WorkspaceMetrics> = {};
      await Promise.all(got.map(async (w) => {
        try {
          const params = new URLSearchParams({
            workspace_id: String(w.id),
            user_id: String(userId),
            date_preset: dateRange === "7d" ? "last_7d" : dateRange === "90d" ? "last_90d" : "last_30d"
          });
          const resp = await safeFetchJson(`${API_BASE}/api/meta/consolidated-campaigns?${params}`, { credentials: "include" });
          const totals = resp?.totals || {};
          const c_spend = totals.spend || 0;
          const c_impr = totals.impressions || 0;
          const c_clicks = totals.clicks || 0;

          mm[w.id] = {
            workspace_id: w.id,
            total_spend: c_spend,
            leads: totals.leads || 0,
            active_campaigns: (resp?.campaigns || []).filter((c: any) => c.status === 'ACTIVE').length,
            reach: totals.reach || 0,
            impressions: c_impr,
            clicks: c_clicks,
            ctr: totals.ctr_pct || 0,
            cpm: totals.cpm || 0,
            last_updated: new Date().toISOString()
          };
        } catch { }
      }));
      setMetricsMap(prev => ({ ...prev, ...mm }));

    } finally {
      setLoading(false);
    }
  }

  // --- Effects ---

  // --- Effects ---

  useEffect(() => {
    let mounted = true;
    const API_BASE = (import.meta.env.VITE_API_BASE ?? "").toString().replace(/\/$/, "");

    async function init() {
      // 1. Get User
      let userId: number | null = null;
      try {
        const raw = localStorage.getItem("sv_user");
        if (raw) userId = JSON.parse(raw)?.id;
      } catch { }

      if (!userId) {
        const me = await safeFetchJson(`${API_BASE}/api/me`, { credentials: "include" });
        userId = (me as any)?.user?.id || (me as any)?.id;
      }

      if (!userId) {
        if (mounted) {
          setLoading(false);
          toast({ title: "Authentication check failed", description: "Please ensure you are logged in." });
        }
        return;
      }

      await fetchWorkspacesAndMetrics(userId, API_BASE);
    }

    init();

    return () => {
      mounted = false;
    };
  }, [dateRange, refreshKey]);

  // --- Filters & Computed ---

  const sectors = useMemo(() => Array.from(new Set(workspaces.map(w => w.sector).filter(Boolean))).sort(), [workspaces]);

  const filtered = useMemo(() => {
    let arr = workspaces.slice();
    if (search) arr = arr.filter(w => w.name.toLowerCase().includes(search.toLowerCase()));
    if (sectorFilter) arr = arr.filter(w => w.sector === sectorFilter);

    arr.sort((a, b) => {
      const ma = metricsMap[a.id];
      const mb = metricsMap[b.id];
      if (sortBy === 'spend') return (mb?.total_spend ?? 0) - (ma?.total_spend ?? 0);
      if (sortBy === 'leads') return (mb?.leads ?? 0) - (ma?.leads ?? 0);
      return (mb?.reach ?? 0) - (ma?.reach ?? 0);
    });
    return arr;
  }, [workspaces, metricsMap, search, sectorFilter, sortBy]);

  const displayed = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const totals = useMemo(() => {
    const vals = Object.values(metricsMap);
    return {
      spend: vals.reduce((s, m) => s + (m.total_spend || 0), 0),
      leads: vals.reduce((s, m) => s + (m.leads || 0), 0),
      active: vals.reduce((s, m) => s + (m.active_campaigns || 0), 0)
    }
  }, [metricsMap]);

  // --- Handlers ---

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleRefresh = () => {
    setRefreshKey(p => p + 1);
    toast({ title: "Refreshing data..." });
  };

  return (
    <div className="min-h-screen bg-gray-50/50">

      {/* Overview Header (Stats) */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="px-6 py-4 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Workspaces</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Monitor performance across all your business units.
                {realtimeConnected && <span className="inline-flex items-center ml-2 text-green-600 text-xs font-medium"><Activity className="w-3 h-3 mr-1" /> Live Updates</span>}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
              <Button onClick={() => navigate("/workspace/create")} className="bg-primary shadow-sm hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" /> New Workspace
              </Button>
            </div>
          </div>

          {/* Summary Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm flex items-center justify-between relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-sm font-medium text-muted-foreground">Total Spend (30d)</p>
                <h3 className="text-2xl font-bold mt-1">${totals.spend.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-full text-primary group-hover:scale-110 transition-transform">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm flex items-center justify-between relative overflow-hidden group">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                <h3 className="text-2xl font-bold mt-1">{totals.leads.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-green-100 text-green-700 rounded-full group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm flex items-center justify-between relative overflow-hidden group">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Campaigns</p>
                <h3 className="text-2xl font-bold mt-1">{totals.active}</h3>
              </div>
              <div className="p-3 bg-indigo-100 text-indigo-700 rounded-full group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-2 rounded-lg border shadow-sm">
          <div className="flex gap-2 items-center w-full md:w-auto flex-1">
            <div className="relative flex-1 md:max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search workspaces..."
                className="pl-9 bg-gray-50 border-0 focus-visible:ring-1"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="h-8 w-[1px] bg-border mx-2 hidden md:block" />

            <select
              className="bg-transparent text-sm font-medium focus:outline-none"
              value={sectorFilter || ""}
              onChange={e => setSectorFilter(e.target.value || null)}
            >
              <option value="">All Sectors</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <select
              className="text-sm border rounded-md px-2 py-1.5 bg-background"
              value={dateRange}
              onChange={e => setDateRange(e.target.value as any)}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>

            <Button variant="ghost" size="icon" onClick={() => exportCSV(workspaces, metricsMap, selectedIds)}>
              <Download className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-xl border border-dashed">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <SearchIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No workspaces found</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mt-2">
              We couldn't find any workspaces matching your criteria. Try adjusting your filters or create a new one.
            </p>
            <Button className="mt-6" variant="outline" onClick={() => { setSearch(""); setSectorFilter(null); }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayed.map(w => {
                const m = metricsMap[w.id];
                const chartData = makeTimeSeriesFromMetric(m);
                const isSelected = selectedIds.includes(w.id);

                return (
                  <Card
                    key={w.id}
                    className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg border-2 ${isSelected ? 'border-primary' : 'border-transparent hover:border-gray-200'}`}
                    onClick={(e) => {
                      // toggle selection if clicking card body (not buttons)
                      if (!(e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('a')) {
                        toggleSelect(w.id);
                      }
                    }}
                  >
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/80 hover:bg-white shadow-sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => navigate(`/workspace/${w.id}/chat`)}>Open Chat</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/workspace/${w.id}/settings`)}>Settings</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => exportCSV([w], metricsMap)}>Export Report</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <CardContent className="p-5">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="relative">
                          <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                            <AvatarImage src={w.logo || w.url} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">{w.name.substring(0, 1)}</AvatarFallback>
                          </Avatar>
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center border-2 border-white">
                              <span className="text-[10px] font-bold">✓</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg text-gray-900 truncate">{w.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {w.sector && <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] font-normal">{w.sector}</Badge>}
                            <span className="text-xs text-muted-foreground">ID: {w.id}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-gray-50">
                          <p className="text-xs font-medium text-muted-foreground uppercase">Spend</p>
                          <p className="text-lg font-bold text-gray-900">${(m?.total_spend ?? 0).toLocaleString()}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50">
                          <p className="text-xs font-medium text-muted-foreground uppercase">Leads</p>
                          <p className="text-lg font-bold text-gray-900">{(m?.leads ?? 0).toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Sparkline */}
                      <div className="h-12 w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id={`grad-${w.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <Tooltip cursor={false} content={() => null} />
                            <Area type="monotone" dataKey="val" stroke="#8884d8" fillOpacity={1} fill={`url(#grad-${w.id})`} strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>

                    <CardFooter className="px-5 py-3 bg-gray-50 border-t flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        ROAS: <span className="font-medium text-gray-900">{((m?.total_spend && m?.total_spend > 0) ? (m.leads * 50 / m.total_spend).toFixed(1) : "0.0")}x</span>
                      </span>
                      <Button size="sm" variant="ghost" className="h-7 text-primary hover:text-primary hover:bg-primary/10 px-2" onClick={() => navigate(`/workspace/${w.id}/chat`)}>
                        Go to Workspace <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>

            {/* Simple Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
