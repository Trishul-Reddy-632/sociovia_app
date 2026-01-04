// src/pages/EnhancedDashboard.withSidebarAndChatbot.tsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/sociovia_logo.png";
import metaLogo from "@/assets/metaa2.png";
import whatsappLogo from "@/assets/wp-logo.png";
import googleLogo from "@/assets/Google-logo.png";
import customWorkflows from "@/assets/workflows.jpg";
// NOTE: FloatingAssistant component
import FloatingAssistant, { AssistantWorkflowPayload } from "@/pages/Assistant";
import {
  Target,
  Users,
  DollarSign,
  Eye,
  Settings,
  Search as SearchIcon,
  ExternalLink,
  Download,
  AlertTriangle,
  Zap,
  Wallet,
  ChevronDown,
  MessageCircle,
  Copy,
  Trash,
  Activity,
  RefreshCw,
  PanelLeft,
  Mail,
  Workflow,
  Coins,
  LayoutGrid,
  Briefcase,
  Layers,
  BarChart3,
  X,
  Menu,
  Plus,
  LogOut,

} from "lucide-react";
import { SidebarAnalytics, AnalyticsType } from "@/components/SidebarAnalytics";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { api } from "@/crm/api";
import { API_BASE_URL } from "@/config";
import apiClient from "@/lib/apiClient";

// ---------------- Types ----------------
type WorkspaceItem = {
  url?: string;
  id: number;
  name: string;
  sector?: string;
  role?: string;
  created_at?: string;
  logo?: string;
  [k: string]: any;
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

// ---------------- helpers (same as original) ----------------
function generateAIInsights(metricsMap: Record<number, WorkspaceMetrics>) {
  const metrics = Object.values(metricsMap);
  if (metrics.length === 0)
    return [
      {
        severity: "info",
        text: "No data available to generate AI insights.",
      },
    ];
  const totalImpressions = metrics.reduce(
    (s, m) => s + (m.impressions ?? 0),
    0
  );
  const totalClicks = metrics.reduce((s, m) => s + (m.clicks ?? 0), 0);
  const totalLeads = metrics.reduce((s, m) => s + (m.leads ?? 0), 0);
  const totalSpend = metrics.reduce(
    (s, m) => s + (m.total_spend ?? 0),
    0
  );
  const avgCtr =
    totalImpressions > 0
      ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2))
      : 0;
  const avgCpm = metrics.length
    ? parseFloat(
      (
        metrics.reduce((s, m) => s + (m.cpm ?? 0), 0) / metrics.length
      ).toFixed(2)
    )
    : 0;
  const insights: { severity: string; text: string }[] = [];
  if (totalSpend > 20000 && totalLeads < 100) {
    insights.push({
      severity: "warning",
      text: `High total spend ($${Math.round(
        totalSpend
      ).toLocaleString()}) but fewer leads (${totalLeads}). Consider reviewing targeting or creative.`,
    });
  }
  if (avgCtr >= 2.5) {
    insights.push({
      severity: "success",
      text: `CTR looks healthy at ${avgCtr}%. Keep scaling campaigns with best performing creatives.`,
    });
  } else if (avgCtr < 1.0) {
    insights.push({
      severity: "critical",
      text: `CTR is low (${avgCtr}%). Suggest testing new creatives and tighter audience targeting.`,
    });
  } else {
    insights.push({
      severity: "info",
      text: `Average CTR is ${avgCtr}%. Monitor for trending changes.`,
    });
  }
  if (avgCpm > 20) {
    insights.push({
      severity: "warning",
      text: `Average CPM is high ($${avgCpm}). Consider optimizing bidding strategies or narrowing targeting to improve efficiency.`,
    });
  }
  const topByLeads = metrics
    .slice()
    .sort((a, b) => b.leads - a.leads)[0];
  if (topByLeads) {
    insights.push({
      severity: "success",
      text: `Top workspace for leads: workspace#${topByLeads.workspace_id} with ${topByLeads.leads} leads.`,
    });
  }
  if (totalLeads / (metrics.length || 1) < 30) {
    insights.push({
      severity: "info",
      text: "Recommend running a lead magnet campaign (free trial, checklist) to boost conversion rates.",
    });
  }
  return insights;
}
function exportCSV(
  workspaces: WorkspaceItem[],
  metricsMap: Record<number, WorkspaceMetrics>
) {
  const header = [
    "workspace_id",
    "name",
    "sector",
    "logo",
    "total_spend",
    "leads",
    "active_campaigns",
    "reach",
    "impressions",
    "clicks",
    "ctr",
    "cpm",
    "last_updated",
  ];
  const rows = workspaces.map((w) => {
    const m = metricsMap[w.id];
    return [
      w.id,
      `"${(w.name ?? "").replace(/"/g, '""')}"`,
      w.sector ?? "",
      w.logo ?? "",
      m?.total_spend ?? 0,
      m?.leads ?? 0,
      m?.active_campaigns ?? 0,
      m?.reach ?? 0,
      m?.impressions ?? 0,
      m?.clicks ?? 0,
      m?.ctr ?? 0,
      m?.cpm ?? 0,
      m?.last_updated ?? "",
    ].join(",");
  });
  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `workspaces_export_${new Date().toISOString()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
function mapRemoteWorkspace(remote: any): WorkspaceItem {
  return {
    id: Number(
      remote.id ?? remote.user_id ?? remote.workspace_id ?? 0
    ),
    name:
      remote.business_name ||
      remote.name ||
      `Workspace ${remote.id ?? remote.user_id ?? ""}`,
    sector: remote.industry || remote.sector || undefined,
    created_at: remote.created_at || remote.createdAt || undefined,
    logo:
      remote.logo_url ||
      remote.logo_path ||
      remote.logo ||
      remote.image ||
      undefined,
    url:
      remote.logo_url ||
      remote.logo ||
      remote.image ||
      undefined,
    _raw: remote,
  } as WorkspaceItem;
}
function placeholderForName(name?: string, size = 64) {
  const initials =
    (name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0].toUpperCase())
      .join("") || "WS";
  return `https://via.placeholder.com/${size}?text=${encodeURIComponent(
    initials
  )}`;
}
async function safeFetchJson(url: string, options: RequestInit = {}) {
  try {
    const res = await apiClient.get(url);
    if (res.ok) return res.data;
    return null;
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    return null;
  }
}
// ---------------- small Custom Modal (local) ----------------
function SignOutModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return createPortal(
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-lg shadow-lg p-6 w-full max-w-md z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-2">Sign out</h3>
        <p className="text-sm text-muted-foreground mb-4">
          This will end your session and remove saved workspace data. Are you
          sure you want to continue?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Sign out
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
export default function EnhancedDashboard(): JSX.Element {
  const navigate = useNavigate();
  const { toast: showToast } = useToast();
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [metricsMap, setMetricsMap] = useState<
    Record<number, WorkspaceMetrics>
  >({});
  const [accountBalance, setAccountBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"spend" | "leads" | "reach">(
    "spend"
  );
  const [dateRange, setDateRange] = useState<"30d" | "7d" | "90d">("30d");
  const [showRawPayloads, setShowRawPayloads] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const viewButtonRef = useRef<HTMLButtonElement | null>(null);
  const switcherRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [panelPos, setPanelPos] = useState<{
    top: number;
    left: number;
    width?: number;
  } | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(
    null
  );
  const [persistedEcho, setPersistedEcho] = useState<string | null>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [floatingChatEnabled, setFloatingChatEnabled] =
    useState<boolean>(true);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [overviewData, setOverviewData] = useState<any[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [missingSocialAccount, setMissingSocialAccount] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [analyticsView, setAnalyticsView] = useState<AnalyticsType>(null);

  // Token usage state
  const [tokenUsage, setTokenUsage] = useState({
    totalTokens: 0,
    totalCost: 0
  });

  const handleUserNavigation = (path: string) => {
    if (path === "/auth" || path === "/login" || path === "/") {
      setPendingPath(path);
      setSignOutOpen(true);
    } else {
      navigate(path);
    }
  };

  // 🔥 When AI sends a full workflow (nodes + edges)
  const handleWorkflowJsonFromAssistant = useCallback(
    (workflow: AssistantWorkflowPayload) => {
      navigate("/workflow-builder", {
        state: {
          fromAssistant: true,
          workflow,
        },
      });
    },
    [navigate]
  );

  // 🔥 When AI sends only a template id
  const handleWorkflowTemplateFromAssistant = useCallback(
    (templateId: string) => {
      navigate("/workflow-builder", {
        state: {
          fromAssistant: true,
          templateId,
        },
      });
    },
    [navigate]
  );

  const LOW_BALANCE_THRESHOLD = 50;
  const API_BASE = API_BASE_URL;

  // --------- verify session on mount ----------
  useEffect(() => {
    let mounted = true;
    async function checkSessionAndInit() {
      setLoading(true);
      try {
        const resp = await apiClient.get("/me");

        if (!mounted) return;
        if (!resp.ok) {
          // Fallback: If /me fails (e.g. cross-origin cookie issue), check if we have a valid user in localStorage
          // This prevents infinite login loops when the backend session check fails but the user successfully logged in.
          try {
            const raw = localStorage.getItem("sv_user");
            if (raw) {
              const u = JSON.parse(raw);
              if (u && u.id) {
                console.warn("Session check failed but found local user. Allow access.");
                return;
              }
            }
          } catch { }

          navigate("/login");
          return;
        }

        const user = resp.data?.user ?? resp.data;
        if (!user?.id) {
          navigate("/login");
          return;
        }
        try {
          localStorage.setItem("sv_user", JSON.stringify(user));
          if (user.id) localStorage.setItem("sv_user_id", String(user.id));
        } catch { }
        try {
          sessionStorage.setItem("sv_user", JSON.stringify(user));
        } catch { }
      } catch (err) {
        console.error("Session check failed:", err);
        localStorage.removeItem("sv_user");
        sessionStorage.removeItem("sv_user");
        localStorage.removeItem("sv_selected_workspace_id");
        sessionStorage.removeItem("sv_selected_workspace_id");
        navigate("/login");
        return;
      } finally {
      }
    }
    checkSessionAndInit();
    return () => {
      mounted = false;
    };
  }, [API_BASE, navigate]);

  // --------- main data fetch ----------
  useEffect(() => {
    let mounted = true;
    async function tryFetch() {
      setLoading(true);
      let userId: number | null = null;
      try {
        const raw =
          localStorage.getItem("sv_user") ||
          sessionStorage.getItem("sv_user");
        if (raw) {
          const u = JSON.parse(raw);
          userId = u?.id ?? null;
        }
      } catch { }
      if (!userId) {
        try {
          const meResp = await apiClient.get("/me");
          if (meResp.ok) {
            const u = meResp.data?.user ?? meResp.data;
            userId = u?.id ?? null;
            if (u && u.id) {
              try {
                localStorage.setItem("sv_user", JSON.stringify(u));
                if (u.id) localStorage.setItem("sv_user_id", String(u.id));
              } catch { }
              try {
                sessionStorage.setItem("sv_user", JSON.stringify(u));
              } catch { }
            }
          } else {
            // ... existing fallback logic ...
            try {
              const raw = localStorage.getItem("sv_user");
              if (raw) {
                const u = JSON.parse(raw);
                if (u && u.id) {
                  console.warn("Session check failed but found local user. Allow access.");
                  userId = u.id;
                }
              }
            } catch { }

            if (!userId) {
              // ... existing logout ...
              localStorage.removeItem("sv_user");
              sessionStorage.removeItem("sv_user");
              localStorage.removeItem("sv_selected_workspace_id");
              sessionStorage.removeItem("sv_selected_workspace_id");
              navigate("/login");
              return;
            }
          }
        } catch (err) {
          console.error("me fetch error:", err);
        }
      }
      if (!userId) {
        navigate("/login");
        return;
      }

      // Cache check
      // ... existing cache logic ...
      const CACHE_KEY = `sv_dashboard_cache_${userId}`;
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
            console.log("Using cached dashboard data");
            // ... existing cache applying ...
            const got = parsed.workspaces;
            try {
              const persisted = sessionStorage.getItem("sv_selected_workspace_id") || localStorage.getItem("sv_selected_workspace_id");
              if (persisted && got.some((w: any) => w.id === Number(persisted))) {
                setSelectedWorkspaceId(Number(persisted));
              } else if (got.length > 0) {
                const defaultId = got[0].id;
                setSelectedWorkspaceId(defaultId);
                sessionStorage.setItem("sv_selected_workspace_id", String(defaultId));
                localStorage.setItem("sv_selected_workspace_id", String(defaultId));
              }
            } catch (e) {
              console.warn("Cache workspace selection failed", e);
            }

            setWorkspaces(parsed.workspaces);
            setMetricsMap(parsed.metricsMap);

            // Fetch token usage summary (real-time data)
            try {
              const tokenResp = await apiClient.get("/usage/summary");
              if (tokenResp.ok) {
                const tokenData = tokenResp.data;
                setTokenUsage({
                  totalTokens: tokenData.total?.total_tokens || 0,
                  totalCost: Number(tokenData.total?.cost_inr || 0),
                });
              }
            } catch { }

            setLoading(false);
            return;
          }
        }
      } catch (e) { console.warn("Cache read failed", e); }

      let got: WorkspaceItem[] = [];

      // Fetch workspaces using safeFetchJson (which now uses apiClient)
      // Note: apiClient handles the full URL or relative. safeFetchJson logic above handles it.
      // But safeFetchJson signature in this replacement expects url and options.

      // Fetch workspaces using safeFetchJson (which now uses apiClient)
      // User explicitly requested /api/workspace (singular)
      // apiClient already appends /api base, so we pass just /workspace
      try {
        const body = await safeFetchJson(`/workspace?user_id=${userId}`);
        if (body) {
          if (Array.isArray((body as any).workspaces)) {
            got = (body as any).workspaces.map(mapRemoteWorkspace);
          } else if ((body as any).workspace) {
            const w = (body as any).workspace;
            if (Array.isArray(w)) {
              got = w.map(mapRemoteWorkspace);
            } else {
              got = [mapRemoteWorkspace(w)];
            }
          } else if (Array.isArray(body)) {
            got = (body as any).map(mapRemoteWorkspace);
          }
        }
      } catch (err) {
        console.warn("workspace fetch failed:", err);
      }

      // Fallback to plural /workspaces if singular returned nothing
      if (got.length === 0) {
        try {
          const body = await safeFetchJson(`/workspaces?user_id=${userId}`);
          if (body) {
            if (Array.isArray((body as any).workspaces)) {
              got = (body as any).workspaces.map(mapRemoteWorkspace);
            } else if (Array.isArray(body)) {
              got = (body as any).map(mapRemoteWorkspace);
            }
          }
        } catch (err) {
          console.warn("workspaces fallback failed:", err);
        }
      }

      // ... storage logic ...
      try {
        localStorage.setItem("sv_workspaces", JSON.stringify(got));
      } catch { }
      try {
        sessionStorage.setItem("sv_workspaces", JSON.stringify(got));
      } catch { }

      const finalMap: Record<number, WorkspaceMetrics> = {};

      // Fetch consolidated metrics
      const selectedWsId = sessionStorage.getItem("sv_selected_workspace_id") || localStorage.getItem("sv_selected_workspace_id");
      const workspacesToFetch = selectedWsId
        ? got.filter(w => String(w.id) === selectedWsId)
        : got.slice(0, 5);

      try {
        const metricsPromises = workspacesToFetch.map(async (w) => {
          try {
            const params = new URLSearchParams();
            params.append("workspace_id", String(w.id));
            params.append("user_id", String(userId));
            params.append("date_preset", dateRange === "7d" ? "last_7d" : dateRange === "90d" ? "last_90d" : "last_30d");

            const resp = await safeFetchJson(`/api/meta/consolidated-campaigns?${params.toString()}`);

            // ... processing logic remains same ...
            if (!resp || resp.error) {
              return {
                workspace_id: w.id,
                total_spend: 0,
                leads: 0,
                active_campaigns: 0,
                reach: 0,
                impressions: 0,
                clicks: 0,
                ctr: 0,
                cpm: 0,
                last_updated: undefined,
              };
            }

            const totals = resp?.totals || {};
            // ... mapping ...
            const c_spend = totals.spend || 0;
            const c_impr = totals.impressions || 0;
            const c_clicks = totals.clicks || 0;
            const calculated_ctr = c_impr > 0 ? (c_clicks / c_impr) * 100 : 0;
            const calculated_cpm = c_impr > 0 ? (c_spend / c_impr) * 1000 : 0;

            const allCampaigns = resp?.campaigns || [];
            const activeCount = allCampaigns.filter((c: any) => {
              const s = c.status?.toUpperCase();
              return s === 'ACTIVE' || !s;
            }).length;

            return {
              workspace_id: w.id,
              total_spend: c_spend,
              leads: totals.leads || 0,
              active_campaigns: activeCount,
              reach: totals.reach || 0,
              impressions: c_impr,
              clicks: c_clicks,
              ctr: totals.ctr_pct || calculated_ctr,
              cpm: totals.cpm || calculated_cpm,
              last_updated: new Date().toISOString(),
            };
          } catch {
            return {
              workspace_id: w.id,
              total_spend: 0,
              leads: 0,
              active_campaigns: 0,
              reach: 0,
              impressions: 0,
              clicks: 0,
              ctr: 0,
              cpm: 0,
              last_updated: undefined,
            };
          }
        });

        const results = await Promise.all(metricsPromises);
        results.forEach(m => {
          finalMap[m.workspace_id] = m;
        });

      } catch (err) {
        console.warn("Bulk metrics fetch error", err);
      }

      // ... cache save logic ...
      try {
        if (got.length > 0) {
          localStorage.setItem(`sv_dashboard_cache_${userId}`, JSON.stringify({
            timestamp: Date.now(),
            workspaces: got,
            metricsMap: finalMap
          }));
        }
      } catch (e) { console.warn("Cache save failed", e); }


      if (!mounted) return;
      setWorkspaces(got);
      setMetricsMap(finalMap);
      setAccountBalance(0);

      // ... workspace restoration logic ...
      try {
        const persisted =
          sessionStorage.getItem("sv_selected_workspace_id") ||
          localStorage.getItem("sv_selected_workspace_id");
        // ... same logic ...
        if (persisted) {
          const pid = Number(persisted);
          if (got.some((w) => w.id === pid)) {
            setSelectedWorkspaceId(pid);
            setPersistedEcho(
              `sv_selected_workspace_id=${pid} (restored)`
            );
          } else {
            // Invalid workspace ID in storage, reset to first available or null
            console.warn(`Stored workspace ID ${pid} not found in available workspaces. Resetting.`);
            if (got.length > 0) {
              const defaultId = got[0].id;
              sessionStorage.setItem("sv_selected_workspace_id", String(defaultId));
              localStorage.setItem("sv_selected_workspace_id", String(defaultId));
              setSelectedWorkspaceId(defaultId);
              setPersistedEcho(`sv_selected_workspace_id=${defaultId} (reset to default)`);
            } else {
              localStorage.removeItem("sv_selected_workspace_id");
              sessionStorage.removeItem("sv_selected_workspace_id");
              setSelectedWorkspaceId(null);
              setPersistedEcho(null);
            }
          }
        } else {
          if (got.length > 0) {
            sessionStorage.setItem(
              "sv_selected_workspace_id",
              String(got[0].id)
            );
            localStorage.setItem(
              "sv_selected_workspace_id",
              String(got[0].id)
            );
            setSelectedWorkspaceId(got[0].id);
            setPersistedEcho(
              `sv_selected_workspace_id=${got[0].id} (stored default)`
            );
          } else {
            setSelectedWorkspaceId(null);
            setPersistedEcho(null);
          }
        }

      } catch { }

      // Fetch token usage summary (real-time data)
      try {
        const tokenResp = await apiClient.get("/usage/summary");
        if (tokenResp.ok) {
          const tokenData = tokenResp.data;
          if (tokenData.ok && tokenData.total) {
            setTokenUsage({
              totalTokens: tokenData.total.total_tokens || 0,
              totalCost: Number(tokenData.total.cost_inr || 0),
            });
          } else {
            setTokenUsage({ totalTokens: 0, totalCost: 0 });
          }
        } else {
          setTokenUsage({ totalTokens: 0, totalCost: 0 });
        }
      } catch (err) {
        console.warn("Failed to fetch token usage:", err);
        setTokenUsage({ totalTokens: 0, totalCost: 0 });
      }

      setLoading(false);
    }
    tryFetch();
    return () => {
      /* cleanup */
    };
  }, [API_BASE, dateRange, navigate]);

  // Fetch overview data when workspace or date range changes
  useEffect(() => {
    async function fetchOverview() {
      if (!selectedWorkspaceId) return;
      setOverviewLoading(true);
      try {
        const datePreset = dateRange === "7d" ? "last_7d" : dateRange === "90d" ? "last_90d" : "last_30d";

        // 1. Fetch Consolidated Campaigns to find top one
        // api.getConsolidatedCampaigns automatically appends workspace_id and user_id from localStorage
        const data = await api.getConsolidatedCampaigns({ date_preset: datePreset });
        console.log("Consolidated campaigns data:", data);

        let chartData: any[] = [];

        // Strategy: specific campaign trend if available, else fallback to overview
        const campaigns = data.campaigns || [];

        // Find top campaign by spend (or first active)
        const topCampaign = campaigns.sort((a: any, b: any) => {
          const sA = Number(a.spend || a.insights?.spend || 0);
          const sB = Number(b.spend || b.insights?.spend || 0);
          return sB - sA;
        })[0];

        if (topCampaign) {
          const cId = topCampaign.id || topCampaign.meta_campaign_id;
          console.log("Fetching insights for top campaign:", topCampaign.name, cId);
          try {
            // Fetch insights for this specific campaign using client wrapper
            // This wrapper calls /api/campaigns/:id/insights?date_preset=...
            const iData = await api.getCampaignInsights(cId, datePreset);
            console.log("Campaign insights response:", iData);

            if (iData.trend && Array.isArray(iData.trend) && iData.trend.length > 0) {
              // Map trend to graph format
              chartData = iData.trend.map((t: any) => ({
                name: t.date, // XAxis expects 'name'
                spend: Number(t.spend || 0),
                clicks: Number(t.clicks || 0),
                impressions: Number(t.impressions || 0),
              }));
            } else {
              console.warn("No trend data found in campaign insights");
            }
          } catch (err) {
            console.warn("Failed to fetch specific campaign insights via API client", err);
          }
        } else {
          console.log("No top campaign found to fetch insights for");
        }

        // If specific campaign fetch failed or no trend, fallback to recharts_overview if exists
        if (chartData.length === 0 && data.recharts_overview) {
          console.log("Falling back to global overview data");
          chartData = data.recharts_overview;
        }

        setOverviewData(chartData);

        setOverviewData(chartData);

      } catch (e: any) {
        if (e.message && e.message.includes("No Facebook SocialAccount found")) {
          setMissingSocialAccount(true);
        }
        console.warn("Failed to fetch overview chart data", e);
      } finally {
        setOverviewLoading(false);
      }
    }
    fetchOverview();
  }, [selectedWorkspaceId, dateRange, API_BASE]);

  const handleRefresh = useCallback(() => {
    try {
      const raw = localStorage.getItem("sv_user"); // we just clear local cache and reload
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.id) localStorage.removeItem(`sv_dashboard_cache_${u.id}`);
      }
      window.location.reload();
    } catch (e) { console.error(e); }
  }, []);

  const performSignOut = useCallback(
    async (navigateTo = "/login") => {
      try {
        try {
          await fetch(`${API_BASE}/api/logout`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.warn("server logout failed:", err);
        }
        const keys = [
          "sv_user",
          "sv_user_id",
          "sv_workspaces",
          "sv_selected_workspace_id",
        ];
        keys.forEach((k) => {
          try {
            localStorage.removeItem(k);
          } catch { }
        });
        keys.forEach((k) => {
          try {
            sessionStorage.removeItem(k);
          } catch { }
        });
        setWorkspaces([]);
        setMetricsMap({});
        setSelectedWorkspaceId(null);
        setAccountBalance(0);
        showToast({
          title: "Logged out",
          description: "You have been logged out.",
        });
        setSignOutOpen(false);
        navigate(navigateTo);
      } catch (err) {
        console.error("performSignOut error:", err);
        showToast({
          title: "Logout error",
          description: "Could not log out cleanly.",
        });
        navigate("/login");
      }
    },
    [API_BASE, navigate, showToast]
  );

  // --- sentinel popstate handler ---
  useEffect(() => {
    const SENTINEL = "sv-dashboard-sentinel-v1";
    try {
      const current = window.history.state;
      if (!current || (current && current.sv !== SENTINEL)) {
        window.history.pushState({ sv: SENTINEL }, "");
      }
    } catch (e) {
      console.warn("history.pushState failed:", e);
    }
    const onPop = (ev: PopStateEvent) => {
      const state = (ev.state as any) || window.history.state;
      const isOurSentinel = state && state.sv === SENTINEL;
      if (isOurSentinel || window.history.length <= 1) {
        try {
          window.history.pushState({ sv: SENTINEL }, "");
        } catch (err) {
          /* ignore */
        }
        setSignOutOpen(true);
      } else {
        // allow normal SPA navigation
      }
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      try {
        const nowState = window.history.state;
        if (nowState && nowState.sv === SENTINEL) {
          window.history.replaceState(null, "");
        }
      } catch (e) { }
    };
  }, []);

  useEffect(() => {
    const onPop = () => {
      const user =
        sessionStorage.getItem("sv_user") ||
        localStorage.getItem("sv_user");
      if (!user) {
        setSignOutOpen(true);
        try {
          window.history.pushState({}, "");
        } catch { }
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const sectors = useMemo(() => {
    const set = new Set<string>();
    workspaces.forEach((w) => w.sector && set.add(w.sector));
    return Array.from(set).sort();
  }, [workspaces]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = workspaces.slice();
    if (sectorFilter)
      arr = arr.filter(
        (w) =>
          (w.sector ?? "").toLowerCase() ===
          sectorFilter.toLowerCase()
      );
    if (q)
      arr = arr.filter((w) =>
        (w.name + " " + (w.sector ?? ""))
          .toLowerCase()
          .includes(q)
      );
    arr.sort((a, b) => {
      const ma = metricsMap[a.id];
      const mb = metricsMap[b.id];
      if (sortBy === "spend")
        return (mb?.total_spend ?? 0) - (ma?.total_spend ?? 0);
      if (sortBy === "leads")
        return (mb?.leads ?? 0) - (ma?.leads ?? 0);
      return (mb?.reach ?? 0) - (ma?.reach ?? 0);
    });
    return arr;
  }, [workspaces, metricsMap, search, sectorFilter, sortBy]);

  function getSafeMetrics(id: number): WorkspaceMetrics {
    const m = metricsMap[id];
    if (m) return m;
    return {
      workspace_id: id,
      total_spend: 0,
      leads: 0,
      active_campaigns: 0,
      reach: 0,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      cpm: 0,
      last_updated: undefined,
    };
  }

  const computePanelPosition = useCallback(
    (triggerRef?: React.RefObject<HTMLButtonElement>) => {
      const btn = triggerRef?.current ?? viewButtonRef.current;
      if (!btn || typeof window === "undefined") {
        setPanelPos(null);
        return;
      }
      const rect = btn.getBoundingClientRect();
      const panelWidth = 320;
      const top = Math.max(8, rect.bottom + 8);
      const left = Math.min(
        Math.max(8, rect.right - panelWidth),
        Math.max(
          8,
          (window.innerWidth || 1024) - (panelWidth + 24)
        )
      );
      setPanelPos({ top, left, width: panelWidth });
    },
    []
  );

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

  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      if (!switcherOpen) return;
      const target = ev.target as Node;
      if (
        switcherRef.current &&
        switcherRef.current.contains(target)
      )
        return;
      if (anchorRef.current && anchorRef.current.contains(target))
        return;
      setSwitcherOpen(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [switcherOpen]);

  const openSwitcherFor = (
    triggerRef: React.RefObject<HTMLButtonElement>
  ) => {
    anchorRef.current = triggerRef.current;
    computePanelPosition(triggerRef);
    setSwitcherOpen(true);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const selectWorkspace = (id: number) => {
    try {
      localStorage.setItem("sv_selected_workspace_id", String(id));
    } catch { }
    try {
      sessionStorage.setItem(
        "sv_selected_workspace_id",
        String(id)
      );
    } catch { }
    setSelectedWorkspaceId(id);
    setPersistedEcho(`sv_selected_workspace_id=${id} (stored)`);
    const name =
      workspaces.find((w) => w.id === id)?.name ??
      `workspace #${id}`;
    showToast({
      title: "Now viewing workspace",
      description: `${name}`,
    });
    setSwitcherOpen(false);
  };

  const displayMetricsMap = useMemo(() => {
    if (!selectedWorkspaceId) return {};
    const m = metricsMap[selectedWorkspaceId];
    return m ? { [selectedWorkspaceId]: m } : {};
  }, [selectedWorkspaceId, metricsMap]);

  const totals = useMemo(() => {
    const vals = Object.values(displayMetricsMap);
    return {
      totalSpend: vals.reduce(
        (s, m) => s + (m.total_spend || 0),
        0
      ),
      totalLeads: vals.reduce((s, m) => s + (m.leads || 0), 0),
      activeCampaigns: vals.reduce(
        (s, m) => s + (m.active_campaigns || 0),
        0
      ),
      totalReach: vals.reduce((s, m) => s + (m.reach || 0), 0),
      totalImpressions: vals.reduce(
        (s, m) => s + (m.impressions || 0),
        0
      ),
      totalClicks: vals.reduce((s, m) => s + (m.clicks || 0), 0),
      avgCtr: vals.length
        ? parseFloat(
          (
            vals.reduce((s, m) => s + (m.ctr || 0), 0) /
            vals.length
          ).toFixed(2)
        )
        : 0,
      avgCpm: vals.length
        ? parseFloat(
          (
            vals.reduce((s, m) => s + (m.cpm || 0), 0) /
            vals.length
          ).toFixed(2)
        )
        : 0,
    };
  }, [displayMetricsMap]);

  const insights = useMemo(
    () => generateAIInsights(displayMetricsMap),
    [displayMetricsMap]
  );

  const downloadReport = () => {
    exportCSV(filtered, metricsMap);
    showToast({
      title: "Export started",
      description: "CSV export started in your browser.",
    });
  };

  const panelStyle: React.CSSProperties = {
    position: "fixed",
    top: panelPos ? panelPos.top : 80,
    left: panelPos
      ? panelPos.left
      : typeof window !== "undefined"
        ? Math.max(
          8,
          (window.innerWidth || 1024) - 344
        )
        : 24,
    width: panelPos?.width ?? 320,
    backgroundColor: "white",
    border: "1px solid rgba(0,0,0,0.08)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    zIndex: 10000,
    padding: 12,
    borderRadius: 8,
    transition: "opacity 0.12s ease, transform 0.12s ease",
    transform: switcherOpen ? "translateY(0)" : "translateY(-6px)",
    opacity: switcherOpen ? 1 : 0,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            <div
              aria-hidden
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                border: "6px solid rgba(0,0,0,0.07)",
                borderTopColor: "rgba(59,130,246,1)",
                animation: "spin 1s linear infinite",
              }}
            />
          </div>
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
          <p className="text-sm text-muted-foreground">
            Checking session and fetching your data.
          </p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const storedUser = (() => {
    try {
      return JSON.parse(
        sessionStorage.getItem("sv_user") ||
        localStorage.getItem("sv_user") ||
        "null"
      );
    } catch {
      return null;
    }
  })();
  if (!storedUser) {
    navigate("/login");
    return null;
  }

  const panel = (
    <div
      ref={switcherRef}
      style={panelStyle}
      role="dialog"
      aria-label="Workspace switcher"
      data-test="workspace-switcher-portal"
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search workspaces..."
          aria-label="Filter workspaces"
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxHeight: 420,
          overflow: "auto",
          paddingBottom: 6,
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ color: "#6b7280", fontSize: 13 }}>
            No workspaces found.
          </div>
        ) : (
          filtered.map((w) => {
            const m = getSafeMetrics(w.id);
            const active = selectedWorkspaceId === w.id;
            const logoSrc =
              w.logo || w.url || placeholderForName(w.name, 64);
            return (
              <div
                key={w.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => selectWorkspace(w.id)}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 10,
                    borderRadius: 8,
                    background: active
                      ? "rgba(59,130,246,0.06)"
                      : "transparent",
                    border: active
                      ? "1px solid rgba(59,130,246,0.12)"
                      : "1px solid rgba(0,0,0,0.04)",
                    textAlign: "left",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                  title={w.name}
                >
                  <img
                    src={logoSrc}
                    alt={w.name}
                    style={{
                      height: 48,
                      width: 48,
                      borderRadius: 8,
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        placeholderForName(w.name, 64);
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {w.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      {w.sector ?? "—"}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        marginTop: 6,
                        fontSize: 12,
                      }}
                    >
                      <div>{m.leads} leads</div>
                      <div>
                        ${m.total_spend?.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {active && <Badge>Selected</Badge>}
                </button>
                {showRawPayloads && (
                  <pre
                    style={{
                      fontSize: 11,
                      maxHeight: 140,
                      overflow: "auto",
                      background: "#f7fafc",
                      padding: 8,
                      borderRadius: 6,
                    }}
                  >
                    {JSON.stringify(w._raw ?? w, null, 2)}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 10,
        }}
      >
        <Button
          onClick={() => {
            setSwitcherOpen(false);
            navigate("/workspace/create");
          }}
        >
          <Download className="w-4 h-4 mr-2" /> New
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setSwitcherOpen(false);
            navigate("/workspaces");
          }}
        >
          Manage
        </Button>
      </div>
    </div>
  );



  // Use the fetched overview data for the chart if available, otherwise fallback or empty
  const graphData = overviewData.length > 0 ? overviewData : [];

  const currentWorkspace =
    workspaces.find((w) => w.id === selectedWorkspaceId) ?? null;
  const currentWorkspaceName =
    currentWorkspace?.name ?? "No workspace selected";
  const currentWorkspaceLogo =
    currentWorkspace?.logo ||
    placeholderForName(currentWorkspace?.name, 64);


  // Mobile menu overlay
  const MobileMenuOverlay = () => {
    if (!mobileMenuOpen) return null;
    return createPortal(
      <div className="fixed inset-0 z-50 md:hidden">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
        {/* Slide-in menu */}
        <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl animate-in slide-in-from-left duration-300">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Sociovia" className="h-8 w-auto" />
              <div>
                <div className="text-sm font-semibold">Sociovia</div>
                <div className="text-xs text-muted-foreground">Ads & Automations</div>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-full hover:bg-muted/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current workspace */}
          <div className="p-4 border-b bg-muted/5">
            <div className="flex items-center gap-3">
              <img
                src={currentWorkspaceLogo}
                alt=""
                className="w-10 h-10 rounded-lg object-cover border"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{currentWorkspaceName}</div>
                <div className="text-xs text-muted-foreground">Active workspace</div>
              </div>
            </div>
          </div>

          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-280px)]">
            {/* Analytics Collapsible Menu */}
            <SidebarAnalytics
              isCollapsed={false}
              activeView={analyticsView}
              onSelectView={(view) => {
                setMobileMenuOpen(false);
                if (view === 'whatsapp') {
                  navigate('/dashboard/whatsapp');
                } else {
                  setAnalyticsView(view);
                }
              }}
            />

            <div className="text-xs font-medium text-muted-foreground px-3 py-2 mt-4">TOOLS</div>
            <button
              onClick={() => { setMobileMenuOpen(false); navigate("/crm/dashboard"); }}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/10 flex items-center gap-3"
            >
              <Briefcase className="w-4 h-4" />
              <span>Sociovia CRM</span>
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); navigate("/workflow-builder"); }}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/10 flex items-center gap-3"
            >
              <Layers className="w-4 h-4" />
              <span>Custom Workflows</span>
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); navigate("/token-tracking"); }}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/10 flex items-center gap-3"
            >
              <Coins className="w-4 h-4" />
              <span>Token Usage</span>
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); navigate("/settings"); }}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/10 flex items-center gap-3"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Button size="sm" onClick={() => { setMobileMenuOpen(false); navigate("/workspace/create"); }}>
                <Plus className="w-4 h-4 mr-1" /> New
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setMobileMenuOpen(false); navigate("/workspaces"); }}>
                Manage
              </Button>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full mb-2"
              onClick={() => { setMobileMenuOpen(false); navigate("/crm/campaigns"); }}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              View Campaigns
            </Button>

            <Button
              variant="ghost"
              className="w-full text-destructive hover:bg-red-50"
              onClick={() => { setMobileMenuOpen(false); setSignOutOpen(true); }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // --- New layout: left sidebar + main content ---
  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Mobile Menu */}
      <MobileMenuOverlay />

      {/* Left sidebar nav - Desktop only */}
      <aside className="w-64 border-r bg-white shadow-sm min-h-screen p-4 hidden md:block">
        <div className="flex items-center gap-3 mb-6">
          <img src={logo} alt="Sociovia" className="h-8 w-auto" />
          <div>
            <div className="text-sm font-semibold">Sociovia</div>
            <div className="text-xs text-muted-foreground">
              Ads & Automations
            </div>
          </div>
        </div>
        <nav className="space-y-1">
          {/* Analytics Collapsible Menu */}
          <SidebarAnalytics
            isCollapsed={isSidebarCollapsed}
            activeView={analyticsView}
            onSelectView={(view) => {
              if (view === 'whatsapp') {
                navigate('/dashboard/whatsapp');
              } else if (view === 'meta') {
                navigate('/dashboard');
              } else if (view) {
                navigate(`/dashboard?view=${view}`);
              }
            }}
          />
          <button
            onClick={() => navigate("/crm/dashboard")}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/10 flex items-center gap-3"
          >
            <Briefcase className="w-4 h-4" />
            <span>Sociovia CRM</span>
          </button>
          <button
            onClick={() => navigate("/workflow-builder")}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/10 flex items-center gap-3"
          >
            <Layers className="w-4 h-4" />
            <span>Custom Workflows</span>
          </button>
          <button
            onClick={() => navigate("/token-tracking")}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/10 flex items-center gap-3"
          >
            <Coins className="w-4 h-4" />
            <span>Token Usage</span>
          </button>
          <div className="border-t my-3" />
          <button
            onClick={() => navigate("/settings")}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/10 flex items-center gap-3"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          <button
            onClick={() => setSignOutOpen(true)}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-red-50 flex items-center gap-3 text-destructive"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </nav>
        <div className="mt-6 text-xs text-muted-foreground">
          Quick actions
        </div>
        <div className="mt-2 flex flex-col gap-2">
          <Button
            size="sm"
            onClick={() => navigate("/workspace/create")}
          >
            Create Workspace
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/workspaces")}
          >
            Manage Workspaces
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/crm/campaigns")}
          >
            View Campaigns
          </Button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto">
        <SignOutModal
          open={signOutOpen}
          onCancel={() => setSignOutOpen(false)}
          onConfirm={() => performSignOut("/login")}
        />
        <header className="border-b bg-card shadow-sm sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left: Mobile Toggle & Workspace Info */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden -ml-2 text-muted-foreground"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="h-6 w-6" />
                </Button>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-slate-100">
                    <img
                      src={currentWorkspaceLogo}
                      alt={currentWorkspaceName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          placeholderForName(
                            currentWorkspaceName,
                            64
                          );
                      }}
                    />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-secondary truncate max-w-[200px] md:max-w-xs">
                      {currentWorkspaceName}
                    </h1>
                    <p className="text-xs text-muted-foreground hidden xs:block">
                      Workspace performance & insights
                    </p>
                  </div>
                </div>
              </div>

              {/* Mobile: optimization button short access? Optional. Keeping clean. */}
            </div>

            {/* Right: Actions */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
              <Button variant="ghost" size="sm" className="h-9 px-2 text-muted-foreground hover:text-foreground" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Refresh</span>
              </Button>
              <Button
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-sm flex-1 md:flex-none"
                size="sm"
                onClick={() => navigate("/optimization")}
              >
                <Zap className="h-4 w-4 mr-2" />
                Optimize
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="hidden sm:flex"
                onClick={() => navigate("/fb_user")}
              >
                Link Meta
              </Button>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto p-5">
          {/* Controls */}
          {/* Controls */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6 items-start lg:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-3 w-full lg:w-3/4">
              <div className="relative w-full md:max-w-xs transition-all focus-within:ring-2 ring-violet-100 rounded-md">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  className="pl-9 bg-white"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full md:w-auto">
                <select
                  value={sectorFilter ?? ""}
                  onChange={(e) =>
                    setSectorFilter(e.target.value || null)
                  }
                  className="rounded-md border px-3 py-2 text-sm bg-white w-full sm:w-auto"
                  aria-label="Filter by sector"
                >
                  <option value="">All sectors</option>
                  {sectors.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as any)
                  }
                  className="rounded-md border px-3 py-2 text-sm bg-white w-full sm:w-auto"
                >
                  <option value="spend">Sort: Spend</option>
                  <option value="leads">Sort: Leads</option>
                  <option value="reach">Sort: Reach</option>
                </select>
                <select
                  value={dateRange}
                  onChange={(e) =>
                    setDateRange(e.target.value as any)
                  }
                  className="rounded-md border px-3 py-2 text-sm bg-white col-span-2 sm:col-span-1 sm:w-auto"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">30 days</option>
                  <option value="90d">90 days</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end mt-2 lg:mt-0 border-t lg:border-t-0 pt-3 lg:pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSectorFilter(null);
                  setSortBy("spend");
                }}
              >
                Reset
              </Button>
              <Button
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => handleUserNavigation("/start")}
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">New Campaign</span>
                <span className="sm:hidden">Create</span>
              </Button>
              <Button
                ref={viewButtonRef}
                size="sm"
                variant="outline"
                onClick={() => openSwitcherFor(viewButtonRef)}
                className="flex items-center gap-2 pl-2 max-w-[160px]"
              >
                {currentWorkspaceLogo && (
                  <img
                    src={currentWorkspaceLogo}
                    alt=""
                    className="w-5 h-5 rounded-sm object-cover"
                  />
                )}
                <span className="truncate">
                  {currentWorkspaceName}
                </span>
                <ChevronDown className="h-4 w-4 ml-1 opacity-50 shrink-0" />
              </Button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-5 items-stretch">
            <Card>
              <CardContent className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Total Spend
                  </div>
                  <div className="text-lg font-semibold">
                    ?
                    {(totals.totalSpend ?? 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {currentWorkspaceName}
                  </div>
                </div>
                <div className="p-2 rounded-full bg-muted/10">
                  <DollarSign className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Leads Generated
                  </div>
                  <div className="text-lg font-semibold">
                    {(totals.totalLeads ?? 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Workspace: {currentWorkspaceName}
                  </div>
                </div>
                <div className="p-2 rounded-full bg-muted/10">
                  <Users className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Active Campaigns
                  </div>
                  <div className="text-lg font-semibold">
                    {totals.activeCampaigns ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Boost or pause low-performing campaigns
                  </div>
                </div>
                <div className="p-2 rounded-full bg-muted/10">
                  <Target className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Total Reach
                  </div>
                  <div className="text-lg font-semibold">
                    {(totals.totalReach ?? 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Estimated unique users reached
                  </div>
                </div>
                <div className="p-2 rounded-full bg-muted/10">
                  <Eye className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Account Balance
                  </div>
                  <div className="text-lg font-semibold">
                    ?{accountBalance.toFixed(2)}
                  </div>
                  {accountBalance < LOW_BALANCE_THRESHOLD && (
                    <div className="text-xs text-destructive mt-1 flex items-center gap-1">
                      Low balance
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-xs"
                        onClick={() =>
                          window.open(
                            "https://business.facebook.com/adsmanager/manage/billing",
                            "_blank"
                          )
                        }
                      >
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="p-2 rounded-full bg-muted/10">
                  <Wallet className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2 space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      Performance Overview{" "}
                      <Zap className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <div className="text-xs text-muted-foreground">
                      Range: {dateRange}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: 235 }}>
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      {overviewLoading ? (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">Loading chart...</div>
                      ) : missingSocialAccount ? (
                        <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                            <LayoutGrid className="h-8 w-8" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">No Ad Account Linked</h3>
                            <p className="text-xs text-muted-foreground mt-1 max-w-[250px] mx-auto">
                              Connect your Meta account to view real-time campaign performance and insights.
                            </p>
                          </div>
                          <Button size="sm" onClick={() => navigate("/fb_user")}>
                            Connect Meta Account
                          </Button>
                        </div>
                      ) : (
                        <LineChart data={graphData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: "#6B7280" }}
                            dy={10}
                            minTickGap={30}
                          />
                          <YAxis
                            yAxisId="left"
                            orientation="left"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: "#6B7280" }}
                            tickFormatter={(value) => `?${value}`}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            axisLine={false}
                            tick={{ fontSize: 12, fill: "#6B7280" }}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                            formatter={(value: number, name: string) => [
                              name === "spend" ? `?${value.toFixed(2)}` : value,
                              name.charAt(0).toUpperCase() + name.slice(1)
                            ]}
                          />
                          <Legend wrapperStyle={{ paddingTop: "20px" }} />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="spend"
                            stroke="#8b5cf6" // Violet
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6 }}
                            name="Spend"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="clicks"
                            stroke="#3b82f6" // Blue
                            strokeWidth={2}
                            dot={false}
                            name="Clicks"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="impressions"
                            stroke="#f59e0b" // Amber
                            strokeWidth={2}
                            dot={false}
                            name="Impressions"
                          />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Card>
                      <CardContent>
                        <div className="text-xs text-muted-foreground">
                          Impressions
                        </div>
                        <div className="text-lg font-semibold">
                          {(totals.totalImpressions ?? 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Workspace: {currentWorkspaceName}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent>
                        <div className="text-xs text-muted-foreground">
                          Clicks
                        </div>
                        <div className="text-lg font-semibold">
                          {(totals.totalClicks ?? 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Avg CTR: {totals.avgCtr ?? 0}% � Avg CPM: ?
                          {totals.avgCpm ?? 0}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle>AI Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insights.map((ins, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3"
                      >
                        <div className="mt-1">
                          {ins.severity === "critical" ? (
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          ) : ins.severity === "warning" ? (
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                          ) : (
                            <Zap className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm">{ins.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>KPI Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Impressions
                      </div>
                      <div className="font-semibold">
                        {(totals.totalImpressions ?? 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Reach
                      </div>
                      <div className="font-semibold">
                        {(totals.totalReach ?? 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Clicks
                      </div>
                      <div className="font-semibold">
                        {(totals.totalClicks ?? 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        CTR
                      </div>
                      <div className="font-semibold">
                        {totals.avgCtr ?? 0}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        CPM
                      </div>
                      <div className="font-semibold">
                        ?{totals.avgCpm ?? 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Active Campaigns
                      </div>
                      <div className="font-semibold">
                        {totals.activeCampaigns ?? 0}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    onClick={() => downloadReport()}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      showToast({
                        title: "Run audit",
                        description: "Audit started (demo).",
                      })
                    }
                  >
                    Run Audit
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="w-full bg-violet-600 hover:bg-violet-700"
                    onClick={() => handleUserNavigation("/marketing-dashboard")}
                  >
                    CRM Dashboard
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleUserNavigation("/crm/campaigns")}
                  >
                    View & Manage Campaigns
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      handleUserNavigation("/workspace/create")
                    }
                  >
                    Create Workspace
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <SignOutModal
          open={signOutOpen}
          onCancel={() => {
            setSignOutOpen(false);
            setPendingPath(null);
          }}
          onConfirm={() => {
            try {
              localStorage.removeItem("sv_user");
            } catch { }
            try {
              sessionStorage.removeItem("sv_user");
            } catch { }
            setSignOutOpen(false);
            navigate(pendingPath || "/login");
            setPendingPath(null);
          }}
        />

        {switcherOpen && typeof document !== "undefined"
          ? createPortal(panel, document.body)
          : null}

        {floatingChatEnabled &&
          selectedWorkspaceId &&
          storedUser?.id && (
            <FloatingAssistant
              userId={storedUser.id}
              workspaceId={selectedWorkspaceId}
              onWorkflowJsonReceived={
                handleWorkflowJsonFromAssistant
              }
              onWorkflowTemplateSelected={
                handleWorkflowTemplateFromAssistant
              }
            />
          )}
      </div>
    </div >
  );
}
