-- Combat history table (for recording completed combats)
CREATE TABLE IF NOT EXISTS combat_history (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    final_state JSONB,
    participants JSONB,
    total_rounds INTEGER,
    outcome VARCHAR(50), -- 'victory', 'defeat', 'retreat', 'interrupted'
    notes TEXT
);

-- Combat state backup table (for server restart recovery)
-- This is a fallback if Redis is unavailable
CREATE TABLE IF NOT EXISTS combat_state_backup (
    campaign_id INTEGER PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
    state JSONB NOT NULL,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_combat_history_campaign ON combat_history(campaign_id);
CREATE INDEX IF NOT EXISTS idx_combat_history_started ON combat_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_combat_state_backup_update ON combat_state_backup(last_update);

-- Comments for documentation
COMMENT ON TABLE combat_history IS 'Records of completed combat encounters for history/analytics';
COMMENT ON TABLE combat_state_backup IS 'Backup of active combat state for recovery if Redis fails';
