-- Migration: reset-monsters-for-new-notion
-- Description: Clears all monsters to prepare for sync from new Notion database (Monstres v2)

-- First, clear any combat references to avoid FK constraint violations
DELETE FROM combat_monsters;
DELETE FROM fight_preset_monsters;
DELETE FROM combat_session_participants WHERE participant_type = 'monster';

-- Now delete all monsters
DELETE FROM monsters;

-- Log the action
DO $$
BEGIN
    RAISE NOTICE 'All monsters deleted. Ready for fresh sync from Monstres v2 Notion database.';
END $$;
