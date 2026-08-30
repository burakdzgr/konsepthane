import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { Markdown } from '@tiptap/markdown';
import { safeContentUrl } from '@ilham/content';

/** Image URLs are checked on pasted HTML as well as on toolbar insertion. */
const SafeImage = Image.extend({
  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (element) =>
          safeContentUrl(element.getAttribute('src') ?? '', true) ? null : false,
      },
    ];
  },
});

export function editorialExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      underline: false,
      link: {
        openOnClick: false,
        autolink: false,
        isAllowedUri: (url) => safeContentUrl(url) !== null,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      },
    }),
    SafeImage.configure({ allowBase64: false, HTMLAttributes: { referrerpolicy: 'no-referrer' } }),
    // Keep tables Markdown-compatible: no merged cells or visual-only width controls.
    TableKit.configure({ table: { resizable: false } }),
    Markdown.configure({ markedOptions: { gfm: true, breaks: true } }),
  ];
}
