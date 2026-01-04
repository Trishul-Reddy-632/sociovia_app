
import React from 'react';
import { Shield, Scale, Rocket, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOptimization } from '../../context/OptimizationContext';
import { OptimizationMode } from '../../types';
import { motion } from 'framer-motion';

export default function Step1Mode({ onNext }: { onNext: () => void }) {
    const { config, updateMode } = useOptimization();

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center">
                <h3 className="text-2xl font-bold text-slate-800">How aggressive should Sociovia be?</h3>
                <p className="text-slate-500 mt-2">This sets the baseline for all risk and scaling decisions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ModeCard
                    mode="defensive"
                    currentMode={config.mode}
                    onSelect={() => updateMode('defensive')}
                    icon={<Shield className="w-10 h-10 text-emerald-500" />}
                    title="Defensive"
                    description="Maximize profit retention. Zero risk taken."
                    features={[
                        "Protect budget above all",
                        "Zero risky scaling",
                        "Manual approval > 10%"
                    ]}
                    color="border-emerald-500"
                    bg="bg-emerald-50/50"
                />
                <ModeCard
                    mode="balanced"
                    currentMode={config.mode}
                    onSelect={() => updateMode('balanced')}
                    icon={<Scale className="w-10 h-10 text-blue-500" />}
                    title="Balanced"
                    description="Scale efficiently while protecting base ROAS."
                    features={[
                        "Controlled growth",
                        "Safety-first scaling",
                        "Approval on sensitive actions"
                    ]}
                    color="border-blue-500"
                    bg="bg-blue-50/50"
                />
                <ModeCard
                    mode="aggressive"
                    currentMode={config.mode}
                    onSelect={() => updateMode('aggressive')}
                    icon={<Rocket className="w-10 h-10 text-purple-500" />}
                    title="Aggressive"
                    description="Hunt for winners and scale them fast."
                    features={[
                        "Growth-first strategy",
                        "Soft risk veto",
                        "Auto-scale permitted"
                    ]}
                    color="border-purple-500"
                    bg="bg-purple-50/50"
                />
            </div>

            <div className="flex justify-end pt-6">
                <Button onClick={onNext} size="lg" className="w-32">Continue</Button>
            </div>
        </div>
    );
}

function ModeCard({ mode, currentMode, onSelect, icon, title, description, features, color, bg }: any) {
    const isSelected = currentMode === mode;
    return (
        <motion.div
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSelect}
            className={`
            cursor-pointer relative overflow-hidden rounded-xl border-2 transition-all duration-300
            ${isSelected ? `${color} shadow-lg ring-4 ring-offset-2 ring-slate-100` : 'border-slate-200 hover:border-slate-300 bg-white/80'}
        `}
        >
            {isSelected && (
                <div className={`absolute top-0 right-0 p-2 bg-white rounded-bl-xl shadow-sm z-10 ${color.replace('border-', 'text-')}`}>
                    <CheckCircle2 className="w-6 h-6" />
                </div>
            )}

            {/* Background Splashes */}
            <div className={`absolute inset-0 opacity-0 transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'group-hover:opacity-50'} ${bg}`} />

            <div className="p-6 relative z-10 flex flex-col h-full">
                <div className="mb-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-white shadow-sm border border-slate-100`}>
                        {icon}
                    </div>
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">{title}</h4>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed min-h-[40px]">{description}</p>

                <div className="mt-auto space-y-3">
                    {features.map((f: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <div className={`mt-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? color.replace('border-', 'bg-') : 'bg-slate-300'}`} />
                            <span>{f}</span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    )
}
