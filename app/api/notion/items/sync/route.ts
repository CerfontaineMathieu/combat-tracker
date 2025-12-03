import { NextResponse } from 'next/server';
import { testItemDatabasesConnection, getConfiguredDatabases } from '@/lib/notion-items';

// GET - Test connection to item databases
export async function GET() {
  try {
    // Check which databases are configured
    const configured = getConfiguredDatabases();
    const hasAnyConfigured = configured.some(db => db.configured);

    if (!hasAnyConfigured) {
      return NextResponse.json({
        success: false,
        error: 'Aucune base de données Notion configurée',
        databases: configured.map(db => ({
          name: db.name,
          status: 'not_configured' as const,
        })),
      });
    }

    // Test actual connection
    const result = await testItemDatabasesConnection();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error testing item databases connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: 'Échec de la connexion à Notion',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
