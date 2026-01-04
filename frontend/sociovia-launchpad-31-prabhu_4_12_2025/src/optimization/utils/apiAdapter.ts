
import { api } from '../../services/api';
import { DecisionTrace } from '../types';

// Adapter to transform clean API response to frontend DecisionTrace
export const fetchDecisionTraces = async (): Promise<DecisionTrace[]> => {
    try {
        const response = await api.optimization.getTraces();
        const records = response.data || [];

        // Map backend DecisionRecord to Frontend DecisionTrace 

        return records.map((rec: any, index: number) => ({
            id: `tr_${rec.timestamp}_${index}`,
            timestamp: rec.timestamp,
            case_id: `CASE ${index + 1}`, // identifying case number
            account_id: rec.account_id,
            ad_id: rec.ad_id,
            status: rec.final_action === 'EXECUTED' ? 'WINNER' : 'FATIGUED', // Simple heuristic for now
            metrics: {
                roas: rec.params?.roas || 0,
                fatigue: rec.params?.fatigue_score || 0
            },
            consensus: {
                vote: rec.proposed_action === 'SCALE_UP' ? 'SCALE' : 'PAUSE',
                confidence: rec.confidence,
                agent_votes: rec.votes?.map((v: any) => `${v.agent}=${v.action}`) || []
            },
            action_taken: rec.final_action,
            gen_ai_reason: rec.params?.gen_ai_reason
        }));

    } catch (error) {
        console.warn("Failed to fetch traces", error);
        return [];
    }
}

export const fetchActivityFeed = async (): Promise<any[]> => {
    try {
        const response = await api.optimization.getActivity();
        const rawUtils = response.data || [];

        return rawUtils.map((item: any) => {
            // 1. Clean up "message" if it contains JSON
            let cleanMessage = item.message;
            if (item.message && item.message.includes('{')) {
                try {
                    // Extract JSON part if mixed strings
                    const jsonStart = item.message.indexOf('{');
                    const jsonPart = item.message.substring(jsonStart);
                    const parsed = JSON.parse(jsonPart);

                    // Custom formatting based on parsed JSON
                    if (parsed.agent && parsed.reason) {
                        cleanMessage = `${parsed.agent} Decision: ${parsed.reason}`;
                    }
                } catch (ignore) {
                    // Keep original if parse fails
                }
            }

            return {
                ...item,
                message: cleanMessage
            };
        });
    } catch (e) {
        console.warn("Failed to fetch activity", e);
        return [];
    }
}
