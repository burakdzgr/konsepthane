# Yayın hazırlığı — durum ve eksikler

Tarih: 2026-08-29. Bu belge, veritabanı sıfırlama sonrası yayın öncesi yapılanları ve **hâlâ eksik**
olan kalemleri öncelik sırasıyla listeler.

## Bu turda yapılanlar

| Kalem | Durum |
| --- | --- |
| Veritabanı sıfırlama (`pnpm db:reset:launch`, `CONFIRM_RESET=yes`) | ✅ Tüm demo üyeler, içerikler, panolar, yorumlar, raporlar, medya kayıtları ve oturumlar silindi. Roller/izinler, kategoriler, etkinlik türleri, temalar, renkler ve konular (taksonomi) korundu. |
| Tek yönetici hesabı | ✅ kullanıcı adı `konsepthane` · e-posta `admin@konsepthane.net` · rol `super_admin` (profil herkese kapalı, editör değil). Parola kullanıcı tarafından belirlendi. |
| Giriş: e-posta **veya** kullanıcı adı | ✅ `POST /v1/auth/login` `email` alanında ikisini de kabul eder; admin giriş formu buna göre güncellendi. Eski `admin@ilham.local` ve `*.demo` hesapları artık yok (401). |
| MinIO medya kovası | ✅ Test yüklemeleri temizlendi (14 nesne). |
| Meilisearch `community` indeksi | ✅ Belgeler silindi (0 belge). |
| Admin panel açıklama metinleri | ✅ Sayfa başlığı altındaki paragraflar ve "Bu ekranın akışı" etiketi kaldırıldı; 3 adımlı akış kutuları kaldı. |
| Boş veritabanıyla site | ✅ 153 sayfa tarandı, 5xx yok, JS hatası yok; `seo:audit` 0 critical / 0 uyarı, `seo:schema` temiz. Footer'a Tartışmalar linki eklendi. |
| Sahte içerik kalıntıları | ✅ Web'deki demo "fallback feed" (sahte tartışma/soru/deneyim kartları) ve "· Demo" etiketleri kaldırıldı; boş listeler gerçek boş durum gösteriyor. |
| Otomatik demo seed | ✅ `compose.yaml` `migrate` servisi artık yalnızca `SEED_SAMPLE_DATA=1` iken `db:seed` çalıştırıyor (önceden her `up`'ta demo veriyi geri yüklüyordu). `.env`'de `SEED_SAMPLE_DATA=0`. |
| Önbellekler | ✅ Redis `FLUSHALL`, Meilisearch indeksi ve web `.next` önbelleği temizlendi (silinen içeriklerin ISR kopyaları kalmasın diye). Sıfırlama sonrası bu üçü her zaman yapılmalı. |

## Bu turda tamamlananlar (2. tur)

| Kalem | Durum |
| --- | --- |
| Üye kaydı + e-posta doğrulama | ✅ `/tr/kayit` → doğrulama e-postası (24 saat, tek kullanımlık) → `/tr/dogrula` → giriş. Doğrulanmamış hesap girişte açık mesaj + yeniden gönderme alır. API: `register`, `verify-email`, `resend-verification` (hepsi hız sınırlı, hesap sızdırmaz). |
| Parola sıfırlama + e-posta gönderimi | ✅ `/tr/sifremi-unuttum` → e-posta (1 saat) → `/tr/sifre-sifirla`; sıfırlama tüm oturumları kapatır. nodemailer + SMTP (`SMTP_*`, `MAIL_FROM`); yerelde Mailpit. |
| Çerez onayı | ✅ Google sertifikalı **Cookiebot** CMP (TCF v2.2, Consent Mode v2, tasarım CSS ile Konsepthane'ye uyarlandı); custom banner kaldırıldı. `NEXT_PUBLIC_COOKIEBOT_ID` boşken ne CMP ne GA yüklenir. Kurulum: PRODUCTION_SETUP.md §8. |
| Yasal sayfalar | ✅ `/tr/cerez-politikasi`, `/tr/kvkk-aydinlatma` eklendi (tr/en); mevcut gizlilik, kullanım koşulları, topluluk kuralları, editoryal standartlar korundu; footer ve sitemap güncellendi. Şirket bilgileri env'den (`NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_PRIVACY_EMAIL`). |
| Yedekleme | ✅ `compose.prod.yaml` → `postgres-backup` (günlük pg_dump, 14 gün/8 hafta/6 ay), `infra/backup/restore.sh`, medya için `infra/backup/media-sync.sh` (rclone). |
| TLS / alan adı / prod ortam | ✅ `infra/nginx/nginx.prod.conf` (80→443, HSTS, www→apex, auth rate limit), certbot servisi, `.env.production.example`, `docs/PRODUCTION_SETUP.md` ("Senden gerekenler" tablosu). |
| Ana sayfa | ✅ Boş "Topluluğa danış / Hazırlık rehberleri" bölümü içerik yokken gizleniyor. |
| Google ile devam et | ✅ Auth-code + PKCE (web route handler'ları) → API ID token doğrulaması → mevcut oturum çerezleri. `oauth_accounts` tablosu, `User.passwordHash` nullable, güvenli e-posta eşleme, `/tr/hesap` bağlı hesaplar. Google Cloud'da OAuth client oluşturulup `GOOGLE_CLIENT_ID/SECRET/IDS` doldurulmalı (değerler: PRODUCTION_SETUP.md §7). |
| Örnek içerik | ✅ Konsept, blog yazıları/kategorileri ve yüklenen medya silindi (`db:reset:launch` + MinIO temizliği, 2026-08-30). Veritabanında yalnızca taksonomi ve tek admin var; kod tabanında "demo" adlı içerik/etiket/fallback kalmadı. |

Uçtan uca test (Mailpit ile): kayıt → doğrulama linki → doğrulama → giriş 201; doğrulamadan giriş 401; token tekrar kullanımı 400; unuttum (bilinmeyen adres de 201) → sıfırlama → eski parola 401, yeni 201; çerez banner kapanıyor/kalıcı/yeniden açılıyor.

## Yayın öncesi kalan (senden bilgi gerekenler)

Ayrıntı: [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) → "Senden gerekenler".

1. Sunucu (Docker'lı Linux) ve SSH erişimi.
2. DNS: `konsepthane.net` ve `www` A kayıtları → sunucu IP; Let's Encrypt e-postası.
3. `noreply@konsepthane.net` için SMTP host/port/parola + SPF/DKIM/DMARC kayıtları (adresler hazır: noreply → OTP/parola, info → iletişim).
4. S3 uyumlu depolama (bucket, anahtarlar, public/CDN URL).
5. ~~Şirket unvanı/adres~~ — karar: yayınlanmayacak, yayıncı `konsepthane.net`, iletişim `info@konsepthane.net` (uygulandı).
6. ~~GA4~~ — `G-0Q7XW1FPLN` tanımlandı, çerez onayına bağlı yükleniyor. (İsteğe bağlı) sosyal profil URL'leri.
7. Cookiebot hesabı → Domain Group ID → `NEXT_PUBLIC_COOKIEBOT_ID`; dashboard'da Consent Mode + TCF etkin, Custom şablon.
8. Google Cloud OAuth istemcisi (Web application): origin `https://konsepthane.net`, redirect `https://konsepthane.net/api/auth/google/callback`; Client ID/Secret → `.env`.
9. Yayın günü: `.env` doldur → `docker compose -f compose.yaml -f compose.prod.yaml up -d --build` → `reset:launch` (tek yönetici) → demo konsepti sil → Search Console'a sitemap gönder.

## Yayın öncesi ÖNERİLEN

- **Search Console + analitik** (bilinçli olarak en sona bırakıldı): site doğrulama, sitemap gönderimi,
  GA4/Plausible ve buna bağlı **çerez onayı** bileşeni (şu an yok; analitik eklenirse KVKK için gerekli).
- **Hata/uptime izleme:** Sentry benzeri hata toplama, health uçları için uptime kontrolü, merkezi log.
- **Rate limit ayarı:** API'de 100 istek/dk global limit var; giriş ucu için daha sıkı limit + brute-force
  kilidi önerilir.
- **Görsel varlıklar:** `/placeholders/*.svg` illüstrasyonları ana sayfa "Popüler kutlama fikirleri"
  kartlarında kullanılıyor; gerçek fotoğraflarla değiştirilmeli (OG görseli dahil).
- **İngilizce:** `/en` rotaları çalışıyor ama içerik yok; `tr` dışındaki dil indekslenmiyor (doğru).
  İngilizce içerik gelene kadar dil menüsü gizlenebilir.
- **Admin oturum süresi:** access token 15 dk, refresh 30 gün; admin için daha kısa refresh düşünülebilir.
- **Docker prod imajları:** `infra/docker/Dockerfile` var; CI ile imaj üretimi, migrasyonun release
  adımı olarak çalıştırılması (`pnpm db:deploy`) ve rollback stratejisi belgelenmiş ama otomasyonu yok.

## Yayın günü kontrol listesi

1. `.env` production değerleri → `docker compose` (veya hedef platform) ile ayağa kaldır.
2. `pnpm db:deploy` (migrasyonlar) → `pnpm db:seed` **çalıştırma** ve `SEED_SAMPLE_DATA` tanımlama (demo verisi
   üretir); bunun yerine `CONFIRM_RESET=yes ADMIN_PASSWORD=… pnpm db:reset:launch` ile tek yöneticiyi
   oluştur; ardından Redis/Meilisearch/`.next` önbelleklerini temizle.
3. Admin panelinden gerçek editörleri, kategorileri ve ilk içerikleri gir; `pnpm seo:audit`,
   `pnpm seo:schema`, `pnpm seo:render` çalıştır (hepsi `SEO_AUDIT_BASE=https://konsepthane.net`).
4. robots.txt / sitemap'i canlıda doğrula; Search Console'a sitemap gönder; analitik + çerez onayı aç.
5. Yönetici parolasını değiştir, yedekleme ve izleme uyarılarını test et.
