import { afterEach, expect, it, vi } from 'vitest';
import { askAI, describeAIError, fetchWithRetry, github, summary } from '../scripts/lib.js';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
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
it('usa OpenAI por padrão e normaliza o uso de tokens', async () => {
  vi.stubEnv('AI_PROVIDER', '');
  vi.stubEnv('AI_API_KEY', 'test-key');
  vi.stubEnv('AI_MODEL', 'gpt-4.1-mini');
  vi.stubEnv('AI_BASE_URL', '');
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '[]' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } })));
  vi.stubGlobal('fetch', fetchMock);
  expect(await askAI('revise')).toEqual({ text: '[]', inputTokens: 10, outputTokens: 5 });
  expect(fetchMock.mock.calls[0][0]).toBe('https://api.openai.com/v1/chat/completions');
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  expect(init.headers).toMatchObject({ authorization: 'Bearer test-key' });
  expect(JSON.parse(String(init.body))).toMatchObject({ model: 'gpt-4.1-mini', max_completion_tokens: 1200 });
  expect(init.redirect).toBe('error');
});
it('permite endpoint compatível e limite max_tokens quando configurado', async () => {
  vi.stubEnv('AI_PROVIDER', 'openai-compatible');
  vi.stubEnv('AI_API_KEY', 'test-key');
  vi.stubEnv('AI_MODEL', 'vendor/model');
  vi.stubEnv('AI_BASE_URL', 'https://example.com/api/v1/');
  vi.stubEnv('AI_TOKEN_PARAM', 'max_tokens');
  const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '[]' } }] })));
  vi.stubGlobal('fetch', mock);
  expect(await askAI('revise')).toEqual({ text: '[]', inputTokens: 0, outputTokens: 0 });
  expect(mock.mock.calls[0][0]).toBe('https://example.com/api/v1/chat/completions');
  expect(JSON.parse(String(mock.mock.calls[0][1].body))).toMatchObject({ max_tokens: 1200 });
});
it('permite Anthropic nativa com configuração anterior', async () => {
  vi.stubEnv('AI_PROVIDER', 'anthropic');
  vi.stubEnv('AI_API_KEY', '');
  vi.stubEnv('ANTHROPIC_API_KEY', 'key-test');
  const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [{ type: 'text', text: '[]' }], usage: { input_tokens: 10, output_tokens: 5 } })));
  vi.stubGlobal('fetch', mock);
  expect(await askAI('revise')).toEqual({ text: '[]', inputTokens: 10, outputTokens: 5 });
  expect(mock.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/messages');
  expect(mock.mock.calls[0][1].headers).toMatchObject({ 'x-api-key': 'key-test' });
});
it('recusa chave ausente e endpoint inseguro sem enviar dados', async () => {
  vi.stubEnv('AI_PROVIDER', 'openai-compatible');
  vi.stubEnv('AI_API_KEY', '');
  const mock = vi.fn();
  vi.stubGlobal('fetch', mock);
  await expect(askAI('revise')).rejects.toThrow('AI_API_KEY');
  vi.stubEnv('AI_API_KEY', 'test-key');
  vi.stubEnv('AI_BASE_URL', 'http://example.com/v1');
  await expect(askAI('revise')).rejects.toThrow('URL');
  expect(mock).not.toHaveBeenCalled();
});
it('rejeita falha HTTP e resposta incompatível', async () => {
  vi.stubEnv('AI_PROVIDER', 'openai-compatible');
  vi.stubEnv('AI_API_KEY', 'test-key');
  const mock = vi.fn().mockResolvedValueOnce(new Response('', { status: 403 })).mockResolvedValueOnce(new Response('{}'));
  vi.stubGlobal('fetch', mock);
  await expect(askAI('revise')).rejects.toThrow('HTTP 403');
  await expect(askAI('revise')).rejects.toThrow('Resposta');
});
it('resume erros HTTP sem expor conteúdo inesperado ou credenciais', () => {
  expect(describeAIError(new Error('Provedor de IA HTTP 429'))).toBe('Provedor de IA HTTP 429');
  expect(describeAIError(new Error('AI_API_KEY ausente'))).toBe('AI_API_KEY ausente');
  expect(describeAIError(new Error('segredo ou conteúdo inesperado'))).toBe('Erro não identificado');
  expect(describeAIError(new Error('Provedor de IA HTTP 429 token=segredo'))).toBe('Erro não identificado');
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
