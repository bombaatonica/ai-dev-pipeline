import { afterEach, describe, expect, it, vi } from 'vitest';
import { NeonPreview } from '../scripts/neon-preview.js';

afterEach(() => vi.unstubAllGlobals());

describe('branches Neon para previews', () => {
  it('cria branch dedicada e consulta URI usando o ID explícito', async () => {
    const mock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ branch: { id: 'br-preview-123', name: 'ai-preview-pr-42' } }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ uri: 'postgresql://test:secret@example.neon.tech/neondb?sslmode=require' })));
    vi.stubGlobal('fetch', mock);
    const neon = new NeonPreview('project-123', 'api-key');
    const branch = await neon.create(42, 'br-parent-123');
    expect(branch.id).toBe('br-preview-123');
    expect(await neon.connectionUri(branch.id, 'neondb', 'owner')).toContain('example.neon.tech');
    const body = JSON.parse(mock.mock.calls[0][1].body as string);
    expect(body.branch).toEqual({ name: 'ai-preview-pr-42', parent_id: 'br-parent-123' });
    expect(String(mock.mock.calls[1][0])).toContain('branch_id=br-preview-123');
  });
  it('não remove branch principal ou com nome diferente do PR', async () => {
    const mock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ branch: { id: 'br-main', name: 'main', default: true } })));
    vi.stubGlobal('fetch', mock);
    const neon = new NeonPreview('project-123', 'api-key');
    await expect(neon.remove(42, 'br-main')).rejects.toThrow('Branch não corresponde');
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it('remove somente a branch de preview correspondente', async () => {
    const mock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ branch: { id: 'br-preview-123', name: 'ai-preview-pr-42', default: false, protected: false } })))
      .mockResolvedValueOnce(new Response('{}'));
    vi.stubGlobal('fetch', mock);
    const neon = new NeonPreview('project-123', 'api-key');
    await neon.remove(42, 'br-preview-123');
    expect(mock.mock.calls[1][1].method).toBe('DELETE');
  });
  it('recusa apagar quando API não confirma que a branch é não protegida', async () => {
    const mock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ branch: { id: 'br-preview-123', name: 'ai-preview-pr-42', default: false } })));
    vi.stubGlobal('fetch', mock);
    await expect(new NeonPreview('project-123', 'key').remove(42, 'br-preview-123')).rejects.toThrow('Branch não corresponde');
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it('lista todas as páginas e seleciona somente o nome exato', async () => {
    const mock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ branches: [{ id: 'br-a', name: 'ai-preview-pr-420' }], pagination: { next: 'next-page' } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ branches: [{ id: 'br-b', name: 'ai-preview-pr-42' }], pagination: {} })));
    vi.stubGlobal('fetch', mock);
    const neon = new NeonPreview('project-123', 'api-key');
    expect(await neon.find(42)).toEqual([{ id: 'br-b', name: 'ai-preview-pr-42' }]);
    expect(String(mock.mock.calls[1][0])).toContain('cursor=next-page');
  });
});
