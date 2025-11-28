import { NextResponse } from 'next/server';
import { getMonstersFromNotion } from '@/lib/notion';
import { upsertMonster } from '@/lib/db';

export async function POST(request: Request) {
  try {
    console.log('Starting Notion sync...');

    // Fetch monsters from Notion
    const notionMonsters = await getMonstersFromNotion();
    console.log(`Fetched ${notionMonsters.length} monsters from Notion`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Sync each monster to the database
    for (const monster of notionMonsters) {
      try {
        // Skip if name is missing (required field)
        if (!monster.name) {
          results.failed++;
          results.errors.push('Monster without name skipped');
          continue;
        }

        await upsertMonster(monster as any);
        results.success++;
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Failed to sync ${monster.name || 'unnamed monster'}: ${errorMessage}`);
        console.error(`Error syncing monster ${monster.name}:`, error);
      }
    }

    console.log('Sync completed:', results);

    return NextResponse.json({
      message: 'Sync completed',
      total: notionMonsters.length,
      ...results,
    });
  } catch (error) {
    console.error('Error syncing monsters from Notion:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to sync monsters from Notion', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // Test endpoint to check Notion connection
    const monsters = await getMonstersFromNotion();

    return NextResponse.json({
      message: 'Notion connection successful',
      count: monsters.length,
      preview: monsters.slice(0, 3), // Return first 3 monsters as preview
    });
  } catch (error) {
    console.error('Error testing Notion connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to connect to Notion', details: errorMessage },
      { status: 500 }
    );
  }
}
