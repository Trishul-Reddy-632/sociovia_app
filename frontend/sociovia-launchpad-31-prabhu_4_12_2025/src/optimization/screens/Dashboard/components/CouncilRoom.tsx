
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { AgentID, AgentVote, VoteType } from '../../../types';
import { ShieldAlert, TrendingUp, Calculator, Scale, BrainCircuit } from 'lucide-react';

// Icons for each agent
const AGENT_CONFIG: Record<AgentID, { label: string, icon: any, color: string }> = {
    budget: { label: 'Budget Agent', icon: Calculator, color: 'text-blue-500 bg-blue-50' },
    risk: { label: 'Risk Agent', icon: ShieldAlert, color: 'text-red-500 bg-red-50' },
    trend: { label: 'Trend Agent', icon: TrendingUp, color: 'text-purple-500 bg-purple-50' },
    policy: { label: 'Policy Agent', icon: Scale, color: 'text-slate-500 bg-slate-50' },
    ml: { label: 'ML Forecaster', icon: BrainCircuit, color: 'text-emerald-500 bg-emerald-50' }
};

const VOTE_COLORS: Record<VoteType, string> = {
    SCALE: 'bg-green-100 text-green-700 border-green-200',
    PAUSE: 'bg-red-100 text-red-700 border-red-200',
    MONITOR: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    DECREASE: 'bg-orange-100 text-orange-700 border-orange-200'
};

interface CouncilRoomProps {
    votes: AgentVote[];
    isThinking?: boolean;
}

export default function CouncilRoom({ votes, isThinking = false }: CouncilRoomProps) {
    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />
            <CardHeader className="pb-4 border-b border-slate-50 bg-slate-50/50">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        The Decision Council
                        {isThinking && <Badge variant="secondary" className="animate-pulse bg-blue-100 text-blue-600">Thinking...</Badge>}
                    </CardTitle>
                    <span className="text-xs text-slate-400">V4.1 Swarm</span>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-5 gap-4">
                    {Object.entries(AGENT_CONFIG).map(([id, config]) => {
                        const vote = votes.find(v => v.agentId === id);
                        const AgentIcon = config.icon;

                        return (
                            <div key={id} className="flex flex-col items-center text-center space-y-3 group">
                                {/* Agent Avatar */}
                                <div className={`
                            relative w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all duration-300
                            ${config.color} ${isThinking ? 'scale-110 ring-4 ring-offset-2 ring-slate-100' : 'border-slate-100 shadow-sm'}
                         `}>
                                    <AgentIcon className="w-6 h-6" />
                                    {/* Thinking Indicator */}
                                    {isThinking && (
                                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                        </span>
                                    )}
                                </div>

                                {/* Agent Name */}
                                <div className="text-xs font-semibold text-slate-700">{config.label}</div>

                                {/* Vote Result */}
                                {!isThinking && vote ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`px-2 py-1 rounded-md border text-[10px] font-bold uppercase w-full ${VOTE_COLORS[vote.vote]}`}
                                    >
                                        {vote.vote}
                                    </motion.div>
                                ) : (
                                    <div className="h-6 w-16 bg-slate-100 rounded-md animate-pulse" />
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Reasoning Feed */}
                {!isThinking && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-6 space-y-2 border-t pt-4 border-slate-100"
                    >
                        <div className="text-xs font-semibold text-slate-400 mb-2">LATEST CONSENSUS REASONING</div>
                        {votes.map((vote) => (
                            <div key={vote.agentId} className="flex items-start gap-2 text-xs">
                                <span className={`font-mono font-bold uppercase w-16 flex-shrink-0 text-right ${AGENT_CONFIG[vote.agentId].color.split(' ')[0]}`}>
                                    {vote.agentId}:
                                </span>
                                <span className="text-slate-600">{vote.reason}</span>
                            </div>
                        ))}
                    </motion.div>
                )}
            </CardContent>
        </Card>
    );
}
