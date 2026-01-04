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
    IndianRupeeIcon as DollarSign,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSessionCheck } from "@/hooks/useSessionCheck";
import logo from "@/assets/sociovia_logo.png";

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
    const [isCollapsed, setIsCollapsed] = useState(false);
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
            {/* Background Ambient Light */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-40">
                <div className="absolute -left-[10%] -top-[10%] h-[50%] w-[50%] rounded-full bg-violet-200/40 blur-[120px]" />
                <div className="absolute -bottom-[10%] -right-[10%] h-[50%] w-[50%] rounded-full bg-blue-200/40 blur-[120px]" />
            </div>

            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{
                    width: isCollapsed ? 80 : 256,
                }}
                className={cn(
                    "fixed inset-y-0 left-0 z-50 border-r border-slate-200 bg-white shadow-sm transition-[width,_transform] duration-300 lg:relative lg:translate-x-0 overflow-hidden",
                    !isMobileMenuOpen && "-translate-x-full lg:translate-x-0"
                )}
                style={{ width: isCollapsed ? 80 : 256 }}
            >
                <div className={cn("flex h-16 items-center px-6 border-b border-slate-100", isCollapsed ? "justify-center px-2" : "")}>
                    <Link to="/" className="flex items-center gap-2 font-bold text-xl overflow-hidden">
                        <div className="h-8 w-8 rounded-lg   flex items-center justify-center text-white shrink-0">
                            <img src={logo} alt="sociovia-logo" />
                        </div>
                        {!isCollapsed && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col leading-none">
                                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">Sociovia</span>
                                <span className="text-[10px] font-normal text-slate-500 uppercase tracking-widest">CRM</span>
                            </motion.div>
                        )}
                    </Link>
                    <button className="ml-auto lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                <div className="flex flex-col justify-between h-[calc(100%-4rem)]">
                    <nav className="flex flex-col gap-2 p-4">
                        {NAV_ITEMS.map((item) => {
                            const isActive = location.pathname === item.path;
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    title={isCollapsed ? item.label : ""}
                                    className={cn(
                                        "group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                                        isActive ? "text-violet-700 bg-violet-50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                                        isCollapsed && "justify-center"
                                    )}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="nav-active"
                                            className="absolute left-0 w-1 h-8 bg-violet-600 rounded-r-full"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.2 }}
                                            style={{ left: '-12px' }} // Position indicator
                                        />
                                    )}
                                    <Icon className={cn("h-5 w-5 transition-colors relative z-10 shrink-0", isActive ? "text-violet-600" : "text-slate-400 group-hover:text-violet-500")} />
                                    {!isCollapsed && (
                                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 whitespace-nowrap">
                                            {item.label}
                                        </motion.span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Collapse Toggle (Desktop only) */}
                    <div className="p-4 hidden lg:flex justify-end border-t border-slate-100">
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            {isCollapsed ? <Menu className="h-5 w-5" /> : <div className="flex items-center gap-2 text-xs font-medium"><span className="uppercase tracking-wider">Collapse</span><Menu className="h-4 w-4" /></div>}
                        </button>
                    </div>
                </div>
            </motion.aside>

            {/* Mobile Header */}
            <div className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center border-b border-white/40 bg-white/80 px-4 backdrop-blur-md lg:hidden">
                <button onClick={() => setIsMobileMenuOpen(true)} className="mr-4 rounded-lg p-2 hover:bg-white/40">
                    <Menu className="h-6 w-6 text-slate-700" />
                </button>
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md   flex items-center justify-center text-white text-xs font-bold"><img src={logo} alt="sociovia-logo" /></div>
                    <span className="font-bold text-slate-900">Sociovia</span>
                </div>
            </div>

            {/* Main Content */}
            <main className="relative flex-1 overflow-y-auto overflow-x-hidden pt-16 lg:pt-0">
                <div className="container mx-auto p-4 lg:p-8 max-w-7xl">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="h-full"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
}
