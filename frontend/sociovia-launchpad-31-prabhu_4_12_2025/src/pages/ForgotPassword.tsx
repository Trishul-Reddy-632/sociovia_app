import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/sociovia_logo.png";
import { API_BASE_URL } from "@/config";

const API_BASE = API_BASE_URL;

/**
 * ForgotPassword (Sociovia-themed)
 * - Robust handling of all responses
 * - Generic success message to avoid account enumeration
 * - Clear feedback for client validation, rate limits, server errors, network errors
 */

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      // cancel outstanding request when unmounting
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const friendlySuccessMessage =
    "If this email exists, a reset link has been sent. Please check your inbox (and spam/junk).";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    // minimal client-side validation
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      const res = await fetch(`${API_BASE.replace(/\/$/, "")}/api/password/forgot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email }),
        signal,
      });

      // Try to read JSON if possible
      let data: any = {};
      try {
        data = await res.json();
      } catch (err) {
        data = {};
      }

      // Successful (200) — backend intentionally returns generic success even if email missing.
      if (res.ok) {
        // If backend returned an explicit client error in body (rare for 200), show it,
        // otherwise show the friendly generic message to avoid revealing account existence.
        if (data && data.success === false && data.error) {
          // handle specific client-side error codes (if backend uses them)
          switch (data.error) {
            case "email_required":
              setError("Please provide an email address.");
              break;
            default:
              // show backend message when helpful, otherwise generic
              setError(data.message || "Unable to process request. Please try again.");
          }
        } else {
          setSuccess(data.message || friendlySuccessMessage);
        }
        setLoading(false);
        return;
      }

      // Non-200 responses: surface helpful messages but avoid leaking account existence
      if (res.status === 400) {
        // bad request — backend might return validation info
        if (data && (data.error || data.message)) {
          // if error indicates missing/invalid email, show that; otherwise generic
          if (data.error === "email_required" || data.error === "invalid_email") {
            setError("Please enter a valid email address.");
          } else {
            setError(data.message || "Invalid request. Please check and try again.");
          }
        } else {
          setError("Invalid request. Please check your input.");
        }
      } else if (res.status === 429) {
        setError("Too many requests — please wait a few minutes and try again.");
      } else if (res.status >= 500) {
        setError("Server error. Please try again later.");
      } else if (res.status === 404) {
        // treat 404 same as success to avoid account enumeration
        setSuccess(friendlySuccessMessage);
      } else {
        // fallback
        setError(data?.message || "Unexpected error. Please try again.");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // cancelled
        setError("Request cancelled.");
      } else {
        setError("Network error. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-slate-50 p-6">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="flex items-center gap-4 mb-6">
          <img src={logo} alt="Sociovia" className="h-12 w-12 object-contain" />
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Sociovia</h1>
            <p className="text-sm text-slate-500">Reset your account password</p>
          </div>
        </div>

        <Card className="shadow-lg rounded-2xl border border-slate-100">
          <CardHeader className="px-6 pt-6">
            <CardTitle className="text-xl text-center">Forgot Password</CardTitle>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4" aria-describedby="forgot-help">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Registered email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full"
                aria-label="Registered email"
              />

              <Button type="submit" className="w-full" disabled={loading || !email}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>

            <p id="forgot-help" className="mt-4 text-sm text-slate-500">
              We'll send a password reset link to your email if the account exists. The link is time-limited.
            </p>

            {/* accessible live region */}
            <div aria-live="polite" className="mt-4">
              {success && (
                <Alert className="border-emerald-100 bg-emerald-50">
                  <AlertDescription className="text-emerald-800">{success}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive" className="border-rose-100 bg-rose-50">
                  <AlertDescription className="text-rose-800">{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate("/login")}
                className="text-sm text-sky-600 hover:underline"
                type="button"
              >
                Return to sign in
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
