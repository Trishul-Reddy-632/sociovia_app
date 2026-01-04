import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    BarChart3,
    Users,
    CreditCard,
    Settings,
    LogOut,
    Menu,
    X,
    ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navItems = [
        { path: "/admin/review", label: "Overview", icon: LayoutDashboard },
        { path: "/admin/analytics", label: "System Analytics", icon: BarChart3 },
        { path: "/admin/users", label: "User Management", icon: Users },
        { path: "/admin/pricing", label: "Plans & Pricing", icon: CreditCard },
    ];

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex selection:bg-indigo-100 selection:text-indigo-900">
            {/* Desktop Sidebar - Premium Light Theme */}
            <aside className="hidden md:flex w-72 flex-col bg-white/80 backdrop-blur-xl border-r border-slate-200/60 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] fixed h-full z-30">
                <div className="p-8 pb-6 flex items-center gap-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="font-bold text-xl tracking-tight text-slate-900">Admin Portal</h1>
                        <p className="text-xs font-medium text-slate-500">Sociovia System</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
                    {navItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={cn(
                                "w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 group relative overflow-hidden",
                                isActive(item.path)
                                    ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10"
                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                            )}
                        >
                            {/* Active State Accent */}
                            {isActive(item.path) && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl" />
                            )}

                            <item.icon className={cn(
                                "h-5 w-5 transition-colors",
                                isActive(item.path) ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-600"
                            )} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50 gap-3 font-medium transition-all"
                        onClick={() => navigate("/admin/login")}
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full bg-white/90 backdrop-blur border-b border-slate-200 z-30 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-slate-900">Admin Portal</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600 hover:bg-slate-100">
                    {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 bg-white z-20 pt-20 px-6 pb-6 md:hidden flex flex-col gap-2"
                    >
                        {navItems.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => {
                                    navigate(item.path);
                                    setIsMobileMenuOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-lg font-bold transition-all shadow-sm border",
                                    isActive(item.path)
                                        ? "bg-slate-900 border-slate-900 text-white"
                                        : "bg-white border-slate-100 text-slate-500"
                                )}
                            >
                                <item.icon className={cn("h-6 w-6", isActive(item.path) ? "text-indigo-400" : "text-slate-400")} />
                                {item.label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <main className="flex-1 md:ml-72 p-6 md:p-12 md:pt-10 pt-24 overflow-y-auto w-full max-w-[100vw] overflow-x-hidden relative">
                <div className="max-w-7xl mx-auto space-y-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
