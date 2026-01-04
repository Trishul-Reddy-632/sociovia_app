-- Migration: Add token storage columns to whatsapp_accounts table
-- Phase-2 Part-1: WhatsApp Business Account Integration
-- Run this migration to add support for permanent token storage

-- Add new columns for token storage
ALTER TABLE whatsapp_accounts
  ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS token_type VARCHAR(16) DEFAULT 'temporary' NOT NULL,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS connected_by_user_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;

-- Create index for user lookup
CREATE INDEX IF NOT EXISTS ix_whatsapp_accounts_connected_by 
  ON whatsapp_accounts(connected_by_user_id);

-- Update existing records to have token_type
UPDATE whatsapp_accounts 
SET token_type = 'temporary' 
WHERE token_type IS NULL;

