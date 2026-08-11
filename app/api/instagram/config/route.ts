import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/server/authorization';
import fs from 'fs';
import path from 'path';
import { getVaultPath } from '../../../utils/config';
import { getErrorMessage } from '@/lib/errors';
import { instagramConfigSchema } from '@/lib/schemas/api';
import { validateJsonRequest } from '@/lib/server/security';
import { atomicWriteText } from '@/lib/server/atomic-files';

// Define o caminho para a pasta principal do vault do cliente
const getClientVaultPath = async (clientName: string) => {
  const vaultPath = await getVaultPath();
  const baseClientsPath = path.join(vaultPath, '02-Clientes');
  
  if (fs.existsSync(baseClientsPath)) {
    const clients = fs.readdirSync(baseClientsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
      
    const exactMatch = clients.find(c => c === clientName);
    if (exactMatch) return path.join(baseClientsPath, exactMatch);
    
    const caseInsensitiveMatch = clients.find(c => c.toLowerCase() === clientName.toLowerCase());
    if (caseInsensitiveMatch) return path.join(baseClientsPath, caseInsensitiveMatch);
    
    const hyphenMatch = clients.find(c => c.toLowerCase() === clientName.toLowerCase().replace(/\s+/g, '-'));
    if (hyphenMatch) return path.join(baseClientsPath, hyphenMatch);
  }
  
  return null;
};

export async function POST(req: Request) {
  const denied = await authorizeRequest(req, 'admin');
  if (denied) return denied;
  try {
    const validated = await validateJsonRequest(req, instagramConfigSchema);
    if (!validated.ok) return validated.response;
    const { client, accessToken, accountId } = validated.data;

    const clientPath = await getClientVaultPath(client);
    
    if (!clientPath) {
      return NextResponse.json(
        { error: `Pasta do cliente "${client}" não encontrada no Vault.` },
        { status: 404 }
      );
    }

    const configPath = path.join(clientPath, 'instagram_config.json');

    const configData = {
      INSTAGRAM_ACCESS_TOKEN: accessToken,
      INSTAGRAM_ACCOUNT_ID: accountId
    };

    await atomicWriteText(configPath, JSON.stringify(configData, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: 'Configuração do Instagram salva com sucesso!' 
    });

  } catch (error: unknown) {
    console.error('Erro geral ao salvar configuração do Instagram:', error);
    return NextResponse.json(
      { error: 'Erro interno ao salvar configuração', details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
