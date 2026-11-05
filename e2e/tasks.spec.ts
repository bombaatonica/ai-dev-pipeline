import { expect, test } from '@playwright/test';

test('ciclo de vida de tarefa pela API', async ({ request }) => {
  const created = await request.post('/tasks', { data: { title: `Teste E2E ${Date.now()}` } });
  expect(created.status()).toBe(201);
  const task = await created.json();
  const completed = await request.patch(`/tasks/${task.id}/done`);
  expect(completed.ok()).toBeTruthy();
  expect((await completed.json()).done).toBe(true);
  const listed = await request.get('/tasks');
  expect((await listed.json()).some((item: { id: number }) => item.id === task.id)).toBeTruthy();
});
