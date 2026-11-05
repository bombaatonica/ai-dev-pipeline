import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/**/*.test.ts'], exclude: ['tests/**/*.integration.test.ts'], coverage: { provider: 'v8', include: ['src/app.ts', 'src/store.ts', 'scripts/review-core.ts', 'scripts/lib.ts'], thresholds: { lines: 85, functions: 85, statements: 85, branches: 75 } } } });
