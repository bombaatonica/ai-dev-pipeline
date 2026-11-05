import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store.js';

describe('API de tarefas', () => {
  it('cria, lista e conclui tarefas', async () => {
    const app = createApp(new MemoryStore(), 'abc');
    const created = await request(app).post('/tasks').send({ title: 'Revisar PR' }).expect(201);
    expect(created.body.title).toBe('Revisar PR');
    const listed = await request(app).get('/tasks').expect(200);
    expect(listed.body).toHaveLength(1);
    const updated = await request(app).patch(`/tasks/${created.body.id}/done`).expect(200);
    expect(updated.body.done).toBe(true);
  });

  it('valida títulos e IDs e informa quando a tarefa não existe', async () => {
    const app = createApp(new MemoryStore(), 'abc');
    for (const title of ['', '  ', 'x'.repeat(121), 2]) {
      await request(app).post('/tasks').send({ title }).expect(400);
    }
    await request(app).patch('/tasks/0/done').expect(400);
    await request(app).patch('/tasks/1/done').expect(404);
  });

  it('expõe health e versão e protege detalhes de falhas', async () => {
    const store = new MemoryStore();
    store.ready = async () => { throw new Error('senha secreta'); };
    store.list = async () => { throw new Error('senha secreta'); };
    const app = createApp(store, 'abc');
    await request(app).get('/health').expect(200);
    expect((await request(app).get('/version').expect(200)).body.sha).toBe('abc');
    expect((await request(app).get('/ready').expect(503)).text).not.toContain('senha');
    expect((await request(app).get('/tasks').expect(500)).text).not.toContain('senha');
  });
  it('informa prontidão e encerra o armazenamento em memória', async () => {
    const store = new MemoryStore();
    await request(createApp(store, 'abc')).get('/ready').expect(200);
    await expect(store.close()).resolves.toBeUndefined();
  });
});
