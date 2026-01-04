/**
 * AdOptimizer Type Definitions
 * Auto-generated for Frontend Integration
 */

// --- Authentication & Headers ---
// Header: X-Workspace-ID

// --- Models ---

export interface Workspace {
    id: number;
    name: string;
    settings: Record<string, any>; // e.g., { theme: 'dark', currency: 'USD' }
    createdAt: string;
}

export interface User {
    id: number;
    username: string;
    email: string;
    workspace_id: number;
    preferences: UserPreferences;
}

export interface UserPreferences {
    theme?: 'light' | 'dark' | 'system';
    notifications_enabled?: boolean;
    table_density?: 'compact' | 'standard' | 'comfortable';
    [key: string]: any;
}

export interface AccountProfile {
    account_id: string;
    min_roas: number;
    risk_tolerance: number; // 0.0 to 1.0
    aggressive_config?: AggressiveConfig;
}

export interface AggressiveConfig {
    soft_scale_enabled: boolean;
    max_daily_scale: number;
    risk_veto_type: 'hard' | 'soft';
}

// --- Simulation & Decisions ---

export interface SimulationRequest {
    scenarios: Array<{
        account_id: string;
        profile?: AccountProfile;
        ad: AdInput;
    }>;
}

export interface AdInput {
    id: string;
    name: string;
    insights: {
        spend: number;
        revenue: number;
        cpa: number;
        ctr: number;
        frequency: number;
    };
    features: {
        roas_3d: number;
        cpa_trend: number;
        fatigue_score: number;
        spend_velocity: number;
        ad_fatigue: number;
    };
}

export interface Vote {
    agent: string;
    action: string;
    confidence: number;
    reason: string;
    params?: Record<string, any>;
}

export interface DecisionRecord {
    account_id: string;
    ad_id: string;
    proposed_action: string; // e.g., "SCALE_UP", "PAUSE_CAMPAIGN"
    confidence: number;
    votes: Vote[];
    final_action: string; // "EXECUTED", "SKIPPED", or action name
    params: Record<string, any>;
    timestamp: string;
}

export interface SimulationResponse {
    results: DecisionRecord[];
}

// --- Optimization Data ---

export interface ActionLog {
    id: number;
    workspace_id: number;
    timestamp: string;
    action_type: string;
    ad_id?: string;
    campaign_id?: string;
    parameters: Record<string, any>;
    status: string; // "EXECUTED", "FAILED", "PROPOSED"
    is_successful: boolean;
}

export interface OptimizationDatasetItem {
    id: number;
    workspace_id: number;
    timestamp: string;
    ad_id: string;
    input_context: any;
    decision: DecisionRecord;
    outcome_score?: number;
}

// --- Optimization Module Models ---

export interface OptimizationConfig {
    mode: 'defensive' | 'balanced' | 'aggressive';
    autopilot_level: 'insights_only' | 'assisted' | 'autopilot';
    risk_preferences: {
        velocity_cap_enabled: boolean;
        fatigue_tolerance_level: 'low' | 'medium' | 'high';
        learning_phase_strictness: boolean;
    };
    activated: boolean;
    campaign_assignments: Array<{
        id: string;
        campaign_name: string;
        objective: string;
        assigned_profile: 'defensive' | 'balanced' | 'aggressive';
    }>;
}

export interface CampaignMetrics {
    id: string;
    campaign_name: string;
    status: string;
    assigned_profile: string;
    spend_7d: number;
    roas: number;
    cpr: number;
    is_optimizing: boolean;
    velocity_usage?: number; // 0.0 - 1.0 (New)
    fatigue_score?: number;  // 0 - 100 (New)
    active_rules?: string[]; // List of active rules (New)
}

export interface ActivityItem {
    id: number | string;
    time: string;
    type: 'scale' | 'pause' | 'monitor' | 'block' | 'hold';
    message: string;
    reason: string;
    agent: string;
}

export interface TrendDataPoint {
    name: string; // e.g. "Mon"
    spend: number;
    roas: number;
    actions: number;
}

export interface AgentStat {
    name: string;
    value: number;
}

// --- Workflows ---

export interface WorkflowNode {
    id: string;
    type?: string; // 'trigger', 'action', 'condition', 'selector', 'approval', 'ai'
    data: {
        label: string;
        config: Record<string, any>;
    };
    position: { x: number; y: number };
}

export interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
}

export interface WorkflowPayload {
    name: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    enabled: boolean;
}
