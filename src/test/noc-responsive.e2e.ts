import { expect, test } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';

const viewports = [
  { name: 'full-hd', width: 1920, height: 1080 },
  { name: '2k', width: 2560, height: 1440 },
  { name: '4k', width: 3840, height: 2160 },
];

for (const viewport of viewports) {
  test(`dashboard em ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockZabbix(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-display-mode', 'room');
    await expect(page.getByRole('heading', { name: 'Situação da operação' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
    await expect(page.getByText('Precisa de ação', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Onde começar' })).toBeVisible();
    const firstEnvironment = page.getByRole('list', { name: 'Ambientes prioritários' }).getByRole('link').first();
    await expect(firstEnvironment).toHaveAttribute('href', '/ambientes/10');

    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasHorizontalOverflow).toBe(false);
    const firstEnvironmentBox = await firstEnvironment.boundingBox();
    expect(firstEnvironmentBox && firstEnvironmentBox.y + firstEnvironmentBox.height).toBeLessThanOrEqual(viewport.height);

    await page.screenshot({ path: path.join(os.tmpdir(), `noc-vision-${viewport.name}.png`) });

    await page.goto('/ocorrencias');
    await expect(page.getByRole('heading', { name: 'O que exige análise' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Falhas 1/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await page.screenshot({ path: path.join(os.tmpdir(), `noc-vision-occurrences-${viewport.name}.png`) });

    await page.goto('/ambientes');
    await expect(page.getByRole('heading', { name: 'Ambientes em ordem de ação' })).toBeVisible();
    await expect(page.getByRole('table').getByText('Exemplo', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await page.screenshot({ path: path.join(os.tmpdir(), `noc-vision-environments-${viewport.name}.png`) });
  });
}

test('parâmetro da URL prevalece sobre a largura', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await mockZabbix(page);
  await page.goto('/?mode=analise');
  await expect(page.locator('html')).toHaveAttribute('data-display-mode', 'analysis');
  const search = page.getByRole('textbox', { name: 'Busca global' });
  await expect(search).toBeVisible();
  await search.fill('Servidor principal');
  await search.press('Enter');
  await expect(page).toHaveURL(/busca=Servidor(?:\+|%20)principal/);

  await page.getByTitle('Modo Sala').click();
  await expect(page).toHaveURL(/mode=sala/);
  await expect(page.locator('html')).toHaveAttribute('data-display-mode', 'room');
  expect(await page.evaluate(() => window.localStorage.getItem('noc-vision:display-mode:v1'))).toBe('room');
});

test('ocorrências preservam filtros e evidências na URL', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await mockZabbix(page);
  await page.goto('/ocorrencias');

  await expect(page.getByRole('heading', { name: 'O que exige análise' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Falhas 1/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Alertas 1/ })).toBeVisible();

  await page.getByRole('tab', { name: /Alertas 1/ }).click();
  await expect(page).toHaveURL(/aba=alertas/);
  await expect(page.getByRole('table').getByText('CPU acima do limite', { exact: true })).toBeVisible();

  await page.getByRole('tab', { name: /Falhas 1/ }).click();
  await expect(page).toHaveURL(/aba=falhas/);
  await page.getByRole('button', { name: 'Evidências' }).click();
  await expect(page).toHaveURL(/ocorrencia=failure%3A2/);

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Falha confirmada', { exact: true }).first()).toBeVisible();
  await expect(dialog.getByText('Câmera recepção', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);

  await page.screenshot({ path: path.join(os.tmpdir(), 'noc-vision-occurrences-full-hd.png') });
});

test('ambiente orienta a investigação e preserva a tarefa na URL', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await mockZabbix(page);
  await page.goto('/ambientes');

  await page.getByLabel('Situação').selectOption('failure');
  await expect(page).toHaveURL(/estado=failure/);
  await expect(page.getByRole('table').getByText('Exemplo', { exact: true })).toBeVisible();
  await expect(page.getByRole('table').getByText('Saudável', { exact: true })).toHaveCount(0);

  const investigate = page.getByRole('table').getByRole('link', { name: 'Investigar' });
  await expect(investigate).toHaveAttribute('href', '/ambientes/10?aba=atencao');
  await investigate.click();
  await expect(page.getByRole('heading', { name: 'Exemplo' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Onde começar neste ambiente' })).toBeVisible();
  await page.screenshot({ path: path.join(os.tmpdir(), 'noc-vision-environment-attention-full-hd.png') });

  await page.getByRole('tab', { name: 'Inventário' }).click();
  await expect(page).toHaveURL(/aba=inventario/);
  await page.getByRole('textbox', { name: 'Buscar no inventário' }).fill('Câmera');
  await expect(page).toHaveURL(/busca=C(?:%C3%A2|%c3%a2)mera/);
  await expect(page.locator('summary').filter({ hasText: 'Câmeras' })).toBeVisible();

  await page.getByRole('tab', { name: 'Ocorrências' }).click();
  await expect(page).toHaveURL(/aba=ocorrencias/);
  await expect(page.getByRole('heading', { name: 'Ocorrências do ambiente' })).toBeVisible();

  await page.getByRole('tab', { name: 'Infraestrutura' }).click();
  await expect(page).toHaveURL(/aba=infraestrutura/);
  await expect(page.getByRole('heading', { name: 'Proxies associados' })).toBeVisible();
  await expect(page.getByText('Proxy Cliente - Proxy', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await page.screenshot({ path: path.join(os.tmpdir(), 'noc-vision-environment-detail-full-hd.png') });
});

async function mockZabbix(page: import('@playwright/test').Page) {
  await page.route('**/*', async route => {
    const request = route.request();
    if (request.method() !== 'POST') return route.continue();

    const body = request.postDataJSON() as { method?: string; id?: number } | null;
    if (!body?.method?.endsWith('.get')) return route.continue();

    const result = {
      'host.get': [
        { hostid: '1', host: '10.0.0.10', name: 'Servidor principal', status: '0', available: '1', proxyid: '20', groups: [{ groupid: '10', name: '[CLIENTE] Exemplo' }] },
        { hostid: '2', host: '10.0.0.20', name: 'Câmera recepção', status: '0', available: '2', proxyid: '20', groups: [{ groupid: '10', name: '[CLIENTE] Exemplo' }] },
        { hostid: '3', host: '10.0.1.10', name: 'Servidor filial', status: '0', available: '1', groups: [{ groupid: '11', name: '[CLIENTE] Saudável' }] },
      ],
      'trigger.get': [
        {
          triggerid: '100',
          description: 'CPU acima do limite',
          priority: '4',
          value: '1',
          lastchange: String(Math.floor(Date.now() / 1000) - 600),
          hosts: [{ hostid: '1', host: '10.0.0.10', name: 'Servidor principal' }],
          groups: [{ groupid: '10', name: '[CLIENTE] Exemplo' }],
        },
      ],
      'proxy.get': [{ proxyid: '20', name: 'Proxy Cliente', lastaccess: String(Math.floor(Date.now() / 1000) - 15), status: '5' }],
      'item.get': [],
    }[body.method] ?? [];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ jsonrpc: '2.0', result, id: body.id ?? 1 }),
    });
  });
}
