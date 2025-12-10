import { NextResponse } from 'next/server';
import { searchSpells, getSpellCatalog, getSpellsByLevel } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const levelParam = searchParams.get('level');
    const classFilter = searchParams.get('class');

    // Parse level parameter
    let level: number | undefined;
    if (levelParam !== null && levelParam !== '' && levelParam !== 'all') {
      level = parseInt(levelParam, 10);
      if (isNaN(level)) {
        level = undefined;
      }
    }

    // Parse class filter
    const classFilterValue = classFilter && classFilter !== 'all' ? classFilter : undefined;

    let spells;

    // If we have any filter, use the search function
    if (query || level !== undefined || classFilterValue) {
      spells = await searchSpells(query, level, classFilterValue);
    } else {
      // Otherwise return all spells
      spells = await getSpellCatalog();
    }

    return NextResponse.json({
      success: true,
      count: spells.length,
      spells,
    });
  } catch (error) {
    console.error('Error searching spells:', error);
    return NextResponse.json(
      { success: false, error: 'Echec de la recherche de sorts' },
      { status: 500 }
    );
  }
}
