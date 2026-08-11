import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/server/authorization';
import fs from 'fs';
import path from 'path';
import { getVaultPath, getGlobalConfig } from '../../../utils/config';
import { getErrorMessage } from '@/lib/errors';
import { instagramPublishSchema } from '@/lib/schemas/api';
import { validateJsonRequest } from '@/lib/server/security';

interface InstagramConfigFile {
  INSTAGRAM_ACCESS_TOKEN?: string;
  INSTAGRAM_ACCOUNT_ID?: string;
}

interface MetaApiResponse {
  id?: string;
  error?: { message?: string; code?: number };
}

// Define o caminho para a pasta principal do vault do cliente
const getClientVaultPath = async (clientName: string) => {
  // Converte o nome de cliente (ex: Mezzold Studio) para o formato da pasta,
  // ou simplesmente tenta achar a pasta do cliente.
  const vaultPath = await getVaultPath();
  const baseClientsPath = path.join(vaultPath, '02-Clientes');
  
  // Tenta encontrar a pasta exata ou ignorando case
  if (fs.existsSync(baseClientsPath)) {
    const clients = fs.readdirSync(baseClientsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
      
    // Busca um match exato primeiro
    const exactMatch = clients.find(c => c === clientName);
    if (exactMatch) return path.join(baseClientsPath, exactMatch);
    
    // Busca ignorando maiúsculas e minúsculas
    const caseInsensitiveMatch = clients.find(c => c.toLowerCase() === clientName.toLowerCase());
    if (caseInsensitiveMatch) return path.join(baseClientsPath, caseInsensitiveMatch);
    
    // Busca substituindo espaços por hifens (ex: "mezzold studio" -> "mezzold-studio")
    const hyphenMatch = clients.find(c => c.toLowerCase() === clientName.toLowerCase().replace(/\s+/g, '-'));
    if (hyphenMatch) return path.join(baseClientsPath, hyphenMatch);
  }
  
  return null;
};

export async function POST(req: Request) {
  const denied = await authorizeRequest(req, 'approver');
  if (denied) return denied;
  try {
    const validated = await validateJsonRequest(req, instagramPublishSchema);
    if (!validated.ok) return validated.response;
    const { client, caption, videoUrl, imageUrls } = validated.data;

    const clientPath = await getClientVaultPath(client);
    
    if (!clientPath) {
      return NextResponse.json(
        { error: `Pasta do cliente "${client}" não encontrada no Vault.` },
        { status: 404 }
      );
    }

    const configPath = path.join(clientPath, 'instagram_config.json');

    let accessToken = null;
    let accountId = null;

    if (fs.existsSync(configPath)) {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as InstagramConfigFile;
      accessToken = configData.INSTAGRAM_ACCESS_TOKEN;
      accountId = configData.INSTAGRAM_ACCOUNT_ID;
    }

    // Fallback to global config
    if (!accessToken || !accountId) {
      const globalConfig = await getGlobalConfig();
      if (!accessToken) accessToken = globalConfig.instagramToken;
      if (!accountId) accountId = globalConfig.instagramAccountId;
    }

    if (!accessToken || !accountId) {
      // Cria um template vazio para o usuário preencher (se não existir)
      if (!fs.existsSync(configPath)) {
        const template = {
          INSTAGRAM_ACCESS_TOKEN: "",
          INSTAGRAM_ACCOUNT_ID: ""
        };
        fs.writeFileSync(configPath, JSON.stringify(template, null, 2), 'utf-8');
      }
      return NextResponse.json(
        { error: `O arquivo de configuração está vazio ou faltando informações, e a configuração global também não está definida.`, needsConfig: true },
        { status: 400 }
      );
    }

    let creationId = null;

    if (videoUrl) {
      // Create Reels video container
      const createMediaUrl = `https://graph.facebook.com/v19.0/${accountId}/media?media_type=REELS&video_url=${encodeURIComponent(videoUrl)}&caption=${encodeURIComponent(caption)}&access_token=${accessToken}`;
      
      const mediaResponse = await fetch(createMediaUrl, { method: 'POST' });
      const mediaData = (await mediaResponse.json()) as MetaApiResponse;

      if (mediaData.error) {
        console.error("Erro ao criar video no Instagram:", mediaData.error);
        return NextResponse.json(
          { error: `Erro na API da Meta (criação de vídeo): ${mediaData.error.message}` },
          { status: 500 }
        );
      }
      creationId = mediaData.id;
    } else if (imageUrls.length === 1) {
      // 1. Criar o container de mídia único (Upload)
      const createMediaUrl = `https://graph.facebook.com/v19.0/${accountId}/media?image_url=${encodeURIComponent(imageUrls[0])}&caption=${encodeURIComponent(caption)}&access_token=${accessToken}`;
      
      const mediaResponse = await fetch(createMediaUrl, { method: 'POST' });
      const mediaData = (await mediaResponse.json()) as MetaApiResponse;

      if (mediaData.error) {
        console.error("Erro ao criar media no Instagram:", mediaData.error);
        return NextResponse.json(
          { error: `Erro na API da Meta (criação): ${mediaData.error.message}` },
          { status: 500 }
        );
      }
      creationId = mediaData.id;
    } else {
      // Criar Carrossel
      const childrenIds = [];
      
      // 1. Criar container para cada imagem
      for (const url of imageUrls) {
        const createItemUrl = `https://graph.facebook.com/v19.0/${accountId}/media?image_url=${encodeURIComponent(url)}&is_carousel_item=true&access_token=${accessToken}`;
        const itemResponse = await fetch(createItemUrl, { method: 'POST' });
        const itemData = (await itemResponse.json()) as MetaApiResponse;
        
        if (itemData.error) {
          console.error("Erro ao criar item do carrossel:", itemData.error);
          return NextResponse.json(
            { error: `Erro na API da Meta (item do carrossel): ${itemData.error.message}` },
            { status: 500 }
          );
        }
        if (!itemData.id) throw new Error('A Meta não retornou o ID do item do carrossel.');
        childrenIds.push(itemData.id);
      }
      
      // 2. Criar container do carrossel pai
      const createCarouselUrl = `https://graph.facebook.com/v19.0/${accountId}/media?media_type=CAROUSEL&children=${encodeURIComponent(childrenIds.join(','))}&caption=${encodeURIComponent(caption)}&access_token=${accessToken}`;
      const carouselResponse = await fetch(createCarouselUrl, { method: 'POST' });
      const carouselData = (await carouselResponse.json()) as MetaApiResponse;
      
      if (carouselData.error) {
        console.error("Erro ao criar container do carrossel:", carouselData.error);
        return NextResponse.json(
          { error: `Erro na API da Meta (container carrossel): ${carouselData.error.message}` },
          { status: 500 }
        );
      }
      creationId = carouselData.id;
    }

    if (!creationId) throw new Error('A Meta não retornou o ID do container de mídia.');

    // 3. Publicar o container final (seja único ou carrossel)
    const publishUrl = `https://graph.facebook.com/v19.0/${accountId}/media_publish?creation_id=${creationId}&access_token=${accessToken}`;
    const publishResponse = await fetch(publishUrl, { method: 'POST' });
    const publishData = (await publishResponse.json()) as MetaApiResponse;

    if (publishData.error) {
      console.error("Erro ao publicar no Instagram:", publishData.error);
      return NextResponse.json(
        { error: `Erro na API da Meta (publicação): ${publishData.error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      id: publishData.id,
      message: 'Post publicado com sucesso no Instagram!' 
    });

  } catch (error: unknown) {
    console.error('Erro geral ao publicar no Instagram:', error);
    return NextResponse.json(
      { error: 'Erro interno ao tentar publicar no Instagram', details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
