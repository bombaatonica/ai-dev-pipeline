import { afterEach, expect, it, vi } from 'vitest';
import { askClaude, fetchWithRetry, github, summary } from '../scripts/lib.js';

afterEach(() => { vi.unstubAllGlobals(); });
it('repete 503 e devolve a resposta quando recupera', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(new Response('', { status: 503 })).mockResolvedValueOnce(new Response('ok'));
  vi.stubGlobal('fetch', fetchMock);
  expect(await (await fetchWithRetry('https://example.com', {}, { backoffMs: 0 })).text()).toBe('ok');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it('não repete erros 4xx diferentes de 429', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 403 }));
  vi.stubGlobal('fetch', fetchMock);
  expect((await fetchWithRetry('https://example.com', {}, { backoffMs: 0 })).status).toBe(403);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('pede revisão e informa tokens de uso', async () => {
  vi.stubEnv('ANTHROPIC_API_KEY', 'key-test');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [{ type: 'text', text: '[]' }], usage: { input_tokens: 10, output_tokens: 5 } }))));
  expect(await askClaude('revise')).toEqual({ text: '[]', inputTokens: 10, outputTokens: 5 });
  vi.unstubAllEnvs();
});
it('envia credencial ao GitHub e trata resposta não autorizada', async () => {
  vi.stubEnv('GITHUB_TOKEN', 'test-token');
  const fetchMock = vi.fn().mockResolvedValueOnce(new Response('{}')).mockResolvedValueOnce(new Response('', { status: 403 }));
  vi.stubGlobal('fetch', fetchMock);
  expect((await github('/repos/a/b')).status).toBe(200);
  await expect(github('/repos/a/b')).rejects.toThrow('GitHub HTTP 403');
  await summary('sem arquivo de resumo');
  vi.unstubAllEnvs();
});
