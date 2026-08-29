/**
 * Small, dependency-free Markdown renderer for editorial blog bodies.
 *
 * Everything is HTML-escaped first, so authors cannot inject markup; only the constructs below are
 * turned into tags. Supported: `##`/`###`/`####` headings (with anchor ids), paragraphs, `**bold**`,
 * `*italic*`, `` `code` ``, fenced code blocks, `[text](url)` links (http/https/mailto/relative
 * only), `![alt](url)` images, `-`/`*` bullet lists, `1.` numbered lists, `>` quotes, `---` rules
 * and hard line breaks inside a paragraph.
 */

export type MarkdownHeading = { id: string; text: string; level: 2 | 3 | 4 };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeUrl(raw: string) {
  const url = raw.trim();
  if (/^(https?:|mailto:)/i.test(url) || url.startsWith('/') || url.startsWith('#')) return url;
  return null;
}

export function headingId(text: string) {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Inline syntax on already-escaped text. */
function inline(text: string): string {
  let out = text;
  // images before links (same bracket syntax)
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, src: string) => {
    const url = safeUrl(src);
    return url ? `<img src="${url}" alt="${alt}" loading="lazy" />` : alt;
  });
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) => {
    const url = safeUrl(href);
    if (!url) return label;
    const external = /^https?:/i.test(url);
    return `<a href="${url}"${external ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
  });
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  return out;
}

export function renderMarkdown(source: string): { html: string; headings: MarkdownHeading[] } {
  const lines = escapeHtml(source.replace(/\r\n?/g, '\n')).split('\n');
  const html: string[] = [];
  const headings: MarkdownHeading[] = [];
  const usedIds = new Map<string, number>();
  let paragraph: string[] = [];
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null;
  let quote: string[] = [];
  let code: string[] | null = null;

  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${inline(paragraph.join('<br />'))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list)
      html.push(
        `<${list.tag}>${list.items.map((item) => `<li>${inline(item)}</li>`).join('')}</${list.tag}>`,
      );
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) html.push(`<blockquote><p>${inline(quote.join('<br />'))}</p></blockquote>`);
    quote = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    if (code) {
      if (line.startsWith('```')) {
        html.push(`<pre><code>${code.join('\n')}</code></pre>`);
        code = null;
      } else code.push(line);
      continue;
    }
    if (line.startsWith('```')) {
      flushAll();
      code = [];
      continue;
    }
    if (!line.trim()) {
      flushAll();
      continue;
    }
    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      flushAll();
      // `#` and `##` both become h2 (the page title is the only h1); `###` → h3, `####` → h4.
      const level = Math.min(4, Math.max(2, heading[1]?.length ?? 2)) as 2 | 3 | 4;
      const text = (heading[2] ?? '').trim();
      let id = headingId(text) || 'bolum';
      const seen = usedIds.get(id) ?? 0;
      usedIds.set(id, seen + 1);
      if (seen) id = `${id}-${seen + 1}`;
      headings.push({ id, text: text.replace(/[*`_]/g, ''), level });
      html.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushAll();
      html.push('<hr />');
      continue;
    }
    const bullet = /^\s*[-*]\s+(.+)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      flushQuote();
      const tag = bullet ? 'ul' : 'ol';
      const item = (bullet ?? numbered)?.[1] ?? '';
      if (!list || list.tag !== tag) {
        flushList();
        list = { tag, items: [] };
      }
      list.items.push(item);
      continue;
    }
    const quoted = /^&gt;\s?(.*)$/.exec(line);
    if (quoted) {
      flushParagraph();
      flushList();
      quote.push(quoted[1] ?? '');
      continue;
    }
    flushList();
    flushQuote();
    paragraph.push(line.trim());
  }
  if (code) html.push(`<pre><code>${code.join('\n')}</code></pre>`);
  flushAll();
  return { html: html.join('\n'), headings };
}

/** Plain-text preview (RSS description, search snippets). */
export function markdownToText(source: string, max = 400) {
  const text = source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
