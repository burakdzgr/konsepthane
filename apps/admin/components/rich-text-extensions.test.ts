// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { renderMarkdown } from '@ilham/content';
import { editorialExtensions } from './rich-text-extensions';
import { contentValidation } from './rich-text-validation';

const editors: Editor[] = [];
function makeEditor(content: string) {
  const editor = new Editor({
    element: document.createElement('div'),
    extensions: editorialExtensions(),
    content: renderMarkdown(content).html,
    injectCSS: false,
  });
  editors.push(editor);
  return editor;
}
afterEach(() => editors.splice(0).forEach((editor) => editor.destroy()));

describe('visual editor storage round trip', () => {
  it('preserves Turkish text, formatting, links, table data and image alt text', () => {
    const source =
      '## Papatya masası\n\nSarı **peçete** ve *beyaz* tabak.\n\n- Malzeme\n  - Kağıt\n\n| Ürün | Adet |\n| --- | --- |\n| Papatya | 3 |\n\n[Rehber](/tr/rehber/test)\n\n![Sarı papatyalı masa](/media/masa.webp)\n\n> Bir not';
    const editor = makeEditor(source);
    const saved = editor.getMarkdown();
    const result = renderMarkdown(saved);
    expect(result.html).toContain('<strong>peçete</strong>');
    expect(result.html).toContain('<td>Papatya</td>');
    expect(result.html).toContain('href="/tr/rehber/test"');
    expect(result.html).toContain('<blockquote>');
    expect(result.images).toEqual([{ url: '/media/masa.webp', alt: 'Sarı papatyalı masa' }]);
    expect(makeEditor(saved).getMarkdown()).toBe(saved);
  });
  it('escapes literal HTML from legacy content rather than activating it in the editor', () => {
    const editor = makeEditor('<img src=x onerror="alert(1)">\n\n<script>evil()</script>');
    expect(editor.getHTML()).not.toContain('<script>');
    expect(editor.getHTML()).not.toContain('<img');
    expect(editor.getText()).toContain('<script>');
  });
  it('rejects pasted data images and executable links', () => {
    const editor = makeEditor('İçerik');
    editor.commands.setContent(
      '<p><a href="javascript:alert(1)">link</a></p><img src="data:image/png;base64,AAA">',
    );
    expect(editor.getHTML()).not.toContain('javascript:');
    expect(editor.getHTML()).not.toContain('data:image');
  });
  it('keeps source validation aligned with API limits', () => {
    expect(contentValidation('', true, 20, 60)).not.toBe('');
    expect(contentValidation('az', true, 20, 60)).not.toBe('');
    expect(contentValidation('x'.repeat(61), true, 20, 60)).not.toBe('');
    expect(contentValidation('x'.repeat(20), true, 20, 60)).toBe('');
    expect(contentValidation('', false, 0, 60)).toBe('');
  });
});
