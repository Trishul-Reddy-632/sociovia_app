
import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    ShieldAlert,
    Settings,
    Lock,
    LifeBuoy,
    LogOut,
    ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function OptimizationLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { label: 'Live Dashboard', path: '/optimization/dashboard', icon: LayoutDashboard },
        { label: 'Risk Control', path: '/optimization/risk', icon: ShieldAlert },
        { label: 'Privacy & Policy', path: '/optimization/privacy', icon: Lock },
        { label: 'Settings', path: '/optimization/settings', icon: Settings },
        { label: 'Support', path: '/optimization/support', icon: LifeBuoy },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <motion.aside
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="w-64 bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-30 flex flex-col"
            >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="font-bold text-xl tracking-tight text-slate-900">
                        <span className="text-blue-600">Opti</span>Guard
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="h-8 w-8 text-slate-400 hover:text-slate-700">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                    ${isActive
                                        ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                 `}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                {item.label}
                            </NavLink>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3 p-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                            AI
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-medium text-slate-700">System Active</div>
                            <div className="text-[10px] text-emerald-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Monitored
                            </div>
                        </div>
                    </div>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8 relative">
                {/* Top decorative gradient */}
                <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-white to-transparent pointer-events-none" />

                <div className="relative z-10">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
