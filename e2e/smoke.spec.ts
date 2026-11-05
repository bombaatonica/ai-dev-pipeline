import { expect, test } from '@playwright/test';

test('saúde, prontidão, versão e leitura de tarefas', async ({ request }) => {
  test.setTimeout(120_000);
  await expect.poll(async () => {
    try { return (await request.get('/ready', { timeout: 5_000 })).status(); }
    catch { return 0; }
  }, { timeout: 100_000, intervals: [2_000, 5_000] }).toBe(200);
  expect((await request.get('/health')).status()).toBe(200);
  const version = await request.get('/version');
  expect(version.status()).toBe(200);
  if (process.env.EXPECTED_SHA) expect((await version.json()).sha).toBe(process.env.EXPECTED_SHA);
  expect((await request.get('/tasks')).status()).toBe(200);
});
