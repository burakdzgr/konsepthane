import { describe, expect, it } from 'vitest';
import { headingId, markdownToText, renderMarkdown, safeContentUrl } from './index';

describe('editorial Markdown boundary', () => {
  it('renders legacy paragraphs, links, headings, nested lists and GFM tables', () => {
    const result = renderMarkdown(
      'Düz metin\nİkinci satır\n\n# Başlık\n\n## İçerik\n\n**kalın** ve *italik* ve ~~sil~~\n\n- Bir\n  - Alt\n\n| Ad | Adet |\n| --- | --- |\n| Papatya | 3 |\n\n[Kaynak](https://example.org/a?x=1&y=2)\n\n![Sarı masa](/media/masa.webp)',
    );
    expect(result.html).toContain('Düz metin<br>');
    expect(result.html).not.toContain('<h1');
    expect(result.html).toContain('<h2 id="baslik">');
    expect(result.html).toContain('<strong>kalın</strong>');
    expect(result.html).toContain('<s>sil</s>');
    expect(result.html).toContain('<table>');
    expect(result.html).toContain('<td>Papatya</td>');
    expect(result.html).toContain('rel="noopener noreferrer"');
    expect(result.images).toEqual([{ url: '/media/masa.webp', alt: 'Sarı masa' }]);
  });
  it('keeps heading ids unique even when an explicit suffix is already present', () => {
    const { headings } = renderMarkdown('## Aynı\n\n## Aynı\n\n## Aynı-2\n\n## Aynı');
    expect(new Set(headings.map((h) => h.id)).size).toBe(4);
    expect(headingId('Çığ ÖŞÜ')).toBe('cig-osu');
  });
  it.each([
    '<script>alert(1)</script>',
    '<img src=x onerror="alert(1)">',
    '[x](javascript:alert%281%29)',
    '[x](jav&#x61;script:alert%281%29)',
    '[x](data:text/html,evil)',
    '[x](//evil.example)',
    '[x](/\\evil.example)',
    '![x](data:image/svg+xml,evil)',
    '![x](mailto:x@example.org)',
    '<iframe src="https://evil.example"></iframe>',
    '![a" onerror="alert(1)](https://example.org/a.png)',
  ])('never creates executable markup from %s', (source) => {
    const { html } = renderMarkdown(source);
    expect(html).not.toMatch(/<(?:script|iframe|svg)\b/i);
    expect(html).not.toMatch(/(?:href|src)="(?:javascript:|data:|mailto:|\/\/|\/\\)/i);
    expect(html).not.toMatch(/<img[^>]*\sonerror="/i);
  });
  it.each([
    'javascript:alert(1)',
    'java\nscript:alert(1)',
    '//evil.test',
    '/\\evil.test',
    'https://user:pass@example.org',
    'data:image/png;base64,abc',
    'file:///tmp/a',
  ])('rejects dangerous URL %s', (url) => {
    expect(safeContentUrl(url)).toBeNull();
  });
  it('allows relative anchors, root paths and https without interpreting HTML', () => {
    expect(safeContentUrl('#malzemeler')).toBe('#malzemeler');
    expect(safeContentUrl('/tr/rehber/evde')).toBe('/tr/rehber/evde');
    expect(safeContentUrl('https://example.org')).toBe('https://example.org');
    expect(safeContentUrl('#malzemeler', true)).toBeNull();
    expect(
      markdownToText('## Başlık\n\n**Yazı** [kaynak](https://example.org)\n\n![foto](/a.jpg)'),
    ).toBe('Başlık Yazı kaynak');
  });
});
