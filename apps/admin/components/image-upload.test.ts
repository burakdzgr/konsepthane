// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadFile } from './image-upload';

afterEach(() => vi.unstubAllGlobals());
describe('shared editor image upload', () => {
  it('uploads multipart to the same-origin authenticated proxy without exposing credentials', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://media.example.org/test.webp', key: 'test' }),
    });
    vi.stubGlobal('fetch', fetcher);
    await expect(
      uploadFile(new File(['image'], 'test.webp', { type: 'image/webp' })),
    ).resolves.toEqual({ url: 'https://media.example.org/test.webp', key: 'test' });
    const args = fetcher.mock.calls[0] as [string, RequestInit];
    expect(args[0]).toBe('/admin/api/upload');
    expect(args[1].headers).toBeUndefined();
    expect(args[1].body).toBeInstanceOf(FormData);
    expect((args[1].body as FormData).get('file')).toBeInstanceOf(File);
  });
  it('rejects SVG, empty and oversize files before the request', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    await expect(
      uploadFile(new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' })),
    ).rejects.toThrow('JPEG');
    await expect(uploadFile(new File([], 'a.png', { type: 'image/png' }))).rejects.toThrow('Boş');
    await expect(
      uploadFile(new File([new Uint8Array(15_000_001)], 'a.png', { type: 'image/png' })),
    ).rejects.toThrow('15 MB');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('shows permission/expired-session failures and rejects an unsafe server URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Yetkiniz yok.' }),
      }),
    );
    const file = new File(['image'], 'a.png', { type: 'image/png' });
    await expect(uploadFile(file)).rejects.toThrow('Yetkiniz yok');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: 'javascript:alert(1)' }),
      }),
    );
    await expect(uploadFile(file)).rejects.toThrow('geçersiz');
  });
});
