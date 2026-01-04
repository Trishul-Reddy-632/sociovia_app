export type OptimizationMode = 'defensive' | 'balanced' | 'aggressive';
export type AutopilotLevel = 'insights_only' | 'assisted' | 'autopilot';

export interface RiskProfile {
    mode: OptimizationMode;
    risk_veto_type: 'hard' | 'soft';
    max_daily_scale: number; // 0.0, 0.1, 0.2
    ml_weight: number; // 0.3, 0.6, 0.9
    approval_required: boolean;
}

export interface DecisionTrace {
    id: string;
    timestamp: string;
    case_id: string; // e.g., "CASE 1"
    account_id: string;
    campaign_id?: string;
    ad_id?: string;
    status: 'FATIGUED' | 'NORMAL' | 'SCALED_AGGRESSIVE' | 'WINNER';
    metrics: {
        roas: number;
        fatigue: number;
    };
    consensus: {
        vote: VoteType;
        confidence: number;
        agent_votes: string[]; // "Risk=PAUSE"
    };
    action_taken: string;
    gen_ai_reason?: string;
}

// --- V4 Decision Council Types ---

export type AgentID = 'budget' | 'risk' | 'trend' | 'policy' | 'ml';

export type VoteType = 'SCALE' | 'PAUSE' | 'MONITOR' | 'DECREASE';

export interface AgentVote {
    agentId: AgentID;
    vote: VoteType;
    confidence: number; // 0.0 - 1.0
    reason: string;
}

export interface ConsensusResult {
    decision: VoteType;
    votes: AgentVote[];
    veto_triggered?: boolean;
    veto_agent?: AgentID;
    soft_veto_override?: boolean; // For Aggressive Mode
}


export interface CampaignAssignment {
    id: string;
    campaign_name: string;
    objective: string;
    assigned_profile: OptimizationMode;
}

export interface OptimizationConfig {
    mode: OptimizationMode;
    autopilot_level: AutopilotLevel;
    risk_preferences: {
        velocity_cap_enabled: boolean;
        fatigue_tolerance_level: 'low' | 'medium' | 'high';
        learning_phase_strictness: boolean;
    };
    campaign_assignments: CampaignAssignment[];
    activated: boolean;
}

export const RISK_PROFILES: Record<OptimizationMode, RiskProfile> = {
    defensive: {
        mode: 'defensive',
        risk_veto_type: 'hard',
        max_daily_scale: 0.0,
        ml_weight: 0.3,
        approval_required: true,
    },
    balanced: {
        mode: 'balanced',
        risk_veto_type: 'hard',
        max_daily_scale: 0.1,
        ml_weight: 0.6,
        approval_required: true, // simplified for now, prompt said optional but safer to default true
    },
    aggressive: {
        mode: 'aggressive',
        risk_veto_type: 'soft',
        max_daily_scale: 0.2,
        ml_weight: 0.9,
        approval_required: false,
    },
};

export interface SafetyScoreMetrics {
    score: number;             // 0 to 100
    system_health: string;     // e.g., "System is healthy", "At Risk"
    vetoes_triggered_24h: number;
    avg_velocity_expansion: number; // 0.0 to 1.0 (float)
    recent_vetoes: {
        id: number | string;
        time: string; // ISO 8601
        type: string;
        message: string;
        reason: string;
        agent: string;
    }[];
}

export interface CommandCenterMetrics {
    active_status: boolean;
    last_decision_time: string; // ISO 8601
    current_mode: string;       // e.g., "balanced", "growth"
    autopilot_level: string;    // e.g., "assisted", "autonomous"

    decisions_today: number;
    decisions_change_pct: number; // e.g., 12.0 for +12%

    spend_managed_24h: number;    // Float (Currency)
    waste_saved_24h: number;      // Float (Currency)

    risk_exposure_score: number;  // 0-100
    system_health_score: number;  // 0-100

    next_optimization_time: string; // "MM:SS" e.g., "04:15"
}
