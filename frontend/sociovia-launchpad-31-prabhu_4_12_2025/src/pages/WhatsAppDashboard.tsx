// WhatsApp Dashboard Page
// =======================
// Dashboard for WhatsApp Business with analytics overview

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    MessageCircle,
    Settings,
    Inbox,
    RefreshCw,
    CheckCheck,
    Eye,
    AlertCircle,
    Users,
    Clock,
    BarChart3,
    Building2,
    Info,
    TrendingUp,
    Link as LinkIcon,
    Unlink,
    FileText,
    Workflow,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import logo from '@/assets/sociovia_logo.png';

// API Base URL from environment
const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || '').toString().replace(/\/$/, '');

interface MessageStats {
    total_outgoing: number;
    total_incoming: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    delivery_rate: number;
    read_rate: number;
    failure_rate: number;
}

interface ConversationStats {
    total: number;
    open: number;
    with_unread: number;
    active_sessions: number;
}

interface AnalyticsData {
    success: boolean;
    period_label: string;
    messages: MessageStats;
    conversations: ConversationStats;
}

interface Workspace {
    id: number;
    name: string;
    logo?: string;
}

// Tooltip descriptions for each metric
const METRIC_INFO: Record<string, string> = {
    'Messages Sent': 'Total number of messages you sent to customers via WhatsApp in this period.',
    'Delivered': 'Number of messages that successfully reached the customer\'s device.',
    'Read': 'Number of delivered messages that were opened and read by customers.',
    'Failed': 'Messages that failed to send due to invalid numbers, blocked users, or API errors.',
    'Conversations': 'Unique customers you have exchanged messages with.',
    'Open': 'Conversations that are currently active and not marked as closed.',
    'Active': 'Conversations where the customer messaged within the last 24 hours.',
    'Unread': 'Conversations with messages you haven\'t read yet.',
};

export default function WhatsAppDashboard() {
    const navigate = useNavigate();

    // Workspace state
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
    const [workspacesLoading, setWorkspacesLoading] = useState(true);

    // WhatsApp account linked state
    const [hasLinkedAccount, setHasLinkedAccount] = useState<boolean | null>(null);
    const [checkingAccount, setCheckingAccount] = useState(false);
    const [accountName, setAccountName] = useState<string | null>(null);
    const [accountPhone, setAccountPhone] = useState<string | null>(null);

    // Analytics state
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState('7');

    // Fetch workspaces on mount
    useEffect(() => {
        const fetchWorkspaces = async () => {
            setWorkspacesLoading(true);
            try {
                const userStr = localStorage.getItem('sv_user') || sessionStorage.getItem('sv_user');
                const user = userStr ? JSON.parse(userStr) : null;
                if (!user?.id) return;

                const res = await fetch(`${API_BASE}/api/workspaces?user_id=${user.id}`, {
                    credentials: 'include',
                });
                const json = await res.json();
                const wsList = json.workspaces || json.workspace || [];
                const mapped = (Array.isArray(wsList) ? wsList : [wsList]).map((w: any) => ({
                    id: w.id || w.workspace_id,
                    name: w.business_name || w.name || `Workspace ${w.id}`,
                    logo: w.logo_url || w.logo,
                }));
                setWorkspaces(mapped);

                // Set initial workspace from storage or first one
                const storedWs = localStorage.getItem('sv_whatsapp_workspace_id') || localStorage.getItem('sv_selected_workspace_id');
                if (storedWs && mapped.some((w: Workspace) => w.id === Number(storedWs))) {
                    setSelectedWorkspaceId(storedWs);
                } else if (mapped.length > 0) {
                    const firstWsId = String(mapped[0].id);
                    setSelectedWorkspaceId(firstWsId);
                    localStorage.setItem('sv_whatsapp_workspace_id', firstWsId);
                }
            } catch (err) {
                console.error('Failed to fetch workspaces:', err);
            } finally {
                setWorkspacesLoading(false);
            }
        };
        fetchWorkspaces();
    }, []);

    // Handle workspace change
    const handleWorkspaceChange = (wsId: string) => {
        setSelectedWorkspaceId(wsId);
        localStorage.setItem('sv_whatsapp_workspace_id', wsId);
        setHasLinkedAccount(null);
    };

    // Check if workspace has a linked WhatsApp account
    useEffect(() => {
        const checkLinkedAccount = async () => {
            if (!selectedWorkspaceId) {
                setHasLinkedAccount(null);
                return;
            }
            setCheckingAccount(true);
            try {
                // Use the same API as the setup page for consistency
                const res = await fetch(`${API_BASE}/api/whatsapp/connection-path?workspace_id=${selectedWorkspaceId}`, {
                    credentials: 'include',
                });
                const json = await res.json();
                // Connected if status is CONNECTED
                const isConnected = json.status === 'CONNECTED';
                setHasLinkedAccount(isConnected);

                // Store account name for display in header
                if (isConnected && json.account_summary) {
                    setAccountName(json.account_summary.verified_name || null);
                    setAccountPhone(json.account_summary.phone_number || null);
                } else {
                    setAccountName(null);
                    setAccountPhone(null);
                }

                console.log('[WhatsApp Dashboard] Connection status:', json.status, 'account:', json.account_summary?.verified_name);
            } catch (err) {
                console.error('Failed to check linked account:', err);
                // Fallback to the old method
                try {
                    const res = await fetch(`${API_BASE}/api/whatsapp/accounts?workspace_id=${selectedWorkspaceId}`, {
                        credentials: 'include',
                    });
                    const json = await res.json();
                    const accounts = json.accounts || [];
                    const hasActive = accounts.some((acc: any) => acc.is_active);
                    setHasLinkedAccount(hasActive);
                } catch {
                    setHasLinkedAccount(false);
                }
            } finally {
                setCheckingAccount(false);
            }
        };
        checkLinkedAccount();
    }, [selectedWorkspaceId]);

    // Fetch analytics
    const fetchAnalytics = async () => {
        if (!selectedWorkspaceId) {
            setError('Please select a workspace');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const queryParams = period === 'all' ? 'days=0' : `days=${period}`;
            const wsParam = `workspace_id=${selectedWorkspaceId}`;

            const res = await fetch(`${API_BASE}/api/whatsapp/analytics?${queryParams}&${wsParam}`, {
                headers: { Authorization: `Bearer ${token}` },
                credentials: 'include',
            });

            const json = await res.json();
            if (json.success) {
                setData(json);
            } else {
                setError(json.error || 'Failed to load analytics');
            }
        } catch (err) {
            setError('Failed to fetch analytics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedWorkspaceId && hasLinkedAccount === true) {
            fetchAnalytics();
        }
    }, [period, selectedWorkspaceId, hasLinkedAccount]);

    // Info tooltip component
    const InfoTooltip = ({ metric }: { metric: string }) => {
        const description = METRIC_INFO[metric] || 'No description available.';
        return (
            <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                    <button className="group relative ml-1.5 inline-flex items-center justify-center">
                        <Info className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs" sideOffset={8}>
                    <p className="text-sm">{description}</p>
                </TooltipContent>
            </Tooltip>
        );
    };

    // Stat Card component
    const StatCard = ({
        title,
        value,
        subtitle,
        icon: Icon,
        color = 'primary',
    }: {
        title: string;
        value: string | number;
        subtitle?: string;
        icon: typeof MessageCircle;
        color?: 'primary' | 'green' | 'blue' | 'red' | 'yellow';
    }) => {
        const colorClasses = {
            primary: 'from-primary/20 to-primary/5 text-primary',
            green: 'from-green-500/20 to-green-500/5 text-green-600',
            blue: 'from-blue-500/20 to-blue-500/5 text-blue-600',
            red: 'from-red-500/20 to-red-500/5 text-red-600',
            yellow: 'from-yellow-500/20 to-yellow-500/5 text-yellow-600',
        };

        return (
            <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow duration-300">
                <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-70 transition-opacity duration-300', colorClasses[color])} />
                <CardContent className="relative p-4 md:p-6">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs md:text-sm font-medium text-muted-foreground flex items-center">
                                {title}
                                <InfoTooltip metric={title} />
                            </p>
                            <p className="text-xl md:text-3xl font-bold mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
                        </div>
                        <div className={cn(
                            'p-2 md:p-3 rounded-full transition-transform duration-300 group-hover:scale-110 shrink-0',
                            colorClasses[color].replace('text-', 'bg-').split(' ')[0]
                        )}>
                            <Icon className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    // Loading state while:
    // 1. Workspaces are being fetched
    // 2. Account is being checked
    // 3. Workspace selected but account status unknown
    if (workspacesLoading || checkingAccount || (hasLinkedAccount === null && selectedWorkspaceId)) {
        return (
            <div className="min-h-screen bg-background p-6 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">
                        {workspacesLoading ? 'Loading workspaces...' : 'Checking WhatsApp account...'}
                    </p>
                </div>
            </div>
        );
    }

    // No account linked - show connect prompt
    if (hasLinkedAccount === false && selectedWorkspaceId) {
        return (
            <TooltipProvider>
                <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
                    {/* Header */}
                    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {/* WhatsApp Business title - left side */}
                                    <div>
                                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                            <MessageCircle className="h-5 w-5 text-green-600" />
                                            WhatsApp Business
                                        </h1>
                                        <p className="text-xs text-gray-500 hidden md:block">Manage your WhatsApp Business features</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 md:gap-3">
                                    {/* Workspace selector - right side */}
                                    <Select
                                        value={selectedWorkspaceId || ''}
                                        onValueChange={handleWorkspaceChange}
                                        disabled={workspacesLoading || workspaces.length === 0}
                                    >
                                        <SelectTrigger className="w-32 md:w-48">
                                            <Building2 className="w-4 h-4 mr-2 hidden md:inline" />
                                            <SelectValue placeholder="Workspace" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {workspaces.map((ws) => (
                                                <SelectItem key={ws.id} value={String(ws.id)}>
                                                    {ws.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {/* Flows Button */}
                                    <Button variant="outline" size="sm" className="bg-white text-black border-green-500 hover:bg-indigo-600 hover:text-white hover:border-indigo-600" onClick={() => navigate('/dashboard/whatsapp/flows')}>
                                        <Workflow className="h-4 w-4 mr-1 md:mr-2" />
                                        <span className="hidden sm:inline">Flows</span>
                                    </Button>
                                    {/* Templates Button */}
                                    <Button variant="outline" size="sm" className="bg-white text-black border-green-500 hover:bg-indigo-600 hover:text-white hover:border-indigo-600" onClick={() => navigate('/dashboard/whatsapp/templates')}>
                                        <FileText className="h-4 w-4 mr-1 md:mr-2" />
                                        <span className="hidden sm:inline">Templates</span>
                                    </Button>
                                    {/* Link WhatsApp (only shown when not linked) */}
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                        onClick={() => navigate('/dashboard/whatsapp/setup')}
                                    >
                                        <LinkIcon className="h-4 w-4 mr-1 md:mr-2" />
                                        <span className="hidden sm:inline">Link WhatsApp</span>
                                        <span className="sm:hidden">Link</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Connect WhatsApp Prompt */}
                    <div className="max-w-2xl mx-auto px-4 py-16">
                        <Card className="border-2 border-dashed border-green-200">
                            <CardContent className="p-8 text-center">
                                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                                    <MessageCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">Connect WhatsApp Business</h2>
                                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                    Link your WhatsApp Business Account to start sending messages, managing conversations, and viewing analytics.
                                </p>
                                <Button
                                    onClick={() => navigate('/dashboard/whatsapp/setup')}
                                    className="bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#128C7E] hover:to-[#075E54] text-white gap-2"
                                >
                                    <MessageCircle className="w-5 h-5" />
                                    Connect WhatsApp Account
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </TooltipProvider>
        );
    }

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
                {/* Header */}
                <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {/* WhatsApp Business title - left side */}
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <MessageCircle className="h-5 w-5 text-green-600" />
                                        {accountName ? (
                                            <span>
                                                <span className="text-green-600">{accountName}'s</span> WhatsApp
                                            </span>
                                        ) : (
                                            'WhatsApp Business'
                                        )}
                                    </h1>
                                    <p className="text-xs text-gray-500 hidden md:block">
                                        {accountPhone && <span className="mr-2">{accountPhone}</span>}
                                        {data?.period_label || 'Analytics Overview'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-end">
                                {/* Workspace selector - right side */}
                                <Select
                                    value={selectedWorkspaceId || ''}
                                    onValueChange={handleWorkspaceChange}
                                    disabled={workspacesLoading || workspaces.length === 0}
                                >
                                    <SelectTrigger className="w-32 md:w-48">
                                        <Building2 className="w-4 h-4 mr-2 hidden md:inline" />
                                        <SelectValue placeholder="Workspace" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {workspaces.map((ws) => (
                                            <SelectItem key={ws.id} value={String(ws.id)}>
                                                {ws.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Flows Button */}
                                <Button variant="outline" size="sm" className="bg-white text-black border-green-500 hover:bg-indigo-600 hover:text-white hover:border-indigo-600" onClick={() => navigate('/dashboard/whatsapp/flows')}>
                                    <Workflow className="h-4 w-4 mr-1 md:mr-2" />
                                    <span className="hidden sm:inline">Flows</span>
                                </Button>

                                {/* Templates Button */}
                                <Button variant="outline" size="sm" className="bg-white text-black border-green-500 hover:bg-indigo-600 hover:text-white hover:border-indigo-600" onClick={() => navigate('/dashboard/whatsapp/templates')}>
                                    <FileText className="h-4 w-4 mr-1 md:mr-2" />
                                    <span className="hidden sm:inline">Templates</span>
                                </Button>

                                {/* Inbox Button */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-white text-black border-green-500 hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
                                    onClick={() => navigate('/dashboard/whatsapp/inbox')}
                                >
                                    <Inbox className="h-4 w-4 mr-1 md:mr-2" />
                                    <span className="hidden sm:inline">Inbox</span>
                                </Button>

                                {/* Settings Button */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-white text-black border-green-500 hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
                                    onClick={() => navigate('/dashboard/whatsapp/settings')}
                                >
                                    <Settings className="h-4 w-4 mr-1 md:mr-2" />
                                    <span className="hidden sm:inline">Settings</span>
                                </Button>

                                {/* Unlink WhatsApp - Red button when connected */}
                                {hasLinkedAccount && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => navigate('/dashboard/whatsapp/settings')}
                                    >
                                        <Unlink className="h-4 w-4 mr-1 md:mr-2" />
                                        <span className="hidden sm:inline">Unlink WhatsApp</span>
                                        <span className="sm:hidden">Unlink</span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Controls Row */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Select value={period} onValueChange={setPeriod}>
                                <SelectTrigger className="w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="7">Last 7 days</SelectItem>
                                    <SelectItem value="14">Last 14 days</SelectItem>
                                    <SelectItem value="30">Last 30 days</SelectItem>
                                    <SelectItem value="90">Last 90 days</SelectItem>
                                    <SelectItem value="all">All time</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="icon" onClick={fetchAnalytics} disabled={loading}>
                                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                            </Button>
                        </div>
                        {hasLinkedAccount ? (
                            <Badge className="text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-md hover:shadow-lg transition-shadow px-3 py-1">
                                <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                                Connected
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="text-xs text-muted-foreground">
                                Not connected
                            </Badge>
                        )}
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center py-16">
                            <div className="flex flex-col items-center gap-4">
                                <RefreshCw className="w-8 h-8 animate-spin text-green-600" />
                                <p className="text-muted-foreground">Loading analytics...</p>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && !loading && (
                        <Card className="border-red-200 bg-red-50">
                            <CardContent className="p-6 text-center">
                                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                                <p className="text-red-700">{error}</p>
                                <Button variant="outline" size="sm" className="mt-4" onClick={fetchAnalytics}>
                                    Retry
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Analytics Content */}
                    {!loading && !error && data && (
                        <div className="space-y-6">
                            {/* Message Stats */}
                            <div>
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <MessageCircle className="w-5 h-5 text-green-600" />
                                    Message Statistics
                                </h2>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <StatCard
                                        title="Messages Sent"
                                        value={data.messages.total_outgoing || 0}
                                        subtitle={`${data.messages.total_incoming || 0} incoming`}
                                        icon={MessageCircle}
                                        color="primary"
                                    />
                                    <StatCard
                                        title="Delivered"
                                        value={data.messages.delivered || 0}
                                        subtitle={`${data.messages.delivery_rate || 0}% delivery rate`}
                                        icon={CheckCheck}
                                        color="green"
                                    />
                                    <StatCard
                                        title="Read"
                                        value={data.messages.read || 0}
                                        subtitle={`${data.messages.read_rate || 0}% read rate`}
                                        icon={Eye}
                                        color="blue"
                                    />
                                    <StatCard
                                        title="Failed"
                                        value={data.messages.failed || 0}
                                        subtitle={`${data.messages.failure_rate || 0}% failure rate`}
                                        icon={AlertCircle}
                                        color="red"
                                    />
                                </div>
                            </div>

                            {/* Conversation Stats */}
                            <div>
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-green-600" />
                                    Conversation Statistics
                                </h2>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <StatCard
                                        title="Conversations"
                                        value={data.conversations.total || 0}
                                        icon={Users}
                                        color="primary"
                                    />
                                    <StatCard
                                        title="Open"
                                        value={data.conversations.open || 0}
                                        icon={MessageCircle}
                                        color="green"
                                    />
                                    <StatCard
                                        title="Active"
                                        value={data.conversations.active_sessions || 0}
                                        subtitle="24h window"
                                        icon={Clock}
                                        color="blue"
                                    />
                                    <StatCard
                                        title="Unread"
                                        value={data.conversations.with_unread || 0}
                                        subtitle="Needs attention"
                                        icon={AlertCircle}
                                        color="yellow"
                                    />
                                </div>
                            </div>

                            {/* Message Funnel */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-green-600" />
                                        Message Funnel
                                    </CardTitle>
                                    <CardDescription>Sent → Delivered → Read progression</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {/* Sent */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium">Sent</span>
                                                <span className="text-sm font-bold">{data.messages.total_outgoing || 0}</span>
                                            </div>
                                            <div className="h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white text-sm font-medium" style={{ width: '100%' }}>
                                                {data.messages.total_outgoing || 0} messages
                                            </div>
                                        </div>
                                        <div className="text-center text-muted-foreground">↓</div>
                                        {/* Delivered */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium">Delivered</span>
                                                <span className="text-sm">
                                                    <span className="font-bold">{data.messages.delivered || 0}</span>
                                                    <span className="text-muted-foreground ml-1">({data.messages.delivery_rate || 0}%)</span>
                                                </span>
                                            </div>
                                            <div
                                                className="h-8 bg-green-500 rounded-lg flex items-center justify-center text-white text-sm font-medium mx-auto"
                                                style={{ width: `${Math.max(20, data.messages.delivery_rate || 0)}%` }}
                                            >
                                                {data.messages.delivered || 0}
                                            </div>
                                        </div>
                                        <div className="text-center text-muted-foreground">↓</div>
                                        {/* Read */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium">Read</span>
                                                <span className="text-sm">
                                                    <span className="font-bold">{data.messages.read || 0}</span>
                                                    <span className="text-muted-foreground ml-1">({data.messages.read_rate || 0}%)</span>
                                                </span>
                                            </div>
                                            <div
                                                className="h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-medium mx-auto"
                                                style={{ width: `${Math.max(15, data.messages.read_rate || 0)}%` }}
                                            >
                                                {data.messages.read || 0}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Quick Actions */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card
                                    className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-200"
                                    onClick={() => navigate('/dashboard/whatsapp/inbox')}
                                >
                                    <CardContent className="p-4 text-center">
                                        <Inbox className="w-8 h-8 mx-auto mb-2 text-green-600" />
                                        <p className="font-medium">Inbox</p>
                                        <p className="text-xs text-muted-foreground">View messages</p>
                                    </CardContent>
                                </Card>
                                <Card
                                    className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-200"
                                    onClick={() => navigate('/dashboard/whatsapp/templates/builder')}
                                >
                                    <CardContent className="p-4 text-center">
                                        <MessageCircle className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                                        <p className="font-medium">Templates</p>
                                        <p className="text-xs text-muted-foreground">Create templates</p>
                                    </CardContent>
                                </Card>
                                <Card
                                    className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-200"
                                    onClick={() => navigate('/dashboard/whatsapp/flows')}
                                >
                                    <CardContent className="p-4 text-center">
                                        <BarChart3 className="w-8 h-8 mx-auto mb-2 text-indigo-600" />
                                        <p className="font-medium">Flows</p>
                                        <p className="text-xs text-muted-foreground">Build flows</p>
                                    </CardContent>
                                </Card>
                                <Card
                                    className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-200"
                                    onClick={() => navigate('/dashboard/whatsapp/analytics')}
                                >
                                    <CardContent className="p-4 text-center">
                                        <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                                        <p className="font-medium">Full Analytics</p>
                                        <p className="text-xs text-muted-foreground">Detailed reports</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* No data state */}
                    {!loading && !error && !data && hasLinkedAccount && (
                        <Card className="border-dashed">
                            <CardContent className="p-8 text-center">
                                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="text-lg font-medium mb-2">No Analytics Data</h3>
                                <p className="text-muted-foreground mb-4">
                                    Start sending messages to see your analytics here.
                                </p>
                                <Button onClick={() => navigate('/dashboard/whatsapp/inbox')}>
                                    Go to Inbox
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}

