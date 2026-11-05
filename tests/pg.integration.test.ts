import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PgStore } from '../src/pg-store.js';

describe.skipIf(!process.env.DATABASE_URL)('PostgreSQL real', () => {
  const store = new PgStore(process.env.DATABASE_URL!);
  beforeAll(async () => { await store.migrate(); });
  afterAll(async () => { await store.close(); });
  it('persiste uma tarefa e conclui pelo ID', async () => {
    const task = await store.create(`Integração ${Date.now()}`);
    expect((await store.list()).find((item) => item.id === task.id)).toEqual(task);
    expect((await store.done(task.id))?.done).toBe(true);
    expect(await store.done(2147483647)).toBeNull();
  });
});
