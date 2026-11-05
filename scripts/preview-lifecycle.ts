interface NeonService {
  find(pr: number): Promise<Array<{ id: string }>>;
  create(pr: number, parentId: string): Promise<{ id: string }>;
  connectionUri(id: string, database: string, role: string): Promise<string>;
  remove(pr: number, id: string): Promise<void>;
}
interface RenderService {
  find(pr: number): Promise<Array<{ id: string }>>;
  create(pr: number, repo: string, branch: string, uri: string): Promise<{ id: string; url: string }>;
  remove(pr: number, id: string): Promise<void>;
}
type Services = { neon: NeonService; render: RenderService };
type Config = { pr: number; parentId: string; database: string; role: string; repository: string; branch: string };

/** Chamador deve serializar operações para cada PR entre workflows e execuções. */
export async function provisionPreview(services: Services, config: Config): Promise<{ id: string; url: string }> {
  const oldServices = await services.render.find(config.pr);
  const oldBranches = await services.neon.find(config.pr);
  if (oldServices.length || oldBranches.length) throw new Error('Recursos existentes: execute limpeza antes de provisionar');
  const branch = await services.neon.create(config.pr, config.parentId);
  const uri = await services.neon.connectionUri(branch.id, config.database, config.role);
  return services.render.create(config.pr, config.repository, config.branch, uri);
}

/** Não remova o banco se a listagem ou a exclusão do serviço falhar. */
export async function cleanupPreview(services: Services, pr: number): Promise<void> {
  const deployments = await services.render.find(pr);
  for (const service of deployments) await services.render.remove(pr, service.id);
  const remaining = await services.render.find(pr);
  if (remaining.length) throw new Error('Serviço Render ainda presente');
  const branches = await services.neon.find(pr);
  for (const branch of branches) await services.neon.remove(pr, branch.id);
}
