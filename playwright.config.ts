import { defineConfig } from '@playwright/test';
const external = process.env.BASE_URL;
export default defineConfig({
  testDir: './e2e', workers: 1, retries: 0,
  use: { baseURL: external || 'http://127.0.0.1:3000' },
  webServer: external ? undefined : { command: 'node dist/server.js', url: 'http://127.0.0.1:3000/health', reuseExistingServer: false, timeout: 20000 },
});
