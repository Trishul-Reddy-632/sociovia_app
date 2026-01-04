import { useEffect, useState } from "react";
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
import { Mail, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/sociovia_logo.png";

// Use env var or fallback
const API_BASE = `${(import.meta.env.VITE_API_BASE || "").replace(/\/$/, "")}/api`;

type FormState = { email: string; password: string };
type UserLite = { id: number; name: string; email: string; status?: string };

const Login = () => {
  const [formData, setFormData] = useState<FormState>({ email: "", password: "" });
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false); // NEW: gate rendering until check completes
  const { toast } = useToast();
  const navigate = useNavigate();

  // On mount: check session (do not render login UI until this completes)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem("sv_token");
        const headers: Record<string, string> = { "Accept": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const resp = await fetch(`${API_BASE}/me`, {
          method: "GET",
          credentials: "include",
          headers,
        });

        if (!mounted) return;

        if (resp.ok) {
          const json = await resp.json().catch(() => null);
          const user = json?.user ?? json;
          if (user?.id) {
            // store minimal UI state and redirect
            try { localStorage.setItem("sv_user", JSON.stringify(user)); } catch { }
            navigate("/dashboard");
            return;
          }
        }
        // if not ok -> continue to show login UI
      } catch (err) {
        // network error -> still show login UI so user can attempt login
        // log to console for debugging
        console.error("Session check failed:", err);
      } finally {
        if (mounted) setSessionChecked(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1) Attempt login (cookie-based session expected)
      const loginResp = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });

      const loginData = await loginResp.json().catch(() => ({}));

      // Handle blocked statuses (frontend routing)
      if (loginResp.status === 403 && loginData?.status === "under_review") {
        toast({ title: "Account under review", description: "Your account is still being reviewed." });
        navigate("/under-review");
        return;
      }
      if (loginResp.status === 403 && loginData?.status === "pending_verification") {
        toast({ title: "Email verification required", description: "Please verify your email to continue." });
        navigate("/verify-email");
        return;
      }

      if (loginData?.token) {
        try { localStorage.setItem("sv_token", loginData.token); } catch { }
      }

      if (!loginResp.ok) {
        const msg =
          loginData?.error || (loginData?.errors ? (loginData.errors as string[]).join(", ") : "Invalid email or password");
        setError(msg);
        return;
      }

      // 2) Try to fetch authoritative /me (session-backed)
      let meUser: UserLite | null = null;
      try {
        const token = loginData.token || localStorage.getItem("sv_token");
        const headers: Record<string, string> = { "Accept": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const meResp = await fetch(`${API_BASE}/me`, {
          method: "GET",
          credentials: "include",
          headers,
        });

        if (meResp.ok) {
          const meJson = await meResp.json();
          if (meJson?.success && meJson.user) {
            meUser = {
              id: meJson.user.id,
              name: meJson.user.name,
              email: meJson.user.email,
              status: meJson.user.status,
            };
          } else if (meJson?.id) {
            // some backends return user object directly
            meUser = { id: meJson.id, name: meJson.name, email: meJson.email, status: meJson.status };
          }
        } else {
          // If /me returns 401 but login returned ok, we may be in cross-site cookie dev issue.
          // Fall back to login response's user payload if present.
          console.warn("/me returned", meResp.status);
        }
      } catch (err) {
        console.error("Failed to call /me after login:", err);
      }

      // If /me failed, but server included a user in the login response, fall back to it.
      // This handles incognito mode / mobile browsers where cookies don't work
      if (!meUser && loginData?.user) {
        meUser = {
          id: loginData.user.id,
          name: loginData.user.name,
          email: loginData.user.email,
          status: loginData.user.status,
        };
        // Store user_id for header-based auth fallback
        try {
          localStorage.setItem("sv_user_id", String(loginData.user.id));
        } catch { }
        console.info("Using login response user data (session cookie may not be working)");
      }

      if (!meUser) {
        setError("Failed to establish session after login. Please check your browser settings (cookies) or try again.");
        return;
      }

      // persist small non-sensitive UI state only
      try { localStorage.setItem("sv_user", JSON.stringify(meUser)); } catch { }

      toast({ title: "Welcome back! 🎉", description: "Successfully logged in." });
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
      setSessionChecked(true); // ensure UI unlocked if it was blocked
    }
  };

  // while session check is in progress, show a loader and don't render the login form
  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div
            aria-hidden
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "6px solid rgba(0,0,0,0.06)",
              borderTopColor: "rgba(59,130,246,1)",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <h2 className="text-lg font-semibold">Checking session…</h2>
          <p className="text-sm text-muted-foreground mt-2">We are verifying your login status.</p>
          <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  // sessionChecked === true -> render login UI
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={logo} alt="Sociovia Technologies" className="mx-auto h-16 w-auto mb-4" />
          <h1 className="text-2xl font-bold text-secondary">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        <Card className="border-2 border-primary/20 shadow-soft">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">Enter your credentials to access your account</CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert className="mb-4 border-destructive/50">
                <AlertDescription className="text-destructive">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>

                <div className="text-right">
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">Forgot Password?</Link>
                </div>
              </div>

              <Button type="submit" className="w-full" variant="cta" disabled={loading}>
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link to="/signup" className="text-primary hover:underline font-medium">Create one</Link>
                </p>
              </div>

              <div className="text-center">
                <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">← Back to Home</Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
