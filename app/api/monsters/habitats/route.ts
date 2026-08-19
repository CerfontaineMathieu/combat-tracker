import { NextResponse } from 'next/server';
import { getHabitatOptions } from '@/lib/db';

export async function GET() {
  try {
    const habitats = await getHabitatOptions();
    return NextResponse.json(habitats);
  } catch (error) {
    console.error('Error fetching habitat options:', error);
    return NextResponse.json({ error: 'Failed to fetch habitat options' }, { status: 500 });
  }
}
