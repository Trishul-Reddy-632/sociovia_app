// src/pages/VerifyEmail.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Shield, RefreshCw } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/sociovia_logo.png";
import { API_ENDPOINT } from "@/config";

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: "",
    code: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Prefill email from location.state, query param, or localStorage
  useEffect(() => {
    const maybeStateEmail = (location.state as any)?.email;
    if (maybeStateEmail) {
      setFormData((f) => ({ ...f, email: String(maybeStateEmail) }));
      return;
    }

    try {
      const params = new URLSearchParams(location.search);
      const qEmail = params.get("email");
      if (qEmail) {
        setFormData((f) => ({ ...f, email: qEmail }));
        return;
      }
    } catch { }

    try {
      const stored = localStorage.getItem("sv_signup_email");
      if (stored) setFormData((f) => ({ ...f, email: stored }));
    } catch { }
  }, [location]);

  // Countdown timer for resend button
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (field: string, value: string) => {
    // allow only code field changes; block email typing by not changing email if field === 'email'
    if (field === "email") {
      // ignore direct edits (because email input is readOnly). Keep this to be explicit.
      return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.email) {
      setError("No email available to verify. Please sign up or go back to the signup page.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_ENDPOINT}/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.success) {
        try {
          // remove temporary signup email if present
          localStorage.removeItem("sv_signup_email");
        } catch { }

        // ---- NEW: store sv_user so UnderReview can poll /api/status?email=... ----
        try {
          localStorage.setItem(
            "sv_user",
            JSON.stringify({ email: formData.email, status: "under_review" })
          );
        } catch (e) {
          // non-fatal; warn in console
          // eslint-disable-next-line no-console
          console.warn("Could not write sv_user to localStorage:", e);
        }
        // -------------------------------------------------------------------

        toast({
          title: "Email verified successfully! ✅",
          description: "Your account is now under review.",
        });
        navigate("/under-review");
      } else {
        setError(result.error || "Invalid verification code or email");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!formData.email) {
      setError("No email available. Please enter your email on the signup page.");
      return;
    }

    setResending(true);
    setError("");

    try {
      const response = await fetch(`${API_ENDPOINT}/resend-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: formData.email }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.success) {
        toast({
          title: "Code resent! 📧",
          description: "Check your email for the new verification code.",
        });
        setCountdown(60);
      } else {
        setError(result.error || "Failed to resend code. Please try again.");
      }
    } catch (err) {
      console.error("Resend error:", err);
      setError("An error occurred while resending code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logo} alt="Sociovia Technologies" className="mx-auto h-16 w-auto mb-4" />
          <h1 className="text-2xl font-bold text-secondary">Verify Your Email</h1>
          <p className="text-muted-foreground">Enter the verification code sent to your email</p>
        </div>

        <Card className="border-2 border-primary/20 shadow-soft">
          <CardHeader className="space-y-1 text-center">
            <div className="w-16 h-16 primary-gradient rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-xl">Check Your Email</CardTitle>
            <CardDescription>
              We've sent a 6-digit verification code to your email address
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert className="mb-4 border-destructive/50">
                <AlertDescription className="text-destructive">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email (pre-filled)"
                    value={formData.email}
                    // make the input non-editable but still selectable/copyable
                    readOnly
                    title="Email is prefilled from signup and cannot be edited here"
                    className="pl-10 bg-muted/5"
                    // keep onChange no-op to ensure no editing
                    onChange={() => { }}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This email was taken from your signup flow and is locked for verification. If this is incorrect, please go back to signup.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="code"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={formData.code}
                    onChange={(e) => handleChange("code", e.target.value)}
                    className="pl-10 text-center text-lg font-mono tracking-wider"
                    maxLength={6}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" variant="cta" disabled={loading || !formData.email}>
                {loading ? "Verifying..." : "Verify Email"}
              </Button>
            </form>

            <div className="mt-6 space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Didn't receive the code?
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResendCode}
                  disabled={resending || countdown > 0 || !formData.email}
                  className="w-full"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${resending ? "animate-spin" : ""}`} />
                  {countdown > 0 ? `Resend in ${countdown}s` : resending ? "Sending..." : "Resend Code"}
                </Button>
              </div>

              <div className="text-center">
                <Link to="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  ← Back to Login
                </Link>
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                🔒 Check your spam folder if you don't see the email. The code expires in 10 minutes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;
