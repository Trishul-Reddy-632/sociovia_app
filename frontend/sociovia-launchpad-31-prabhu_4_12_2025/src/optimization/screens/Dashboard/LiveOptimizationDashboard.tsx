
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Activity, ShieldCheck, Zap, PauseCircle, Settings, ChevronRight, LayoutDashboard, Scale } from 'lucide-react';
import { useOptimization } from '../../context/OptimizationContext';
import { motion, AnimatePresence } from 'framer-motion';

// Sub-components
import CampaignDetailView from './components/CampaignDetailView';
import { RiskMeter } from './components/RiskMeter';
import TraceLogViewer from './components/TraceLogViewer';
import AnalyticsSection from './components/AnalyticsSection';
import { AgentVote, AgentID, SafetyScoreMetrics, CommandCenterMetrics } from '../../types';

// Hooks
import {
    useOptimizationCampaigns,
    useOptimizationActivity,
    useSafetyMetrics,
    useCommandCenterMetrics,
    useDecisionTraces,
    useRegisterOptimizer
} from '@/hooks/useOptimizationQueries';

export default function LiveOptimizationDashboard() {
    const { config } = useOptimization();
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

    // React Query Hooks
    const { data: campaigns = [], isLoading: loadingCampaigns } = useOptimizationCampaigns();
    const { data: activities = [], isLoading: loadingActivities } = useOptimizationActivity();
    const { data: safetyMetrics } = useSafetyMetrics();
    const { data: commandMetrics, dataUpdatedAt } = useCommandCenterMetrics();
    const { data: traces = [] } = useDecisionTraces();
    const registerMutation = useRegisterOptimizer();

    // Derived state for latest votes
    const latestVotes = React.useMemo(() => {
        if (!traces || traces.length === 0) return [];

        const latest = traces[0];
        const mapAgentName = (name: string): AgentID => {
            const n = (name || '').toLowerCase();
            if (n.includes('policy')) return 'policy';
            if (n.includes('risk')) return 'risk';
            if (n.includes('budget')) return 'budget';
            if (n.includes('trend')) return 'trend';
            return 'risk'; // Fallback
        };

        return latest.votes?.map((v: any) => ({
            agentId: mapAgentName(v.agent),
            vote: v.action === 'HOLD' ? 'MONITOR' : v.action,
            confidence: v.confidence || 0.9,
            reason: v.reason || 'No reason provided'
        })) || [];
    }, [traces]);

    const loading = loadingCampaigns && loadingActivities;

    if (selectedCampaignId) {
        return (
            <div className="container mx-auto py-8 max-w-7xl px-4">
                <CampaignDetailView
                    campaignId={selectedCampaignId}
                    onBack={() => setSelectedCampaignId(null)}
                />
            </div>
        )
    }

    // Start Optimization Handler
    const handleStartOptimizer = async () => {
        registerMutation.mutateAsync().then(() => {
            // Wait a sec for backend to spin up then reload to refresh persistence
            setTimeout(() => window.location.reload(), 2000);
        });
    };

    if (loading) {
        return <div className="p-12 text-center text-slate-500">Loading Command Center...</div>;
    }

    if (!loading && campaigns.length === 0 && activities.length === 0) {
        return <EmptyState onStart={handleStartOptimizer} processing={registerMutation.isPending} />;
    }

    return (
        <div className="container mx-auto py-8 max-w-7xl px-4 space-y-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900">
                        <LayoutDashboard className="w-8 h-8 text-slate-800" />
                        Live Command Center
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={`text-green-600 border-green-200 bg-green-50 ${commandMetrics?.active_status ? 'animate-pulse' : ''}`}>
                            ● {commandMetrics?.active_status ? 'System Active' : 'System Idle'}
                        </Badge>
                        <span className="text-slate-400 text-sm">Last decision: {commandMetrics?.last_decision_time ? new Date(commandMetrics.last_decision_time).toLocaleTimeString() : '2m ago'}</span>
                    </div>
                </div>

                <Card className="bg-slate-900 text-white border-0 shadow-xl">
                    <CardContent className="p-4 flex items-center gap-6">
                        <div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Current Mode</div>
                            <div className="font-bold text-lg capitalize flex items-center gap-2 mt-1">
                                {config.mode === 'defensive' && <ShieldCheck className="w-5 h-5 text-emerald-400" />}
                                {config.mode === 'balanced' && <Activity className="w-5 h-5 text-blue-400" />}
                                {config.mode === 'aggressive' && <Zap className="w-5 h-5 text-purple-400" />}
                                {config.mode}
                            </div>
                        </div>
                        <div className="h-8 w-px bg-slate-700" />
                        <div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Autopilot</div>
                            <div className="font-bold text-lg mt-1 capitalize text-slate-200">
                                {commandMetrics?.autopilot_level?.replace('_', ' ') || config.autopilot_level.replace('_', ' ')}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="bg-slate-100 p-1 rounded-lg mb-8">
                    <TabsTrigger value="overview" className="px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
                    <TabsTrigger value="campaigns" className="px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Campaigns</TabsTrigger>
                    <TabsTrigger value="logs" className="px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">System Logs</TabsTrigger>
                    <TabsTrigger value="configuration" className="px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Configuration</TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Visual KPIs */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <KpiCard
                                    label="Decisions Today"
                                    value={commandMetrics?.decisions_today ?? "142"}
                                    sub={commandMetrics?.decisions_change_pct ? `${commandMetrics.decisions_change_pct > 0 ? '+' : ''}${commandMetrics.decisions_change_pct}% from avg` : "+12% from avg"}
                                />
                                <KpiCard
                                    label="Ad Spend Managed"
                                    value={commandMetrics?.spend_managed_24h ? `$${commandMetrics.spend_managed_24h.toLocaleString()}` : "$4,230"}
                                    sub="Last 24h"
                                />
                                <KpiCard
                                    label="Est. Waste Saved"
                                    value={commandMetrics?.waste_saved_24h ? `$${commandMetrics.waste_saved_24h.toLocaleString()}` : "$320"}
                                    sub="Prevented spend"
                                    highlight
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Card className="bg-white/50 border-slate-200/60 backdrop-blur-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-slate-500">Risk Profile Health</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex justify-around items-end pt-4">
                                        <RiskMeter score={commandMetrics?.risk_exposure_score ?? 15} label="Risk Exp." />
                                        <RiskMeter score={commandMetrics?.system_health_score ?? 92} label="Health" />
                                    </CardContent>
                                </Card>
                                <Card className="bg-slate-900 border-0 text-white overflow-hidden relative">
                                    {/* Decorative glow */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl" />
                                    <CardHeader className="pb-2 relative z-10">
                                        <CardTitle className="text-sm font-medium text-slate-400">Next Optimization</CardTitle>
                                    </CardHeader>
                                    <CardContent className="relative z-10">
                                        <OptimizationTimer
                                            initialTime={commandMetrics?.next_optimization_time || "15:00"}
                                            dataUpdatedAt={dataUpdatedAt}
                                        />
                                        <div className="text-xs text-slate-400 mt-1">minutes remaining</div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* The Glass Box (Feed) */}
                        <div className="lg:col-span-1 row-span-2">
                            <Card className="h-[600px] flex flex-col border-slate-200 shadow-sm bg-white">
                                <CardHeader className="pb-3 border-b bg-slate-50/50">
                                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-slate-400" /> Live Decision Stream
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-hidden pt-4 px-0">
                                    <ScrollArea className="h-full px-4">
                                        <div className="space-y-6 pl-2 relative">
                                            {/* Connector Line */}
                                            <div className="absolute left-[11px] top-2 bottom-4 w-0.5 bg-slate-100" />

                                            {activities.map((act) => {
                                                // Helper to get agent icon/color
                                                const getAgentStyle = (agent: string) => {
                                                    const n = (agent || '').toLowerCase();
                                                    if (n.includes('risk')) return { icon: ShieldCheck, color: 'text-red-500 bg-red-50 border-red-100', label: 'Risk Guardian' };
                                                    if (n.includes('budget')) return { icon: Zap, color: 'text-blue-500 bg-blue-50 border-blue-100', label: 'Budget Manager' };
                                                    if (n.includes('policy')) return { icon: Scale, color: 'text-slate-500 bg-slate-50 border-slate-100', label: 'Policy Enforcer' };
                                                    if (n.includes('trend')) return { icon: Activity, color: 'text-purple-500 bg-purple-50 border-purple-100', label: 'Trend Spotter' };
                                                    return { icon: ShieldCheck, color: 'text-slate-500 bg-slate-50 border-slate-100', label: 'System' };
                                                };

                                                const style = getAgentStyle(act.agent);
                                                const AgentIcon = style.icon;

                                                // Parse messy message if needed (though apiAdapter handles most)
                                                let mainAction = "MONITORING";
                                                let detail = act.message;

                                                if (act.type === 'block') mainAction = "BLOCKED";
                                                if (act.type === 'scale') mainAction = "SCALED";
                                                if (act.type === 'pause') mainAction = "PAUSED";

                                                if (act.message.includes('Decision:')) {
                                                    detail = act.message.split('Decision:')[1].trim();
                                                }

                                                return (
                                                    <motion.div
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        key={act.id}
                                                        className="relative pl-0 group"
                                                    >
                                                        <div className="flex gap-4">
                                                            {/* Avatar Column */}
                                                            <div className="flex flex-col items-center">
                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 shadow-sm z-10 ${style.color}`}>
                                                                    <AgentIcon className="w-5 h-5" />
                                                                </div>
                                                                <div className="w-0.5 flex-1 bg-slate-100 my-2 group-last:hidden" />
                                                            </div>

                                                            {/* Content Card */}
                                                            <div className="flex-1 pb-6">
                                                                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group-hover:border-slate-200">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <div>
                                                                            <h4 className="font-bold text-sm text-slate-900">{style.label}</h4>
                                                                            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">
                                                                                {String(act.id).startsWith('tr_') ? 'Decision Trace' : 'System Event'}
                                                                            </div>
                                                                        </div>
                                                                        <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                                                                            {act.time}
                                                                        </span>
                                                                    </div>

                                                                    {/* Action Badge Line */}
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <Badge variant="outline" className={`
                                                                            uppercase text-[10px] font-bold px-2 py-0.5 border
                                                                            ${act.type === 'scale' ? 'bg-green-50 text-green-700 border-green-200' :
                                                                                act.type === 'block' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                                    'bg-slate-50 text-slate-600 border-slate-200'}
                                                                        `}>
                                                                            {mainAction}
                                                                        </Badge>
                                                                        <div className="h-px flex-1 bg-slate-100" />
                                                                    </div>

                                                                    {/* Main Message */}
                                                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                                                        {detail}
                                                                    </p>

                                                                    {/* Footer / Context (Optional) */}
                                                                    {act.reason && act.reason !== 'Consensus' && (
                                                                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                                            Context: {act.reason}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* ANALYTICS SECTION */}
                    <AnalyticsSection />
                </TabsContent>

                {/* CAMPAIGNS TAB */}
                <TabsContent value="campaigns">
                    <Card>
                        <CardHeader>
                            <CardTitle>Managed Campaigns</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold">Campaign</th>
                                            <th className="px-4 py-3 text-left font-semibold">Profile</th>
                                            <th className="px-4 py-3 text-left font-semibold">Status</th>
                                            <th className="px-4 py-3 text-right font-semibold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {campaigns.map((c: any) => (
                                            <tr
                                                key={c.id}
                                                onClick={() => setSelectedCampaignId(c.id)}
                                                className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                                            >
                                                <td className="px-4 py-4 font-medium text-slate-900 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-100 to-slate-200 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                        {c.campaign_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div>{c.campaign_name}</div>
                                                        <div className="text-xs text-slate-400 font-normal">ID: {c.id}</div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 capitalize text-slate-600">
                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200">{c.assigned_profile}</Badge>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            {c.status}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">ROAS: {c.roas}</div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        View Details <ChevronRight className="w-4 h-4 ml-1" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* CONFIGURATION TAB */}
                <TabsContent value="configuration">
                    <Card>
                        <CardContent className="p-12 text-center text-slate-500">
                            <Settings className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                            <h3 className="text-lg font-semibold text-slate-900">Configuration Locked</h3>
                            <p className="max-w-md mx-auto mt-2">
                                To ensure stability, core configuration changes require re-entering the setup wizard.
                            </p>
                            <Button variant="outline" className="mt-6">Restart Setup Wizard</Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* LOGS TAB */}
                <TabsContent value="logs">
                    <TraceLogViewer />
                </TabsContent>

            </Tabs>
        </div >
    );
}

function OptimizationTimer({ initialTime, dataUpdatedAt }: { initialTime: string, dataUpdatedAt: number }) {
    const [timeLeft, setTimeLeft] = useState(initialTime);

    React.useEffect(() => {
        if (!initialTime) return;

        // Parse "MM:SS" to seconds
        const [mins, secs] = initialTime.split(':').map(Number);
        const totalSeconds = (mins * 60) + (secs || 0);

        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - dataUpdatedAt) / 1000); // Seconds since fetch
            const remaining = Math.max(0, totalSeconds - elapsed);

            const m = Math.floor(remaining / 60);
            const s = remaining % 60;

            setTimeLeft(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(interval);
    }, [initialTime, dataUpdatedAt]);

    return <div className="text-3xl font-bold font-mono">{timeLeft}</div>;
}

function KpiCard({ label, value, sub, highlight }: any) {
    return (
        <Card className={`${highlight ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-white'}`}>
            <CardContent className="pt-6">
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${highlight ? 'text-indigo-200' : 'text-slate-500'}`}>{label}</p>
                <h4 className="text-3xl font-bold">{value}</h4>
                <p className={`text-xs mt-2 ${highlight ? 'text-indigo-100' : 'text-slate-400'}`}>{sub}</p>
            </CardContent>
        </Card>
    )
}

function EmptyState({ onStart, processing }: { onStart: () => void, processing: boolean }) {

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center">
                <Zap className="w-10 h-10 text-indigo-600" />
            </div>
            <div className="max-w-md space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">System Ready</h2>
                <p className="text-slate-500">
                    Optimization engine is initialized but hasn't processed any data yet.
                    Trigger the first optimization cycle to generate insights.
                </p>
            </div>
            <Button size="lg" onClick={onStart} disabled={processing} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                {processing ? (
                    <>Processing...</>
                ) : (
                    <>
                        <Zap className="w-4 h-4 mr-2" /> Start Optimization Algorithm
                    </>
                )}
            </Button>
        </div>
    );
}
