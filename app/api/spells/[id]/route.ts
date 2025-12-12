import { NextResponse } from 'next/server';
import { getSpellById } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const spellId = parseInt(id, 10);

    if (isNaN(spellId)) {
      return NextResponse.json(
        { success: false, error: 'ID de sort invalide' },
        { status: 400 }
      );
    }

    const spell = await getSpellById(spellId);

    if (!spell) {
      return NextResponse.json(
        { success: false, error: 'Sort non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, spell });
  } catch (error) {
    console.error('Error fetching spell:', error);
    return NextResponse.json(
      { success: false, error: 'Echec du chargement du sort' },
      { status: 500 }
    );
  }
}
