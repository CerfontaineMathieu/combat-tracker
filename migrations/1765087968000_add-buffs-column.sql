-- Add buffs column to character_hp table for buff/debuff persistence
-- Buffs are stored as JSONB array of ActiveBuff objects
-- Uses ADD COLUMN IF NOT EXISTS (PostgreSQL 9.6+) - DO NOT use DO $$ blocks

ALTER TABLE character_hp ADD COLUMN IF NOT EXISTS buffs JSONB DEFAULT '[]'::jsonb;
