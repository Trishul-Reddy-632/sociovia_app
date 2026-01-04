
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Activity, TrendingUp, PauseCircle, Scale } from 'lucide-react';
import { motion } from 'framer-motion';

import { CampaignMetrics } from '@/types/api';
import { useOptimizationCampaigns, useDecisionTraces } from '@/hooks/useOptimizationQueries';

interface CampaignDetailViewProps {
    campaignId: string;
    onBack: () => void;
}

export default function CampaignDetailView({ campaignId, onBack }: CampaignDetailViewProps) {
    const { data: campaigns = [], isLoading: loadingCampaigns } = useOptimizationCampaigns();
    const { data: traces = [], isLoading: loadingTraces } = useDecisionTraces();

    const campaign = campaigns.find((c: any) => c.id === campaignId) as CampaignMetrics | undefined;
    const loading = loadingCampaigns || loadingTraces;

    const logs = React.useMemo(() => {
        if (!traces) return [];
        // Filter logs for this campaign (assuming params.campaign_id or matching ad_id logic)
        // For now, simpler fuzzy match or just show all for demo if ID missing
        const relevant = traces.filter(t => t.params?.campaign_id === campaignId || true).slice(0, 10);

        return relevant.map(t => ({
            time: new Date(t.timestamp).toLocaleTimeString(),
            type: t.proposed_action === 'SCALE_UP' ? 'scale' : 'info',
            message: `Consensus: ${t.final_action} (${(t.confidence * 100).toFixed(0)}% Conf.)`
        }));
    }, [traces, campaignId]);

    if (!campaign && !loading) return <div>Campaign not found</div>;
    if (loading || !campaign) return <div className="p-8 text-center">Loading details...</div>;

    // Derived stats for UI
    // Use API values with safe fallbacks
    const velocity_usage = campaign.velocity_usage ?? 0;
    const fatigue_score = campaign.fatigue_score ?? 0;
    const active_rules = campaign.active_rules ?? [];

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-slate-100">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            {campaign.campaign_name}
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                                {campaign.status}
                            </Badge>
                        </h2>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                            <span>ID: {campaign.id}</span>
                            <span>•</span>
                            <span className="capitalize flex items-center gap-1">
                                <Scale className="w-3 h-3" /> Profile: <span className="font-medium text-slate-900">{campaign.assigned_profile}</span>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                        <PauseCircle className="w-4 h-4" /> Pause
                    </Button>
                    <Button variant="default" className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
                        <Activity className="w-4 h-4" /> View in Meta
                    </Button>
                </div>
            </div>

            {/* Grid Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Velocity Cap Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-3xl font-bold text-slate-900">{Math.round(velocity_usage * 100)}%</span>
                            <span className="text-sm text-slate-500 mb-1">of daily limit used</span>
                        </div>
                        <Progress value={velocity_usage * 100} className="h-2" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Fatigue Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2 mb-2">
                            <span className={`text-3xl font-bold ${fatigue_score > 50 ? 'text-orange-500' : 'text-slate-900'}`}>
                                {fatigue_score}
                            </span>
                            <span className="text-sm text-slate-500 mb-1">/ 100 (Lower is better)</span>
                        </div>
                        <Progress value={fatigue_score} className="h-2 bg-slate-100 [&>div]:bg-orange-500" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Current ROAS</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-3xl font-bold text-emerald-600">{campaign.roas}x</span>
                            <span className="text-sm text-emerald-600 mb-1 flex items-center">
                                <TrendingUp className="w-3 h-3 mr-1" /> Best in class
                            </span>
                        </div>
                        <div className="text-xs text-slate-400">Target: 2.5x</div>
                    </CardContent>
                </Card>
            </div>

            {/* Logs & Rules Tab */}
            <Tabs defaultValue="logs" className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0 space-x-6">
                    <TabsTrigger value="logs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent px-4 pb-3 pt-2">Decision Log</TabsTrigger>
                    <TabsTrigger value="rules" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent px-4 pb-3 pt-2">Active Rules</TabsTrigger>
                </TabsList>
                <TabsContent value="logs" className="mt-6">
                    <Card>
                        <CardContent className="p-0">
                            {logs.map((log, i) => (
                                <div key={i} className="flex gap-4 p-4 border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                                    <div className="text-xs font-mono text-slate-400 pt-1 w-20 flex-shrink-0">{log.time}</div>
                                    <div>
                                        <Badge variant="secondary" className="mb-1 text-[10px] h-5 px-1.5 uppercase tracking-wide">
                                            {log.type}
                                        </Badge>
                                        <p className="text-sm text-slate-700">{log.message}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="rules" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <RuleCard active={active_rules.includes('Velocity Cap')} name="Velocity Cap" desc="Limit daily budget increase to 20%" />
                        <RuleCard active={active_rules.includes('ROAS Floor')} name="ROAS Floor" desc="Pause if ROAS < 1.5 for 3 days" />
                        <RuleCard active={active_rules.includes('Fatigue Limit')} name="Fatigue Limit" desc="Pause if Frequency > 4.0" />
                        <RuleCard active={active_rules.includes('Learning Phase')} name="Learning Phase Guard" desc="Protect ads in learning phase" />
                    </div>
                </TabsContent>
            </Tabs>

        </motion.div>
    );
}

function RuleCard({ active, name, desc }: any) {
    return (
        <div className={`p-4 rounded-lg border ${active ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/50 opacity-70'}`}>
            <div className="flex justify-between items-start mb-1">
                <h4 className="font-semibold text-slate-900">{name}</h4>
                {active ? (
                    <Badge variant="outline" className="border-emerald-200 text-emerald-700 text-[10px]">Active</Badge>
                ) : (
                    <Badge variant="outline" className="text-slate-500 text-[10px]">Inactive</Badge>
                )}
            </div>
            <p className="text-sm text-slate-500">{desc}</p>
        </div>
    )
}
