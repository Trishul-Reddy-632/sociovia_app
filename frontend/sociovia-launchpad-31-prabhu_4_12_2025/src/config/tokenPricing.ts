// Token pricing configuration and utilities

export interface TokenPricing {
    contentGeneration: number; // per 1000 tokens
    imageProcessing: number;
    aiSuggestions: number;
    audienceTargeting: number;
    default: number;
}

export interface TokenUsageSummary {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    lastUpdated: string;
}

export interface TokenUsageRecord {
    id: string;
    timestamp: string; // ISO 8601 format
    requestType: string; // e.g., "Content Generation", "Image Processing"
    model: string; // e.g., "GPT-4", "GPT-3.5-turbo", "Claude"
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}

// Pricing per 1000 tokens (in USD)
export const TOKEN_PRICING: TokenPricing = {
    contentGeneration: 0.03, // $0.03 per 1K tokens
    imageProcessing: 0.04,   // $0.04 per 1K tokens
    aiSuggestions: 0.02,     // $0.02 per 1K tokens
    audienceTargeting: 0.025, // $0.025 per 1K tokens
    default: 0.03,           // $0.03 per 1K tokens (fallback)
};

// Model-specific pricing (more granular)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
    "gpt-4": { input: 0.03, output: 0.06 },
    "gpt-4-turbo": { input: 0.01, output: 0.03 },
    "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
    "claude-3-opus": { input: 0.015, output: 0.075 },
    "claude-3-sonnet": { input: 0.003, output: 0.015 },
    "claude-3-haiku": { input: 0.00025, output: 0.00125 },
    "dall-e-3": { input: 0.04, output: 0.08 },
    "default": { input: 0.03, output: 0.06 },
};

/**
 * Calculate cost for a given number of tokens and request type
 */
export function calculateCost(
    tokens: number,
    requestType: keyof TokenPricing
): number {
    const pricePerThousand = TOKEN_PRICING[requestType] || TOKEN_PRICING.default;
    return (tokens / 1000) * pricePerThousand;
}

/**
 * Calculate cost based on model and token counts
 */
export function calculateModelCost(
    model: string,
    inputTokens: number,
    outputTokens: number
): number {
    const pricing = MODEL_PRICING[model.toLowerCase()] || MODEL_PRICING.default;
    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    return inputCost + outputCost;
}

/**
 * Format cost as currency with optional symbol (defaults to rupee)
 */
export function formatCost(cost: number, symbol: string = "₹"): string {
    return `${symbol}${cost.toFixed(4)}`;
}

/**
 * Format large numbers with commas
 */
export function formatTokenCount(tokens: number): string {
    return tokens.toLocaleString();
}

/**
 * Get request type color for UI
 */
export function getRequestTypeColor(requestType: string): string {
    const colorMap: Record<string, string> = {
        "Content Generation": "bg-blue-100 text-blue-800",
        "Image Processing": "bg-purple-100 text-purple-800",
        "AI Suggestions": "bg-green-100 text-green-800",
        "Audience Targeting": "bg-orange-100 text-orange-800",
        "Other": "bg-gray-100 text-gray-800",
    };
    return colorMap[requestType] || colorMap["Other"];
}
