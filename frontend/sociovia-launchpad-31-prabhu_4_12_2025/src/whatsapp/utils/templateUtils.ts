// Template Builder Utilities
// ==========================
// Types, validation, and Meta API payload generation

// ============================================================
// Types
// ============================================================

export type TemplateCategory = 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
export type TemplateStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type HeaderType = 'none' | 'text' | 'image';
export type ButtonType = 'quick_reply' | 'url' | 'phone' | 'flow';

export interface TemplateButton {
    type: ButtonType;
    text: string;
    url?: string;
    phone?: string;
    flow_id?: string;      // Meta Flow ID for flow buttons
    flow_token?: string;   // Initial data token (optional)
}

export interface TemplateHeader {
    type: HeaderType;
    text?: string;
    imageUrl?: string;
}

export interface TemplateState {
    id?: number;
    name: string;
    category: TemplateCategory;
    language: string;
    status: TemplateStatus;
    rejectionReason?: string;
    header: TemplateHeader;
    body: string;
    footer: string;
    buttons: TemplateButton[];
}

export interface ValidationErrors {
    name?: string;
    header?: string;
    body?: string;
    footer?: string;
    buttons?: string;
    [key: string]: string | undefined;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationErrors;
}

// Meta API component types
export interface MetaComponent {
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    format?: 'TEXT' | 'IMAGE';
    text?: string;
    example?: {
        body_text?: string[][];
        header_handle?: string[];
    };
    buttons?: Array<{
        type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'FLOW';
        text: string;
        url?: string;
        phone_number?: string;
        flow_id?: string;
        flow_token?: string;
    }>;
}

// ============================================================
// Default State
// ============================================================

export const defaultTemplateState: TemplateState = {
    name: '',
    category: 'UTILITY',
    language: 'en_US',
    status: 'DRAFT',
    header: { type: 'text' },
    body: '',
    footer: '',
    buttons: [],
};

// ============================================================
// Languages
// ============================================================

export const SUPPORTED_LANGUAGES = [
    { code: 'en_US', label: 'English (US)' },
    { code: 'en_GB', label: 'English (UK)' },
    { code: 'hi', label: 'Hindi' },
    { code: 'es', label: 'Spanish' },
    { code: 'pt_BR', label: 'Portuguese (BR)' },
    { code: 'ar', label: 'Arabic' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'it', label: 'Italian' },
    { code: 'id', label: 'Indonesian' },
];

export const CATEGORIES: { value: TemplateCategory; label: string }[] = [
    { value: 'UTILITY', label: 'Utility' },
    { value: 'MARKETING', label: 'Marketing' },
    { value: 'AUTHENTICATION', label: 'Authentication' },
];

// ============================================================
// Variable Parsing
// ============================================================

/**
 * Extract variables from body text ({{1}}, {{2}}, etc.)
 */
export function parseVariables(text: string): number[] {
    const regex = /\{\{(\d+)\}\}/g;
    const variables: number[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        const num = parseInt(match[1], 10);
        if (!variables.includes(num)) {
            variables.push(num);
        }
    }

    return variables.sort((a, b) => a - b);
}

/**
 * Check if variables are sequential (1, 2, 3...) with no gaps
 */
export function validateVariableSequence(variables: number[]): boolean {
    if (variables.length === 0) return true;

    for (let i = 0; i < variables.length; i++) {
        if (variables[i] !== i + 1) {
            return false;
        }
    }

    return true;
}

// ============================================================
// Validation
// ============================================================

/**
 * Validate template name (lowercase, numbers, underscores only)
 */
export function validateTemplateName(name: string): string | undefined {
    if (!name) {
        return 'Template name is required';
    }

    if (!/^[a-z0-9_]+$/.test(name)) {
        return 'Use lowercase letters, numbers, and underscores only';
    }

    if (name.length < 2) {
        return 'Template name must be at least 2 characters';
    }

    if (name.length > 512) {
        return 'Template name is too long (max 512 characters)';
    }

    return undefined;
}

/**
 * Validate full template state
 */
export function validateTemplate(state: TemplateState): ValidationResult {
    const errors: ValidationErrors = {};

    // Name validation
    const nameError = validateTemplateName(state.name);
    if (nameError) {
        errors.name = nameError;
    }

    // Header validation (optional - only validate if content provided)
    if (state.header.type === 'text') {
        if (state.header.text && state.header.text.length > 60) {
            errors.header = 'Header too long (max 60 characters)';
        }
    } else if (state.header.type === 'image') {
        // Image URL is optional for preview, but may be required by Meta
        if (state.header.imageUrl && !state.header.imageUrl.startsWith('http')) {
            errors.header = 'Header image must be a valid URL';
        }
    }

    // Body validation
    if (!state.body) {
        errors.body = 'Body text is required';
    } else if (state.body.length > 1024) {
        errors.body = 'Body too long (max 1024 characters)';
    } else {
        // Variable validation
        const variables = parseVariables(state.body);
        if (!validateVariableSequence(variables)) {
            errors.body = 'Variables must be sequential ({{1}}, {{2}}, {{3}}...) with no gaps';
        }
    }

    // Footer validation
    if (state.footer && state.footer.length > 60) {
        errors.footer = 'Footer too long (max 60 characters)';
    }

    // Button validation
    if (state.category === 'AUTHENTICATION' && state.buttons.length > 0) {
        errors.buttons = 'Authentication templates cannot have buttons';
    } else if (state.buttons.length > 3) {
        errors.buttons = 'Maximum 3 buttons allowed';
    } else {
        // Validate each button
        for (const btn of state.buttons) {
            if (!btn.text || btn.text.length < 1) {
                errors.buttons = 'Button text is required';
                break;
            }
            if (btn.text.length > 25) {
                errors.buttons = 'Button text too long (max 25 characters)';
                break;
            }
            if (btn.type === 'url' && btn.url) {
                try {
                    new URL(btn.url);
                } catch {
                    errors.buttons = 'Invalid URL format';
                    break;
                }
            }
            // Flow button validation
            if (btn.type === 'flow' && !btn.flow_id) {
                errors.buttons = 'Please select a published flow for the Flow button';
                break;
            }
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}

// ============================================================
// Meta API Payload Generation
// ============================================================

/**
 * Build Meta API components from template state
 */
export function buildMetaTemplateComponents(state: TemplateState): MetaComponent[] {
    const components: MetaComponent[] = [];

    // Header component
    if (state.header.type === 'text' && state.header.text) {
        components.push({
            type: 'HEADER',
            format: 'TEXT',
            text: state.header.text,
        });
    } else if (state.header.type === 'image' && state.header.imageUrl) {
        components.push({
            type: 'HEADER',
            format: 'IMAGE',
            example: {
                header_handle: [state.header.imageUrl],
            },
        });
    }

    // Body component (with examples for variables)
    const variables = parseVariables(state.body);
    const bodyComponent: MetaComponent = {
        type: 'BODY',
        text: state.body,
    };

    if (variables.length > 0) {
        bodyComponent.example = {
            body_text: [variables.map((_, i) => `example${i + 1}`)],
        };
    }

    components.push(bodyComponent);

    // Footer component
    if (state.footer) {
        components.push({
            type: 'FOOTER',
            text: state.footer,
        });
    }

    // Buttons component (only if NOT AUTHENTICATION and has buttons)
    if (state.category !== 'AUTHENTICATION' && state.buttons.length > 0) {
        components.push({
            type: 'BUTTONS',
            buttons: state.buttons.map(btn => {
                // Map button type to Meta API format
                const getMetaButtonType = () => {
                    switch (btn.type) {
                        case 'quick_reply': return 'QUICK_REPLY';
                        case 'url': return 'URL';
                        case 'phone': return 'PHONE_NUMBER';
                        case 'flow': return 'FLOW';
                    }
                };
                return {
                    type: getMetaButtonType(),
                    text: btn.text,
                    ...(btn.type === 'url' && btn.url ? { url: btn.url } : {}),
                    ...(btn.type === 'phone' && btn.phone ? { phone_number: btn.phone } : {}),
                    ...(btn.type === 'flow' && btn.flow_id ? { flow_id: btn.flow_id, flow_token: btn.flow_token || '' } : {}),
                };
            }),
        });
    }

    return components;
}

/**
 * Build full API request payload
 */
export function buildTemplateApiPayload(
    state: TemplateState,
    accountId: number
): {
    account_id: number;
    name: string;
    category: TemplateCategory;
    language: string;
    components: MetaComponent[];
} {
    return {
        account_id: accountId,
        name: state.name,
        category: state.category,
        language: state.language,
        components: buildMetaTemplateComponents(state),
    };
}

// ============================================================
// Suggestion to State Conversion
// ============================================================

export interface TemplateSuggestion {
    id: string;
    title: string;
    category: string;
    language: string;
    preview: string;
    variables: number;
    description: string;
}

/**
 * Convert a template suggestion to editable state
 */
export function suggestionToState(suggestion: TemplateSuggestion): TemplateState {
    // Generate a name from the suggestion ID
    const name = suggestion.id.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    return {
        ...defaultTemplateState,
        name,
        category: (suggestion.category?.toUpperCase() || 'UTILITY') as TemplateCategory,
        language: suggestion.language || 'en_US',
        body: suggestion.preview || '',
        status: 'DRAFT',
    };
}
