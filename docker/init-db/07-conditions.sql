-- Conditions table for D&D 5e états
CREATE TABLE IF NOT EXISTS conditions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(50) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add conditions column to combat_monsters if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'combat_monsters' AND column_name = 'conditions'
    ) THEN
        ALTER TABLE combat_monsters ADD COLUMN conditions JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Add exhaustion_level column to characters if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'characters' AND column_name = 'exhaustion_level'
    ) THEN
        ALTER TABLE characters ADD COLUMN exhaustion_level INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add exhaustion_level column to combat_monsters if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'combat_monsters' AND column_name = 'exhaustion_level'
    ) THEN
        ALTER TABLE combat_monsters ADD COLUMN exhaustion_level INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add exhaustion_level column to combat_session_participants if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'combat_session_participants' AND column_name = 'exhaustion_level'
    ) THEN
        ALTER TABLE combat_session_participants ADD COLUMN exhaustion_level INTEGER DEFAULT 0;
    END IF;
END $$;

-- Seed conditions from D&D 5e rules (French)
INSERT INTO conditions (id, name, description, icon, color, sort_order) VALUES
('a-terre', 'À terre', 'La seule option de mouvement d''une créature à terre est de ramper, à moins qu''elle ne se relève et mette ainsi fin à son état.', 'arrow-down', 'amber', 1),
('agrippe', 'Agrippé', 'La vitesse d''une créature agrippée devient 0 et elle ne bénéficie d''aucun bonus à sa vitesse.', 'grab', 'orange', 2),
('assourdi', 'Assourdi', 'Une créature assourdie n''entend plus et rate automatiquement tout jet de caractéristique relatif à l''ouïe.', 'ear-off', 'slate', 3),
('aveugle', 'Aveuglé', 'Une créature aveuglée ne voit plus et rate automatiquement tout jet de caractéristique relatif à la vue.', 'eye-off', 'zinc', 4),
('charme', 'Charmé', 'Une créature charmée ne peut pas attaquer celui qui l''a charmée ni le cibler avec des capacités ou effets magiques nuisibles.', 'heart', 'pink', 5),
('effraye', 'Effrayé', 'Une créature effrayée a un désavantage aux jets de caractéristique et d''attaque tant que la source de sa frayeur est dans son champ de vision.', 'ghost', 'purple', 6),
('empoisonne', 'Empoisonné', 'Une créature empoisonnée a un désavantage aux jets d''attaque et de caractéristique.', 'skull', 'green', 7),
('entrave', 'Entravé', 'La vitesse d''une créature entravée devient 0 et elle ne bénéficie d''aucun bonus à sa vitesse.', 'link', 'stone', 8),
('etourdi', 'Étourdi', 'Une créature étourdie est incapable d''agir, ne peut plus bouger et parle de manière hésitante.', 'zap', 'yellow', 9),
('incapable', 'Incapable d''agir', 'Une créature incapable d''agir ne peut effectuer aucune action ni réaction.', 'ban', 'red', 10),
('inconscient', 'Inconscient', 'Une créature inconsciente est incapable d''agir, ne peut plus bouger ni parler et n''est pas consciente de ce qui l''entoure.', 'moon', 'indigo', 11),
('invisible', 'Invisible', 'Une créature invisible ne peut être vue sans l''aide de la magie ou d''un sens spécial.', 'eye', 'cyan', 12),
('paralyse', 'Paralysé', 'Une créature paralysée est incapable d''agir et ne peut ni bouger ni parler.', 'pause', 'blue', 13),
('petrifie', 'Pétrifié', 'Une créature pétrifiée est transformée, avec tous les objets non magiques qu''elle porte, en une substance inanimée solide.', 'mountain', 'gray', 14),
('concentre', 'Concentré', 'La créature maintient sa concentration sur un sort ou un effet.', 'focus', 'sky', 15)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    sort_order = EXCLUDED.sort_order;
