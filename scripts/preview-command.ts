import { appendFile } from 'node:fs/promises';
import { NeonPreview } from './neon-preview.js';
import { RenderPreview } from './render-preview.js';
import { cleanupPreview, provisionPreview } from './preview-lifecycle.js';
import { previewContext } from './preview-context.js';
import { github } from './lib.js';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Configuração ${name} ausente`);
  return value;
}

async function main(): Promise<void> {
  const number = Number(required('PR_NUMBER'));
  if (!Number.isSafeInteger(number) || number < 1) throw new Error('PR inválido');
  const repository = required('GITHUB_REPOSITORY');
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Repositório inválido');
  const neon = new NeonPreview(required('NEON_PROJECT_ID'), required('NEON_API_KEY'));
  const render = new RenderPreview(required('RENDER_OWNER_ID'), required('RENDER_API_KEY'));
  const services = { neon, render };
  const mode = required('PREVIEW_MODE');
  if (mode === 'cleanup') {
    const pull = await (await github(`/repos/${repository}/pulls/${number}`)).json() as { state?: string; head?: { repo?: { full_name?: string } } };
    if (pull.state !== 'closed' || pull.head?.repo?.full_name !== repository) throw new Error('Limpeza permitida apenas para PR interno fechado');
    await cleanupPreview(services, number);
    return;
  }
  if (mode !== 'prepare') throw new Error('Modo inválido');
  const sha = required('EXPECTED_SHA');
  const pull = await (await github(`/repos/${repository}/pulls/${number}`)).json();
  const context = previewContext(pull, repository, sha);
  if (context.number !== number || context.headSha !== sha) throw new Error('Evento de PR antigo');
  await cleanupPreview(services, number);
  try {
    const service = await provisionPreview(services, {
      pr: number, parentId: required('NEON_PARENT_ID'), database: required('NEON_DATABASE'), role: required('NEON_ROLE'),
      repository: `https://github.com/${repository}`, branch: context.branch,
    });
    const current = await (await github(`/repos/${repository}/pulls/${number}`)).json();
    const checked = previewContext(current, repository, sha);
    if (checked.headSha !== sha) throw new Error('PR alterado durante provisionamento');
    await appendFile(required('GITHUB_OUTPUT'), `url=${service.url}\n`);
  } catch {
    try { await cleanupPreview(services, number); } catch { console.error('Limpeza parcial falhou; reconciliação necessária.'); }
    throw new Error('Falha ao preparar preview');
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Falha no preview');
  process.exitCode = 1;
});
