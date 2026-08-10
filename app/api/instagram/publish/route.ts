import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define o caminho para a pasta principal do vault do cliente
const getVaultPath = (clientName: string) => {
  // Converte o nome de cliente (ex: Mezzold Studio) para o formato da pasta,
  // ou simplesmente tenta achar a pasta do cliente.
  const baseClientsPath = 'E:/App Automação Meta/Obsidian vault neural brain/02-Clientes';
  
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
  try {
    const { client, imageUrls, caption, fileName } = await req.json();

    if (!client || !imageUrls || imageUrls.length === 0 || !caption) {
      return NextResponse.json(
        { error: 'Cliente, URLs de imagem e legenda são obrigatórios' },
        { status: 400 }
      );
    }

    const clientPath = getVaultPath(client);
    
    if (!clientPath) {
      return NextResponse.json(
        { error: `Pasta do cliente "${client}" não encontrada no Vault.` },
        { status: 404 }
      );
    }

    const configPath = path.join(clientPath, 'instagram_config.json');

    if (!fs.existsSync(configPath)) {
      // Cria um template vazio para o usuário preencher
      const template = {
        INSTAGRAM_ACCESS_TOKEN: "",
        INSTAGRAM_ACCOUNT_ID: ""
      };
      fs.writeFileSync(configPath, JSON.stringify(template, null, 2), 'utf-8');
      
      return NextResponse.json(
        { error: `Configuração do Instagram não encontrada para este cliente. Um arquivo vazio foi criado em: ${configPath}. Preencha-o com as credenciais da Meta.` },
        { status: 400 }
      );
    }

    const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const accessToken = configData.INSTAGRAM_ACCESS_TOKEN;
    const accountId = configData.INSTAGRAM_ACCOUNT_ID;

    if (!accessToken || !accountId) {
      return NextResponse.json(
        { error: `O arquivo instagram_config.json de "${client}" está vazio ou faltando informações. Preencha as credenciais.` },
        { status: 400 }
      );
    }

    let creationId = null;

    if (imageUrls.length === 1) {
      // 1. Criar o container de mídia único (Upload)
      const createMediaUrl = `https://graph.facebook.com/v19.0/${accountId}/media?image_url=${encodeURIComponent(imageUrls[0])}&caption=${encodeURIComponent(caption)}&access_token=${accessToken}`;
      
      const mediaResponse = await fetch(createMediaUrl, { method: 'POST' });
      const mediaData = await mediaResponse.json();

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
        const itemData = await itemResponse.json();
        
        if (itemData.error) {
          console.error("Erro ao criar item do carrossel:", itemData.error);
          return NextResponse.json(
            { error: `Erro na API da Meta (item do carrossel): ${itemData.error.message}` },
            { status: 500 }
          );
        }
        childrenIds.push(itemData.id);
      }
      
      // 2. Criar container do carrossel pai
      const createCarouselUrl = `https://graph.facebook.com/v19.0/${accountId}/media?media_type=CAROUSEL&children=${encodeURIComponent(childrenIds.join(','))}&caption=${encodeURIComponent(caption)}&access_token=${accessToken}`;
      const carouselResponse = await fetch(createCarouselUrl, { method: 'POST' });
      const carouselData = await carouselResponse.json();
      
      if (carouselData.error) {
        console.error("Erro ao criar container do carrossel:", carouselData.error);
        return NextResponse.json(
          { error: `Erro na API da Meta (container carrossel): ${carouselData.error.message}` },
          { status: 500 }
        );
      }
      creationId = carouselData.id;
    }

    // 3. Publicar o container final (seja único ou carrossel)
    const publishUrl = `https://graph.facebook.com/v19.0/${accountId}/media_publish?creation_id=${creationId}&access_token=${accessToken}`;
    const publishResponse = await fetch(publishUrl, { method: 'POST' });
    const publishData = await publishResponse.json();

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

  } catch (error: any) {
    console.error('Erro geral ao publicar no Instagram:', error);
    return NextResponse.json(
      { error: 'Erro interno ao tentar publicar no Instagram', details: error.message },
      { status: 500 }
    );
  }
}
