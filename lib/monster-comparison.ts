import type { Monster } from './db';

/**
 * Represents a change in a single monster field
 */
export interface MonsterFieldChange {
  field: keyof Monster;
  fieldLabel: string; // French label for UI display
  oldValue: any;
  newValue: any;
  isJsonb: boolean; // Whether this is a JSONB field (arrays/objects)
}

/**
 * Result of comparing two monsters
 */
export interface MonsterComparison {
  hasChanges: boolean;
  changedFields: MonsterFieldChange[];
}

/**
 * Action types for sync preview items
 */
export enum SyncAction {
  ADD = 'add',           // Monster in Notion, not in DB
  UPDATE = 'update',     // Monster in both, with differences
  DELETE = 'delete',     // Monster in DB with notion_id, not in Notion
  NO_CHANGE = 'no_change' // Monster in both, identical
}

/**
 * Preview item for a single monster in the sync
 */
export interface SyncPreviewItem {
  action: SyncAction;
  monsterName: string;
  dbId?: number;              // DB monster ID (for updates/deletes)
  dbMonster?: Monster;        // Current DB monster data
  notionMonster?: Partial<Monster>; // New Notion monster data
  comparison?: MonsterComparison;   // Field-by-field comparison (for updates)
  notionId?: string;          // Notion page ID
}

/**
 * French labels for all monster fields
 */
export const FIELD_LABELS: Record<string, string> = {
  name: 'Nom',
  armor_class: "Classe d'armure (CA)",
  hit_points: 'Points de vie (PV)',
  speed: 'Vitesse',
  strength: 'Force',
  dexterity: 'Dextérité',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Sagesse',
  charisma: 'Charisme',
  strength_mod: 'Modif. FOR',
  dexterity_mod: 'Modif. DEX',
  constitution_mod: 'Modif. CON',
  intelligence_mod: 'Modif. INT',
  wisdom_mod: 'Modif. SAG',
  charisma_mod: 'Modif. CHAR',
  creature_type: 'Type de créature',
  size: 'Taille',
  challenge_rating_xp: 'Puissance (XP)',
  actions: 'Actions',
  legendary_actions: 'Actions légendaires',
  traits: 'Traits',
  image_url: 'Image URL',
};

/**
 * Normalize a value for comparison
 * - null, undefined, and empty string all become null
 * - strings are trimmed
 */
function normalizeValue(value: any): any {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') return value.trim();
  return value;
}

/**
 * Deep compare for JSONB fields using JSON.stringify
 * Sorts object keys to handle different key ordering
 */
function areJsonEqual(a: any, b: any): boolean {
  const normalizedA = normalizeValue(a);
  const normalizedB = normalizeValue(b);

  if (normalizedA === null && normalizedB === null) return true;
  if (normalizedA === null || normalizedB === null) return false;

  // Recursively sort object keys for consistent comparison
  const sortKeys = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(sortKeys);
    if (typeof obj === 'object') {
      return Object.keys(obj)
        .sort()
        .reduce((result: any, key) => {
          result[key] = sortKeys(obj[key]);
          return result;
        }, {});
    }
    return obj;
  };

  return JSON.stringify(sortKeys(normalizedA)) === JSON.stringify(sortKeys(normalizedB));
}

/**
 * Compare two monsters field-by-field
 * Returns a comparison result with a list of changed fields
 *
 * @param dbMonster - Current monster in database
 * @param notionMonster - New monster data from Notion
 * @returns MonsterComparison with hasChanges flag and list of changed fields
 */
export function compareMonsters(
  dbMonster: Monster,
  notionMonster: Partial<Monster>
): MonsterComparison {
  const changedFields: MonsterFieldChange[] = [];

  // Fields to compare (exclude id, created_at, ai_generated, notion_id)
  const fieldsToCompare: (keyof Monster)[] = [
    'name',
    'armor_class',
    'hit_points',
    'speed',
    'strength',
    'dexterity',
    'constitution',
    'intelligence',
    'wisdom',
    'charisma',
    'strength_mod',
    'dexterity_mod',
    'constitution_mod',
    'intelligence_mod',
    'wisdom_mod',
    'charisma_mod',
    'creature_type',
    'size',
    'challenge_rating_xp',
    'actions',
    'legendary_actions',
    'traits',
    'image_url',
  ];

  for (const field of fieldsToCompare) {
    const oldValue = normalizeValue(dbMonster[field]);
    const newValue = normalizeValue(notionMonster[field]);

    let hasChanged = false;
    const isJsonb = field === 'actions' || field === 'legendary_actions' || field === 'traits';

    if (isJsonb) {
      hasChanged = !areJsonEqual(oldValue, newValue);
    } else {
      hasChanged = oldValue !== newValue;
    }

    if (hasChanged) {
      changedFields.push({
        field,
        fieldLabel: FIELD_LABELS[field] || field,
        oldValue,
        newValue,
        isJsonb,
      });
    }
  }

  return {
    hasChanges: changedFields.length > 0,
    changedFields,
  };
}

/**
 * Build a complete sync preview by comparing Notion and DB monsters
 * Categorizes each monster into ADD, UPDATE, DELETE, or NO_CHANGE
 *
 * @param dbMonsters - All monsters currently in the database
 * @param notionMonsters - All monsters from Notion with their IDs
 * @returns Array of SyncPreviewItems categorized by action type
 */
export function buildSyncPreview(
  dbMonsters: Monster[],
  notionMonsters: Array<{ data: Partial<Monster>; notionId: string }>
): SyncPreviewItem[] {
  const items: SyncPreviewItem[] = [];

  // Build maps for efficient lookup (case-insensitive name matching)
  const dbMap = new Map<string, Monster>();
  dbMonsters.forEach(m => dbMap.set(m.name.toLowerCase(), m));

  const notionMap = new Map<string, { data: Partial<Monster>; notionId: string }>();
  notionMonsters.forEach(m => {
    if (m.data.name) {
      notionMap.set(m.data.name.toLowerCase(), m);
    }
  });

  // 1. Process Notion monsters: find ADD and UPDATE items
  notionMonsters.forEach(({ data, notionId }) => {
    if (!data.name) return; // Skip monsters without names

    const dbMonster = dbMap.get(data.name.toLowerCase());

    if (!dbMonster) {
      // Monster is new - ADD
      items.push({
        action: SyncAction.ADD,
        monsterName: data.name,
        notionMonster: data,
        notionId,
      });
    } else {
      // Monster exists - compare for changes
      const comparison = compareMonsters(dbMonster, data);

      if (comparison.hasChanges) {
        // Monster has changes - UPDATE
        items.push({
          action: SyncAction.UPDATE,
          monsterName: data.name,
          dbId: dbMonster.id,
          dbMonster,
          notionMonster: data,
          comparison,
          notionId,
        });
      } else {
        // Monster is unchanged - NO_CHANGE
        items.push({
          action: SyncAction.NO_CHANGE,
          monsterName: data.name,
          dbId: dbMonster.id,
          dbMonster,
          notionMonster: data,
          notionId,
        });
      }
    }
  });

  // 2. Find DELETE items: DB monsters with notion_id that are not in Notion
  // Note: Only consider monsters with notion_id (synced from Notion)
  // This prevents accidental deletion of manually-created monsters
  dbMonsters.forEach(dbMonster => {
    // Check if monster has notion_id (was synced from Notion)
    const notionId = (dbMonster as any).notion_id;
    const hasNotionId = notionId !== null && notionId !== undefined && notionId !== '';

    if (hasNotionId && !notionMap.has(dbMonster.name.toLowerCase())) {
      // Monster was from Notion but is now missing - DELETE
      items.push({
        action: SyncAction.DELETE,
        monsterName: dbMonster.name,
        dbId: dbMonster.id,
        dbMonster,
      });
    }
  });

  return items;
}
