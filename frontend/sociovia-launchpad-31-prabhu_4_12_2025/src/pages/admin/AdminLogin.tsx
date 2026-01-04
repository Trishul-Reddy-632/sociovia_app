import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Lock, Shield, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import { GlassCard } from "@/crm/components/ui/GlassCard"; // Using absolute alias if possible or fallback
import { API_ENDPOINT } from "@/config";

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_ENDPOINT}/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Access Granted",
          description: "Welcome back, Administrator.",
          className: "bg-emerald-50 border-emerald-200 text-emerald-800"
        });
        navigate("/admin/review");
      } else {
        setError(data.error || "Invalid credentials provided.");
      }
    } catch (error) {
      console.error("Admin login error:", error);
      setError("Connection failed. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
      {/* Ambient Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-violet-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-200/40 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <GlassCard className="border-t-4 border-t-violet-500 shadow-2xl">
          <div className="text-center mb-8 pt-4">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full"></div>
              <img src={logo} alt="Sociovia" className="h-14 w-auto relative z-10" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Portal</h1>
            <p className="text-slate-500 text-sm mt-1">Secure authentication required</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
              <Shield className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-semibold text-xs uppercase tracking-wide">
                Admin Email
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@sociovia.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="pl-10 h-11 bg-white/50 border-slate-200 focus:border-violet-500 focus:ring-violet-500/20 transition-all rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-semibold text-xs uppercase tracking-wide">
                Password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="pl-10 h-11 bg-white/50 border-slate-200 focus:border-violet-500 focus:ring-violet-500/20 transition-all rounded-xl"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 transition-all active:scale-[0.98] mt-2 group"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Authenticate <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1.5">
              <Lock className="h-3 w-3" />
              Use authorized credentials only.
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default AdminLogin;
