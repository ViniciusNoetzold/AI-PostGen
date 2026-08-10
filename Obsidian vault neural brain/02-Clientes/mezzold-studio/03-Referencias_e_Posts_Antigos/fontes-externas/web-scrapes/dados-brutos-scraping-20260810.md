# Dados Brutos do Scraping - Mezzold Studio Blog
**Arquivo original**: database-2.json (anexo do chat)
**Data de extração**: 10/08/2026
**Tamanho**: 54.159 tokens
**Formato**: JSON estruturado com conteúdo, metadados, HTML limpo, markdown e text_content

---

## Estrutura do JSON
```json
{
  "id": "bfd708ce-658a-46a1-bec0-fa263458f49d",
  "url": "https://www.mezzoldstudio.com.br/blog",
  "title": null,
  "status": "complete",
  "metadata": { ... },
  "content": [ ... array de elementos DOM estruturados ... ],
  "images": [],
  "structure": { ... árvore DOM completa ... },
  "raw_html": "<!DOCTYPE html>...",
  "clean_html": "<!DOCTYPE html>...",
  "markdown": "Blog | Mezzold Studio | Mezzold Studio\n[MEZZOLD.](/)\n...",
  "text_content": "Blog | Mezzold Studio | Mezzold Studio\nMEZZOLD\n.\nBlog\n...",
  "stats": {
    "heading_count": 11,
    "paragraph_count": 8,
    "image_count": 0,
    "link_count": 25,
    "table_count": 0,
    "list_count": 5,
    "code_block_count": 0,
    "word_count": 429,
    "char_count": 2515
  },
  "technologies": ["React", "Next.js"],
  "created_at": "2026-08-10 14:03:16.389553"
}
```

---

## Como Usar Estes Dados

Este arquivo serve como **registro bruto** do scraping para:
1. **Auditoria** - Verificar exatamente o que foi extraído
2. **Reprocessamento** - Se precisar extrair campos diferentes no futuro
3. **Debugging** - Comparar saída processada vs. original
4. **Backup** - Caso o site mude e precise comparar versões

Os arquivos processados e legíveis estão em:
- `../exemplos/artigo-*.md` - Artigos individuais formatados
- `../web-scrapes/blog-mezzold-studio-completo-20260810.md` - Resumo navegável

---

## Observações Técnicas
- O site usa Next.js com React (confirmado em `technologies`)
- Theme dark por padrão (`data-theme="dark"`)
- Fontes: Geist Sans + Geist Mono (variáveis CSS)
- Cores: Electric Red (primária), Cyan #00e5ff (secundária)
- Estrutura semântica bem definida (sections, articles, headers)
- Sem imagens no conteúdo principal (image_count: 0)
- 25 links internos/externos detectados