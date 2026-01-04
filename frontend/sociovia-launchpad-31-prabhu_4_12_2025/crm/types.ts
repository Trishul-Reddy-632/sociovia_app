export interface Lead {
    id: string;
    name: string;
    email: string;
    phone?: string;
    status: "new" | "contacted" | "qualified" | "proposal" | "closed";
    source: string;
    score: number;
    lastInteraction: string; // ISO date (legacy frontend)
    last_interaction_at?: string; // backend field
    campaignId?: string;
    notes?: string;
    value?: number;
    tags?: string[];

    // Backend fields
    company?: string;
    job_title?: string; // role called job_title in leads.py
    role?: string; // keep for frontend compatibility if needed

    external_source?: string;
    external_id?: string;
    sync_status?: string;
    last_sync_at?: string;
    created_at?: string;
    updated_at?: string;
    workspace_id?: string;
    owner_id?: string | number;

    socials?: {
        linkedin?: string;
        twitter?: string;
        website?: string;
        facebook?: string;
    };
}

export interface LeadActivity {
    id: string;
    lead_id: string;
    type: "note" | "call" | "email" | "status_change" | "deal_value";
    description: string;
    created_at: string;
    metadata?: any;
}

export interface Campaign {
    id: string;
    workspace_id?: string;
    user_id?: string;
    name: string;
    status: "active" | "paused" | "completed" | "archived";
    objective: string;
    spending_limit?: number;
    daily_budget?: number;
    lifetime_budget?: number;
    spend: number;
    impressions: number;
    clicks: number;
    leads: number;
    cpl: number;
    roas: number;
    budget?: number;
    revenue?: number;
    start_time?: string;
    end_time?: string;
    meta_campaign_id?: string;
    meta?: any;
}

export interface Contact {
    id: string;
    name: string;
    email: string;
    company?: string;
    role?: string;
    phone?: string;
    notes?: string;
    status: "active" | "archived";
    tags?: string[];
    avatar?: string;

    // Backend fields
    last_contacted?: string; // or lastContacted if mapped
    external_source?: string;
    external_id?: string;
    sync_status?: string;
    last_sync_at?: string;
    created_at?: string;
    updated_at?: string;
    workspace_id?: string;
    user_id?: string | number;

    socials?: {
        linkedin?: string;
        twitter?: string;
        website?: string;
        instagram?: string;
    };
}

export interface ContactHistory {
    id: string;
    contact_id: string;
    type: "meeting" | "proposal" | "note" | "call" | "email";
    title: string;
    description?: string;
    date: string;
}

export interface Task {
    id: string;
    title: string;
    description?: string;
    dueDate: string;
    due_date?: string; // fallback for backend compatibility
    priority: "low" | "medium" | "high";
    completed: boolean;
    assignedTo?: string; // User ID
    relatedTo?: {
        type: "lead" | "contact" | "campaign" | "deal";
        id: string;
        name: string;
    };
}

export interface Metric {
    label: string;
    value: string | number;
    change?: number; // percentage
    trend?: "up" | "down" | "neutral";
}

export interface Attachment {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: string;
    entityId: string;
    entityType: "contact" | "lead";
}

export interface Deal {
    id: string;
    name: string; // was title
    value: number;
    currency: string;
    stage: "discovery" | "proposal" | "negotiation" | "closed_won" | "closed_lost" | "prospect"; // added prospect as per backend default
    probability: number;
    close_date?: string; // was expectedCloseDate
    closed_at?: string;
    closed_reason?: string;
    status?: "won" | "lost" | "open"; // backend uses this for closed state
    entityId?: string; // kept for compatibility if needed, but backend uses explicit relations
    entityType?: "contact" | "lead";
    workspace_id?: string;
    owner_id?: number | string;
    company?: string;
    contact_email?: string;
    description?: string;
    created_at: string; // was createdAt
    updated_at?: string;
}
