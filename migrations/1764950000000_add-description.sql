-- Migration: add-description
-- Description: Adds description TEXT column to monsters table for storing flavor text

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
