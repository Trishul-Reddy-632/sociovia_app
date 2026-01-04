import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
  Building2,
  Briefcase,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Search,
  RefreshCw,
  UserCheck,
  ChevronRight,
  ArrowUpRight,
  MoreHorizontal
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { GlassCard } from "@/crm/components/ui/GlassCard";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { API_BASE_URL } from "@/config";

type PendingUser = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  business_name?: string;
  industry?: string;
  created_at: string;
  status: string;
  rejection_reason?: string | null;
};

const API_BASE = API_BASE_URL;

function timeAgo(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return Math.floor(seconds) + "s ago";
}

export default function AdminReview(): JSX.Element {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [selectedUserIdForReject, setSelectedUserIdForReject] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loadingIds, setLoadingIds] = useState<number[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'pending' | 'recent'>('pending');

  const navigate = useNavigate();
  const { toast } = useToast();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    fetchPendingUsers();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isLoading = (id: number) => loadingIds.includes(id);
  const setLoadingFor = (id: number, on: boolean) => {
    setLoadingIds((prev) => (on ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)));
  };

  const fetchPendingUsers = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`${API_BASE.replace(/\/$/, "")}/api/admin/review`, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@sociovia.com", password: "admin123" }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setPendingUsers(data.users || []);
      } else {
        if (res.status === 401 || res.status === 403) navigate("/admin/login");
        toast({ title: "Access Denied", description: "Please login again.", variant: "destructive" });
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast({ title: "Network Error", description: "Could not fetch users.", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleApprove = async (userId: number) => {
    setLoadingFor(userId, true);
    try {
      const res = await fetch(`${API_BASE.replace(/\/$/, "")}/api/admin/approve/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@sociovia.com", password: "admin123" }),
      });

      if (res.ok) {
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
        toast({ title: "User Approved", description: "Access granted successfully.", className: "bg-emerald-50 text-emerald-800 border-emerald-200" });
      } else {
        toast({ title: "Action Failed", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setLoadingFor(userId, false);
    }
  };

  const handleReject = async (userId: number) => {
    if (!rejectionReason.trim()) return;
    setLoadingFor(userId, true);
    try {
      const res = await fetch(`${API_BASE.replace(/\/$/, "")}/api/admin/reject/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@sociovia.com", password: "admin123", reason: rejectionReason }),
      });

      if (res.ok) {
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
        setSelectedUserIdForReject(null);
        setRejectionReason("");
        toast({ title: "User Rejected", description: "Notification sent." });
      } else {
        toast({ title: "Action Failed", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setLoadingFor(userId, false);
    }
  };

  const filteredUsers = pendingUsers.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.business_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/50 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-violet-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-100/30 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-slate-900/20">
                Admin Portal
              </div>
              <span className="text-sm font-medium text-slate-500">v2.4.0</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Access Control</h1>
            <p className="text-slate-500 font-medium mt-1">Manage new account requests and permissions.</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-4">
              <span className="text-sm font-bold text-slate-900">Administrator</span>
              <span className="text-xs text-slate-400">admin@sociovia.com</span>
            </div>
            <Button
              variant="white"
              size="lg"
              onClick={() => navigate("/admin/login")}
              className="bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-200 shadow-sm transition-all"
            >
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </header>

        {/* Dashboard Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <GlassCard className="p-6 relative overflow-hidden border-t-4 border-t-violet-500">
            <div className="absolute right-0 top-0 p-32 bg-violet-500/5 rounded-full blur-3xl" />
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1">Pending Requests</p>
                <h2 className="text-4xl font-black text-slate-900">{pendingUsers.length}</h2>
              </div>
              <div className="p-3 bg-violet-100 text-violet-600 rounded-2xl shadow-sm">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-violet-600 bg-violet-50/50 py-1 px-2 rounded-lg w-fit">
              <Clock className="h-3 w-3" />
              <span>Verify within 24h</span>
            </div>
          </GlassCard>

          <GlassCard className="p-6 border-t-4 border-t-emerald-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1">System Health</p>
                <h2 className="text-4xl font-black text-slate-900">100%</h2>
              </div>
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl shadow-sm">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50/50 py-1 px-2 rounded-lg w-fit">
              <CheckCircle2 className="h-3 w-3" />
              <span>All systems operational</span>
            </div>
          </GlassCard>

          <GlassCard className="p-6 border-t-4 border-t-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1">Total Users</p>
                <h2 className="text-4xl font-black text-slate-900">--</h2>
              </div>
              <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-sm">
                <LayoutDashboard className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50/50 py-1 px-2 rounded-lg w-fit">
              <ArrowUpRight className="h-3 w-3" />
              <span>+12% this month</span>
            </div>
          </GlassCard>
        </div>

        {/* Main Content Actions */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'pending' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Pending
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'recent' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Recent Activity
            </button>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search users..."
                className="pl-10 h-10 bg-white border-slate-200 rounded-xl focus:ring-slate-900/20"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchPendingUsers} disabled={isRefreshing} className="bg-white h-10 w-10 rounded-xl border-slate-200">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-slate-900' : 'text-slate-500'}`} />
            </Button>
          </div>
        </div>

        {/* List View */}
        <AnimatePresence mode="wait">
          {filteredUsers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/60 backdrop-blur-sm border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center"
            >
              <div className="mx-auto w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <UserCheck className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">All Clear!</h3>
              <p className="text-slate-500 max-w-sm mx-auto mt-2">There are no pending user requests at the moment. Great job keeping up.</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredUsers.map((user, i) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <GlassCard className="group p-0 overflow-hidden hover:shadow-xl hover:scale-[1.005] transition-all duration-300 border-l-4 border-l-slate-200 hover:border-l-indigo-500">
                    <div className="flex flex-col h-full">
                      {/* User Info Section */}
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-5">
                            <div className="relative">
                              <Avatar className="h-16 w-16 border-4 border-white shadow-lg shadow-slate-200/50">
                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} />
                                <AvatarFallback className="bg-slate-900 text-white font-bold text-xl">{user.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${user.status === 'pending' ? 'bg-amber-400' : 'bg-emerald-500'} shadow-sm`} />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-slate-900 leading-tight">{user.name}</h3>
                              <div className="flex items-center gap-2 text-sm text-slate-500 font-medium mt-1">
                                <Mail className="h-3.5 w-3.5" /> {user.email}
                              </div>
                            </div>
                          </div>
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200/60 px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-sm h-fit">
                            {user.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">Company</label>
                            <div className="font-semibold text-slate-700 flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm overflow-hidden">
                              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{user.business_name || "N/A"}</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">Industry</label>
                            <div className="font-semibold text-slate-700 flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm overflow-hidden">
                              <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{user.industry || "N/A"}</span>
                            </div>
                          </div>
                          <div className="col-span-1 sm:col-span-2 flex items-center gap-2 text-xs text-slate-400 px-1 mt-1">
                            <Clock className="h-3 w-3" />
                            Request received <span className="font-semibold text-slate-600">{timeAgo(user.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Footer */}
                      <div className="bg-slate-50/80 backdrop-blur-md border-t border-slate-100 p-4 flex flex-col sm:flex-row items-center gap-3">
                        <Dialog open={selectedUserIdForReject === user.id} onOpenChange={(open) => setSelectedUserIdForReject(open ? user.id : null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full sm:w-auto flex-1 border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all font-semibold h-11"
                              disabled={isLoading(user.id)}
                            >
                              Reject Request
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-600">
                                <XCircle className="h-5 w-5" /> Reject Application
                              </DialogTitle>
                            </DialogHeader>
                            <div className="py-4">
                              <p className="text-sm text-slate-500 mb-4">Please provide a reason to notify <span className="font-bold text-slate-900">{user.name}</span> why their request was declined.</p>
                              <Textarea
                                placeholder="e.g. Incomplete business verification details..."
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                className="min-h-[120px] resize-none focus:border-red-500 focus:ring-red-500/20"
                              />
                            </div>
                            <DialogFooter>
                              <Button variant="ghost" onClick={() => setSelectedUserIdForReject(null)}>Cancel</Button>
                              <Button variant="destructive" onClick={() => handleReject(user.id)} className="bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/20">Confirm Rejection</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Button
                          className="w-full sm:w-auto flex-[2] bg-gradient-to-r from-slate-900 to-slate-800 hover:from-emerald-600 hover:to-emerald-500 text-white shadow-lg shadow-slate-900/10 hover:shadow-emerald-500/25 transition-all duration-300 transform hover:-translate-y-0.5 group h-11 font-bold"
                          onClick={() => handleApprove(user.id)}
                          disabled={isLoading(user.id)}
                        >
                          {isLoading(user.id) ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>Approve Access <CheckCircle2 className="ml-2 h-4 w-4 group-hover:scale-110 transition-transform" /></>
                          )}
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
