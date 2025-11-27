import { NextResponse } from 'next/server';
import { getCampaignByRoomCode } from '@/lib/db';

// Validate room code and return campaign info
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code || code.length !== 6) {
      return NextResponse.json({ error: 'Invalid room code format' }, { status: 400 });
    }

    const campaign = await getCampaignByRoomCode(code);
    if (!campaign) {
      return NextResponse.json({ error: 'Room code not found' }, { status: 404 });
    }

    // Return limited campaign info for players
    return NextResponse.json({
      id: campaign.id,
      name: campaign.name,
    });
  } catch (error) {
    console.error('Failed to validate room code:', error);
    return NextResponse.json({ error: 'Failed to validate room code' }, { status: 500 });
  }
}
