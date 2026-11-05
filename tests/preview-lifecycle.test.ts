import { describe, expect, it, vi } from 'vitest';
import { cleanupPreview, provisionPreview } from '../scripts/preview-lifecycle.js';

function services() {
  return {
    neon: { find: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: 'br-123' }), connectionUri: vi.fn().mockResolvedValue('postgres://preview'), remove: vi.fn().mockResolvedValue(undefined) },
    render: { find: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: 'srv-123', url: 'https://preview.onrender.com' }), remove: vi.fn().mockResolvedValue(undefined) },
  };
}

describe('ciclo de vida do preview', () => {
  it('cria branch e serviço usando apenas a conexão da branch nova', async () => {
    const { neon, render } = services();
    const result = await provisionPreview({ neon, render }, { pr: 42, parentId: 'br-parent', database: 'neondb', role: 'owner', repository: 'https://github.com/a/b', branch: 'feature' });
    expect(neon.create).toHaveBeenCalledWith(42, 'br-parent');
    expect(neon.connectionUri).toHaveBeenCalledWith('br-123', 'neondb', 'owner');
    expect(render.create).toHaveBeenCalledWith(42, 'https://github.com/a/b', 'feature', 'postgres://preview');
    expect(result.url).toBe('https://preview.onrender.com');
  });
  it('recusa criação quando existem recursos antigos para o mesmo PR', async () => {
    const { neon, render } = services();
    render.find.mockResolvedValue([{ id: 'srv-old' }]);
    await expect(provisionPreview({ neon, render }, { pr: 42, parentId: 'br-parent', database: 'neondb', role: 'owner', repository: 'https://github.com/a/b', branch: 'feature' })).rejects.toThrow('Recursos existentes');
    expect(neon.create).not.toHaveBeenCalled();
  });
  it('remove serviço antes do banco e não apaga banco se falhar', async () => {
    const { neon, render } = services();
    render.find.mockResolvedValue([{ id: 'srv-old' }]);
    neon.find.mockResolvedValue([{ id: 'br-old' }]);
    render.remove.mockRejectedValue(new Error('falha'));
    await expect(cleanupPreview({ neon, render }, 42)).rejects.toThrow('falha');
    expect(neon.remove).not.toHaveBeenCalled();
  });
  it('reconcilia recursos remanescentes antes de remover as branches', async () => {
    const { neon, render } = services();
    render.find.mockResolvedValueOnce([{ id: 'srv-old' }]).mockResolvedValueOnce([]);
    neon.find.mockResolvedValue([{ id: 'br-old' }]);
    await cleanupPreview({ neon, render }, 42);
    expect(render.remove).toHaveBeenCalledWith(42, 'srv-old');
    expect(neon.remove).toHaveBeenCalledWith(42, 'br-old');
    expect(render.remove.mock.invocationCallOrder[0]).toBeLessThan(neon.remove.mock.invocationCallOrder[0]);
  });
});
