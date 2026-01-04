import { GlassCard } from "../components/ui/GlassCard";
import { AnimatedButton } from "../components/ui/AnimatedButton";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, Users, DollarSign, Target, MousePointerClick, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { api } from "../api";


// Light Theme Colors (Lavender/Blue/Pink/Emerald)
const COLORS = ["#a78bfa", "#f472b6", "#60a5fa", "#34d399"];

const DATE_PRESETS = [
    { label: "Last 7 Days", value: "7d" },
    { label: "Last 30 Days", value: "30d" },
    { label: "Last Quarter", value: "3m" },
    { label: "Year to Date", value: "ytd" },
];

export default function CRMDashboard() {
    const [dateRange, setDateRange] = useState("30d");
    const [stats, setStats] = useState<any>(null);
    const [areaData, setAreaData] = useState<any[]>([]);
    const [barData, setBarData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleRefresh = () => {
        const cacheKey = `sv_crm_dashboard_${dateRange}`;
        localStorage.removeItem(cacheKey);
        setRefreshTrigger(prev => prev + 1);
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const cacheKey = `sv_crm_dashboard_${dateRange}`;
                const cached = localStorage.getItem(cacheKey);

                // 1. Check Cache
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        const age = Date.now() - parsed.timestamp;
                        if (age < 30 * 60 * 1000) {
                            console.log("Using cached dashboard stats");
                            setStats(parsed.data.stats);
                            setAreaData(parsed.data.areaData || []);
                            setBarData(parsed.data.barData || []);
                            setLoading(false);
                            return;
                        }
                    } catch (e) {
                        console.warn("Cache parse failed", e);
                    }
                }

                // 2. Fetch from Backend
                // Map frontend ID to Meta date_preset
                let preset = "last_30d";
                if (dateRange === "7d") preset = "last_7d";
                if (dateRange === "30d") preset = "last_30d";
                if (dateRange === "3m") preset = "last_90d";
                if (dateRange === "ytd") preset = "last_year"; // or handle differently

                const [campaignsData, revenueData, sourcesData] = await Promise.all([
                    api.getConsolidatedCampaigns({ date_preset: preset }),
                    api.getRevenueChart(dateRange),
                    api.getSourceChart(dateRange)
                ]);

                // Map 'totals' from backend to our 'stats' format
                // Backend returns: { totals: { impressions, clicks, spend, leads, revenue, cpl, roas }, ... }
                const t = campaignsData?.totals || {};

                // We need to calculate 'change' or 'trend' if not provided. 
                // For now, we'll hardcode trends or just show the values since the single endpoint doesn't return comparison data yet.
                // Or we could fetch 'previous period' to calc change, but let's stick to showing values first.

                const newStats = {
                    revenue: { value: `$${(t.revenue || 0).toLocaleString()}`, change: 0, trend: "neutral" },
                    active_leads: { value: (t.leads || 0).toLocaleString(), change: 0, trend: "neutral" },
                    // Let's use ROAS or Spend as another key since we have it
                    conversion_rate: { value: `${(t.roas || 0).toFixed(2)}x`, label: "ROAS", change: 0, trend: "up" },
                    link_clicks: { value: (t.clicks || 0).toLocaleString(), change: 0, trend: "neutral" },
                    spend: { value: `$${(t.spend || 0).toLocaleString()}`, change: 0, trend: "down" }
                };

                setStats(newStats);
                setAreaData(revenueData || []);
                setBarData(sourcesData || []);

                // 3. Save to Cache
                try {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        timestamp: Date.now(),
                        data: {
                            stats: newStats,
                            areaData: revenueData,
                            barData: sourcesData
                        }
                    }));
                } catch (e) { console.warn("Cache save failed", e); }

            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [dateRange, refreshTrigger]);

    if (loading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-slate-500">
                        Real-time insights into your marketing performance.
                    </p>
                </motion.div>

                {/* Date Filter & Actions */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-wrap items-center gap-3"
                >
                    <div className="flex items-center rounded-xl bg-white border border-slate-200 p-1 shadow-sm">
                        {DATE_PRESETS.map((preset) => (
                            <button
                                key={preset.value}
                                onClick={() => setDateRange(preset.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dateRange === preset.value
                                    ? "bg-violet-100 text-violet-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                                    }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    <div className="h-8 w-[1px] bg-slate-300 mx-1 hidden md:block" />

                    <button
                        onClick={handleRefresh}
                        className="p-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-200 shadow-sm transition-all"
                        title="Refresh Dashboard"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-cw"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
                    </button>
                    <AnimatedButton>Download Report</AnimatedButton>
                </motion.div>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[
                    { key: "revenue", label: "Total Revenue", icon: DollarSign, color: "text-emerald-600 bg-emerald-100" },
                    { key: "active_leads", label: "Total Leads", icon: Users, color: "text-blue-600 bg-blue-100" },
                    { key: "conversion_rate", label: "ROAS", icon: Target, color: "text-rose-600 bg-rose-100" }, // Using ROAS from stats
                    { key: "link_clicks", label: "Link Clicks", icon: MousePointerClick, color: "text-violet-600 bg-violet-100" },
                ].map((item, index) => {
                    const stat = stats?.[item.key] || { value: "-", change: 0, trend: "neutral" };
                    return (
                        <GlassCard key={index} className="relative overflow-visible">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">{item.label}</p>
                                    <h3 className="mt-2 text-3xl font-bold text-slate-800">
                                        {stat.value}
                                    </h3>
                                </div>
                                <div className={`rounded-xl p-3 ${item.color}`}>
                                    <item.icon className="h-6 w-6" />
                                </div>
                            </div>
                            <div className={`mt-4 flex items-center gap-2 text-sm ${stat.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {stat.trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                <span className="font-medium">{stat.change > 0 ? "+" : ""}{stat.change}%</span>
                                <span className="text-slate-400">vs previous period</span>
                            </div>
                        </GlassCard>
                    );
                })}
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Main Area Chart */}
                <GlassCard className="col-span-1 lg:col-span-2">
                    <div className="mb-6 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900">Revenue Overview</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Calendar className="h-4 w-4" />
                            <span>Showing data for last {dateRange}</span>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={areaData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#94a3b8"
                                    tick={{ fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    tick={{ fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                        color: '#1e293b'
                                    }}
                                    itemStyle={{ color: '#1e293b' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#8b5cf6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                {/* Source Distribution Bar Chart */}
                <GlassCard>
                    <h3 className="mb-6 text-xl font-bold text-slate-900">Lead Sources</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    stroke="#94a3b8"
                                    tick={{ fill: '#64748b', fontSize: 14 }}
                                    width={70}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {COLORS.map((color, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
