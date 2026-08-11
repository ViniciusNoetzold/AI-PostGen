import { expect, test } from "@playwright/test";

test("core sections render and APIs validate payloads", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();

  for (const [path, heading] of [
    ["/ai-post-gen", "AI Post Gen"],
    ["/studio", "Product Studio"],
    ["/calendar", "Calendário editorial"],
    ["/contacts", "Cidade de clientes"],
    ["/reports", "Relatórios"],
    ["/settings", "Configurações"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, exact: false }).first()).toBeVisible();
  }

  await page.goto("/contacts");
  await expect(page.getByRole("button", { name: "Cidade", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Rede", exact: true }).click();
  await expect(page.getByRole("button", { name: "Rede", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Empresa", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Cadastrar empresa" })).toBeVisible();
  await expect(page.getByLabel("Nome da empresa")).toBeVisible();
  await page.getByLabel("Esta empresa não possui site").check();
  await expect(page.getByLabel("Site (HTTPS)")).toBeDisabled();
  await page.getByLabel("Esta empresa não possui logo").check();
  await expect(page.getByLabel("Logo (URL HTTPS)")).toBeDisabled();
  await expect(page.getByLabel("Ou enviar logo do computador")).toBeDisabled();
  await page.getByLabel("Esta empresa não possui logo").uncheck();
  await expect(page.getByLabel("Ou enviar logo do computador")).toBeEnabled();
  await expect(page.getByLabel("Descrição do negócio")).toBeVisible();
  await page.getByRole("button", { name: "Fechar" }).click();

  await page.getByRole("button", { name: "Lista" }).click();
  const editPersonButton = page.getByRole("button", { name: /Editar pessoa/ }).first();
  if (await editPersonButton.count()) {
    await editPersonButton.click();
    await expect(page.getByRole("dialog", { name: "Editar pessoa" })).toBeVisible();
    await expect(page.getByLabel("Nome")).not.toHaveValue("");
    await page.getByRole("dialog", { name: "Editar pessoa" }).getByRole("button", { name: "Fechar", exact: true }).click();
  }

  const crmNetwork = await request.get("/api/crm/network");
  expect(crmNetwork.status()).toBe(200);
  const crmPayload = await crmNetwork.json() as { persistence?: string; companies?: unknown[] };
  expect(crmPayload.persistence).toMatch(/postgresql|local-development/);
  expect(Array.isArray(crmPayload.companies)).toBe(true);

  const invalidLogo = await request.post("/api/media/upload", {
    multipart: {
      file: {
        name: "logo.png",
        mimeType: "image/png",
        buffer: Buffer.from("not-a-real-png"),
      },
    },
  });
  expect(invalidLogo.status()).toBe(422);

  await page.goto("/contacts/network");
  await expect(page.getByRole("heading", { name: "Mapa de relacionamentos" })).toBeVisible();
  await expect(page.getByLabel("Área visual de relacionamentos")).toBeVisible();
  await page.getByRole("button", { name: "Adicionar à empresa" }).click();
  await expect(page.getByRole("dialog", { name: "Adicionar pessoa à rede" })).toBeVisible();
  await page.getByRole("button", { name: "Fechar" }).click();
  const connectors = page.getByTitle("Puxar conexão");
  if (await connectors.count() > 1) {
    await connectors.nth(0).click();
    await connectors.nth(1).locator("..").click();
    await expect(page.getByRole("dialog", { name: "Confirmar conexão" })).toBeVisible();
    await page.getByRole("dialog", { name: "Confirmar conexão" }).getByRole("button", { name: "Fechar", exact: true }).click();
  }
  const canvasButtons = page.getByLabel("Área visual de relacionamentos").getByRole("button");
  if (await canvasButtons.count() > 1) {
    await canvasButtons.nth(1).click();
    await expect(page.locator("aside[aria-label^='Informações de']")).toBeVisible();
    await page.getByRole("button", { name: "Fechar informações" }).click();
  }

  const invalid = await request.post("/api/history/delete", {
    data: { client: "../../escape", id: "config.md" },
    headers: { "Content-Type": "application/json" },
  });
  expect(invalid.status()).toBe(422);
});
