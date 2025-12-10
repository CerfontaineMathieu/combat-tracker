import { NextResponse } from 'next/server';
import { upsertSpell, deleteSpellsByNotionId, getSpellCatalog } from '@/lib/db';
import { fetchSpellsFromNotion } from '@/lib/notion-spells';
import { buildSpellSyncPreview } from '@/lib/spell-comparison';
import type { CatalogSpellInput } from '@/lib/types';

interface ApplyRequest {
  // If provided, use these specific operations
  toAdd?: CatalogSpellInput[];
  toUpdate?: { updated: CatalogSpellInput }[];
  toDeleteNotionIds?: string[];
  // If true, apply all changes automatically (re-fetch and apply all)
  applyAll?: boolean;
}

export async function POST(request: Request) {
  try {
    const body: ApplyRequest = await request.json();

    let toAdd: CatalogSpellInput[] = [];
    let toUpdate: { updated: CatalogSpellInput }[] = [];
    let toDeleteNotionIds: string[] = [];

    if (body.applyAll) {
      // Re-fetch from Notion with full content
      const notionSpells = await fetchSpellsFromNotion(true);
      const dbSpells = await getSpellCatalog();
      const preview = buildSpellSyncPreview(notionSpells, dbSpells, false);

      toAdd = preview.toAdd;
      toUpdate = preview.toUpdate.map(item => ({ updated: item.updated }));
      toDeleteNotionIds = preview.toDelete.map(spell => spell.notion_id);
    } else {
      toAdd = body.toAdd || [];
      toUpdate = body.toUpdate || [];
      toDeleteNotionIds = body.toDeleteNotionIds || [];
    }

    let added = 0;
    let updated = 0;
    const errors: string[] = [];

    // Add new spells
    for (const spell of toAdd) {
      try {
        await upsertSpell(spell);
        added++;
      } catch (error) {
        errors.push(`Erreur ajout ${spell.name}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    }

    // Update existing spells
    for (const { updated: spell } of toUpdate) {
      try {
        await upsertSpell(spell);
        updated++;
      } catch (error) {
        errors.push(`Erreur mise a jour ${spell.name}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    }

    // Delete removed spells
    const deleteResult = await deleteSpellsByNotionId(toDeleteNotionIds);

    return NextResponse.json({
      success: true,
      added,
      updated,
      deleted: deleteResult.deleted,
      errors: [...errors, ...deleteResult.errors],
    });
  } catch (error) {
    console.error('Error applying spell sync:', error);
    return NextResponse.json(
      { success: false, error: 'Echec de la synchronisation des sorts' },
      { status: 500 }
    );
  }
}
