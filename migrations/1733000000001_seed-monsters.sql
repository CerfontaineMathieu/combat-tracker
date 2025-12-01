-- Migration: seed-monsters
-- Description: Imports monster data from CSV file
-- This migration is idempotent - only runs if monsters table is empty

-- Only seed if monsters table is empty
DO $$
DECLARE
    monster_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO monster_count FROM monsters;

    IF monster_count > 0 THEN
        RAISE NOTICE 'Monsters table already has % records, skipping seed', monster_count;
        RETURN;
    END IF;

    RAISE NOTICE 'Seeding monsters from CSV...';
END $$;

-- Function to parse actions text into JSONB array
CREATE OR REPLACE FUNCTION _temp_parse_actions(actions_text TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '[]'::jsonb;
    action_lines TEXT[];
    line TEXT;
    action_name TEXT;
    action_desc TEXT;
    dot_pos INTEGER;
BEGIN
    IF actions_text IS NULL OR actions_text = '' THEN
        RETURN result;
    END IF;

    action_lines := string_to_array(actions_text, E'\n');

    FOREACH line IN ARRAY action_lines
    LOOP
        line := trim(line);
        IF line = '' THEN
            CONTINUE;
        END IF;

        dot_pos := position('. ' IN line);

        IF dot_pos > 0 THEN
            action_name := trim(substring(line FROM 1 FOR dot_pos - 1));
            action_desc := trim(substring(line FROM dot_pos + 2));
        ELSE
            action_name := line;
            action_desc := '';
        END IF;

        result := result || jsonb_build_object(
            'name', action_name,
            'description', action_desc
        );
    END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to parse legendary actions text into JSONB array
CREATE OR REPLACE FUNCTION _temp_parse_legendary_actions(actions_text TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '[]'::jsonb;
    action_lines TEXT[];
    line TEXT;
    action_name TEXT;
    action_desc TEXT;
    dot_pos INTEGER;
    cost INTEGER := 1;
BEGIN
    IF actions_text IS NULL OR actions_text = '' THEN
        RETURN result;
    END IF;

    action_lines := string_to_array(actions_text, E'\n');

    FOREACH line IN ARRAY action_lines
    LOOP
        line := trim(line);
        IF line = '' THEN
            CONTINUE;
        END IF;

        dot_pos := position('. ' IN line);

        IF dot_pos > 0 THEN
            action_name := trim(substring(line FROM 1 FOR dot_pos - 1));
            action_desc := trim(substring(line FROM dot_pos + 2));
        ELSE
            action_name := line;
            action_desc := '';
        END IF;

        cost := 1;
        IF action_name ~ '\(coûte? (\d+) actions?\)' THEN
            cost := (regexp_match(action_name, '\(coûte? (\d+) actions?\)'))[1]::INTEGER;
            action_name := trim(regexp_replace(action_name, '\s*\(coûte? \d+ actions?\)', ''));
        END IF;

        result := result || jsonb_build_object(
            'name', action_name,
            'description', action_desc,
            'cost', cost
        );
    END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to parse description/traits text into JSONB object
CREATE OR REPLACE FUNCTION _temp_parse_traits(description_text TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    skills TEXT[] := ARRAY[]::TEXT[];
    senses TEXT[] := ARRAY[]::TEXT[];
    languages TEXT[] := ARRAY[]::TEXT[];
    damage_resistances TEXT[] := ARRAY[]::TEXT[];
    damage_immunities TEXT[] := ARRAY[]::TEXT[];
    condition_immunities TEXT[] := ARRAY[]::TEXT[];
    special_abilities JSONB := '[]'::jsonb;
    lines TEXT[];
    line TEXT;
    remaining_text TEXT;
    ability_name TEXT;
    ability_desc TEXT;
    dot_pos INTEGER;
BEGIN
    result := '{}'::jsonb;

    IF description_text IS NULL OR description_text = '' THEN
        RETURN result;
    END IF;

    remaining_text := description_text;

    IF remaining_text ~* 'Compétences?\s+' THEN
        skills := ARRAY(
            SELECT trim(m[1])
            FROM regexp_matches(remaining_text, 'Compétences?\s+([^S\n]+?)(?=Sens|Langues|Résistances?|Immunités?|$)', 'i') AS m
        );
        remaining_text := regexp_replace(remaining_text, 'Compétences?\s+[^S\n]+?(?=Sens|Langues|Résistances?|Immunités?|$)', '', 'i');
    END IF;

    IF remaining_text ~* 'Sens\s+' THEN
        senses := ARRAY(
            SELECT trim(m[1])
            FROM regexp_matches(remaining_text, 'Sens\s+([^\n]+?)(?=Langues|Résistances?|Immunités?|Compétences?|$)', 'i') AS m
        );
        remaining_text := regexp_replace(remaining_text, 'Sens\s+[^\n]+?(?=Langues|Résistances?|Immunités?|Compétences?|$)', '', 'i');
    END IF;

    IF remaining_text ~* 'Langues?\s+' THEN
        languages := ARRAY(
            SELECT trim(m[1])
            FROM regexp_matches(remaining_text, 'Langues?\s+([^\n]+?)(?=Sens|Résistances?|Immunités?|Compétences?|$)', 'i') AS m
        );
        remaining_text := regexp_replace(remaining_text, 'Langues?\s+[^\n]+?(?=Sens|Résistances?|Immunités?|Compétences?|$)', '', 'i');
    END IF;

    IF remaining_text ~* 'Résistances?\s+aux\s+dégâts\s+' THEN
        damage_resistances := ARRAY(
            SELECT trim(m[1])
            FROM regexp_matches(remaining_text, 'Résistances?\s+aux\s+dégâts\s+([^\n]+)', 'i') AS m
        );
        remaining_text := regexp_replace(remaining_text, 'Résistances?\s+aux\s+dégâts\s+[^\n]+', '', 'i');
    END IF;

    IF remaining_text ~* 'Immunités?\s+aux\s+dégâts\s+' THEN
        damage_immunities := ARRAY(
            SELECT trim(m[1])
            FROM regexp_matches(remaining_text, 'Immunités?\s+aux\s+dégâts\s+([^\n]+)', 'i') AS m
        );
        remaining_text := regexp_replace(remaining_text, 'Immunités?\s+aux\s+dégâts\s+[^\n]+', '', 'i');
    END IF;

    IF remaining_text ~* 'Immunités?\s+aux\s+états\s+' THEN
        condition_immunities := ARRAY(
            SELECT trim(m[1])
            FROM regexp_matches(remaining_text, 'Immunités?\s+aux\s+états\s+([^\n]+)', 'i') AS m
        );
        remaining_text := regexp_replace(remaining_text, 'Immunités?\s+aux\s+états\s+[^\n]+', '', 'i');
    END IF;

    remaining_text := trim(remaining_text);
    IF remaining_text != '' THEN
        lines := string_to_array(remaining_text, E'\n');

        FOREACH line IN ARRAY lines
        LOOP
            line := trim(line);
            IF line = '' THEN
                CONTINUE;
            END IF;

            dot_pos := position('. ' IN line);

            IF dot_pos > 0 AND dot_pos < 50 THEN
                ability_name := trim(substring(line FROM 1 FOR dot_pos - 1));
                ability_desc := trim(substring(line FROM dot_pos + 2));

                special_abilities := special_abilities || jsonb_build_object(
                    'name', ability_name,
                    'description', ability_desc
                );
            END IF;
        END LOOP;
    END IF;

    result := jsonb_build_object(
        'skills', to_jsonb(skills),
        'senses', to_jsonb(senses),
        'languages', to_jsonb(languages),
        'damage_resistances', to_jsonb(damage_resistances),
        'damage_immunities', to_jsonb(damage_immunities),
        'condition_immunities', to_jsonb(condition_immunities),
        'special_abilities', special_abilities
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Import monsters (only if table is empty)
DO $$
DECLARE
    monster_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO monster_count FROM monsters;

    IF monster_count = 0 THEN
        -- Create temporary table for CSV import
        CREATE TEMP TABLE monsters_import (
            name VARCHAR(255),
            actions TEXT,
            legendary_actions TEXT,
            armor_class VARCHAR(10),
            charisma VARCHAR(10),
            constitution VARCHAR(10),
            dexterity VARCHAR(10),
            description TEXT,
            strength VARCHAR(10),
            intelligence VARCHAR(10),
            charisma_mod VARCHAR(10),
            constitution_mod VARCHAR(10),
            dexterity_mod VARCHAR(10),
            strength_mod VARCHAR(10),
            intelligence_mod VARCHAR(10),
            wisdom_mod VARCHAR(10),
            hit_points VARCHAR(10),
            challenge_rating_xp VARCHAR(10),
            creature_type VARCHAR(100),
            wisdom VARCHAR(10),
            size VARCHAR(10),
            speed VARCHAR(100)
        );

        -- Import CSV data
        COPY monsters_import(
            name, actions, legendary_actions, armor_class, charisma, constitution,
            dexterity, description, strength, intelligence, charisma_mod, constitution_mod,
            dexterity_mod, strength_mod, intelligence_mod, wisdom_mod, hit_points,
            challenge_rating_xp, creature_type, wisdom, size, speed
        )
        FROM '/data/all_monsters.csv'
        WITH (FORMAT csv, HEADER true, DELIMITER ',', ENCODING 'UTF8');

        -- Insert into main table with JSONB parsing
        INSERT INTO monsters (
            name, armor_class, hit_points, speed,
            strength, dexterity, constitution, intelligence, wisdom, charisma,
            strength_mod, dexterity_mod, constitution_mod, intelligence_mod, wisdom_mod, charisma_mod,
            creature_type, size, challenge_rating_xp,
            actions, legendary_actions, traits
        )
        SELECT
            name,
            NULLIF(armor_class, '')::INTEGER,
            NULLIF(hit_points, '')::INTEGER,
            speed,
            NULLIF(strength, '')::INTEGER,
            NULLIF(dexterity, '')::INTEGER,
            NULLIF(constitution, '')::INTEGER,
            NULLIF(intelligence, '')::INTEGER,
            NULLIF(wisdom, '')::INTEGER,
            NULLIF(charisma, '')::INTEGER,
            NULLIF(strength_mod, '')::INTEGER,
            NULLIF(dexterity_mod, '')::INTEGER,
            NULLIF(constitution_mod, '')::INTEGER,
            NULLIF(intelligence_mod, '')::INTEGER,
            NULLIF(wisdom_mod, '')::INTEGER,
            NULLIF(charisma_mod, '')::INTEGER,
            creature_type,
            size,
            NULLIF(challenge_rating_xp, '')::INTEGER,
            _temp_parse_actions(actions),
            _temp_parse_legendary_actions(legendary_actions),
            _temp_parse_traits(description)
        FROM monsters_import;

        DROP TABLE monsters_import;

        SELECT COUNT(*) INTO monster_count FROM monsters;
        RAISE NOTICE 'Successfully imported % monsters', monster_count;
    END IF;
END $$;

-- Cleanup temporary functions
DROP FUNCTION IF EXISTS _temp_parse_actions;
DROP FUNCTION IF EXISTS _temp_parse_legendary_actions;
DROP FUNCTION IF EXISTS _temp_parse_traits;
