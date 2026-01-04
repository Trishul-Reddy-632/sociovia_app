// MetaAdsAnalytics.tsx
// ====================
// Comprehensive Meta Ads Analytics dashboard
// Shows campaign performance metrics, charts, and insights

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Target,
    DollarSign,
    Eye,
    MousePointer,
    Users,
    BarChart3,
    PieChart,
    Loader2,
    Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart as RechartsPieChart,
    Pie,
    Cell,
} from 'recharts';
import logo from "@/assets/sociovia_logo.png";
import { API_BASE_URL } from '@/config';

// API Base URL
const API_BASE = API_BASE_URL;

// Types
interface CampaignMetrics {
    spend: number;
    impressions: number;
    clicks: number;
    reach: number;
    ctr: number;
    cpm: number;
    cpc: number;
    conversions: number;
    leads: number;
}

interface Campaign {
    id: string;
    name: string;
    status: string;
    objective: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
}

interface AnalyticsData {
    totals: CampaignMetrics;
    campaigns: Campaign[];
    trend: { date: string; spend: number; clicks: number; impressions: number }[];
}

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// KPI Card Component
function KPICard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    color = 'blue'
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: typeof Target;
    trend?: number;
    color?: 'blue' | 'green' | 'orange' | 'purple';
}) {
    const colorClasses = {
        blue: 'from-blue-500/10 to-blue-500/5 text-blue-600',
        green: 'from-green-500/10 to-green-500/5 text-green-600',
        orange: 'from-orange-500/10 to-orange-500/5 text-orange-600',
        purple: 'from-purple-500/10 to-purple-500/5 text-purple-600',
    };

    return (
        <Card className="relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]} opacity-50`} />
            <CardContent className="relative p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <h3 className="text-3xl font-bold mt-2">{value}</h3>
                        {subtitle && (
                            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
                        )}
                    </div>
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]}`}>
                        <Icon className="w-6 h-6" />
                    </div>
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 mt-3 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span>{trend >= 0 ? '+' : ''}{trend.toFixed(1)}% vs last period</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function MetaAdsAnalytics() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState('30');
    const [data, setData] = useState<AnalyticsData | null>(null);

    const fetchAnalytics = async () => {
        setLoading(true);
        setError(null);

        try {
            // Get workspace and user IDs from storage
            const workspaceId = localStorage.getItem('sv_selected_workspace_id') || sessionStorage.getItem('sv_selected_workspace_id');
            const userStr = localStorage.getItem('sv_user') || sessionStorage.getItem('sv_user');
            const user = userStr ? JSON.parse(userStr) : null;

            if (!workspaceId) {
                setError('No workspace selected. Please select a workspace from the dashboard.');
                setLoading(false);
                return;
            }

            const datePreset = period === '7' ? 'last_7d' : period === '90' ? 'last_90d' : 'last_30d';
            const params = new URLSearchParams({
                workspace_id: workspaceId,
                ...(user?.id && { user_id: String(user.id) }),
                date_preset: datePreset,
            });

            const response = await fetch(`${API_BASE}/api/meta/consolidated-campaigns?${params}`, {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch Meta analytics');
            }

            const result = await response.json();

            // Transform the data
            const totals: CampaignMetrics = result.totals || {
                spend: 0,
                impressions: 0,
                clicks: 0,
                reach: 0,
                ctr: 0,
                cpm: 0,
                cpc: 0,
                conversions: 0,
                leads: 0,
            };

            const campaigns = (result.campaigns || []).map((c: any) => ({
                id: c.id || c.meta_campaign_id,
                name: c.name,
                status: c.status,
                objective: c.objective,
                spend: Number(c.spend || c.insights?.spend || 0),
                impressions: Number(c.impressions || c.insights?.impressions || 0),
                clicks: Number(c.clicks || c.insights?.clicks || 0),
                ctr: Number(c.ctr || c.insights?.ctr || 0),
            }));

            const trend = result.recharts_overview || [];

            setData({ totals, campaigns, trend });
        } catch (err) {
            console.error('Error fetching Meta analytics:', err);
            setError(err instanceof Error ? err.message : 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(value);
    };

    // Format number with commas
    const formatNumber = (value: number) => {
        return new Intl.NumberFormat('en-US').format(Math.round(value));
    };

    // Campaign status breakdown for pie chart
    const statusData = data?.campaigns
        ? Object.entries(
            data.campaigns.reduce((acc, c) => {
                const status = c.status?.toUpperCase() || 'UNKNOWN';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        ).map(([name, value]) => ({ name, value }))
        : [];

    // Top campaigns by spend
    const topCampaigns = data?.campaigns
        ?.slice()
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 5) || [];

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                        <Target className="w-6 h-6 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-muted-foreground animate-pulse">Loading Meta Ads Analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <img src={logo} alt="Sociovia" className="w-6 h-6" />
                                Meta Ads Analytics
                            </h1>
                            <p className="text-muted-foreground text-sm">Campaign performance & insights</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="w-36">
                                <Calendar className="w-4 h-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">Last 7 days</SelectItem>
                                <SelectItem value="30">Last 30 days</SelectItem>
                                <SelectItem value="90">Last 90 days</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={fetchAnalytics} disabled={loading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {error ? (
                    <Card className="border-destructive/50 bg-destructive/5">
                        <CardContent className="p-6 text-center">
                            <p className="text-destructive">{error}</p>
                            <Button className="mt-4" onClick={() => navigate('/fb_user')}>
                                Link Meta Account
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <KPICard
                                title="Total Spend"
                                value={formatCurrency(data?.totals.spend || 0)}
                                subtitle={`${formatNumber(data?.campaigns?.length || 0)} campaigns`}
                                icon={DollarSign}
                                color="blue"
                            />
                            <KPICard
                                title="Impressions"
                                value={formatNumber(data?.totals.impressions || 0)}
                                subtitle={`${formatCurrency(data?.totals.cpm || 0)} CPM`}
                                icon={Eye}
                                color="green"
                            />
                            <KPICard
                                title="Clicks"
                                value={formatNumber(data?.totals.clicks || 0)}
                                subtitle={`${(data?.totals.ctr || 0).toFixed(2)}% CTR`}
                                icon={MousePointer}
                                color="orange"
                            />
                            <KPICard
                                title="Reach"
                                value={formatNumber(data?.totals.reach || 0)}
                                subtitle="Unique users reached"
                                icon={Users}
                                color="purple"
                            />
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Performance Trend */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-blue-500" />
                                        Performance Trend
                                    </CardTitle>
                                    <CardDescription>Spend and clicks over time</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {data?.trend && data.trend.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <LineChart data={data.trend}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                                                <Tooltip />
                                                <Legend />
                                                <Line
                                                    yAxisId="left"
                                                    type="monotone"
                                                    dataKey="spend"
                                                    stroke="#0088FE"
                                                    strokeWidth={2}
                                                    dot={false}
                                                    name="Spend ($)"
                                                />
                                                <Line
                                                    yAxisId="right"
                                                    type="monotone"
                                                    dataKey="clicks"
                                                    stroke="#00C49F"
                                                    strokeWidth={2}
                                                    dot={false}
                                                    name="Clicks"
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                            No trend data available
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Campaign Status Breakdown */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <PieChart className="w-5 h-5 text-green-500" />
                                        Campaign Status
                                    </CardTitle>
                                    <CardDescription>Distribution by status</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {statusData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <RechartsPieChart>
                                                <Pie
                                                    data={statusData}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                                    outerRadius={100}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {statusData.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </RechartsPieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                            No campaign data available
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Top Campaigns Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="w-5 h-5 text-orange-500" />
                                    Top Campaigns by Spend
                                </CardTitle>
                                <CardDescription>Your highest spending campaigns</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {topCampaigns.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Campaign</th>
                                                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                                                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Spend</th>
                                                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Impressions</th>
                                                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Clicks</th>
                                                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">CTR</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {topCampaigns.map((campaign, idx) => (
                                                    <tr key={campaign.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs font-medium">
                                                                    {idx + 1}
                                                                </span>
                                                                <span className="font-medium truncate max-w-[200px]">{campaign.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <Badge variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                                                {campaign.status || 'Unknown'}
                                                            </Badge>
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-medium">{formatCurrency(campaign.spend)}</td>
                                                        <td className="py-3 px-4 text-right">{formatNumber(campaign.impressions)}</td>
                                                        <td className="py-3 px-4 text-right">{formatNumber(campaign.clicks)}</td>
                                                        <td className="py-3 px-4 text-right">{campaign.ctr.toFixed(2)}%</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No campaigns found
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}

export default MetaAdsAnalytics;
