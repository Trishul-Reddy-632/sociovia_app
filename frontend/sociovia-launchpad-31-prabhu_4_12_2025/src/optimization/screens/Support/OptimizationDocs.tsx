
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, BrainCircuit, Shield, Zap, Activity, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OptimizationDocs() {
    const navigate = useNavigate();

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-10">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/optimization/support')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                        <BookOpen className="w-8 h-8 text-blue-600" />
                        System Documentation
                    </h1>
                    <p className="text-slate-500">Official guide to the Sociovia Optimization Engine (Council V4).</p>
                </div>
            </div>

            <Tabs defaultValue="concepts" className="w-full">
                <TabsList className="bg-white border w-full justify-start h-12 p-1">
                    <TabsTrigger value="concepts" className="px-6 data-[state=active]:bg-slate-100">Core Concepts</TabsTrigger>
                    <TabsTrigger value="agents" className="px-6 data-[state=active]:bg-slate-100">The Agents</TabsTrigger>
                    <TabsTrigger value="modes" className="px-6 data-[state=active]:bg-slate-100">Modes & Risk</TabsTrigger>
                    <TabsTrigger value="analytics" className="px-6 data-[state=active]:bg-slate-100">Analytics</TabsTrigger>
                </TabsList>

                {/* CORE CONCEPTS */}
                <TabsContent value="concepts" className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BrainCircuit className="w-5 h-5 text-purple-600" />
                                What is "The Council"?
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="prose prose-slate max-w-none">
                            <p>
                                Sociovia does not use a single algorithm to manage your ads. Instead, it simulates a
                                <strong> "Council" of AI Agents</strong>, each with a specific personality and goal.
                            </p>
                            <p>
                                Before any change is made to your ad account (like increasing budget or pausing an ad),
                                the agents vote. A consensus must be reached based on your <strong>Optimization Mode</strong>.
                            </p>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 not-prose">
                                <h4 className="font-semibold text-slate-900 mb-2">Example: Scaling a Winning Ad</h4>
                                <ul className="space-y-2 text-sm text-slate-600">
                                    <li className="flex items-center gap-2">
                                        <span className="font-bold text-blue-600">Budget Agent:</span> "Votes YES. We have unspent budget for today."
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="font-bold text-emerald-600">Trend Agent:</span> "Votes YES. ROAS is trending up (+15%)."
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="font-bold text-orange-600">Risk Agent:</span> "Votes NO. This ad is approaching fatigue saturation."
                                    </li>
                                    <li className="mt-2 text-slate-900 font-medium border-t pt-2">
                                        Result: If Mode is "Defensive", the NO vote blocks the scale. If "Aggressive", the 2 YES votes override the risk.
                                    </li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* AGENTS */}
                <TabsContent value="agents" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AgentCard
                            icon={<Users className="w-5 h-5 text-indigo-500" />}
                            title="Budget Manager"
                            role="Capital Allocator"
                            desc="Obsessed with efficiency. Wants to spend your budget fully but efficiently. Will vote SCALE if budget utilization is low."
                        />
                        <AgentCard
                            icon={<Shield className="w-5 h-5 text-amber-500" />}
                            title="Risk Guardian"
                            role="Safety Officer"
                            desc="Paranoid. Monitors ad fatigue, frequency, and market volatility. Has 'Veto Power' in Defensive Mode."
                        />
                        <AgentCard
                            icon={<Activity className="w-5 h-5 text-emerald-500" />}
                            title="Trend Spotter"
                            role="Momentum Trader"
                            desc="Looks at the slope of metrics. If ROAS is climbing, it wants to ride the wave. Ignores absolute costs if trends are good."
                        />
                        <AgentCard
                            icon={<Zap className="w-5 h-5 text-blue-500" />}
                            title="ML Forecaster"
                            role="Future Prediction"
                            desc="Uses historical data to predict the next 24h. If the 'Predicted Conversion Value' is high, it pushes for scale."
                        />
                    </div>
                </TabsContent>

                {/* MODES */}
                <TabsContent value="modes" className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Optimization Modes</CardTitle>
                            <CardDescription>How the Council makes decisions.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <ModeItem
                                mode="Defensive"
                                tag="Safety First"
                                desc="The Risk Agent has absolute Veto power. Even if ROAS is great, if Frequency is too high, we stop. Best for maintaining efficiency on mature accounts."
                            />
                            <ModeItem
                                mode="Balanced"
                                tag="Recommended"
                                desc="Standard simulation. Requires a majority vote (3/5 Agents). Risk Agent warnings are treated as strong signals but not absolute blockers."
                            />
                            <ModeItem
                                mode="Aggressive"
                                tag="Growth"
                                desc="The goal is Spend/Scale. Risk Agent is silenced mostly (Soft Veto). We will scale into high frequency if ROAS stays above break-even."
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ANALYTICS */}
                <TabsContent value="analytics" className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Understanding Analytics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-2">Impact Analysis (Spend vs ROAS)</h3>
                                <p className="text-slate-600 text-sm">
                                    This chart proves the AI is working. Ideally, you want to see the <strong>Bars (Spend)</strong> going up while the <strong>Line (ROAS)</strong> stays flat or goes up.
                                    <br /><br />
                                    If Spends goes UP and ROAS crashes DOWN, the system should automatically trigger a "Safety Stop".
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    );
}

function AgentCard({ icon, title, role, desc }: any) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
                    <div>
                        <h4 className="font-bold text-slate-900">{title}</h4>
                        <div className="text-xs text-slate-500 uppercase font-semibold">{role}</div>
                    </div>
                </div>
                <p className="text-sm text-slate-600">{desc}</p>
            </CardContent>
        </Card>
    )
}

function ModeItem({ mode, tag, desc }: any) {
    return (
        <div className="flex gap-4 p-4 border rounded-lg bg-slate-50/50">
            <div className="w-24 flex-shrink-0">
                <div className="font-bold text-slate-900">{mode}</div>
                <div className="text-xs text-blue-600 font-medium bg-blue-50 inline-block px-1.5 py-0.5 rounded mt-1">{tag}</div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
        </div>
    )
}
