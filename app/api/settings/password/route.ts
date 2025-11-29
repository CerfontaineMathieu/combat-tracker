import { NextResponse } from 'next/server';
import { getDmPassword, setDmPassword } from '@/lib/db';

const DEFAULT_DM_PASSWORD = process.env.DM_PASSWORD || 'defaultpassword';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { campaignId, currentPassword, newPassword } = body;

    // Validate input
    if (!campaignId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'missing-fields', message: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: 'password-too-short', message: 'Le mot de passe doit contenir au moins 4 caractères' },
        { status: 400 }
      );
    }

    // Get effective current password (DB or .env fallback)
    const dbPassword = await getDmPassword(campaignId);
    const effectivePassword = dbPassword || DEFAULT_DM_PASSWORD;

    // Verify current password
    if (currentPassword !== effectivePassword) {
      return NextResponse.json(
        { error: 'invalid-password', message: 'Mot de passe actuel incorrect' },
        { status: 401 }
      );
    }

    // Update password in database
    await setDmPassword(campaignId, newPassword);

    return NextResponse.json({ success: true, message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { error: 'server-error', message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
