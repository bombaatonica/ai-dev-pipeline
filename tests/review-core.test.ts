import { describe, expect, it } from 'vitest';
import { filterDiff, formatReview, parseReview, redactSecrets, selectFindings, truncate } from '../scripts/review-core.js';

describe('revisão estruturada', () => {
  it('remove segredos conhecidos sem expor valores', () => {
    const awsKey = 'AKIA' + '1234567890ABCDEF';
    const githubToken = 'ghp_' + '123456789012345678901234567890123456';
    const text = `password=abc123\n${awsKey}\n${githubToken}`;
    const result = redactSecrets(text);
    expect(result).not.toContain('abc123');
    expect(result).not.toContain(awsKey);
    expect(result).not.toContain(githubToken);
  });
  it('filtra arquivos gerados e limita contexto', () => {
    const diff = 'diff --git a/package-lock.json b/package-lock.json\n+secret\ndiff --git a/src/a.ts b/src/a.ts\n+code';
    expect(filterDiff(diff)).not.toContain('secret');
    expect(filterDiff(diff)).toContain('+code');
    expect(truncate('abcdef', 3)).toBe('abc');
  });
  it('valida resultados, seleciona até cinco e ordena por severidade', () => {
    const result = parseReview(JSON.stringify([
      { severity: 'low', confidence: 0.9, file: 'a.ts', line: 1, title: 'A', explanation: 'B', suggestion: 'C' },
      { severity: 'high', confidence: 0.8, file: 'b.ts', line: 2, title: 'X', explanation: 'Y', suggestion: 'Z' },
      { severity: 'high', confidence: 5 },
    ]));
    expect(result).toHaveLength(2);
    expect(selectFindings(result)[0].file).toBe('b.ts');
    expect(formatReview(selectFindings(result))).toContain('b.ts');
    expect(parseReview('invalid')).toEqual([]);
    expect(selectFindings(Array(7).fill(result[0]))).toHaveLength(5);
  });
});
