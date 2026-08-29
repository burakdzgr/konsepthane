# Logo kullanım boyutları (konsepthane.net)

Kaynak dosya: `2e161f10-17cf-49fb-8355-e6896e41b3ff.png` — 2172 × 724 px, RGBA.
Şeffaf kenar boşlukları çıkarıldığında **çizim alanı 1901 × 509 px** (x 140–2040, y 98–606),
en-boy oranı **3,735 : 1**. Sol kısımdaki ev/K amblemi ≈ 500 × 490 px (≈1 : 1), yazı
"Konsepthane" + ".net" sağda.

Ölçümler canlı siteden alındı (header satırı 68 px, mevcut metin logonun kapladığı yükseklik
masaüstü 42 px / dizüstü 36 px / mobil 38 px). Aşağıdaki değerler **CSS piksel**; retina için
PNG'leri 2× (ve istenirse 3×) dışa aktarın, SVG'de bu gerekmez.

| Yer | Yükseklik (CSS px) | Genişlik (3,735:1) | Export önerisi | Not |
| --- | --- | --- | --- | --- |
| Header — geniş masaüstü (≥1440) | **64** (−16 % optik yukarı kaydırma) | 239 | SVG (tam logo) | 104 px satır; yeni header tasarımı |
| Header — 1280–1439 | **56** | 209 | SVG | satır 104 px |
| Header — dizüstü/tablet (1024–1279) | **52** | 194 | SVG | satır 88 px, nav sıkıştırılmış |
| Header — mobil (<1024) | **44** (mobil 36) | 164 / 134 | SVG | hamburger + arama ikonlarıyla aynı satır |
| Hamburger menü başlığı (drawer) | **34** | 127 | SVG | header ile aynı |
| Footer (`.footer-brand`, header'dan bağımsız) | **56** (mobil 48) | 209 | SVG | header `.brand` kurallarıyla paylaşılmaz |
| Admin panel kenar çubuğu (koyu zemin #242220) | **28** | 105 | SVG **beyaz/açık** varyant | kahverengi metin koyu zeminde okunmaz |
| E-posta şablonu başlığı | **44** | 164 | **PNG 2×: 328 × 88** (+1×: 164 × 44) | Gmail/Outlook SVG desteklemez |
| OG / sosyal paylaşım (1200 × 630) | 128 | 478 | PNG 1× (kart içinde) | mevcut `opengraph-image.tsx` yeniden üretilir |
| Favicon / tarayıcı sekmesi | 32 ve 16 | 32 / 16 (kare) | **Yalnızca amblem** SVG + PNG 32/16 | yazı bu boyutta okunmaz |
| Apple touch icon | 180 × 180 | kare | PNG, amblem, %15 iç boşluk | |
| PWA / Android ikon | 192 ve 512 | kare | PNG, amblem, %15 iç boşluk | |

## Hazırlanacak dosyalar

1. `konsepthane-logo.svg` — tam logo, viewBox `0 0 1901 509` (şeffaf kenarsız), renkler: kahve
   `#5A3A2C` civarı (yazı/ev), mercan `#E8634F` civarı (kalp, ".net", kanca), yeşil yıldız.
2. `konsepthane-logo-light.svg` — koyu zemin için beyaz/krem yazı (admin kenar çubuğu, ileride
   koyu footer).
3. `konsepthane-mark.svg` — yalnızca ev/K amblemi, kare viewBox (≈ `0 0 512 512`, amblem
   ortalanmış, %10 boşluk).
4. PNG'ler: `logo-email@1x.png` 164 × 44, `logo-email@2x.png` 328 × 88; `mark-512.png`,
   `mark-192.png`, `apple-touch-icon-180.png`, `favicon-32.png`, `favicon-16.png`.

Kurallar: logonun etrafında en az **logo yüksekliğinin %25'i** kadar boş alan; 28 px altına
inildiğinde tam logo yerine amblem kullanılır; renkler değiştirilmez.

## Yerleştirileceği dosyalar (SVG geldiğinde)

- `apps/web/components/site-header.tsx` (`.brand`), `apps/web/components/mobile-menu.tsx`,
  `apps/web/app/[locale]/layout.tsx` (footer), `apps/admin/app/(panel)/layout.tsx` (sidebar),
  `apps/api/src/common/mail.service.ts` (e-posta başlığı, `WEB_URL/…/logo-email@2x.png`),
  `apps/web/app/opengraph-image.tsx`, `apps/web/app/[locale]/layout.tsx` (`icons`),
  `packages/seo` Organization `logo` (mevcut `/placeholders/konsepthane-mark.svg` değişecek).

## Üretilen dosyalar (PNG, SVG gelene kadar) — `apps/web/public/brand/`

| Dosya | Boyut | Kullanım |
| --- | --- | --- |
| `konsepthane-logo.png` | 1901 × 509 (kırpılmış tam logo) | header, footer, hamburger, admin, JSON-LD `Organization.logo` |
| `konsepthane-logo@2x-header.png` | 299 × 80 | (isteğe bağlı hafif header varyantı) |
| `email/logo-640.png` | 640 × 171 | e-posta başlığı (280 px genişlikte gösterilir, 2× keskin) |
| `email/logo@2x.png` / `logo@1x.png` | 329 × 88 / 164 × 44 | dar e-posta düzenleri |
| `og-logo-960.png` | 960 × 257 | `/opengraph-image` kartı |
| `konsepthane-mark-512.png`, `-192.png` | kare amblem | PWA/manifest, JSON-LD alternatifi |
| `apple-touch-icon-180.png` | 180 × 180 | iOS ana ekran |
| `social/instagram.png`, `pinterest.png`, `linkedin.png` | 64 × 64 | e-posta footer ikonları |
| `/favicon.ico`, `/favicon-32x32.png`, `/favicon-16x16.png` | — | tarayıcı sekmesi (senin verdiğin dosyalar) |

Kaynak PNG: `konsepthane-logo-source.png` (2172 × 724, orijinal). SVG'ler hazır olunca aynı
adlarla `.svg` olarak bırakılır; bileşenlerde `src` uzantısı değiştirilir.

E-posta şablonu: `apps/api/src/common/email-template.ts` (Poppins, sosyal ikonlar, dinamik
`{{ params.* }}`); Brevo'ya aktarılabilir sürümler `docs/email-templates/`.
