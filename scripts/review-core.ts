export interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  file: string;
  line: number;
  title: string;
  explanation: string;
  suggestion: string;
}

export function redactSecrets(text: string): string {
  return text
    .replace(/-----BEGIN [^-\r\n]*PRIVATE KEY-----[\s\S]*?-----END [^-\r\n]*PRIVATE KEY-----/g, '[REDACTED]')
    .replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, '[REDACTED]')
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-ant-[A-Za-z0-9_-]+|sk-[A-Za-z0-9_-]{20,})/g, '[REDACTED]')
    .replace(/\b(password\s*=\s*)(?:"[^"]*"|'[^']*'|[^\s]+)/gi, '$1[REDACTED]');
}
export function filterDiff(diff: string): string {
  return diff.split(/(?=^diff --git )/m).filter((part) => {
    const match = /^diff --git a\/(.+?) b\/(.+)$/m.exec(part);
    if (!match) return false;
    return ![match[1], match[2]].some((path) => /(^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock|dist|coverage|__snapshots__)(?:\/|$)|\.snap$/.test(path));
  }).join('');
}
export function truncate(text: string, max: number): string { return text.slice(0, Math.max(0, max)); }
export function parseReview(text: string): Finding[] {
  let data: unknown;
  try { data = JSON.parse(text); } catch { return []; }
  if (!Array.isArray(data)) return [];
  return data.filter((item): item is Finding => {
    if (typeof item !== 'object' || item === null) return false;
    const record = item as Record<string, unknown>;
    return ['critical', 'high', 'medium', 'low'].includes(String(record.severity)) &&
      typeof record.confidence === 'number' && record.confidence >= 0 && record.confidence <= 1 &&
      typeof record.line === 'number' && Number.isSafeInteger(record.line) && record.line > 0 &&
      ['file', 'title', 'explanation', 'suggestion'].every((key) => typeof record[key] === 'string' && (record[key] as string).trim().length > 0);
  });
}
export function selectFindings(items: Finding[]): Finding[] {
  const priority = { critical: 0, high: 1, medium: 2, low: 3 };
  return items.filter((item) => item.confidence >= 0.7).sort((a, b) => priority[a.severity] - priority[b.severity] || b.confidence - a.confidence).slice(0, 5);
}
export function formatReview(items: Finding[]): string {
  if (!items.length) return 'Nenhum apontamento de alta confiança.';
  return items.map((item) => `### ${item.severity.toUpperCase()}: ${item.title}\n\n${item.file}:${item.line} — confiança ${item.confidence}\n\n${item.explanation}\n\nSugestão: ${item.suggestion}`).join('\n\n');
}
