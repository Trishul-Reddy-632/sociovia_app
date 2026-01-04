// WhatsApp Analytics Dashboard
// =============================
// Message delivery, template performance, and conversation insights
// Supports both overall analytics and conversation-specific analytics

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    MessageCircle,
    CheckCheck,
    Eye,
    AlertCircle,
    Users,
    User,
    Clock,
    RefreshCw,
    Info,
    Building2,
    Inbox,
    Settings,
    Menu,
    X,
    Target,
    Search,
    Mail,
    Lock,
    Sliders,
} from 'lucide-react';
import logo from '@/assets/sociovia_logo.png';
import { cn } from '@/lib/utils';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';
import { API_BASE_URL } from "@/config";

const API_BASE = API_BASE_URL;

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

interface TemplateStats {
    template_name: string;
    total_sent: number;
    delivered: number;
    read: number;
    failed: number;
    delivery_rate: number;
    read_rate: number;
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
    templates: TemplateStats[];
    conversations: ConversationStats;
}

// Tooltip descriptions for each metric
const METRIC_INFO: Record<string, string> = {
    'Messages Sent': 'Total number of messages you sent to customers via WhatsApp in this period. Includes text, templates, and media messages.',
    'Delivered': 'Number of messages that successfully reached the customer\'s device. The percentage below shows your delivery rate.',
    'Read': 'Number of delivered messages that were opened and read by customers. The percentage below shows your read engagement rate.',
    'Failed': 'Messages that failed to send due to invalid numbers, blocked users, or API errors. Check error details in the inbox.',
    'Total Conversations': 'Unique customers you have exchanged messages with. Each phone number represents one conversation.',
    'Open Conversations': 'Conversations that are currently active and not marked as closed by your team.',
    'Active Sessions': 'Conversations where the customer messaged within the last 24 hours. You can send free-form messages during this window.',
    'Unread': 'Conversations with messages you haven\'t read yet. These need your attention.',
};

// Workspace type
interface Workspace {
    id: number;
    name: string;
    logo?: string;
}

export function WhatsAppAnalytics() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Check if we're viewing conversation-specific analytics
    const conversationIdParam = searchParams.get('conversation');
    const conversationId = conversationIdParam ? parseInt(conversationIdParam, 10) : null;
    const isConversationView = conversationId !== null && !isNaN(conversationId);

    // Workspace state
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
    const [workspacesLoading, setWorkspacesLoading] = useState(true);

    // WhatsApp account linked state
    const [hasLinkedAccount, setHasLinkedAccount] = useState<boolean | null>(null);
    const [checkingAccount, setCheckingAccount] = useState(false);

    // Overall analytics state
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [categoryData, setCategoryData] = useState<Record<string, {
        category: string;
        total_sent: number;
        delivered: number;
        read: number;
        failed: number;
        delivery_rate: number;
        read_rate: number;
        failure_rate: number;
    }> | null>(null);

    // Conversation-specific analytics state (matches actual API response)
    const [conversationData, setConversationData] = useState<{
        conversation_id: number;
        session: {
            is_open: boolean;
            expires_at: string | null;
            time_left_seconds: number;
            close_reason: string | null;
            closed_by_agent: boolean;
            closed_at: string | null;
        };
        messages: {
            total: number;
            incoming: number;
            outgoing: number;
            delivered: number;
            read: number;
            failed: number;
        };
        templates_used: Array<{
            name: string;
            count: number;
            category: string | null;
        }>;
    } | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState('7');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<'utility' | 'marketing' | 'authentication'>('utility');

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
                const storedWs = localStorage.getItem('sv_whatsapp_workspace_id') || sessionStorage.getItem('sv_whatsapp_workspace_id');
                if (storedWs && mapped.some((w: Workspace) => w.id === Number(storedWs))) {
                    setSelectedWorkspaceId(storedWs);
                } else if (mapped.length > 0) {
                    const firstWsId = String(mapped[0].id);
                    setSelectedWorkspaceId(firstWsId);
                    // Store the initial workspace ID so other pages can use it
                    localStorage.setItem('sv_whatsapp_workspace_id', firstWsId);
                    sessionStorage.setItem('sv_whatsapp_workspace_id', firstWsId);
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
        sessionStorage.setItem('sv_whatsapp_workspace_id', wsId);
        setHasLinkedAccount(null); // Reset account check on workspace change
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
                const res = await fetch(`${API_BASE}/api/whatsapp/accounts?workspace_id=${selectedWorkspaceId}`, {
                    credentials: 'include',
                });
                const json = await res.json();
                const accounts = json.accounts || [];
                const hasActive = accounts.some((acc: any) => acc.is_active);
                setHasLinkedAccount(hasActive);
            } catch (err) {
                console.error('Failed to check linked account:', err);
                setHasLinkedAccount(false);
            } finally {
                setCheckingAccount(false);
            }
        };
        checkLinkedAccount();
    }, [selectedWorkspaceId]);

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

            if (isConversationView) {
                // Fetch conversation-specific analytics
                const res = await fetch(`${API_BASE}/api/whatsapp/analytics/conversations/${conversationId}?days=${period}&workspace_id=${selectedWorkspaceId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: 'include',
                });
                const json = await res.json();
                if (json.success) {
                    setConversationData(json);
                } else {
                    setError(json.error || 'Failed to load conversation analytics');
                }
            } else {
                // Build query params
                let queryParams = '';
                if (period === 'custom' && startDate && endDate) {
                    queryParams = `start_date=${startDate}&end_date=${endDate}`;
                } else if (period === 'all') {
                    queryParams = 'days=0';  // 0 means all time
                } else {
                    queryParams = `days=${period}`;
                }

                // Fetch overall analytics with workspace_id
                const wsParam = `workspace_id=${selectedWorkspaceId}`;
                const [analyticsRes, categoryRes] = await Promise.all([
                    fetch(`${API_BASE}/api/whatsapp/analytics?${queryParams}&${wsParam}`, {
                        headers: { Authorization: `Bearer ${token}` },
                        credentials: 'include',
                    }),
                    fetch(`${API_BASE}/api/whatsapp/analytics/categories?${queryParams}&${wsParam}`, {
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
    }, [period, conversationId, startDate, endDate, selectedWorkspaceId, hasLinkedAccount]);

    // Info tooltip component with beautiful animation
    const InfoTooltip = ({ metric }: { metric: string }) => {
        const description = METRIC_INFO[metric] || 'No description available.';

        return (
            <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                    <button className="group relative ml-1.5 -mt-0.5 inline-flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-primary/20 scale-0 group-hover:scale-150 transition-transform duration-300 ease-out" />
                        <Info className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors duration-200 relative z-10" />
                    </button>
                </TooltipTrigger>
                <TooltipContent
                    side="top"
                    className="max-w-xs bg-popover/95 backdrop-blur-sm border shadow-xl animate-in fade-in-0 zoom-in-95 duration-200"
                    sideOffset={8}
                >
                    <div className="flex items-start gap-2 p-1">
                        <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm leading-relaxed">{description}</p>
                    </div>
                </TooltipContent>
            </Tooltip>
        );
    };

    const StatCard = ({
        title,
        value,
        subtitle,
        icon: Icon,
        trend,
        color = 'primary',
    }: {
        title: string;
        value: string | number;
        subtitle?: string;
        icon: typeof MessageCircle;
        trend?: 'up' | 'down' | 'neutral';
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
                <CardContent className="relative p-3 md:p-6">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs md:text-sm font-medium text-muted-foreground flex items-center truncate">
                                {title}
                                <span className="hidden md:inline"><InfoTooltip metric={title} /></span>
                            </p>
                            <p className="text-xl md:text-3xl font-bold mt-0.5 md:mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                            {subtitle && <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1 truncate">{subtitle}</p>}
                        </div>
                        <div className={cn(
                            'p-2 md:p-3 rounded-full transition-transform duration-300 group-hover:scale-110 shrink-0',
                            colorClasses[color].replace('text-', 'bg-').split(' ')[0]
                        )}>
                            <Icon className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                    </div>
                    {trend && (
                        <div className="mt-2 md:mt-3 flex items-center gap-1 text-sm">
                            {trend === 'up' ? (
                                <TrendingUp className="w-4 h-4 text-green-500" />
                            ) : trend === 'down' ? (
                                <TrendingDown className="w-4 h-4 text-red-500" />
                            ) : null}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    const ProgressBar = ({ value, color }: { value: number; color: string }) => (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
                className={cn('h-full transition-all duration-500', color)}
                style={{ width: `${Math.min(value, 100)}%` }}
            />
        </div>
    );

    // Show checking account state
    if (checkingAccount) {
        return (
            <div className="min-h-screen bg-background p-6 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Checking WhatsApp account...</p>
                </div>
            </div>
        );
    }

    // Show no account linked state
    if (hasLinkedAccount === false) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
                {/* Sidebar Overlay */}
                {sidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
                
                {/* Slide-in Sidebar */}
                <div className={cn(
                    "fixed top-0 left-0 h-full w-72 bg-background border-r z-50 transform transition-transform duration-300 ease-in-out",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    <div className="p-4 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <img src={logo} alt="Sociovia" className="w-6 h-6" />
                            <span className="font-semibold">Analytics</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                    
                    <div className="p-3 space-y-1">
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Analytics</div>
                        <button onClick={() => { window.location.href = '/dashboard'; }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left">
                            <Target className="w-4 h-4 text-[#0081FB]" />
                            <span className="text-sm">Meta Ads Analytics</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary font-medium transition-colors text-left relative">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-full" />
                            <MessageCircle className="w-4 h-4 text-[#25D366]" />
                            <span className="text-sm">WhatsApp Analytics</span>
                        </button>
                        <button onClick={() => { navigate('/dashboard?view=google'); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left">
                            <Search className="w-4 h-4 text-[#4285F4]" />
                            <span className="text-sm flex-1">Google Analytics</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Soon</Badge>
                        </button>
                        <button onClick={() => { navigate('/dashboard?view=email'); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left">
                            <Mail className="w-4 h-4 text-[#EA4335]" />
                            <span className="text-sm flex-1">Email Analytics</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Soon</Badge>
                        </button>
                        <div className="my-3 border-t" />
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Management</div>
                        <button onClick={() => { navigate('/dashboard/whatsapp/settings'); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left">
                            <Settings className="w-4 h-4" />
                            <span className="text-sm">Settings</span>
                        </button>
                        <button onClick={() => { navigate('/dashboard/whatsapp/settings'); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left">
                            <Sliders className="w-4 h-4" />
                            <span className="text-sm">Manage</span>
                        </button>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto">
                    {/* Header with workspace selector */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                                <Menu className="w-5 h-5" />
                            </Button>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                                    <img src={logo} alt="Sociovia" className="w-5 h-5 md:w-6 md:h-6" />
                                    WhatsApp Analytics
                                </h1>
                                <p className="text-muted-foreground text-xs md:text-sm">Select workspace to view analytics</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 ml-12 md:ml-0">
                            {/* Workspace Dropdown */}
                            <Select
                                value={selectedWorkspaceId || ''}
                                onValueChange={handleWorkspaceChange}
                                disabled={workspacesLoading || workspaces.length === 0}
                            >
                                <SelectTrigger className="w-full md:w-48">
                                    <Building2 className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder={workspacesLoading ? 'Loading...' : 'Select Workspace'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {workspaces.map((ws) => (
                                        <SelectItem key={ws.id} value={String(ws.id)}>
                                            {ws.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* No Account Card */}
                    <Card className="max-w-lg mx-auto">
                        <CardContent className="p-8 text-center">
                            <MessageCircle className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold mb-2">No WhatsApp Account Linked</h2>
                            <p className="text-muted-foreground mb-6">
                                Connect your WhatsApp Business account for workspace "{workspaces.find(w => String(w.id) === selectedWorkspaceId)?.name || 'this workspace'}" to view analytics.
                            </p>
                            <div className="flex flex-col gap-3">
                                <Button onClick={() => navigate('/dashboard/whatsapp/settings')} className="gap-2 w-full">
                                    <MessageCircle className="w-4 h-4" />
                                    Connect WhatsApp Account
                                </Button>
                                <Button variant="outline" onClick={() => navigate('/dashboard/whatsapp/inbox')} className="gap-2 w-full">
                                    <Inbox className="w-4 h-4" />
                                    Go to Inbox
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background p-6 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background p-6 flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="p-6 text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-lg font-semibold mb-2">Failed to load analytics</h2>
                        <p className="text-muted-foreground mb-4">{error}</p>
                        <Button onClick={fetchAnalytics}>Try Again</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Conversation-specific analytics view
    if (isConversationView && conversationData) {
        // Calculate rates from raw counts
        const deliveryRate = conversationData.messages.outgoing > 0
            ? Math.round((conversationData.messages.delivered / conversationData.messages.outgoing) * 100)
            : 0;
        const readRate = conversationData.messages.outgoing > 0
            ? Math.round((conversationData.messages.read / conversationData.messages.outgoing) * 100)
            : 0;
        const templateCount = conversationData.templates_used?.reduce((acc, t) => acc + t.count, 0) || 0;

        return (
            <TooltipProvider>
                <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4 md:p-6">
                    {/* Sidebar Overlay */}
                    {sidebarOpen && (
                        <div 
                            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}
                    
                    {/* Slide-in Sidebar */}
                    <div className={cn(
                        "fixed top-0 left-0 h-full w-72 bg-background border-r z-50 transform transition-transform duration-300 ease-in-out",
                        sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    )}>
                        <div className="p-4 border-b flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <img src={logo} alt="Sociovia" className="w-6 h-6" />
                                <span className="font-semibold">Analytics</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                        
                        <div className="p-3 space-y-1">
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Analytics</div>
                            <button onClick={() => { window.location.href = '/dashboard'; }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left">
                                <Target className="w-4 h-4 text-[#0081FB]" />
                                <span className="text-sm">Meta Ads Analytics</span>
                            </button>
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary font-medium transition-colors text-left relative">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-full" />
                                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                                <span className="text-sm">WhatsApp Analytics</span>
                            </button>
                            <button onClick={() => { navigate('/dashboard?view=google'); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left">
                                <Search className="w-4 h-4 text-[#4285F4]" />
                                <span className="text-sm flex-1">Google Analytics</span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Soon</Badge>
                            </button>
                            <button onClick={() => { navigate('/dashboard?view=email'); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left">
                                <Mail className="w-4 h-4 text-[#EA4335]" />
                                <span className="text-sm flex-1">Email Analytics</span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Soon</Badge>
                            </button>
                            <div className="my-3 border-t" />
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Management</div>
                            <button onClick={() => { navigate('/dashboard/whatsapp/settings'); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left">
                                <Settings className="w-4 h-4" />
                                <span className="text-sm">Settings</span>
                            </button>
                            <button onClick={() => { navigate('/dashboard/whatsapp/settings'); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left">
                                <Sliders className="w-4 h-4" />
                                <span className="text-sm">Manage</span>
                            </button>
                        </div>
                    </div>

                    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
                        {/* Header with Menu Button */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 md:gap-4">
                                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                                    <Menu className="w-5 h-5" />
                                </Button>
                                <div>
                                    <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2">
                                        <img src={logo} alt="Sociovia" className="w-5 h-5 md:w-6 md:h-6" />
                                        Chat Analytics
                                    </h1>
                                    <p className="text-xs md:text-sm text-muted-foreground">
                                        Conversation #{conversationData.conversation_id}
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="ml-12 md:ml-0 w-fit" onClick={() => navigate('/dashboard/whatsapp/analytics')}>
                                View Overall Analytics
                            </Button>
                        </div>

                        {/* Session Info Card */}
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    Session Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4">
                                    <Badge variant={conversationData.session.is_open ? 'default' : 'secondary'}>
                                        {conversationData.session.is_open ? '🟢 Active Session' : '⚪ Session Expired'}
                                    </Badge>
                                    {conversationData.session.is_open && (
                                        <span className="text-sm text-muted-foreground">
                                            {Math.floor(conversationData.session.time_left_seconds / 3600)}h {Math.floor((conversationData.session.time_left_seconds % 3600) / 60)}m left
                                        </span>
                                    )}
                                    {conversationData.session.closed_by_agent && (
                                        <Badge variant="destructive">Closed by agent</Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Message Stats */}
                        <Card>
                            <CardHeader>
                                <CardTitle>📨 Message Statistics</CardTitle>
                                <CardDescription>Messages sent and received in this conversation</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-4 bg-muted/30 rounded-lg text-center">
                                        <p className="text-3xl font-bold">{conversationData.messages.total}</p>
                                        <p className="text-sm text-muted-foreground">Total Messages</p>
                                    </div>
                                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-center">
                                        <p className="text-3xl font-bold text-blue-600">{conversationData.messages.incoming}</p>
                                        <p className="text-sm text-muted-foreground">Received</p>
                                    </div>
                                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg text-center">
                                        <p className="text-3xl font-bold text-green-600">{conversationData.messages.outgoing}</p>
                                        <p className="text-sm text-muted-foreground">Sent</p>
                                    </div>
                                    <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg text-center">
                                        <p className="text-3xl font-bold text-purple-600">{templateCount}</p>
                                        <p className="text-sm text-muted-foreground">Templates</p>
                                    </div>
                                </div>


                                {/* Mini Message Flow Chart */}
                                <div className="mt-6">
                                    <ResponsiveContainer width="100%" height={180}>
                                        <BarChart
                                            data={[
                                                { name: 'Incoming', value: conversationData.messages.incoming, fill: '#3b82f6' },
                                                { name: 'Outgoing', value: conversationData.messages.outgoing, fill: '#22c55e' },
                                                { name: 'Delivered', value: conversationData.messages.delivered, fill: '#10b981' },
                                                { name: 'Read', value: conversationData.messages.read, fill: '#6366f1' },
                                            ]}
                                            margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} />
                                            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                                            <RechartsTooltip
                                                contentStyle={{
                                                    backgroundColor: 'white',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                }}
                                            />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                {[
                                                    { fill: '#3b82f6' },
                                                    { fill: '#22c55e' },
                                                    { fill: '#10b981' },
                                                    { fill: '#6366f1' },
                                                ].map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Templates Used */}
                        {conversationData.templates_used && conversationData.templates_used.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>📝 Templates Used</CardTitle>
                                    <CardDescription>Template messages sent in this conversation</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {conversationData.templates_used.map((t, idx) => (
                                            <div key={idx} className="p-3 bg-muted/30 rounded-lg flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{t.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Sent {t.count}x {t.category && `• Category: ${t.category}`}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </TooltipProvider>
        );
    }

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4 md:p-6">
                {/* Sidebar Overlay */}
                {sidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
                
                {/* Slide-in Sidebar */}
                <div className={cn(
                    "fixed top-0 left-0 h-full w-72 bg-background border-r z-50 transform transition-transform duration-300 ease-in-out",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    <div className="p-4 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <img src={logo} alt="Sociovia" className="w-6 h-6" />
                            <span className="font-semibold">Analytics</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                    
                    <div className="p-3 space-y-1">
                        {/* Analytics Section */}
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Analytics
                        </div>
                        
                        {/* Meta Ads Analytics */}
                        <button 
                            onClick={() => { window.location.href = '/dashboard'; }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                        >
                            <Target className="w-4 h-4 text-[#0081FB]" />
                            <span className="text-sm">Meta Ads Analytics</span>
                        </button>
                        
                        {/* WhatsApp Analytics - Active */}
                        <button 
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary font-medium transition-colors text-left relative"
                        >
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-full" />
                            <MessageCircle className="w-4 h-4 text-[#25D366]" />
                            <span className="text-sm">WhatsApp Analytics</span>
                        </button>
                        
                        {/* Google Analytics - Coming Soon */}
                        <button 
                            onClick={() => { navigate('/dashboard?view=google'); setSidebarOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                        >
                            <Search className="w-4 h-4 text-[#4285F4]" />
                            <span className="text-sm flex-1">Google Analytics</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Soon</Badge>
                        </button>
                        
                        {/* Email Analytics - Coming Soon */}
                        <button 
                            onClick={() => { navigate('/dashboard?view=email'); setSidebarOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                        >
                            <Mail className="w-4 h-4 text-[#EA4335]" />
                            <span className="text-sm flex-1">Email Analytics</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Soon</Badge>
                        </button>
                        
                        {/* Divider */}
                        <div className="my-3 border-t" />
                        
                        {/* Management Section */}
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Management
                        </div>
                        
                        {/* Settings */}
                        <button 
                            onClick={() => { navigate('/dashboard/whatsapp/settings'); setSidebarOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                        >
                            <Settings className="w-4 h-4" />
                            <span className="text-sm">Settings</span>
                        </button>
                        
                        {/* Manage */}
                        <button 
                            onClick={() => { navigate('/dashboard/whatsapp/settings'); setSidebarOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                        >
                            <Sliders className="w-4 h-4" />
                            <span className="text-sm">Manage</span>
                        </button>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
                    {/* Header - Desktop */}
                    <div className="hidden md:flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                                <Menu className="w-5 h-5" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold flex items-center gap-2">
                                    <img src={logo} alt="Sociovia" className="w-6 h-6" />
                                    WhatsApp Analytics
                                </h1>
                                <p className="text-muted-foreground text-sm">{data?.period_label || 'Performance'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Period Dropdown */}
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
                                    <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Custom date range picker */}
                            {period === 'custom' && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="px-2 py-1 text-sm border rounded-md bg-background w-32"
                                    />
                                    <span className="text-muted-foreground text-sm">to</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="px-2 py-1 text-sm border rounded-md bg-background w-32"
                                    />
                                </div>
                            )}

                            <Button variant="outline" size="icon" onClick={fetchAnalytics}>
                                <RefreshCw className="w-4 h-4" />
                            </Button>

                            <div className="h-6 w-px bg-border" />

                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => navigate('/dashboard/whatsapp/inbox')}
                            >
                                <Inbox className="w-4 h-4 mr-2" />
                                Inbox
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/dashboard/whatsapp/settings')}
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Settings
                            </Button>

                            <div className="h-6 w-px bg-border" />

                            {/* Workspace dropdown */}
                            <Select
                                value={selectedWorkspaceId || ''}
                                onValueChange={handleWorkspaceChange}
                                disabled={workspacesLoading || workspaces.length === 0}
                            >
                                <SelectTrigger className="w-48">
                                    <Building2 className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder={workspacesLoading ? 'Loading...' : 'Workspace'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {workspaces.map((ws) => (
                                        <SelectItem key={ws.id} value={String(ws.id)}>
                                            {ws.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Header - Mobile */}
                    <div className="md:hidden space-y-3">
                        {/* Top row: Menu, Title, Workspace */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-9 w-9 shrink-0" 
                                    onClick={() => setSidebarOpen(true)}
                                >
                                    <Menu className="w-5 h-5" />
                                </Button>
                                <div>
                                    <h1 className="text-base font-bold flex items-center gap-1.5">
                                        <img src={logo} alt="Sociovia" className="w-5 h-5" />
                                        WhatsApp Analytics
                                    </h1>
                                    <p className="text-muted-foreground text-[10px]">{data?.period_label || 'Last 7 days'}</p>
                                </div>
                            </div>
                            {/* Workspace dropdown */}
                            <Select
                                value={selectedWorkspaceId || ''}
                                onValueChange={handleWorkspaceChange}
                                disabled={workspacesLoading || workspaces.length === 0}
                            >
                                <SelectTrigger className="w-28 h-8 text-xs">
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
                        </div>
                        
                        {/* Controls row */}
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                {/* Period Dropdown */}
                                <Select value={period} onValueChange={setPeriod}>
                                    <SelectTrigger className="w-24 h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="7">7 days</SelectItem>
                                        <SelectItem value="14">14 days</SelectItem>
                                        <SelectItem value="30">30 days</SelectItem>
                                        <SelectItem value="90">90 days</SelectItem>
                                        <SelectItem value="all">All</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchAnalytics}>
                                    <RefreshCw className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Quick action icons */}
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => navigate('/dashboard/whatsapp/inbox')}
                                    title="Inbox"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => navigate('/dashboard/whatsapp/settings')}
                                    title="Settings"
                                >
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Message Overview */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        <StatCard
                            title="Messages Sent"
                            value={data?.messages.total_outgoing || 0}
                            subtitle={`${data?.messages.total_incoming || 0} incoming`}
                            icon={MessageCircle}
                            color="primary"
                        />
                        <StatCard
                            title="Delivered"
                            value={data?.messages.delivered || 0}
                            subtitle={`${data?.messages.delivery_rate || 0}% delivery rate`}
                            icon={CheckCheck}
                            color="green"
                        />
                        <StatCard
                            title="Read"
                            value={data?.messages.read || 0}
                            subtitle={`${data?.messages.read_rate || 0}% read rate`}
                            icon={Eye}
                            color="blue"
                        />
                        <StatCard
                            title="Failed"
                            value={data?.messages.failed || 0}
                            subtitle={`${data?.messages.failure_rate || 0}% failure rate`}
                            icon={AlertCircle}
                            color="red"
                        />
                    </div>

                    {/* Conversation Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        <StatCard
                            title="Conversations"
                            value={data?.conversations.total || 0}
                            icon={Users}
                            color="primary"
                        />
                        <StatCard
                            title="Open"
                            value={data?.conversations.open || 0}
                            icon={MessageCircle}
                            color="green"
                        />
                        <StatCard
                            title="Active"
                            value={data?.conversations.active_sessions || 0}
                            subtitle="24h window"
                            icon={Clock}
                            color="blue"
                        />
                        <StatCard
                            title="Unread"
                            value={data?.conversations.with_unread || 0}
                            subtitle="Attention"
                            icon={AlertCircle}
                            color="yellow"
                        />
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Message Flow Funnel */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-primary" />
                                    Message Funnel
                                </CardTitle>
                                <CardDescription>Sent → Delivered → Read drop-off</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Sent */}
                                    <div className="relative">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium">Sent</span>
                                            <span className="text-sm font-bold">{data?.messages.total_outgoing || 0}</span>
                                        </div>
                                        <div className="h-10 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-semibold" style={{ width: '100%' }}>
                                            {data?.messages.total_outgoing || 0} messages
                                        </div>
                                    </div>
                                    {/* Arrow */}
                                    <div className="text-center text-muted-foreground text-xl">↓</div>
                                    {/* Delivered */}
                                    <div className="relative">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium">Delivered</span>
                                            <span className="text-sm">
                                                <span className="font-bold">{data?.messages.delivered || 0}</span>
                                                <span className="text-muted-foreground ml-1">({data?.messages.delivery_rate || 0}%)</span>
                                            </span>
                                        </div>
                                        <div
                                            className="h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-semibold mx-auto"
                                            style={{ width: `${Math.max(20, data?.messages.delivery_rate || 0)}%` }}
                                        >
                                            {data?.messages.delivered || 0}
                                        </div>
                                    </div>
                                    {/* Arrow */}
                                    <div className="text-center text-muted-foreground text-xl">↓</div>
                                    {/* Read */}
                                    <div className="relative">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium">Read</span>
                                            <span className="text-sm">
                                                <span className="font-bold">{data?.messages.read || 0}</span>
                                                <span className="text-muted-foreground ml-1">({data?.messages.read_rate || 0}%)</span>
                                            </span>
                                        </div>
                                        <div
                                            className="h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-semibold mx-auto"
                                            style={{ width: `${Math.max(15, data?.messages.read_rate || 0)}%` }}
                                        >
                                            {data?.messages.read || 0}
                                        </div>
                                    </div>
                                    {/* Failed section */}
                                    {(data?.messages.failed || 0) > 0 && (
                                        <>
                                            <div className="text-center text-muted-foreground text-xl">↓</div>
                                            <div className="relative">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-medium text-red-600">Failed</span>
                                                    <span className="text-sm">
                                                        <span className="font-bold text-red-600">{data?.messages.failed || 0}</span>
                                                        <span className="text-muted-foreground ml-1">({data?.messages.failure_rate || 0}%)</span>
                                                    </span>
                                                </div>
                                                <div
                                                    className="h-10 bg-red-500 rounded-lg flex items-center justify-center text-white font-semibold mx-auto"
                                                    style={{ width: `${Math.max(10, data?.messages.failure_rate || 0)}%` }}
                                                >
                                                    {data?.messages.failed || 0}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Conversation Breakdown Donut Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-primary" />
                                    Conversation Breakdown
                                </CardTitle>
                                <CardDescription>Status distribution of conversations</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Open', value: data?.conversations.open || 0, color: '#22c55e' },
                                                { name: 'Active Sessions', value: data?.conversations.active_sessions || 0, color: '#3b82f6' },
                                                { name: 'Unread', value: data?.conversations.with_unread || 0, color: '#f59e0b' },
                                                { name: 'Closed', value: Math.max(0, (data?.conversations.total || 0) - (data?.conversations.open || 0)), color: '#9ca3af' },
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {[
                                                { name: 'Open', color: '#22c55e' },
                                                { name: 'Active Sessions', color: '#3b82f6' },
                                                { name: 'Unread', color: '#f59e0b' },
                                                { name: 'Closed', color: '#9ca3af' },
                                            ].map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            contentStyle={{
                                                backgroundColor: 'white',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                            }}
                                            formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            formatter={(value: string) => <span className="text-sm text-gray-600">{value}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Category Breakdown */}
                    {categoryData && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    📊 Category Breakdown
                                </CardTitle>
                                <CardDescription>Template performance by category (Utility / Marketing / Authentication)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Category Tabs - scrollable on mobile */}
                                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                                    {(['utility', 'marketing', 'authentication'] as const).map((cat) => (
                                        <button
                                            key={cat}
                                            onClick={() => setActiveCategory(cat)}
                                            className={cn(
                                                'px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0',
                                                activeCategory === cat
                                                    ? 'bg-primary text-primary-foreground shadow-md'
                                                    : 'bg-muted hover:bg-muted/80'
                                            )}
                                        >
                                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                            <span className="ml-1 md:ml-2 text-xs opacity-70">
                                                ({categoryData[cat]?.total_sent || 0})
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Category Stats */}
                                {categoryData[activeCategory] && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                                        <div className="p-3 md:p-4 bg-muted/30 rounded-lg">
                                            <p className="text-xs md:text-sm text-muted-foreground mb-1">Total Sent</p>
                                            <p className="text-lg md:text-2xl font-bold">{categoryData[activeCategory].total_sent}</p>
                                        </div>
                                        <div className="p-3 md:p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                            <p className="text-xs md:text-sm text-muted-foreground mb-1">Delivery Rate</p>
                                            <p className="text-lg md:text-2xl font-bold text-green-600">{categoryData[activeCategory].delivery_rate}%</p>
                                            <p className="text-[10px] md:text-xs text-muted-foreground">{categoryData[activeCategory].delivered} delivered</p>
                                        </div>
                                        <div className="p-3 md:p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                            <p className="text-xs md:text-sm text-muted-foreground mb-1">Read Rate</p>
                                            <p className="text-lg md:text-2xl font-bold text-blue-600">{categoryData[activeCategory].read_rate}%</p>
                                            <p className="text-[10px] md:text-xs text-muted-foreground">{categoryData[activeCategory].read} read</p>
                                        </div>
                                        <div className="p-3 md:p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                                            <p className="text-xs md:text-sm text-muted-foreground mb-1">Failed</p>
                                            <p className="text-lg md:text-2xl font-bold text-red-600">{categoryData[activeCategory].failed}</p>
                                            <p className="text-[10px] md:text-xs text-muted-foreground">{categoryData[activeCategory].failure_rate}% failure</p>
                                        </div>
                                    </div>
                                )}

                                {!categoryData[activeCategory]?.total_sent && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No {activeCategory} templates sent in the last {period} days
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}



                    {/* Template Performance */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                📝 Template Performance
                                <Tooltip delayDuration={200}>
                                    <TooltipTrigger asChild>
                                        <button className="group relative inline-flex items-center justify-center">
                                            <div className="absolute inset-0 rounded-full bg-primary/20 scale-0 group-hover:scale-150 transition-transform duration-300 ease-out" />
                                            <Info className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors duration-200 relative z-10" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-sm bg-popover/95 backdrop-blur-sm">
                                        <p className="text-sm">
                                            Shows delivery and read rates for each WhatsApp template message you've sent.
                                            Templates are pre-approved message formats used for business notifications,
                                            marketing, and customer service.
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </CardTitle>
                            <CardDescription>Delivery and read rates by template</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data?.templates && data.templates.length > 0 ? (
                                <div className="space-y-4">
                                    {data.templates.map((t) => (
                                        <div key={t.template_name} className="p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <h4 className="font-medium">{t.template_name}</h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        {t.total_sent} sent • {t.delivered} delivered • {t.read} read
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {t.failed > 0 && (
                                                        <Badge variant="destructive" className="text-xs">
                                                            {t.failed} failed
                                                        </Badge>
                                                    )}
                                                    <Badge
                                                        variant={t.delivery_rate >= 90 ? 'default' : t.delivery_rate >= 70 ? 'secondary' : 'destructive'}
                                                    >
                                                        {t.delivery_rate}% delivered
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-muted-foreground">Delivery Rate</span>
                                                        <span className="font-medium">{t.delivery_rate}%</span>
                                                    </div>
                                                    <ProgressBar value={t.delivery_rate} color="bg-green-500" />
                                                </div>
                                                <div>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-muted-foreground">Read Rate</span>
                                                        <span className="font-medium">{t.read_rate}%</span>
                                                    </div>
                                                    <ProgressBar value={t.read_rate} color="bg-blue-500" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                                        <BarChart3 className="w-8 h-8 opacity-50" />
                                    </div>
                                    <p className="font-medium">No template messages sent yet</p>
                                    <p className="text-sm mt-1">
                                        When you send template messages (like order confirmations, notifications, etc.),
                                        their performance will appear here.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Info */}
                    <Card className="bg-muted/30 border-dashed">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <BarChart3 className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-medium">About These Metrics</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        All data is sourced from WhatsApp webhooks. Delivery and read rates only track YOUR outgoing messages.
                                        WhatsApp does not provide read receipts for incoming messages.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TooltipProvider>
    );
}

export default WhatsAppAnalytics;
