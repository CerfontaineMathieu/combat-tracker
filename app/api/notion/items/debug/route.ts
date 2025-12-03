import { NextResponse } from 'next/server';
import { debugGetItemProperties } from '@/lib/notion-items';
import { getCatalogItems } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  try {
    // Get items from DB
    const dbItems = await getCatalogItems();

    // Find item by name (case insensitive)
    const item = name
      ? dbItems.find(i => i.name.toLowerCase().includes(name.toLowerCase()))
      : dbItems.find(i => !i.description); // First item without description

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Get properties from Notion
    const properties = await debugGetItemProperties(item.notion_id);

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        name: item.name,
        notion_id: item.notion_id,
        category: item.category,
        subcategory: item.subcategory,
        description: item.description,
        rarity: item.rarity,
      },
      notionProperties: properties,
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
