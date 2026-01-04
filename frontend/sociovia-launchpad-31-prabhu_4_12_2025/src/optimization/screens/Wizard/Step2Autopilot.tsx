
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOptimization } from '../../context/OptimizationContext';
import { AutopilotLevel } from '../../types';
import { BrainCircuit, MessageSquareCode, Bot, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Step2Autopilot({ onNext, onBack }: { onNext: () => void, onBack: () => void }) {
    const { config, updateAutopilot } = useOptimization();

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center">
                <h3 className="text-2xl font-bold text-slate-800">Choose your automation level</h3>
                <p className="text-slate-500 mt-2">How much control do you want to hand over to the AI?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <OptionCard
                    level="insights_only"
                    currentLevel={config.autopilot_level}
                    onSelect={() => updateAutopilot('insights_only')}
                    icon={<MessageSquareCode className="w-10 h-10 text-slate-500" />}
                    title="Insights Only"
                    description="AI monitors 24/7 and sends alerts, but takes zero action."
                    features={[
                        "Real-time monitoring",
                        "Slack/Email Alerts",
                        "No write access to ads"
                    ]}
                />
                <OptionCard
                    level="assisted"
                    currentLevel={config.autopilot_level}
                    onSelect={() => updateAutopilot('assisted')}
                    icon={<BrainCircuit className="w-10 h-10 text-blue-500" />}
                    title="Assisted Mode"
                    description="AI manages simple tasks (pausing bad ads), asks for scaling."
                    features={[
                        "Auto-pause losers",
                        "Human approval for scale",
                        "Weekly budget rebalance"
                    ]}
                    highlight
                />
                <OptionCard
                    level="autopilot"
                    currentLevel={config.autopilot_level}
                    onSelect={() => updateAutopilot('autopilot')}
                    icon={<Bot className="w-10 h-10 text-purple-600" />}
                    title="Full Autopilot"
                    description="Total hands-free management within your risk guardrails."
                    features={[
                        "Auto-scale winners",
                        "Rapid creative testing",
                        "24/7 Budget Optimization"
                    ]}
                />
            </div>

            <div className="flex justify-between pt-6">
                <Button variant="outline" onClick={onBack} size="lg">Back</Button>
                <Button onClick={onNext} size="lg" className="w-32">Continue</Button>
            </div>
        </div>
    );
}

function OptionCard({ level, currentLevel, onSelect, icon, title, description, features, highlight }: any) {
    const isSelected = currentLevel === level;
    return (
        <motion.div
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSelect}
            className={`
        cursor-pointer relative overflow-hidden rounded-xl border-2 transition-all duration-300
        ${isSelected ? 'border-primary shadow-lg ring-4 ring-offset-2 ring-primary/10' : 'border-slate-200 hover:border-slate-300 bg-white/80'}
      `}
        >
            {isSelected && (
                <div className={`absolute top-0 right-0 p-2 bg-primary text-white rounded-bl-xl shadow-sm z-10`}>
                    <CheckCircle2 className="w-5 h-5" />
                </div>
            )}

            {highlight && !isSelected && (
                <div className="absolute top-0 right-0 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                    POPULAR
                </div>
            )}

            <div className="p-6">
                <div className="mb-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-white shadow-sm border border-slate-100`}>
                        {icon}
                    </div>
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">{title}</h4>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed min-h-[40px]">{description}</p>

                <div className="mt-auto space-y-3">
                    {features.map((f: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <div className={`mt-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary' : 'bg-slate-300'}`} />
                            <span>{f}</span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    )
}
