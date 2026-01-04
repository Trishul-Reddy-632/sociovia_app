
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Line,
    ComposedChart,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { useOptimizationTrends, useAgentStats } from '@/hooks/useOptimizationQueries';
import { Activity, PieChart as PieChartIcon } from 'lucide-react';

export default function AnalyticsSection() {
    const { data: trends = [] } = useOptimizationTrends();
    const { data: rawStats = [] } = useAgentStats();

    // Process stats for display (add colors)
    const stats = React.useMemo(() => {
        if (!rawStats || rawStats.length === 0) return [];
        const colors = ['#8884d8', '#f59e0b', '#10b981', '#6366f1', '#ec4899'];
        return rawStats.map((s, i) => ({ ...s, fill: colors[i % colors.length] }));
    }, [rawStats]);

    return (
        <div className="space-y-6 mt-8">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Performance Analytics
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Trend Chart */}
                <Card className="lg:col-span-2 shadow-sm border-slate-200">
                    <CardHeader>
                        <CardTitle>Optimization Impact Analysis</CardTitle>
                        <CardDescription>Correlating Ad Spend (Volume) with ROAS (Efficiency).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={trends}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#64748b"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        orientation="left"
                                        stroke="#64748b"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `$${value}`}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        stroke="#64748b"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        domain={[0, 6]}
                                        tickFormatter={(value) => `${value}x`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ fontSize: '12px' }}
                                    />
                                    <Legend iconType="circle" />
                                    <Bar yAxisId="left" dataKey="spend" name="Ad Spend" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={30} />
                                    <Line yAxisId="right" type="monotone" dataKey="roas" name="ROAS" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Agent Distribution Chart */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChartIcon className="w-4 h-4 text-slate-500" />
                            Agent Influence
                        </CardTitle>
                        <CardDescription>Which agents are driving decisions?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-bold text-slate-900">100%</span>
                                <span className="text-xs text-slate-400 uppercase tracking-widest">Active</span>
                            </div>
                        </div>

                        <div className="space-y-2 mt-4">
                            {stats.map((agent, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: agent.fill }} />
                                        <span className="text-slate-600">{agent.name}</span>
                                    </div>
                                    <span className="font-medium text-slate-900">{agent.value}%</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
