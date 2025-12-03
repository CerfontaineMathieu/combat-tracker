import { NextResponse } from 'next/server';
import { searchCatalogItems, getCatalogItems, getCatalogItemsByCategory } from '@/lib/db';
import type { ItemCategory } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') as ItemCategory | null;

    let items;

    if (query) {
      // Search with query
      items = await searchCatalogItems(query, category || undefined);
    } else if (category) {
      // Filter by category only
      items = await getCatalogItemsByCategory(category);
    } else {
      // Return all items
      items = await getCatalogItems();
    }

    return NextResponse.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error('Error searching catalog items:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: 'Échec de la recherche',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
