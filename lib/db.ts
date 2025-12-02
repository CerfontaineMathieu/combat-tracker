import { Pool } from 'pg';
import type {
  CatalogItem,
  CatalogItemInput,
  ItemCategory,
} from './types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://dnd:dnd@localhost:5432/dnd_tracker',
});

export default pool;

export interface Monster {
  id: number;
  name: string;
  armor_class: number | null;
  hit_points: number | null;
  speed: string | null;
  strength: number | null;
  dexterity: number | null;
  constitution: number | null;
  intelligence: number | null;
  wisdom: number | null;
  charisma: number | null;
  strength_mod: number | null;
  dexterity_mod: number | null;
  constitution_mod: number | null;
  intelligence_mod: number | null;
  wisdom_mod: number | null;
  charisma_mod: number | null;
  creature_type: string | null;
  size: string | null;
  challenge_rating_xp: number | null;
  actions: Array<{ name: string; description: string }>;
  legendary_actions: Array<{ name: string; description: string; cost: number }>;
  traits: {
    skills: string[];
    senses: string[];
    languages: string[];
    damage_resistances: string[];
    damage_immunities: string[];
    condition_immunities: string[];
    special_abilities: Array<{ name: string; description: string }>;
  };
  image_url: string | null;
  ai_generated: string | null;  // AI-generated image path (local only)
  notion_id: string | null;      // Notion page ID (for sync tracking)
  created_at: Date;
}

export async function getMonsters(): Promise<Monster[]> {
  const result = await pool.query('SELECT * FROM monsters ORDER BY name');
  return result.rows;
}

export async function getMonsterById(id: number): Promise<Monster | null> {
  const result = await pool.query('SELECT * FROM monsters WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function getMonsterByName(name: string): Promise<Monster | null> {
  const result = await pool.query('SELECT * FROM monsters WHERE name ILIKE $1', [name]);
  return result.rows[0] || null;
}

export async function searchMonsters(query: string): Promise<Monster[]> {
  const result = await pool.query(
    'SELECT * FROM monsters WHERE name ILIKE $1 OR creature_type ILIKE $1 ORDER BY name',
    [`%${query}%`]
  );
  return result.rows;
}

/**
 * Get all monsters as a Map for efficient lookups
 * @returns Map with lowercase monster names as keys
 */
export async function getAllMonstersMap(): Promise<Map<string, Monster>> {
  const monsters = await getMonsters();
  const map = new Map<string, Monster>();
  monsters.forEach(m => map.set(m.name.toLowerCase(), m));
  return map;
}

/**
 * Update specific fields of a monster, preserving fields not included in the update
 * CRITICAL: This function never allows ai_generated to be overwritten
 * @param id - Monster ID
 * @param fields - Partial monster data (only fields to update)
 * @returns Updated monster
 */
export async function updateMonsterFields(
  id: number,
  fields: Partial<Omit<Monster, 'id' | 'created_at' | 'ai_generated'>>
): Promise<Monster> {
  // Build dynamic SET clause for only provided fields
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Never allow ai_generated to be updated through this function
  const allowedFields = Object.keys(fields).filter(k => k !== 'ai_generated' && k !== 'id' && k !== 'created_at');

  for (const key of allowedFields) {
    setClauses.push(`${key} = $${paramIndex++}`);
    const value = fields[key as keyof typeof fields];

    // Handle JSONB fields
    if (key === 'actions' || key === 'legendary_actions' || key === 'traits') {
      values.push(JSON.stringify(value));
    } else {
      values.push(value);
    }
  }

  if (setClauses.length === 0) {
    // No fields to update, just return the current monster
    const monster = await getMonsterById(id);
    if (!monster) throw new Error(`Monster with id ${id} not found`);
    return monster;
  }

  values.push(id);

  const result = await pool.query(
    `UPDATE monsters SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  if (!result.rows[0]) throw new Error(`Monster with id ${id} not found`);
  return result.rows[0];
}

/**
 * Delete monsters by IDs with safety checks
 * Prevents deletion of monsters currently in active combat
 * @param ids - Array of monster IDs to delete
 * @returns Object with deleted count and any errors
 */
export async function deleteMonstersById(ids: number[]): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;

  for (const id of ids) {
    try {
      // Check if monster is in use in combat
      const inUseResult = await pool.query(
        'SELECT COUNT(*) as count FROM combat_monsters WHERE monster_id = $1',
        [id]
      );

      const count = parseInt(inUseResult.rows[0].count);

      if (count > 0) {
        const monster = await getMonsterById(id);
        errors.push(`Impossible de supprimer "${monster?.name || `ID ${id}`}": utilisé dans un combat actif`);
        continue;
      }

      // Safe to delete
      const result = await pool.query('DELETE FROM monsters WHERE id = $1', [id]);
      if (result.rowCount && result.rowCount > 0) deleted++;
    } catch (error) {
      errors.push(`Erreur lors de la suppression du monstre ID ${id}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  return { deleted, errors };
}

/**
 * Get monsters by their Notion IDs
 * @param notionIds - Array of Notion page IDs
 * @returns Array of monsters
 */
export async function getMonstersByNotionIds(notionIds: string[]): Promise<Monster[]> {
  const result = await pool.query(
    'SELECT * FROM monsters WHERE notion_id = ANY($1)',
    [notionIds]
  );
  return result.rows;
}

export async function upsertMonster(monster: Omit<Monster, 'id' | 'created_at'>): Promise<Monster> {
  const result = await pool.query(
    `INSERT INTO monsters (
      name, armor_class, hit_points, speed, strength, dexterity, constitution,
      intelligence, wisdom, charisma, strength_mod, dexterity_mod, constitution_mod,
      intelligence_mod, wisdom_mod, charisma_mod, creature_type, size,
      challenge_rating_xp, actions, legendary_actions, traits, image_url, notion_id, ai_generated
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
    ON CONFLICT (name)
    DO UPDATE SET
      armor_class = EXCLUDED.armor_class,
      hit_points = EXCLUDED.hit_points,
      speed = EXCLUDED.speed,
      strength = EXCLUDED.strength,
      dexterity = EXCLUDED.dexterity,
      constitution = EXCLUDED.constitution,
      intelligence = EXCLUDED.intelligence,
      wisdom = EXCLUDED.wisdom,
      charisma = EXCLUDED.charisma,
      strength_mod = EXCLUDED.strength_mod,
      dexterity_mod = EXCLUDED.dexterity_mod,
      constitution_mod = EXCLUDED.constitution_mod,
      intelligence_mod = EXCLUDED.intelligence_mod,
      wisdom_mod = EXCLUDED.wisdom_mod,
      charisma_mod = EXCLUDED.charisma_mod,
      creature_type = EXCLUDED.creature_type,
      size = EXCLUDED.size,
      challenge_rating_xp = EXCLUDED.challenge_rating_xp,
      actions = EXCLUDED.actions,
      legendary_actions = EXCLUDED.legendary_actions,
      traits = EXCLUDED.traits,
      image_url = EXCLUDED.image_url,
      notion_id = EXCLUDED.notion_id
      -- NOTE: ai_generated is NOT updated here, preserving local AI-generated images
    RETURNING *`,
    [
      monster.name,
      monster.armor_class,
      monster.hit_points,
      monster.speed,
      monster.strength,
      monster.dexterity,
      monster.constitution,
      monster.intelligence,
      monster.wisdom,
      monster.charisma,
      monster.strength_mod,
      monster.dexterity_mod,
      monster.constitution_mod,
      monster.intelligence_mod,
      monster.wisdom_mod,
      monster.charisma_mod,
      monster.creature_type,
      monster.size,
      monster.challenge_rating_xp,
      JSON.stringify(monster.actions || []),
      JSON.stringify(monster.legendary_actions || []),
      JSON.stringify(monster.traits || {
        skills: [],
        senses: [],
        languages: [],
        damage_resistances: [],
        damage_immunities: [],
        condition_immunities: [],
        special_abilities: [],
      }),
      monster.image_url,
      monster.notion_id || null,
      monster.ai_generated || null,
    ]
  );
  return result.rows[0];
}

// Campaign types and functions
export interface Campaign {
  id: number;
  name: string;
  description: string | null;
  room_code: string | null;
  dm_password: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function getCampaigns(): Promise<Campaign[]> {
  const result = await pool.query('SELECT * FROM campaigns ORDER BY updated_at DESC');
  return result.rows;
}

export async function getCampaignById(id: number): Promise<Campaign | null> {
  const result = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
  return result.rows[0] || null;
}

// Character types and functions
export interface Character {
  id: number;
  campaign_id: number;
  name: string;
  class: string;
  level: number;
  current_hp: number;
  max_hp: number;
  ac: number;
  initiative: number;
  conditions: string[];
  exhaustion_level: number;
  created_at: Date;
  updated_at: Date;
}

export async function getCharactersByCampaign(campaignId: number): Promise<Character[]> {
  const result = await pool.query(
    'SELECT * FROM characters WHERE campaign_id = $1 ORDER BY name',
    [campaignId]
  );
  return result.rows;
}

export async function updateCharacter(
  id: number,
  updates: Partial<Pick<Character, 'current_hp' | 'initiative' | 'conditions' | 'exhaustion_level'>>
): Promise<Character | null> {
  const setClauses: string[] = [];
  const values: (number | string[] | string)[] = [];
  let paramIndex = 1;

  if (updates.current_hp !== undefined) {
    setClauses.push(`current_hp = $${paramIndex++}`);
    values.push(updates.current_hp);
  }
  if (updates.initiative !== undefined) {
    setClauses.push(`initiative = $${paramIndex++}`);
    values.push(updates.initiative);
  }
  if (updates.conditions !== undefined) {
    setClauses.push(`conditions = $${paramIndex++}`);
    values.push(JSON.stringify(updates.conditions));
  }
  if (updates.exhaustion_level !== undefined) {
    setClauses.push(`exhaustion_level = $${paramIndex++}`);
    values.push(updates.exhaustion_level);
  }

  if (setClauses.length === 0) return null;

  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const result = await pool.query(
    `UPDATE characters SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

// Combat monster types and functions
export interface CombatMonster {
  id: number;
  campaign_id: number;
  monster_id: number | null;
  name: string;
  hp: number;
  max_hp: number;
  ac: number;
  initiative: number;
  notes: string | null;
  status: string;
  conditions: string[];
  exhaustion_level: number;
  created_at: Date;
}

export async function getCombatMonstersByCampaign(campaignId: number): Promise<CombatMonster[]> {
  const result = await pool.query(
    'SELECT * FROM combat_monsters WHERE campaign_id = $1 ORDER BY initiative DESC',
    [campaignId]
  );
  return result.rows;
}

export async function addCombatMonster(
  campaignId: number,
  monster: Omit<CombatMonster, 'id' | 'campaign_id' | 'created_at'>
): Promise<CombatMonster> {
  const result = await pool.query(
    `INSERT INTO combat_monsters (campaign_id, monster_id, name, hp, max_hp, ac, initiative, notes, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [campaignId, monster.monster_id, monster.name, monster.hp, monster.max_hp, monster.ac, monster.initiative, monster.notes, monster.status]
  );
  return result.rows[0];
}

export async function updateCombatMonster(
  id: number,
  updates: Partial<Pick<CombatMonster, 'hp' | 'status' | 'conditions' | 'exhaustion_level'>>
): Promise<CombatMonster | null> {
  const setClauses: string[] = [];
  const values: (number | string)[] = [];
  let paramIndex = 1;

  if (updates.hp !== undefined) {
    setClauses.push(`hp = $${paramIndex++}`);
    values.push(updates.hp);
  }
  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }
  if (updates.conditions !== undefined) {
    setClauses.push(`conditions = $${paramIndex++}`);
    values.push(JSON.stringify(updates.conditions));
  }
  if (updates.exhaustion_level !== undefined) {
    setClauses.push(`exhaustion_level = $${paramIndex++}`);
    values.push(updates.exhaustion_level);
  }

  if (setClauses.length === 0) return null;

  values.push(id);

  const result = await pool.query(
    `UPDATE combat_monsters SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteCombatMonster(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM combat_monsters WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

// Note types and functions
export interface Note {
  id: number;
  campaign_id: number;
  title: string;
  content: string | null;
  session_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export async function getNotesByCampaign(campaignId: number): Promise<Note[]> {
  const result = await pool.query(
    'SELECT * FROM notes WHERE campaign_id = $1 ORDER BY session_date DESC, created_at DESC',
    [campaignId]
  );
  return result.rows;
}

export async function addNote(
  campaignId: number,
  note: Pick<Note, 'title' | 'content' | 'session_date'>
): Promise<Note> {
  const result = await pool.query(
    `INSERT INTO notes (campaign_id, title, content, session_date)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [campaignId, note.title, note.content, note.session_date]
  );
  return result.rows[0];
}

export async function updateNote(
  id: number,
  updates: Partial<Pick<Note, 'title' | 'content'>>
): Promise<Note | null> {
  const setClauses: string[] = [];
  const values: (string | null)[] = [];
  let paramIndex = 1;

  if (updates.title !== undefined) {
    setClauses.push(`title = $${paramIndex++}`);
    values.push(updates.title);
  }
  if (updates.content !== undefined) {
    setClauses.push(`content = $${paramIndex++}`);
    values.push(updates.content);
  }

  if (setClauses.length === 0) return null;

  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(String(id));

  const result = await pool.query(
    `UPDATE notes SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteNote(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM notes WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

// Campaign CRUD functions
export async function createCampaign(name: string, description?: string): Promise<Campaign> {
  const result = await pool.query(
    `INSERT INTO campaigns (name, description) VALUES ($1, $2) RETURNING *`,
    [name, description || null]
  );
  return result.rows[0];
}

export async function updateCampaign(
  id: number,
  updates: Partial<Pick<Campaign, 'name' | 'description'>>
): Promise<Campaign | null> {
  const setClauses: string[] = [];
  const values: (string | null)[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    setClauses.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }

  if (setClauses.length === 0) return null;

  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(String(id));

  const result = await pool.query(
    `UPDATE campaigns SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteCampaign(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM campaigns WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

// DM Password functions
export async function getDmPassword(campaignId: number): Promise<string | null> {
  const result = await pool.query(
    'SELECT dm_password FROM campaigns WHERE id = $1',
    [campaignId]
  );
  return result.rows[0]?.dm_password || null;
}

export async function setDmPassword(campaignId: number, password: string): Promise<boolean> {
  const result = await pool.query(
    'UPDATE campaigns SET dm_password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [password, campaignId]
  );
  return (result.rowCount ?? 0) > 0;
}

// Room code functions
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

export async function setRoomCode(campaignId: number): Promise<string> {
  const code = generateRoomCode();
  await pool.query(
    `UPDATE campaigns SET room_code = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [code, campaignId]
  );
  return code;
}

export async function clearRoomCode(campaignId: number): Promise<void> {
  await pool.query(
    `UPDATE campaigns SET room_code = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [campaignId]
  );
}

export async function getCampaignByRoomCode(code: string): Promise<Campaign | null> {
  const result = await pool.query(
    'SELECT * FROM campaigns WHERE room_code = $1',
    [code.toUpperCase()]
  );
  return result.rows[0] || null;
}

// Combat session types and functions
export interface CombatSession {
  id: number;
  campaign_id: number;
  name: string | null;
  is_active: boolean;
  current_turn: number;
  round_number: number;
  created_at: Date;
  updated_at: Date;
}

export interface CombatSessionParticipant {
  id: number;
  session_id: number;
  participant_type: 'player' | 'monster';
  source_id: number;
  name: string;
  initiative: number;
  current_hp: number;
  max_hp: number;
  ac: number;
  conditions: string[];
  exhaustion_level: number;
  position: number;
  created_at: Date;
}

export async function getActiveCombatSession(campaignId: number): Promise<CombatSession | null> {
  const result = await pool.query(
    'SELECT * FROM combat_sessions WHERE campaign_id = $1 AND is_active = true',
    [campaignId]
  );
  return result.rows[0] || null;
}

export async function getCombatSessionParticipants(sessionId: number): Promise<CombatSessionParticipant[]> {
  const result = await pool.query(
    'SELECT * FROM combat_session_participants WHERE session_id = $1 ORDER BY position ASC',
    [sessionId]
  );
  return result.rows;
}

export async function createCombatSession(
  campaignId: number,
  participants: Omit<CombatSessionParticipant, 'id' | 'session_id' | 'created_at'>[]
): Promise<CombatSession> {
  // Deactivate any existing active session
  await pool.query(
    'UPDATE combat_sessions SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE campaign_id = $1 AND is_active = true',
    [campaignId]
  );

  // Create new session
  const sessionResult = await pool.query(
    `INSERT INTO combat_sessions (campaign_id, is_active, current_turn, round_number)
     VALUES ($1, true, 0, 1) RETURNING *`,
    [campaignId]
  );
  const session = sessionResult.rows[0];

  // Insert participants
  for (const participant of participants) {
    await pool.query(
      `INSERT INTO combat_session_participants
       (session_id, participant_type, source_id, name, initiative, current_hp, max_hp, ac, conditions, exhaustion_level, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        session.id,
        participant.participant_type,
        participant.source_id,
        participant.name,
        participant.initiative,
        participant.current_hp,
        participant.max_hp,
        participant.ac,
        JSON.stringify(participant.conditions),
        participant.exhaustion_level || 0,
        participant.position
      ]
    );
  }

  return session;
}

export async function updateCombatSession(
  sessionId: number,
  updates: Partial<Pick<CombatSession, 'current_turn' | 'round_number' | 'is_active'>>
): Promise<CombatSession | null> {
  const setClauses: string[] = [];
  const values: (number | boolean)[] = [];
  let paramIndex = 1;

  if (updates.current_turn !== undefined) {
    setClauses.push(`current_turn = $${paramIndex++}`);
    values.push(updates.current_turn);
  }
  if (updates.round_number !== undefined) {
    setClauses.push(`round_number = $${paramIndex++}`);
    values.push(updates.round_number);
  }
  if (updates.is_active !== undefined) {
    setClauses.push(`is_active = $${paramIndex++}`);
    values.push(updates.is_active);
  }

  if (setClauses.length === 0) return null;

  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(sessionId);

  const result = await pool.query(
    `UPDATE combat_sessions SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function updateCombatSessionParticipant(
  participantId: number,
  updates: Partial<Pick<CombatSessionParticipant, 'current_hp' | 'conditions' | 'exhaustion_level'>>
): Promise<CombatSessionParticipant | null> {
  const setClauses: string[] = [];
  const values: (number | string)[] = [];
  let paramIndex = 1;

  if (updates.current_hp !== undefined) {
    setClauses.push(`current_hp = $${paramIndex++}`);
    values.push(updates.current_hp);
  }
  if (updates.conditions !== undefined) {
    setClauses.push(`conditions = $${paramIndex++}`);
    values.push(JSON.stringify(updates.conditions));
  }
  if (updates.exhaustion_level !== undefined) {
    setClauses.push(`exhaustion_level = $${paramIndex++}`);
    values.push(updates.exhaustion_level);
  }

  if (setClauses.length === 0) return null;

  values.push(participantId);

  const result = await pool.query(
    `UPDATE combat_session_participants SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function endCombatSession(sessionId: number): Promise<void> {
  await pool.query(
    'UPDATE combat_sessions SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [sessionId]
  );
}

// Fight preset types and functions
export interface FightPreset {
  id: number;
  campaign_id: number;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface FightPresetMonster {
  id: number;
  preset_id: number;
  monster_id: number | null;
  name: string;
  hp: number;
  max_hp: number;
  ac: number;
  initiative: number;
  notes: string | null;
  quantity: number;
  participant_type: 'player' | 'monster';
  reference_id: string | null;
  xp?: number;
  created_at: Date;
}

export interface FightPresetWithMonsters extends FightPreset {
  monsters: FightPresetMonster[];
}

export async function getFightPresetsByCampaign(campaignId: number): Promise<FightPreset[]> {
  const result = await pool.query(
    'SELECT * FROM fight_presets WHERE campaign_id = $1 ORDER BY updated_at DESC',
    [campaignId]
  );
  return result.rows;
}

export async function getFightPresetById(presetId: number): Promise<FightPresetWithMonsters | null> {
  const presetResult = await pool.query(
    'SELECT * FROM fight_presets WHERE id = $1',
    [presetId]
  );

  if (presetResult.rows.length === 0) return null;

  const preset = presetResult.rows[0];

  const monstersResult = await pool.query(
    'SELECT * FROM fight_preset_monsters WHERE preset_id = $1 ORDER BY name',
    [presetId]
  );

  return {
    ...preset,
    monsters: monstersResult.rows,
  };
}

export async function createFightPreset(
  campaignId: number,
  name: string,
  description: string | null,
  monsters: Omit<FightPresetMonster, 'id' | 'preset_id' | 'created_at'>[]
): Promise<FightPresetWithMonsters> {
  // Create the preset
  const presetResult = await pool.query(
    `INSERT INTO fight_presets (campaign_id, name, description)
     VALUES ($1, $2, $3) RETURNING *`,
    [campaignId, name, description]
  );
  const preset = presetResult.rows[0];

  // Insert monsters
  const insertedMonsters: FightPresetMonster[] = [];
  for (const monster of monsters) {
    const monsterResult = await pool.query(
      `INSERT INTO fight_preset_monsters
       (preset_id, monster_id, name, hp, max_hp, ac, initiative, notes, quantity, participant_type, reference_id, xp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        preset.id,
        monster.monster_id,
        monster.name,
        monster.hp,
        monster.max_hp,
        monster.ac,
        monster.initiative,
        monster.notes,
        monster.quantity || 1,
        monster.participant_type || 'monster',
        monster.reference_id || null,
        monster.xp || null,
      ]
    );
    insertedMonsters.push(monsterResult.rows[0]);
  }

  return {
    ...preset,
    monsters: insertedMonsters,
  };
}

export async function updateFightPreset(
  presetId: number,
  updates: Partial<Pick<FightPreset, 'name' | 'description'>>
): Promise<FightPreset | null> {
  const setClauses: string[] = [];
  const values: (string | null)[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    setClauses.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }

  if (setClauses.length === 0) return null;

  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(String(presetId));

  const result = await pool.query(
    `UPDATE fight_presets SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteFightPreset(presetId: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM fight_presets WHERE id = $1', [presetId]);
  return (result.rowCount ?? 0) > 0;
}

// ============================================
// Combat History & Backup Functions
// ============================================

export interface CombatHistoryEntry {
  id: number;
  campaign_id: number;
  started_at: Date;
  ended_at: Date | null;
  final_state: unknown;
  participants: unknown[];
  total_rounds: number;
  outcome: string | null;
  notes: string | null;
}

export interface CombatStateBackup {
  campaign_id: number;
  state: unknown;
  last_update: Date;
}

// Save combat to history when it ends
export async function saveCombatHistory(
  campaignId: number,
  data: {
    startedAt: Date;
    finalState: unknown;
    participants: unknown[];
    totalRounds: number;
    outcome?: string;
    notes?: string;
  }
): Promise<number> {
  const result = await pool.query(
    `INSERT INTO combat_history
     (campaign_id, started_at, ended_at, final_state, participants, total_rounds, outcome, notes)
     VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      campaignId,
      data.startedAt,
      JSON.stringify(data.finalState),
      JSON.stringify(data.participants),
      data.totalRounds,
      data.outcome || null,
      data.notes || null,
    ]
  );
  return result.rows[0].id;
}

// Get combat history for a campaign
export async function getCombatHistory(
  campaignId: number,
  limit = 20
): Promise<CombatHistoryEntry[]> {
  const result = await pool.query(
    `SELECT * FROM combat_history
     WHERE campaign_id = $1
     ORDER BY started_at DESC
     LIMIT $2`,
    [campaignId, limit]
  );
  return result.rows;
}

// Save combat state backup (for Redis failure recovery)
export async function saveCombatStateBackup(
  campaignId: number,
  state: unknown
): Promise<void> {
  await pool.query(
    `INSERT INTO combat_state_backup (campaign_id, state, last_update)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (campaign_id) DO UPDATE SET
       state = EXCLUDED.state,
       last_update = CURRENT_TIMESTAMP`,
    [campaignId, JSON.stringify(state)]
  );
}

// Get combat state backup (fallback if Redis is empty)
export async function getCombatStateBackup(
  campaignId: number
): Promise<CombatStateBackup | null> {
  const result = await pool.query(
    'SELECT * FROM combat_state_backup WHERE campaign_id = $1',
    [campaignId]
  );
  return result.rows[0] || null;
}

// Clear combat state backup when combat ends
export async function clearCombatStateBackup(campaignId: number): Promise<void> {
  await pool.query('DELETE FROM combat_state_backup WHERE campaign_id = $1', [campaignId]);
}

// ============================================
// Character Inventory Functions
// ============================================

export interface CharacterInventory {
  equipment: any[];
  consumables: any[];
  currency: {
    platinum: number;
    gold: number;
    electrum: number;
    silver: number;
    copper: number;
  };
  items: any[];
}

const DEFAULT_INVENTORY: CharacterInventory = {
  equipment: [],
  consumables: [],
  currency: { platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0 },
  items: [],
};

// Get character inventory by character ID (odNumber)
export async function getCharacterInventory(
  characterId: string
): Promise<CharacterInventory> {
  const result = await pool.query(
    'SELECT inventory FROM character_inventories WHERE character_id = $1',
    [characterId]
  );

  if (result.rows.length === 0) {
    return DEFAULT_INVENTORY;
  }

  return result.rows[0].inventory;
}

// ============================================
// Item Catalog Functions (for Notion sync)
// ============================================

export async function getCatalogItems(): Promise<CatalogItem[]> {
  const result = await pool.query(
    'SELECT * FROM item_catalog ORDER BY name'
  );
  return result.rows;
}

export async function getCatalogItemsByCategory(category: ItemCategory): Promise<CatalogItem[]> {
  const result = await pool.query(
    'SELECT * FROM item_catalog WHERE category = $1 ORDER BY name',
    [category]
  );
  return result.rows;
}

export async function getCatalogItemById(id: number): Promise<CatalogItem | null> {
  const result = await pool.query(
    'SELECT * FROM item_catalog WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function getCatalogItemByNotionId(notionId: string): Promise<CatalogItem | null> {
  const result = await pool.query(
    'SELECT * FROM item_catalog WHERE notion_id = $1',
    [notionId]
  );
  return result.rows[0] || null;
}

export async function searchCatalogItems(
  query: string,
  category?: ItemCategory
): Promise<CatalogItem[]> {
  let sql = `
    SELECT * FROM item_catalog
    WHERE (
      name ILIKE $1
      OR description ILIKE $1
      OR rarity ILIKE $1
    )
  `;
  const params: (string | ItemCategory)[] = [`%${query}%`];

  if (category) {
    sql += ` AND category = $2`;
    params.push(category);
  }

  sql += ' ORDER BY name LIMIT 50';

  const result = await pool.query(sql, params);
  return result.rows;
}

export async function upsertCatalogItem(item: CatalogItemInput): Promise<CatalogItem> {
  const result = await pool.query(
    `INSERT INTO item_catalog (
      notion_id, name, category, subcategory, source_database,
      description, rarity, properties, image_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (notion_id)
    DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      subcategory = EXCLUDED.subcategory,
      source_database = EXCLUDED.source_database,
      description = EXCLUDED.description,
      rarity = EXCLUDED.rarity,
      properties = EXCLUDED.properties,
      image_url = EXCLUDED.image_url,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *`,
    [
      item.notion_id,
      item.name,
      item.category,
      item.subcategory,
      item.source_database,
      item.description,
      item.rarity,
      JSON.stringify(item.properties || {}),
      item.image_url,
    ]
  );
  return result.rows[0];
}

export async function deleteCatalogItemsById(ids: number[]): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;

  for (const id of ids) {
    try {
      const result = await pool.query('DELETE FROM item_catalog WHERE id = $1', [id]);
      if (result.rowCount && result.rowCount > 0) deleted++;
    } catch (error) {
      errors.push(`Erreur lors de la suppression de l'item ID ${id}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  return { deleted, errors };
}

export async function deleteCatalogItemsByNotionId(notionIds: string[]): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;

  for (const notionId of notionIds) {
    try {
      const result = await pool.query('DELETE FROM item_catalog WHERE notion_id = $1', [notionId]);
      if (result.rowCount && result.rowCount > 0) deleted++;
    } catch (error) {
      errors.push(`Erreur lors de la suppression de l'item Notion ${notionId}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  return { deleted, errors };
}
