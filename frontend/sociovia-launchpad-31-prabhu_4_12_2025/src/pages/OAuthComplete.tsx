import React, { useEffect, useState } from "react";

type OAuthPayload = {
  type?: string;
  success?: boolean;
  state?: string;
  token?: string;
  access_token?: string;
  user?: { id?: number | string; name?: string; picture?: string } | null;
  saved?: Array<any>;
  fb_pages_count?: number;
  fb_error?: any;
  [k: string]: any;
};

export default function OAuthComplete(): JSX.Element {
  const [payload, setPayload] = useState<OAuthPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function parseFragment(): OAuthPayload | null {
    try {
      const h = window.location.hash.replace(/^#/, "");
      if (!h) return null;
      const params = new URLSearchParams(h);
      const encoded = params.get("data") || params.get("payload");
      if (!encoded) return null;

      try {
        return JSON.parse(decodeURIComponent(encoded));
      } catch (e) {
        try {
          return JSON.parse(atob(encoded));
        } catch (e2) {
          return null;
        }
      }
    } catch (err) {
      console.warn("parseFragment error", err);
      return null;
    }
  }

  useEffect(() => {
    const p = parseFragment();
    if (!p) {
      setError("No payload found in URL fragment.");
      return;
    }

    // Basic validation
    if (p.type && p.type !== "sociovia_oauth_complete") {
      console.warn("Unexpected payload type:", p.type);
    }

    setPayload(p);

    // Persist token & user if present (frontend expects sv_token and sv_user)
    try {
      const token = (p.token || p.access_token) as string | undefined;
      if (token) {
        try {
          localStorage.setItem("sv_token", token);
          console.debug("[OAuthComplete] persisted sv_token");
        } catch (e) {
          console.warn("Failed to persist sv_token", e);
        }
      }

      if (p.user) {
        try {
          localStorage.setItem("sv_user", JSON.stringify(p.user));
          console.debug("[OAuthComplete] persisted sv_user");
        } catch (e) {
          console.warn("Failed to persist sv_user", e);
        }
      }
    } catch (e) {
      console.warn("persisting token/user failed", e);
    }

    // Attempt to postMessage to opener (if present)
    try {
      if (window.opener && !window.opener.closed) {
        // Determine a safe targetOrigin if possible — reading opener.location may throw cross-origin
        let targetOrigin: string | "*" = "*";
        try {
           
          const openerLoc = (window.opener as any).location;
          if (openerLoc && openerLoc.origin) targetOrigin = openerLoc.origin;
        } catch (e) {
          // Can't access opener.location (cross-origin). We'll fallback to "*".
        }

        try {
          window.opener.postMessage(p, targetOrigin as string);
          console.debug("[OAuthComplete] posted payload to opener", { targetOrigin });
        } catch (e) {
          // fallback to wildcard
          try {
            window.opener.postMessage(p, "*");
            console.debug("[OAuthComplete] posted payload to opener with wildcard origin");
          } catch (e2) {
            console.warn("postMessage to opener failed", e2);
          }
        }
      }
    } catch (err) {
      console.warn("postMessage to opener failed", err);
    }

    // Try to close the window (works when opened as a popup)
    try {
      window.close();
    } catch (err) {
      // ignore
    }

    // Remove fragment so it doesn't get processed again on refresh
    try {
      if (window && window.history && window.location) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    } catch (e) {
      // ignore
    }
     
  }, []);

  async function copyPayload() {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn("copy failed", e);
      setCopied(false);
    }
  }

  // Render helpers
  function renderUser() {
    if (!payload || !payload.user) return null;
    const u = payload.user;
    return (
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        {u.picture ? (
          <img src={u.picture} alt={u.name || "User"} style={{ width: 56, height: 56, borderRadius: 999 }} />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: 999, background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", color: "#374151" }}>{(u.name || "?").slice(0,1).toUpperCase()}</div>
        )}
        <div>
          <div style={{ fontWeight: 600 }}>{u.name || "Unnamed user"}</div>
          {u.id ? <div style={{ fontSize: 12, color: "#6b7280" }}>ID: {u.id}</div> : null}
        </div>
      </div>
    );
  }

  function renderSavedAccounts() {
    if (!payload || !Array.isArray(payload.saved) || payload.saved.length === 0) return null;
    return (
      <div style={{ marginTop: 12 }}>
        <h3 style={{ marginBottom: 8 }}>Saved accounts</h3>
        <div style={{ display: "grid", gap: 8 }}>
          {payload.saved.map((s: any, i: number) => {
            const key = `${s.provider || 'facebook'}:${s.provider_user_id || s.id || i}`;
            return (
              <div key={key} style={{ padding: 10, borderRadius: 8, background: "#fff", border: "1px solid #e6e6e6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.account_name || s.name || key}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{s.scopes || s.access || "Pages · Instagram · Insights"}</div>
                </div>
                <div style={{ fontSize: 12, color: s.connected ? "#10b981" : "#6b7280" }}>{s.connected ? "Connected" : "Not connected"}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial", padding: 20 }}>
      <h2>OAuth complete</h2>

      {!payload && !error && <div>Processing… If nothing happens, this page will display the result here.</div>}

      {error && (
        <div style={{ marginTop: 12, color: "#b91c1c" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {payload && (
        <div style={{ marginTop: 14 }}>
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong>Payload received.</strong>
            {payload.success ? (
              <span style={{ marginLeft: 8, color: "#10b981" }}>Success</span>
            ) : (
              <span style={{ marginLeft: 8, color: "#ef4444" }}>Failure</span>
            )}
          </div>

          {/* user summary */}
          {renderUser()}

          {payload.token && (
            <div style={{ marginBottom: 8, color: "#047857" }}>
              <strong>Token saved to localStorage (sv_token)</strong>
            </div>
          )}

          <pre style={{ background: "#f3f4f6", padding: 12, borderRadius: 8, maxHeight: 300, overflow: "auto" }}>
            {JSON.stringify(payload, null, 2)}
          </pre>

          {renderSavedAccounts()}

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button onClick={copyPayload} style={{ padding: "8px 12px", borderRadius: 8 }}>
              {copied ? "Copied!" : "Copy payload"}
            </button>
            <button
              onClick={() => {
                try { window.close(); } catch (e) { /* ignore */ }
              }}
              style={{ padding: "8px 12px", borderRadius: 8 }}
            >
              Close window
            </button>
            <button
              onClick={() => { try { window.location.href = "/dashboard"; } catch (e) {} }}
              style={{ padding: "8px 12px", borderRadius: 8 }}
            >
              Go to dashboard
            </button>
          </div>

          <div style={{ marginTop: 10, color: "#374151", fontSize: 13 }}>
            If this page was opened as a popup by the app, it should have closed automatically. If it did not,
            either the browser blocked window.close(), or you opened this URL directly. Copy the payload and close the tab manually.
          </div>
        </div>
      )}
    </div>
  );
}
