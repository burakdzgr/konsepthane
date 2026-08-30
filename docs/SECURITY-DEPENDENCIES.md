# Bağımlılık güvenliği düzeltmeleri — 30 Ağustos 2026

## Sonuç ve kapsam

Başlangıçta üretim bağımlılıklarında 33 bildirim vardı: 1 kritik, 14 yüksek, 16 orta, 2 düşük. Geliştirme araçları da dahil edildiğinde toplam 42 bildirim çıktı: 2 kritik, 16 yüksek, 19 orta, 5 düşük.

Güncellenmiş kilit dosyasında hem `pnpm audit --prod` hem de `pnpm audit` **bilinen güvenlik açığı bulunamadı** sonucu veriyor. Bildirimler ignore/mute edilmedi; `--audit-level` ile gizlenmedi. Kontrolü tekrarlamak için `pnpm security:audit` eklendi. Bu, belirtilen tarihte npm güvenlik kayıtlarıyla eşleşme bulunmadığını gösterir; uygulamanın tüm saldırılara karşı güvenli olduğunu veya canlı sunucunun güncellendiğini kanıtlamaz.

## Paket değişiklikleri

| Bileşen                                     | Önce           | Sonra / çözüm                                                      |
| ------------------------------------------- | -------------- | ------------------------------------------------------------------ |
| S3 SDK ve presigner                         | 3.883.0        | 3.1121.0; eski `fast-xml-parser` ve `uuid` zinciri kaldırıldı      |
| NestJS common/core/platform-express/testing | 11.1.6         | 11.2.3; `multer` 2.2.0, `file-type` 21.3.4, `path-to-regexp` 8.4.2 |
| NestJS config / swagger                     | 4.0.2 / 11.2.0 | 4.0.4 / 11.4.7; `lodash` 4.18.1, Swagger'ın `js-yaml` sürümü 5.3.0 |
| Nodemailer                                  | 7.0.13         | 9.0.6                                                              |
| Prisma CLI ve client                        | 6.19.0         | 6.19.3; `effect` 3.21.0                                            |
| Prisma config → deepmerge-ts                | 7.1.5          | Sadece `@prisma/config@6.19.3` altında 8.0.2 override              |
| BullMQ / ioredis                            | 5.58.5 / 5.7.0 | 5.81.4 / 5.11.1; worker'daki eski `uuid` bağımlılığı da kaldırıldı |
| Nest CLI                                    | 11.0.10        | 11.0.24; glob, webpack, ajv ve picomatch zincirleri güncellendi    |
| Vitest / Turbo                              | 3.2.4 / 2.5.6  | Tüm çalışma alanlarında 3.2.7 / 2.10.12                            |

Prisma 7/8 veya NestJS 12 geçişi yapılmadı. Veritabanı şeması ve migration dosyaları değişmedi. Prisma 6'nın son yaması hâlâ `deepmerge-ts@7.1.5` sabitlediği için yalnızca bu bağımlılığa override uygulandı. Sürüm 8'de Map birleştirme davranışı değiştiğinden bu genel bir override değildir. Gerçek Prisma/c12 yapılandırma yükleyicisi, düz nesne birleştirme ve döngüsel nesne regresyon testleriyle kontrol edilir. Override, Prisma bağımlılığı ileride güncellendiğinde yeniden değerlendirilmelidir.

## Uygulama düzeyindeki kontroller

- Admin multipart uç noktası tek dosya, sıfır metin alanı ve sınırlı parça bütçesi kabul eder. Busboy parça sınırına ulaşınca hata ürettiği için `parts: 2`, `files: 1`, `fields: 0` birlikte kullanılır; normal tek dosya yüklemesi de test edilir.
- JPEG/PNG/WebP/AVIF dışındaki bildirilen MIME tipleri dosya tamponlanmadan reddedilir. 15 MB sınırı korunur, boş dosya reddedilir. Bu MIME kontrolü tek başına dosya içeriğinin güvenilir olduğunu kanıtlamaz.
- JWT ve `media.manage` kontrolleri korunur.
- İşlemsel e-postalar için `disableFileAccess` ve `disableUrlAccess` etkinleştirildi. İçerik yalnızca bellekte üretilir; sunucu dosyasından veya uzak URL'den içerik yüklenmez. TLS doğrulaması gevşetilmedi.

## Regresyon kanıtları

- `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test --force` ve `pnpm build` başarılı. Standart test koşusunda 112 test geçti, 6 entegrasyon testi ortam değişkenleri olmadığı için atlandı; bunların 2 Redis testi ayrıca çalıştırılıp geçti. Böylece toplam 114 farklı test doğrulandı, yalnızca 4 DB reset testi çalıştırılmadı.
- Mevcut `infra/docker/Dockerfile` ile Linux/Node 22 üzerinde temiz bağımlılık kurulumu ve üretim build'i başarılı. Aynı Linux imajında Prisma yapılandırma testleri ve iki audit taraması da geçti. Bu yerel Docker doğrulamasıdır; sunucu deploy'u değildir.
- Gerçek yerel NestJS HTTP sunucusunda 8 multipart testi: normal yükleme, yetkisiz erişim, yetki eksikliği, SVG, boş/büyük/çoklu dosya, iç içe alanlar ve eksik multipart. Kimlik çözümlemesi ile S3/veritabanı saklaması test doubles kullanır; gerçek Multer ve PermissionGuard çalışır.
- 4 e-posta testi: `raw` üzerinden dosya ve URL erişiminin reddi, gerçek bellek içi MIME üretimi, doğrulama/parola sıfırlama mesajlarının servis sözleşmesi. Canlı SMTP'ye e-posta gönderilmez.
- 2 S3 uyumluluk testi: gerçek SDK ile yerel imza üretimi, mock S3 yanıtından sonra varlık kaydı. Canlı depoya dosya gönderilmez.
- 4 Prisma yapılandırma testi: override'ın gerçekten çözülmesi, nesne birleştirme, döngüsel giriş ve TypeScript yapılandırma dosyasının gerçek yükleyiciyle okunması.
- 2 BullMQ testi ayrı, geçici Redis 7.4 konteynerinde `media` ve `search` türü işleri benzersiz test kuyruklarında işleyerek geçti. Mevcut Redis'e/üretim kuyruklarına dokunulmadı; geçici konteyner testten sonra kapatılıp otomatik kaldırıldı.
- `prisma validate` ve `prisma generate` başarılı. Veritabanı reset/seed çalıştırılmadı.
- Standart test komutunda Redis testleri `TEST_REDIS_URL` yoksa, mevcut 4 reset testi ise `TEST_DATABASE_URL` yoksa atlanır. Gerçek üretim adresleri bu değişkenlere verilmemelidir.

## Sunucuya uygulama

Güvenlik düzeltmeleri sunucuda yeni imajlar çalıştırılınca etkinleşir. Mevcut ortam dosyalarını koruyarak:

```sh
git pull --ff-only
docker compose -f compose.yaml -f compose.prod.yaml up -d --build --no-deps api worker web admin
```

Önceki editör güncellemesinden farklı olarak **API ve worker da yeniden build edilmelidir**. Prisma generate Docker build'in parçasıdır; yeni migration, DB reset veya seed gerekmiyor. Mevcut standart deploy süreciniz farklıysa aynı dört servisi o süreçle güncelleyin. Ardından API health, panel oturumu, normal görsel yükleme ve işlemsel e-posta akışlarını kendi ortamınızda doğrulayın.

## Birincil kaynaklar

- [Multer multipart alan derinliği bildirimi](https://github.com/expressjs/multer/security/advisories/GHSA-72gw-mp4g-v24j)
- [Nodemailer raw erişim denetimi düzeltmesi](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-p6gq-j5cr-w38f)
- [Nodemailer 9 TLS davranışı](https://github.com/nodemailer/nodemailer/releases/tag/v9.0.0)
- [Deepmerge 8 sürüm notları ve güvenlik düzeltmesi](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0)
- [Vitest güvenlik bildirimi](https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp)
- [BullMQ bağlantı uyumluluğu](https://docs.bullmq.io/guide/connections)

Kalan deprecation uyarıları (ör. cron-parser, node-domexception, ESLint 9 ve Prisma'nın package.json yapılandırması) audit güvenlik bildirimi değildir. Bunları gizlemek için gereksiz ana sürüm geçişi yapılmadı.
