
import { AgentVote, VoteType, AgentID, OptimizationMode, DecisionTrace } from '../types';

export interface ActivityItem {
    id: number;
    time: string;
    type: 'scale' | 'pause' | 'monitor' | 'block' | 'info';
    message: string;
    reason: string;
    agent: string;
}

// Helpers to generate random things
const getRandomConfidence = () => parseFloat((0.7 + Math.random() * 0.3).toFixed(2));

export function generateCouncilVotes(mode: OptimizationMode): AgentVote[] {
    const isAggressive = mode === 'aggressive';
    const isDefensive = mode === 'defensive';

    // Base behavior: Budget always wants to save money in defensive, scale in aggressive
    const budgetVote: AgentVote = {
        agentId: 'budget',
        vote: isDefensive ? 'MONITOR' : 'SCALE',
        confidence: getRandomConfidence(),
        reason: isDefensive ? 'Conserving capital for efficiency.' : 'Budget utilization low, requesting expansion.'
    };

    // Risk behavior: Paranoid in defensive, relaxed in aggressive
    const riskVote: AgentVote = {
        agentId: 'risk',
        vote: isAggressive ? 'MONITOR' : 'PAUSE', // Soft veto in aggressive
        confidence: getRandomConfidence(),
        reason: isAggressive
            ? 'Fatigue detected (Score 45), but maintaining soft veto due to Aggressive Mode.'
            : 'Fatigue detected (Score 45). Triggering Hard Veto.'
    };

    // Trend behavior
    const trendVote: AgentVote = {
        agentId: 'trend',
        vote: 'SCALE',
        confidence: 0.85,
        reason: 'Positive conversion slope (+12% DoD).'
    };

    // Policy behavior
    const policyVote: AgentVote = {
        agentId: 'policy',
        vote: 'SCALE',
        confidence: 1.0,
        reason: 'Compliance checks passed.'
    };

    // ML behavior
    const mlVote: AgentVote = {
        agentId: 'ml',
        vote: 'SCALE',
        confidence: 0.92,
        reason: 'p(Conv) > threshold. High value window predicted.'
    };

    return [budgetVote, riskVote, trendVote, mlVote, policyVote];
}

export function generateActivityFeed(mode: OptimizationMode): ActivityItem[] {
    const isAggressive = mode === 'aggressive';

    const baseActivities: ActivityItem[] = [
        {
            id: 1,
            time: 'Just now',
            type: isAggressive ? 'scale' : 'block',
            message: isAggressive
                ? 'Soft Scale (+5%) triggered. Risk Veto overridden by Aggressive Profile.'
                : 'Scale Blocked. Risk Agent exercised Veto power.',
            reason: isAggressive ? 'Aggressive Override' : 'Risk Veto',
            agent: 'Consensus Engine'
        },
        {
            id: 2,
            time: '15 mins ago',
            type: 'monitor',
            message: 'Risk Agent raised flag: Creative Fatigue.',
            reason: 'Fatigue Score > 40',
            agent: 'Risk Agent'
        },
        {
            id: 3,
            time: '42 mins ago',
            type: 'scale',
            message: 'ML Agent predicts high-value window.',
            reason: 'Conv. Prob 85%',
            agent: 'ML Forecaster'
        },
        {
            id: 4,
            time: '2 hours ago',
            type: 'info',
            message: 'Daily budget optimization cycle started.',
            reason: 'Routine',
            agent: 'System'
        }
    ];

    return baseActivities;
}

export function generateMockCampaigns(count: number) {
    const statuses = ['Active', 'Learning', 'Fatigued'];
    const profiles = ['defensive', 'balanced', 'aggressive'];

    return Array.from({ length: count }).map((_, i) => ({
        id: `cmp_${Math.random().toString(36).substr(2, 9)}`,
        campaign_name: `Campaign ${String.fromCharCode(65 + i)} - ${i % 2 === 0 ? 'Retargeting' : 'Prospecting'}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        assigned_profile: profiles[Math.floor(Math.random() * profiles.length)] as OptimizationMode,
        spend_7d: (Math.random() * 5000 + 500).toFixed(2),
        roas: (Math.random() * 3 + 1).toFixed(2),
        cpr: (Math.random() * 50 + 10).toFixed(2),
        is_optimizing: true
    }));
}

export function generateTimeseriesData() {
    // Generate 7 days of dummy data
    return Array.from({ length: 7 }).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });

        return {
            name: dayStr,
            spend: Math.floor(Math.random() * 2000 + 1000),
            roas: parseFloat((Math.random() * 1.5 + 2.5).toFixed(2)), // 2.5 - 4.0
            actions: Math.floor(Math.random() * 50 + 10)
        };
    });
}

export function generateAgentStats() {
    return [
        { name: 'Budget Manager', value: 45, fill: '#8884d8' }, // Indigo
        { name: 'Risk Guardian', value: 25, fill: '#f59e0b' }, // Amber
        { name: 'Trend Spotter', value: 20, fill: '#10b981' }, // Emerald
        { name: 'ML Predictor', value: 10, fill: '#6366f1' }, // Blue
    ];
}

export function generateDecisionTraces(): DecisionTrace[] {
    return [
        {
            id: 'tr_1',
            timestamp: new Date().toISOString(),
            case_id: 'CASE 1',
            account_id: 'act_stress_1',
            ad_id: 'ad_1',
            status: 'FATIGUED',
            metrics: { roas: 1.12, fatigue: 0.53 },
            consensus: { vote: 'PAUSE', confidence: 0.90, agent_votes: ['Risk=PAUSE', 'Budget=PAUSE'] },
            action_taken: 'PAUSE',
            gen_ai_reason: 'High IMAGE Fatigue (Score: 0.53)'
        },
        {
            id: 'tr_14',
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            case_id: 'CASE 14',
            account_id: 'act_stress_14',
            ad_id: 'ad_14',
            status: 'WINNER',
            metrics: { roas: 3.76, fatigue: 1.00 },
            consensus: { vote: 'SCALE', confidence: 0.90, agent_votes: ['Budget=SCALE', 'Risk=SCALE'] },
            action_taken: 'SCALE (+20%)'
        },
        {
            id: 'tr_7',
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            case_id: 'CASE 7',
            account_id: 'act_stress_7',
            status: 'SCALED_AGGRESSIVE',
            metrics: { roas: 2.50, fatigue: 1.00 },
            consensus: { vote: 'MONITOR', confidence: 0.0, agent_votes: [] },
            action_taken: 'BLOCKED (Global Policy: Spend Limit)'
        },
        {
            id: 'tr_3',
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            case_id: 'CASE 3',
            account_id: 'act_stress_3',
            ad_id: 'ad_3',
            status: 'NORMAL',
            metrics: { roas: 2.00, fatigue: 1.00 },
            consensus: { vote: 'MONITOR', confidence: 0.50, agent_votes: [] },
            action_taken: 'MONITOR'
        },
        {
            id: 'tr_16',
            timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            case_id: 'CASE 16',
            account_id: 'act_stress_16',
            ad_id: 'ad_16',
            status: 'FATIGUED',
            metrics: { roas: 0.65, fatigue: 0.54 },
            consensus: { vote: 'PAUSE', confidence: 0.90, agent_votes: ['Risk=PAUSE', 'Budget=PAUSE'] },
            action_taken: 'PAUSE',
            gen_ai_reason: 'High IMAGE Fatigue (Score: 0.54)'
        }
    ];
}
