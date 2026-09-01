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

async function mockZabbix(page: import('@playwright/test').Page) {
  await page.route('**/*', async route => {
    const request = route.request();
    if (request.method() !== 'POST') return route.continue();

    const body = request.postDataJSON() as { method?: string; id?: number } | null;
    if (!body?.method?.endsWith('.get')) return route.continue();

    const result = {
      'host.get': [
        { hostid: '1', host: '10.0.0.10', name: 'Servidor principal', status: '0', available: '1', groups: [{ groupid: '10', name: '[CLIENTE] Exemplo' }] },
        { hostid: '2', host: '10.0.0.20', name: 'Câmera recepção', status: '0', available: '2', groups: [{ groupid: '10', name: '[CLIENTE] Exemplo' }] },
      ],
      'trigger.get': [],
      'proxy.get': [],
      'item.get': [],
    }[body.method] ?? [];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ jsonrpc: '2.0', result, id: body.id ?? 1 }),
    });
  });
}
