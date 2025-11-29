-- Add dm_password column to campaigns table
-- If NULL or empty, the application falls back to DM_PASSWORD env variable
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS dm_password VARCHAR(255);
