// src/pages/FacebookInsights.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RefreshCw, Download, ExternalLink, Copy, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type PageInsights = Record<string, any> | null;

type PostMetrics = {
  id: string;
  message?: string | null;
  created_time?: string | null;
  likes?: number;
  comments?: number;
  shares?: number;
  reactions?: number;
  raw?: any;
  full_picture?: string | null;
  permalink_url?: string | null;
  [k: string]: any;
};

type Account = {
  provider: string;
  provider_user_id: string;
  account_name?: string;
  user_id?: number | string;
  fb_raw?: any;
  [k: string]: any;
};

interface FacebookInsightsProps {
  account?: Account | null;
}

const API_BASE = (import.meta.env.VITE_API_BASE ?? "https://sociovia-py.onrender.com").toString().replace(/\/$/, "");

/* ----------------- helpers ----------------- */
async function safeFetchJson(url: string, opts: RequestInit = {}) {
  try {
    const res = await fetch(url, { ...opts, credentials: "include" });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    return { ok: res.ok, status: res.status, statusText: res.statusText, data: json, text };
  } catch (err) {
    return { ok: false, error: err };
  }
}

function formatNumber(n?: number | null) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function aggregateByDay(posts: PostMetrics[]) {
  const map: Record<string, { date: string; engagements: number; posts: number }> = {};
  posts.forEach((p) => {
    if (!p.created_time) return;
    const d = new Date(p.created_time);
    if (Number.isNaN(d.getTime())) return;
    const key = d.toISOString().slice(0, 10);
    const engagement = (p.reactions ?? 0) + (p.comments ?? 0) + (p.shares ?? 0);
    if (!map[key]) map[key] = { date: key, engagements: 0, posts: 0 };
    map[key].engagements += engagement;
    map[key].posts += 1;
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

function buildPermalinkFromId(id: string) {
  if (!id) return "";
  if (id.includes("_")) return `https://www.facebook.com/${id}`;
  return `https://www.facebook.com/${id}`;
}

/** Normalize a raw FB post (or backend post object) into PostMetrics canonical shape. */
function normalizePost(raw: any): PostMetrics {
  if (!raw) return { id: "", message: "", created_time: "", likes: 0, comments: 0, shares: 0, reactions: 0, raw };

  const id = raw.id ?? raw.post_id ?? (raw.raw && raw.raw.id) ?? "";

  const message =
    raw.message ??
    raw.story ??
    raw.caption ??
    raw.text ??
    raw.message_text ??
    (raw.raw && (raw.raw.message ?? raw.raw.story)) ??
    null;

  const created_time =
    raw.created_time ??
    raw.created_time_iso ??
    raw.created_time_local ??
    (raw.raw && raw.raw.created_time) ??
    null;

  // Reactions / likes
  const reactions =
    raw.reactions?.summary?.total_count ??
    raw.raw?.reactions?.summary?.total_count ??
    raw.reactions_count ??
    raw.likes ??
    (typeof raw.reactions === "string" && !Number.isNaN(Number(raw.reactions)) ? Number(raw.reactions) : null) ??
    0;

  // Comments
  const comments =
    raw.comments?.summary?.total_count ??
    raw.raw?.comments?.summary?.total_count ??
    raw.comments_count ??
    raw.comments ??
    0;

  // Shares
  const shares =
    (raw.shares && typeof raw.shares.count === "number" ? raw.shares.count : null) ??
    raw.raw?.shares?.count ??
    raw.shares_count ??
    raw.shares ??
    0;

  // MEDIA detection (robust)
  let full_picture =
    raw.full_picture ??
    raw.picture ??
    raw.raw?.full_picture ??
    raw.raw?.picture ??
    null;

  // try attachments -> media.image.src
  const attachments = raw.attachments ?? raw.raw?.attachments;
  if (!full_picture && attachments && Array.isArray(attachments.data)) {
    const att = attachments.data[0];
    // direct media
    full_picture = full_picture || att?.media?.image?.src || att?.media?.image?.url || att?.media?.image?.src_big || att?.media?.image?.src_large || null;
    // if subattachments (carousel)
    if (!full_picture && att?.subattachments?.data) {
      const firstSub = att.subattachments.data[0];
      full_picture = full_picture || firstSub?.media?.image?.src || firstSub?.media?.image?.url || firstSub?.media?.image?.src_large || null;
    }
    // sometimes attachments include 'image' directly
    full_picture = full_picture || att?.image?.src || att?.image?.url || null;
    // else use 'target' link if any
    full_picture = full_picture || att?.target?.thumbnail_src || null;
  }

  // Another fallback: attachments.data[*].media?.image?.src in deeper nested shapes
  if (!full_picture && raw.raw?.attachments) {
    try {
      const items = raw.raw.attachments.data;
      for (const it of items) {
        if (it?.media?.image?.src) { full_picture = it.media.image.src; break; }
        if (it?.subattachments?.data) {
          const sub = it.subattachments.data[0];
          if (sub?.media?.image?.src) { full_picture = sub.media.image.src; break; }
        }
      }
    } catch (e) { /* ignore */ }
  }

  // permalink
  const permalink_url = raw.permalink_url ?? raw.permalink ?? raw.raw?.permalink_url ?? (id ? `https://www.facebook.com/${id}` : null);

  return {
    id,
    message,
    created_time,
    likes: reactions,
    reactions,
    comments,
    shares,
    raw,
    full_picture,
    permalink_url,
  };
}

/* ----------------- component ----------------- */

export default function FacebookInsights({ account: propAccount }: FacebookInsightsProps) {
  const { toast } = useToast();

  const [activeAccount, setActiveAccount] = useState<Account | null>(propAccount ?? null);
  const [managementLoading, setManagementLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<PageInsights>(null);
  const [posts, setPosts] = useState<PostMetrics[]>([]);
  const [pageSize, setPageSize] = useState<number>(10);
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");
  const [sortBy, setSortBy] = useState<"recent" | "engagement">("engagement");

  const [jsonModal, setJsonModal] = useState<any | null>(null);

  // pick default account if no prop provided
  useEffect(() => {
    let mounted = true;
    async function pickDefault() {
      if (propAccount) { setActiveAccount(propAccount); return; }
      setManagementLoading(true);
      const res = await safeFetchJson(`${API_BASE}/api/social/management`);
      setManagementLoading(false);
      if (!mounted) return;
      if (!res.ok || !res.data) {
        toast({ title: "Accounts error", description: "Could not fetch social accounts." });
        return;
      }
      const body = res.data;
      if (!body.success || !Array.isArray(body.accounts)) {
        toast({ title: "No accounts", description: "No social accounts returned." });
        return;
      }
      // prefer user_id === 1
      let chosen: Account | null = null;
      for (const item of body.accounts) {
        const db = item.db ?? item;
        if (db.user_id === 1 || db.user_id === "1") {
          chosen = { provider: db.provider, provider_user_id: db.provider_user_id, account_name: db.account_name, user_id: db.user_id, fb_raw: item.fb_raw ?? null, ...db };
          break;
        }
      }
      if (!chosen && body.accounts.length > 0) {
        const db0 = body.accounts[0].db ?? body.accounts[0];
        chosen = { provider: db0.provider, provider_user_id: db0.provider_user_id, account_name: db0.account_name, user_id: db0.user_id, fb_raw: body.accounts[0].fb_raw ?? null, ...db0 };
      }
      if (mounted) setActiveAccount(chosen);
    }
    pickDefault();
    return () => { mounted = false; };
  }, [propAccount, toast]);

  // load insights + posts for activeAccount
  useEffect(() => {
    if (!activeAccount) { setInsights(null); setPosts([]); return; }
    let mounted = true;
    async function load() {
      setLoading(true);
      setInsights(null);
      setPosts([]);
      // try backend insights2 (preferred)
      const url = `${API_BASE}/api/facebook/insights2?provider_user_id=${encodeURIComponent(activeAccount.provider_user_id)}&range=${dateRange}&limit=${pageSize}`;
      const res = await safeFetchJson(url);
      if (res.ok && res.data && res.data.success) {
        if (!mounted) return;
        setInsights(res.data.page_insights ?? null);
        const p = Array.isArray(res.data.posts) ? res.data.posts.map((raw: any) => normalizePost(raw)) : [];
        setPosts(p);
        setLoading(false);
        return;
      }
      // fallback: /api/facebook/posts
      const fbPosts = await safeFetchJson(`${API_BASE}/api/facebook/posts?provider_user_id=${encodeURIComponent(activeAccount.provider_user_id)}&limit=${pageSize}`);
      if (fbPosts.ok && fbPosts.data && Array.isArray(fbPosts.data.data)) {
        const p = fbPosts.data.data.map((raw: any) => normalizePost(raw));
        if (mounted) setPosts(p);
      } else {
        // If nothing, show a helpful toast but don't spam
        toast({ title: "No data", description: "Could not fetch insights or posts for this page." });
      }
      if (mounted) setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [activeAccount, dateRange, pageSize, toast]);

  // KPI summary derived
  const kpis = useMemo(() => {
    const totals = posts.reduce((acc, p) => {
      acc.reactions += p.reactions ?? 0;
      acc.comments += p.comments ?? 0;
      acc.shares += p.shares ?? 0;
      acc.posts += 1;
      return acc;
    }, { reactions: 0, comments: 0, shares: 0, posts: 0 });
    const avg = totals.posts ? Math.round((totals.reactions + totals.comments + totals.shares) / totals.posts) : 0;
    return { ...totals, avgEngagement: avg };
  }, [posts]);

  const timeseries = useMemo(() => aggregateByDay(posts), [posts]);

  // filtered/sorted posts
  const visiblePosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = posts.slice();
    if (q) out = out.filter(p => (p.message ?? "").toLowerCase().includes(q));
    if (sortBy === "engagement") {
      out.sort((a, b) => ((b.reactions ?? 0) + (b.comments ?? 0) + (b.shares ?? 0)) - ((a.reactions ?? 0) + (a.comments ?? 0) + (a.shares ?? 0)));
    } else {
      out.sort((a, b) => (b.created_time ?? "").localeCompare(a.created_time ?? ""));
    }
    return out;
  }, [posts, query, sortBy]);

  // compute engagement% relative to page fans if available
  function computeEngagementPercent(post: PostMetrics) {
    const fans = (activeAccount?.fb_raw?.fan_count ?? insights?.fan_count ?? activeAccount?.fan_count ?? 0) || 0;
    if (!fans) return null;
    const eng = (post.reactions ?? 0) + (post.comments ?? 0) + (post.shares ?? 0);
    return (eng / Math.max(1, fans)) * 100;
  }

  // per-post refresh (backend endpoint /api/facebook/post?post_id=)
  async function refreshPost(postId: string) {
    try {
      const res = await safeFetchJson(`${API_BASE}/api/facebook/post?post_id=${encodeURIComponent(postId)}`);
      if (!res.ok || !res.data) {
        toast({ title: "Refresh failed", description: `HTTP ${res.status}` });
        return;
      }
      // backend might respond with { data: {...} } or raw object; normalize accordingly
      const raw = res.data.data ?? res.data;
      const normalized = normalizePost(raw);
      setPosts(prev => prev.map(p => p.id === postId ? normalized : p));
      toast({ title: "Post refreshed" });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to refresh post." });
    }
  }

  // open permalink/copy link/download image
  async function copyPermalink(post: PostMetrics) {
    try {
      const permalink = post.permalink_url ?? post.raw?.permalink_url ?? buildPermalinkFromId(post.id);
      await navigator.clipboard.writeText(permalink);
      toast({ title: "Copied", description: "Permalink copied to clipboard" });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to copy link" });
    }
  }

  async function downloadImage(post: PostMetrics) {
    const url = post.full_picture ?? post.raw?.full_picture ?? post.raw?.picture ?? null;
    if (!url) { toast({ title: "No image", description: "No media found for this post." }); return; }
    try {
      const r = await fetch(url, { mode: "cors" });
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${post.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      toast({ title: "Downloaded", description: "Image downloaded." });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to download image." });
    }
  }

  // export CSV (visible posts)
  function exportCSV() {
    if (!activeAccount) return;
    const header = ["id", "permalink", "message", "created_time", "likes", "comments", "shares", "engagement_percent", "media_url"];
    const rows = visiblePosts.map(p => {
      const permalink = p.permalink_url ?? p.raw?.permalink_url ?? buildPermalinkFromId(p.id);
      const media = p.full_picture ?? p.raw?.full_picture ?? p.raw?.picture ?? "";
      const engPct = computeEngagementPercent(p);
      return [
        p.id,
        `"${permalink}"`,
        `"${(p.message ?? "").replace(/"/g, '""')}"`,
        p.created_time ?? "",
        p.reactions ?? 0,
        p.comments ?? 0,
        p.shares ?? 0,
        engPct == null ? "" : engPct.toFixed(2),
        `"${media}"`
      ].join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(activeAccount.account_name ?? activeAccount.provider_user_id)}_posts.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: "Export started", description: "CSV downloading." });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">{activeAccount ? (activeAccount.account_name ?? activeAccount.provider_user_id) : "Facebook Insights"}</h2>
          <div className="text-xs text-muted-foreground">Detailed post metrics, media & engagement</div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={dateRange} onChange={(e) => setDateRange(e.target.value as any)}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </Select>

          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="engagement">Sort: Engagement</option>
            <option value="recent">Sort: Recent</option>
          </Select>

          <Input placeholder="Filter posts..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button onClick={() => { setPageSize((s) => Math.min(100, s + 10)); toast({ title: "Loading more" }); }}>Load more</Button>
          <Button onClick={() => exportCSV()}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
          <Button onClick={() => { setPageSize(10); setQuery(""); setSortBy("engagement"); }} variant="outline">Reset</Button>
          <Button onClick={() => window.location.reload()}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      {managementLoading ? <div>Loading accounts...</div> : !activeAccount ? <div>No account available.</div> : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader><CardTitle>Total Reactions</CardTitle></CardHeader>
              <CardContent>
                <div className="text-xl font-semibold">{formatNumber(kpis.reactions)}</div>
                <div className="text-xs text-muted-foreground">Across {kpis.posts} posts</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Comments</CardTitle></CardHeader>
              <CardContent>
                <div className="text-xl font-semibold">{formatNumber(kpis.comments)}</div>
                <div className="text-xs text-muted-foreground">User discussion</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Shares</CardTitle></CardHeader>
              <CardContent>
                <div className="text-xl font-semibold">{formatNumber(kpis.shares)}</div>
                <div className="text-xs text-muted-foreground">Amplified reach</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Avg engagement / post</CardTitle></CardHeader>
              <CardContent>
                <div className="text-xl font-semibold">{formatNumber(kpis.avgEngagement)}</div>
                <div className="text-xs text-muted-foreground">Average reactions+comments+shares</div>
              </CardContent>
            </Card>
          </div>

          {/* Chart + actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Engagement over time</CardTitle></CardHeader>
              <CardContent style={{ height: 260 }}>
                {timeseries.length === 0 ? <div>No time-series</div> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeseries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="engagements" stroke="#8884d8" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => exportCSV()}><Download className="w-4 h-4 mr-2" />Export filtered CSV</Button>
                  <div className="text-xs text-muted-foreground">
                    Fans: <strong>{activeAccount.fb_raw?.fan_count ?? insights?.fan_count ?? "—"}</strong>
                  </div>
                  <div className="text-xs text-muted-foreground">Tip: click a post to expand details & actions.</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Posts list */}
          <Card>
            <CardHeader><CardTitle>Post Metrics ({visiblePosts.length})</CardTitle></CardHeader>
            <CardContent>
              {loading ? <div>Loading posts...</div> : visiblePosts.length === 0 ? <div>No posts</div> : (
                <div className="space-y-4 max-h-[700px] overflow-auto">
                  {visiblePosts.map(post => {
                    const permalink = post.permalink_url ?? post.raw?.permalink_url ?? buildPermalinkFromId(post.id);
                    const media = post.full_picture ?? post.raw?.full_picture ?? post.raw?.picture ?? null;
                    const engagement = (post.reactions ?? 0) + (post.comments ?? 0) + (post.shares ?? 0);
                    const engagementPct = computeEngagementPercent(post);
                    const commentsPreview = (post.raw?.comments?.data ?? []).slice(0, 3);
                    const postType = post.raw?.type ?? (post.raw?.attachments?.data?.[0]?.type ?? "post");
                    return (
                      <div key={post.id} className="p-3 border rounded bg-card/50">
                        <div className="flex gap-4">
                          {/* media column */}
                          <div style={{ minWidth: 120, maxWidth: 160 }}>
                            {media ? (
                              <img src={media} alt={post.message ? post.message.slice(0, 50) : post.id} className="w-full h-28 object-cover rounded" />
                            ) : (
                              <div className="w-full h-28 bg-muted/10 rounded flex items-center justify-center text-xs">No media</div>
                            )}
                          </div>

                          {/* content column */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="text-sm font-medium mb-1 break-words">{post.message ?? "[No text]"}</div>
                                <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
                                  <div>Posted: {post.created_time ? new Date(post.created_time).toLocaleString() : "—"}</div>
                                  <div>Type: {postType}</div>
                                  <div>Engagement: <strong>{engagement}</strong></div>
                                  <div>Likes: {formatNumber(post.reactions)}</div>
                                  <div>Comments: {formatNumber(post.comments)}</div>
                                  <div>Shares: {formatNumber(post.shares)}</div>
                                  <div>Eng %: {engagementPct == null ? "—" : `${engagementPct.toFixed(2)}%`}</div>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                <div className="flex gap-1">
                                  <a href={permalink} target="_blank" rel="noreferrer" title="Open on Facebook">
                                    <Button size="sm" variant="ghost"><ExternalLink className="w-4 h-4" /></Button>
                                  </a>
                                  <Button size="sm" onClick={() => copyPermalink(post)} title="Copy link"><Copy className="w-4 h-4" /></Button>
                                  {media && <Button size="sm" onClick={() => downloadImage(post)} title="Download media"><Download className="w-4 h-4" /></Button>}
                                  <Button size="sm" onClick={() => refreshPost(post.id)} title="Refresh"><RefreshCw className="w-4 h-4" /></Button>
                                  <Button size="sm" onClick={() => setJsonModal(post.raw ?? post)} title="Inspect"><MoreHorizontal className="w-4 h-4" /></Button>
                                </div>
                                <div className="text-xs text-muted-foreground">{post.id}</div>
                              </div>
                            </div>

                            {/* comments preview */}
                            <div className="mt-3 text-sm">
                              <div className="font-medium text-xs mb-1">Top comments</div>
                              {commentsPreview.length === 0 ? <div className="text-xs text-muted-foreground">No comments</div> : (
                                <div className="space-y-1">
                                  {commentsPreview.map((c: any, i: number) => (
                                    <div key={i} className="text-xs text-muted-foreground">
                                      <strong>{c.from?.name ?? "User"}</strong>: {c.message ?? "[no text]"}
                                    </div>
                                  ))}
                                  { (post.raw?.comments?.data?.length ?? 0) > commentsPreview.length && (
                                    <div className="text-xs text-primary">...more comments available (Inspect)</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* simple JSON modal - naive impl */}
      {jsonModal && (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-50 flex items-start justify-center p-6"
          onClick={() => setJsonModal(null)}
        >
          <div className="w-full max-w-3xl bg-white rounded shadow-lg p-4 overflow-auto" style={{ maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Inspect JSON</h3>
              <div className="flex gap-2">
                <Button onClick={() => { navigator.clipboard.writeText(JSON.stringify(jsonModal, null, 2)).then(() => toast({ title: "Copied JSON" })); }}>Copy JSON</Button>
                <Button variant="destructive" onClick={() => setJsonModal(null)}>Close</Button>
              </div>
            </div>
            <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(jsonModal, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
