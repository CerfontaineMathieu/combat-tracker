import { NextResponse } from 'next/server';
import { fetchMonstersFromNotion, mapNotionMonsterToDbMonster } from '@/lib/notion';
import { getMonsters } from '@/lib/db';
import { buildSyncPreview, type SyncPreviewItem } from '@/lib/monster-comparison';

export async function POST(request: Request) {
  try {
    console.log('Starting Notion sync preview...');

    // Fetch from both sources in parallel
    const [notionPages, dbMonsters] = await Promise.all([
      fetchMonstersFromNotion(), // Raw Notion pages with IDs
      getMonsters()
    ]);

    console.log(`Fetched ${notionPages.length} monsters from Notion, ${dbMonsters.length} from DB`);

    // Map Notion pages to monster data with IDs
    const notionMonsters = notionPages.map(page => ({
      data: mapNotionMonsterToDbMonster(page),
      notionId: page.id
    }));

    // Build preview comparison
    const previewItems = buildSyncPreview(dbMonsters, notionMonsters);

    // Calculate summary
    const summary = {
      toAdd: previewItems.filter(i => i.action === 'add').length,
      toUpdate: previewItems.filter(i => i.action === 'update').length,
      toDelete: previewItems.filter(i => i.action === 'delete').length,
      unchanged: previewItems.filter(i => i.action === 'no_change').length,
      total: notionMonsters.length
    };

    console.log('Preview summary:', summary);

    return NextResponse.json({
      success: true,
      summary,
      items: previewItems
    });
  } catch (error) {
    console.error('Error generating sync preview:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: 'Échec de la génération de l\'aperçu',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
