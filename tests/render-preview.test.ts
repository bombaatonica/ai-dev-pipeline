import { afterEach, expect, it, vi } from 'vitest';
import { RenderPreview } from '../scripts/render-preview.js';

afterEach(() => vi.unstubAllGlobals());

it('cria serviço gratuito independente com conexão fornecida na criação', async () => {
  const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ service: { id: 'srv-123', name: 'ai-preview-pr-42', ownerId: 'owner-123', serviceDetails: { url: 'https://preview.onrender.com' } } }), { status: 201 }));
  vi.stubGlobal('fetch', mock);
  const render = new RenderPreview('owner-123', 'secret');
  const service = await render.create(42, 'https://github.com/example/repo', 'feature', 'postgresql://test:secret@example.neon.tech/db?sslmode=require');
  const body = JSON.parse(mock.mock.calls[0][1].body as string);
  expect(body.serviceDetails.plan).toBe('free');
  expect(body.envVars).toEqual([{ key: 'DATABASE_URL', value: 'postgresql://test:secret@example.neon.tech/db?sslmode=require' }]);
  expect(service.url).toBe('https://preview.onrender.com');
});

it('não remove serviço que não seja preview do PR e workspace indicados', async () => {
  const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'srv-123', name: 'production', ownerId: 'owner-123' })));
  vi.stubGlobal('fetch', mock);
  const render = new RenderPreview('owner-123', 'secret');
  await expect(render.remove(42, 'srv-123')).rejects.toThrow('Serviço não corresponde');
  expect(mock).toHaveBeenCalledTimes(1);
});

it('filtra serviços por nome exato e proprietário', async () => {
  const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify([
    { cursor: 'a', service: { id: 'srv-123', name: 'ai-preview-pr-42', ownerId: 'owner-123' } },
    { cursor: 'b', service: { id: 'srv-456', name: 'ai-preview-pr-42', ownerId: 'other' } },
  ])));
  vi.stubGlobal('fetch', mock);
  const render = new RenderPreview('owner-123', 'secret');
  expect(await render.find(42)).toEqual([{ id: 'srv-123', name: 'ai-preview-pr-42', ownerId: 'owner-123' }]);
});
