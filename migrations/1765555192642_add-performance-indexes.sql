-- Performance indexes for combat tracker

-- Combat participant lookups (used on every combat state sync)
CREATE INDEX IF NOT EXISTS idx_combat_participants_source
  ON combat_session_participants(source_id);

CREATE INDEX IF NOT EXISTS idx_combat_participants_type_source
  ON combat_session_participants(participant_type, source_id);

-- Character HP lookups (used on DM join, player connect)
CREATE INDEX IF NOT EXISTS idx_character_hp_composite
  ON character_hp(campaign_id, character_id);

-- Spell searches (level + school filter)
CREATE INDEX IF NOT EXISTS idx_spell_catalog_level_school
  ON spell_catalog(level, school);

-- Prepared spells per character
CREATE INDEX IF NOT EXISTS idx_prepared_spells_character
  ON character_prepared_spells(character_id, campaign_id);
