// InlineAnalytics.tsx
// ====================
// Inline analytics components that display within the dashboard
// Switches between WhatsApp and Meta analytics based on selection
// Matches the style and data from the dedicated analytics pages

import { useState, useEffect } from 'react';
import {
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Target,
    DollarSign,
    Eye,
    MousePointer,
    Users,
    BarChart3,
    MessageCircle,
    Check,
    CheckCheck,
    AlertCircle,
    Clock,
    Loader2,
    Info,
    Bell
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
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import logo from "@/assets/sociovia_logo.png";
import type { AnalyticsType } from './SidebarAnalytics';
import { API_BASE_URL } from "@/config";

const API_BASE = API_BASE_URL;
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

// ============ Shared KPI Card Component ============
function KPICard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    color = 'blue',
    tooltip
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: typeof Target;
    trend?: number;
    color?: 'blue' | 'green' | 'orange' | 'purple' | 'emerald' | 'red';
    tooltip?: string;
}) {
    const colorClasses = {
        blue: 'from-blue-500/10 to-blue-500/5 text-blue-600 border-blue-200',
        green: 'from-green-500/10 to-green-500/5 text-green-600 border-green-200',
        orange: 'from-orange-500/10 to-orange-500/5 text-orange-600 border-orange-200',
        purple: 'from-purple-500/10 to-purple-500/5 text-purple-600 border-purple-200',
        emerald: 'from-emerald-500/10 to-emerald-500/5 text-emerald-600 border-emerald-200',
        red: 'from-red-500/10 to-red-500/5 text-red-600 border-red-200',
    };

    const card = (
        <Card className={`relative overflow-hidden border ${colorClasses[color].split(' ').pop()}`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color].split(' ').slice(0, 2).join(' ')} opacity-50`} />
            <CardContent className="relative p-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium text-muted-foreground">{title}</p>
                            {tooltip && (
                                <Info className="w-3 h-3 text-muted-foreground/50" />
                            )}
                        </div>
                        <h3 className="text-2xl font-bold mt-1 tabular-nums">{value}</h3>
                        {subtitle && (
                            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                        )}
                    </div>
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colorClasses[color].split(' ').slice(0, 2).join(' ')}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{trend >= 0 ? '+' : ''}{trend.toFixed(1)}% vs last period</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    if (tooltip) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>{card}</TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                    <p className="text-sm">{tooltip}</p>
                </TooltipContent>
            </Tooltip>
        );
    }

    return card;
}

// ============ WhatsApp Analytics Component ============
export function WhatsAppInlineAnalytics() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState('7');
    const [data, setData] = useState<any>(null);
    const [categoryData, setCategoryData] = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const [analyticsRes, categoryRes] = await Promise.all([
                fetch(`${API_BASE}/api/whatsapp/analytics?days=${period}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: 'include',
                }),
                fetch(`${API_BASE}/api/whatsapp/analytics/categories?days=${period}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: 'include',
                }),
            ]);

            const analyticsJson = await analyticsRes.json();
            const categoryJson = await categoryRes.json();

            if (analyticsJson.success) {
                setData(analyticsJson);
            } else {
                setError(analyticsJson.error || 'Failed to load analytics');
            }

            if (categoryJson.success) {
                setCategoryData(categoryJson.categories);
            }
        } catch (err) {
            setError('Failed to fetch WhatsApp analytics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [period]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                    <p className="text-sm text-muted-foreground">Loading WhatsApp Analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-16">
                <AlertCircle className="w-12 h-12 mx-auto text-destructive/50 mb-4" />
                <p className="text-destructive font-medium mb-4">{error}</p>
                <Button onClick={fetchData} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                </Button>
            </div>
        );
    }

    const messages = data?.messages || {};
    const conversations = data?.conversations || {};

    // Message funnel data
    const funnelData = [
        { name: 'Sent', value: messages.sent || 0, fill: '#3b82f6' },
        { name: 'Delivered', value: messages.delivered || 0, fill: '#10b981' },
        { name: 'Read', value: messages.read || 0, fill: '#8b5cf6' },
    ];

    // Conversation breakdown pie data
    const conversationPieData = [
        { name: 'Open', value: conversations.open || 0 },
        { name: 'Active Sessions', value: conversations.active_sessions || 0 },
        { name: 'Unread', value: conversations.with_unread || 0 },
    ].filter(d => d.value > 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                        <MessageCircle className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">WhatsApp Analytics</h2>
                        <p className="text-sm text-muted-foreground">{data?.period_label || `Last ${period} days`}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-32 h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Last 7 days</SelectItem>
                            <SelectItem value="14">Last 14 days</SelectItem>
                            <SelectItem value="30">Last 30 days</SelectItem>
                            <SelectItem value="90">Last 90 days</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* KPI Cards - Messages */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Messages Sent"
                    value={messages.sent?.toLocaleString() || '0'}
                    subtitle={`${messages.total_incoming?.toLocaleString() || 0} incoming messages`}
                    icon={MessageCircle}
                    color="emerald"
                    tooltip="Total outgoing messages sent to customers via WhatsApp in this period"
                />
                <KPICard
                    title="Delivered"
                    value={messages.delivered?.toLocaleString() || '0'}
                    subtitle={`${messages.delivery_rate || 0}% delivery rate`}
                    icon={Check}
                    color="blue"
                    tooltip="Messages that successfully reached the customer's device"
                />
                <KPICard
                    title="Read"
                    value={messages.read?.toLocaleString() || '0'}
                    subtitle={`${messages.read_rate || 0}% read rate`}
                    icon={CheckCheck}
                    color="purple"
                    tooltip="Delivered messages that were opened and read by customers"
                />
                <KPICard
                    title="Failed"
                    value={messages.failed?.toLocaleString() || '0'}
                    subtitle={`${messages.failure_rate || 0}% failure rate`}
                    icon={AlertCircle}
                    color="red"
                    tooltip="Messages that failed to send due to invalid numbers, blocked users, or API errors"
                />
            </div>

            {/* Conversations Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Total Conversations"
                    value={conversations.total?.toLocaleString() || '0'}
                    icon={Users}
                    color="blue"
                    tooltip="Unique customers you have exchanged messages with"
                />
                <KPICard
                    title="Open Conversations"
                    value={conversations.open?.toLocaleString() || '0'}
                    icon={MessageCircle}
                    color="green"
                    tooltip="Conversations that are currently active and not closed"
                />
                <KPICard
                    title="Active Sessions"
                    value={conversations.active_sessions?.toLocaleString() || '0'}
                    icon={Clock}
                    color="orange"
                    tooltip="Conversations where the customer messaged within the last 24 hours"
                />
                <KPICard
                    title="Unread Messages"
                    value={conversations.with_unread?.toLocaleString() || '0'}
                    icon={Eye}
                    color="purple"
                    tooltip="Conversations with messages you haven't read yet"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Message Funnel */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-emerald-500" />
                            Message Funnel
                        </CardTitle>
                        <CardDescription>Delivery and read progression</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={funnelData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" tick={{ fontSize: 11 }} />
                                <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 11 }} />
                                <RechartsTooltip />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {funnelData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Conversation Breakdown */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            Conversation Status
                        </CardTitle>
                        <CardDescription>Distribution of conversations</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {conversationPieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={conversationPieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {conversationPieData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                                No conversation data
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// ============ Meta Ads Analytics Component ============
export function MetaInlineAnalytics() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState('30');
    const [data, setData] = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const workspaceId = localStorage.getItem('sv_selected_workspace_id') || sessionStorage.getItem('sv_selected_workspace_id');
            const userStr = localStorage.getItem('sv_user') || sessionStorage.getItem('sv_user');
            const user = userStr ? JSON.parse(userStr) : null;

            if (!workspaceId) {
                setError('No workspace selected');
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

            if (!response.ok) throw new Error('Failed to fetch');
            const result = await response.json();
            setData(result);
        } catch (err) {
            setError('Failed to fetch Meta analytics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [period]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(value);
    };

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat('en-IN').format(Math.round(value));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                    <p className="text-sm text-muted-foreground">Loading Meta Ads Analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-16">
                <AlertCircle className="w-12 h-12 mx-auto text-destructive/50 mb-4" />
                <p className="text-destructive font-medium mb-4">{error}</p>
                <Button onClick={fetchData} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                </Button>
            </div>
        );
    }

    const totals = data?.totals || {};
    const campaigns = data?.campaigns || [];
    const trend = data?.recharts_overview || [];

    // Status breakdown for pie chart
    const statusData = campaigns.length > 0
        ? Object.entries(
            campaigns.reduce((acc: Record<string, number>, c: any) => {
                const status = c.status?.toUpperCase() || 'UNKNOWN';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {})
        ).map(([name, value]) => ({ name, value: value as number }))
        : [];

    // Top campaigns by spend
    const topCampaigns = campaigns
        .slice()
        .sort((a: any, b: any) => (Number(b.spend) || 0) - (Number(a.spend) || 0))
        .slice(0, 5);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                        <Target className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Meta Ads Analytics</h2>
                        <p className="text-sm text-muted-foreground">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} • Last {period} days</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-32 h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Last 7 days</SelectItem>
                            <SelectItem value="30">Last 30 days</SelectItem>
                            <SelectItem value="90">Last 90 days</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Total Spend"
                    value={formatCurrency(totals.spend || 0)}
                    subtitle={`${formatCurrency(totals.cpm || 0)} CPM`}
                    icon={DollarSign}
                    color="blue"
                />
                <KPICard
                    title="Impressions"
                    value={formatNumber(totals.impressions || 0)}
                    icon={Eye}
                    color="green"
                />
                <KPICard
                    title="Clicks"
                    value={formatNumber(totals.clicks || 0)}
                    subtitle={`${(totals.ctr || 0).toFixed(2)}% CTR`}
                    icon={MousePointer}
                    color="orange"
                />
                <KPICard
                    title="Reach"
                    value={formatNumber(totals.reach || 0)}
                    subtitle="Unique users reached"
                    icon={Users}
                    color="purple"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance Trend */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-blue-500" />
                            Performance Trend
                        </CardTitle>
                        <CardDescription>Spend and clicks over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {trend.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={trend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <RechartsTooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="spend" stroke="#3b82f6" strokeWidth={2} dot={false} name="Spend" />
                                    <Line type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2} dot={false} name="Clicks" />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                                No trend data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Campaign Status */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Target className="w-4 h-4 text-green-500" />
                            Campaign Status
                        </CardTitle>
                        <CardDescription>Distribution by status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {statusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {statusData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                                No campaigns found
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Top Campaigns */}
            {topCampaigns.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-orange-500" />
                            Top Campaigns by Spend
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {topCampaigns.map((campaign: any, idx: number) => (
                                <div key={campaign.id || idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs font-bold">
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <p className="font-medium text-sm truncate max-w-[200px]">{campaign.name}</p>
                                            <Badge variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs mt-0.5">
                                                {campaign.status || 'Unknown'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">{formatCurrency(Number(campaign.spend) || 0)}</p>
                                        <p className="text-xs text-muted-foreground">{formatNumber(Number(campaign.clicks) || 0)} clicks</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// ============ Coming Soon Banner Component ============
// Sociovia-themed with animations and interactive elements
export function ComingSoonBanner({ type }: { type: 'google' | 'email' }) {
    const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const config = {
        google: {
            title: 'Google Ads Analytics',
            subtitle: 'Launching Soon',
            description: 'Unified analytics for your Google Ads campaigns. Track keywords, conversions, and ROI alongside your Meta and WhatsApp insights.',
            features: [
                { text: 'Campaign Performance', icon: '📊' },
                { text: 'Keyword Analytics', icon: '🔍' },
                { text: 'Conversion Tracking', icon: '🎯' },
                { text: 'Smart Recommendations', icon: '💡' },
            ],
            emoji: '🔮',
        },
        email: {
            title: 'Email Marketing Analytics',
            subtitle: 'Launching Soon',
            description: 'Master your email campaigns with detailed analytics. Track opens, clicks, and engagement to optimize your outreach.',
            features: [
                { text: 'Open Rate Insights', icon: '📧' },
                { text: 'Click Analytics', icon: '👆' },
                { text: 'A/B Test Results', icon: '🧪' },
                { text: 'Subscriber Growth', icon: '📈' },
            ],
            emoji: '✉️',
        },
    };

    const c = config[type];

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100,
        });
    };

    return (
        <div
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-green-50 border border-emerald-100 p-4 md:p-8 min-h-[400px] md:min-h-[500px]"
            onMouseMove={handleMouseMove}
        >
            {/* Animated background gradient that follows mouse */}
            <div
                className="absolute w-48 md:w-96 h-48 md:h-96 rounded-full blur-3xl opacity-20 transition-all duration-500 pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, #10b981 0%, transparent 70%)',
                    left: `${mousePos.x}%`,
                    top: `${mousePos.y}%`,
                    transform: 'translate(-50%, -50%)',
                }}
            />

            {/* Floating animated elements - hidden on mobile for cleaner look */}
            <div className="hidden md:block absolute top-10 right-10 text-4xl animate-bounce" style={{ animationDuration: '3s' }}>
                {c.emoji}
            </div>
            <div className="hidden md:block absolute bottom-20 right-20 text-2xl animate-pulse" style={{ animationDuration: '2s' }}>
                ✨
            </div>
            <div className="hidden md:block absolute top-1/3 right-1/4 text-xl opacity-30 animate-spin" style={{ animationDuration: '8s' }}>
                ⚙️
            </div>

            <div className="relative z-10">
                {/* Logo + Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 mb-6 md:mb-8">
                    <div className="relative">
                        <img
                            src="/sociovia_logo.png"
                            alt="Sociovia"
                            className="w-12 h-12 md:w-16 md:h-16 object-contain animate-pulse"
                            style={{ animationDuration: '3s' }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                        <div className="absolute -inset-2 bg-emerald-400/20 rounded-full blur-xl animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-3xl font-bold text-gray-900">{c.title}</h2>
                        <div className="flex items-center gap-2 mt-1 md:mt-2">
                            <span className="px-3 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-semibold bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30 animate-pulse">
                                🚀 {c.subtitle}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm md:text-lg mb-6 md:mb-8 max-w-2xl leading-relaxed">
                    {c.description}
                </p>

                {/* Interactive Features Grid - 1 column on mobile, 2 on desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
                    {c.features.map((feature, idx) => (
                        <div
                            key={idx}
                            className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl border transition-all duration-300 cursor-pointer ${hoveredFeature === idx
                                ? 'bg-emerald-50 border-emerald-300 shadow-lg shadow-emerald-100 scale-[1.02] md:scale-105'
                                : 'bg-white/50 border-gray-100 hover:border-emerald-200'
                                }`}
                            onMouseEnter={() => setHoveredFeature(idx)}
                            onMouseLeave={() => setHoveredFeature(null)}
                        >
                            <div
                                className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-xl md:text-2xl transition-all duration-300 shrink-0 ${hoveredFeature === idx
                                    ? 'bg-gradient-to-br from-emerald-500 to-green-600 scale-110'
                                    : 'bg-emerald-100'
                                    }`}
                            >
                                {feature.icon}
                            </div>
                            <span className={`font-medium text-sm md:text-base transition-colors ${hoveredFeature === idx ? 'text-emerald-700' : 'text-gray-700'}`}>
                                {feature.text}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Fun Mini Game - themed for each analytics type */}
                <MiniGame type={type} />
            </div>
        </div>
    );
}

// ============ Themed Mini Game Component ============
function MiniGame({ type }: { type: 'google' | 'email' }) {
    const [score, setScore] = useState(0);
    const [targets, setTargets] = useState<{ id: number; x: number; y: number; emoji: string }[]>([]);
    const [gameActive, setGameActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(15);
    const [highScore, setHighScore] = useState(() => {
        const saved = localStorage.getItem(`sociovia_game_${type}_highscore`);
        return saved ? parseInt(saved) : 0;
    });

    // Theme configuration
    const themes = {
        google: {
            title: '🔍 Search & Score!',
            subtitle: 'Catch the keywords and boost your SEO',
            emojis: ['🔍', '📊', '💻', '🎯', '📈', '💡', '🌐', '⭐'],
            readyEmoji: '🔎',
            readyText: 'Ready to dominate search rankings?',
            gradientBg: 'from-blue-100 via-white to-blue-50',
            gradientBtn: 'from-blue-500 to-blue-600',
            accentColor: 'text-blue-600',
            borderColor: 'border-blue-100',
        },
        email: {
            title: '📧 Inbox Zero Hero!',
            subtitle: 'Catch the emails before they pile up',
            emojis: ['📧', '✉️', '📬', '💌', '📨', '📩', '💬', '🔔'],
            readyEmoji: '📬',
            readyText: 'Ready to master your inbox?',
            gradientBg: 'from-red-100 via-white to-orange-50',
            gradientBtn: 'from-red-500 to-orange-500',
            accentColor: 'text-red-600',
            borderColor: 'border-red-100',
        },
    };

    const theme = themes[type];

    const startGame = () => {
        setScore(0);
        setTimeLeft(15);
        setGameActive(true);
        setTargets([]);
    };

    // Spawn targets
    useEffect(() => {
        if (!gameActive) return;
        const interval = setInterval(() => {
            const newTarget = {
                id: Date.now(),
                x: Math.random() * 80 + 10,
                y: Math.random() * 60 + 20,
                emoji: theme.emojis[Math.floor(Math.random() * theme.emojis.length)],
            };
            setTargets((prev) => [...prev.slice(-5), newTarget]);
        }, 700);
        return () => clearInterval(interval);
    }, [gameActive, theme.emojis]);

    // Timer
    useEffect(() => {
        if (!gameActive) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    setGameActive(false);
                    if (score > highScore) {
                        setHighScore(score);
                        localStorage.setItem(`sociovia_game_${type}_highscore`, score.toString());
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameActive, score, highScore, type]);

    const catchTarget = (id: number) => {
        setTargets((prev) => prev.filter((t) => t.id !== id));
        setScore((prev) => prev + 10);
    };

    return (
        <div className={`bg-white/70 backdrop-blur rounded-xl p-4 md:p-6 border ${theme.borderColor}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-0 mb-4">
                <div>
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm md:text-base">
                        {theme.title}
                    </h3>
                    <p className="text-[10px] md:text-xs text-gray-500">{theme.subtitle}</p>
                </div>
                <div className="flex items-center gap-3 md:gap-4">
                    {gameActive && (
                        <span className="text-xs md:text-sm font-bold text-orange-500">⏱️ {timeLeft}s</span>
                    )}
                    <span className={`text-xs md:text-sm font-bold ${theme.accentColor}`}>Score: {score}</span>
                    <span className="text-[10px] md:text-xs text-gray-400">🏆 {highScore}</span>
                </div>
            </div>

            {/* Game Area */}
            <div
                className={`relative h-40 md:h-48 rounded-lg overflow-hidden transition-all ${gameActive ? `bg-gradient-to-br ${theme.gradientBg}` : 'bg-gray-50'
                    }`}
            >
                {!gameActive ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {timeLeft === 0 && score > 0 ? (
                            <>
                                <div className="text-3xl md:text-4xl mb-2">🎉</div>
                                <p className="font-bold text-gray-800 text-sm md:text-base">Game Over!</p>
                                <p className={`font-semibold text-sm md:text-base ${theme.accentColor}`}>You scored {score} points!</p>
                                {score >= highScore && score > 0 && (
                                    <p className="text-[10px] md:text-xs text-orange-500 mt-1">🏆 New High Score!</p>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="text-3xl md:text-4xl mb-2 animate-bounce">{theme.readyEmoji}</div>
                                <p className="text-gray-600 text-xs md:text-sm text-center px-4">{theme.readyText}</p>
                            </>
                        )}
                        <button
                            onClick={startGame}
                            className={`mt-3 md:mt-4 px-4 md:px-6 py-1.5 md:py-2 bg-gradient-to-r ${theme.gradientBtn} text-white rounded-full font-semibold text-xs md:text-sm hover:shadow-lg hover:scale-105 transition-all`}
                        >
                            {timeLeft === 0 ? 'Play Again' : 'Start Game'}
                        </button>
                    </div>
                ) : (
                    targets.map((target) => (
                        <button
                            key={target.id}
                            onClick={() => catchTarget(target.id)}
                            className="absolute text-2xl md:text-3xl transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform cursor-pointer animate-bounce"
                            style={{
                                left: `${target.x}%`,
                                top: `${target.y}%`,
                                animationDuration: '0.5s',
                            }}
                        >
                            {target.emoji}
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}

// ============ Main Inline Analytics Switcher ============
interface InlineAnalyticsProps {
    activeView: AnalyticsType;
}

export function InlineAnalytics({ activeView }: InlineAnalyticsProps) {
    if (!activeView) return null;

    return (
        <Card className="mb-6 overflow-hidden">
            <CardHeader className="pb-4 border-b bg-gradient-to-r from-background to-muted/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src={logo} alt="Sociovia" className="w-6 h-6" />
                        <CardTitle className="text-lg">Analytics Dashboard</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                        {activeView === 'whatsapp' ? 'WhatsApp' : activeView === 'meta' ? 'Meta Ads' : activeView === 'google' ? 'Google Ads' : 'Email Marketing'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                {activeView === 'whatsapp' && <WhatsAppInlineAnalytics />}
                {activeView === 'meta' && <MetaInlineAnalytics />}
                {activeView === 'google' && <ComingSoonBanner type="google" />}
                {activeView === 'email' && <ComingSoonBanner type="email" />}
            </CardContent>
        </Card>
    );
}

export default InlineAnalytics;