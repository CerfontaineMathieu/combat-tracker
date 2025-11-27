import { NextResponse } from 'next/server';
import { getFightPresetById, updateFightPreset, deleteFightPreset } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; presetId: string }> }
) {
  try {
    const { presetId } = await params;
    const preset = await getFightPresetById(parseInt(presetId, 10));

    if (!preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    return NextResponse.json(preset);
  } catch (error) {
    console.error('Failed to fetch fight preset:', error);
    return NextResponse.json({ error: 'Failed to fetch fight preset' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; presetId: string }> }
) {
  try {
    const { presetId } = await params;
    const body = await request.json();
    const { name, description } = body;

    const preset = await updateFightPreset(parseInt(presetId, 10), { name, description });

    if (!preset) {
      return NextResponse.json({ error: 'Preset not found or no updates provided' }, { status: 404 });
    }

    return NextResponse.json(preset);
  } catch (error) {
    console.error('Failed to update fight preset:', error);
    return NextResponse.json({ error: 'Failed to update fight preset' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; presetId: string }> }
) {
  try {
    const { presetId } = await params;
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
