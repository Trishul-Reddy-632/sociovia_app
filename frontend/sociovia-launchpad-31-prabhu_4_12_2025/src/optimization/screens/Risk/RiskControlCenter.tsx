
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useOptimization } from '../../context/OptimizationContext';
import { AlertTriangle, ShieldCheck, Gauge, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { RiskMeter } from '../Dashboard/components/RiskMeter';

export default function RiskControlCenter() {
    const { config } = useOptimization();

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Risk Control Center</h1>
                <p className="text-slate-500">Monitor and audit the safety mechanisms of the engine.</p>
            </div>

            {/* Top Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-t-4 border-t-emerald-500">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Global Safety Score</p>
                                <h4 className="text-3xl font-bold text-slate-900 mt-2">98/100</h4>
                            </div>
                            <ShieldCheck className="w-8 h-8 text-emerald-100" />
                        </div>
                        <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            System is healthy
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-blue-500">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Vetoes Triggered</p>
                                <h4 className="text-3xl font-bold text-slate-900 mt-2">12</h4>
                            </div>
                            <AlertTriangle className="w-8 h-8 text-blue-100" />
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Last 24 hours</p>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-purple-500">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg. Velocity</p>
                                <h4 className="text-3xl font-bold text-slate-900 mt-2">+4.2%</h4>
                            </div>
                            <Activity className="w-8 h-8 text-purple-100" />
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Daily budget expansion</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Velocity Gauge */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Gauge className="w-5 h-5" /> Velocity Cap Monitor</CardTitle>
                        <CardDescription>Current daily spend expansion vs hard cap limits.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center py-6">
                        <RiskMeter score={21} label="Utilization" />
                    </CardContent>
                </Card>

                {/* Recent Veto Log */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Veto Actions</CardTitle>
                        <CardDescription>Actions blocked by the Risk Agent.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { time: '10 mins ago', action: 'Scale Blocked', reason: 'Velocity Cap exceeded', campaign: 'Campaign A' },
                                { time: '2 hrs ago', action: 'Scale Blocked', reason: 'Learning Phase Lock', campaign: 'Campaign C' },
                                { time: '5 hrs ago', action: 'Ad Paused', reason: 'High Frequency (>4.0)', campaign: 'Retargeting 1' },
                            ].map((l, i) => (
                                <div key={i} className="flex items-center justify-between text-sm border-b last:border-0 pb-3 last:pb-0">
                                    <div>
                                        <div className="font-medium text-slate-900">{l.action}</div>
                                        <div className="text-xs text-slate-500">{l.reason} • {l.campaign}</div>
                                    </div>
                                    <span className="text-xs text-slate-400 font-mono">{l.time}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
