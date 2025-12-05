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
 * D&D action name pattern - matches things like:
 * - "Morsure"
 * - "Attaques multiples"
 * - "Toile d'araignée (Recharge 5-6)"
 * - "Souffle de feu (Recharge 5–6)"
 *
 * Must be at least 4 characters to avoid false positives like "Au c."
 */
const ACTION_NAME_PATTERN = /^([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇ][a-zàâäéèêëïîôùûüÿœæç]{2,}(?:[\s'''-]+[a-zàâäéèêëïîôùûüÿœæçA-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇ]+)*(?:\s*\([^)]+\))?)\.\s+/;

/**
 * Check if a line looks like it starts a new ability/action
 * D&D ability names are typically short (1-4 words), capitalized, followed by ". "
 */
function looksLikeNewAbility(line: string): boolean {
  return ACTION_NAME_PATTERN.test(line);
}

/**
 * Extract action name from the start of a line
 * Returns [name, rest] or null if no match
 */
function extractActionName(text: string): [string, string] | null {
  const match = text.match(ACTION_NAME_PATTERN);
  if (!match) return null;

  const name = match[1].trim();
  const rest = text.substring(match[0].length);
  return [name, rest];
}

/**
 * Check if a potential action name looks like a weapon/sub-attack
 * Weapon names are short (1-2 words) and their descriptions start with attack patterns
 */
function isWeaponSubAttack(name: string, description: string): boolean {
  const wordCount = name.split(/\s+/).length;
  if (wordCount > 2) return false;

  // Check if description starts with attack patterns
  const attackPatterns = [
    /^Attaque\s+(au\s+corps\s+à\s+corps|à\s+distance)/i,
    /^(Melee|Ranged)\s+(Weapon|Spell)\s+Attack/i,
  ];

  return attackPatterns.some(pattern => pattern.test(description));
}

/**
 * Split continuous text into individual actions by detecting action name patterns
 * Handles text where actions are not separated by newlines
 * Merges weapon sub-attacks into their parent action
 */
function splitActionsFromContinuousText(text: string): Array<{ name: string; description: string }> {
  const result: Array<{ name: string; description: string }> = [];

  // Pattern to find action names within text (not just at start)
  // Look for: period + space(s) + Capital letter word(s) + optional (Recharge X-Y) + period + space
  // Name must be at least 4 characters to avoid false positives
  const splitPattern = /\.\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇ][a-zàâäéèêëïîôùûüÿœæç]{2,}(?:[\s'''-]+[a-zàâäéèêëïîôùûüÿœæçA-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇ]+)*(?:\s*\([^)]+\))?)\.\s+/g;

  // First, try to extract the first action
  const firstMatch = extractActionName(text);
  if (!firstMatch) {
    // No action pattern found, return as single item
    return [{ name: text.substring(0, 50).trim(), description: text }];
  }

  let [firstName, remaining] = firstMatch;
  const segments: Array<{ name: string; startDesc: number }> = [{ name: firstName, startDesc: 0 }];

  // Find all subsequent action patterns in the remaining text
  let match;
  const searchText = '. ' + remaining; // Add prefix to match pattern at start

  // Reset pattern
  splitPattern.lastIndex = 0;

  while ((match = splitPattern.exec(searchText)) !== null) {
    const actionName = match[1];
    segments.push({ name: actionName, startDesc: match.index + match[0].length - 2 }); // -2 for '. ' prefix
  }

  // Now build the result by extracting descriptions between actions
  // But merge weapon sub-attacks into their parent action
  for (let i = 0; i < segments.length; i++) {
    const currentName = segments[i].name;
    let description: string;

    if (i === 0) {
      // First action: description is from start until next action (or end)
      if (segments.length > 1) {
        // Find where the next action name starts in 'remaining'
        const nextActionStart = remaining.indexOf(segments[1].name + '.');
        description = nextActionStart > 0 ? remaining.substring(0, nextActionStart).trim() : remaining;
      } else {
        description = remaining;
      }
    } else {
      // Subsequent actions: need to find their description in the original remaining text
      const currentStart = remaining.indexOf(segments[i].name + '.');
      if (currentStart === -1) continue;

      const descStart = currentStart + segments[i].name.length + 2; // +2 for '. '

      if (i < segments.length - 1) {
        const nextStart = remaining.indexOf(segments[i + 1].name + '.', descStart);
        description = nextStart > 0 ? remaining.substring(descStart, nextStart).trim() : remaining.substring(descStart).trim();
      } else {
        description = remaining.substring(descStart).trim();
      }
    }

    // Clean up description - remove trailing periods if doubled
    description = description.replace(/\.{2,}\s*$/, '.').trim();

    // Check if this is a weapon sub-attack that should be merged with previous action
    if (result.length > 0 && isWeaponSubAttack(currentName, description)) {
      // Merge with previous action
      result[result.length - 1].description += ` **${currentName}.** ${description}`;
    } else {
      result.push({ name: currentName, description });
    }
  }

  return result;
}

/**
 * Parse plain text actions into structured array
 * Uses smart detection to identify new abilities vs continuation lines
 * Falls back to continuous text parsing if newline-based parsing yields poor results
 */
function parseActionsText(actionsText: string): Array<{ name: string; description: string }> {
  if (!actionsText || actionsText.trim() === '') return [];

  // Normalize text - join lines first, then try to parse
  const normalizedText = actionsText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

  // Use continuous text parser which handles both cases
  return splitActionsFromContinuousText(normalizedText);
}

/**
 * Parse plain text legendary actions into structured array with cost extraction
 * Uses continuous text parsing and extracts cost from action names
 */
function parseLegendaryActionsText(actionsText: string): Array<{ name: string; description: string; cost: number }> {
  if (!actionsText || actionsText.trim() === '') return [];

  // Normalize and parse as continuous text
  const normalizedText = actionsText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  const actions = splitActionsFromContinuousText(normalizedText);

  // Add cost extraction
  return actions.map((action) => {
    let name = action.name;
    let cost = 1;

    // Extract cost from pattern like "(coûte 2 actions)"
    const costMatch = name.match(/\(coûte? (\d+) actions?\)/);
    if (costMatch) {
      cost = parseInt(costMatch[1], 10);
      name = name.replace(/\s*\(coûte? \d+ actions?\)/, '').trim();
    }

    return { name, description: action.description, cost };
  });
}

/**
 * Parse plain text description/traits into structured object
 * Extracts structured fields (Compétences, Sens, Langues, etc.) and special abilities
 */
function parseTraitsText(descriptionText: string): {
  skills: string[];
  senses: string[];
  languages: string[];
  damage_resistances: string[];
  damage_immunities: string[];
  condition_immunities: string[];
  special_abilities: Array<{ name: string; description: string }>;
} {
  const traits = {
    skills: [] as string[],
    senses: [] as string[],
    languages: [] as string[],
    damage_resistances: [] as string[],
    damage_immunities: [] as string[],
    condition_immunities: [] as string[],
    special_abilities: [] as Array<{ name: string; description: string }>,
  };

  if (!descriptionText || descriptionText.trim() === '') return traits;

  // Normalize text
  let text = descriptionText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

  // Extract structured fields using French keywords
  // Order matters - extract from most specific to least specific

  // Jets de sauvegarde (Saving Throws) - extract first as it often appears before skills
  const savesMatch = text.match(/Jets?\s+de\s+sauvegarde\s+([A-Za-zÀ-ÿ]+\s*[+-]?\d+(?:,\s*[A-Za-zÀ-ÿ]+\s*[+-]?\d+)*)/i);
  if (savesMatch) {
    text = text.replace(savesMatch[0], ' ');
  }

  // Compétences (Skills)
  const skillsMatch = text.match(/Compétences?\s+([^.]*?)(?=\s*(?:Résistances?|Immunités?|Vulnérabilités?|Sens|Langues|Jets?\s+de|[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇ][a-zàâäéèêëïîôùûüÿœæç]*\.|$))/i);
  if (skillsMatch) {
    traits.skills = skillsMatch[1].split(/,\s*/).map(s => s.trim()).filter(Boolean);
    text = text.replace(skillsMatch[0], ' ');
  }

  // Résistances aux dégâts (Damage Resistances)
  const dmgResMatch = text.match(/Résistances?\s+aux\s+dégâts?\s+([^.]*?)(?=\s*(?:Immunités?|Vulnérabilités?|Sens|Langues|Compétences?|[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇ][a-zàâäéèêëïîôùûüÿœæç]*\.|$))/i);
  if (dmgResMatch) {
    traits.damage_resistances = dmgResMatch[1].split(/,\s*/).map(s => s.trim()).filter(Boolean);
    text = text.replace(dmgResMatch[0], ' ');
  }

  // Immunités aux dégâts (Damage Immunities)
  const dmgImmMatch = text.match(/Immunités?\s+aux\s+dégâts?\s+([^.]*?)(?=\s*(?:Immunités?\s+aux\s+états?|Résistances?|Vulnérabilités?|Sens|Langues|Compétences?|[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇ][a-zàâäéèêëïîôùûüÿœæç]*\.|$))/i);
  if (dmgImmMatch) {
    traits.damage_immunities = dmgImmMatch[1].split(/,\s*/).map(s => s.trim()).filter(Boolean);
    text = text.replace(dmgImmMatch[0], ' ');
  }

  // Immunités aux états (Condition Immunities)
  const condImmMatch = text.match(/Immunités?\s+aux\s+états?\s+([^.]*?)(?=\s*(?:Résistances?|Vulnérabilités?|Sens|Langues|Compétences?|[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇ][a-zàâäéèêëïîôùûüÿœæç]*\.|$))/i);
  if (condImmMatch) {
    traits.condition_immunities = condImmMatch[1].split(/,\s*/).map(s => s.trim()).filter(Boolean);
    text = text.replace(condImmMatch[0], ' ');
  }

  // Sens (Senses)
  const sensesMatch = text.match(/Sens\s+([^.]*?)(?=\s*(?:Langues|Compétences?|Résistances?|Immunités?|[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇ][a-zàâäéèêëïîôùûüÿœæç]*\.|$))/i);
  if (sensesMatch) {
    traits.senses = sensesMatch[1].split(/,\s*/).map(s => s.trim()).filter(Boolean);
    text = text.replace(sensesMatch[0], ' ');
  }

  // Langues (Languages)
  const langMatch = text.match(/Langues?\s+([^.]*?)(?=\s*(?:Sens|Compétences?|Résistances?|Immunités?|[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇ][a-zàâäéèêëïîôùûüÿœæç]*\.|$))/i);
  if (langMatch) {
    traits.languages = [langMatch[1].trim()];
    text = text.replace(langMatch[0], ' ');
  }

  // Clean up remaining text and parse as special abilities
  text = text.replace(/\s+/g, ' ').trim();
  if (text) {
    traits.special_abilities = splitActionsFromContinuousText(text);
  }

  return traits;
}

/**
 * Helper function to extract select property
 */
function extractSelect(selectProp: any): string {
  if (!selectProp || !selectProp.select) return '';
  return selectProp.select.name || '';
}

/**
 * Parse comma-separated text into array of strings
 */
function parseCommaSeparated(text: string): string[] {
  if (!text || text.trim() === '') return [];
  return text.split(',').map(s => s.trim()).filter(Boolean);
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
  const challenge_rating_xp = extractNumber(props.XP?.number);

  // Read separate trait columns (comma-separated text)
  const skillsText = extractText(props.Compétences?.rich_text || []);
  const sensesText = extractText(props.Sens?.rich_text || []);
  const languagesText = extractText(props.Langues?.rich_text || []);
  const vulnerabilitiesText = extractText(props.Vulnérabilités?.rich_text || []);
  const resistancesText = extractText(props.Résistances?.rich_text || []);
  const immunitiesDmgText = extractText(props['Immunités Dégâts']?.rich_text || []);
  const immunitiesCondText = extractText(props['Immunités États']?.rich_text || []);

  // Description (flavor text)
  const description = extractText(props.Description?.rich_text || []) || null;

  // Read JSON fields for complex nested data
  const actionsText = extractText(props.Actions?.rich_text || []);
  const bonusActionsText = extractText(props['Actions Bonus']?.rich_text || []);
  const reactionsText = extractText(props.Réactions?.rich_text || []);
  const legendaryActionsText = extractText(props['Actions Légendaires']?.rich_text || []);
  const specialAbilitiesText = extractText(props['Capacités Spéciales']?.rich_text || []);

  // Parse JSON for actions (with fallback to text parsing for backwards compatibility)
  const actions = actionsText
    ? (safeParseJSON(actionsText, null) || parseActionsText(actionsText))
    : [];

  const bonus_actions = bonusActionsText
    ? (safeParseJSON(bonusActionsText, null) || parseActionsText(bonusActionsText))
    : [];

  const reactions = reactionsText
    ? (safeParseJSON(reactionsText, null) || parseActionsText(reactionsText))
    : [];

  const legendary_actions = legendaryActionsText
    ? (safeParseJSON(legendaryActionsText, null) || parseLegendaryActionsText(legendaryActionsText))
    : [];

  const special_abilities = specialAbilitiesText
    ? (safeParseJSON(specialAbilitiesText, null) || parseActionsText(specialAbilitiesText))
    : [];

  // Build traits object from separate columns
  const traits = {
    skills: parseCommaSeparated(skillsText),
    senses: parseCommaSeparated(sensesText),
    languages: parseCommaSeparated(languagesText),
    damage_vulnerabilities: parseCommaSeparated(vulnerabilitiesText),
    damage_resistances: parseCommaSeparated(resistancesText),
    damage_immunities: parseCommaSeparated(immunitiesDmgText),
    condition_immunities: parseCommaSeparated(immunitiesCondText),
    special_abilities,
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
    bonus_actions,
    reactions,
    legendary_actions,
    traits,
    description,
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
  // Combat stats
  passive_perception: number | null;
  strength: number | null;
  dexterity: number | null;
  constitution: number | null;
  intelligence: number | null;
  wisdom: number | null;
  charisma: number | null;
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

    // Passive Perception - try both "PP" and "Perception Passive" property names
    const passivePerception = extractNumber(props.PP?.number) ?? extractNumber(props['Perception Passive']?.number);

    // Ability scores (same property names as monsters)
    const strength = extractNumber(props.FOR?.number);
    const dexterity = extractNumber(props.DEX?.number);
    const constitution = extractNumber(props.CON?.number);
    const intelligence = extractNumber(props.INT?.number);
    const wisdom = extractNumber(props.SAG?.number);
    // Try both "CHAR" and "CHA" for charisma
    const charisma = extractNumber(props.CHAR?.number) ?? extractNumber(props.CHA?.number);

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
      passive_perception: passivePerception,
      strength,
      dexterity,
      constitution,
      intelligence,
      wisdom,
      charisma,
    };
  } catch (error) {
    console.error('Error mapping Notion character:', error);
    return null;
  }
}
