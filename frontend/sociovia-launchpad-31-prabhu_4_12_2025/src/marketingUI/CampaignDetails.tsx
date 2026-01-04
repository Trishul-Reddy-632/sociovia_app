// CampaignDetails.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Pause,
  Play,
  Trash2,
  Image as ImageIcon,
  BarChart2,
  Eye,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { API_ENDPOINT } from "@/config";

type Campaign = {
  id: string;
  name: string;
  status?: string;
  objective?: string;
  created_time?: string;
  [k: string]: any;
};

type AdSet = {
  id: string;
  name: string;
  daily_budget?: number;
  status?: string;
  start_time?: string;
  end_time?: string;
  [k: string]: any;
};

type Ad = {
  id: string;
  name: string;
  status?: string;
  creative?: any;
  creative_preview?: string | null;
  [k: string]: any;
};

type Creative = {
  id: string;
  name?: string;
  preview_url?: string | null;
  raw?: any;
};

const API_BASE = API_ENDPOINT;

function friendlyDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso || "—";
  }
}

export default function CampaignDetails(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [adsets, setAdsets] = useState<AdSet[]>([]);
  const [adsByAdset, setAdsByAdset] = useState<Record<string, Ad[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // creatives state
  const [accountCreatives, setAccountCreatives] = useState<Creative[]>([]);
  const [creativesById, setCreativesById] = useState<Record<string, Creative>>({});
  const [creativesLoading, setCreativesLoading] = useState(false);
  const [previewCreative, setPreviewCreative] = useState<Creative | null>(null);

  useEffect(() => {
    if (!id) return;
    loadCampaignInfo(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function api(path: string, opts: RequestInit = {}) {
    const url = path.startsWith("/") ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
    const res = await fetch(url, opts);
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json, raw: res };
  }

  async function loadCampaignInfo(campaignId: string) {
    setLoading(true);
    setError(null);
    try {
      // fetch campaign (try dedicated endpoint then fallback to listing)
      let r = await api(`/campaigns/${encodeURIComponent(campaignId)}`);
      if (!r.ok) {
        const all = await api("/campaigns");
        if (!all.ok) throw new Error(all.json?.error || "Failed to fetch campaign");
        const found = (all.json?.data || all.json || []).find((x: any) => String(x.id) === String(campaignId));
        setCampaign(found || null);
      } else {
        setCampaign(r.json?.data || r.json || null);
      }

      // load adsets
      const adsetsResp = await api(`/campaigns/${encodeURIComponent(campaignId)}/adsets`);
      if (adsetsResp.ok) {
        const list = adsetsResp.json?.data || adsetsResp.json || [];
        setAdsets(list);
        setAdsByAdset({});
      } else {
        setAdsets([]);
      }

      // load account creatives for side panel
      await fetchAccountCreatives();
    } catch (e: any) {
      setError(e.message || "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }

  async function loadAdsForAdset(adsetId: string) {
    setError(null);
    try {
      const r = await api(`/adsets/${encodeURIComponent(adsetId)}/ads`);
      if (!r.ok) throw new Error(r.json?.error || "Failed to load ads");
      const items: Ad[] = (r.json?.data || r.json || []).map((it: any) => {
        const cp =
          it.creative && it.creative.body && it.creative.body.image_url
            ? it.creative.body.image_url
            : it.creative_preview || null;
        return { ...it, creative_preview: cp };
      });
      setAdsByAdset((s) => ({ ...s, [adsetId]: items }));

      // fetch creatives referenced by these ads
      const creativeIds = Array.from(
        new Set(
          items
            .map((a) => {
              if (a.creative && a.creative.creative_id) return String(a.creative.creative_id);
              if (a.creative && a.creative.id) return String(a.creative.id);
              if ((a as any).creative_id) return String((a as any).creative_id);
              return null;
            })
            .filter(Boolean) as string[]
        )
      );
      await Promise.all(creativeIds.map((cid) => fetchCreativeById(cid)));
    } catch (e: any) {
      setError(e.message || "Failed to load ads");
    }
  }

  // ---------------- creatives ----------------
  const fetchAccountCreatives = useCallback(async () => {
    setCreativesLoading(true);
    setError(null);
    try {
      const r = await api("/creatives");
      if (!r.ok) {
        // if server returned Graph-like shape, try to use r.json.data
        if (r.json && Array.isArray(r.json?.data)) {
          const list = r.json.data.map((c: any) => ({
            id: c.id,
            name: c.name || c.id,
            preview_url:
              c.object_story_spec?.link_data?.image_url ||
              c.thumbnail_url ||
              null,
            raw: c,
          }));
          setAccountCreatives(list);
          const map: Record<string, Creative> = {};
          list.forEach((c: any) => (map[c.id] = c));
          setCreativesById((p) => ({ ...p, ...map }));
        } else {
          throw new Error(r.json?.error || "Failed to fetch creatives");
        }
      } else {
        const list = r.json?.data || r.json || [];
        setAccountCreatives(list);
        const map: Record<string, Creative> = {};
        (list || []).forEach((c: any) => {
          map[c.id] = {
            id: c.id,
            name: c.name,
            preview_url: c.object_story_spec?.link_data?.image_url || null,
            raw: c,
          };
        });
        setCreativesById((p) => ({ ...p, ...map }));
      }
    } catch (e: any) {
      setError(e.message || "Failed to fetch creatives");
    } finally {
      setCreativesLoading(false);
    }
  }, []);

  async function fetchCreativeById(creativeId: string): Promise<Creative | null> {
    if (!creativeId) return null;
    if (creativesById[creativeId]) return creativesById[creativeId];
    try {
      const r = await api(`/creatives/${encodeURIComponent(creativeId)}`);
      if (r.ok) {
        const data = r.json?.data || r.json || {};
        const preview =
          data.object_story_spec?.link_data?.image_url ||
          data.thumbnail_url ||
          null;
        const item: Creative = { id: creativeId, name: data.name || creativeId, preview_url: preview, raw: data };
        setCreativesById((p) => ({ ...p, [creativeId]: item }));
        return item;
      } else {
        // try to interpret r.json
        if (r.json && r.json.id) {
          const preview = r.json.object_story_spec?.link_data?.image_url || null;
          const item: Creative = { id: creativeId, name: r.json.name || creativeId, preview_url: preview, raw: r.json };
          setCreativesById((p) => ({ ...p, [creativeId]: item }));
          return item;
        }
      }
    } catch (e) {
      console.warn("fetchCreativeById failed:", creativeId, e);
    }
    return null;
  }

  async function deleteCreative(creativeId: string) {
    if (!creativeId) return;
    if (!confirm("Delete creative? This may fail if referenced by live ads.")) return;
    setError(null);
    try {
      // try RESTful delete
      const r = await api(`/creatives/${encodeURIComponent(creativeId)}`, { method: "DELETE" });
      if (!r.ok) {
        // fallback to generic object/delete
        const fallback = await api("/object/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: creativeId, level: "creative" }),
        });
        if (!fallback.ok) throw new Error(fallback.json?.error || "Delete failed");
      }
      // remove from caches
      setAccountCreatives((s) => s.filter((c) => c.id !== creativeId));
      setCreativesById((s) => {
        const copy = { ...s };
        delete copy[creativeId];
        return copy;
      });
      if (previewCreative?.id === creativeId) setPreviewCreative(null);
      alert("Creative deleted");
    } catch (e: any) {
      setError(e?.message || "Delete failed");
      console.error("deleteCreative error:", e);
    }
  }

  // open creative from ad object (extract creative id heuristically)
  async function openCreativeFromAd(ad: Ad) {
    let cid: string | null = null;
    if (ad.creative && ad.creative.creative_id) cid = String(ad.creative.creative_id);
    if (!cid && ad.creative && ad.creative.id) cid = String(ad.creative.id);
    if (!cid && (ad as any).creative_id) cid = String((ad as any).creative_id);
    if (!cid) {
      alert("No creative id found on this ad");
      return;
    }
    const c = await fetchCreativeById(cid);
    if (c) setPreviewCreative(c);
    else alert("Creative not found");
  }

  // ---------------- object actions (pause/resume/delete) ----------------
  async function objectAction(
    idArg: string,
    action: "pause" | "resume" | "delete",
    type: "ad" | "adset" | "campaign" | "creative"
  ) {
    setLoading(true);
    setError(null);
    try {
      if (type === "ad") {
        if (action === "delete") {
          const r = await api(`/ads/${encodeURIComponent(idArg)}`, { method: "DELETE" });
          if (!r.ok) throw new Error(r.json || "Delete failed");
        } else {
          const r = await api(`/ads/${encodeURIComponent(idArg)}/${action}`, { method: "POST" });
          if (!r.ok) throw new Error(r.json || "Action failed");
        }
      } else {
        if (action === "delete") {
          const r = await api("/object/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: idArg, level: type }),
          });
          if (!r.ok) throw new Error(r.json || "Delete failed");
        } else {
          const r = await api("/object/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ level: type, id: idArg, action }),
          });
          if (!r.ok) throw new Error(r.json || "Action failed");
        }
      }

      // refresh relevant pieces
      if (type === "campaign") {
        navigate("/", { replace: true });
      } else if (type === "adset") {
        if (campaign?.id) await loadCampaignInfo(campaign.id);
      } else if (type === "ad") {
        // refresh adset list that contains this ad
        Object.keys(adsByAdset).forEach((adsetId) => {
          const arr = adsByAdset[adsetId] || [];
          if (arr.some((a) => a.id === idArg)) loadAdsForAdset(adsetId);
        });
      } else if (type === "creative") {
        await fetchAccountCreatives();
      }
    } catch (e: any) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  // ---------------- render ----------------
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{campaign?.name || "Campaign details"}</h1>
          <div className="text-sm text-muted-foreground">{campaign?.id}</div>
        </div>

        <div className="flex gap-2">
          <Link to="/" className="px-3 py-2 border rounded">Back</Link>
          <button
            onClick={() => campaign?.id && objectAction(campaign.id, "pause", "campaign")}
            className="px-3 py-2 border rounded inline-flex items-center gap-2"
          >
            <Pause className="w-4 h-4" /> Pause
          </button>
          <button
            onClick={() => campaign?.id && objectAction(campaign.id, "resume", "campaign")}
            className="px-3 py-2 border rounded inline-flex items-center gap-2"
          >
            <Play className="w-4 h-4" /> Resume
          </button>
          <button
            onClick={() => campaign?.id && objectAction(campaign.id, "delete", "campaign")}
            className="px-3 py-2 bg-red-600 text-white rounded inline-flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {loading && <div className="mb-4 p-3 rounded bg-slate-50 text-sm">Loading…</div>}
      {error && <div className="mb-4 p-3 rounded bg-red-50 text-sm text-red-700">Error: {error}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: details + adsets */}
        <div className="lg:col-span-2 space-y-4">
          <section className="bg-white border rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Objective</div>
                <div className="font-medium">{campaign?.objective || "—"}</div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Created</div>
                <div className="font-medium">{friendlyDate(campaign?.created_time)}</div>
              </div>
            </div>

            <div className="mt-4 text-xs bg-slate-50 p-3 rounded overflow-auto">
              <pre className="text-xs">{JSON.stringify(campaign || {}, null, 2)}</pre>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">AdSets</h3>
              <div className="flex gap-2">
                <button onClick={() => campaign?.id && loadCampaignInfo(campaign.id)} className="px-2 py-1 border rounded">Refresh</button>
                <button onClick={() => campaign?.id && (async () => {})()} className="px-2 py-1 border rounded inline-flex items-center gap-2">
                  <BarChart2 className="w-4 h-4" /> Insights
                </button>
              </div>
            </div>

            {adsets.length === 0 ? (
              <div className="text-sm text-muted-foreground">No adsets</div>
            ) : (
              <div className="space-y-3">
                {adsets.map((as) => {
                  const ads = adsByAdset[as.id] || [];
                  return (
                    <div key={as.id} className="p-3 border rounded-lg bg-white">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-medium">{as.name}</div>
                          <div className="text-xs text-muted-foreground">{as.id}</div>
                          <div className="text-xs text-muted-foreground mt-1">Budget: {as.daily_budget ?? "—"}</div>
                        </div>

                        <div className="flex flex-col gap-2 items-end">
                          <div className="text-xs">{as.status || "—"}</div>
                          <div className="flex gap-2">
                            <button onClick={() => objectAction(as.id, "pause", "adset")} className="px-2 py-1 border rounded"><Pause className="w-4 h-4" /></button>
                            <button onClick={() => objectAction(as.id, "resume", "adset")} className="px-2 py-1 border rounded"><Play className="w-4 h-4" /></button>
                            <button onClick={() => objectAction(as.id, "delete", "adset")} className="px-2 py-1 border rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                            <button onClick={() => loadAdsForAdset(as.id)} className="px-2 py-1 border rounded text-sm">Load Ads</button>
                          </div>
                        </div>
                      </div>

                      {/* Ads */}
                      {ads.length > 0 && (
                        <div className="mt-3 grid grid-cols-1 gap-2">
                          {ads.map((ad) => (
                            <div key={ad.id} className="flex items-center gap-3 p-2 border rounded">
                              <div className="w-20 h-12 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                                {ad.creative_preview ? (
                                  <img src={ad.creative_preview} alt="preview" className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="w-6 h-6 text-slate-400" />
                                )}
                              </div>

                              <div className="flex-1">
                                <div className="font-medium">{ad.name}</div>
                                <div className="text-xs text-muted-foreground">{ad.id}</div>
                                <div className="text-xs mt-1">Status: {ad.status || "—"}</div>
                              </div>

                              <div className="flex gap-2">
                                <button onClick={() => objectAction(ad.id, "pause", "ad")} className="px-2 py-1 border rounded"><Pause className="w-4 h-4" /></button>
                                <button onClick={() => objectAction(ad.id, "resume", "ad")} className="px-2 py-1 border rounded"><Play className="w-4 h-4" /></button>
                                <button onClick={() => objectAction(ad.id, "delete", "ad")} className="px-2 py-1 border rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                                <button onClick={() => openCreativeFromAd(ad)} className="px-2 py-1 border rounded inline-flex items-center gap-1">
                                  <Eye className="w-4 h-4" /> Creative
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right: creatives */}
        <aside className="space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold">Creatives</div>
                <div className="text-xs text-muted-foreground">{accountCreatives.length} total</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchAccountCreatives()}
                  className="px-2 py-1 border rounded inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[48vh] overflow-auto">
              {accountCreatives.length === 0 && <div className="text-sm text-muted-foreground">No creatives</div>}
              {accountCreatives.map((c) => (
                <div key={c.id} className="flex items-center gap-3 border rounded p-2">
                  <div className="w-12 h-12 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                    {c.preview_url ? <img src={c.preview_url} alt={c.name} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{c.name || c.id}</div>
                    <div className="text-xs text-muted-foreground">{c.id}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <a
                      className="px-2 py-1 border rounded text-xs inline-flex items-center gap-1"
                      target="_blank"
                      rel="noreferrer"
                      href={`https://business.facebook.com/adsmanager/creative/${c.id}`}
                    >
                      <ExternalLink className="w-4 h-4" /> Manager
                    </a>
                    <button onClick={() => setPreviewCreative(c)} className="px-2 py-1 border rounded text-xs">Preview</button>
                    <button onClick={() => deleteCreative(c.id)} className="px-2 py-1 border rounded text-xs text-red-600">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Preview modal */}
      {previewCreative && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded max-w-4xl w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <div className="font-semibold">{previewCreative.name || "Creative"}</div>
                <div className="text-xs text-muted-foreground">{previewCreative.id}</div>
              </div>
              <div className="flex gap-2">
                <a
                  className="px-3 py-1 border rounded inline-flex items-center gap-2"
                  target="_blank"
                  rel="noreferrer"
                  href={`https://business.facebook.com/adsmanager/creative/${previewCreative.id}`}
                >
                  <ExternalLink className="w-4 h-4" /> Open
                </a>
                <button className="px-3 py-1 border rounded" onClick={() => setPreviewCreative(null)}>Close</button>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded overflow-hidden bg-slate-100 flex items-center justify-center">
                {/* image heuristics */}
                {previewCreative.preview_url ? (
                  <img src={previewCreative.preview_url} alt="creative" className="w-full h-full object-contain" />
                ) : (
                  <div className="p-8 text-muted-foreground flex flex-col items-center gap-2">
                    <ImageIcon className="w-12 h-12" />
                    <div className="text-sm">No preview available</div>
                  </div>
                )}
              </div>

              <div className="text-xs">
                <div className="font-medium mb-2">Raw creative JSON</div>
                <div className="bg-slate-50 p-2 rounded overflow-auto max-h-[40vh]">
                  <pre className="text-xs">{JSON.stringify(previewCreative.raw || {}, null, 2)}</pre>
                </div>

                <div className="mt-3 flex gap-2">
                  <button onClick={() => deleteCreative(previewCreative.id)} className="px-3 py-1 border rounded text-red-600">Delete</button>
                  <button onClick={() => setPreviewCreative(null)} className="px-3 py-1 border rounded">Close</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
