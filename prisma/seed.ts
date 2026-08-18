import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { getDb, isDatabaseConfigured } from "../lib/server/db";

async function main() {
  if (!isDatabaseConfigured()) {
    console.log("DATABASE_URL não configurada. O AI-PostGen utiliza o banco local embutido (.data/crm.json).");
    return;
  }

  const db = getDb();
  const dataPath = path.join(process.cwd(), ".data", "crm.json");
  if (!existsSync(dataPath)) {
    console.log("Arquivo .data/crm.json não encontrado.");
    return;
  }

  const data = JSON.parse(readFileSync(dataPath, "utf-8"));
  console.log(`Populando banco PostgreSQL com ${data.companies.length} empresas e ${data.contacts.length} contatos...`);

  for (const company of data.companies) {
    await db.company.upsert({
      where: { id: company.id },
      update: {
        name: company.name,
        slug: company.slug,
        legalName: company.legalName,
        document: company.document,
        industry: company.industry,
        website: company.website,
        logoUrl: company.logoUrl,
        description: company.description,
        city: company.city,
        state: company.state,
        country: company.country,
        active: company.active,
      },
      create: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        legalName: company.legalName,
        document: company.document,
        industry: company.industry,
        website: company.website,
        logoUrl: company.logoUrl,
        description: company.description,
        city: company.city,
        state: company.state,
        country: company.country,
        active: company.active,
      },
    });
  }

  for (const contact of data.contacts) {
    await db.client.upsert({
      where: { id: contact.id },
      update: {
        name: contact.name,
        slug: contact.slug,
        email: contact.email,
        phone: contact.phone,
        companyId: contact.companyId,
        jobTitle: contact.jobTitle,
        category: contact.category,
        city: contact.city,
        state: contact.state,
        tags: contact.tags,
        notes: contact.notes,
        active: contact.active,
      },
      create: {
        id: contact.id,
        name: contact.name,
        slug: contact.slug,
        email: contact.email,
        phone: contact.phone,
        companyId: contact.companyId,
        jobTitle: contact.jobTitle,
        category: contact.category,
        city: contact.city,
        state: contact.state,
        tags: contact.tags,
        notes: contact.notes,
        active: contact.active,
      },
    });
  }

  for (const rel of data.relationships) {
    await db.clientRelationship.upsert({
      where: {
        sourceClientId_targetClientId_type: {
          sourceClientId: rel.sourceClientId,
          targetClientId: rel.targetClientId,
          type: rel.type,
        },
      },
      update: {
        label: rel.label,
        strength: rel.strength,
        notes: rel.notes,
        active: rel.active,
      },
      create: {
        id: rel.id,
        sourceClientId: rel.sourceClientId,
        targetClientId: rel.targetClientId,
        type: rel.type,
        label: rel.label,
        strength: rel.strength,
        notes: rel.notes,
        active: rel.active,
      },
    });
  }

  console.log("Seed concluído com sucesso!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
