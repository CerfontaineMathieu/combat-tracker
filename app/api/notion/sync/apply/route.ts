import { NextResponse } from 'next/server';
import { fetchMonstersFromNotion, mapNotionMonsterToDbMonster } from '@/lib/notion';
import {
  updateMonsterFields,
  deleteMonstersById,
  upsertMonster,
  type Monster
} from '@/lib/db';

interface ApplyRequest {
  operations: {
    add: { name: string; notionId: string }[];
    update: {
      name: string;
      dbId: number;
      fields: (keyof Monster)[];
      notionId: string;
    }[];
    delete: number[];
  };
}

export async function POST(request: Request) {
  try {
    const body: ApplyRequest = await request.json();
    console.log('Applying sync operations:', {
      add: body.operations.add.length,
      update: body.operations.update.length,
      delete: body.operations.delete.length
    });

    // Re-fetch Notion data to ensure consistency (avoid stale preview data)
    const notionPages = await fetchMonstersFromNotion();
    const notionMap = new Map(
      notionPages.map(page => [
        page.id,
        { data: mapNotionMonsterToDbMonster(page), notionId: page.id }
      ])
    );

    const results = {
      added: 0,
      updated: 0,
      deleted: 0,
      errors: [] as string[]
    };

    // Phase 1: Deletions
    if (body.operations.delete.length > 0) {
      const deleteResult = await deleteMonstersById(body.operations.delete);
      results.deleted = deleteResult.deleted;
      results.errors.push(...deleteResult.errors);
    }

    // Phase 2: Updates (preserving ai_generated)
    for (const update of body.operations.update) {
      try {
        const notionData = notionMap.get(update.notionId);
        if (!notionData) {
          results.errors.push(`Monstre "${update.name}" introuvable dans Notion`);
          continue;
        }

        // Build update object with only selected fields
        const fieldsToUpdate: Partial<Monster> = {};
        for (const field of update.fields) {
          fieldsToUpdate[field] = notionData.data[field] as any;
        }

        // Always set notion_id
        fieldsToUpdate.notion_id = update.notionId;

        await updateMonsterFields(update.dbId, fieldsToUpdate);
        results.updated++;
      } catch (error) {
        results.errors.push(
          `Échec de la mise à jour de "${update.name}": ${error instanceof Error ? error.message : 'Erreur inconnue'}`
        );
      }
    }

    // Phase 3: Additions
    for (const add of body.operations.add) {
      try {
        const notionData = notionMap.get(add.notionId);
        if (!notionData) {
          results.errors.push(`Monstre "${add.name}" introuvable dans Notion`);
          continue;
        }

        await upsertMonster({
          ...(notionData.data as any),
          notion_id: add.notionId
        });
        results.added++;
      } catch (error) {
        results.errors.push(
          `Échec de l'ajout de "${add.name}": ${error instanceof Error ? error.message : 'Erreur inconnue'}`
        );
      }
    }

    console.log('Sync apply completed:', results);

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error applying sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: 'Échec de l\'application de la synchronisation',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
