import {
    User, UserPreferences, SimulationRequest, SimulationResponse,
    DecisionRecord, WorkflowPayload, OptimizationConfig, CampaignMetrics,
    ActivityItem, TrendDataPoint, AgentStat
} from '../types/api';
import { SafetyScoreMetrics, CommandCenterMetrics } from '../optimization/types';

// Use proxy in development (vite.config.ts handles the target)
export const API_BASE_URL = 'https://adoptimizer-362038465411.asia-south2.run.app';

let currentWorkspaceId = 1;

export const setWorkspaceId = (id: number) => {
    currentWorkspaceId = id;
};

// Helper to get headers
const getHeaders = () => {
    const stored = localStorage.getItem('sv_selected_workspace_id');
    const wsId = stored ? stored : currentWorkspaceId.toString();

    return {
        'Content-Type': 'application/json',
        'X-Workspace-ID': wsId,
        // Add auth token if needed, assuming cookie based or header based
        // 'Authorization': `Bearer ${localStorage.getItem('sv_token')}` 
    };
};

// Generic Fetch Wrapper
async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<{ data: T }> {
    const url = `${API_BASE_URL}${endpoint}`;

    const token = localStorage.getItem('sv_token');

    const headers = {
        ...getHeaders(),
        ...(options.headers || {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorBody = '';
        try {
            errorBody = await response.text();
        } catch (e) { /* ignore */ }
        console.error(`API Error ${response.status} for ${url}:`, errorBody);
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody.substring(0, 100)}`);
    }

    // Handle empty responses
    if (response.status === 204) {
        return { data: {} as T };
    }

    const data = await response.json();
    return { data };
}

// 3. API Methods
export const api = {
    // --- Optimization Module ---
    optimization: {
        registerOptimizer: () => fetchJson('/api/optimization/register', { method: 'POST' }),
        getConfig: () => fetchJson<OptimizationConfig>('/api/optimization/config'),
        updateConfig: (config: OptimizationConfig) => fetchJson<OptimizationConfig>('/api/optimization/config', {
            method: 'POST',
            body: JSON.stringify(config)
        }),
        getCampaigns: () => fetchJson<CampaignMetrics[]>('/api/optimization/campaigns'),
        getActivity: () => fetchJson<ActivityItem[]>('/api/optimization/activity'),
        getTraces: () => fetchJson<DecisionRecord[]>('/api/optimization/traces'),
        getTrends: () => fetchJson<TrendDataPoint[]>('/api/optimization/analytics/trends'),
        getAgentStats: () => fetchJson<AgentStat[]>('/api/optimization/analytics/agents'),

        // --- Dashboard Widgets ---
        getSafetyMetrics: () => fetchJson<SafetyScoreMetrics>('/api/optimization/dashboard/safety'),
        getCommandCenterMetrics: () => fetchJson<CommandCenterMetrics>('/api/optimization/dashboard/command-center'),
    },

    // --- Agents ---
    agents: {
        list: () => fetchJson('/api/agents'),
        process: (name: string, context: any) => fetchJson(`/api/agents/${name}/process`, {
            method: 'POST',
            body: JSON.stringify({ context })
        })
    },

    // --- Data ---
    data: {
        getHistory: (limit = 100, offset = 0) => fetchJson(`/api/data/history?limit=${limit}&offset=${offset}`),
        getDataset: () => fetchJson('/api/data/dataset')
    },

    // --- Workflows ---
    saveWorkflow: (payload: WorkflowPayload) => fetchJson('/workflows', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),
    dryRunWorkflow: (payload: WorkflowPayload) => fetchJson('/workflows/dry-run', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),
    listWorkflows: () => fetchJson('/workflows/custom'),

    // --- User & Settings ---
    getMe: () => fetchJson<User>('/api/me'),
    updatePreferences: (prefs: UserPreferences) => fetchJson('/api/me/preferences', {
        method: 'POST',
        body: JSON.stringify({ preferences: prefs })
    }),
    updateWorkspaceSettings: (settings: any) => fetchJson('/api/workspace/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings })
    })
};
