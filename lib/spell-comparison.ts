import type { CatalogSpell, CatalogSpellInput, SpellSyncPreview } from './types';

/**
 * Compare two spells and return a list of changed fields
 *
 * @param existing - Spell from database
 * @param updated - Spell from Notion
 * @param skipNullDescription - If true, don't flag description as changed when
 *                              Notion has null description (used during preview
 *                              when content isn't fetched yet)
 */
export function compareSpells(
  existing: CatalogSpell,
  updated: CatalogSpellInput,
  skipNullDescription: boolean = false
): string[] {
  const changes: string[] = [];

  if (existing.name !== updated.name) {
    changes.push('name');
  }
  if (existing.level !== updated.level) {
    changes.push('level');
  }
  if (existing.school !== updated.school) {
    changes.push('school');
  }
  if (existing.casting_time !== updated.casting_time) {
    changes.push('casting_time');
  }
  if (existing.range !== updated.range) {
    changes.push('range');
  }
  if (existing.duration !== updated.duration) {
    changes.push('duration');
  }
  if (existing.components !== updated.components) {
    changes.push('components');
  }
  if (existing.material_details !== updated.material_details) {
    changes.push('material_details');
  }
  if (existing.concentration !== updated.concentration) {
    changes.push('concentration');
  }

  // Description comparison:
  // - If skipNullDescription is true and updated.description is null, don't flag as changed
  //   (because we didn't fetch page content during preview)
  // - Otherwise, compare normally
  if (skipNullDescription) {
    if (updated.description !== null && existing.description !== updated.description) {
      changes.push('description');
    }
  } else {
    if (existing.description !== updated.description) {
      changes.push('description');
    }
  }

  if (existing.higher_levels !== updated.higher_levels) {
    changes.push('higher_levels');
  }

  if (existing.saving_throw !== updated.saving_throw) {
    changes.push('saving_throw');
  }

  // Compare classes array (sorted for consistent comparison)
  const existingClasses = JSON.stringify([...(existing.classes || [])].sort());
  const updatedClasses = JSON.stringify([...(updated.classes || [])].sort());
  if (existingClasses !== updatedClasses) {
    changes.push('classes');
  }

  return changes;
}

/**
 * Build a sync preview comparing Notion spells with database spells
 *
 * @param notionSpells - Spells fetched from Notion
 * @param dbSpells - Spells from local database
 * @param skipNullDescription - If true, don't flag spells as changed when
 *                              Notion description is null (preview mode)
 */
export function buildSpellSyncPreview(
  notionSpells: CatalogSpellInput[],
  dbSpells: CatalogSpell[],
  skipNullDescription: boolean = false
): SpellSyncPreview {
  // Create a map of existing spells by notion_id for quick lookup
  const dbSpellsByNotionId = new Map<string, CatalogSpell>();
  for (const spell of dbSpells) {
    dbSpellsByNotionId.set(spell.notion_id, spell);
  }

  // Track which notion_ids are in the new data
  const notionIds = new Set<string>();

  const toAdd: CatalogSpellInput[] = [];
  const toUpdate: { existing: CatalogSpell; updated: CatalogSpellInput; changes: string[] }[] = [];
  let unchanged = 0;

  // Process each Notion spell
  for (const notionSpell of notionSpells) {
    notionIds.add(notionSpell.notion_id);

    const existingSpell = dbSpellsByNotionId.get(notionSpell.notion_id);

    if (!existingSpell) {
      // New spell to add
      toAdd.push(notionSpell);
    } else {
      // Check if spell has changed (pass skipNullDescription flag)
      const changes = compareSpells(existingSpell, notionSpell, skipNullDescription);
      if (changes.length > 0) {
        toUpdate.push({
          existing: existingSpell,
          updated: notionSpell,
          changes,
        });
      } else {
        unchanged++;
      }
    }
  }

  // Find spells to delete (in DB but not in Notion anymore)
  const toDelete: CatalogSpell[] = [];
  for (const dbSpell of dbSpells) {
    if (!notionIds.has(dbSpell.notion_id)) {
      toDelete.push(dbSpell);
    }
  }

  return {
    toAdd,
    toUpdate,
    toDelete,
    unchanged,
  };
}

/**
 * Get a human-readable summary of changes (French)
 */
export function getSpellChangesSummary(changes: string[]): string {
  const fieldLabels: Record<string, string> = {
    name: 'Nom',
    level: 'Niveau',
    school: 'École de magie',
    classes: 'Classes',
    casting_time: "Temps d'incantation",
    range: 'Portée',
    duration: 'Durée',
    components: 'Composantes',
    material_details: 'Matériel détaillé',
    concentration: 'Concentration',
    description: 'Description',
    higher_levels: 'Niveaux supérieurs',
    saving_throw: 'Jet de sauvegarde',
  };

  return changes.map(field => fieldLabels[field] || field).join(', ');
}

/**
 * Get spell level label in French
 */
export function getSpellLevelLabel(level: number): string {
  if (level === 0) return 'Tour de magie';
  return `Niveau ${level}`;
}
