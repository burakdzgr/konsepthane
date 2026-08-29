# Blog paketi

Editoryal blog: Markdown gövdeli yazılar, bağımsız blog kategorileri, etiketler, kapak görseli,
zamanlanmış yayın, SEO alanları, RSS ve sitemap. Konsept/rehber iş akışıyla aynı yetki modelini kullanır.

## Veri modeli (`packages/database/prisma/schema.prisma`)

| Model | Tablo | Notlar |
| --- | --- | --- |
| `BlogCategory` | `blog_categories` | `name`, `slug`, `description`, `status`, `sortOrder`. Konsept kategorilerinden bağımsız. |
| `BlogPost` | `blog_posts` | `title`, `slug`, `excerpt` (≤320), `body` (Markdown), `coverImageUrl/Alt`, `tags[]`, `status`, `indexability`, `featured`, `seoTitle` (≤70), `seoDescription` (≤170), `readingMinutes` (otomatik), `viewCount`, `publishedAt`, `authorId` (byline), `createdById/updatedById` (denetim). |

Migration: `20260829200000_blog`. `pnpm db:reset:launch` blog tablolarını da temizler.

**Görünürlük kuralı:** bir yazı yalnızca `status = PUBLISHED` **ve** `publishedAt <= now()` ise herkese açıktır.
İleri tarihli `publishedAt` = zamanlanmış yayın (o ana kadar 404). Görüntülenme sayacı `updated_at`'i değiştirmez.

## API (`apps/api/src/blog`)

Herkese açık (`/v1/blog`):

| Yöntem | Yol | Açıklama |
| --- | --- | --- |
| GET | `/posts?page&pageSize(≤50)&category&tag&q&featured` | Yayındaki yazılar (kart şekli, gövde yok) |
| GET | `/posts/:slug` | Yazı + `related` (aynı kategoriden 3 yazı); görüntülenme +1 |
| GET | `/categories` | Yayındaki kategoriler + `postCount` |
| GET | `/tags` | Etiketler `{ slug, tag, count }` |

Yönetim (`/v1/blog/admin`, JWT + izin):

| Yöntem | Yol | İzin |
| --- | --- | --- |
| GET | `/posts?page&pageSize&status&q` | `concept.read` |
| POST / PATCH / DELETE | `/posts`, `/posts/:id` | `concept.write`; `PUBLISHED` için ayrıca `concept.publish` (yayındaki yazıyı düzenleme/silme de) |
| GET | `/categories` | `concept.read` |
| POST / PATCH / DELETE | `/categories`, `/categories/:id` | `category.write` (silince yazılar kategorisiz kalır) |

Byline (`authorId`) yalnızca aktif bir editör olabilir; boşsa editör olan aktör, değilse kurum (Konsepthane Editörleri).
Saf yardımcılar (`blog.util.ts`: slug, etiket normalizasyonu, okuma süresi, yayın tarihi kuralı) `apps/api/test/blog.spec.ts` ile test edilir.

## Web (`apps/web`)

| Yol | Sayfa |
| --- | --- |
| `/tr/blog` (`?sayfa=`) | Hub: kategori çipleri, öne çıkan/son yazı hero, grid, sayfalama, etiket bulutu, RSS bağlantısı |
| `/tr/blog/kategori/[slug]` | Kategori sayfası (yazısı yoksa `noindex`) |
| `/tr/blog/etiket/[slug]` | Etiket sayfası (`noindex, follow`) |
| `/tr/blog/[slug]` | Yazı: kapak, byline, içindekiler (≥3 başlık), Markdown gövde, etiketler, yazar kutusu, ilgili yazılar, `BlogPosting` + `BreadcrumbList` JSON-LD, OG görseli, `seoTitle/seoDescription` |
| `/blog/rss.xml` | RSS 2.0 (son 30 yazı) |
| `/sitemap/blog.xml` | Hub + yazısı olan kategoriler + `INDEX` yazılar |

Ana sayfada "Editörlerden yazılar" bölümü (son 3), header "Keşfet" menüsünde ve footer "Keşfet" sütununda "Blog" bağlantısı.
Sayfalar ISR (`revalidate = 300`); API erişilemezse boş duruma düşer, asla uydurma içerik göstermez.

### Markdown (`apps/web/lib/markdown.ts`)

Bağımsız, güvenli (önce HTML kaçışı) küçük bir renderer. Desteklenen sözdizimi:
`##`/`###`/`####` başlık (anchor id’li, içindekiler için), paragraf, `**kalın**`, `*italik*`, `` `kod` ``,
``` ``` ``` kod bloğu, `[metin](url)` (http/https/mailto/`/`), `![alt](url)` görsel, `-` madde, `1.` sıralı madde,
`>` alıntı, `---` çizgi. Tablo ve ham HTML desteklenmez (ham HTML metin olarak görünür).

## Admin (`apps/admin/app/(panel)/blog`)

- **Blog yazıları** (`/admin/blog`): başlık, kısa ad, kategori, yazar, durum, indeksleme, yayın tarihi
  (`datetime-local`, Türkiye saati; ileri tarih = zamanlanmış), özet, Markdown içerik, sürükle-bırak kapak görseli
  (+ alt metin), etiketler (virgülle), öne çıkan, SEO başlık/açıklama; listede durum/zamanlandı rozetleri,
  görüntülenme, önizleme bağlantısı, silme.
- **Blog kategorileri** (`/admin/blog/kategoriler`): ad, kısa ad, durum, sıra, açıklama, yazı sayısı.

## Başlangıç

Yayın veritabanında blog boş başlar: önce `/admin/blog/kategoriler` ekranından kategorileri, ardından
`/admin/blog` ekranından yazıları oluşturun. Boş blog herkese "Henüz yazı yok" durumunu gösterir.
