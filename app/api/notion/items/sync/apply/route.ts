import { NextResponse } from 'next/server';
import { fetchAllItemsFromNotion } from '@/lib/notion-items';
import {
  upsertCatalogItem,
  deleteCatalogItemsByNotionId,
} from '@/lib/db';
import type { ItemSyncResult } from '@/lib/types';

interface ApplyRequest {
  operations: {
    add: string[]; // notion_ids to add
    update: string[]; // notion_ids to update
    delete: string[]; // notion_ids to delete
  };
}

export async function POST(request: Request) {
  try {
    const body: ApplyRequest = await request.json();
    console.log('Applying item sync operations:', {
      add: body.operations.add.length,
      update: body.operations.update.length,
      delete: body.operations.delete.length,
    });

    // Re-fetch Notion data to ensure consistency
    const notionItems = await fetchAllItemsFromNotion();
    const notionMap = new Map(
      notionItems.map(item => [item.notion_id, item])
    );

    const results: ItemSyncResult = {
      success: true,
      added: 0,
      updated: 0,
      deleted: 0,
      errors: [],
    };

    // Phase 1: Deletions
    if (body.operations.delete.length > 0) {
      const deleteResult = await deleteCatalogItemsByNotionId(body.operations.delete);
      results.deleted = deleteResult.deleted;
      results.errors.push(...deleteResult.errors);
    }

    // Phase 2: Updates
    for (const notionId of body.operations.update) {
      try {
        const notionItem = notionMap.get(notionId);
        if (!notionItem) {
          results.errors.push(`Item avec notion_id "${notionId}" introuvable dans Notion`);
          continue;
        }

        await upsertCatalogItem(notionItem);
        results.updated++;
      } catch (error) {
        results.errors.push(
          `Échec de la mise à jour de "${notionId}": ${error instanceof Error ? error.message : 'Erreur inconnue'}`
        );
      }
    }

    // Phase 3: Additions
    for (const notionId of body.operations.add) {
      try {
        const notionItem = notionMap.get(notionId);
        if (!notionItem) {
          results.errors.push(`Item avec notion_id "${notionId}" introuvable dans Notion`);
          continue;
        }

        await upsertCatalogItem(notionItem);
        results.added++;
      } catch (error) {
        results.errors.push(
          `Échec de l'ajout de "${notionId}": ${error instanceof Error ? error.message : 'Erreur inconnue'}`
        );
      }
    }

    console.log('Item sync apply completed:', results);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error applying item sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        added: 0,
        updated: 0,
        deleted: 0,
        errors: [`Échec de l'application: ${errorMessage}`],
      } as ItemSyncResult,
      { status: 500 }
    );
  }
}
