import { NextResponse } from 'next/server';
import { fetchPageContentById } from '@/lib/notion-items';
import { getCatalogItems, updateCatalogItemDescription } from '@/lib/db';

/**
 * Refresh descriptions for items that are missing them
 * This fetches page content from Notion for items without descriptions
 */
export async function POST() {
  try {
    console.log('Starting description refresh...');

    // Get all items from DB that are missing descriptions
    const dbItems = await getCatalogItems();
    const itemsWithoutDesc = dbItems.filter(item => !item.description);

    console.log(`Found ${itemsWithoutDesc.length} items without descriptions`);

    if (itemsWithoutDesc.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        message: 'Tous les items ont déjà une description',
      });
    }

    let updated = 0;
    const errors: string[] = [];

    // Fetch content for each item (in batches to avoid overwhelming the API)
    const batchSize = 10;
    for (let i = 0; i < itemsWithoutDesc.length; i += batchSize) {
      const batch = itemsWithoutDesc.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (item) => {
          const content = await fetchPageContentById(item.notion_id);
          if (content) {
            await updateCatalogItemDescription(item.notion_id, content);
            return { success: true, name: item.name };
          }
          return { success: false, name: item.name, reason: 'No content found' };
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.success) {
          updated++;
        } else if (result.status === 'rejected') {
          errors.push(result.reason?.message || 'Unknown error');
        }
      }
    }

    console.log(`Description refresh completed: ${updated} items updated`);

    return NextResponse.json({
      success: true,
      updated,
      total: itemsWithoutDesc.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error refreshing descriptions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: 'Échec du rafraîchissement des descriptions',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
