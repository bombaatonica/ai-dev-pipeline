import { describe, expect, it } from 'vitest';
import { previewContext } from '../scripts/preview-context.js';

const sha = 'a'.repeat(40);
const merged = 'b'.repeat(40);
const pr = { number: 42, state: 'open', head: { sha, ref: 'feature', repo: { full_name: 'owner/repo' } }, base: { repo: { full_name: 'owner/repo' } }, merge_commit_sha: merged };

describe('contexto confiável de preview', () => {
  it('aceita o head atual ou o merge de teste associado ao PR interno', () => {
    expect(previewContext(pr, 'owner/repo', sha).headSha).toBe(sha);
    expect(previewContext(pr, 'owner/repo', merged).number).toBe(42);
  });
  it('recusa fork, PR fechado e execução de CI antiga', () => {
    expect(() => previewContext({ ...pr, state: 'closed' }, 'owner/repo', sha)).toThrow();
    expect(() => previewContext({ ...pr, head: { ...pr.head, repo: { full_name: 'attacker/repo' } } }, 'owner/repo', sha)).toThrow();
    expect(() => previewContext(pr, 'owner/repo', 'c'.repeat(40))).toThrow();
  });
});
