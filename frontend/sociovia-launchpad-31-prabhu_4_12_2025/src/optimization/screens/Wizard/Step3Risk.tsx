
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useOptimization } from '../../context/OptimizationContext';
import { AlertCircle, Gauge, ShieldAlert, ZapOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Step3Risk({ onNext, onBack }: { onNext: () => void, onBack: () => void }) {
    const { config, updateRiskPreferences } = useOptimization();

    return (
        <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
                <h3 className="text-2xl font-bold text-slate-800">Safety & Risk Guardrails</h3>
                <p className="text-slate-500 mt-2">Define the absolute boundaries the AI cannot cross.</p>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >

                {/* Risk Card 1: Velocity Cap */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                <Gauge className="w-5 h-5 text-orange-600" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-lg font-semibold text-slate-900">Velocity Cap Protocol</Label>
                                <p className="text-sm text-slate-500 max-w-md">
                                    Automatically stops aggressive budget scaling if daily spend increases by more than 20% without proportional ROAS growth.
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={config.risk_preferences.velocity_cap_enabled}
                            onCheckedChange={(c) => updateRiskPreferences({ velocity_cap_enabled: c })}
                        />
                    </div>
                </div>

                {/* Risk Card 2: Learning Phase */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-lg font-semibold text-slate-900">Strict Learning Phase Protection</Label>
                                <p className="text-sm text-slate-500 max-w-md">
                                    Prevents any edits to ad sets that are in "Learning Phase" to avoid resetting optimization learning.
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={config.risk_preferences.learning_phase_strictness}
                            onCheckedChange={(c) => updateRiskPreferences({ learning_phase_strictness: c })}
                        />
                    </div>
                </div>

                {/* Risk Card 3: Fatigue Tolerance */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex gap-4 mb-6">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <ZapOff className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-lg font-semibold text-slate-900">Fatigue Tolerance</Label>
                            <p className="text-sm text-slate-500">
                                How quickly should we pause ads when CTR drops?
                            </p>
                        </div>
                    </div>

                    <div className="pl-14">
                        <div className="flex justify-between mb-2 text-sm font-medium text-slate-600">
                            <span className={config.risk_preferences.fatigue_tolerance_level === 'low' ? 'text-primary' : ''}>Low (Strict)</span>
                            <span className={config.risk_preferences.fatigue_tolerance_level === 'medium' ? 'text-primary' : ''}>Medium</span>
                            <span className={config.risk_preferences.fatigue_tolerance_level === 'high' ? 'text-primary' : ''}>High (Lenient)</span>
                        </div>
                        <Slider
                            defaultValue={[config.risk_preferences.fatigue_tolerance_level === 'low' ? 0 : config.risk_preferences.fatigue_tolerance_level === 'medium' ? 50 : 100]}
                            max={100}
                            step={50}
                            className="py-4"
                            onValueChange={(val) => {
                                const v = val[0];
                                const t = v === 0 ? 'low' : v === 50 ? 'medium' : 'high';
                                updateRiskPreferences({ fatigue_tolerance_level: t });
                            }}
                        />
                        <p className="text-xs text-slate-400 mt-2 bg-slate-50 p-2 rounded inline-block">
                            {config.risk_preferences.fatigue_tolerance_level === 'low' && "Result: Ads paused immediately upon metric dip."}
                            {config.risk_preferences.fatigue_tolerance_level === 'medium' && "Result: Standard industry tolerance (3-day lookback)."}
                            {config.risk_preferences.fatigue_tolerance_level === 'high' && "Result: Give ads more time to recover before pausing."}
                        </p>
                    </div>
                </div>

            </motion.div>

            {/* Info Alert */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-8 flex gap-3 text-blue-800 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>
                    These settings act as a "Global Constitution" for the optimization engine. Individual campaign rules will respect these boundaries first.
                </p>
            </div>

            <div className="flex justify-between pt-8">
                <Button variant="outline" onClick={onBack} size="lg">Back</Button>
                <Button onClick={onNext} size="lg" className="w-32">Continue</Button>
            </div>
        </div>
    );
}
