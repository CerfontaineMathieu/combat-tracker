-- Add exhaustion_level and conditions columns to character_hp table
-- This extends the existing character_hp table with status persistence
-- Note: Using ADD COLUMN IF NOT EXISTS (PostgreSQL 9.6+) instead of DO $$ blocks
-- because node-pg-migrate doesn't properly handle PL/pgSQL blocks in SQL files

ALTER TABLE character_hp ADD COLUMN IF NOT EXISTS exhaustion_level INTEGER DEFAULT 0;
ALTER TABLE character_hp ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]'::jsonb;
