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

export async function askClaude(prompt: string): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY ausente');
  const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5', max_tokens: 1200, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!response.ok) throw new Error(`Anthropic HTTP ${response.status}`);
  const data = await response.json() as { content?: Array<{ type: string; text?: string }>; usage?: { input_tokens?: number; output_tokens?: number } };
  return { text: data.content?.filter((item) => item.type === 'text').map((item) => item.text ?? '').join('') ?? '', inputTokens: data.usage?.input_tokens ?? 0, outputTokens: data.usage?.output_tokens ?? 0 };
}

export async function github(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetchWithRetry(`https://api.github.com${path}`, { ...init, headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...init.headers } });
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
  return response;
}
export async function summary(text: string): Promise<void> {
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
}
