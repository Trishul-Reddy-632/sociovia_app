import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { API_ENDPOINT } from "@/config";

interface FacebookPageOAuthProps {
  apiBase?: string;
  onConnected?: (connected: any[]) => void;
}

type SavedAccount = {
  provider?: string;
  provider_user_id?: string;
  account_name?: string;
  scopes?: string;
  kind?: string;
  connected?: boolean;
  [k: string]: any;
};

export default forwardRef<any, FacebookPageOAuthProps>(function FacebookPageOAuth(
  { apiBase = API_ENDPOINT, onConnected = undefined },
  ref
) {
  const BASE = (apiBase || window.location.origin).replace(/\/+$/, "");
  const CALLBACK_ORIGIN = new URL(BASE).origin;

  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [user, setUser] = useState<{ name: string; picture?: string } | null>(null);

  const popupRef = useRef<Window | null>(null);
  const stateTokenRef = useRef<string | null>(null);
  const messageListenerRef = useRef<any>(null);
  const pollRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({ startOAuth }));

  // --- helper to safely get token from storage ---
  function getToken(): string | null {
    try {
      return localStorage.getItem("sv_token") || sessionStorage.getItem("sv_token") || null;
    } catch (e) {
      console.warn("Failed to read token from storage", e);
      return null;
    }
  }

  function makeUrl(path: string) {
    if (!path) return BASE;
    if (path.startsWith("/")) return `${BASE}${path}`;
    return `${BASE}/${path}`;
  }

  async function safeFetchJson(url: string, opts: RequestInit = {}) {
    const finalUrl = makeUrl(url);
    const token = getToken();

    const defaultHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
    if (token) defaultHeaders["Authorization"] = `Bearer ${token}`;

    const merged: RequestInit = {
      mode: "cors",
      credentials: "include",  // This ensures cookies are sent
      headers: { ...(defaultHeaders as any), ...(opts.headers as any) },
      ...opts,
    };

    if (merged.body && typeof merged.body !== "string") {
      try { merged.body = JSON.stringify(merged.body); } catch (e) { }
    }

    console.debug("[safeFetchJson] ->", finalUrl, merged);
    const resp = await fetch(finalUrl, merged);
    const text = await resp.text().catch(() => "");
    let parsed: any = null;
    try { parsed = text ? JSON.parse(text) : null; } catch (e) { parsed = text; }

    if (!resp.ok) {
      const err: any = new Error(`Request failed: ${resp.status}`);
      err.status = resp.status;
      err.body = parsed;
      throw err;
    }

    return parsed;
  }

  function applySavedAccounts(saved: SavedAccount[]) {
    if (!Array.isArray(saved) || saved.length === 0) return;
    const normalized = saved.map((s) => ({
      provider: s.provider || "facebook",
      provider_user_id: String(s.provider_user_id ?? s.id ?? ""),
      account_name: s.account_name ?? s.name ?? "",
      scopes: s.scopes ?? "",
      kind: s.kind ?? undefined,
      connected: !!s.connected,
      raw: s,
    }));

    setAccounts(normalized);

    const sel: Record<string, boolean> = {};
    normalized.forEach((a) => {
      const key = `${a.provider}:${a.provider_user_id}`;
      sel[key] = !!a.connected || true;
    });
    setSelected(sel);
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem("sv_user");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.name) setUser({ name: parsed.name, picture: parsed.picture });
      }
    } catch (e) { }

    console.debug("[FacebookPageOAuth] sv_token present:", !!getToken());
    handleFragmentPayloadIfAny();
    return () => cleanupPopup();
     
  }, []);

  function cleanupPopup() {
    if (messageListenerRef.current) {
      window.removeEventListener("message", messageListenerRef.current);
      messageListenerRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (popupRef.current && !popupRef.current.closed) {
      try { popupRef.current.close(); } catch (e) { }
      popupRef.current = null;
    }
    stateTokenRef.current = null;
  }

  function processOAuthPayload(data: any) {
    try {
      if (!data || data.type !== "sociovia_oauth_complete") return;
      if (stateTokenRef.current && data.state && data.state !== stateTokenRef.current) {
        console.warn("State mismatch", data.state, stateTokenRef.current);
        return;
      }

      if (data.token || data.access_token) {
        try {
          localStorage.setItem("sv_token", data.token || data.access_token);
          console.debug("[FacebookPageOAuth] persisted token from payload");
        } catch (e) { console.warn("Failed to persist token", e); }
      }

      if (data.user) {
        try {
          localStorage.setItem("sv_user", JSON.stringify(data.user));
          setUser({ name: data.user.name, picture: data.user.picture });
        } catch (e) { }
      }

      if (Array.isArray(data.saved) && data.saved.length > 0) {
        applySavedAccounts(data.saved);
        setStep(3);
        return;
      }

      if (data.success) {
        fetchAccounts().then(() => setStep(3)).catch(() => setStep(3));
      } else {
        if (data.fb_error?.message) alert("OAuth failed: " + data.fb_error.message);
        else alert("OAuth failed or was cancelled. Please try reconnecting.");
        setStep(1);
      }
    } catch (err) {
      console.error("processOAuthPayload error", err);
      setStep(1);
    } finally {
      setLoading(false);
      try { if (popupRef.current && !popupRef.current.closed) popupRef.current.close(); } catch { }
      popupRef.current = null;
      stateTokenRef.current = null;
    }
  }

  function startOAuth() {
    if (loading) return;
    setLoading(true);
    const st = Math.random().toString(36).slice(2);
    stateTokenRef.current = st;
    const url = makeUrl(`/oauth/facebook/connect?state=${encodeURIComponent(st)}`);

    try {
      popupRef.current = window.open(url, "sociovia_oauth", "width=900,height=700");
      if (!popupRef.current) throw new Error("Popup blocked");
    } catch (err) {
      setLoading(false);
      alert("Unable to open popup. Please allow popups for this site.");
      console.error("startOAuth open error:", err);
      return;
    }

    function onMessage(e: MessageEvent) {
      try {
        if (!(e.origin === CALLBACK_ORIGIN || e.origin === window.location.origin)) return;
        const data = e.data || {};
        if (data.type === "sociovia_oauth_complete") {
          window.removeEventListener("message", onMessage);
          messageListenerRef.current = null;
          processOAuthPayload(data);
        }
      } catch (err) { console.error("onMessage error", err); }
    }

    window.addEventListener("message", onMessage, false);
    messageListenerRef.current = onMessage;

    pollRef.current = window.setInterval(() => {
      try {
        if (!popupRef.current || popupRef.current.closed) {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          if (messageListenerRef.current) { window.removeEventListener("message", messageListenerRef.current); messageListenerRef.current = null; }
          if (stateTokenRef.current) { setLoading(false); stateTokenRef.current = null; setStep(1); }
          popupRef.current = null;
          return;
        }

        try {
          const hash = popupRef.current.location.hash || "";
          const origin = popupRef.current.location.origin;
          if (origin === CALLBACK_ORIGIN && hash) {
            const h = hash.replace(/^#/, "");
            const params = new URLSearchParams(h);
            const encoded = params.get("data") || params.get("payload") || null;
            if (encoded) {
              let parsed = null;
              try { parsed = JSON.parse(decodeURIComponent(encoded)); } catch { }
              if (parsed) {
                processOAuthPayload(parsed);
                if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
                if (messageListenerRef.current) { window.removeEventListener("message", messageListenerRef.current); messageListenerRef.current = null; }
              }
            }
          }
        } catch { }
      } catch (err) { console.error("poll error", err); }
    }, 500);
  }

  function handleFragmentPayloadIfAny() {
    try {
      if (window.location.hash) {
        const h = window.location.hash.replace(/^#/, "");
        const params = new URLSearchParams(h);
        const encoded = params.get("data") || params.get("payload") || null;
        if (encoded) {
          const parsed = JSON.parse(decodeURIComponent(encoded));
          if (parsed?.type === "sociovia_oauth_complete") {
            console.log("Recovered OAuth payload from fragment", parsed);
            processOAuthPayload(parsed);
            try { history.replaceState(null, "", window.location.pathname + window.location.search); } catch { }
          }
        }
      }
    } catch (e) { console.warn("No fragment payload or failed to parse", e); }
  }

  async function fetchAccounts() {
    setLoading(true);
    try {
      const j = await safeFetchJson("/social/accounts");
      const list = Array.isArray(j.accounts) ? j.accounts : [];
      setAccounts(list);
      const sel: Record<string, boolean> = {};
      list.forEach((a: any) => (sel[`${a.provider}:${a.provider_user_id}`] = true));
      setSelected(sel);
    } catch (e: any) {
      if (e?.status === 401) {
        console.warn("fetchAccounts: 401 Unauthorized");
        alert("Session expired or not authenticated. Please sign in again.");
        setStep(1);
      } else {
        console.error("fetchAccounts error", e);
        alert("Failed to load connected accounts. See console for details.");
      }
      setAccounts([]);
      setSelected({});
      throw e;
    } finally {
      setLoading(false);
    }
  }

  function toggleAccount(key: string) {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function connectSelected() {
    const chosen = accounts.filter((a) => selected[`${a.provider}:${a.provider_user_id}`]);
    if (chosen.length === 0) { alert("Select at least one account"); return; }
    setLoading(true);

    try {
      const token = getToken();
      const payload: any = {
        accounts: chosen.map((a) => ({
          provider: a.provider,
          provider_user_id: a.provider_user_id,
          name: a.account_name,
        })),
        features: { posting: true, insights: true, ads: true },
      };
      if (token) payload.token = token;

      const extraHeaders: Record<string, string> = {};
      if (token) extraHeaders["Authorization"] = `Bearer ${token}`;

      const j = await safeFetchJson("/oauth/facebook/save-selection", {
        method: "POST",
        headers: extraHeaders,
        body: JSON.stringify(payload),
      });

      console.log("save-selection response:", j);

      if (j?.success) {
        setStep(4);
        if (typeof onConnected === "function") {
          try { onConnected(j.connected || chosen); } catch (err) { console.error(err); }
        }
      } else {
        const errMsg = j?.error || j?.message || "Unknown error";
        alert("Failed to save selection: " + errMsg);
      }
    } catch (e: any) {
      if (e?.status === 401) {
        alert("Unauthorized. Please sign in again.");
        try { localStorage.removeItem("sv_token"); sessionStorage.removeItem("sv_token"); } catch { }
        setStep(1);
      } else {
        console.error("connectSelected error", e);
        alert("Failed to save selection. Check console for details.");
      }
    } finally { setLoading(false); }
  }

  function renderLogin() {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg">
        <h2 className="text-2xl font-semibold mb-2">Connect your Facebook Page</h2>
        <p className="text-sm text-gray-600 mb-6">
          Sign in to Facebook to let Sociovia access Pages and linked Instagram accounts.
        </p>
        <button
          onClick={startOAuth}
          disabled={loading}
          className={`w-full py-3 rounded-xl border font-medium ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {loading ? "Opening…" : "Continue with Facebook"}
        </button>
      </div>
    );
  }

  function renderAccountSelection() {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
        {user && (
          <div className="flex items-center gap-3 mb-4">
            {user.picture && <img src={user.picture} alt="Profile" className="w-12 h-12 rounded-full" />}
            <span className="font-medium">Logged in as {user.name}</span>
          </div>
        )}
        <h2 className="text-2xl font-semibold mb-2">Choose the Pages / Instagram accounts</h2>
        <div className="space-y-3">
          {accounts.length === 0 && <div className="text-sm text-gray-500">No connected Pages/accounts found.</div>}
          {accounts.map((a) => {
            const key = `${a.provider}:${a.provider_user_id}`;
            return (
              <div key={key} className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <div className="font-medium">{a.account_name} {a.kind ? `(${a.kind})` : ""}</div>
                  <div className="text-xs text-gray-500">Access: {a.scopes || "Pages · Instagram · Insights"}</div>
                </div>
                <div>
                  <label className="inline-flex items-center">
                    <input type="checkbox" checked={!!selected[key]} onChange={() => toggleAccount(key)} className="mr-2" />
                    <span className="text-sm">Connect</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={connectSelected} disabled={loading} className="px-5 py-2 rounded-xl bg-blue-600 text-white">
            {loading ? "Saving…" : "Connect selected accounts"}
          </button>
        </div>
      </div>
    );
  }

  function renderSuccess() {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg text-center">
        <h2 className="text-2xl font-semibold mb-2">Connected — You're all set!</h2>
      </div>
    );
  }

  return (
    <div className="p-6">
      {step === 1 && renderLogin()}
      {step === 3 && renderAccountSelection()}
      {step === 4 && renderSuccess()}
    </div>
  );
});