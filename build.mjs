import { build } from 'esbuild';
await build({ entryPoints: ['src/server.ts'], bundle: true, platform: 'node', format: 'esm', target: 'node24', packages: 'external', outfile: 'dist/server.js' });
