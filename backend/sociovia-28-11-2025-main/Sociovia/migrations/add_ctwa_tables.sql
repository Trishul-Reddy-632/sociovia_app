-- CTWA Migration: Create Click-to-WhatsApp Ads Tables
-- =====================================================
-- Run this migration to create CTWA tables and extend WhatsApp conversations

-- ============================================================
-- CTWA CAMPAIGNS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS ctwa_campaigns (
    id SERIAL PRIMARY KEY,
    workspace_id VARCHAR(255) NOT NULL,
    meta_campaign_id VARCHAR(64) UNIQUE,
    ad_account_id VARCHAR(64) NOT NULL,
    
    -- Campaign details
    name VARCHAR(255) NOT NULL,
    objective VARCHAR(64) DEFAULT 'OUTCOME_ENGAGEMENT',
    status VARCHAR(32) DEFAULT 'DRAFT',
    
    -- Budget & Schedule
    daily_budget DECIMAL(12, 2),
    lifetime_budget DECIMAL(12, 2),
    budget_currency VARCHAR(3) DEFAULT 'INR',
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by_user_id VARCHAR(64),
    
    -- Sync tracking
    last_synced_at TIMESTAMP,
    sync_status VARCHAR(32) DEFAULT 'pending',
    sync_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_ctwa_campaigns_workspace ON ctwa_campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ctwa_campaigns_meta_id ON ctwa_campaigns(meta_campaign_id);
CREATE INDEX IF NOT EXISTS idx_ctwa_campaigns_status ON ctwa_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ctwa_campaigns_ad_account ON ctwa_campaigns(ad_account_id);


-- ============================================================
-- CTWA AD SETS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS ctwa_adsets (
    id SERIAL PRIMARY KEY,
    workspace_id VARCHAR(255) NOT NULL,
    campaign_id INTEGER NOT NULL REFERENCES ctwa_campaigns(id) ON DELETE CASCADE,
    meta_adset_id VARCHAR(64) UNIQUE,
    
    -- Ad set details
    name VARCHAR(255) NOT NULL,
    status VARCHAR(32) DEFAULT 'DRAFT',
    optimization_goal VARCHAR(64) DEFAULT 'CONVERSATIONS',
    billing_event VARCHAR(32) DEFAULT 'IMPRESSIONS',
    bid_strategy VARCHAR(64) DEFAULT 'LOWEST_COST_WITHOUT_CAP',
    
    -- Budget
    daily_budget DECIMAL(12, 2),
    
    -- Targeting (stored as JSONB for flexibility)
    targeting JSONB,
    
    -- WhatsApp config
    page_id VARCHAR(64) NOT NULL,
    whatsapp_phone_number_id VARCHAR(64) NOT NULL,
    
    -- Schedule
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ctwa_adsets_campaign ON ctwa_adsets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ctwa_adsets_workspace ON ctwa_adsets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ctwa_adsets_meta_id ON ctwa_adsets(meta_adset_id);


-- ============================================================
-- CTWA ADS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS ctwa_ads (
    id SERIAL PRIMARY KEY,
    workspace_id VARCHAR(255) NOT NULL,
    adset_id INTEGER NOT NULL REFERENCES ctwa_adsets(id) ON DELETE CASCADE,
    meta_ad_id VARCHAR(64) UNIQUE,
    meta_creative_id VARCHAR(64),
    
    -- Ad details
    name VARCHAR(255) NOT NULL,
    status VARCHAR(32) DEFAULT 'DRAFT',
    effective_status VARCHAR(32),
    
    -- Creative content
    primary_text TEXT,
    headline VARCHAR(255),
    description TEXT,
    media_type VARCHAR(32),  -- image, video
    media_url TEXT,
    media_hash VARCHAR(64),
    
    -- WhatsApp CTA
    cta_type VARCHAR(64) DEFAULT 'WHATSAPP_MESSAGE',
    ice_breakers JSONB,
    prefilled_message TEXT,
    
    -- Review status
    review_status VARCHAR(32) DEFAULT 'pending',
    rejection_reasons JSONB,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ctwa_ads_adset ON ctwa_ads(adset_id);
CREATE INDEX IF NOT EXISTS idx_ctwa_ads_workspace ON ctwa_ads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ctwa_ads_meta_id ON ctwa_ads(meta_ad_id);
CREATE INDEX IF NOT EXISTS idx_ctwa_ads_status ON ctwa_ads(status);


-- ============================================================
-- CTWA METRICS TABLE (for caching insights)
-- ============================================================

CREATE TABLE IF NOT EXISTS ctwa_metrics (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(32) NOT NULL,  -- campaign, adset, ad
    entity_id VARCHAR(64) NOT NULL,
    metric_date DATE NOT NULL,
    
    -- Standard metrics
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    spend DECIMAL(12, 4) DEFAULT 0,
    reach BIGINT DEFAULT 0,
    frequency DECIMAL(8, 4) DEFAULT 0,
    
    -- CTWA specific
    messaging_conversations_started BIGINT DEFAULT 0,
    cost_per_messaging_conversation DECIMAL(12, 4),
    
    -- Sociovia computed
    internal_conversations BIGINT DEFAULT 0,
    computed_cost_per_conversation DECIMAL(12, 4),
    
    -- Metadata
    fetched_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT uq_ctwa_metrics UNIQUE (entity_type, entity_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_ctwa_metrics_entity ON ctwa_metrics(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ctwa_metrics_date ON ctwa_metrics(metric_date);


-- ============================================================
-- EXTEND WHATSAPP CONVERSATIONS WITH ATTRIBUTION
-- ============================================================

-- Add attribution columns to existing whatsapp_conversations table
ALTER TABLE whatsapp_conversations 
    ADD COLUMN IF NOT EXISTS entry_source VARCHAR(32) DEFAULT 'organic',
    ADD COLUMN IF NOT EXISTS ctwa_clid VARCHAR(128),
    ADD COLUMN IF NOT EXISTS ad_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS campaign_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS adset_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS attribution_data JSONB,
    ADD COLUMN IF NOT EXISTS attributed_at TIMESTAMP;

-- Create indexes for attribution queries
CREATE INDEX IF NOT EXISTS idx_wa_conv_entry_source ON whatsapp_conversations(entry_source);
CREATE INDEX IF NOT EXISTS idx_wa_conv_ctwa_clid ON whatsapp_conversations(ctwa_clid);
CREATE INDEX IF NOT EXISTS idx_wa_conv_ad_id ON whatsapp_conversations(ad_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_campaign_id ON whatsapp_conversations(campaign_id);

-- Composite index for analytics queries
CREATE INDEX IF NOT EXISTS idx_wa_conv_attribution ON whatsapp_conversations(campaign_id, entry_source, created_at);


-- ============================================================
-- DONE
-- ============================================================
-- To run this migration:
-- psql -U your_user -d your_database -f add_ctwa_tables.sql
