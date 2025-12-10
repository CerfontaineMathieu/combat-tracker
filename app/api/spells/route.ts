import { NextResponse } from 'next/server';
import { getSpellCatalog } from '@/lib/db';

export async function GET() {
  try {
    const spells = await getSpellCatalog();
    return NextResponse.json({ success: true, spells });
  } catch (error) {
    console.error('Error fetching spells:', error);
    return NextResponse.json(
      { success: false, error: 'Echec du chargement des sorts' },
      { status: 500 }
    );
  }
}
