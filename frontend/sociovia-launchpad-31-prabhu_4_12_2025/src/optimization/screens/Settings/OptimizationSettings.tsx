
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Settings, Sliders, Bell } from 'lucide-react';
import { useOptimization } from '../../context/OptimizationContext';

export default function OptimizationSettings() {
    const { config, updateMode, updateAutopilotLevel, updateRiskPreferences } = useOptimization();

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500">Global configurations for your optimization engine.</p>
            </div>

            <Tabs defaultValue="general">
                <TabsList className="bg-white border">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="mt-6 space-y-6">

                    {/* Mode Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Optimization Strategy</CardTitle>
                            <CardDescription>Default strategy for new campaigns.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Current Mode</Label>
                                    <p className="text-sm text-muted-foreground capitalize">{config.mode}</p>
                                </div>
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    {(['defensive', 'balanced', 'aggressive'] as const).map(m => (
                                        <button
                                            key={m}
                                            onClick={() => updateMode(m)}
                                            className={`px-3 py-1.5 text-sm rounded-md capitalize transition-all ${config.mode === m ? 'bg-white shadow text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-900'}`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Risk Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Risk Configuration</CardTitle>
                            <CardDescription>Define safety boundaries for the agents.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Velocity Cap Protection</Label>
                                    <p className="text-sm text-muted-foreground">Prevent daily budget increases over 20%.</p>
                                </div>
                                <Switch
                                    checked={config.risk_preferences?.velocity_cap_enabled ?? true}
                                    onCheckedChange={(c) => updateRiskPreferences({ velocity_cap_enabled: c })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Fatigue Tolerance</Label>
                                    <p className="text-sm text-muted-foreground">Threshold for pausing high-frequency ads.</p>
                                </div>
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    {(['low', 'medium', 'high'] as const).map(l => (
                                        <button
                                            key={l}
                                            onClick={() => updateRiskPreferences({ fatigue_tolerance_level: l })}
                                            className={`px-3 py-1.5 text-sm rounded-md capitalize transition-all ${config.risk_preferences?.fatigue_tolerance_level === l ? 'bg-white shadow text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-900'}`}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Autopilot Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Autopilot & Permissions</CardTitle>
                            <CardDescription>Control how much autonomy the AI has.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Automation Level</Label>
                                    <p className="text-sm text-muted-foreground capitalize">{config.autopilot_level.replace('_', ' ')}</p>
                                </div>
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    {(['insights_only', 'assisted', 'autopilot'] as const).map(l => (
                                        <button
                                            key={l}
                                            onClick={() => updateAutopilotLevel(l)}
                                            className={`px-3 py-1.5 text-sm rounded-md capitalize transition-all ${config.autopilot_level === l ? 'bg-white shadow text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-900'}`}
                                        >
                                            {l.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </TabsContent>

                <TabsContent value="notifications">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notification Preferences</CardTitle>
                            <CardDescription>Manage how "The Council" communicates with you.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Email Digests</Label>
                                    <p className="text-sm text-muted-foreground">Receive daily summaries of actions taken.</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Critical Alerts</Label>
                                    <p className="text-sm text-muted-foreground">Immediate emails for Veto events (e.g., Velocity Cap hit).</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="advanced">
                    <Card>
                        <CardContent className="p-12 text-center text-muted-foreground">
                            <Sliders className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            Advanced parameter tuning is managed by the data science team.
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
