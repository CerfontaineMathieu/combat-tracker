import { NextResponse } from 'next/server';
import {
  getActiveCombatSession,
  getCombatSessionParticipants,
  createCombatSession,
  updateCombatSession,
  endCombatSession,
  getCampaignById,
} from '@/lib/db';

// Get active combat session with participants
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id, 10);

    const session = await getActiveCombatSession(campaignId);
    if (!session) {
      return NextResponse.json({ session: null, participants: [] });
    }

    const participants = await getCombatSessionParticipants(session.id);
    return NextResponse.json({ session, participants });
  } catch (error) {
    console.error('Failed to fetch combat session:', error);
    return NextResponse.json({ error: 'Failed to fetch combat session' }, { status: 500 });
  }
}

// Start a new combat session
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id, 10);
    const body = await request.json();
    const { participants } = body;

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (!Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json({ error: 'Participants are required' }, { status: 400 });
    }

    const session = await createCombatSession(campaignId, participants);
    const savedParticipants = await getCombatSessionParticipants(session.id);

    return NextResponse.json({ session, participants: savedParticipants }, { status: 201 });
  } catch (error) {
    console.error('Failed to create combat session:', error);
    return NextResponse.json({ error: 'Failed to create combat session' }, { status: 500 });
  }
}

// Update combat session (turn, round)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id, 10);
    const body = await request.json();
    const { current_turn, round_number } = body;

    const activeSession = await getActiveCombatSession(campaignId);
    if (!activeSession) {
      return NextResponse.json({ error: 'No active combat session' }, { status: 404 });
    }

    const session = await updateCombatSession(activeSession.id, {
      current_turn,
      round_number,
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Failed to update combat session:', error);
    return NextResponse.json({ error: 'Failed to update combat session' }, { status: 500 });
  }
}

// End combat session
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id, 10);

    const activeSession = await getActiveCombatSession(campaignId);
    if (!activeSession) {
      return NextResponse.json({ error: 'No active combat session' }, { status: 404 });
    }

    await endCombatSession(activeSession.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to end combat session:', error);
    return NextResponse.json({ error: 'Failed to end combat session' }, { status: 500 });
  }
}
