import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

// Keys for cache invalidation
export const OPTIMIZATION_KEYS = {
    all: ['optimization'] as const,
    config: () => [...OPTIMIZATION_KEYS.all, 'config'] as const,
    campaigns: () => [...OPTIMIZATION_KEYS.all, 'campaigns'] as const,
    activity: () => [...OPTIMIZATION_KEYS.all, 'activity'] as const,
    metrics: () => [...OPTIMIZATION_KEYS.all, 'metrics'] as const,
    safety: () => [...OPTIMIZATION_KEYS.metrics(), 'safety'] as const,
    commandCenter: () => [...OPTIMIZATION_KEYS.metrics(), 'command-center'] as const,
    traces: () => [...OPTIMIZATION_KEYS.all, 'traces'] as const,
    analytics: () => [...OPTIMIZATION_KEYS.all, 'analytics'] as const,
    trends: () => [...OPTIMIZATION_KEYS.analytics(), 'trends'] as const,
    agents: () => [...OPTIMIZATION_KEYS.analytics(), 'agents'] as const,
};

// Config (Stale: 5 mins)
export const useOptimizationConfig = () => {
    return useQuery({
        queryKey: OPTIMIZATION_KEYS.config(),
        queryFn: async () => {
            const res = await api.optimization.getConfig();
            return res.data;
        },
        staleTime: 1000 * 60 * 5,
    });
};

// Update Config
export const useUpdateOptimizationConfig = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.optimization.updateConfig,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: OPTIMIZATION_KEYS.config() });
        }
    });
};

// Campaigns (Stale: 1 min, Refetch: 2 mins)
export const useOptimizationCampaigns = () => {
    return useQuery({
        queryKey: OPTIMIZATION_KEYS.campaigns(),
        queryFn: async () => {
            const res = await api.optimization.getCampaigns();
            return res.data;
        },
        staleTime: 1000 * 60 * 1,
        refetchInterval: 1000 * 60 * 2,
    });
};

// Activity Stream (Stale: 30s, Refetch: 1 min)
export const useOptimizationActivity = () => {
    return useQuery({
        queryKey: OPTIMIZATION_KEYS.activity(),
        queryFn: async () => {
            const res = await api.optimization.getActivity();
            return res.data;
        },
        staleTime: 1000 * 30,
        refetchInterval: 1000 * 60,
    });
};

// Safety Metrics (Stale: 30s)
export const useSafetyMetrics = () => {
    return useQuery({
        queryKey: OPTIMIZATION_KEYS.safety(),
        queryFn: async () => {
            const res = await api.optimization.getSafetyMetrics();
            return res.data;
        },
        staleTime: 1000 * 30,
        refetchInterval: 1000 * 60,
    });
};

// Command Center Metrics (Stale: 30s)
export const useCommandCenterMetrics = () => {
    return useQuery({
        queryKey: OPTIMIZATION_KEYS.commandCenter(),
        queryFn: async () => {
            const res = await api.optimization.getCommandCenterMetrics();
            return res.data;
        },
        staleTime: 1000 * 30,
        refetchInterval: 1000 * 60,
    });
};

// Traces (Stale: 1 min)
export const useDecisionTraces = () => {
    return useQuery({
        queryKey: OPTIMIZATION_KEYS.traces(),
        queryFn: async () => {
            const res = await api.optimization.getTraces();
            return res.data;
        },
        staleTime: 1000 * 60,
        refetchInterval: 1000 * 60 * 2,
    });
};

// Trends (Stale: 5 mins)
export const useOptimizationTrends = () => {
    return useQuery({
        queryKey: OPTIMIZATION_KEYS.trends(),
        queryFn: async () => {
            const res = await api.optimization.getTrends();
            return res.data;
        },
        staleTime: 1000 * 60 * 5,
    });
};

// Agent Stats (Stale: 5 mins)
export const useAgentStats = () => {
    return useQuery({
        queryKey: OPTIMIZATION_KEYS.agents(),
        queryFn: async () => {
            const res = await api.optimization.getAgentStats();
            return res.data;
        },
        staleTime: 1000 * 60 * 5,
    });
};

// Register Optimizer Mutation
export const useRegisterOptimizer = () => {
    return useMutation({
        mutationFn: api.optimization.registerOptimizer
    });
};
