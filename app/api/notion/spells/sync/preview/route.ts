import { NextResponse } from 'next/server';
import { fetchSpellsFromNotion, isSpellsDatabaseConfigured } from '@/lib/notion-spells';
import { getSpellCatalog } from '@/lib/db';
import { buildSpellSyncPreview } from '@/lib/spell-comparison';

export async function POST() {
  try {
    if (!isSpellsDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'NOTION_SPELLS_DATABASE_ID non configure' },
        { status: 400 }
      );
    }

    // Fetch spells from Notion (without content for faster preview)
    const notionSpells = await fetchSpellsFromNotion(false);

    // Get current spells from database
    const dbSpells = await getSpellCatalog();

    // Build sync preview (skip null descriptions in comparison)
    const preview = buildSpellSyncPreview(notionSpells, dbSpells, true);

    return NextResponse.json({
      success: true,
      summary: {
        toAdd: preview.toAdd.length,
        toUpdate: preview.toUpdate.length,
        toDelete: preview.toDelete.length,
        unchanged: preview.unchanged,
        total: notionSpells.length,
      },
      preview,
    });
  } catch (error) {
    console.error('Error generating spell sync preview:', error);
    return NextResponse.json(
      { success: false, error: "Echec de la generation de l'apercu des sorts" },
      { status: 500 }
    );
  }
}
