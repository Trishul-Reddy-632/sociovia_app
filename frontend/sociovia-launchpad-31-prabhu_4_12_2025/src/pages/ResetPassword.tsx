import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/sociovia_logo.png";
import { API_ENDPOINT } from "@/config";

const API_BASE = API_ENDPOINT;

function useQueryToken(): string {
  const { search } = useLocation();
  return React.useMemo(() => {
    const q = new URLSearchParams(search);
    return q.get("token") || "";
  }, [search]);
}

const ResetPassword: React.FC = () => {
  const { token: paramToken } = useParams<{ token?: string }>();
  const queryToken = useQueryToken();
  const token = paramToken || queryToken || "";
  const navigate = useNavigate();
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(!!token);
  const [validToken, setValidToken] = useState<boolean | null>(null);
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setValidToken(null);
      return;
    }

    let mounted = true;
    (async () => {
      setValidating(true);
      setError("");
      try {
        const url = `${API_BASE.replace(
          /\/$/,
          ""
        )}/password/forgot/validate?token=${encodeURIComponent(token)}`;
        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data || !data.valid) {
          if (!mounted) return;
          setValidToken(false);
          setError(data?.error || "Reset link is invalid or expired.");
        } else {
          if (!mounted) return;
          setValidToken(true);
          setEmailHint(data.email || null);
        }
      } catch (err) {
        if (!mounted) return;
        setError("Network error while validating token.");
        setValidToken(false);
      } finally {
        if (mounted) setValidating(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Missing reset token.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE.replace(/\/$/, "")}/password/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast({
          title: "Password changed",
          description:
            "Your password was successfully reset. Redirecting to login...",
        });
        setTimeout(() => navigate("/login"), 1400);
      } else {
        const errMsg =
          data?.error || data?.message || "Failed to reset password.";
        setError(errMsg);
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* ✅ Sociovia branding header */}
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="Sociovia" className="h-14 w-14 mb-2" />
          <h1 className="text-lg font-semibold text-slate-900">Sociovia</h1>
          <p className="text-sm text-slate-500">
            Reset your account password securely
          </p>
        </div>

        <Card className="border-2 border-primary/10 shadow-md rounded-xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-xl">Reset Password</CardTitle>
            <CardDescription>
              Please enter a strong new password for your account.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {validating && (
              <div className="mb-4 text-center text-sm text-muted-foreground">
                Validating reset link…
              </div>
            )}

            {!validating && validToken === false && (
              <>
                <Alert className="mb-4 border-destructive/50">
                  <AlertDescription className="text-destructive">
                    {error || "Reset link is invalid or expired."}
                  </AlertDescription>
                </Alert>
                <div className="flex justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/forgot-password")}
                  >
                    Request new link
                  </Button>
                  <Button variant="ghost" onClick={() => navigate("/login")}>
                    Back to Login
                  </Button>
                </div>
              </>
            )}

            {!validating && validToken === true && (
              <>
                <div className="mb-4 text-sm text-muted-foreground">
                  {emailHint ? (
                    <>
                      Resetting password for <strong>{emailHint}</strong>
                    </>
                  ) : (
                    <>Provide a new password for your account.</>
                  )}
                </div>

                {/* ✅ Helpful instructions */}
                <ul className="list-disc list-inside text-xs text-slate-500 mb-4 space-y-1">
                  <li>At least 8 characters</li>
                  <li>Use a mix of letters, numbers, and symbols</li>
                  <li>Do not reuse your old password</li>
                </ul>

                {error && (
                  <Alert className="mb-4 border-destructive/50">
                    <AlertDescription className="text-destructive">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="password">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirm">Confirm Password</Label>
                    <Input
                      id="confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Retype password"
                      required
                      className="mt-1"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Resetting..." : "Reset Password"}
                  </Button>
                </form>
              </>
            )}

            {!validating && validToken === null && (
              <div className="text-sm text-muted-foreground">
                Missing reset token. Use the link in the email or{" "}
                <button
                  onClick={() => navigate("/forgot-password")}
                  className="text-primary hover:underline"
                >
                  request a new link
                </button>
                .
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
