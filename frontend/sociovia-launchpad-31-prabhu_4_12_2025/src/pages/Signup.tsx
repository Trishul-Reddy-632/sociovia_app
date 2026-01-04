import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Mail, Building, Briefcase, Lock, Phone, Eye, EyeOff } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import PhoneOtp from "@/components/PhoneOtp";
import apiClient from "@/lib/apiClient";

type SignupState = {
  name: string;
  email: string;
  phone: string;
  business_name: string;
  industry: string;
  otherIndustry: string;
  password: string;
};

type LoginState = { email: string; password: string };

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"signup" | "login">("signup");
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as any)?.from ?? "/dashboard";

  // --- Signup state ---
  const [signupData, setSignupData] = useState<SignupState>({
    name: "",
    email: "",
    phone: "",
    business_name: "",
    industry: "",
    otherIndustry: "",
    password: "",
  });
  const [signupErrors, setSignupErrors] = useState<string[]>([]);
  const [signupLoading, setSignupLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [registeredPhone, setRegisteredPhone] = useState<string | null>(null);
  const [showPhoneVerify, setShowPhoneVerify] = useState(false);
  const [signupShowPassword, setSignupShowPassword] = useState(false);

  // --- Login state ---
  const remembered = typeof window !== "undefined" ? localStorage.getItem("sv_remember_email") : null;
  const [loginData, setLoginData] = useState<LoginState>({ email: remembered ?? "", password: "" });
  const [loginErrors, setLoginErrors] = useState<string[]>([]);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginShowPassword, setLoginShowPassword] = useState(false);
  const [remember, setRemember] = useState<boolean>(() => !!remembered);

  const emailRef = useRef<HTMLInputElement | null>(null);
  const loginEmailRef = useRef<HTMLInputElement | null>(null);
  const errorLiveRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // autofocus appropriate field
    if (activeTab === "signup") {
      emailRef.current?.focus();
    } else {
      loginEmailRef.current?.focus();
    }
  }, [activeTab]);

  const industries = [
    "Technology",
    "Healthcare",
    "Finance",
    "Retail",
    "Manufacturing",
    "Education",
    "Real Estate",
    "Marketing",
    "Consulting",
    "Other",
  ];

  // small helpers
  const isEmailValid = (email: string) => /^\S+@\S+\.\S+$/.test(email);
  const isPasswordValid = (pwd: string) => pwd.length >= 8;

  // --- handlers ---
  const handleSignupChange = (field: keyof SignupState, value: string) => {
    setSignupData((p) => ({ ...p, [field]: value }));
    setSignupErrors([]);
  };

  const handleLoginChange = (field: keyof LoginState, value: string) => {
    setLoginData((p) => ({ ...p, [field]: value }));
    setLoginErrors([]);
  };

  const persistRememberEmail = (shouldRemember: boolean, email?: string) => {
    try {
      if (shouldRemember && email) localStorage.setItem("sv_remember_email", email);
      else localStorage.removeItem("sv_remember_email");
    } catch { }
  };

  // Phone verified callback (used by PhoneOtp)
  const onPhoneVerified = (userId?: number) => {
    toast({ title: "Phone verified", description: "Thanks — your phone has been verified." });
    if (registeredEmail) navigate("/verify-email", { state: { email: registeredEmail } });
    else navigate(redirectTo);
  };

  // --- Signup submit ---
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupErrors([]);

    if (!isEmailValid(signupData.email)) {
      setSignupErrors(["Please enter a valid email address."]);
      errorLiveRef.current?.focus();
      return;
    }
    if (!isPasswordValid(signupData.password)) {
      setSignupErrors(["Password must be at least 8 characters."]);
      errorLiveRef.current?.focus();
      return;
    }
    if (signupData.industry === "Other" && !signupData.otherIndustry.trim()) {
      setSignupErrors(["Please specify your industry."]);
      return;
    }

    setSignupLoading(true);

    try {
      const payload: any = { ...signupData };
      payload.industry = signupData.industry === "Other" ? signupData.otherIndustry.trim() : signupData.industry;
      delete payload.otherIndustry;

      const res = await apiClient.post("/signup", payload);
      const result = res.data || {};

      if (res.ok && result.success) {
        let token = result.token;

        // If no token in body, check headers
        if (!token && res.headers) {
          const authHeader = res.headers['authorization'] || res.headers['x-auth-token'];
          if (authHeader) {
            token = authHeader.replace(/^Bearer\s+/i, "");
          }
        }

        if (token) {
          try { localStorage.setItem("sv_token", token); } catch { }
        }

        if (result.user_id || result.user?.id) {
          try { localStorage.setItem("sv_user_id", String(result.user_id || result.user.id)); } catch { }
        }

        try { localStorage.setItem("sv_signup_email", signupData.email); } catch { }
        toast({ title: "Account created successfully! 🎉", description: "Please check your email for verification code (or verify by phone below if provided)." });

        setRegisteredEmail(signupData.email || null);
        setRegisteredPhone(signupData.phone?.trim() ? signupData.phone.trim() : null);

        if (signupData.phone && signupData.phone.trim()) {
          setShowPhoneVerify(true);
          return; // wait for phone verification inline
        }

        navigate("/verify-email", { state: { email: signupData.email } });
      } else {
        const errs = Array.isArray(result.errors) ? result.errors : result.error ? [result.error] : res.error ? [res.error.message || "Something went wrong"] : ["Something went wrong"];
        setSignupErrors(errs);
        errorLiveRef.current?.focus();
      }
    } catch (err) {
      console.error("Signup error:", err);
      setSignupErrors(["An error occurred. Please try again."]);
      errorLiveRef.current?.focus();
    } finally {
      setSignupLoading(false);
    }
  };

  // --- Login submit ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors([]);

    if (!isEmailValid(loginData.email)) {
      setLoginErrors(["Please enter a valid email address."]);
      errorLiveRef.current?.focus();
      return;
    }
    if (!isPasswordValid(loginData.password)) {
      setLoginErrors(["Password must be at least 8 characters."]);
      errorLiveRef.current?.focus();
      return;
    }

    setLoginLoading(true);

    try {
      const res = await apiClient.post("/login", { email: loginData.email, password: loginData.password });
      const result = res.data || {};

      // handle special statuses
      if (res.status === 403 && result?.status === "under_review") {
        toast({ title: "Account under review", description: "Your account is being reviewed." });
        navigate("/under-review");
        return;
      }
      if (res.status === 403 && result?.status === "pending_verification") {
        toast({ title: "Email verification required", description: "Please verify your email to continue." });
        navigate("/verify-email");
        return;
      }

      if (!res.ok) {
        const errs = Array.isArray(result.errors) ? result.errors : result.error ? [result.error] : res.error ? [res.error.message || "Invalid credentials"] : ["Invalid credentials"];
        setLoginErrors(errs);
        errorLiveRef.current?.focus();
        return;
      }

      // 1. Store Token (if present)
      let token = result?.token;

      // If no token in body, check headers
      if (!token && res.headers) {
        // Check common header names (case-insensitive usually, but using lowercase here from our map)
        const authHeader = res.headers['authorization'] || res.headers['x-auth-token'];
        if (authHeader) {
          // Extract "Bearer <token>" if present
          token = authHeader.replace(/^Bearer\s+/i, "");
        }
      }

      if (token) {
        try { localStorage.setItem("sv_token", token); } catch { }
      }

      // 2. Store User ID immediately (crucial for X-User-Id header in subsequent requests)
      const loginUser = result?.user;
      if (loginUser) {
        try {
          localStorage.setItem("sv_user", JSON.stringify(loginUser));
          if (loginUser.id) {
            localStorage.setItem("sv_user_id", String(loginUser.id));
          }
        } catch { }
      }

      // 3. Fetch /me to get canonical user details
      let me = null;
      try {
        const meResp = await apiClient.get("/me");
        if (meResp.ok) {
          me = meResp.data?.user ?? meResp.data;
        }
      } catch (err) {
        console.debug("/me failed after login:", err);
      }

      // fallback to login response user
      const user = me ?? loginUser ?? null;
      if (!user) {
        setLoginErrors(["Failed to establish session after login. Please try again."]);
        errorLiveRef.current?.focus();
        return;
      }

      // Update stored user if /me provided more recent data
      if (me) {
        try {
          localStorage.setItem("sv_user", JSON.stringify(me));
          if (me.id) localStorage.setItem("sv_user_id", String(me.id));
        } catch { }
      }

      persistRememberEmail(remember, loginData.email);

      toast({ title: "Welcome back! 🎉", description: `Signed in as ${user.name || user.email}` });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      setLoginErrors(["An error occurred. Please try again."]);
      errorLiveRef.current?.focus();
    } finally {
      setLoginLoading(false);
    }
  };

  // Reusable errors list
  const ErrorsList = ({ errors }: { errors: string[] }) => (
    <Alert className="mb-4 border-destructive/50" role="alert" aria-live="polite">
      <AlertDescription>
        <ul className="list-disc list-inside space-y-1">
          {errors.map((err, i) => <li key={i} className="text-sm">{err}</li>)}
        </ul>
      </AlertDescription>
    </Alert>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/90 to-background p-4">
      <div className="w-full max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Left promotional / branding column */}
          <div className="hidden md:flex flex-col items-start justify-center p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 shadow-lg">
            <img src={logo} alt="Sociovia" className="h-14 mb-4" />
            <h2 className="text-3xl font-extrabold mb-2 text-secondary">Sociovia</h2>
            <p className="text-muted-foreground mb-4">Smart social ad automation, analytics and collaboration for teams.</p>
            <ul className="space-y-2 text-sm">
              <li>• Campaign builder with AI copy suggestions</li>
              <li>• Real-time performance dashboards</li>
              <li>• Team roles & approvals</li>
            </ul>
          </div>

          {/* Auth card */}
          <Card className="border-2 border-primary/10 shadow-soft">
            <CardHeader className="flex items-center justify-between p-4">
              <div>
                <CardTitle className="text-lg">{activeTab === "signup" ? "Create account" : "Welcome back"}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">{activeTab === "signup" ? "Sign up to get started" : "Sign in to your account"}</CardDescription>
              </div>

              <div className="flex space-x-2 bg-muted p-1 rounded-full">
                <button
                  className={`px-3 py-1 rounded-full text-sm ${activeTab === "signup" ? "bg-white shadow" : "text-muted-foreground"}`}
                  onClick={() => setActiveTab("signup")}
                >
                  Sign up
                </button>
                <button
                  className={`px-3 py-1 rounded-full text-sm ${activeTab === "login" ? "bg-white shadow" : "text-muted-foreground"}`}
                  onClick={() => setActiveTab("login")}
                >
                  Login
                </button>
              </div>
            </CardHeader>

            <CardContent>
              {activeTab === "signup" ? (
                <div>
                  {signupErrors.length > 0 && <ErrorsList errors={signupErrors} />}

                  {showPhoneVerify ? (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground mb-2">We sent an OTP to <strong>{registeredPhone}</strong>. Enter the code below to verify your phone.</div>
                      <PhoneOtp initialPhone={registeredPhone ?? ""} onVerified={(userId) => onPhoneVerified(userId)} />
                      <div className="mt-4 text-center text-sm"><p className="text-muted-foreground">Didn't receive SMS? <button className="text-primary underline" onClick={() => { setShowPhoneVerify(false); setRegisteredPhone(null); }}>Edit phone</button></p></div>
                    </div>
                  ) : (
                    <form onSubmit={handleSignupSubmit} className="space-y-4" noValidate>
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="name" type="text" placeholder="Enter your full name" value={signupData.name} onChange={(e) => handleSignupChange("name", e.target.value)} className="pl-10" required ref={emailRef as any} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="email" type="email" placeholder="Enter your email" value={signupData.email} onChange={(e) => handleSignupChange("email", e.target.value)} className="pl-10" required />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="phone" type="tel" placeholder="+9198xxxx..." value={signupData.phone} onChange={(e) => handleSignupChange("phone", e.target.value)} className="pl-10" />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="business_name">Business Name</Label>
                          <div className="relative">
                            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="business_name" type="text" placeholder="Enter your business name" value={signupData.business_name} onChange={(e) => handleSignupChange("business_name", e.target.value)} className="pl-10" required />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="industry">Industry</Label>
                          <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                            <Select value={signupData.industry} onValueChange={(v) => handleSignupChange("industry", v)}>
                              <SelectTrigger className="pl-10"><SelectValue placeholder="Select your industry" /></SelectTrigger>
                              <SelectContent>
                                {industries.map((it) => <SelectItem key={it} value={it}>{it}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>

                          {signupData.industry === "Other" && (
                            <div className="mt-2">
                              <Label htmlFor="otherIndustry" className="text-xs">Please specify your industry</Label>
                              <Input id="otherIndustry" type="text" placeholder="e.g. Aerospace, Agritech..." value={signupData.otherIndustry} onChange={(e) => handleSignupChange("otherIndustry", e.target.value)} required />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="password" type={signupShowPassword ? "text" : "password"} placeholder="Create a password (min 8 characters)" value={signupData.password} onChange={(e) => handleSignupChange("password", e.target.value)} className="pl-10 pr-10" minLength={8} required />
                          <button type="button" aria-label={signupShowPassword ? "Hide password" : "Show password"} onClick={() => setSignupShowPassword((s) => !s)} className="absolute right-3 top-1/2 transform -translate-y-1/2 rounded p-1">
                            {signupShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <Button type="submit" className="w-full" variant="cta" disabled={signupLoading || !isEmailValid(signupData.email) || !isPasswordValid(signupData.password)}>{signupLoading ? "Creating Account..." : "Create Account"}</Button>
                    </form>
                  )}
                </div>
              ) : (
                <div>
                  {loginErrors.length > 0 && <ErrorsList errors={loginErrors} />}

                  <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
                    <div className="space-y-2">
                      <Label htmlFor="login_email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="login_email" ref={loginEmailRef} type="email" placeholder="Enter your email" value={loginData.email} onChange={(e) => handleLoginChange("email", e.target.value)} className="pl-10" required />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login_password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="login_password" type={loginShowPassword ? "text" : "password"} placeholder="Your password" value={loginData.password} onChange={(e) => handleLoginChange("password", e.target.value)} className="pl-10 pr-10" required />
                        <button type="button" aria-label={loginShowPassword ? "Hide password" : "Show password"} onClick={() => setLoginShowPassword((s) => !s)} className="absolute right-3 top-1/2 transform -translate-y-1/2 rounded p-1">
                          {loginShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="inline-flex items-center text-sm space-x-2">
                        <input type="checkbox" checked={remember} onChange={(e) => { setRemember(e.target.checked); if (!e.target.checked) persistRememberEmail(false); }} className="form-checkbox h-4 w-4 rounded border-muted-foreground" />
                        <span className="text-sm">Remember me</span>
                      </label>

                      <div className="text-sm">
                        <button type="button" className="underline text-sm text-muted-foreground" onClick={() => navigate("/forgot-password")}>Forgot password?</button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full" variant="cta" disabled={loginLoading || !isEmailValid(loginData.email) || !isPasswordValid(loginData.password)}>{loginLoading ? "Signing in..." : "Sign in"}</Button>

                    <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                      <button type="button" className="underline" onClick={() => navigate("/forgot-password")}>Forgot password?</button>
                      <button type="button" className="text-primary underline" onClick={() => { setActiveTab("signup"); }}>Create account</button>
                    </div>

                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
