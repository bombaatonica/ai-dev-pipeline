import express, { type ErrorRequestHandler, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import type { TaskStore } from './store.js';

function wrap(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => { void handler(req, res).catch(next); };
}

export function createApp(store: TaskStore, sha: string) {
  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => { res.json({ status: 'ok' }); });
  app.get('/ready', wrap(async (_req, res) => {
    try { await store.ready(); res.json({ status: 'ready' }); }
    catch { res.status(503).json({ error: 'Serviço indisponível' }); }
  }));
  app.get('/version', (_req, res) => { res.json({ sha }); });
  app.get('/tasks', wrap(async (_req, res) => { res.json(await store.list()); }));
  app.post('/tasks', wrap(async (req, res) => {
    const title: unknown = req.body?.title;
    if (typeof title !== 'string' || !title.trim() || title.length > 120) {
      res.status(400).json({ error: 'Título inválido' }); return;
    }
    res.status(201).json(await store.create(title));
  }));
  app.patch('/tasks/:id/done', wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(id) || id > 2147483647) {
      res.status(400).json({ error: 'ID inválido' }); return;
    }
    const task = await store.done(id);
    if (!task) { res.status(404).json({ error: 'Tarefa não encontrada' }); return; }
    res.json(task);
  }));
  const errorHandler: ErrorRequestHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = typeof err === 'object' && err !== null && 'status' in err && err.status === 400 ? 400 : 500;
    res.status(status).json({ error: status === 400 ? 'Requisição inválida' : 'Erro interno' });
  };
  app.use(errorHandler);
  return app;
}
