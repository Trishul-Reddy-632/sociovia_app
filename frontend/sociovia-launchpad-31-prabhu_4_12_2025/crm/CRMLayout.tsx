import { Link, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Megaphone,
    Users,
    Contact2,
    CheckSquare,
    Settings,
    Menu,
    X,
    DollarSign,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSessionCheck } from "@/hooks/useSessionCheck";

const NAV_ITEMS = [
    { label: "Dashboard", path: "/crm/dashboard", icon: LayoutDashboard },
    { label: "Campaigns", path: "/crm/campaigns", icon: Megaphone },
    { label: "Leads", path: "/crm/leads", icon: Users },
    { label: "Deals", path: "/crm/deals", icon: DollarSign },
    { label: "Contacts", path: "/crm/contacts", icon: Contact2 },
    { label: "Tasks", path: "/crm/tasks", icon: CheckSquare },
    { label: "Settings", path: "/crm/settings", icon: Settings },
];

export default function CRMLayout() {
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { loading } = useSessionCheck();

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#F1F5F9]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
                    <p className="font-medium text-slate-500">Verifying session...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#F1F5F9] text-slate-900 selection:bg-violet-200">
            {/* Background Ambient Light - Subtle Pastel */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                <div className="absolute -left-[10%] -top-[10%] h-[50%] w-[50%] rounded-full bg-violet-200/40 blur-[120px]" />
                <div className="absolute -bottom-[10%] -right-[10%] h-[50%] w-[50%] rounded-full bg-blue-200/40 blur-[120px]" />
            </div>

            {/* Sidebar - Light Mode */}
            <motion.aside
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 border-r border-white/60 bg-white/50 backdrop-blur-xl transition-transform lg:relative lg:translate-x-0",
                    !isMobileMenuOpen && "-translate-x-full"
                )}
            >
                <div className="flex h-16 items-center border-b border-white/40 px-6">
                    <Link to="/" className="flex items-center gap-2 font-bold text-xl">
                        <span className="bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
                            Sociovia
                        </span>
                        <span className="text-xs font-normal text-slate-500">CRM</span>
                    </Link>
                    <button
                        className="ml-auto lg:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                <nav className="flex flex-col gap-2 p-4">
                    {NAV_ITEMS.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                    "group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                                    isActive
                                        ? "text-violet-700"
                                        : "text-slate-500 hover:bg-white/60 hover:text-slate-900"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-active"
                                        className="absolute inset-0 rounded-xl bg-violet-100/80 shadow-sm"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <Icon
                                    className={cn(
                                        "h-5 w-5 transition-colors relative z-10",
                                        isActive ? "text-violet-600" : "text-slate-400 group-hover:text-violet-500"
                                    )}
                                />
                                <span className="relative z-10">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </motion.aside>

            {/* Mobile Header */}
            <div className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center border-b border-white/40 bg-white/60 px-4 backdrop-blur-md lg:hidden">
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="mr-4 rounded-lg p-2 hover:bg-white/40"
                >
                    <Menu className="h-6 w-6 text-slate-700" />
                </button>
                <span className="font-bold text-slate-900">Sociovia CRM</span>
            </div>

            {/* Main Content */}
            <main className="relative flex-1 overflow-y-auto overflow-x-hidden pt-16 lg:pt-0">
                <div className="container mx-auto p-4 lg:p-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 10, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.99 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="h-full"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
