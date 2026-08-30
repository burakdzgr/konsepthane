import MarkdownIt from 'markdown-it';
type Token = ReturnType<ReturnType<typeof MarkdownIt>['parse']>[number];

export type MarkdownHeading = { id: string; text: string; level: 2 | 3 | 4 };

/** One URL policy for editor input and server output. Never accept protocol-relative URLs. */
export function safeContentUrl(raw: string, image = false): string | null {
  const url = raw.trim();
  if (
    !url ||
    url.includes('\\') ||
    [...url].some((char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127)
  )
    return null;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  if (!image && url.startsWith('#')) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.hostname && !parsed.username && !parsed.password ? url : null;
    }
    if (!image && parsed.protocol === 'mailto:') return url;
  } catch {
    /* Relative non-root paths and invalid URLs are intentionally rejected. */
  }
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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// HTML stays text even for administrators. No scripts, event attributes, iframes or SVG embeds.
const markdown = new MarkdownIt({ html: false, breaks: true, linkify: false, typographer: false });
markdown.validateLink = (url) => safeContentUrl(url) !== null;
markdown.renderer.rules.link_open = (tokens, index, options, _env, self) => {
  const token = tokens[index]!;
  if (/^https?:/i.test(String(token.attrGet('href') ?? ''))) {
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noopener noreferrer');
  }
  return self.renderToken(tokens, index, options);
};
const originalImage = markdown.renderer.rules.image!;
markdown.renderer.rules.image = (tokens, index, options, env, self) => {
  const token = tokens[index]!;
  if (!safeContentUrl(String(token.attrGet('src') ?? ''), true)) {
    return markdown.utils.escapeHtml(token.content);
  }
  token.attrSet('loading', 'lazy');
  token.attrSet('decoding', 'async');
  token.attrSet('referrerpolicy', 'no-referrer');
  return originalImage(tokens, index, options, env, self);
};

function inlineText(tokens: Token[]): string {
  return tokens
    .map((token) => {
      if (token.type === 'image') return '';
      if (token.type === 'softbreak' || token.type === 'hardbreak') return ' ';
      return token.children ? inlineText(token.children) : token.content;
    })
    .join('');
}

/** Shared by public SSR and editor preview; only trusted parser-generated HTML is emitted. */
export function renderMarkdown(
  source: string,
  prefix = '',
): {
  html: string;
  headings: MarkdownHeading[];
  images: Array<{ url: string; alt: string }>;
} {
  const tokens = markdown.parse(source.replace(/\r\n?/g, '\n'), {});
  const headings: MarkdownHeading[] = [];
  const images: Array<{ url: string; alt: string }> = [];
  const usedIds = new Set<string>();
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]!;
    if (token.type === 'heading_open') {
      const level = Math.min(4, Math.max(2, Number(token.tag.slice(1)))) as 2 | 3 | 4;
      const text = inlineText(tokens[index + 1]?.children ?? []);
      const base = `${prefix}${headingId(text) || 'bolum'}`;
      let id = base;
      let suffix = 2;
      while (usedIds.has(id)) id = `${base}-${suffix++}`;
      usedIds.add(id);
      token.tag = `h${level}`;
      token.attrSet('id', id);
      if (tokens[index + 2]?.type === 'heading_close') tokens[index + 2]!.tag = token.tag;
      headings.push({ id, text, level });
    }
    for (const child of token.children ?? []) {
      if (child.type !== 'image') continue;
      const url = safeContentUrl(String(child.attrGet('src') ?? ''), true);
      if (url) images.push({ url, alt: inlineText(child.children ?? []) });
    }
  }
  return { html: markdown.renderer.render(tokens, markdown.options, {}), headings, images };
}

export function markdownToText(source: string, max = 400) {
  const text = markdown
    .parse(source, {})
    .filter((token) => token.type === 'inline')
    .map((token) => inlineText(token.children ?? []))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…` : text;
}
