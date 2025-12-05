-- Migration: add-missing-monster-fields
-- Description: Adds description, vulnerabilities, and bonus_actions columns to monsters table

-- Add description column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'monsters' AND column_name = 'description'
    ) THEN
        ALTER TABLE monsters ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to monsters table';
    ELSE
        RAISE NOTICE 'description column already exists';
    END IF;
END $$;

-- Add bonus_actions column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'monsters' AND column_name = 'bonus_actions'
    ) THEN
        ALTER TABLE monsters ADD COLUMN bonus_actions JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added bonus_actions column to monsters table';
    ELSE
        RAISE NOTICE 'bonus_actions column already exists';
    END IF;
END $$;

-- Add index for bonus_actions
CREATE INDEX IF NOT EXISTS idx_monsters_bonus_actions ON monsters USING GIN (bonus_actions);
