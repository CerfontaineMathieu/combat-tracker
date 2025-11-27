import { Client } from '@notionhq/client';
import type { Monster } from './db';

export interface NotionMonster {
  id: string;
  properties: Record<string, any>;
}

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
 * Fetch all monsters from Notion database
 */
export async function fetchMonstersFromNotion(): Promise<NotionMonster[]> {
  try {
    const notion = getNotionClient();
    const databaseId = getDatabaseId();

    const monsters: NotionMonster[] = [];
    let hasMore = true;
    let startCursor: string | undefined;

    while (hasMore) {
      const response = await notion.databases.query({
        database_id: databaseId,
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
