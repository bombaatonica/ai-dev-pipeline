import { appendFile } from 'node:fs/promises';

export async function fetchWithRetry(url: string, init: RequestInit = {}, options: { attempts?: number; timeoutMs?: number; backoffMs?: number } = {}): Promise<Response> {
  const attempts = options.attempts ?? 3;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if ((response.status !== 429 && response.status < 500) || attempt === attempts - 1) return response;
      await response.body?.cancel();
    } finally { clearTimeout(timeout); }
    await new Promise((resolve) => setTimeout(resolve, (options.backoffMs ?? 500) * 2 ** attempt));
  }
  throw new Error('Nenhuma tentativa disponível');
}

export async function askAI(prompt: string): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const provider = process.env.AI_PROVIDER || (!process.env.AI_API_KEY && process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'openai-compatible');
  if (provider !== 'openai-compatible' && provider !== 'anthropic') throw new Error('Provedor de IA não suportado');
  const key = process.env.AI_API_KEY || (provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : undefined);
  if (!key) throw new Error('AI_API_KEY ausente');
  const model = process.env.AI_MODEL || (provider === 'anthropic' ? process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5' : 'gpt-4.1-mini');
  let base: URL;
  try { base = new URL(process.env.AI_BASE_URL || (provider === 'anthropic' ? 'https://api.anthropic.com/v1' : 'https://api.openai.com/v1')); }
  catch { throw new Error('URL de IA inválida'); }
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw new Error('URL de IA inválida');
  const endpoint = `${base.toString().replace(/\/$/, '')}/${provider === 'anthropic' ? 'messages' : 'chat/completions'}`;
  const tokenParam = provider === 'anthropic' ? 'max_tokens' : process.env.AI_TOKEN_PARAM || 'max_completion_tokens';
  if (tokenParam !== 'max_tokens' && tokenParam !== 'max_completion_tokens') throw new Error('Parâmetro de tokens inválido');
  const headers: Record<string, string> = provider === 'anthropic'
    ? { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }
    : { 'content-type': 'application/json', authorization: `Bearer ${key}` };
  const response = await fetchWithRetry(endpoint, {
    method: 'POST', headers, redirect: 'error',
    body: JSON.stringify({ model, [tokenParam]: 1200, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!response.ok) throw new Error(`Provedor de IA HTTP ${response.status}`);
  const data = await response.json() as {
    content?: Array<{ type: string; text?: string }>;
    choices?: Array<{ message?: { content?: unknown } }>;
    usage?: { input_tokens?: number; output_tokens?: number; prompt_tokens?: number; completion_tokens?: number };
  };
  const text = provider === 'anthropic'
    ? data.content?.filter((item) => item.type === 'text').map((item) => item.text ?? '').join('')
    : data.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) throw new Error('Resposta de IA inválida');
  return { text, inputTokens: data.usage?.input_tokens ?? data.usage?.prompt_tokens ?? 0, outputTokens: data.usage?.output_tokens ?? data.usage?.completion_tokens ?? 0 };
}

export function describeAIError(error: unknown): string {
  if (!(error instanceof Error)) return 'Erro não identificado';
  const safeMessages = ['AI_API_KEY ausente', 'Provedor de IA não suportado', 'URL de IA inválida', 'Parâmetro de tokens inválido', 'Resposta de IA inválida', 'Resposta inválida da IA'];
  if (safeMessages.includes(error.message) || /^Provedor de IA HTTP [1-5]\d{2}$/.test(error.message)) return error.message;
  if (error instanceof SyntaxError) return 'Resposta JSON inválida';
  if (error.name === 'AbortError' || error.name === 'TimeoutError') return 'Tempo limite excedido';
  return 'Erro não identificado';
}

export async function github(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetchWithRetry(`https://api.github.com${path}`, { ...init, headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...init.headers } });
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
  return response;
}
export async function summary(text: string): Promise<void> {
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
}
