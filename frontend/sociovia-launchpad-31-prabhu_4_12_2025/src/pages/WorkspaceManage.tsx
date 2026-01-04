// src/pages/WorkspaceManage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Trash2,
  Edit,
  ExternalLink,
  Download,
  Plus,
  Search as SearchIcon,
  Undo2,
  BarChart3,
  Users,
  FileText,
  Settings,
  ArrowLeft,
  Home,
} from "lucide-react";

interface Workspace {
  id: number;
  user_id?: number;
  business_name: string;
  industry?: string;
  business_type?: string;
  website?: string;
  usp?: string;
  created_at?: string | null;
  updated_at?: string | null;
  logo?: string | null;       // normalized
  logo_path?: string | null;  // original field from API
  description?: string;
  audience_description?: string;
}

interface WorkspaceCap {
  name: string;
  used: number;
  limit: number;
}

type WorkspaceRow = Workspace;

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").toString().replace(/\/$/, "");

/** Build optional developer hint headers from localStorage */
function buildUserHintHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  try {
    const rv = localStorage.getItem("sv_user");
    if (rv) {
      const u = JSON.parse(rv);
      if (u?.id) headers["X-User-Id"] = String(u.id);
      if (u?.email) headers["X-User-Email"] = String(u.email);
    }
  } catch (e) {
    console.warn("Could not parse sv_user from localStorage", e);
  }
  return headers;
}

/** Normalize raw API object into Workspace type */
function normalizeWorkspace(raw: any): Workspace {
  if (!raw) return { id: 0, business_name: "" };

  const id = typeof raw.id === "string" ? Number(raw.id) : Number(raw.id ?? raw?.Id ?? 0);
  const user_id = typeof raw.user_id === "string" ? Number(raw.user_id) : raw.user_id;
  const logo = raw.logo ?? raw.logo_path ?? null;

  return {
    id: Number.isFinite(id) ? id : 0,
    user_id: Number.isFinite(user_id) ? user_id : undefined,
    business_name: raw.business_name ?? raw.businessName ?? "",
    industry: raw.industry ?? "",
    business_type: raw.business_type ?? "",
    website: raw.website ?? "",
    usp: raw.usp ?? "",
    created_at: raw.created_at ?? null,
    updated_at: raw.updated_at ?? null,
    logo,
    logo_path: raw.logo_path ?? null,
    description: raw.description ?? null,
    audience_description: raw.audience_description ?? null,
  };
}

/** Safe getter for logo URL */
function getLogo(w?: Workspace | null) {
  return w?.logo ?? w?.logo_path ?? null;
}

/** CSV export helper */
function exportCSV(rows: WorkspaceRow[]) {
  const header = [
    "id",
    "business_name",
    "industry",
    "business_type",
    "website",
    "usp",
    "created_at",
    "updated_at",
  ];
  const csvRows = rows.map((r) =>
    [
      r.id,
      `"${(r.business_name || "").replace(/"/g, '""')}"`,
      r.industry || "",
      r.business_type || "",
      r.website || "",
      r.usp ? `"${r.usp.replace(/"/g, '""')}"` : "",
      r.created_at || "",
      r.updated_at || "",
    ].join(","),
  );
  const csv = [header.join(","), ...csvRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `workspaces_export_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// -------------------- API calls (with normalization) --------------------
async function fetchWorkspaceApi(userId: number): Promise<Workspace | null> {
  const res = await fetch(`${API_BASE}/api/workspace/me?user_id=${encodeURIComponent(userId)}`, {
    credentials: "include",
    headers: { Accept: "application/json", ...buildUserHintHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  const w = data?.success ? data.workspace : data?.workspace ?? null;
  return w ? normalizeWorkspace(w) : null;
}

async function fetchWorkspaceCapsApi(userId: number): Promise<WorkspaceCap[]> {
  const res = await fetch(`${API_BASE}/api/workspace/caps?user_id=${encodeURIComponent(userId)}`, {
    credentials: "include",
    headers: { Accept: "application/json", ...buildUserHintHeaders() },
  });
  const body = await res.json().catch(() => ({}));
  return body?.success ? body.caps ?? [] : body?.caps ?? [];
}

async function fetchWorkspacesApi(userId: number): Promise<WorkspaceRow[]> {
  const res = await fetch(`${API_BASE}/api/workspace?user_id=${encodeURIComponent(userId)}`, {
    credentials: "include",
    headers: { Accept: "application/json", ...buildUserHintHeaders() },
  });

  if (!res.ok) {
    console.error("Failed to fetch workspaces", res.status);
    return [];
  }

  const body = await res.json().catch(() => ({}));
  // body.workspaces might be array of objects, or body might be array directly.
  const arr = Array.isArray(body?.workspaces) ? body.workspaces : Array.isArray(body) ? body : body?.workspaces ?? [];
  return (arr ?? []).map(normalizeWorkspace);
}

async function fetchWorkspaceByIdApi(id: number, userId: number): Promise<Workspace | null> {
  const res = await fetch(`${API_BASE}/api/workspace/${id}?user_id=${encodeURIComponent(userId)}`, {
    credentials: "include",
    headers: { Accept: "application/json", ...buildUserHintHeaders() },
  });
  if (!res.ok) return null;
  const body = await res.json().catch(() => ({}));
  const w = body?.success ? body.workspace : body?.workspace ?? body;
  return w ? normalizeWorkspace(w) : null;
}

async function deleteWorkspaceApi(id: number): Promise<boolean> {
  const headers: Record<string, string> = { Accept: "application/json", ...buildUserHintHeaders() };
  // Extract user_id from headers if available to append to query string
  let userIdParam = "";
  if (headers["X-User-Id"]) {
    userIdParam = `?user_id=${encodeURIComponent(headers["X-User-Id"])}`;
  }

  const res = await fetch(`${API_BASE}/api/workspace/${id}${userIdParam}`, {
    method: "DELETE",
    credentials: "include",
    headers,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      body?.message ||
      body?.error ||
      (res.status === 401 ? "Unauthorized" : res.status === 403 ? "Forbidden" : `Delete failed (${res.status})`);
    throw new Error(msg);
  }
  return true;
}

// -------------------- Component --------------------
export default function Workspace() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  // route param (supports /workspace/:id)
  const { id: routeId } = useParams();
  const routeWorkspaceId = routeId ? Number(routeId) : null;
  const inDetail = Number.isFinite(routeWorkspaceId as number);

  const [user, setUser] = useState<{ id: number; name?: string } | null>(null);
  const [view, setView] = useState<"overview" | "manage">("overview");
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [page, setPage] = useState(1);
  const perPage = 8; // declared once
  const [lastDeleted, setLastDeleted] = useState<WorkspaceRow | null>(null);
  const [undoTimerId, setUndoTimerId] = useState<number | null>(null);

  // load user from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sv_user");
      if (raw) setUser(JSON.parse(raw));
    } catch (err) {
      console.error("Error parsing sv_user", err);
    }
  }, []);

  // queries
  const { data: workspace, isLoading: workspaceLoading } = useQuery<Workspace | null, Error>({
    queryKey: ["workspace", user?.id],
    queryFn: () => (user ? fetchWorkspaceApi(user.id) : null),
    enabled: !!user && !inDetail,
  });

  const { data: caps = [], isLoading: capsLoading } = useQuery<WorkspaceCap[], Error>({
    queryKey: ["workspace-caps", user?.id],
    queryFn: () => (user ? fetchWorkspaceCapsApi(user.id) : []),
    enabled: !!user && !inDetail,
  });

  const { data: workspaces = [], isLoading: workspacesLoading } = useQuery<WorkspaceRow[], Error>({
    queryKey: ["workspaces", user?.id],
    queryFn: () => (user && (view === "manage" || inDetail) ? fetchWorkspacesApi(user.id) : []),
    enabled: !!user && (view === "manage" || inDetail),
  });

  // try cached lookup first
  const workspaceFromList = useMemo(
    () => (inDetail ? workspaces.find((w) => w.id === (routeWorkspaceId as number)) ?? null : null),
    [inDetail, workspaces, routeWorkspaceId],
  );

  const { data: workspaceById, isLoading: workspaceByIdLoading } = useQuery<Workspace | null, Error>({
    queryKey: ["workspace-by-id", user?.id, routeWorkspaceId],
    queryFn: () => (user && inDetail ? fetchWorkspaceByIdApi(routeWorkspaceId as number, user.id) : Promise.resolve(null)),
    enabled: !!user && inDetail && !workspaceFromList,
  });

  const detailWorkspace = inDetail ? workspaceFromList ?? workspaceById ?? null : null;

  // delete mutation (optimistic)
  const deleteMutation = useMutation<boolean, Error, number, { previous?: WorkspaceRow[] }>({
    mutationFn: (id: number) => deleteWorkspaceApi(id),
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ["workspaces"] });
      const previous = qc.getQueryData<WorkspaceRow[]>(["workspaces"]) ?? [];
      const next = previous.filter((w) => w.id !== id);
      qc.setQueryData(["workspaces"], next);

      const removed = previous.find((w) => w.id === id) ?? null;
      setLastDeleted(removed);
      if (undoTimerId) window.clearTimeout(undoTimerId);
      const t = window.setTimeout(() => setLastDeleted(null), 6000);
      setUndoTimerId(t);
      return { previous };
    },
    onError: (err, _vars, context) => {
      qc.setQueryData(["workspaces"], context?.previous ?? []);
      toast({
        title: "Delete failed",
        description: err.message || "Failed to delete workspace",
        variant: "destructive",
      });
      setLastDeleted(null);
      if (undoTimerId) window.clearTimeout(undoTimerId);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      if (inDetail) {
        if (!qc.getQueryData<WorkspaceRow[]>(["workspaces"])?.some((w) => w.id === routeWorkspaceId)) {
          navigate("/workspace");
        }
      }
    },
  });

  // helpers
  const toggleSelect = (id: number) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const clearSelection = () => setSelected({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[Number(k)]).map(Number), [selected]);

  const sectors = useMemo(() => {
    const set = new Set<string>();
    workspaces.forEach((w) => w.industry && set.add(w.industry));
    return Array.from(set).sort();
  }, [workspaces]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = workspaces.slice();
    if (sectorFilter) arr = arr.filter((w) => (w.industry ?? "").toLowerCase() === sectorFilter.toLowerCase());
    if (q) arr = arr.filter((w) => (w.business_name + " " + (w.industry ?? "")).toLowerCase().includes(q));
    return arr;
  }, [workspaces, search, sectorFilter]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [pages, page]);

  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);

  function handleDeleteConfirm(id: number) {
    if (!confirm("Are you sure you want to delete this workspace? This action cannot be undone.")) return;
    deleteMutation.mutate(id);
  }

  function handleUndoDelete() {
    if (lastDeleted) {
      qc.setQueryData<WorkspaceRow[]>(["workspaces"], (old = []) => [...old, lastDeleted]);
      setLastDeleted(null);
      if (undoTimerId) window.clearTimeout(undoTimerId);
    }
  }

  // guards
  if (!user) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Not Logged In</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Please log in to view your workspace.</p>
            <Button className="mt-4" onClick={() => navigate("/login")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if ((!inDetail && (workspaceLoading || capsLoading)) || (inDetail && (workspacesLoading || workspaceByIdLoading))) {
    return <div className="p-6">Loading workspace...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <Home className="w-4 h-4 mr-1" /> Home
          </Button>
          {(view === "manage" || inDetail) && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mr-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          <h1 className="text-2xl font-bold">Workspace</h1>
        </div>

        {!inDetail && (
          <div className="flex items-center gap-2">
            <Button variant={view === "overview" ? "default" : "outline"} size="sm" onClick={() => setView("overview")}>
              <BarChart3 className="w-4 h-4 mr-1" /> Overview
            </Button>
            <Button variant={view === "manage" ? "default" : "outline"} size="sm" onClick={() => setView("manage")}>
              <Settings className="w-4 h-4 mr-1" /> Manage
            </Button>
          </div>
        )}
      </div>

      {/* Detail view */}
      {inDetail ? (
        detailWorkspace ? (
          <div className="space-y-6">
            {/* hero header with logo on TOP */}
            <div className="rounded-2xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col items-center">
              {getLogo(detailWorkspace) ? (
                <img
                  src={getLogo(detailWorkspace)!}
                  alt={`${detailWorkspace.business_name} logo`}
                  className="h-20 w-20 rounded-xl object-cover border mb-3"
                />
              ) : (
                <div className="h-20 w-20 rounded-xl border mb-3 grid place-items-center text-xs text-muted-foreground">No Logo</div>
              )}

              <div className="text-center">
                <h2 className="text-xl font-bold">{detailWorkspace.business_name}</h2>
                <div className="mt-2 flex flex-wrap gap-2 justify-center">
                  {detailWorkspace.industry && <Badge variant="outline">{detailWorkspace.industry}</Badge>}
                  {detailWorkspace.business_type && <Badge variant="secondary">{detailWorkspace.business_type}</Badge>}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {detailWorkspace.created_at ? `Created: ${new Date(detailWorkspace.created_at).toLocaleString()}` : null}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate(`/workspace/${detailWorkspace.id}/edit`)}>
                  <Edit size={16} /> Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteConfirm(detailWorkspace.id)} disabled={deleteMutation.isPending}>
                  <Trash2 size={16} /> Delete
                </Button>
              </div>
            </div>

            {/* details */}
            <Card className="shadow-md rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">

                  <p><strong>USP:</strong> {detailWorkspace.usp || "—"}</p>
                </div>
                <div className="space-y-3">
                  <p>
                    <strong>Website:</strong>{" "}
                    {detailWorkspace.website ? (
                      <a
                        href={detailWorkspace.website.startsWith("http") ? detailWorkspace.website : `https://${detailWorkspace.website}`}
                        className="text-blue-600 underline inline-flex items-center gap-1"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {detailWorkspace.website} <ExternalLink size={14} />
                      </a>
                    ) : "—"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Last Updated: {detailWorkspace.updated_at ? new Date(detailWorkspace.updated_at).toLocaleString() : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* long descriptions */}
            {(detailWorkspace.description || detailWorkspace.audience_description) && (
              <div className="grid gap-6 md:grid-cols-2">
                {detailWorkspace.description && (
                  <Card>
                    <CardHeader><CardTitle>Description</CardTitle></CardHeader>
                    <CardContent><p className="whitespace-pre-wrap text-sm">{detailWorkspace.description}</p></CardContent>
                  </Card>
                )}
                {detailWorkspace.audience_description && (
                  <Card>
                    <CardHeader><CardTitle>Audience</CardTitle></CardHeader>
                    <CardContent><p className="whitespace-pre-wrap text-sm">{detailWorkspace.audience_description}</p></CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        ) : (
          <Card><CardContent className="p-6">Workspace not found.</CardContent></Card>
        )
      ) : view === "overview" ? (
        // Overview
        workspace ? (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col items-center">
              {getLogo(workspace) && <img src={getLogo(workspace)!} alt={`${workspace.business_name} logo`} className="h-16 w-16 rounded-xl object-cover border mb-3" />}
              <h2 className="text-xl font-bold">{workspace.business_name}</h2>
              <div className="mt-2 flex flex-wrap gap-2 justify-center">
                {workspace.industry && <Badge variant="outline">{workspace.industry}</Badge>}
                {workspace.business_type && <Badge variant="secondary">{workspace.business_type}</Badge>}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate(`/workspace/${workspace.id}/edit`)}><Edit size={16} /> Edit</Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/workspace")}><Settings size={16} /> Manage All</Button>
                <Button variant="outline" size="sm" onClick={() => exportCSV([workspace])}><Download className="w-4 h-4 mr-2" /> Export</Button>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Usage Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {caps.map((cap, idx) => {
                  const percentage = cap.limit > 0 ? Math.min((cap.used / cap.limit) * 100, 100) : 0;
                  return (
                    <Card key={idx} className="rounded-2xl shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          {cap.name.includes("user") ? <Users size={16} /> : cap.name.includes("content") ? <FileText size={16} /> : <BarChart3 size={16} />}
                          {cap.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm">{cap.used} / {cap.limit}</span>
                          <span className="text-sm font-medium">{Math.round(percentage)}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <Card>
            <CardHeader><CardTitle>No Workspace Found</CardTitle></CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">You haven't created a workspace yet. Set up your business details to continue.</p>
              <Button onClick={() => navigate("/workspace/create")}><Plus className="w-4 h-4 mr-2" /> Create Workspace</Button>
            </CardContent>
          </Card>
        )
      ) : (
        // Manage list
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold">Manage Workspaces</h2>
              <div className="text-sm text-muted-foreground">Fast controls, bulk actions, and safe deletes (undo available).</div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => exportCSV(workspaces)}><Download className="w-4 h-4 mr-2" /> Export All</Button>
              <Button onClick={() => navigate("/workspace/create")}><Plus className="w-4 h-4 mr-2" /> Create</Button>
            </div>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                <div className="flex items-center gap-3 w-full md:w-2/3">
                  <div className="relative w-full">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input placeholder="Search workspaces..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
                  </div>

                  <select value={sectorFilter ?? ""} onChange={(e) => { setSectorFilter(e.target.value || null); setPage(1); }} className="rounded-md border px-3 py-2 text-sm">
                    <option value="">All industries</option>
                    {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <Button variant="outline" size="sm" onClick={() => { setSearch(""); setSectorFilter(null); setSelected({}); }}>Reset</Button>
                </div>

                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
                    <Button variant="outline" size="sm" onClick={clearSelection}>Clear</Button>
                    <Button variant="destructive" size="sm" onClick={() => { if (confirm(`Are you sure you want to delete ${selectedIds.length} workspaces?`)) { selectedIds.forEach((id) => handleDeleteConfirm(id)); } }}><Trash2 className="w-4 h-4 mr-1" /> Delete Selected</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {workspacesLoading ? (
            <div className="text-center py-8">Loading workspaces...</div>
          ) : pageRows.length === 0 ? (
            <Card><CardContent className="p-6 text-center">No workspaces found. <Button className="ml-2" onClick={() => navigate("/workspace/create")}>Create one</Button></CardContent></Card>
          ) : (
            <div className="space-y-4">
              {pageRows.map((w) => (
                <Card key={w.id}>
                  <CardHeader className="flex flex-row items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={!!selected[w.id]} onCheckedChange={() => toggleSelect(w.id)} />
                      {getLogo(w) && <img src={getLogo(w)!} alt="logo" className="h-12 w-12 rounded object-cover border" />}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{w.business_name}</h3>
                          {w.industry && <Badge variant="outline">{w.industry}</Badge>}
                          {w.id === workspace?.id && <Badge variant="secondary">Current</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">Created: {w.created_at ? new Date(w.created_at).toLocaleDateString() : "—"}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/workspace/${w.id}`)}><ExternalLink className="w-4 h-4 mr-2" /> View</Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/workspace/${w.id}/edit`)}><Edit className="w-4 h-4 mr-2" /> Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteConfirm(w.id)} disabled={deleteMutation.isPending}><Trash2 className="w-4 h-4 mr-2" /> Delete</Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">Showing {Math.min(filtered.length, (page - 1) * perPage + 1)}-{Math.min(page * perPage, filtered.length)} of {filtered.length} workspaces</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                    const pageNum = page <= 3 ? i + 1 : page >= pages - 2 ? pages - 4 + i : page - 2 + i;
                    return <Button key={pageNum} variant={page === pageNum ? "default" : "outline"} size="sm" onClick={() => setPage(pageNum)} className="w-8 h-8 p-0">{pageNum}</Button>;
                  })}
                  {pages > 5 && <span className="px-1">...</span>}
                </div>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Undo toast */}
      {lastDeleted && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-lg flex items-center gap-2">
          Workspace deleted
          <Button variant="outline" size="sm" onClick={handleUndoDelete} className="h-7 text-primary-foreground border-primary-foreground">
            <Undo2 className="w-3 h-3 mr-1" /> Undo
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Route config reminder (React Router):
 * <Route path="/workspace" element={<Workspace />} />
 * <Route path="/workspace/:id" element={<Workspace />} />
 * <Route path="/workspace/:id/edit" element={<YourEditComponent />} />
 */
