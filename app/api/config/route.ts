import { NextResponse } from 'next/server';
import {
  getPublicConfigProfile,
  saveGlobalConfig,
  type GlobalConfig,
} from '../../utils/config';
import { authorizeRequest } from '@/lib/server/authorization';
import { configUpdateSchema } from '@/lib/schemas/api';
import { validateJsonRequest } from '@/lib/server/security';

export async function GET(req: Request) {
  const denied = await authorizeRequest(req, 'viewer');
  if (denied) return denied;
  try {
    return NextResponse.json(getPublicConfigProfile(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    console.error('Error fetching config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = await authorizeRequest(req, 'admin');
  if (denied) return denied;
  try {
    const validated = await validateJsonRequest(req, configUpdateSchema);
    if (!validated.ok) return validated.response;
    const configUpdate = validated.data;

    const configToSave: Partial<GlobalConfig> = {};
    if (configUpdate.vaultPath) configToSave.vaultPath = configUpdate.vaultPath;
    // An omitted or blank secret preserves the current token.
    if (configUpdate.instagramToken) configToSave.instagramToken = configUpdate.instagramToken;
    if (configUpdate.instagramAccountId !== undefined) {
      configToSave.instagramAccountId = configUpdate.instagramAccountId;
    }
    if (configUpdate.defaultLanguage) configToSave.defaultLanguage = configUpdate.defaultLanguage;

    await saveGlobalConfig(configToSave);
    return NextResponse.json({
      success: true,
      message: 'Configuração salva com sucesso!',
      config: getPublicConfigProfile(),
    });
  } catch (error: unknown) {
    console.error('Error saving config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
