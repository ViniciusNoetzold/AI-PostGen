import { NextResponse } from 'next/server';
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config';

export async function GET() {
  try {
    const config = getGlobalConfig();
    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Error fetching config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // We only want to save specific fields
    const configToSave: any = {};
    if (body.vaultPath !== undefined) configToSave.vaultPath = body.vaultPath;
    if (body.instagramToken !== undefined) configToSave.instagramToken = body.instagramToken;
    if (body.instagramAccountId !== undefined) configToSave.instagramAccountId = body.instagramAccountId;
    
    saveGlobalConfig(configToSave);
    
    return NextResponse.json({ success: true, message: 'Configuração salva com sucesso!' });
  } catch (error: any) {
    console.error('Error saving config:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
