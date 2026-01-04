
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronLeft, BarChart3, TrendingUp, Users, MousePointer, Calendar } from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    BarChart,
    Bar,
    Legend
} from "recharts";

// Mock data generator (since we don't have a real detailed historical API yet)
const generateHistory = (days = 30) => {
    return Array.from({ length: days }).map((_, i) => ({
        date: new Date(Date.now() - (days - i) * 86400000).toLocaleDateString(),
        spend: Math.floor(Math.random() * 5000) + 1000,
        impressions: Math.floor(Math.random() * 50000) + 10000,
        clicks: Math.floor(Math.random() * 2000) + 200,
        leads: Math.floor(Math.random() * 50) + 5,
    }));
};

export default function WorkspaceAnalytics() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);
    const [workspaceName, setWorkspaceName] = useState("Workspace");
    const [dateRange, setDateRange] = useState("30d");

    useEffect(() => {
        // Simulate API fetch
        setLoading(true);
        setTimeout(() => {
            // Try to find workspace name from cache
            try {
                const raw = localStorage.getItem("sv_workspaces");
                if (raw) {
                    const list = JSON.parse(raw);
                    const w = list.find((w: any) => String(w.id) === id);
                    if (w) setWorkspaceName(w.name || w.business_name);
                }
            } catch { }

            const days = dateRange === "7d" ? 7 : dateRange === "90d" ? 90 : 30;
            setData(generateHistory(days));
            setLoading(false);
        }, 800);
    }, [id, dateRange]);

    const totals = useMemo(() => {
        return data.reduce((acc, day) => ({
            spend: acc.spend + day.spend,
            impressions: acc.impressions + day.impressions,
            clicks: acc.clicks + day.clicks,
            leads: acc.leads + day.leads
        }), { spend: 0, impressions: 0, clicks: 0, leads: 0 });
    }, [data]);

    if (loading) return <div className="p-8 flex justify-center">Loading analytics...</div>;

    return (
        <div className="min-h-screen bg-slate-50/50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => navigate("/workspaces")}>
                            <ChevronLeft className="w-4 h-4 mr-2" /> Back
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">{workspaceName} Analytics</h1>
                            <p className="text-sm text-muted-foreground">Detailed performance metrics</p>
                        </div>
                    </div>
                    <select
                        className="border rounded-md px-3 py-1.5 text-sm bg-white"
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                    >
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                    </select>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">Total Spend</p>
                                    <h3 className="text-2xl font-bold mt-1">₹{totals.spend.toLocaleString()}</h3>
                                </div>
                                <div className="p-2 bg-green-100 rounded-md text-green-700">
                                    <BarChart3 className="w-5 h-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">Impressions</p>
                                    <h3 className="text-2xl font-bold mt-1">{totals.impressions.toLocaleString()}</h3>
                                </div>
                                <div className="p-2 bg-blue-100 rounded-md text-blue-700">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">Clicks</p>
                                    <h3 className="text-2xl font-bold mt-1">{totals.clicks.toLocaleString()}</h3>
                                </div>
                                <div className="p-2 bg-purple-100 rounded-md text-purple-700">
                                    <MousePointer className="w-5 h-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">Leads</p>
                                    <h3 className="text-2xl font-bold mt-1">{totals.leads.toLocaleString()}</h3>
                                </div>
                                <div className="p-2 bg-amber-100 rounded-md text-amber-700">
                                    <Users className="w-5 h-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Spend vs Leads</CardTitle>
                            <CardDescription>Correlation between budget and result</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data}>
                                        <defs>
                                            <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis yAxisId="left" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                                        <YAxis yAxisId="right" orientation="right" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: 8 }} />
                                        <Legend />
                                        <Area yAxisId="left" type="monotone" dataKey="spend" stroke="#8884d8" fillOpacity={1} fill="url(#colorSpend)" name="Spend" />
                                        <Area yAxisId="right" type="monotone" dataKey="leads" stroke="#82ca9d" fillOpacity={1} fill="url(#colorLeads)" name="Leads" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Engagement Volume</CardTitle>
                            <CardDescription>Impressions vs Clicks</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: 8 }} />
                                        <Legend />
                                        <Bar dataKey="impressions" fill="#3b82f6" name="Impressions" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="clicks" fill="#f59e0b" name="Clicks" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
