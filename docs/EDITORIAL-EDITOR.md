# Panelde görsel içerik editörü

## Kapsam

Blog ana metni, rehber ana metni, konsept anlatımı ve sekiz konsept editoryal bölümü ortak Tiptap editörünü kullanır. Kısa özet, SEO, başlık, renk paleti ve yapılandırılmış SSS alanları kendi veri biçiminde kalır. Kullanıcı gönderileri ve moderasyon yetkileri değiştirilmedi.

- Paragraf, H2/H3/H4, kalın, italik, üstü çizili, madde/numara listesi ve alıntı.
- Bağlantı ekleme/kaldırma; tablo, satır ve sütun işlemleri.
- Görsel URL'si veya mevcut yetkili yükleme servisi üzerinden JPEG/PNG/WebP/AVIF dosyası; alt metin girişi.
- Geri alma/yineleme, Markdown kaynağına geçiş ve ortak renderer ile önizleme.
- Kapalı kayıtların editörleri kayıt açılınca yüklenir. Dokunulmayan içerik otomatik dönüştürülüp kaydedilmez.

## Veri ve güvenlik

Veritabanında mevcut Markdown/düz metin sözleşmesi korunur; **migration gerekmiyor**. Rehber ve konsept sayfaları artık güvenli Markdown çıktısı gösterir. Blog da aynı `@ilham/content` renderer'ını kullanır. Başlıklar ve bağlantılar sunucuda HTML olarak üretilir; yalnızca istemci JavaScript'ine bağımlı değildir.

Ham HTML çalıştırılmaz. Script, iframe, olay öznitelikleri ve `javascript:`/`data:`/protokolsüz dış URL'ler editoryal HTML'ye çevrilmez. Görsel yüklemesi mevcut aynı-origin `/admin/api/upload` üzerinden yapılır; erişim anahtarı tarayıcı JavaScript'ine aktarılmaz. API'nin `media.manage` kontrolü korunur. Dosya tipi, boş dosya, 15 MB sınırı ve hata yanıtları istemcide de kontrol edilir; sunucu kontrollerinin yerine geçmez.

İçerik uzunlukları mevcut API limitleriyle eşleşir. Yükleme sürerken form gönderimi engellenir. Önizleme yayına alma işlemi değildir. Mevcut taslak, moderasyon, indeksleme ve yayın kontrolleri değişmez.

Görseller metnin içine eklenir; rehberler için ayrı kapak kolonu oluşturulmadı. Rehberdeki ilk geçerli içerik görseli Open Graph için, içerik görselleri Article şeması için kullanılabilir. Üretilen/temsili görsel açıklaması görselin altına normal paragraf olarak eklenmelidir.

Markdown sınırlamaları nedeniyle birleştirilmiş hücre, yazı tipi, yazı rengi ve serbest HTML düğmeleri sunulmaz. Word gibi kaynaklardan çok karmaşık tablo yapıştırıldığında kaynak/önizleme kontrol edilmelidir. Raw HTML/iframe içe aktarma desteklenmez.

## Doğrulama (30 Ağustos 2026)

- Proje genelinde `pnpm lint`, `pnpm typecheck`, `pnpm test` ve `pnpm build` başarılı. Toplam 94 test geçti; açık DB sıfırlama izni isteyen 4 test çalıştırılmadı. Web ve admin üretim build'leri yerelde doğrulandı; sunucu deploy'u bu çalışmanın parçası değildir.
- Ortak renderer: 21 test; Türkçe başlık, benzersiz çapalar, tablolar, iç/dış bağlantılar, görseller, zararlı URL ve HTML örnekleri.
- Editör: 4 test; Markdown → görsel editör → Markdown dönüşümü, alt metin, tablo verisi, zararlı yapıştırma ve uzunluk sınırları.
- Görsel yükleme: 3 test; aynı-origin multipart istek, SVG/boş/büyük dosya reddi, yetki hatası, hatalı sunucu URL'si. Bu istekler mock ile sınanır; canlı depoya test dosyası gönderilmez.
- Gerçek yerel tarayıcıda: değişmemiş içeriği aynen gönderme, metin yazma, H3 seçme, görsel URL ve alt metin ekleme, önizleme, minimum uzunluk engeli, form sıfırlama, bağımsız ikinci editör. 343 px editör alanında yatay taşma görülmedi. Bu dar konteyner testidir, fiziksel telefon testi değildir.
- Tarayıcı test sayfası yereldi ve commit öncesi kaldırıldı. Canlı içerik yayınlanmadı/değiştirilmedi.

`pnpm audit --prod`: 33 mevcut altyapı bildirimi (1 kritik, 14 yüksek, 16 orta, 2 düşük); yollar API ve Prisma/veritabanı bağımlılıklarında. Kritik `fast-xml-parser@5.2.5` önceki lockfile'da da bulunuyordu. Yeni Tiptap/Markdown renderer yollarında bildirim görülmedi. Bu sonuç tüm uygulamanın güvenli olduğunu kanıtlamaz. Altyapı paketlerinin güvenlik güncellemesi ayrı bir iş olarak ele alınmalı; bu commit toplu bağımlılık yükseltmesi yapmaz.

## Sunucuya alma

Sunucu build'i kullanıcı tarafından çalıştırılır. Mevcut production ortam dosyalarını koruyun:

```sh
git pull --ff-only
docker compose -f compose.yaml -f compose.prod.yaml up -d --build --no-deps web admin
```

Mevcut deployment süreci farklıysa aynı süreçte **web ve admin** servislerini birlikte build edin. Yeni kilit dosyası ve `packages/content` build bağlamında bulunmalıdır. DB reset/seed veya migration gerekmez. Build sonrasında panelde bir taslağı açıp editör, görsel yükleme ve önizlemeyi kontrol edin; canlıya alma düğmesine basmak ayrı bir içerik işlemidir.

## Kaynaklar

- [Tiptap Next.js kurulumu](https://tiptap.dev/docs/editor/getting-started/install/nextjs)
- [Tiptap Markdown kullanımı](https://tiptap.dev/docs/editor/markdown/getting-started/basic-usage) — modül beta olarak belgeleniyor; sürüm 3.30.5 sabitlendi ve dönüşüm testleri eklendi.
- [Tiptap MIT lisansı](https://github.com/ueberdosis/tiptap/blob/main/LICENSE.md)
- [CKEditor lisans gereklilikleri](https://ckeditor.com/docs/ckeditor5/latest/updating/guides/update-to-44.html) — bu uygulamada CKEditor eklenmedi, GPL/lisans anahtarı varsayılmadı.
