import { createApp } from './app.js';
import { MemoryStore } from './store.js';
import { PgStore } from './pg-store.js';

async function main(): Promise<void> {
  const store = process.env.DATABASE_URL ? new PgStore(process.env.DATABASE_URL) : new MemoryStore();
  if (store instanceof PgStore) await store.migrate();
  const sha = process.env.GIT_SHA || process.env.RENDER_GIT_COMMIT || 'unknown';
  const server = createApp(store, sha).listen(Number(process.env.PORT || 3000), '0.0.0.0');
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    server.close((err) => {
      void store.close().then(() => { process.exitCode = err ? 1 : 0; }).catch(() => { process.exitCode = 1; });
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
main().catch(() => { console.error('Falha ao iniciar o servidor'); process.exitCode = 1; });
