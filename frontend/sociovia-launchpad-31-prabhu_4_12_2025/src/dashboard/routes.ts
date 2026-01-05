/**
 * Dashboard Route Configuration
 * ==============================
 * Central source of truth for all dashboard routes and breadcrumb metadata.
 * Used by useBreadcrumbs hook to generate navigation chains.
 * 
 * @example Adding a new route:
 * newRoute: { path: '/dashboard/new-feature', label: 'New Feature', parent: 'dashboard' },
 */

export interface RouteConfig {
    path: string;
    label: string;
    parent?: string;  // Route key name, validated at runtime
}

export const DASHBOARD_ROUTES = {
    // Root dashboard
    dashboard: { path: '/dashboard', label: 'Dashboard' },

    // Workspace Section
    workspaces: { path: '/workspaces', label: 'Workspaces', parent: 'dashboard' },
    workspaceList: { path: '/workspace-list', label: 'Workspaces', parent: 'dashboard' },
    workspaceSetup: { path: '/workspace-setup', label: 'Create Workspace', parent: 'dashboard' },
    workspaceCreate: { path: '/workspace-create', label: 'Create Workspace', parent: 'dashboard' },
    workspaceCreateAlt: { path: '/workspace/create', label: 'Create Workspace', parent: 'dashboard' },
    workspaceManage: { path: '/workspace-manage', label: 'Manage Workspace', parent: 'dashboard' },
    workspaceManageId: { path: '/workspace/manage/:id', label: 'Manage Workspace', parent: 'dashboard' },
    workspace: { path: '/workspace/:id', label: 'Workspace', parent: 'dashboard' },
    workspaceEdit: { path: '/workspace/edit/:id', label: 'Edit Workspace', parent: 'dashboard' },
    workspaceEditAlt: { path: '/workspace/:id/edit', label: 'Edit Workspace', parent: 'dashboard' },
    workspaceAssets: { path: '/workspace/assets/:id', label: 'Assets', parent: 'dashboard' },
    workspaceAssetsAlt: { path: '/workspace/:id/assets', label: 'Assets', parent: 'dashboard' },
    workspaceChat: { path: '/workspace/:id/chat', label: 'AI Chat', parent: 'dashboard' },

    // Settings & Account
    settings: { path: '/settings', label: 'Settings', parent: 'dashboard' },
    adAccounts: { path: '/ad-accounts', label: 'Ad Accounts', parent: 'dashboard' },
    adAccountsAlt: { path: '/workspace/ad-accounts', label: 'Ad Accounts', parent: 'dashboard' },
    bindMeta: { path: '/bind-meta', label: 'Link Meta', parent: 'dashboard' },
    bindMetaAlt: { path: '/workspace/bind-meta', label: 'Link Meta', parent: 'dashboard' },
    userManagement: { path: '/user-management', label: 'User Management', parent: 'dashboard' },
    userManagementId: { path: '/user-management/:id', label: 'User Management', parent: 'dashboard' },
    workspaceUsers: { path: '/workspace/users', label: 'User Management', parent: 'dashboard' },

    // Campaign Creation Flow
    create: { path: '/create', label: 'Create Campaign', parent: 'dashboard' },
    createObjective: { path: '/create/objective', label: 'Objective', parent: 'create' },
    createAudience: { path: '/create/audience', label: 'Audience', parent: 'create' },
    createBudget: { path: '/create/budget', label: 'Budget', parent: 'create' },
    createPlacement: { path: '/create/placement', label: 'Placements', parent: 'create' },
    createPlacements: { path: '/create/placements', label: 'Placements', parent: 'create' },
    createCreativeChoice: { path: '/create/creative-choice', label: 'Choose Creative', parent: 'create' },
    createCreativeChoice2: { path: '/create/creative-choice2', label: 'Choose Creative', parent: 'create' },
    createCreative: { path: '/create/creative', label: 'Creative', parent: 'create' },
    createReview: { path: '/create/review', label: 'Review', parent: 'create' },

    // Standalone Campaign Routes
    objective: { path: '/objective', label: 'Objective', parent: 'dashboard' },
    audience: { path: '/audience', label: 'Audience', parent: 'dashboard' },
    budget: { path: '/budget', label: 'Budget', parent: 'dashboard' },
    placements: { path: '/placements', label: 'Placements', parent: 'dashboard' },
    creative: { path: '/creative', label: 'Creative', parent: 'dashboard' },
    review: { path: '/review', label: 'Review', parent: 'dashboard' },
    start: { path: '/start', label: 'Start Campaign', parent: 'dashboard' },
    start2: { path: '/start2', label: 'Start Campaign', parent: 'dashboard' },
    campaign: { path: '/campaign/:id', label: 'Campaign Details', parent: 'dashboard' },

    // Marketing Dashboard
    marketingDashboard: { path: '/marketing-dashboard', label: 'Marketing', parent: 'dashboard' },
    marketingCampaign: { path: '/marketing-dashboard/:id', label: 'Campaign', parent: 'marketingDashboard' },

    // AI & Workflows
    aiCampaignBuilder: { path: '/ai-campaign-builder', label: 'AI Campaign Builder', parent: 'dashboard' },
    assistant: { path: '/assistant', label: 'AI Assistant', parent: 'dashboard' },
    workflow: { path: '/workflow', label: 'Workflow Builder', parent: 'dashboard' },
    workflowId: { path: '/workflow/:id', label: 'Workflow', parent: 'workflow' },
    workflowBuilder: { path: '/workflow-builder', label: 'Workflow Builder', parent: 'dashboard' },
    chatUI: { path: '/chatui', label: 'AI Chat', parent: 'dashboard' },
    socioviaAI: { path: '/sociovia-ai', label: 'AI Chat', parent: 'dashboard' },

    // Analytics & Insights
    metaAdsAnalytics: { path: '/meta-ads-analytics', label: 'Meta Ads Analytics', parent: 'dashboard' },
    facebookInsights: { path: '/facebook-insights', label: 'Facebook Insights', parent: 'dashboard' },
    fbInsights: { path: '/fb-insights', label: 'Facebook Insights', parent: 'dashboard' },
    tokenTracking: { path: '/token-tracking', label: 'Token Usage', parent: 'dashboard' },

    // CTWA (Click-to-WhatsApp Ads)
    ctwaCreate: { path: '/ctwa/create', label: 'Create CTWA Ad', parent: 'dashboard' },
    ctwaCampaigns: { path: '/ctwa/campaigns', label: 'CTWA Campaigns', parent: 'dashboard' },

    // Billing & Pricing
    billing: { path: '/billing', label: 'Billing', parent: 'dashboard' },
    pricing: { path: '/pricing', label: 'Pricing', parent: 'dashboard' },

    // WhatsApp section
    whatsapp: { path: '/dashboard/whatsapp', label: 'WhatsApp', parent: 'dashboard' },
    whatsappInbox: { path: '/dashboard/whatsapp/inbox', label: 'Inbox', parent: 'whatsapp' },
    whatsappSettings: { path: '/dashboard/whatsapp/settings', label: 'Settings', parent: 'whatsapp' },
    whatsappTestConsole: { path: '/dashboard/whatsapp/test-console', label: 'Test Console', parent: 'whatsapp' },
    whatsappAnalytics: { path: '/dashboard/whatsapp/analytics', label: 'Analytics', parent: 'whatsapp' },

    // WhatsApp Templates
    whatsappTemplates: { path: '/dashboard/whatsapp/templates', label: 'Templates', parent: 'whatsapp' },
    whatsappTemplatesBuilder: { path: '/dashboard/whatsapp/templates/builder', label: 'Template Builder', parent: 'whatsappTemplates' },
    whatsappTemplatesNew: { path: '/dashboard/whatsapp/templates/new', label: 'New Template', parent: 'whatsappTemplates' },
    whatsappTemplatesEdit: { path: '/dashboard/whatsapp/templates/:id/edit', label: 'Edit Template', parent: 'whatsappTemplates' },

    // WhatsApp Flows
    whatsappFlows: { path: '/dashboard/whatsapp/flows', label: 'Flows', parent: 'whatsapp' },
    whatsappFlowsNew: { path: '/dashboard/whatsapp/flows/new', label: 'New Flow', parent: 'whatsappFlows' },
    whatsappFlowsV2New: { path: '/dashboard/whatsapp/flows/v2/new', label: 'New Flow', parent: 'whatsappFlows' },
    whatsappFlowsV1New: { path: '/dashboard/whatsapp/flows/v1/new', label: 'New Flow (Legacy)', parent: 'whatsappFlows' },
    whatsappFlowsView: { path: '/dashboard/whatsapp/flows/:id', label: 'View Flow', parent: 'whatsappFlows' },
    whatsappFlowsEdit: { path: '/dashboard/whatsapp/flows/:id/edit', label: 'Edit Flow', parent: 'whatsappFlows' },

    // WhatsApp Other
    whatsappConversations: { path: '/dashboard/whatsapp/conversations', label: 'Conversations', parent: 'whatsapp' },
    whatsappTest: { path: '/dashboard/whatsapp/test', label: 'Test', parent: 'whatsapp' },
    whatsappSetup: { path: '/dashboard/whatsapp/setup', label: 'Setup', parent: 'whatsapp' },
    whatsappCampaignCreate: { path: '/dashboard/whatsapp/campaign/create', label: 'Create Campaign', parent: 'whatsapp' },

    // Google section
    google: { path: '/dashboard/google', label: 'Google Ads', parent: 'dashboard' },

    // Email section
    email: { path: '/dashboard/email', label: 'Email Marketing', parent: 'dashboard' },
} as const satisfies Record<string, RouteConfig>;

export type DashboardRouteKey = keyof typeof DASHBOARD_ROUTES;

/**
 * Get route config by matching a pathname.
 * Handles dynamic route parameters (e.g., :id).
 */
export function getRouteByPath(pathname: string): RouteConfig | null {
    // First try exact match
    for (const key of Object.keys(DASHBOARD_ROUTES) as DashboardRouteKey[]) {
        const route = DASHBOARD_ROUTES[key];
        if (route.path === pathname) {
            return route;
        }
    }

    // Then try pattern matching for dynamic routes
    for (const key of Object.keys(DASHBOARD_ROUTES) as DashboardRouteKey[]) {
        const route = DASHBOARD_ROUTES[key];
        if (route.path.includes(':')) {
            const pattern = route.path.replace(/:[^/]+/g, '[^/]+');
            const regex = new RegExp(`^${pattern}$`);
            if (regex.test(pathname)) {
                return route;
            }
        }
    }

    return null;
}

/**
 * Build a breadcrumb chain from a route key up to root dashboard.
 */
export function buildBreadcrumbChain(routeKey: DashboardRouteKey): RouteConfig[] {
    const chain: RouteConfig[] = [];
    let currentKey: DashboardRouteKey | undefined = routeKey;

    while (currentKey) {
        const route = DASHBOARD_ROUTES[currentKey];
        chain.unshift(route);
        // Use 'in' check to safely access optional parent property
        currentKey = ('parent' in route ? route.parent : undefined) as DashboardRouteKey | undefined;
    }

    return chain;
}

/**
 * Get route key by matching a pathname.
 */
export function getRouteKeyByPath(pathname: string): DashboardRouteKey | null {
    // First try exact match
    for (const key of Object.keys(DASHBOARD_ROUTES) as DashboardRouteKey[]) {
        const route = DASHBOARD_ROUTES[key];
        if (route.path === pathname) {
            return key;
        }
    }

    // Then try pattern matching for dynamic routes
    for (const key of Object.keys(DASHBOARD_ROUTES) as DashboardRouteKey[]) {
        const route = DASHBOARD_ROUTES[key];
        if (route.path.includes(':')) {
            const pattern = route.path.replace(/:[^/]+/g, '[^/]+');
            const regex = new RegExp(`^${pattern}$`);
            if (regex.test(pathname)) {
                return key;
            }
        }
    }

    return null;
}
