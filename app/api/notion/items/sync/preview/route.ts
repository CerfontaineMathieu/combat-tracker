import { NextResponse } from 'next/server';
import { fetchAllItemsFromNotion } from '@/lib/notion-items';
import { getCatalogItems } from '@/lib/db';
import { buildItemSyncPreview } from '@/lib/item-comparison';

export async function POST() {
  try {
    console.log('Starting item sync preview...');

    // Fetch from both sources in parallel
    // Preview uses fetchContent=false for speed - content fetched during apply
    const [notionItems, dbItems] = await Promise.all([
      fetchAllItemsFromNotion(false),
      getCatalogItems(),
    ]);

    console.log(`Fetched ${notionItems.length} items from Notion, ${dbItems.length} from DB`);

    // Build preview comparison
    // Pass skipNullDescription=true since we're not fetching content during preview
    // This prevents false positives where DB has content-fetched descriptions
    const preview = buildItemSyncPreview(notionItems, dbItems, true);

    // Calculate summary
    const summary = {
      toAdd: preview.toAdd.length,
      toUpdate: preview.toUpdate.length,
      toDelete: preview.toDelete.length,
      unchanged: preview.unchanged,
      total: notionItems.length,
    };

    console.log('Preview summary:', summary);

    return NextResponse.json({
      success: true,
      summary,
      preview,
    });
  } catch (error) {
    console.error('Error generating item sync preview:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: "Échec de la génération de l'aperçu",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
