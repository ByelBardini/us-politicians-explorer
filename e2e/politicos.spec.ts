import { expect, test } from '@playwright/test';

/**
 * O que o `test.md` pede, provado num navegador real contra a stack real:
 * "o frontend deve listar os dados das pessoas — nome, foto, estado e partido",
 * "permitir filtrar por estado e partido de forma intuitiva" e "ser responsivo".
 *
 * Nada aqui é fingido: o React monta, o `fetch` sai pela rede, o Express responde
 * e o Postgres executa o SQL. Se qualquer costura entre as camadas estiver errada,
 * é aqui que aparece.
 */

const card = (page: import('@playwright/test').Page, nome: string) =>
  page.getByRole('button').filter({ hasText: nome });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // A primeira asserção espera o dado atravessar a stack inteira.
  await expect(page.getByText('Aisha Wahab')).toBeVisible();
});

test('lista nome, foto, estado e partido — os quatro campos do test.md', async ({ page }) => {
  const senadora = card(page, 'Aisha Wahab');

  await expect(senadora).toContainText('Aisha Wahab'); // nome
  await expect(senadora).toContainText('California'); // estado
  await expect(senadora).toContainText('Democratic'); // partido
  await expect(senadora).toContainText('Senator'); // cargo
  await expect(senadora.locator('img')).toBeVisible(); // foto

  // Sem foto, o card cai no avatar com a inicial em vez de um <img> quebrado.
  const semFoto = card(page, 'James Gallagher');
  await expect(semFoto.locator('img')).toHaveCount(0);
  await expect(semFoto).toContainText('J');
});

test('filtra por estado', async ({ page }) => {
  // A ordenação é por estado e nome, então a única texana nem cabe na página 1 —
  // só o filtro (que roda no banco, não na tela) a traz.
  await expect(page.getByText('Carol Alvarado')).toBeHidden();

  await page.getByLabel('Estado').selectOption('Texas');

  await expect(page.getByText('Carol Alvarado')).toBeVisible();
  await expect(page.getByText('Aisha Wahab')).toBeHidden(); // California saiu
});

test('filtra por partido', async ({ page }) => {
  await page.getByLabel('Partido').selectOption('Republican');

  await expect(page.getByText('James Gallagher')).toBeVisible();
  await expect(page.getByText('Aisha Wahab')).toBeHidden(); // Democratic saiu
});

test('combina os dois filtros', async ({ page }) => {
  await page.getByLabel('Estado').selectOption('Texas');
  await page.getByLabel('Partido').selectOption('Republican');

  // Não há republicano no Texas na semente: o estado vazio precisa aparecer.
  await expect(page.getByText('Nenhum político encontrado')).toBeVisible();
});

test('busca por nome ponta a ponta', async ({ page }) => {
  await page.getByLabel('Buscar por nome').fill('gallagher');

  // Minúsculo: o `contains insensitive` chega até o Postgres.
  await expect(page.getByText('James Gallagher')).toBeVisible();
  await expect(page.getByText('Aisha Wahab')).toBeHidden();
});

test('pagina entre as páginas', async ({ page }) => {
  // 15 registros, 12 por página ⇒ a segunda página existe.
  const proxima = page.getByRole('button', { name: /próxima/i });
  await expect(proxima).toBeEnabled();

  await proxima.click();

  await expect(page.getByText('Aisha Wahab')).toBeHidden(); // saiu da página 1
  await expect(page.getByRole('button', { name: /anterior/i })).toBeEnabled();
});

test('abre o drawer de detalhe ao clicar no card', async ({ page }) => {
  await card(page, 'Aisha Wahab').click();

  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('916-651-4410'); // contato veio do banco

  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
});

test('é responsivo: 375×667 colapsa para uma coluna', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });

  const primeiro = card(page, 'Aisha Wahab').first();
  const segundo = card(page, 'James Gallagher').first();

  const caixa1 = await primeiro.boundingBox();
  const caixa2 = await segundo.boundingBox();

  // Uma coluna: os cards ficam empilhados (mesmo x, y crescente), não lado a lado.
  expect(caixa1!.x).toBe(caixa2!.x);
  expect(caixa2!.y).toBeGreaterThan(caixa1!.y);
  // E nada vaza para fora da viewport — o sintoma clássico de quebra no mobile.
  expect(caixa1!.width).toBeLessThanOrEqual(375);
});
