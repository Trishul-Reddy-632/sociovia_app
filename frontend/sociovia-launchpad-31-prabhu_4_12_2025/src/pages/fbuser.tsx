// src/pages/FacebookManager.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Copy, ExternalLink, Facebook, Instagram, RefreshCw, Trash2, Plus, ArrowLeft, Check, AlertCircle, LayoutDashboard, Globe, Users, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { API_BASE_URL } from "@/config";
import apiClient from "@/lib/apiClient";

type SocialAccountDB = {
  id: string;
  provider: string;
  provider_user_id: string;
  account_name: string;
  ad_account_id?: string;
  access_token?: string;
  profile?: {
    ad_account?: {
      account_id: string;
      name: string;
      currency?: string;
      timezone_name?: string;
    };
  };
};

type AdAccount = {
  id: string;
  name: string;
  status: number | string;
  currency: string;
  timezone: string;
  spend_cap?: string;
  amount_spent?: string;
  balance?: string;
  business_id?: string;
  source: string;
  linked_in_db: boolean;
};

type Business = {
  id: string;
  name: string;
  verification_status: string;
};

type FacebookPage = {
  id: string;
  name: string;
  category?: string;
  tasks?: string[];
  instagram_business_account?: {
    id: string;
  };
};

type InstagramAccount = {
  id: string;
  page_id: string;
  page_name: string;
};

type BillingInfo = {
  ad_account_id: string;
  funding_source_id: string;
  type: string;
  display: string;
};

type FullSocialData = {
  user: { id: number; name: string; email: string };
  facebook_user: { id: string; name: string };
  database_state: { linked_social_accounts: SocialAccountDB[] };
  businesses: Business[];
  ad_accounts: AdAccount[];
  billing: BillingInfo[];
  facebook_pages: FacebookPage[];
  instagram_accounts: InstagramAccount[];
};

const API_BASE = API_BASE_URL;

// --- Helpers ---

// Removed manual helpers (getCookie, getAuthToken, makeUrl) in favor of apiClient

function getWorkspaceIdFromStorage(): string | undefined {
  try {
    const wsId = localStorage.getItem("sv_selected_workspace_id");
    if (wsId) return wsId;

    // fallback to cookie if needed?
    // Using simple approach, apiClient handles auth tokens, but we still need workspace ID for logic
    // const cookieWs = ... (removed for simplicity, prefer localStorage)

    return undefined;
  } catch (err) {
    console.warn("[fb] getWorkspaceIdFromStorage error", err);
    return undefined;
  }
}

async function getUserIdFromMe(): Promise<number | undefined> {
  try {
    console.log("[fb] fetching /api/me to resolve user id");
    // apiClient returns { ok, data, error, status }
    const res = await apiClient.get<any>("/me");

    if (!res || !res.ok || !res.data) {
      console.warn("[fb] /api/me failed or no data", res?.error);
      return undefined;
    }

    const u = res.data.user ?? res.data;
    const id = u?.id;
    console.log("[fb] resolved user id from /api/me:", id);
    return typeof id === "number" ? id : (id ? Number(id) : undefined);
  } catch (err) {
    console.warn("[fb] getUserIdFromMe failed", err);
    return undefined;
  }
}

export default function FacebookManager(): JSX.Element {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FullSocialData | null>(null);
  const [filter, setFilter] = useState("");
  const [oauthOpening, setOauthOpening] = useState(false);
  const [opBusy, setOpBusy] = useState(false);
  const [linkedDetails, setLinkedDetails] = useState<any | null>(null);

  // References
  const oauthWindowRef = useRef<Window | null>(null);
  const handledRef = useRef(false);

  // Modal State
  const [showOauthAdSelect, setShowOauthAdSelect] = useState(false);
  const [oauthAdAccounts, setOauthAdAccounts] = useState<any[] | null>(null);
  const [selectedOauthAd, setSelectedOauthAd] = useState<string | null>(null);
  const [selectedOauthPage, setSelectedOauthPage] = useState<string | null>(null);

  // Success/Info Modal
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoConfig, setInfoConfig] = useState<{ title: string; description: string }>({ title: "", description: "" });

  const openInfo = (title: string, description: string) => {
    setInfoConfig({ title, description });
    setInfoOpen(true);
    setTimeout(() => setInfoOpen(false), 4000);
  };

  // --- Actions ---

  const load = useCallback(async () => {
    setLoading(true);
    console.log("[fb] load(): fetching /social/management/full");
    try {
      // 1. Get workspace ID
      const workspaceId = getWorkspaceIdFromStorage();
      if (!workspaceId) {
        toast({ title: "Workspace Needed", description: "Please select a workspace first.", variant: "destructive" });
        setLoading(false);
        return;
      }

      // 2. Fetch from new FULL endpoint using apiClient
      // apiClient returns { ok, data, error, status }
      const res = await apiClient.get<any>(`/social/management/full?workspace_id=${workspaceId}`);

      // 3. Handle specific error cases
      if (!res.ok) {
        const errData = res.error || {};
        // "no_meta_token_found" means user hasn't connected FB yet. This is expected for new users.
        if (res.status === 400 && errData.error === "no_meta_token_found") {
          console.log("[fb] no meta token found, showing connect state");
          setData(null); // Ensure data is null so "Connect Now" shows
          return;
        }
        if (res.status === 401 || errData.error === "unauthorized") {
          throw new Error("Unauthorized. Please log in again.");
        }

        throw new Error(errData.error || errData.message || `HTTP ${res.status}`);
      }

      // 4. Success
      const body = res.data;
      if (!body || !body.success) {
        throw new Error(body?.error || "Failed to load social data");
      }

      // 5. Set Data
      setData(body);

      // 6. If we have linked accounts, fetch their fresh details
      if (body.database_state?.linked_social_accounts?.length > 0) {
        fetchLinkedDetails(workspaceId);
      }

    } catch (err: any) {
      console.error("[fb] load() failed:", err);
      if (err.message && err.message.includes("Unauthorized")) {
        toast({ title: "Session Expired", description: "Please log in again.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: err.message || "Failed to load accounts", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch specific details for the connected workspace ad account
  async function fetchLinkedDetails(workspaceId: string) {
    try {
      const userId = await getUserIdFromMe();
      if (!userId) return;

      const j = await apiClient.post<any>("/facebook/ad-account/details", {
        workspace_id: workspaceId,
        user_id: userId
      });

      if (j && j.ok && j.ad_account) {
        setLinkedDetails(j.ad_account);
      }
    } catch (e) {
      console.error("Failed to fetch linked ad account details", e);
    }
  }

  useEffect(() => { load(); }, [load]);

  async function postOauthSelection() {
    if (!selectedOauthAd) {
      toast({ title: "Select Ad Account", description: "Please pick an ad account." });
      return;
    }
    setOpBusy(true);
    try {
      const userId = await getUserIdFromMe();
      const workspaceId = getWorkspaceIdFromStorage();
      const body = {
        ad_account_id: selectedOauthAd,
        user_id: userId || undefined,
        workspace_id: workspaceId,
      };

      const j = await apiClient.post<any>("/meta/save", body);

      if (!j?.success) throw new Error(j?.error || j?.message || "Failed to save");

      toast({ title: "Saved", description: "Ad account configuration saved." });
      setShowOauthAdSelect(false);
      await load();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message || "Could not save selection", variant: "destructive" });
    } finally {
      setOpBusy(false);
    }
  }

  // --- Polling & OAuth ---

  function tryParseHashPayload() {
    try {
      const m = location.hash.match(/data=(.*)$/);
      if (!m || !m[1]) return null;
      return JSON.parse(decodeURIComponent(m[1]));
    } catch (err) {
      return null;
    }
  }

  useEffect(() => {
    const payload = tryParseHashPayload();
    if (payload && payload.type === "sociovia_oauth_complete") {
      const adAccounts = payload.ad_accounts || [];
      const savedPages = payload.saved || [];
      if (adAccounts.length > 0) {
        load().then(() => {
          setOauthAdAccounts(adAccounts);
          setSelectedOauthAd(adAccounts[0].account_id || adAccounts[0].id || null);
          setSelectedOauthPage((savedPages[0] && savedPages[0].provider_user_id) || null);
          setShowOauthAdSelect(true);
        });
      } else {
        load();
        openInfo("Connected", "Facebook connected successfully.");
      }
    }
  }, []);

  async function openOAuthConnect() {
    const userId = await getUserIdFromMe();
    const workspaceId = getWorkspaceIdFromStorage();

    // For popup, we need the full URL since window.open doesn't use apiClient
    // We can import API_BASE_URL to build it safely
    const popupUrl = `${API_BASE_URL}/api/meta/connect?workspace_id=${workspaceId}&user_id=${userId}`;

    handledRef.current = false;
    setOauthOpening(true);

    const win = window.open(popupUrl, "fb_connect", "width=900,height=650");
    oauthWindowRef.current = win;
    if (!win) {
      setOauthOpening(false);
      return;
    }

    const poll = window.setInterval(() => {
      try {
        if (!win || win.closed) {
          window.clearInterval(poll);
          if (!handledRef.current) {
            handledRef.current = true;
            setOauthOpening(false);
            load();
          }
          return;
        }

        let jsonContent = null;
        try {
          const text = win.document.body.innerText;
          if (text && (text.startsWith("{") || text.trim().startsWith("{"))) {
            jsonContent = JSON.parse(text);
          }
        } catch { /* cross-origin */ }

        if (jsonContent && jsonContent.success) {
          window.clearInterval(poll);
          if (!handledRef.current) {
            handledRef.current = true;
            setOauthOpening(false);
            win.close();

            const adAccounts = jsonContent.ad_accounts || [];
            if (adAccounts.length > 0) {
              setOauthAdAccounts(adAccounts);
              setSelectedOauthAd(adAccounts[0].id || adAccounts[0].account_id || null);
              setShowOauthAdSelect(true);
            } else {
              openInfo("Connected", "Facebook connected, but no ad accounts found.");
              load();
            }
          }
        }
      } catch { /* ignore */ }
    }, 1000);
  }

  // --- Filters is tricky with deep structure, let's filter ad accounts flatly for now or just businesses
  // For simplicity, we just check if any ad account or business name matches

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Connections</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Manage your Facebook Business Assets.
            {data?.facebook_user && <span className="ml-1 font-medium text-blue-600">Connected as {data.facebook_user.name}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
          <Button variant="outline" size="sm" className="flex-1 md:flex-none" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Back</span>
          </Button>
          <Button variant="outline" size="sm" className="flex-1 md:flex-none" onClick={() => navigate("/dashboard")}>
            <LayoutDashboard className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Dashboard</span>
          </Button>
          <Button variant="outline" size="sm" className="flex-1 md:flex-none" onClick={() => load()} disabled={loading || opBusy}>
            <RefreshCw className={`w-4 h-4 md:mr-2 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Refresh Data</span>
          </Button>
          <Button onClick={openOAuthConnect} disabled={oauthOpening || opBusy} className="bg-[#1877F2] hover:bg-[#166fe5] flex-1 md:flex-none whitespace-nowrap" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Connect / Reconnect Meta
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Card key={i} className="h-64 animate-pulse bg-muted/20" />)}
        </div>
      ) : !data ? (
        // Empty / No Data state (or error)
        <div className="text-center py-12 bg-white rounded-lg border border-dashed">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-500 mb-4">
            <Facebook className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium">No Connection Data</h3>
          <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
            Please connect your Facebook account to view your businesses and ad accounts.
          </p>
          <Button onClick={openOAuthConnect} className="mt-4" variant="outline">Connect Now</Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pages & IG Section */}
          {(data.facebook_pages.length > 0 || data.instagram_accounts.length > 0) && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Globe className="w-5 h-5 text-gray-500" />
                Pages & Instagram
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.facebook_pages.map(p => {
                  const ig = data.instagram_accounts.find(i => i.page_id === p.id);
                  return (
                    <Card key={p.id} className="overflow-hidden border-l-4 border-l-blue-500">
                      <CardHeader className="pag-4 pb-2">
                        <CardTitle className="text-base truncate">{p.name}</CardTitle>
                        <CardDescription className="text-xs">Page ID: {p.id}</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-3 text-sm">
                        {p.category && <Badge variant="secondary" className="mb-2">{p.category}</Badge>}
                        {ig && (
                          <div className="flex items-center gap-2 mt-2 p-2 bg-pink-50 rounded-md text-pink-700">
                            <Instagram className="w-4 h-4" />
                            <div className="flex-1 truncate">
                              <div className="font-medium text-xs">Instagram Linked</div>
                              <div className="text-[10px] opacity-80">ID: {ig.id}</div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* Businesses & Ad Accounts */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-gray-500" />
              Business Portfolios & Ad Accounts
            </h2>

            {/* 1. RENDER LINKED ACCOUNTS FROM DB, EVEN IF NOT IN HIERARCHY */}
            {data.database_state?.linked_social_accounts?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Active Workspace Connection</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {data.database_state.linked_social_accounts.map(acc => {
                    // Use fetched details if available, else fallback to profile or DB data
                    const detail = linkedDetails && linkedDetails.id === acc.ad_account_id ? linkedDetails : (acc.profile?.ad_account || {});

                    // Better name logic: "0-0" often appears for new/unnamed accounts in some API versions
                    let displayName = detail.name || acc.account_name || "Linked Account";
                    if ((displayName === "0-0" || displayName === "0") && detail.business?.name) {
                      displayName = `${detail.business.name} Ad Account`;
                    }

                    const displayId = detail.id || detail.account_id || acc.ad_account_id || acc.provider_user_id;

                    // Money formatter
                    const formatMoney = (val: string | undefined, curr: string | undefined) => {
                      if (!val) return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr || 'USD' }).format(0);
                      const num = parseFloat(val);
                      if (isNaN(num)) return val;
                      // Meta values are usually in cents
                      return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr || 'USD' }).format(num);
                    };

                    const capDisplay = (detail.spend_cap && detail.spend_cap !== '0')
                      ? formatMoney(detail.spend_cap, detail.currency)
                      : '∞';

                    const spentDisplay = formatMoney(detail.amount_spent || '0', detail.currency);

                    return (
                      <Card key={acc.id} className="bg-blue-50/50 border-blue-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold">
                          CONNECTED
                        </div>
                        <CardContent className="p-4 flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-blue-900 truncate max-w-[200px]" title={displayName}>{displayName}</div>
                              <div className="text-xs text-blue-700 font-mono">ID: {displayId}</div>
                              {detail.business?.name && <div className="text-[10px] text-blue-600 mt-0.5">Biz: {detail.business.name}</div>}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {detail.account_status && (
                                <Badge variant="outline" className="bg-white text-blue-800 border-blue-200 text-[10px] px-1.5 py-0 h-5">
                                  Status: {detail.account_status}
                                </Badge>
                              )}
                              {detail.timezone_name && (
                                <div className="text-[10px] text-blue-500" title={detail.timezone_name}>
                                  {detail.timezone_name.split('/')[1] || detail.timezone_name}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                            {detail.currency && (
                              <div className="bg-white p-2 rounded border border-blue-100">
                                <div className="text-blue-400 uppercase text-[10px] font-semibold">Currency</div>
                                <div className="font-mono text-blue-900">{detail.currency}</div>
                              </div>
                            )}
                            <div className="bg-white p-2 rounded border border-blue-100">
                              <div className="text-blue-400 uppercase text-[10px] font-semibold">Spent / Cap</div>
                              <div className="font-mono text-blue-900 truncate">
                                {spentDisplay} / {capDisplay}
                              </div>
                            </div>
                          </div>

                          <Button size="sm" variant="outline" className="w-full mt-2 h-8 text-xs bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                            disabled
                          >
                            <Check className="w-3 h-3 mr-1 text-green-500" /> Active
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {data.businesses.length === 0 && (
              <div className="p-4 bg-orange-50 text-orange-800 rounded-md flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                NO Business Managers found attached to your user. You may need to create one in Facebook Business Suite.
              </div>
            )}

            {data.businesses.map(bm => {
              const accounts = data.ad_accounts.filter(a => a.business_id === bm.id);
              return (
                <Card key={bm.id} className="bg-slate-50/50">
                  <CardHeader className="pb-2 border-b bg-white rounded-t-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {bm.name}
                          {bm.verification_status === 'verified' && <ShieldCheck className="w-4 h-4 text-green-500" />}
                        </CardTitle>
                        <CardDescription>Business ID: {bm.id}</CardDescription>
                      </div>
                      <Badge variant="outline">{accounts.length} Ad Accounts</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {accounts.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No ad accounts found for this business.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {accounts.map(ad => {
                          const billing = data.billing.filter(b => b.ad_account_id === ad.id);
                          return (
                            <div key={ad.id} className="bg-white p-4 rounded-lg border shadow-sm flex flex-col gap-3 relative overflow-hidden group">
                              {ad.linked_in_db && <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-medium">LINKED</div>}

                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-semibold text-sm truncate max-w-[180px]" title={ad.name}>{ad.name}</div>
                                  <div className="text-xs text-muted-foreground font-mono">ID: {ad.id}</div>
                                </div>
                                <Badge variant={ad.status === "ACTIVE" ? "default" : "secondary"} className={`text-[10px] ${ad.status === 'ACTIVE' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}`}>
                                  {ad.status === 1 ? 'ACTIVE' : ad.status}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                                <div className="bg-slate-50 p-1.5 rounded">
                                  <div className="text-slate-500 uppercase text-[10px]">Currency</div>
                                  <div className="font-mono">{ad.currency}</div>
                                </div>
                                <div className="bg-slate-50 p-1.5 rounded">
                                  <div className="text-slate-500 uppercase text-[10px]">Timezone</div>
                                  <div className="truncate" title={ad.timezone}>{ad.timezone?.split('/')[1] || ad.timezone}</div>
                                </div>
                              </div>

                              {billing.length > 0 && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-auto pt-2 border-t border-dashed">
                                  <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                  <span className="truncate max-w-[150px]">{billing[0].display || billing[0].type}</span>
                                  {billing.length > 1 && <span>+{billing.length - 1}</span>}
                                </div>
                              )}

                              {!ad.linked_in_db ? (
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="w-full mt-2 h-8 text-xs bg-indigo-600 hover:bg-indigo-700"
                                  onClick={() => {
                                    setSelectedOauthAd(ad.id);
                                    // We need to trigger the save flow, but ideally we select a page too.
                                    // For now, let's open the dialog pre-filled? 
                                    // Or just direct save if page not strictly required?
                                    // The existing backend 'save' expects ad_account_id.
                                    // We'll reuse the dialog logic to be safe.
                                    setOauthAdAccounts(data.ad_accounts);
                                    setShowOauthAdSelect(true);
                                  }}
                                >
                                  Link to Workspace
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" className="w-full mt-2 h-8 text-xs cursor-default hover:bg-white text-green-600 border-green-200">
                                  <Check className="w-3 h-3 mr-1" /> Connected
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      {/* Info Dialog */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{infoConfig.title}</DialogTitle>
            <DialogDescription>{infoConfig.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setInfoOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
