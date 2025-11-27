import { NextResponse } from 'next/server';
import { setRoomCode, clearRoomCode, getCampaignById } from '@/lib/db';

// Generate a new room code for the campaign
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id, 10);

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const code = await setRoomCode(campaignId);
    return NextResponse.json({ code }, { status: 201 });
  } catch (error) {
    console.error('Failed to generate room code:', error);
    return NextResponse.json({ error: 'Failed to generate room code' }, { status: 500 });
  }
}

// Clear the room code for the campaign
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id, 10);

    await clearRoomCode(campaignId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to clear room code:', error);
    return NextResponse.json({ error: 'Failed to clear room code' }, { status: 500 });
  }
}
