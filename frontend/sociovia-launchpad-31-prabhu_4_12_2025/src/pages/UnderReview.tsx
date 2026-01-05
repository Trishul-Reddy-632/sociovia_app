import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import logo from "@/assets/sociovia_logo.png";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINT } from "@/config";



// with (exact drop-in)
const API_STATUS = `${API_ENDPOINT}/status`;


export default function UnderReview(): JSX.Element {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [endpointMissing, setEndpointMissing] = useState(false);

  const pollTimerRef = useRef<number | null>(null);
  const backoffRef = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(false);
  const navigatedRef = useRef(false);

  // intervals / limits
  const FAST_INTERVAL_MS = 8_000;
  const SLOW_INTERVAL_MS = 60_000;
  const BASE_BACKOFF_MS = 5_000;
  const MAX_BACKOFF_MS = 5 * 60_000;

  useEffect(() => {
    mountedRef.current = true;

    // short-circuit if cached user is already approved
    try {
      const raw = localStorage.getItem("sv_user");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.status === "approved") {
          handleApprovedRedirect();
          return;
        }
      }
    } catch {
      // ignore JSON parse errors
    }

    pollOnce();

    return () => {
      mountedRef.current = false;
      stopPolling();
    };
     
  }, []);

  useEffect(() => {
    if (status === "approved" && !navigatedRef.current) {
      handleApprovedRedirect();
    }
     
  }, [status]);

  function handleApprovedRedirect() {
    navigatedRef.current = true;
    localStorage.removeItem("sv_user"); // clear old cache
    toast?.({ title: "Account approved 🎉", description: "Please login again to continue." });
    navigate("/login");
  }

  function stopPolling() {
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch { }
      abortRef.current = null;
    }
  }

  function scheduleNext(delayMs: number) {
    if (!mountedRef.current) return;
    if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
    pollTimerRef.current = window.setTimeout(() => {
      pollOnce();
    }, delayMs);
  }

  // Helper: get email from localStorage (sv_user)
  function getCachedEmail(): string | null {
    try {
      const raw = localStorage.getItem("sv_user");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.email ? String(parsed.email).trim().toLowerCase() : null;
    } catch {
      return null;
    }
  }

  async function pollOnce() {
    stopPolling();
    if (!mountedRef.current) return;

    const emailParam = getCachedEmail();

    // If we don't have an email to poll for, stop and ask user to login.
    if (!emailParam) {
      setLoading(false);
      setError("Missing cached email — please login to continue.");
      // do not schedule further retries; user should login or we should store email
      return;
    }

    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    setLoading(true);
    setError(null);

    try {
      const url = `${API_STATUS}?email=${encodeURIComponent(emailParam)}`;
      const res = await fetch(url, { credentials: "include", signal });

      if (!mountedRef.current) return;

      setLastChecked(Date.now());

      if (!res.ok) {
        if (res.status === 401) {
          setError("Not authenticated — please login.");
          navigate("/login");
          return;
        }
        if (res.status === 404) {
          setEndpointMissing(true);
          setError(`Server endpoint not available (404). Retrying less frequently.`);
          backoffRef.current = 0;
          scheduleNext(SLOW_INTERVAL_MS);
          return;
        }

        let body: any = {};
        try { body = await res.json(); } catch { }
        setError(body?.error || body?.message || `Server returned ${res.status}`);

        backoffRef.current = backoffRef.current
          ? Math.min(MAX_BACKOFF_MS, backoffRef.current * 2)
          : BASE_BACKOFF_MS;
        scheduleNext(backoffRef.current);
        return;
      }

      const body = await res.json().catch(() => ({}));
      // /api/status returns { status: "under_review" }
      const st = body?.status ?? null;

      setEndpointMissing(false);
      backoffRef.current = 0;
      setError(null);
      setStatus(st);

      if (st === "approved") {
        stopPolling();
        handleApprovedRedirect();
        return;
      }

      scheduleNext(FAST_INTERVAL_MS);
    } catch {
      setError("Network error while checking status. Retrying...");
      backoffRef.current = backoffRef.current
        ? Math.min(MAX_BACKOFF_MS, backoffRef.current * 2)
        : BASE_BACKOFF_MS;
      scheduleNext(backoffRef.current);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  const humanLastChecked = lastChecked ? new Date(lastChecked).toLocaleTimeString() : "Never";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <img src={logo} alt="Sociovia" className="mx-auto h-20 w-auto mb-6" />
        </div>

        <Card className="border-2 border-primary/20 shadow-soft">
          <CardHeader className="text-center space-y-4">
            <div className="w-20 h-20 primary-gradient rounded-full flex items-center justify-center mx-auto animate-pulse-soft">
              <Clock className="w-10 h-10 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl md:text-3xl">Account Status</CardTitle>
            <CardDescription className="text-lg">We are reviewing your account — you’ll get access soon.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">Review in Progress</span>
              </div>

              <p className="text-muted-foreground max-w-xl mx-auto">
                Our team verifies new accounts to ensure platform safety and quality. We typically complete this in 4-6 hours.
              </p>

              {loading && <div className="text-sm text-muted-foreground">Checking status…</div>}

              {status && status !== "approved" && (
                <div className="text-sm text-muted-foreground">
                  Current status: <strong className="capitalize">{status}</strong>
                </div>
              )}

              {endpointMissing && (
                <div className="text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded">
                  Server endpoint ({API_STATUS}) returned 404. We'll retry less frequently. If this persists, contact support.
                </div>
              )}

              {error && !endpointMissing && (
                <div className="text-sm text-destructive">{error}</div>
              )}

              <div className="text-xs text-muted-foreground">Last checked: {humanLastChecked}</div>
            </div>

            <div className="text-center pt-4 border-t">
              <div className="mb-3">
                <Link to="/login">
                  <Button variant="outline" size="sm">Back to Login</Button>
                </Link>
              </div>


            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
