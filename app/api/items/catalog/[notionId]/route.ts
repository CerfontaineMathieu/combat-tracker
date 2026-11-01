import { NextResponse } from 'next/server';
import { getCatalogItemByNotionId } from '@/lib/db';

// Fresh catalog data for an inventory item (description, stats synced from Notion)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ notionId: string }> }
) {
  try {
    const { notionId } = await params;
    const item = await getCatalogItemByNotionId(notionId);

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Objet non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('Error fetching catalog item:', error);
    return NextResponse.json(
      { success: false, error: "Echec du chargement de l'objet" },
      { status: 500 }
    );
  }
}
