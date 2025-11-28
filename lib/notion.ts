import { Client } from '@notionhq/client';
import type { Monster } from './db';

export interface NotionMonster {
  id: string;
  properties: Record<string, any>;
}

// Cache for data source IDs (database_id -> data_source_id)
const dataSourceCache: Map<string, string> = new Map();

/**
 * Get Notion client instance
 */
function getNotionClient() {
  const token = process.env.NOTION_API_TOKEN;

  if (!token) {
    throw new Error('NOTION_API_TOKEN is not defined');
  }

  return new Client({ auth: token });
}

/**
 * Get database ID
 */
function getDatabaseId() {
  const databaseId = process.env.NOTION_MONSTERS_DATABASE_ID;

  if (!databaseId) {
    throw new Error('NOTION_MONSTERS_DATABASE_ID is not defined');
  }

  return databaseId;
}

/**
 * Get the data_source_id from a database_id (v5 SDK requirement)
 * In the new API, databases are containers and data_sources are the actual tables
 */
async function getDataSourceId(notion: Client, databaseId: string): Promise<string> {
  // Check cache first
  const cached = dataSourceCache.get(databaseId);
  if (cached) {
    return cached;
  }

  // Fetch the database to get its data sources
  const database = await notion.databases.retrieve({ database_id: databaseId }) as any;

  // The data_sources array contains the actual data source IDs
  // For simple databases, there's typically one data source
  const dataSources = database.data_sources;
  if (!dataSources || dataSources.length === 0) {
    throw new Error(`No data sources found for database ${databaseId}`);
  }

  const dataSourceId = dataSources[0].id;
  dataSourceCache.set(databaseId, dataSourceId);

  return dataSourceId;
}

/**
 * Fetch all monsters from Notion database
 */
export async function fetchMonstersFromNotion(): Promise<NotionMonster[]> {
  try {
    const notion = getNotionClient();
    const databaseId = getDatabaseId();

    // v5 SDK: First get the data_source_id from the database
    const dataSourceId = await getDataSourceId(notion, databaseId);

    const monsters: NotionMonster[] = [];
    let hasMore = true;
    let startCursor: string | undefined;

    while (hasMore) {
      // v5 SDK: Use dataSources.query with data_source_id
      const response = await notion.dataSources.query({
        data_source_id: dataSourceId,
        start_cursor: startCursor,
      });

      monsters.push(...response.results);
      hasMore = response.has_more;
      startCursor = response.next_cursor ?? undefined;
    }

    return monsters;
  } catch (error) {
    console.error('Error fetching monsters from Notion:', error);
    throw error;
  }
}

/**
 * Helper function to extract text from Notion rich text property
 */
function extractText(richText: any[]): string {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map((rt) => rt.plain_text || '').join('');
}

/**
 * Helper function to extract number from Notion number property
 */
function extractNumber(numberProp: any): number | null {
  if (typeof numberProp === 'number') return numberProp;
  return null;
}

/**
 * Helper function to safely parse JSON from text
 */
function safeParseJSON(text: string, fallback: any = []): any {
  if (!text || text.trim() === '') return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

/**
 * Helper function to extract select property
 */
function extractSelect(selectProp: any): string {
  if (!selectProp || !selectProp.select) return '';
  return selectProp.select.name || '';
}

/**
 * Convert a Notion monster page to our Monster type
 */
export function mapNotionMonsterToDbMonster(notionMonster: any): Partial<Monster> {
  const props = notionMonster.properties;

  // Extract basic properties using actual French property names
  const name = extractText(props.Nom?.title || []);
  const armor_class = extractNumber(props.CA?.number);
  const hit_points = extractNumber(props.PV?.number);
  const speed = extractText(props.Vitesse?.rich_text || []);

  // Ability scores
  const strength = extractNumber(props.FOR?.number);
  const dexterity = extractNumber(props.DEX?.number);
  const constitution = extractNumber(props.CON?.number);
  const intelligence = extractNumber(props.INT?.number);
  const wisdom = extractNumber(props.SAG?.number);
  const charisma = extractNumber(props.CHAR?.number);

  // Ability modifiers (already calculated in Notion as formulas)
  const strength_mod = extractNumber(props['Modif. FOR']?.formula?.number);
  const dexterity_mod = extractNumber(props['Modif. DEX']?.formula?.number);
  const constitution_mod = extractNumber(props['Modif. CON']?.formula?.number);
  const intelligence_mod = extractNumber(props['Modif. INT']?.formula?.number);
  const wisdom_mod = extractNumber(props['Modif. SAG']?.formula?.number);
  const charisma_mod = extractNumber(props['Modif. CHAR']?.formula?.number);

  // Other properties
  const creature_type = extractSelect(props.Race) || extractText(props.Race?.rich_text || []);
  const size = extractSelect(props.Taille) || extractText(props.Taille?.rich_text || []);
  const challenge_rating_xp = extractNumber(props['Puissance (XP)']?.number);

  // Extract action and description text from rich_text fields
  const actionsText = extractText(props.Actions?.rich_text || []);
  const legendaryActionsText = extractText(props['Actions légendaires']?.rich_text || []);
  const descriptionText = extractText(props.Description?.rich_text || []);

  // Convert plain text to JSON structure or parse existing JSON
  const actions = actionsText
    ? (safeParseJSON(actionsText, null) || [{ name: 'Actions', description: actionsText }])
    : [];

  const legendary_actions = legendaryActionsText
    ? (safeParseJSON(legendaryActionsText, null) || [{ name: 'Actions légendaires', description: legendaryActionsText }])
    : [];

  const traits = descriptionText
    ? (safeParseJSON(descriptionText, null) || {
        skills: [],
        senses: [],
        languages: [],
        damage_resistances: [],
        damage_immunities: [],
        condition_immunities: [],
        special_abilities: descriptionText ? [{ name: 'Description', description: descriptionText }] : [],
      })
    : {
        skills: [],
        senses: [],
        languages: [],
        damage_resistances: [],
        damage_immunities: [],
        condition_immunities: [],
        special_abilities: [],
      };

  // Image URL from cover
  const image_url = notionMonster.cover?.external?.url || null;

  return {
    name,
    armor_class,
    hit_points,
    speed,
    strength,
    dexterity,
    constitution,
    intelligence,
    wisdom,
    charisma,
    strength_mod,
    dexterity_mod,
    constitution_mod,
    intelligence_mod,
    wisdom_mod,
    charisma_mod,
    creature_type,
    size,
    challenge_rating_xp,
    actions,
    legendary_actions,
    traits,
    image_url,
  };
}

/**
 * Fetch and map all monsters from Notion
 */
export async function getMonstersFromNotion(): Promise<Partial<Monster>[]> {
  const notionMonsters = await fetchMonstersFromNotion();
  return notionMonsters.map(mapNotionMonsterToDbMonster);
}

// ============================================
// CHARACTER FUNCTIONS
// ============================================

export interface NotionCharacter {
  id: string;
  name: string;
  class: string;
  level: number;
  current_hp: number;
  max_hp: number;
  ac: number;
  initiative: number;
  conditions: string[];
}

/**
 * Get characters database ID
 */
function getCharactersDatabaseId() {
  const databaseId = process.env.NOTION_CHARACTERS_DATABASE_ID;

  if (!databaseId) {
    throw new Error('NOTION_CHARACTERS_DATABASE_ID is not defined');
  }

  return databaseId;
}

/**
 * Fetch playable characters from Notion database (filtered by Joueur checkbox)
 */
export async function fetchPlayableCharactersFromNotion(): Promise<NotionCharacter[]> {
  try {
    const notion = getNotionClient();
    const databaseId = getCharactersDatabaseId();

    // v5 SDK: First get the data_source_id from the database
    const dataSourceId = await getDataSourceId(notion, databaseId);

    const characters: NotionCharacter[] = [];
    let hasMore = true;
    let startCursor: string | undefined;

    while (hasMore) {
      // v5 SDK: Use dataSources.query with data_source_id
      const response = await notion.dataSources.query({
        data_source_id: dataSourceId,
        filter: {
          property: 'Joueur',
          checkbox: {
            equals: true,
          },
        },
        start_cursor: startCursor,
      });

      // Map each result to our character format
      for (const page of response.results) {
        const character = mapNotionPageToCharacter(page);
        if (character) {
          characters.push(character);
        }
      }

      hasMore = response.has_more;
      startCursor = response.next_cursor ?? undefined;
    }

    return characters;
  } catch (error) {
    console.error('Error fetching characters from Notion:', error);
    throw error;
  }
}

/**
 * Helper function to extract multi_select values as comma-separated string
 */
function extractMultiSelect(multiSelectProp: any): string {
  if (!multiSelectProp || !multiSelectProp.multi_select) return '';
  return multiSelectProp.multi_select.map((item: any) => item.name).join(', ');
}

/**
 * Map a Notion page to our character format
 */
function mapNotionPageToCharacter(page: any): NotionCharacter | null {
  try {
    const props = page.properties;

    // Name is a title property
    const name = extractText(props.Name?.title || []);
    if (!name) return null; // Skip characters without a name

    // Class is a multi_select property called "Classe(s)"
    const characterClass = extractMultiSelect(props['Classe(s)']) || 'Inconnu';

    // Level is a number property
    const level = extractNumber(props.Level?.number) ?? 1;

    // HP: use PV Actuel if available, otherwise PV Max
    const maxHp = extractNumber(props['PV Max']?.number) ?? 10;
    const currentHp = extractNumber(props['PV Actuel']?.number) ?? maxHp;

    // AC is a number property
    const ac = extractNumber(props.CA?.number) ?? 10;

    return {
      id: page.id,
      name,
      class: characterClass,
      level,
      current_hp: currentHp,
      max_hp: maxHp,
      ac,
      initiative: 0,
      conditions: [],
    };
  } catch (error) {
    console.error('Error mapping Notion character:', error);
    return null;
  }
}
