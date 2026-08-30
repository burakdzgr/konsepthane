import { renderMarkdown } from '@ilham/content';

/** Only use the shared HTML-disabled Markdown renderer at this HTML boundary. */
export function EditorialBody({
  source,
  prefix = '',
  className = '',
}: {
  source: string;
  prefix?: string;
  className?: string;
}) {
  return (
    <div
      className={`blog-prose ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(source, prefix).html }}
    />
  );
}
