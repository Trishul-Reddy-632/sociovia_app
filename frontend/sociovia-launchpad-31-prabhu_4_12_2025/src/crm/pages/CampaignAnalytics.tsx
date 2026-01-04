"use-client"
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Download, TrendingUp, Users, Smartphone, Globe, MousePointerClick } from "lucide-react";
import { api } from "../api";
import { GlassCard } from "../components/ui/GlassCard";
import { AnimatedButton } from "../components/ui/AnimatedButton";

// Mock data for visual placeholder until backend supports time-series
const MOCK_TIME_SERIES = [
    { date: 'Mon', spend: 400, revenue: 1200 },
    { date: 'Tue', spend: 300, revenue: 900 },
    { date: 'Wed', spend: 550, revenue: 2100 },
    { date: 'Thu', spend: 450, revenue: 1400 },
    { date: 'Fri', spend: 600, revenue: 2400 },
    { date: 'Sat', spend: 700, revenue: 2900 },
    { date: 'Sun', spend: 650, revenue: 2300 },
];

export default function CampaignAnalytics() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState("last_30d");
    const [insights, setInsights] = useState<any>(null);
    const [trend, setTrend] = useState<any[]>([]);

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleRefresh = () => {
        // Clear specific cache
        const cacheKey = `sv_analytics_${id}_${dateRange}`;
        localStorage.removeItem(cacheKey);
        // Trigger re-fetch
        setRefreshTrigger(prev => prev + 1);
    };

    useEffect(() => {
        if (!id) return;
        const fetchInsights = async () => {
            setLoading(true);
            try {
                const cacheKey = `sv_analytics_${id}_${dateRange}`;
                const cached = localStorage.getItem(cacheKey);

                // 1. Check Cache
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        const age = Date.now() - parsed.timestamp;
                        // 30 minutes cache validity
                        if (age < 30 * 60 * 1000) {
                            console.log("Using cached campaign analytics");
                            setInsights(parsed.data.insights || {});
                            setTrend(parsed.data.trend || []);
                            setLoading(false);
                            return;
                        }
                    } catch (e) {
                        console.warn("Cache parse failed, refetching", e);
                    }
                }

                // 2. Fetch from Backend if no cache or expired
                // Backend: GET /api/campaigns/:id/insights?date_preset=...
                const res = await api.getCampaignInsights(id, dateRange);
                setInsights(res.insights || {});
                setTrend(res.trend || []);

                // 3. Save to Cache
                try {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        timestamp: Date.now(),
                        data: {
                            insights: res.insights,
                            trend: res.trend
                        }
                    }));
                } catch (e) {
                    console.warn("Failed to save to cache", e);
                }

            } catch (error) {
                console.error("Failed to fetch insights", error);
            } finally {
                setLoading(false);
            }
        };
        fetchInsights();
    }, [id, dateRange, refreshTrigger]);

    if (loading) return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" /></div>;

    // Use backend values if available, otherwise show empty/zero
    const stats = {
        spend: insights?.spend || 0,
        revenue: insights?.revenue || 0,
        roas: insights?.roas || 0,
        leads: insights?.leads || 0,
        cpl: insights?.cpl || 0,
        clicks: insights?.clicks || 0,
        ctr: insights?.ctr || 0,
        impressions: insights?.impressions || 0
    };

    return (
        <div className="min-h-screen bg-[#F1F5F9] p-6 lg:p-10 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(`/crm/campaigns/${id}`)} className="p-2 hover:bg-white/50 rounded-full transition-colors text-slate-500">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">Analytics Deep Dive <TrendingUp className="h-6 w-6 text-violet-500" /></h1>
                        <p className="text-slate-500">Performance Metrics for Campaign</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-white rounded-xl border border-slate-200 p-1">
                        {/* Matching backend presets where possible */}
                        {[{ l: '7d', v: 'last_7d' }, { l: '30d', v: 'last_30d' }, { l: '90d', v: 'last_90d' }].map((range) => (
                            <button
                                key={range.v}
                                onClick={() => setDateRange(range.v)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${dateRange === range.v ? 'bg-violet-100 text-violet-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                Last {range.l}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="p-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-200 shadow-sm transition-all"
                        title="Refresh Data"
                    >
                        <TrendingUp className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard label="Total Spend" value={`$${stats.spend.toLocaleString()}`} icon={Users} color="text-slate-600" bg="bg-slate-100" />
                <MetricCard label="Revenue" value={`$${stats.revenue.toLocaleString()}`} icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-100" />
                <MetricCard label="ROAS" value={`${stats.roas}x`} icon={TrendingUp} color="text-violet-600" bg="bg-violet-100" />
                <MetricCard label="Leads" value={stats.leads} icon={Users} color="text-blue-600" bg="bg-blue-100" />
                <MetricCard label="Cost Per Lead" value={`$${stats.cpl}`} icon={Users} color="text-rose-600" bg="bg-rose-100" />
                <MetricCard label="Clicks" value={stats.clicks.toLocaleString()} icon={MousePointerClick} color="text-amber-600" bg="bg-amber-100" />
                <MetricCard label="CTR" value={`${stats.ctr}%`} icon={MousePointerClick} color="text-cyan-600" bg="bg-cyan-100" />
                <MetricCard label="Impressions" value={stats.impressions.toLocaleString()} icon={Globe} color="text-indigo-600" bg="bg-indigo-100" />
            </div>

            {/* Time Series Chart */}
            <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Performance Trend</h3>
                        <p className="text-sm text-slate-400">Daily breakdown of Spend vs. Clicks.</p>
                    </div>
                </div>
                <div className="h-[350px] w-full">
                    {trend && trend.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trend}>
                                <defs>
                                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                />
                                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ stroke: '#8b5cf6', strokeWidth: 1 }}
                                />
                                <Area yAxisId="left" type="monotone" dataKey="spend" name="Spend ($)" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorSpend)" />
                                <Area yAxisId="right" type="monotone" dataKey="clicks" name="Clicks" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorClicks)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <p className="text-slate-400 font-medium">No trend data available for this range.</p>
                        </div>
                    )}
                </div>
            </GlassCard>
        </div>
    );
}

function MetricCard({ label, value, icon: Icon, color, bg }: any) {
    return (
        <GlassCard className="flex items-center gap-4 p-5">
            <div className={`p-3 rounded-xl ${bg} ${color} shadow-sm`}>
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
            </div>
        </GlassCard>
    );
}
