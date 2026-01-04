-- Migration: Add structured address fields to workspaces table
-- Date: 2024-12-02
-- Description: Adds new address columns (address_line, city, district, pin_code, country) 
--              to support structured address input from the frontend.
--              The registered_address column is kept for backward compatibility.

-- For PostgreSQL
ALTER TABLE workspaces 
  ADD COLUMN IF NOT EXISTS address_line VARCHAR(500),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS district VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pin_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';

-- For workspaces2 table (if used)
ALTER TABLE workspaces2 
  ADD COLUMN IF NOT EXISTS address_line VARCHAR(500),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS district VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pin_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workspaces_city ON workspaces(city);
CREATE INDEX IF NOT EXISTS idx_workspaces_country ON workspaces(country);
CREATE INDEX IF NOT EXISTS idx_workspaces_pin_code ON workspaces(pin_code);

-- For workspaces2 table
CREATE INDEX IF NOT EXISTS idx_workspaces2_city ON workspaces2(city);
CREATE INDEX IF NOT EXISTS idx_workspaces2_country ON workspaces2(country);
CREATE INDEX IF NOT EXISTS idx_workspaces2_pin_code ON workspaces2(pin_code);

-- Optional: Migration script to populate new fields from existing registered_address
-- Run this AFTER adding the columns
-- NOTE: This assumes registered_address format is: "address_line, city, district, pin_code, country"

-- For PostgreSQL:
-- UPDATE workspaces 
-- SET 
--   address_line = COALESCE(SPLIT_PART(registered_address, ',', 1), ''),
--   city = COALESCE(TRIM(SPLIT_PART(registered_address, ',', 2)), ''),
--   district = COALESCE(TRIM(SPLIT_PART(registered_address, ',', 3)), ''),
--   pin_code = COALESCE(TRIM(SPLIT_PART(registered_address, ',', 4)), ''),
--   country = COALESCE(NULLIF(TRIM(SPLIT_PART(registered_address, ',', 5)), ''), 'India')
-- WHERE address_line IS NULL AND registered_address IS NOT NULL AND registered_address != '';

-- For MySQL:
-- ALTER TABLE workspaces 
--   ADD COLUMN address_line VARCHAR(500),
--   ADD COLUMN city VARCHAR(100),
--   ADD COLUMN district VARCHAR(100),
--   ADD COLUMN pin_code VARCHAR(20),
--   ADD COLUMN country VARCHAR(100) DEFAULT 'India';
--
-- CREATE INDEX idx_workspaces_city ON workspaces(city);
-- CREATE INDEX idx_workspaces_country ON workspaces(country);
-- CREATE INDEX idx_workspaces_pin_code ON workspaces(pin_code);

-- For SQLite (used in development):
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so check column existence first
-- or use a migration tool like Alembic

-- Verify the migration:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'workspaces';
