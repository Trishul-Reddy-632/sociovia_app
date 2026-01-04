// CampaignWorkspace.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  DownloadCloud,
  Search,
  Plus,
  ImageIcon,
  Trash2,
  Edit3,
  FileText,
  Copy,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { API_ENDPOINT } from "@/config";

const API_BASE = API_ENDPOINT;

type AdSet = {
  id: string;
  name: string;
  budget: number;
  status: "active" | "paused" | "";
  audience?: string;
};

type Campaign = {
  id: string;
  name?: string;
  status?: string;
  objective?: string;
  created_time?: string;
  imageUrl?: string;          // thumbnail / main creative
  adSets?: AdSet[];           // editable adsets
  [k: string]: any;
};

function friendlyDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function StatusPill({ text }: { text?: string }) {
  const t = (text || "").toLowerCase();
  const base = "text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1";
  if (t === "active") return (
    <span className={`${base} bg-emerald-100 text-emerald-800`}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
    </span>
  );
  if (t === "paused") return (
    <span className={`${base} bg-yellow-100 text-yellow-800`}>
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> Paused
    </span>
  );
  return (
    <span className={`${base} bg-slate-100 text-slate-700`}>
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> {text || "—"}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-slate-200" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="h-3 bg-slate-200 rounded w-3/4" />
        <div className="h-2.5 bg-slate-200 rounded w-1/2" />
      </div>
    </div>
  );
}

export default function CampaignWorkspace({ className = "" }: { className?: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // “draft” for editing the currently selected campaign
  const [draft, setDraft] = useState<Campaign | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // simple pagination for the left list
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    loadCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function api(path: string, opts: RequestInit = {}) {
    const url = path.startsWith("/") ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
    const res = await fetch(url, opts);
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
  }

  async function loadCampaigns() {
    setLoading(true);
    setError(null);
    try {
      const r = await api("/campaigns");
      if (!r.ok) throw new Error(r.json?.error || "Failed to load campaigns");
      const data = r.json?.data || r.json || [];
      const normalized = (data as any[]).map((c) => ({
        id: String(c.id),
        imageUrl: c.imageUrl || "",
        adSets: c.adSets || [],
        ...c,
      })) as Campaign[];

      setCampaigns(normalized);
      if (!selectedId && normalized.length > 0) {
        setSelectedId(normalized[0].id);
        setDraft(normalized[0]);
      }
      setPage(1);
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return campaigns;
    return campaigns.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.id || "").toLowerCase().includes(q) ||
        (c.objective || "").toLowerCase().includes(q)
    );
  }, [campaigns, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // sync draft when selectedId or campaigns change
  useEffect(() => {
    if (!selectedId) {
      setDraft(null);
      return;
    }
    const current = campaigns.find((c) => c.id === selectedId) || null;
    setDraft(current ? { ...current } : null);
  }, [selectedId, campaigns]);

  function handleSelectCampaign(id: string) {
    setSelectedId(id);
  }

  function handleDraftChange<K extends keyof Campaign>(key: K, value: Campaign[K]) {
    if (!draft) return;
    setDraft({ ...draft, [key]: value });
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!draft) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    // in real app: upload file to backend and store returned URL instead
    setDraft({ ...draft, imageUrl: url, _localImageFile: file });
  }

  function handleAdSetChange(index: number, key: keyof AdSet, value: any) {
    if (!draft) return;
    const adSets = [...(draft.adSets || [])];
    const updated: AdSet = { ...adSets[index], [key]: value };
    adSets[index] = updated;
    setDraft({ ...draft, adSets });
  }

  function addAdSet() {
    if (!draft) return;
    const adSets = [...(draft.adSets || [])];
    adSets.push({
      id: `adset-${Date.now()}`,
      name: "New Ad Set",
      budget: 0,
      status: "",
      audience: "",
    });
    setDraft({ ...draft, adSets });
  }

  function removeAdSet(index: number) {
    if (!draft) return;
    const adSets = [...(draft.adSets || [])];
    adSets.splice(index, 1);
    setDraft({ ...draft, adSets });
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setError(null);

    // optimistic update locally
    setCampaigns((prev) =>
      prev.map((c) => (c.id === draft.id ? { ...c, ...draft } : c))
    );

    try {
      // TODO: adjust to your backend schema
      await api(`/campaigns/${encodeURIComponent(draft.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
    } catch (e: any) {
      setError("Failed to save changes. Reloading from server.");
      await loadCampaigns();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!draft) return;
    if (!window.confirm("Delete this campaign? This cannot be undone.")) return;
    setDeleting(true);
    setError(null);
    const id = draft.id;

    const prev = campaigns;
    setCampaigns((c) => c.filter((x) => x.id !== id));
    setSelectedId(null);
    setDraft(null);

    try {
      await api(`/campaigns/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch (e: any) {
      setError("Failed to delete campaign. Restoring previous state.");
      setCampaigns(prev);
    } finally {
      setDeleting(false);
    }
  }

  function duplicateCampaign() {
    if (!draft) return;
    const copy: Campaign = {
      ...draft,
      id: `copy-${Date.now()}`,
      name: `${draft.name || "Untitled Campaign"} (Copy)`,
      created_time: new Date().toISOString(),
    };
    setCampaigns((prev) => [copy, ...prev]);
    setSelectedId(copy.id);
    setDraft(copy);
    // In real app: POST to backend
  }

  function exportCampaignToJSON() {
    if (!draft) return;
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign_${draft.id}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section className={`py-4 sm:py-6 px-4 sm:px-6 lg:px-8 bg-background ${className}`}>
      <div className="max-w-7xl mx-auto flex flex-col gap-4 lg:gap-6">
        {/* Top bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-full text-white shrink-0">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-semibold leading-tight truncate">Campaign Workspace</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 truncate">
                Browse, edit, and manage campaigns, creatives, and ad sets in one view.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                className="border rounded-lg px-4 py-2 pr-10 w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="Search by name, id, objective..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search campaigns"
              />
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Link
                to="/create"
                className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New campaign</span>
              </Link>
              <button
                onClick={loadCampaigns}
                className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-slate-50 transition"
              >
                <DownloadCloud className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-50 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {/* Main layout: left list + right detail */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* LEFT: list of campaigns */}
          <aside className="lg:w-80 xl:w-96 flex-shrink-0">
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col max-h-[70vh]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/70">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Campaigns
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {filtered.length} found
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto px-2 py-2 space-y-1">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                  : pageItems.length > 0
                  ? pageItems.map((c) => {
                      const isActive = c.id === selectedId;
                      return (
                        <button
                          key={c.id}
                          onClick={() => handleSelectCampaign(c.id)}
                          className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 transition ${
                            isActive
                              ? "bg-sky-50 border border-sky-200"
                              : "hover:bg-slate-50 border border-transparent"
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                            {c.imageUrl ? (
                              <img
                                src={c.imageUrl}
                                alt={c.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">
                                {c.name || "Untitled Campaign"}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {c.objective || "No objective set"}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[10px] text-muted-foreground">
                                {friendlyDate(c.created_time)}
                              </span>
                              <StatusPill text={c.status} />
                            </div>
                          </div>
                        </button>
                      );
                    })
                  : !loading && (
                      <div className="text-center text-xs text-muted-foreground py-6">
                        No campaigns found for this search.
                      </div>
                    )}
              </div>
            </div>
          </aside>

          {/* RIGHT: details & editing */}
          <main className="flex-1">
            {!draft ? (
              <div className="h-[60vh] min-h-[320px] flex flex-col items-center justify-center border border-dashed border-border rounded-2xl text-center px-6">
                <ImageIcon className="w-10 h-10 text-slate-300 mb-3" />
                <h2 className="text-base sm:text-lg font-semibold text-secondary mb-1">
                  Select a campaign to start editing
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Choose a campaign from the left list, or create a new one to start
                  configuring objectives, creatives, and ad sets.
                </p>
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border shadow-sm p-4 sm:p-6 space-y-5">
                {/* Header row inside detail */}
                <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                      {draft.imageUrl ? (
                        <img
                          src={draft.imageUrl}
                          alt={draft.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          className="text-lg sm:text-xl font-semibold bg-transparent border-b border-transparent focus:border-sky-500 focus:outline-none min-w-0"
                          value={draft.name || ""}
                          onChange={(e) => handleDraftChange("name", e.target.value)}
                          placeholder="Campaign name"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground font-mono break-all">
                        ID: {draft.id}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    <StatusPill text={draft.status} />
                    <select
                      className="border rounded px-2 py-1 text-xs"
                      value={draft.status || ""}
                      onChange={(e) => handleDraftChange("status", e.target.value)}
                    >
                      <option value="">Status —</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                    </select>

                    <button
                      onClick={duplicateCampaign}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs hover:bg-slate-50"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Duplicate
                    </button>
                    <button
                      onClick={exportCampaignToJSON}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs hover:bg-slate-50"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Export
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Grid: left (overview + image), right (ad sets) */}
                <div className="grid gap-4 lg:gap-5 grid-cols-1 xl:grid-cols-3">
                  {/* LEFT PANEL: Overview + Objective + Image upload */}
                  <div className="space-y-4 xl:col-span-1">
                    <section className="rounded-xl border border-border bg-background/60 p-3 sm:p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-secondary">Overview</h3>
                          <p className="text-xs text-muted-foreground">
                            Objective & metadata
                          </p>
                        </div>
                        <Edit3 className="w-4 h-4 text-slate-400" />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Objective / Goal
                        </label>
                        <textarea
                          rows={4}
                          className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-400"
                          placeholder="Describe what this campaign is trying to achieve..."
                          value={draft.objective || ""}
                          onChange={(e) => handleDraftChange("objective", e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                        <div>
                          <div className="font-semibold text-secondary/80">Created</div>
                          <div>{friendlyDate(draft.created_time)}</div>
                        </div>
                        <div>
                          <div className="font-semibold text-secondary/80">Ad sets</div>
                          <div>{draft.adSets?.length || 0}</div>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-xl border border-border bg-background/60 p-3 sm:p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-secondary">Main Creative</h3>
                          <p className="text-xs text-muted-foreground">
                            Upload / change the primary image
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3 items-center">
                        <div className="w-24 h-24 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                          {draft.imageUrl ? (
                            <img
                              src={draft.imageUrl}
                              alt="Campaign creative"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 space-y-2 text-xs text-muted-foreground">
                          <p>Recommended: 1200×1200 or 1080×1350, JPG/PNG, &lt; 5MB.</p>
                          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs cursor-pointer hover:bg-slate-800">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Upload new image</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageChange}
                            />
                          </label>
                          {draft.imageUrl && (
                            <button
                              type="button"
                              onClick={() => handleDraftChange("imageUrl", "")}
                              className="inline-flex items-center gap-1 text-[11px] text-red-600 mt-1"
                            >
                              <X className="w-3 h-3" />
                              Remove image
                            </button>
                          )}
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* RIGHT PANEL: Ad sets editor */}
                  <div className="xl:col-span-2 rounded-xl border border-border bg-background/60 p-3 sm:p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-secondary">Ad sets</h3>
                        <p className="text-xs text-muted-foreground">
                          Edit budgets, audiences, and status per ad set.
                        </p>
                      </div>
                      <button
                        onClick={addAdSet}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs hover:bg-sky-700"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add ad set
                      </button>
                    </div>

                    {(!draft.adSets || draft.adSets.length === 0) ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg py-6 px-4">
                        <p>No ad sets yet.</p>
                        <p className="mt-1 mb-2">Click “Add ad set” to define targeting & budget.</p>
                        <button
                          onClick={addAdSet}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs hover:bg-slate-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add first ad set
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-auto rounded-lg border border-border">
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="bg-slate-50 text-xs text-muted-foreground">
                            <tr>
                              <th className="text-left font-medium px-3 py-2">Name</th>
                              <th className="text-left font-medium px-3 py-2">Budget</th>
                              <th className="text-left font-medium px-3 py-2">Audience</th>
                              <th className="text-left font-medium px-3 py-2">Status</th>
                              <th className="text-right font-medium px-3 py-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {draft.adSets?.map((as, idx) => (
                              <tr
                                key={as.id}
                                className={idx % 2 === 0 ? "bg-white/80" : "bg-slate-50/60"}
                              >
                                <td className="px-3 py-2 align-top">
                                  <input
                                    className="w-full border rounded px-2 py-1 text-xs"
                                    value={as.name}
                                    onChange={(e) =>
                                      handleAdSetChange(idx, "name", e.target.value)
                                    }
                                  />
                                </td>
                                <td className="px-3 py-2 align-top">
                                  <input
                                    type="number"
                                    min={0}
                                    className="w-24 border rounded px-2 py-1 text-xs"
                                    value={as.budget}
                                    onChange={(e) =>
                                      handleAdSetChange(idx, "budget", Number(e.target.value))
                                    }
                                  />
                                </td>
                                <td className="px-3 py-2 align-top">
                                  <input
                                    className="w-full border rounded px-2 py-1 text-xs"
                                    value={as.audience || ""}
                                    onChange={(e) =>
                                      handleAdSetChange(idx, "audience", e.target.value)
                                    }
                                    placeholder="E.g. India · 18–35 · Interests"
                                  />
                                </td>
                                <td className="px-3 py-2 align-top">
                                  <select
                                    className="border rounded px-2 py-1 text-xs"
                                    value={as.status || ""}
                                    onChange={(e) =>
                                      handleAdSetChange(
                                        idx,
                                        "status",
                                        e.target.value as AdSet["status"]
                                      )
                                    }
                                  >
                                    <option value="">—</option>
                                    <option value="active">Active</option>
                                    <option value="paused">Paused</option>
                                  </select>
                                </td>
                                <td className="px-3 py-2 align-top text-right">
                                  <button
                                    onClick={() => removeAdSet(idx)}
                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* bottom save bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-border/70">
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    Changes are local until you press <span className="font-medium">Save</span>.
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/campaign/${encodeURIComponent(draft.id)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs hover:bg-slate-50"
                    >
                      View full details
                    </Link>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-600 text-white text-xs hover:bg-sky-700 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </section>
  );
}
