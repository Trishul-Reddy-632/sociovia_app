
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useOptimization } from '../../context/OptimizationContext';
import { AlertTriangle, Power, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Step5Confirm({ onBack }: { onBack: () => void }) {
    const { config, activateOptimization } = useOptimization();
    const navigate = useNavigate();
    const [agreed, setAgreed] = useState(false);
    const [isActivating, setIsActivating] = useState(false);

    const handleActivate = async () => {
        setIsActivating(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        activateOptimization();
        navigate('/optimization/dashboard');
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                    <Power className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900">Ready to Activate?</h3>
                <p className="text-slate-500 mt-2">Review your configuration before enabling the engine.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h4 className="font-semibold text-slate-800">Configuration Summary</h4>
                    <span className="text-xs font-mono text-slate-400">ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                </div>
                <div className="p-6 grid grid-cols-2 gap-y-6 gap-x-12">
                    <SummaryItem label="Global Mode" value={config.mode} />
                    <SummaryItem label="Autopilot Level" value={config.autopilot_level} />
                    <SummaryItem label="Risk: Velocity Cap" value={config.risk_preferences.velocity_cap_enabled ? "Enabled" : "Disabled"} />
                    <SummaryItem label="Risk: Learning Lock" value={config.risk_preferences.learning_phase_strictness ? "Active" : "Disabled"} />
                    <SummaryItem label="Risk: Fatigue Tolerance" value={config.risk_preferences.fatigue_tolerance_level} capitalize />
                    <SummaryItem label="Campaigns Managed" value={`${config.campaign_assignments.length} Campaigns`} />
                </div>
            </div>

            <Alert variant="default" className="border-orange-200 bg-orange-50 mb-8">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-1" />
                <div className="ml-2">
                    <AlertTitle className="text-orange-800 font-semibold text-base mb-1">Human-in-the-Loop Guarantee</AlertTitle>
                    <AlertDescription className="text-orange-700/90">
                        By activating, you grant Sociovia permission to manage your ad spend within the defined limits.
                        You can <strong>pause or override</strong> the system at any time from the dashboard.
                        We will never exceed your velocity caps.
                    </AlertDescription>
                </div>
            </Alert>

            <div className="flex items-center justify-center space-x-3 mb-8 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <Checkbox
                    id="terms"
                    checked={agreed}
                    onCheckedChange={(c) => setAgreed(!!c)}
                    className="data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900 w-5 h-5 border-slate-300"
                />
                <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-700 select-none"
                >
                    I confirm the settings above and authorize the optimization engine.
                </label>
            </div>

            <div className="flex justify-between items-center pt-4">
                <Button variant="ghost" onClick={onBack} size="lg" className="text-slate-500 hover:text-slate-900">Back</Button>

                <Button
                    onClick={handleActivate}
                    disabled={!agreed || isActivating}
                    size="lg"
                    className={`
                min-w-[200px] h-14 text-lg rounded-full shadow-xl transition-all duration-300
                ${agreed
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white hover:shadow-green-500/30'
                            : 'bg-slate-200 text-slate-400 shadow-none'}
            `}
                >
                    {isActivating ? (
                        <div className="flex items-center gap-2">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            />
                            <span>Activating...</span>
                        </div>
                    ) : (
                        <span className="flex items-center gap-2">
                            Activate System <ArrowRight className="w-5 h-5" />
                        </span>
                    )}
                </Button>
            </div>
        </div>
    );
}

function SummaryItem({ label, value, capitalize }: any) {
    return (
        <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</div>
            <div className={`text-lg font-medium text-slate-800 ${capitalize ? 'capitalize' : ''}`}>
                {value}
            </div>
        </div>
    )
}
