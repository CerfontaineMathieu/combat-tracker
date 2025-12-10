import { NextResponse } from 'next/server';
import { getPreparedSpells, addPreparedSpell, removePreparedSpell, getSpellById } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params;
    const { searchParams } = new URL(request.url);
    const campaignId = parseInt(searchParams.get('campaignId') || '1', 10);

    const preparedSpells = await getPreparedSpells(characterId, campaignId);
    return NextResponse.json({ success: true, preparedSpells });
  } catch (error) {
    console.error('Error fetching prepared spells:', error);
    return NextResponse.json(
      { success: false, error: 'Echec du chargement des sorts prepares' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params;
    const { spellId, campaignId = 1, isAlwaysPrepared = false } = await request.json();

    if (!spellId) {
      return NextResponse.json(
        { success: false, error: 'spellId est requis' },
        { status: 400 }
      );
    }

    // Verify spell exists
    const spell = await getSpellById(spellId);
    if (!spell) {
      return NextResponse.json(
        { success: false, error: 'Sort non trouve' },
        { status: 404 }
      );
    }

    const preparedSpell = await addPreparedSpell(
      characterId,
      spellId,
      campaignId,
      isAlwaysPrepared
    );

    return NextResponse.json({
      success: true,
      preparedSpell: { ...preparedSpell, spell },
    });
  } catch (error) {
    console.error('Error adding prepared spell:', error);
    return NextResponse.json(
      { success: false, error: "Echec de l'ajout du sort" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params;
    const { spellId, campaignId = 1 } = await request.json();

    if (!spellId) {
      return NextResponse.json(
        { success: false, error: 'spellId est requis' },
        { status: 400 }
      );
    }

    const removed = await removePreparedSpell(characterId, spellId, campaignId);

    return NextResponse.json({ success: true, removed });
  } catch (error) {
    console.error('Error removing prepared spell:', error);
    return NextResponse.json(
      { success: false, error: 'Echec de la suppression du sort' },
      { status: 500 }
    );
  }
}
