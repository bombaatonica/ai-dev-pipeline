type RenderService = { id: string; name: string; ownerId: string; serviceDetails?: { url?: string } };
function previewName(pr: number): string {
  if (!Number.isSafeInteger(pr) || pr < 1) throw new Error('Número de PR inválido');
  return `ai-preview-pr-${pr}`;
}
function serviceId(id: string): string {
  if (!/^srv-[a-z0-9]+$/.test(id)) throw new Error('ID de serviço inválido');
  return id;
}
export class RenderPreview {
  constructor(private readonly ownerId: string, private readonly apiKey: string) {
    if (!/^[a-z0-9-]+$/.test(ownerId) || !apiKey) throw new Error('Configuração Render inválida');
  }
  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    const response = await fetch(`https://api.render.com/v1${path}`, {
      ...init,
      headers: { authorization: `Bearer ${this.apiKey}`, accept: 'application/json', 'content-type': 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Render HTTP ${response.status}`);
    if (response.status === 204) return undefined;
    return response.json() as Promise<unknown>;
  }
  async create(pr: number, repository: string, branch: string, databaseUrl: string): Promise<{ id: string; url: string }> {
    const name = previewName(pr);
    const repo = new URL(repository);
    const database = new URL(databaseUrl);
    if (repo.protocol !== 'https:' || repo.hostname !== 'github.com' || !/^\/[\w.-]+\/[\w.-]+$/.test(repo.pathname) || repo.username || repo.password || repo.search || repo.hash) throw new Error('Repositório inválido');
    if (!branch || branch.length > 255 || [...branch].some((char) => char.charCodeAt(0) < 32)) throw new Error('Branch inválida');
    if (!['postgres:', 'postgresql:'].includes(database.protocol) || !database.hostname.endsWith('.neon.tech') || database.searchParams.get('sslmode') !== 'require') throw new Error('Banco de preview inválido');
    const result = await this.request('/services', {
      method: 'POST',
      body: JSON.stringify({
        type: 'web_service', name, ownerId: this.ownerId, repo: repository, branch,
        autoDeployTrigger: 'off', envVars: [{ key: 'DATABASE_URL', value: databaseUrl }],
        serviceDetails: { runtime: 'docker', plan: 'free', healthCheckPath: '/health' },
      }),
    }) as { service?: RenderService };
    const service = result.service;
    if (!service || service.name !== name || service.ownerId !== this.ownerId || !service.serviceDetails?.url) throw new Error('Resposta Render inválida');
    const url = new URL(service.serviceDetails.url);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.onrender.com')) throw new Error('URL Render inválida');
    return { id: serviceId(service.id), url: url.toString().replace(/\/$/, '') };
  }
  async find(pr: number): Promise<RenderService[]> {
    const name = previewName(pr);
    const matches: RenderService[] = [];
    let cursor = '';
    for (let page = 0; page < 100; page++) {
      const params = new URLSearchParams({ name, ownerId: this.ownerId, limit: '100' });
      if (cursor) params.set('cursor', cursor);
      const result = await this.request(`/services?${params}`) as Array<{ service: RenderService; cursor: string }>;
      if (!Array.isArray(result)) throw new Error('Lista Render inválida');
      matches.push(...result.map((item) => item.service).filter((service) => service.name === name && service.ownerId === this.ownerId));
      if (result.length < 100) return matches;
      const next = result[result.length - 1].cursor;
      if (!next || next === cursor) throw new Error('Paginação Render inválida');
      cursor = next;
    }
    throw new Error('Limite de páginas Render excedido');
  }
  async remove(pr: number, id: string): Promise<void> {
    const path = `/services/${serviceId(id)}`;
    const service = await this.request(path) as RenderService;
    if (service.id !== id || service.name !== previewName(pr) || service.ownerId !== this.ownerId) throw new Error('Serviço não corresponde ao preview');
    await this.request(path, { method: 'DELETE' });
  }
}
