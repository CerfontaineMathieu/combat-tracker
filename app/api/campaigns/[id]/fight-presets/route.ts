import { NextResponse } from 'next/server';
import {
  getFightPresetsByCampaign,
  createFightPreset,
  deleteFightPreset,
  type FightPresetMonster,
} from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const presets = await getFightPresetsByCampaign(parseInt(id, 10));
    return NextResponse.json(presets);
  } catch (error) {
    console.error('Failed to fetch fight presets:', error);
    return NextResponse.json({ error: 'Failed to fetch fight presets' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, monsters } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const preset = await createFightPreset(
      parseInt(id, 10),
      name,
      description || null,
      monsters || []
    );

    return NextResponse.json(preset, { status: 201 });
  } catch (error) {
    console.error('Failed to create fight preset:', error);
    return NextResponse.json({ error: 'Failed to create fight preset' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const presetId = searchParams.get('presetId');

    if (!presetId) {
      return NextResponse.json({ error: 'presetId is required' }, { status: 400 });
    }

    const deleted = await deleteFightPreset(parseInt(presetId, 10));
    if (!deleted) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete fight preset:', error);
    return NextResponse.json({ error: 'Failed to delete fight preset' }, { status: 500 });
  }
}
