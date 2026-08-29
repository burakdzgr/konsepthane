import { absoluteUrl, siteName } from '@ilham/seo';
import { getBlogPosts } from '@/lib/blog';
import { getDictionary, localePath } from '@/lib/i18n';
import { displayMediaSrc } from '@/lib/media-url';

/** RSS 2.0 feed of the newest public posts (Turkish, the indexable locale). */
export const revalidate = 600;

function cdata(value: string) {
  return `<![CDATA[${value.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}
function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET() {
  const t = getDictionary('tr').pages.blog;
  const { data } = await getBlogPosts({ pageSize: 30 });
  const channelUrl = absoluteUrl(localePath('tr', '/blog'));
  const items = data
    .map((post) => {
      const url = absoluteUrl(localePath('tr', `/blog/${post.slug}`));
      const date = new Date(post.publishedAt ?? post.createdAt).toUTCString();
      const cover = post.coverImageUrl
        ? `<enclosure url="${escapeXml(absoluteUrl(displayMediaSrc(post.coverImageUrl)))}" type="image/jpeg" length="0" />`
        : '';
      const categories = [...(post.category ? [post.category.name] : []), ...post.tags]
        .map((name) => `<category>${cdata(name)}</category>`)
        .join('');
      return `<item><title>${cdata(post.title)}</title><link>${escapeXml(url)}</link><guid isPermaLink="true">${escapeXml(url)}</guid><pubDate>${date}</pubDate><description>${cdata(post.excerpt)}</description>${categories}${cover}</item>`;
    })
    .join('');
  const lastBuild = (data[0]?.publishedAt ?? new Date().toISOString()).toString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${cdata(`${siteName} ${t.title}`)}</title><link>${escapeXml(channelUrl)}</link><atom:link href="${escapeXml(absoluteUrl('/blog/rss.xml'))}" rel="self" type="application/rss+xml" /><description>${cdata(t.metaDescription)}</description><language>tr</language><lastBuildDate>${new Date(lastBuild).toUTCString()}</lastBuildDate>${items}</channel></rss>`;
  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=600, stale-while-revalidate=3600',
    },
  });
}
