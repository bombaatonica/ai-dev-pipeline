type NeonBranch = { id: string; name: string; default?: boolean; protected?: boolean; primary?: boolean };

function branchName(pr: number): string {
  if (!Number.isSafeInteger(pr) || pr < 1) throw new Error('Número de PR inválido');
  return `ai-preview-pr-${pr}`;
}
function branchId(id: string): string {
  if (!/^br-[a-z0-9-]+$/.test(id)) throw new Error('ID de branch inválido');
  return id;
}

/** Cliente isolado: não executa operações até que seus métodos sejam chamados. */
export class NeonPreview {
  private readonly root: string;
  constructor(projectId: string, private readonly apiKey: string) {
    if (!/^[a-z0-9-]+$/.test(projectId) || !apiKey) throw new Error('Configuração Neon inválida');
    this.root = `https://console.neon.tech/api/v2/projects/${projectId}`;
  }
  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    const response = await fetch(`${this.root}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${this.apiKey}`, accept: 'application/json', 'content-type': 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Neon HTTP ${response.status}`);
    return response.json() as Promise<unknown>;
  }
  async create(pr: number, parentId: string): Promise<NeonBranch> {
    const name = branchName(pr);
    const result = await this.request('/branches', {
      method: 'POST',
      body: JSON.stringify({ branch: { name, parent_id: branchId(parentId) }, endpoints: [{ type: 'read_write' }] }),
    }) as { branch?: NeonBranch };
    if (!result.branch || result.branch.name !== name) throw new Error('Resposta Neon inválida');
    branchId(result.branch.id);
    return result.branch;
  }
  async connectionUri(id: string, database: string, role: string): Promise<string> {
    if (!database || !role) throw new Error('Banco ou role Neon ausente');
    const params = new URLSearchParams({ branch_id: branchId(id), database_name: database, role_name: role });
    const result = await this.request(`/connection_uri?${params}`) as { uri?: unknown };
    if (typeof result.uri !== 'string') throw new Error('URI Neon inválida');
    const uri = new URL(result.uri);
    if (!['postgres:', 'postgresql:'].includes(uri.protocol) || !uri.hostname.endsWith('.neon.tech') || uri.searchParams.get('sslmode') !== 'require') throw new Error('URI Neon inválida');
    return result.uri;
  }
  async find(pr: number): Promise<NeonBranch[]> {
    const name = branchName(pr);
    const matches: NeonBranch[] = [];
    let cursor = '';
    for (let page = 0; page < 100; page++) {
      const params = new URLSearchParams({ search: name, limit: '100' });
      if (cursor) params.set('cursor', cursor);
      const result = await this.request(`/branches?${params}`) as { branches?: NeonBranch[]; pagination?: { next?: string } };
      if (!Array.isArray(result.branches)) throw new Error('Lista Neon inválida');
      matches.push(...result.branches.filter((branch) => branch.name === name));
      const next = result.pagination?.next;
      if (!next) return matches;
      if (next === cursor) throw new Error('Paginação Neon inválida');
      cursor = next;
    }
    throw new Error('Limite de páginas Neon excedido');
  }
  async remove(pr: number, id: string): Promise<void> {
    const expected = branchName(pr);
    const path = `/branches/${branchId(id)}`;
    const result = await this.request(path) as { branch?: NeonBranch };
    if (!result.branch || result.branch.id !== id || result.branch.name !== expected || result.branch.default !== false || result.branch.protected !== false || result.branch.primary === true) throw new Error('Branch não corresponde ao preview');
    await this.request(path, { method: 'DELETE' });
  }
}
