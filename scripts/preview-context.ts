interface PullRequest {
  number: number;
  state: string;
  head: { sha: string; ref: string; repo: { full_name: string } | null };
  base: { repo: { full_name: string } | null };
  merge_commit_sha: string | null;
}

export function previewContext(pr: PullRequest, repository: string, ciSha: string): { number: number; headSha: string; branch: string } {
  if (!Number.isSafeInteger(pr.number) || pr.number < 1 || pr.state !== 'open' ||
      pr.head.repo?.full_name !== repository || pr.base.repo?.full_name !== repository ||
      !/^[a-f0-9]{40}$/.test(pr.head.sha) || !/^[a-f0-9]{40}$/.test(ciSha) ||
      (ciSha !== pr.head.sha && ciSha !== pr.merge_commit_sha) || !pr.head.ref) {
    throw new Error('PR inválido, externo ou desatualizado');
  }
  return { number: pr.number, headSha: pr.head.sha, branch: pr.head.ref };
}
