
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useOptimization } from '../../context/OptimizationContext';
import { ShieldCheck, Eye, Fingerprint } from 'lucide-react';

export default function PrivacySafety() {
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Privacy & Policy</h1>
                <p className="text-slate-500">Manage data retention, compliance, and AI safety borders.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-500" /> Data Compliance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>GDPR Compliant Mode</Label>
                            <Switch defaultChecked disabled />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>CCPA Opt-Out Processing</Label>
                            <Switch defaultChecked disabled />
                        </div>
                        <p className="text-xs text-muted-foreground pt-2">
                            Sociovia strictly adheres to platform policies. PII is hashed before processing.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-blue-500" /> Data Retention</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span>Feature Logs</span>
                                <span className="font-semibold">90 Days</span>
                            </div>
                            <Progress value={30} className="h-2" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span>Ad Creative Snapshots</span>
                                <span className="font-semibold">365 Days</span>
                            </div>
                            <Progress value={10} className="h-2" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Fingerprint className="w-5 h-5 text-purple-500" /> AI Safety Policy</CardTitle>
                    <CardDescription>Hardcoded constraints for the Generative & Decision Engines.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-3">
                        {['No political content generation', 'No scaling of housing/credit/employment ads (HEC Category)', 'Strict brand safety visual checks'].map((policy, i) => (
                            <li key={i} className="flex items-center gap-3 text-sm text-slate-700 bg-slate-50 p-3 rounded-md">
                                <ShieldCheck className="w-4 h-4 text-green-500" />
                                {policy}
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
