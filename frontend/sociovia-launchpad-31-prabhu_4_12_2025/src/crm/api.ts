import { Lead, Campaign, Contact, Task, Metric, LeadActivity, ContactHistory, Deal } from "./types";
import { API_BASE_URL, API_ENDPOINT } from "@/config";

// Use centralized config for API bases
const BACKEND_API_BASE = API_BASE_URL;
const AI_API_BASE = API_BASE_URL;

// Helper to get current workspace ID
function getWorkspaceId(): string {
    return localStorage.getItem("sv_selected_workspace_id") ||
        sessionStorage.getItem("sv_selected_workspace_id") ||
        "";
}

// Helper to get current user ID
function getUserId(): string {
    try {
        const user = localStorage.getItem("sv_user") || sessionStorage.getItem("sv_user");
        if (user) {
            return JSON.parse(user).id;
        }
    } catch (e) {
        console.error("Failed to parse user", e);
    }
    return "";
}

import apiClient from "@/lib/apiClient";

async function fetchJson<T>(endpoint: string, options: RequestInit = {}, silent: boolean = false): Promise<T> {
    const workspaceId = getWorkspaceId();
    const userId = getUserId();

    // Determine base URL based on endpoint
    let base = BACKEND_API_BASE;
    if (endpoint.startsWith("/api/ai/")) {
        base = AI_API_BASE;
    }

    const url = new URL(endpoint, base || window.location.origin);

    // Append workspace_id and user_id if not present
    if (!url.searchParams.has("workspace_id") && workspaceId) {
        url.searchParams.append("workspace_id", workspaceId);
    }
    if (!url.searchParams.has("user_id") && userId) {
        url.searchParams.append("user_id", userId);
    }

    const fullUrl = url.toString();

    // Use apiClient.request directly for full control and correct error handling
    // options.body is already stringified by callers if present
    const res = await apiClient.request<T>(fullUrl, {
        method: options.method || "GET",
        headers: options.headers as Record<string, string>,
        body: options.body,
    });

    if (!res.ok) {
        // Error handling matching previous behavior
        const msg = res.error?.message || res.error || "Unknown Error";
        if (!silent) {
            console.error(`API Error ${res.status}:`, msg);
        }
        throw new Error(`API Error ${res.status}: ${JSON.stringify(msg)}`);
    }

    // apiClient parses JSON automatically if content-type is json
    // If data is present, return it. If null (for 204), return undefined to match previous behavior (or null)
    return res.data as T;
}

export const api = {
    // Dashboard (now workspace aware via interceptor)
    getDashboardStats: async (startDate?: string, endDate?: string) => {
        try {
            const params = new URLSearchParams();
            // Resolve "30d" etc on frontend to bypass potential backend parser issues
            let start = startDate;
            let end = endDate;

            if (start && start.endsWith("d")) {
                const days = parseInt(start.replace("d", ""), 10);
                if (!isNaN(days)) {
                    const d = new Date();
                    d.setDate(d.getDate() - days);
                    start = d.toISOString().split("T")[0]; // YYYY-MM-DD
                    if (!end || end === "undefined") {
                        end = new Date().toISOString().split("T")[0];
                    }
                }
            }

            if (start && start !== "undefined") params.append("startDate", start);
            if (end && end !== "undefined") params.append("endDate", end);

            return await fetchJson<{ [key: string]: Metric }>(`/api/dashboard/stats?${params.toString()}`, {}, true);
        } catch (e) {
            // Return fallback zeros to prevent UI crash
            return {
                revenue: { value: 0, change: 0, trend: "netural" },
                active_leads: { value: 0, change: 0, trend: "neutral" },
                conversion_rate: { value: 0, change: 0, trend: "neutral" },
                link_clicks: { value: 0, change: 0, trend: "neutral" }
            } as any;
        }
    },

    getRevenueChart: async (startDate?: string, endDate?: string) => {
        try {
            const params = new URLSearchParams();
            let start = startDate;
            let end = endDate;

            if (start && start.endsWith("d")) {
                const days = parseInt(start.replace("d", ""), 10);
                if (!isNaN(days)) {
                    const d = new Date();
                    d.setDate(d.getDate() - days);
                    start = d.toISOString().split("T")[0];
                    if (!end || end === "undefined") {
                        end = new Date().toISOString().split("T")[0];
                    }
                }
            }

            if (start && start !== "undefined") params.append("startDate", start);
            if (end && end !== "undefined") params.append("endDate", end);

            return await fetchJson<{ date: string; value: number }[]>(`/api/dashboard/charts/revenue?${params.toString()}`, {}, true);
        } catch (e) {
            return [];
        }
    },

    getSourceChart: async (startDate?: string, endDate?: string) => {
        try {
            const params = new URLSearchParams();
            let start = startDate;
            let end = endDate;

            if (start && start.endsWith("d")) {
                const days = parseInt(start.replace("d", ""), 10);
                if (!isNaN(days)) {
                    const d = new Date();
                    d.setDate(d.getDate() - days);
                    start = d.toISOString().split("T")[0];
                    if (!end || end === "undefined") {
                        end = new Date().toISOString().split("T")[0];
                    }
                }
            }

            if (start && start !== "undefined") params.append("startDate", start);
            if (end && end !== "undefined") params.append("endDate", end);

            return await fetchJson<{ name: string; value: number }[]>(`/api/dashboard/charts/sources?${params.toString()}`, {}, true);
        } catch (e) {
            return [];
        }
    },

    // Leads
    getLeads: async () => {
        const workspaceId = getWorkspaceId();
        const params = new URLSearchParams();
        if (workspaceId) params.append("workspace_id", workspaceId);

        const res = await fetchJson<any>(`/api/leads?${params.toString()}`);
        return Array.isArray(res) ? res : (res?.data || []);
    },
    createLead: (lead: Partial<Lead>) => {
        // Backend REQUIRES workspace_id as query param for Leads
        const workspaceId = getWorkspaceId();
        const payload = { ...lead, workspace_id: workspaceId };
        const params = new URLSearchParams();
        if (workspaceId) params.append("workspace_id", workspaceId);

        return fetchJson<Lead>(`/api/leads?${params.toString()}`, { method: "POST", body: JSON.stringify(payload) });
    },
    updateLead: (id: string, updates: Partial<Lead>) => fetchJson<Lead>(`/api/leads/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
    deleteLead: (id: string) => fetchJson<void>(`/api/leads/${id}`, { method: "DELETE" }),
    getLeadActivity: (id: string) => fetchJson<LeadActivity[]>(`/api/leads/${id}/activity`),
    addLeadActivity: (id: string, item: Partial<LeadActivity>) =>
        fetchJson<LeadActivity>(`/api/leads/${id}/activity`, { method: "POST", body: JSON.stringify(item) }),

    // Campaigns (Specific Meta Endpoints)

    // 1. Consolidated Campaigns (Meta + CRM merge)
    getConsolidatedCampaigns: (filters?: { date_preset?: string; since?: string; until?: string }) => {
        const params = new URLSearchParams();
        if (filters?.date_preset) params.append("date_preset", filters.date_preset);
        if (filters?.since) params.append("since", filters.since);
        if (filters?.until) params.append("until", filters.until);
        return fetchJson<any>(`/api/meta/consolidated-campaigns?${params.toString()}`);
    },

    // 2. Raw Insights
    // 2. Insights for a specific campaign (visualizations)
    getCampaignInsights: (id: string, datePreset: string = "last_30d") =>
        fetchJson<{ insights: any; date_preset: string; trend?: any[] }>(`/api/campaigns/${id}/insights?date_preset=${datePreset}`),

    // Standard CRUD for Campaigns
    // This fetches purely CRM-stored campaigns
    getCampaigns: async () => {
        const res = await fetchJson<any>("/api/campaigns");
        return Array.isArray(res) ? { data: res } : res;
    },

    // Live Meta Campaigns (Direct from Meta via Backend)
    getLiveCampaigns: async () => {
        const res = await fetchJson<any>("/api/campaigns/live");
        const rawData = Array.isArray(res) ? res : (res?.data || []);

        // Normalize Meta data to match CRM Campaign interface
        const normalizedData = rawData.map((item: any) => ({
            id: item.meta_campaign_id || item.id,
            name: item.name,
            status: (item.status || item.effective_status || "unknown").toLowerCase(),
            objective: item.objective,
            spend: item.insights?.spend || 0,
            impressions: item.insights?.impressions || 0,
            clicks: item.insights?.clicks || 0,
            leads: item.insights?.leads || 0,
            roas: item.insights?.roas || 0,
            cpl: item.insights?.cpl || 0,
            budget: item.daily_budget || item.lifetime_budget,
            start_time: item.start_time,
            end_time: item.stop_time,
            meta: { campaign: item } // Store raw data for reference
        }));

        return { data: normalizedData };
    },

    // Live Meta Detail
    getLiveCampaignDetails: async (metaCampaignId: string) => {
        const item = await fetchJson<any>(`/api/campaigns/live/${metaCampaignId}`);

        // Check if response is wrapped in 'meta' property (Detail view structure)
        if (item.meta && item.meta.campaign) {
            const cmp = item.meta.campaign;
            const ins = item.meta.insights || {};
            const adsets = item.meta.adsets || [];

            return {
                id: item.meta_campaign_id || cmp.id,
                name: cmp.name,
                status: (cmp.status || cmp.effective_status || "unknown").toLowerCase(),
                objective: cmp.objective,
                spend: ins.spend || 0,
                impressions: ins.impressions || 0,
                clicks: ins.clicks || 0,
                leads: ins.leads || 0,
                roas: ins.roas || 0,
                cpl: ins.cpl || 0,
                budget: cmp.daily_budget || cmp.lifetime_budget,
                start_time: cmp.start_time,
                end_time: cmp.stop_time,
                meta: { campaign: cmp, adsets: adsets, insights: ins }
            };
        }

        // Fallback for flat structure (if API changes or for consistency)
        return {
            id: item.meta_campaign_id || item.id,
            name: item.name,
            status: (item.status || item.effective_status || "unknown").toLowerCase(),
            objective: item.objective,
            spend: item.insights?.spend || 0,
            impressions: item.insights?.impressions || 0,
            clicks: item.insights?.clicks || 0,
            leads: item.insights?.leads || 0,
            roas: item.insights?.roas || 0,
            cpl: item.insights?.cpl || 0,
            budget: item.daily_budget || item.lifetime_budget,
            start_time: item.start_time,
            end_time: item.stop_time,
            meta: { campaign: item, adsets: item.adsets || [] }
        };
    },

    // Get Live Ads for a Campaign
    getLiveCampaignAds: async (metaCampaignId: string) => {
        const res = await fetchJson<any>(`/api/campaigns/live/${metaCampaignId}/ads`);
        // Backend returns { data: [...] } or just [...]
        return Array.isArray(res) ? res : (res.data || []);
    },

    getAdPreview: async (adId: string) => {
        // This endpoint returns HTML text, not JSON
        const workspaceId = getWorkspaceId();
        const userId = getUserId();
        const base = BACKEND_API_BASE;
        const url = new URL(`/api/campaigns/live/ads/${adId}/preview`, base);
        if (workspaceId) url.searchParams.append("workspace_id", workspaceId);
        if (userId) url.searchParams.append("user_id", userId);

        const token = localStorage.getItem("sv_token");
        const storedUserId = localStorage.getItem("sv_user_id"); // distinct variable to avoid conflict

        const response = await fetch(url.toString(), {
            credentials: "include",
            headers: {
                ...(token ? { "Authorization": `Bearer ${token}` } : {}),
                ...(storedUserId ? { "X-User-Id": storedUserId } : {}),
            }
        });
        if (!response.ok) throw new Error("Failed to fetch preview");
        return response.text();
    },

    getCampaign: (id: string) => fetchJson<Campaign>(`/api/campaigns/${id}`),
    createCampaign: (data: Partial<Campaign>) => {
        const workspaceId = getWorkspaceId();
        return fetchJson<Campaign>("/api/campaigns", { method: "POST", body: JSON.stringify({ ...data, workspace_id: workspaceId }) });
    },
    updateCampaign: (id: string, data: Partial<Campaign>) => fetchJson<Campaign>(`/api/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteCampaign: (id: string) => fetchJson<void>(`/api/campaigns/${id}`, { method: "DELETE" }),

    // 3. Analytics Link 
    // Triggers sync
    syncAnalytics: (hoursBack: number = 4) =>
        fetchJson<{ ok: boolean; message: string }>("/api/analytics/sync", {
            method: "POST",
            body: JSON.stringify({ hours_back: hoursBack, persist: true })
        }),

    getAnalyticsStatus: () => fetchJson<any>("/api/analytics/status"),

    // Contacts
    // Contacts
    getContacts: async (page = 1, limit = 100) => {
        const workspaceId = getWorkspaceId();
        const params = new URLSearchParams({ page: String(page), per_page: String(limit) });
        if (workspaceId) params.append("workspace_id", workspaceId);

        const res = await fetchJson<{ meta: any, data: Contact[] } | Contact[]>(`/api/contacts?${params.toString()}`);
        // Handle both pagination format and legacy array format if backend changes
        if (Array.isArray(res)) return res;
        return res.data || [];
    },

    createContact: async (contact: Partial<Contact>) => {
        const workspaceId = getWorkspaceId();
        const payload = { ...contact, workspace_id: workspaceId };
        const res = await fetchJson<any>("/api/contacts", { method: "POST", body: JSON.stringify(payload) });
        return res.contact || res;
    },

    upsertContact: (contact: Partial<Contact>) => {
        const workspaceId = getWorkspaceId();
        const payload = { ...contact, workspace_id: workspaceId };
        return fetchJson<{ ok: boolean, id: string, created: boolean }>("/api/contacts/upsert", { method: "POST", body: JSON.stringify(payload) });
    },

    searchContacts: async (query: string) => {
        const workspaceId = getWorkspaceId();
        const res = await fetchJson<{ data: Contact[] }>(`/api/contacts/search?q=${encodeURIComponent(query)}&workspace_id=${workspaceId}`);
        return res.data || [];
    },

    updateContact: (id: string, updates: Partial<Contact>) => fetchJson<Contact>(`/api/contacts/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
    deleteContact: (id: string) => fetchJson<void>(`/api/contacts/${id}`, { method: "DELETE" }),
    getContactHistory: (id: string) => fetchJson<ContactHistory[]>(`/api/contacts/${id}/history`),
    addContactHistory: (id: string, item: Partial<ContactHistory>) =>
        fetchJson<ContactHistory>(`/api/contacts/${id}/history`, { method: "POST", body: JSON.stringify(item) }),

    // Tasks
    getTasks: async () => {
        const res = await fetchJson<any>("/api/tasks");
        const rawData = Array.isArray(res) ? res : (res?.data || []);

        return rawData.map((t: any) => ({
            ...t,
            // normalize due date
            dueDate: t.due_date || t.dueDate,
            // normalize relatedTo if present in flat format
            relatedTo: (t.related_to_id || t.relatedTo) ? {
                type: t.related_to_type || t.relatedTo?.type || "general",
                id: t.related_to_id || t.relatedTo?.id,
                name: t.related_to_name || t.title // fallback if name not provided
            } : undefined
        }));
    },
    createTask: (task: Partial<Task>) => {
        const workspaceId = getWorkspaceId();
        const payload = { ...task, workspace_id: workspaceId };
        return fetchJson<Task>("/api/tasks", { method: "POST", body: JSON.stringify(payload) });
    },
    updateTask: (id: string, updates: Partial<Task>) => fetchJson<Task>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),

    deleteTask: (id: string) => fetchJson<void>(`/api/tasks/${id}`, { method: "DELETE" }),

    searchTasks: async (query: string, limit: number = 20) => {
        const workspaceId = getWorkspaceId();
        const res = await fetchJson<{ data: Task[] }>(`/api/tasks/search?q=${encodeURIComponent(query)}&workspace_id=${workspaceId}&limit=${limit}`);
        return res.data || [];
    },

    snoozeTask: (id: string, days: number) => fetchJson<{ ok: boolean, due_date: string }>(`/api/tasks/${id}/snooze`, { method: "POST", body: JSON.stringify({ days }) }),

    reassignTask: (id: string, userId: string) => fetchJson<{ ok: boolean }>(`/api/tasks/${id}/reassign`, { method: "POST", body: JSON.stringify({ user_id: userId }) }),

    bulkCompleteTasks: (ids: string[], completed: boolean) =>
        fetchJson<{ ok: boolean, updated: number }>(`/api/tasks/bulk-complete`, { method: "POST", body: JSON.stringify({ task_ids: ids, completed }) }),

    // Workspace Settings
    getWorkspaceSettings: async () => {
        const workspaceId = getWorkspaceId();
        // Usage confirmed: GET /api/workspace?workspace_id=... returns { success: true, workspace: {...}, workspaces: [...] }
        // We can just use the 'workspace' field from the response if present, or find it in workspaces
        const res = await fetchJson<any>("/api/workspace");

        if (res?.workspace && String(res.workspace.id) === String(workspaceId)) {
            return res.workspace;
        }

        if (res && Array.isArray(res.workspaces)) {
            const match = res.workspaces.find((w: any) => String(w.id) === String(workspaceId));
            return match || {};
        }
        return {};
    },
    updateWorkspaceSettings: (updates: any) => {
        const workspaceId = getWorkspaceId();
        return fetchJson<any>(`/api/workspace/${workspaceId}/settings`, { method: "PATCH", body: JSON.stringify(updates) });
    },
    // getWorkspaceUsers: removed as requested
    // getWorkspaceUsers: implemented below
    inviteUser: (email: string, role: string) => {
        const workspaceId = getWorkspaceId();
        return fetchJson<void>(`/api/workspace/${workspaceId}/users`, { method: "POST", body: JSON.stringify({ email, role }) });
    },

    // Files
    uploadFile: async (file: File, entityId: string, entityType: "contact" | "lead") => {
        const workspaceId = getWorkspaceId();
        const formData = new FormData();
        formData.append("file", file);
        formData.append("entityId", entityId);
        formData.append("entityType", entityType);
        if (workspaceId) formData.append("workspaceId", workspaceId);

        // We use fetch directly here to avoid Content-Type: application/json being set automatically by fetchJson
        // fetch will set the correct boundary for FormData
        // fetch will set the correct boundary for FormData
        // Uploads go to main backend
        const base = BACKEND_API_BASE;
        const uploadUrl = new URL("/api/uploads", base);
        // Helper to get token for manual fetch
        const token = localStorage.getItem("sv_token");
        const userId = localStorage.getItem("sv_user_id");

        const response = await fetch(uploadUrl.toString(), {
            method: "POST",
            body: formData,
            headers: {
                ...(token ? { "Authorization": `Bearer ${token}` } : {}),
                ...(userId ? { "X-User-Id": userId } : {}),
                // ...(workspaceId ? { "X-Workspace-ID": workspaceId } : {})
            }
        });

        if (!response.ok) {
            throw new Error("Failed to upload file");
        }
        return await response.json();
    },

    getAttachments: (entityId: string) => fetchJson<any[]>(`/api/uploads?entityId=${entityId}`),

    // Deals
    // Deals
    getDeals: async (filters?: {
        workspace_id?: string;
        owner_id?: string;
        stage?: string;
        search?: string;
        limit?: number;
    }) => {
        const params = new URLSearchParams();
        const wsId = getWorkspaceId();
        if (wsId) params.append("workspace_id", wsId);

        if (filters?.owner_id) params.append("owner_id", filters.owner_id);
        if (filters?.stage) params.append("stage", filters.stage);
        if (filters?.search) params.append("search", filters.search);
        if (filters?.limit) params.append("limit", String(filters.limit));

        const res = await fetchJson<any>(`/api/deals?${params.toString()}`);
        // Note: keeping without slash first as per bp.route(""). 
        // User reported 405. If trailing slash was the issue, POST would likely fail too. 
        // Wait, POST DID fail with 405. 
        // If I change to slash, it might work if Blueprint is registered with trailing slash.
        // But user provided code bp.route("").
        // I will stick to NO Slash for now unless proven otherwise, 
        // BUT I will ensure `credentials` are emphasized.
        return Array.isArray(res) ? res : (res?.data || []);
    },

    // Note: getDeals by entityId was removed/refactored. 
    // If we need associated deals for a contact, we should filter by search or add relation table support.
    // Assuming backend might not filter by "entityId" generic yet, but let's check backend code:
    // Backend filters by: workspace_id, owner_id, stage, search. 
    // It does NOT explicit query by entity_id relations in the list handler provided.
    // For now, we will rely on search or future backend updates for entity relations.

    createDeal: (deal: Partial<Deal>) => {
        const workspaceId = getWorkspaceId();
        const payload = { ...deal, workspace_id: workspaceId };
        return fetchJson<Deal>("/api/deals", { method: "POST", body: JSON.stringify(payload) });
    },

    updateDeal: (id: string, updates: Partial<Deal>) => fetchJson<{ ok: boolean, deal: Deal }>(`/api/deals/${id}`, { method: "PATCH", body: JSON.stringify(updates) }).then(r => r.deal),

    deleteDeal: (id: string) => fetchJson<void>(`/api/deals/${id}`, { method: "DELETE" }),

    changeDealStage: (id: string, stage: string, note?: string) =>
        fetchJson<{ ok: boolean }>(`/api/deals/${id}/stage`, { method: "POST", body: JSON.stringify({ stage, note }) }),

    closeDeal: (id: string, status: "won" | "lost", closed_reason?: string, closed_at?: string) =>
        fetchJson<{ ok: boolean }>(`/api/deals/${id}/close`, { method: "POST", body: JSON.stringify({ status, closed_reason, closed_at }) }),

    convertLeadToDeal: (lead_id: string, data: { name?: string, value?: number, stage?: string, owner_id?: string }) => {
        const workspaceId = getWorkspaceId();
        return fetchJson<{ id: string }>(`/api/deals/convert-from-lead`, { method: "POST", body: JSON.stringify({ ...data, lead_id, workspace_id: workspaceId }) });
    },

    getDealActivity: (dealId: string) => fetchJson<any[]>(`/api/deals/${dealId}/activity`),

    addDealActivity: (dealId: string, activity: any) => {
        const workspaceId = getWorkspaceId();
        return fetchJson<any>(`/api/deals/${dealId}/activity`, { method: "POST", body: JSON.stringify({ ...activity, workspace_id: workspaceId }) });
    },

    // AI Generation
    generateLeadForm: (payload: any) => fetchJson<any>("/api/ai/generate-form", { method: "POST", body: JSON.stringify(payload) }),

    // CRM Settings (Generic)
    getCRMSettings: () => fetchJson<Record<string, string>>("api/settings/config"),

    regenerateCRMKey: (keyName: string) =>
        fetchJson<{ name: string; key: string; workspace_id?: string }>("/api/settings/regenerate-key", {
            method: "POST",
            body: JSON.stringify({ key_name: keyName })
        }),

    // Meta Lead Forms (New System)
    saveMetaLeadForm: (payload: { name: string; fields: any[]; intro?: string; privacy_policy?: string; thank_you?: string; userId?: string }) => {
        const workspaceId = getWorkspaceId();
        const body = { ...payload, workspace_id: workspaceId };
        return fetchJson<{ ok: boolean; formId: string; viewUrl: string }>("/api/meta/forms/create", { method: "POST", body: JSON.stringify(body) });
    },

    getMetaLeadForms: async (userId?: string) => {
        const workspaceId = getWorkspaceId();
        const params = new URLSearchParams();
        if (workspaceId) params.append("workspace_id", workspaceId);
        if (userId) params.append("user_id", userId);

        const res = await fetchJson<any>(`/api/meta/forms?${params.toString()}`);
        // Backend returns { forms: [], ok: true }
        if (res && Array.isArray(res.forms)) return res.forms;
        if (Array.isArray(res)) return res;
        return res?.data || [];
    },

    getMetaFormPreview: (formId: string) => {
        return fetchJson<{ form_id: string; url: string }>(`/api/meta/forms/${formId}/preview`);
    },

    // Generic Methods
    get: (url: string) => fetchJson<any>(url),
    post: (url: string, body?: any) => fetchJson<any>(url, { method: "POST", body: JSON.stringify(body) }),
    patch: (url: string, body?: any) => fetchJson<any>(url, { method: "PATCH", body: JSON.stringify(body) }),
    delete: (url: string) => fetchJson<void>(url, { method: "DELETE" }),

    getWorkspaceUsers: async () => {
        const workspaceId = getWorkspaceId();
        if (!workspaceId) return [];
        // Use API_ENDPOINT from config
        const prodUrl = `${API_ENDPOINT}/workspace`;
        // We must use fetch directly or ensure fetchJson handles full URLs if we pass them.
        // fetchJson implementation: const url = new URL(endpoint, base || window.location.origin);
        // If endpoint is absolute, 'base' is ignored. So passing full URL is safe.
        const res = await fetchJson<any[]>(`${prodUrl}?workspace_id=${workspaceId}`);
        // The endpoint returns { members: [...] } based on UserManagement.tsx
        // or just [...]? UserManagement.tsx says: setMembers(body.members ?? body ?? []);
        // api.ts wrapper expects array.
        // Let's handle both.
        const data = res as any;
        if (data?.members && Array.isArray(data.members)) return data.members;
        if (Array.isArray(data)) return data;
        return [];
    }
};
