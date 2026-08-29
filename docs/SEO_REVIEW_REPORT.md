# SEO-REVIEV.md — Uygulama Raporu

Tarih: 29 Ağustos 2026 · Kapsam: `SEO-REVIEV.md` içindeki 14 görev · Yöntem: kod incelemesi +
canlı tarama (`pnpm seo:audit`), sunucu-HTML/DOM karşılaştırması (`pnpm seo:render`), yapısal veri
kontrolü (`pnpm seo:schema`), prod build üzerinde Core Web Vitals ölçümü.

Bu rapor, 28 Ağustos tarihli teknik SEO denetimi ve "Sayfalama ve İç Bağlantı Denetimi"nin devamıdır;
o denetimlerde kapatılan 15 kusur burada tekrar ele alınmaz, yalnızca "zaten doğru" olarak listelenir.

## 1. Bulunan sorunlar (sınıflandırılmış)

| Sınıf           | Bulgu                                                                                                                                                                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CRITICAL        | Konu sayfalarının indekslenebilirliği tek başına `contentCount >= 3` kuralına bağlıydı; sayfa kararı ile sitemap kararı ayrı yerlerde hesaplanıyordu (tutarsızlık riski).                                                                       |
| CRITICAL        | `@ilham/seo` paketi çok dosyaya bölününce API konteyneri çöktü: API paket kaynağını Node'un TypeScript desteğiyle yüklüyor ve göreli import'larda uzantı istiyor. Aynı oturumda tek dosyaya geri toplandı.                                      |
| IMPORTANT       | Öneksiz eski URL'ler `Accept-Language` başlığına göre yönlendiriliyordu (brief: tarayıcı diline/IP'ye göre zorla yönlendirme yapılmamalı).                                                                                                      |
| IMPORTANT       | `hreflang` altyapısı sayfa bazında "hangi dillerde çeviri var" bilgisini alamıyordu; `/en` açıldığında var olmayan sayfalara hreflang basılabilirdi.                                                                                            |
| IMPORTANT       | `robots.txt` `/kesfet` hub'ının tamamını engelliyordu; Google sayfadaki `noindex`'i göremiyordu (robots/meta çelişkisi).                                                                                                                        |
| IMPORTANT       | Rehber (`/rehber/[slug]`) sayfalarının `Article` şemasında `image` yoktu (zengin sonuç için önerilen alan).                                                                                                                                     |
| IMPORTANT       | Küratörlü SEO hub'ı mekanizması yoktu; arama talebi olan kategori × konu kombinasyonları yalnızca filtre URL'si olarak vardı.                                                                                                                   |
| IMPORTANT       | Tekrarlanabilir, CI'da çalışabilir bir denetim komutu yoktu (tarama scripti geçici dizindeydi).                                                                                                                                                 |
| OPTIONAL        | Anket sayfasında H1 yok (sayfa `noindex`). Poppins için 16 font varyantı tanımlı; yalnızca kullanılanlar indiriliyor (ölçümde 114 KB).                                                                                                          |
| ALREADY CORRECT | Sayfalama, iç bağlantılar, canonical, sitemap parçalama, breadcrumb, `next/image`, ISR + oturum adacıkları, OG/Twitter meta, dış link politikası, WebSite/Organization/Article/QAPage/DiscussionForumPosting/ItemList/BreadcrumbList kullanımı. |

## 2. Yapılan değişiklikler

### Hub indeks politikası (Görev 3)

- `shouldIndexHub()` — `packages/seo/src/index.ts`. Girdi: tür başına içerik sayısı (konsept, rehber,
  deneyim, soru, tartışma, anket), editoryal açıklama uzunluğu, görsel sayısı, featured / iç link
  desteği, editör override'ı, kopya tespiti. Puanlama: birincil içerik +1 (maks 4), her 2 UGC +1
  (maks 2), ≥2 içerik türü +1, açıklama ≥60 karakter +1, görsel +1, link desteği +1. **Puan ≥ 4 ve
  ≥ 2 içerik → index.** 0 içerik veya kopya → asla index. Override her zaman kazanır. Karar `reasons`
  dizisiyle açıklanır. 5 birim test (`indexability.test.ts`).
- Konu sayfası metadata'sı, `/konu` dizinindeki `ItemList` ve sitemap `konular` parçası aynı fonksiyonu
  `apps/web/lib/hub-index.ts` üzerinden çağırır; bir hub bir yerde index, diğer yerde noindex olamaz.
- API: `GET /v1/community/topics` ve `/topics/:slug` yanıtlarına `contentCounts` (tür başına, tek
  `groupBy` sorgusu) ve `imageCount` eklendi.
- Sonuç (demo verisi): `2-yas` (1 içerik) noindex; `kiz-cocuk` (2 konsept + açıklama + görsel +
  featured) index; `ayicik`, `safari`, `1-yas` index.

### Küratörlü landing sayfaları (Görev 2B)

- `apps/web/content/landing-pages.ts` — tek kaynak. Kayıt = kategori × konu + özgün giriş metni
  (tr/en). Şu an 3 kayıt: `dogum-gunu/1-yas`, `dogum-gunu/ayicik`, `dogum-gunu/evde-kutlama`.
- Rota `apps/web/app/[locale]/kategori/[slug]/[topic]/page.tsx`: self-canonical, Breadcrumb +
  BreadcrumbList, ItemList, kategori hub'ından ve konu hub'ından link, sitemap `kategoriler`
  parçasında; hub politikası `noindex` derse sayfa otomatik `noindex,follow`, sitemap dışı.
  Kayıtsız kombinasyon → 404. Filtre parametrelerinden asla landing üretilmez.

### Çok dil hazırlığı (Görev 6)

- `localeMetadata(locale, path, { translations })`: hreflang yalnızca çevirisi gerçekten olan
  dillerde; varsayılan `indexableLocales` (`['tr']`); `x-default` varsayılan dil.
- `apps/web/proxy.ts`: öneksiz yollar yalnızca kullanıcının açık seçimi (çerez) ya da varsayılan
  dile yönlendirilir; `Accept-Language`/IP kullanılmaz.

### Robots / tarama kontrolü (Görev 8)

- `apps/web/app/robots.ts`: `/kesfet` hub'ı taranabilir (noindex görünür), `/*/kesfet?*` (arama
  sonuçları) engelli; özel sayfalar (`giris`, `kaydedilenler`, `bildirimler`, `olustur`, `uye/`,
  `anket/`), `/admin`, `/api/` engelli (bilinçli: tarama değeri yok, hepsi ayrıca noindex).

### Yapısal veri (Görev 4)

- Rehber `Article` için `image` fallback (marka sosyal görseli, sayfanın gerçek OG görseli).
- `pnpm seo:schema` — tip başına zorunlu alanlar, mutlak URL, BreadcrumbList sıra, QAPage →
  Question → yanıt kontrolü, kopya WebSite/Organization/Article tespiti.

### Denetim komutları (Görev 13)

- `pnpm seo:audit` — `scripts/seo-audit.mjs`: kırık iç link, yönlendirme zinciri, href'siz link, boş
  anchor, yetim sitemap URL'si, sitemap non-200/yönlendirme, sitemap'te noindex, sitemap-canonical
  uyumsuzluğu, indekslenebilir ama sitemap dışı sayfa, canonical → 404/yönlendirme, robots/canonical
  çelişkisi, kopya canonical/başlık, eksik başlık, eksik/çoklu H1, hreflang hedefleri.
  **Kritik bulguda exit 1** (CI'a uygun). `--base`, `--start`, `--max`, `--json` seçenekleri;
  `SEO_AUDIT_BASE` ile prod'a karşı çalışır.
- `pnpm seo:render` — `scripts/seo-render-check.mjs` (Playwright): 12 temsili sayfada sunucu HTML ile
  hydration sonrası DOM karşılaştırması (title, description, canonical, robots, hreflang, H1,
  JSON-LD tipleri, breadcrumb, görsel URL/alt, iç href kümesi).
- `pnpm seo:schema` — yukarıda.

### Dokümantasyon

- `docs/SEO.md`: indeks politikası, faset navigasyon kuralı, landing registry, çok dil hazırlığı,
  denetim komutları.
- `.prettierignore`: `SEO-REVIEV.md` (brief dosyası format kontrolünü kırmasın).

## 3. Değiştirilmeyen ve zaten doğru çalışan alanlar

- Sayfalama: `?sayfa=N`, gerçek `<a href>`, self-canonical, `index,follow`, aralık dışı 404,
  `rel=prev/next` bilgi amaçlı.
- İç bağlantı: header/footer → hub'lar; kategori → konsept/deneyim/soru; detay → kategori + 3 ilgili;
  konu çipleri → `/konu/<slug>`; breadcrumb görünür ve JSON-LD ile örtüşür; iç `nofollow` yok.
- Canonical: her indekslenebilir sayfada mutlak self-canonical; filtreli varyantlar hub'a.
- Sitemap: 9 aile, yalnızca canonical/indekslenebilir kayıtlar, demo verisine düşmez.
- Render: ana sayfa, detay, hub ve güven sayfaları statik + `revalidate 300`; kişisel durum
  `/api/session` adacıklarında; sunucu HTML = DOM (doğrulandı).
- Görseller: `next/image` (fill + sizes, AVIF/WebP), LCP'de `priority`, boyutsuz görsel yok, CLS 0.
- OG/Twitter: `og:title/description/url/image`, `twitter:card=summary_large_image`, PNG marka
  görseli; konsept/kategori/landing'de hero görseli.
- Dış linkler: 4 resmi kaynak, followed, `noopener noreferrer`; kullanıcı metinleri link üretmez.
- Ana sayfa link yoğunluğu (122) bölüm sınırlarıyla (8–12 kart) kontrollü.

## 4. SEO açısından kalan riskler

1. Filtreli liste URL'lerinin hub'a canonical'ı Google tarafından yok sayılabilir (faset rehberinde
   kabul edilen yöntem; Search Console'da izlenecek).
2. İçerik hacmi: 6 konsept, 3 rehber, 7 soru. Politika ve altyapı doğru; organik görünürlük içerik
   üretimine bağlı.
3. Güven sayfaları hukuki inceleme bekliyor; prod env: `NEXT_PUBLIC_CONTACT_EMAIL`,
   `NEXT_PUBLIC_SOCIAL_*`, `NEXT_PUBLIC_LEGAL_NAME`, `INTERNAL_MEDIA_URL`.
4. Search Console doğrulaması ve analitik, karar gereği yayına çıkmadan hemen önce eklenecek.

## 5. GEO / AI Search açısından kalan işler

- Konsept şablonu 15 H2 ile yanıtlanabilir yapıda (renk paleti, dekorasyon, masa, balon, pasta,
  mekân, pratik ipuçları, alternatifler, güvenilir kaynaklar, deneyimler, sorular, SSS, ilgili).
- Brief'teki bölümlerden veri modelinde karşılığı olmayanlar: **hazırlık adımları**, **alışveriş
  listesi**, **hediye**. Filler metin yerine model alanı + admin formu olarak eklenmeli (admin fazı).
- `Organization.sameAs` gerçek sosyal profillerle doldurulmalı; editör profilleri gerçek
  editörler için indekslenebilir `ProfilePage` yapılmalı (bugün tüm profiller noindex).
- Varlık grafiği mevcut: Doğum Günü → 1 Yaş (landing) → Ayıcık (konu) → Konsept → Deneyim → Soru;
  breadcrumb ve ItemList bu zinciri makine-okunur kılıyor.

## 6. Structured data matrisi

| Sayfa tipi                                       | Şema                                                                                                 |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Ana sayfa                                        | WebSite, Organization (+ContactPoint, PostalAddress, logo ImageObject; `sameAs` env'den)             |
| Kategori, landing, konu, konu dizini, koleksiyon | BreadcrumbList + ItemList                                                                            |
| Konsept, rehber, deneyim                         | BreadcrumbList + Article (Person yazar, Organization yayıncı `@id`, ImageObject, citation)           |
| Soru                                             | BreadcrumbList + QAPage → Question → acceptedAnswer / suggestedAnswer (yalnızca görünür yanıt varsa) |
| Tartışma                                         | BreadcrumbList + DiscussionForumPosting (+Comment, InteractionCounter)                               |
| Güven sayfaları                                  | BreadcrumbList                                                                                       |
| Üye, anket, arama, giriş                         | Şema yok (noindex)                                                                                   |

Bilinçli olarak kullanılmayanlar: FAQPage (editoryal SSS bloğu için), HowTo, Product, Review /
AggregateRating, ProfilePage (profiller noindex), VideoObject (video yok).

## 7. Sitemap / indeksleme kuralları

- 9 parça: `/sitemap/{sayfalar,kategoriler,konseptler,rehberler,deneyimler,sorular,tartismalar,konular,koleksiyonlar}.xml`; hepsi `robots.txt`'de listeli.
- Girenler: yalnızca canonical = URL, `index`, 200 dönen kayıtlar; konseptler `PUBLISHED`; topluluk
  içerikleri `INDEX`; konular ve landing sayfaları hub politikasından geçenler; koleksiyonlar ≥3 öğe
  ve ≥60 karakter açıklama.
- Girmeyenler: noindex sayfalar, arama sonuçları, filtre kombinasyonları, sayfalama URL'leri,
  yönlendirmeler, 404, kopya canonical varyantları. API ulaşılamazsa parça boş döner (demo sızmaz).
- Denetim: 55 URL, hepsi 200, hepsi self-canonical, hepsi en az bir taranabilir linkle ulaşılabilir.

## 8. Faset navigasyon kuralları

| Tür                                                                                                 | Kural                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UX filtreleri (`kategori`, `etkinlik`, `mekan`, `sekme`, `sirala`; gelecekte `yas`, `tema`, `renk`) | Taranabilir, `index,follow`, ama canonical **her zaman filtresiz hub'ın 1. sayfası**; sitemap dışı. `?sayfa=N` yalnızca filtresiz listede canonical URL. |
| Arama sonuçları (`/kesfet?…`)                                                                       | `noindex,follow` + `robots.txt` engeli; hub `/kesfet` taranabilir.                                                                                       |
| Küratörlü landing (`/kategori/<kategori>/<konu>`)                                                   | Yalnızca kayıt defterinden; self-canonical, sitemap'te, linkli; hub politikası geçmezse `noindex,follow`.                                                |
| Bilinmeyen kombinasyon                                                                              | 404.                                                                                                                                                     |

## 9. /en hazırlık durumu

- `/tr` self-canonical; `/en` şu an `noindex,follow`, hreflang kümesinde ve sitemap'te değil.
- `translations` parametresiyle sayfa bazında hreflang; `x-default` = tr; diller birbirine canonical vermez.
- Yönlendirme JS'siz (proxy), tarayıcı diline/IP'ye bağlı değil.
- Açılış adımları: içerik çevirisi (`ConceptTranslation` benzeri tablo), `indexableLocales`'a `en`,
  kayıt bazında `translations`.

## 10. Core Web Vitals bulguları (laboratuvar)

**Bunlar laboratuvar (lab) ölçümleridir; CrUX alan verisi değildir.** Google sıralamada 28 günlük
CrUX p75 değerlerini kullanır; bu tablo yalnızca regresyon yakalamak ve sayfaları birbiriyle
kıyaslamak içindir. Alan verisi yayın sonrası Search Console › Core Web Vitals'tan izlenir.

Yöntem (`pnpm seo:cwv`, `scripts/seo-cwv.mjs`): prod build + `next start`; her ölçüm için **yeni
tarayıcı bağlamı** (soğuk önbellek, service worker yok — script kontrol eder); ağ kısıtlaması
`page.route` ile **istek düzeyinde simüle** (her istek, belge dahil: RTT 150 ms + bayt/1.6 Mbps
gecikme; DevTools `Network.emulateNetworkConditions` belge isteğine güvenilir uygulanmadığı için
terk edildi, script TTFB ≥ RTT olmasını doğrular); CPU ×4 (CDP); **3 çalıştırma, medyan**; INP
yerine laboratuvar etkileşim gecikmesi: senaryo (mobil: menüyü aç/kapat + konu çipine tıkla;
masaüstü: aramaya odaklan + yaz + konu çipine tıkla) ve Event Timing API ile en kötü etkileşim
süresi.

| Sayfa (mobil, RTT 150 ms / 1.6 Mbps / CPU ×4) | TTFB   | FCP    | LCP    | CLS | Etkileşim (INP proxy) |
| --------------------------------------------- | ------ | ------ | ------ | --- | --------------------- |
| Ana sayfa                                     | 885 ms | 1.70 s | 1.70 s | 0   | 56 ms                 |
| Konsept detay                                 | 694 ms | 1.57 s | 1.57 s | 0   | 48 ms                 |
| Kategori                                      | 665 ms | 1.49 s | 1.49 s | 0   | 56 ms                 |
| Konu                                          | 423 ms | 1.11 s | 1.11 s | 0   | 64 ms                 |
| Soru                                          | 491 ms | 1.22 s | 1.22 s | 0   | 72 ms                 |
| Fikirler                                      | 490 ms | 1.19 s | 1.19 s | 0   | 64 ms                 |

| Sayfa (masaüstü, kısıtlama yok)             | TTFB    | LCP       | CLS | Etkileşim |
| ------------------------------------------- | ------- | --------- | --- | --------- |
| Ana sayfa                                   | 10 ms   | 124 ms    | 0   | 16 ms     |
| Konsept / kategori / konu / soru / fikirler | 7–16 ms | 88–140 ms | 0   | 16 ms     |

Yük (soğuk, sıkıştırılmamış gövde): HTML 52–147 KB, JS ~508 KB (gzip'li aktarım 156 KB), CSS 69 KB
(14 KB gzip), font 114 KB, görseller 0–16 KB; üçüncü taraf script yok. Yorum: mobilde LCP 1.1–1.7 s
("İyi" eşiği 2.5 s altında), CLS 0, etkileşim gecikmesi 48–72 ms ("İyi" eşiği 200 ms altında).
TTFB'nin büyük kısmı simüle edilen RTT + HTML serileştirme süresidir; gerçek darboğaz yok. Ana
sayfanın HTML'i (147 KB sıkıştırılmamış) büyüdükçe izlenmeli.

## 11. Before / after tarama

| Ölçüt                | Önce (28 Ağu, bağlantı denetimi) | Sonra (29 Ağu, yeniden derlenmiş imaj)           |
| -------------------- | -------------------------------- | ------------------------------------------------ |
| Taranan sayfa        | 189                              | 216 (+`/konu` dizini, 3 landing, konu sayfaları) |
| İç link              | 12.102                           | 13.898                                           |
| Sitemap URL          | 50                               | 55                                               |
| Yetim sitemap URL'si | 0                                | 0                                                |
| Kırık iç link        | 0                                | 0                                                |
| Kritik bulgu         | 0                                | 0                                                |
| Uyarı                | 0                                | 1 (anket H1 — noindex sayfa)                     |
| Sunucu HTML = DOM    | ölçülmedi                        | 12/12 sayfa ✓                                    |
| Yapısal veri         | ölçülmedi                        | 12 sayfa, 0 sorun                                |

## 12. Değişen dosyalar

- `packages/seo/src/index.ts`, `packages/seo/src/indexability.test.ts`
- `apps/api/src/community/community.service.ts`
- `packages/shared-types/src/index.ts`
- `apps/web/lib/hub-index.ts` (yeni), `apps/web/lib/i18n.ts`, `apps/web/lib/topics.ts`, `apps/web/lib/community.ts`
- `apps/web/proxy.ts`, `apps/web/app/robots.ts`, `apps/web/app/sitemap.ts`
- `apps/web/app/[locale]/konu/page.tsx`, `apps/web/app/[locale]/konu/[slug]/page.tsx`
- `apps/web/app/[locale]/kategori/[slug]/page.tsx`, `apps/web/app/[locale]/kategori/[slug]/[topic]/page.tsx` (yeni)
- `apps/web/app/[locale]/rehber/[slug]/page.tsx`
- `apps/web/content/landing-pages.ts` (yeni), `apps/web/messages/tr.ts`, `apps/web/messages/en.ts`
- `scripts/seo-audit.mjs`, `scripts/seo-render-check.mjs`, `scripts/seo-schema-check.mjs` (yeni)
- `package.json` (`seo:audit`, `seo:render`, `seo:schema`), `.prettierignore`, `docs/SEO.md`, `docs/SEO_REVIEW_REPORT.md`

### 4 maddelik ikinci inceleme (29 Ağustos) — değişen dosyalar

- `apps/web/app/robots.ts` — özel sayfalar için Disallow kaldırıldı (crawlable + noindex); yalnızca `/*/kesfet?*` (crawl trap gerekçesi dosyada), `/admin`, `/api/` engelli.
- `apps/web/app/[locale]/konu/[slug]/page.tsx` — "tümünü ara" düğmesi engelli URL'ye link yerine GET formu.
- `apps/web/app/[locale]/kesfet/page.tsx` — konu çipleri `/kesfet?q=` yerine `/konu/<slug>`.
- `apps/web/app/[locale]/rehber/[slug]/page.tsx` — jenerik marka görseli `Article.image` fallback'i kaldırıldı (görsel yoksa özellik atlanır).
- `scripts/seo-schema-check.mjs` — Article görseli eksikse bilgi; jenerik marka görseli kullanılmışsa hata.
- `scripts/seo-cwv.mjs` (yeni) + `package.json` (`seo:cwv`) — soğuk bağlam, istek düzeyinde simüle ağ kısıtlaması, 3 çalıştırma medyanı, INP proxy.
- `docs/SEO.md` — tarama kontrolü, Article görsel politikası, lab/field ayrımı.
- `docs/SEO_REVIEW_REPORT.md` — §10, §14 ve bu bölüm.

## 13. Çalıştırılan komutlar / testler

| Komut                                  | Sonuç                                                   |
| -------------------------------------- | ------------------------------------------------------- |
| `pnpm format:check`                    | ✓                                                       |
| `pnpm lint`                            | ✓ 10/10 paket                                           |
| `pnpm typecheck`                       | ✓ 11/11 paket                                           |
| `pnpm test`                            | ✓ 16 görev (seo 11, validation 3, api 1)                |
| `pnpm --filter @ilham/web build`       | ✓ landing/konu rotaları statik (`generateStaticParams`) |
| `pnpm seo:audit`                       | 216 sayfa, 0 kritik, 1 uyarı                            |
| `pnpm seo:render`                      | 12/12 ✓                                                 |
| `pnpm seo:schema`                      | 12 sayfa, 0 sorun                                       |
| CWV ölçümü (`next start` + Playwright) | Tablo §10                                               |
| `docker compose up --build web api`    | ✓ healthy                                               |

## 14. Search Console'da izlenecekler

Not: Search Console'daki eski "Uluslararası Hedefleme" (International Targeting) raporu 2022'de
kaldırıldı; hreflang için ayrı bir rapor yok. Aşağıdaki liste güncel araçlara göredir.

| Konu                          | Araç / rapor                                                                                                                      | Ne aranacak                                                                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Filtreli liste URL'leri       | Dizine ekleme › Sayfalar                                                                                                          | "Uygun kanonik etikete sahip alternatif sayfa" beklenen; "Kopya, Google kullanıcının seçtiğinden farklı bir kanonik seçti" artarsa canonical politikası gözden geçirilir        |
| Konu ve landing sayfaları     | Dizine ekleme › Sayfalar; URL Denetimi                                                                                            | "noindex etiketiyle hariç tutuldu" satırının hub politikasının `noindex` dediği sayfalarla birebir eşleşmesi; "Bulundu – şu anda dizine eklenmedi" birikmesi                    |
| Arama sonuçları (`/kesfet?…`) | Dizine ekleme › Sayfalar; Ayarlar › Tarama istatistikleri                                                                         | "robots.txt tarafından engellendi" (beklenen); "Dizine eklendi ancak robots.txt tarafından engellendi" görünürse bu URL'lere link veren kaynak bulunur                          |
| Yapısal veri                  | Geliştirmeler: İçerik haritaları (Breadcrumb), Soru-Cevap, Tartışma forumu; Zengin Sonuçlar Testi                                 | Hata 0; yeni şablon eklendiğinde temsili URL Zengin Sonuçlar Testi'nden geçirilir                                                                                               |
| hreflang / `/en`              | URL Denetimi › "Taranan sayfayı görüntüle" (HTML) + `pnpm seo:audit` hreflang kontrolleri; harici: Screaming Frog hreflang raporu | Her `hreflang` hedefinin 200 dönmesi, karşılıklı (reciprocal) olması, `x-default`'un varlığı; Google tarafında "Sayfalar" raporunda dil varyantının kanonik olarak birleşmemesi |
| Core Web Vitals (alan verisi) | Deneyim › Core Web Vitals (CrUX, p75)                                                                                             | Mobil LCP/INP/CLS "İyi" bandı; laboratuvar (`pnpm seo:cwv`) ile alan verisi karıştırılmaz                                                                                       |
| Sitemap                       | Dizine ekleme › Site haritaları                                                                                                   | 9 parçanın "Başarılı" durumu, keşfedilen/dizine eklenen oranı                                                                                                                   |
| Görsel arama / Discover       | Performans › Arama türü: Görsel; Discover raporu (yeterli trafik olunca)                                                          | Konsept görsellerinin gösterim alması                                                                                                                                           |
| Kaldırılan içerik             | Kaldırmalar                                                                                                                       | Yalnızca acil durumlarda; normal akış `noindex` + sitemap dışı                                                                                                                  |
