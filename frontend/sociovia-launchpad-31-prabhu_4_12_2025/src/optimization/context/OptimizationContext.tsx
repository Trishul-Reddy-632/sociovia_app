
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { OptimizationConfig, OptimizationMode, AutopilotLevel } from '../types';
import { api } from '../../services/api';

interface OptimizationContextType {
    config: OptimizationConfig;
    updateMode: (mode: OptimizationMode) => void;
    updateAutopilotLevel: (level: AutopilotLevel) => void;
    updateRiskPreferences: (prefs: Partial<OptimizationConfig['risk_preferences']>) => void;
    updateCampaignAssignment: (campaignId: string, profile: OptimizationMode) => void;
    setCampaignAssignments: (assignments: any[]) => void;
    activateOptimization: () => void;
    resetConfig: () => void;
}

const DEFAULT_CONFIG: OptimizationConfig = {
    mode: 'balanced',
    autopilot_level: 'assisted',
    risk_preferences: {
        velocity_cap_enabled: true,
        fatigue_tolerance_level: 'medium',
        learning_phase_strictness: true,
    },
    campaign_assignments: [],
    activated: false,
};

const OptimizationContext = createContext<OptimizationContextType | undefined>(undefined);

export function OptimizationProvider({ children }: { children: ReactNode }) {
    const [config, setConfig] = useState<OptimizationConfig>(DEFAULT_CONFIG);

    const updateMode = (mode: OptimizationMode) => {
        setConfig((prev) => ({ ...prev, mode }));
    };

    const updateAutopilotLevel = (level: AutopilotLevel) => {
        setConfig((prev) => ({ ...prev, autopilot_level: level }));
    };

    const updateRiskPreferences = (prefs: Partial<OptimizationConfig['risk_preferences']>) => {
        setConfig((prev) => ({
            ...prev,
            risk_preferences: { ...prev.risk_preferences, ...prefs },
        }));
    };

    const updateCampaignAssignment = (campaignId: string, profile: OptimizationMode) => {
        setConfig((prev) => {
            const exists = prev.campaign_assignments.find(c => c.id === campaignId);
            let newAssignments;

            if (exists) {
                newAssignments = prev.campaign_assignments.map(c =>
                    c.id === campaignId ? { ...c, assigned_profile: profile } : c
                );
            } else {
                // CAUTION: This assumes we have campaign name/objective available elsewhere or don't need them strictly for this update logic.
                // In a real app we'd pass the full object. For now, we'll assume the implementation handles full object passing or we find it.
                // Ideally we should pass the full object to this function, but to match the interface let's just update if exists, 
                // or specific logic if we want to add new.
                // For the table step, we usually initialized the list. 
                // Let's defer "adding" new ones to a bulk init or allow partial updates.
                // For simplicity, let's assume we are just updating the profile of an existing assignment 
                // or we need to add a "setAssignments" method.
                // Let's add setAssignments for the table initialization step.
                newAssignments = prev.campaign_assignments;
            }

            return { ...prev, campaign_assignments: newAssignments };
        });
    };

    // Helper to bulk set assignments (e.g. from API load)
    const setCampaignAssignments = (assignments: any[]) => {
        setConfig(prev => ({ ...prev, campaign_assignments: assignments }));
    }

    // Load initial config from API
    React.useEffect(() => {
        const loadConfig = async () => {
            try {
                // Try fetching from backend first
                const response = await api.optimization.getConfig();
                if (response.data) {
                    setConfig(response.data);
                    return;
                }
            } catch (e: any) {
                // Fallback to local storage if backed is offline
                if (e.code === 'ERR_NETWORK' || e.code === 'ECONNREFUSED') {
                    console.warn("Backend offline (Config): Using local storage.");
                    const stored = localStorage.getItem('sv_opt_config');
                    if (stored) {
                        try { setConfig(JSON.parse(stored)); } catch { }
                    }
                }
            }
        };
        loadConfig();
    }, []);

    const activateOptimization = async () => {
        console.log('Activating Optimization with config:', config);
        const newConfig = { ...config, activated: true };
        setConfig(newConfig);

        // Persist locally
        localStorage.setItem('sv_opt_config', JSON.stringify(newConfig));

        // Save to backend
        try {
            await api.optimization.updateConfig(newConfig);
            console.log("Config pushed to backend");
        } catch (e) {
            console.warn("Failed to push config to backend", e);
        }
    };

    const resetConfig = () => {
        setConfig(DEFAULT_CONFIG);
        localStorage.removeItem('sv_opt_config');
    }

    return (
        <OptimizationContext.Provider
            value={{
                config,
                updateMode,
                updateAutopilotLevel,
                updateRiskPreferences,
                updateCampaignAssignment,
                setCampaignAssignments,
                activateOptimization,
                resetConfig
            }}
        >
            {children}
        </OptimizationContext.Provider>
    );
}

export function useOptimization() {
    const context = useContext(OptimizationContext);
    if (context === undefined) {
        throw new Error('useOptimization must be used within an OptimizationProvider');
    }
    return context;
}
