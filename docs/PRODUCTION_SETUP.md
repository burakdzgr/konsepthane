# Canlıya alma kılavuzu (konsepthane.net)

Bu belge sunucu, alan adı, TLS, ortam değişkenleri, e-posta ve yedekleme kurulumunu adım adım
anlatır. Kod tarafı hazır; aşağıdaki **"Senden gerekenler"** listesindeki bilgiler olmadan
kurulum tamamlanamaz.

## Senden gerekenler

| # | Ne | Neden | Örnek |
| --- | --- | --- | --- |
| 1 | **Sunucu**: Ubuntu 22.04/24.04, ≥2 vCPU / 4 GB RAM / 40 GB disk, Docker + Compose kurulu, SSH erişimi | Uygulama Docker ile çalışır | Hetzner CX22, DigitalOcean 4 GB |
| 2 | **Alan adı DNS yetkisi** (konsepthane.net) | A/AAAA kayıtları | Registrar/Cloudflare paneli |
| 3 | **DNS kayıtları**: `konsepthane.net` → sunucu IP (A), `www` → aynı IP (A veya CNAME) | TLS ve yönlendirme | `A @ 1.2.3.4`, `A www 1.2.3.4` |
| 4 | ~~Let's Encrypt~~ — TLS'i Plesk veriyor | — | — |
| 5 | **Brevo SMTP**: `smtp-relay.brevo.com:587`, SMTP login + SMTP key; `noreply@konsepthane.net` sender, domain authenticated (SPF/DKIM/DMARC) | Doğrulama / parola sıfırlama e-postaları | `info@` Plesk posta kutusu olarak kalır |
| 6 | **E-posta alan adı doğrulaması**: SPF, DKIM, DMARC kayıtları (sağlayıcı verir) | Mailler spam'e düşmesin | `TXT @ v=spf1 include:…` |
| 7 | **Cloudflare R2**: bucket `konsepthane-media`, API token (Access Key ID / Secret), public custom domain `media.konsepthane.net` | Yüklenen görseller | `S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com` |
| 8 | ~~Şirket bilgileri~~ — karar: unvan/adres yayınlanmaz, yayıncı kimliği `konsepthane.net`; iletişim `info@konsepthane.net`, OTP/parola e-postaları `noreply@konsepthane.net` | Yasal sayfalar, JSON-LD | `.env`'de hazır |
| 9 | ~~GA4 ölçüm kimliği~~ — `G-0Q7XW1FPLN` tanımlandı; yalnızca çerez onayı sonrası yüklenir | Analitik | `NEXT_PUBLIC_GA_ID` |
| 10 | (İsteğe bağlı) Sosyal profil URL'leri | `Organization.sameAs` | Instagram, Pinterest |

Alternatif: sunucu yerine yönetilen platform (Coolify, Railway, Render) kullanılacaksa aynı env
listesi geçerlidir; nginx/certbot adımları platformun TLS'i ile değişir.

## 1. Kurulum şekli (Plesk ile aynı sunucu)

Sunucuda Plesk'in nginx'i 80/443'ü ve TLS'i (Let's Encrypt eklentisi) yönetir; Cloudflare proxy
öndedir. Proje Docker'da, yalnızca `127.0.0.1`'e bağlı portlarda çalışır ve Plesk `konsepthane.net`
isteklerini projenin kendi nginx'ine (`127.0.0.1:8180`) proxy'ler. Public URL'ler değişmez.

| Host portu | Servis |
| --- | --- |
| `127.0.0.1:8180` | proje nginx'i (web/admin/api yönlendirmesi) — `NGINX_PORT` |
| `127.0.0.1:3210 / 3211 / 4010 / 4011` | web / admin / api / worker (`*_PORT`) |
| — | postgres, redis, meilisearch host'a bağlanmaz |

Medya Cloudflare R2'de (`media.konsepthane.net`), e-posta Brevo SMTP'de; MinIO/Mailpit yalnızca
`dev` profilinde. `NEXT_PUBLIC_*` değerleri `compose.prod.yaml` build arg'larıyla Next.js
bundle'ına derlenir — bu değerler değişirse `infra/deploy/update.sh` (yeniden build) gerekir.

## 2. İlk kurulum

```bash
# sunucuda (root)
git clone <repo> /opt/konsepthane && cd /opt/konsepthane
# yerelde hazırlanan .env.production dosyasını .env olarak kopyalayın (scp) — asla repo'ya girmez
docker builder prune -f && docker image prune -f      # yer açmak için (diğer projelerin çalışan imajlarına dokunmaz)
./infra/deploy/install.sh
```

`install.sh`: `.env`'deki boş alanları ve port çakışmalarını kontrol eder, imajları sırayla derler
(RAM için), `up -d` yapar, api sağlıklı olana kadar bekler, kullanıcı tablosu boşsa `reset:launch`
ile admin'i (`ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD`) oluşturur.

`reset:launch` boş bir yayın veritabanında önce yapısal veriyi kurar (`prisma/bootstrap.ts`: rol/izin
kataloğu ve grant'ler, kategoriler, etkinlik türleri, temalar, renkler, konular, özellik bayrakları — içerik
ya da örnek üye yok), sonra tek `super_admin`'i oluşturur; tekrar çalıştırmak kayıt çoğaltmaz. Aynı bootstrap
yerel örnek seed'i (`SEED_SAMPLE_DATA=1`) tarafından da kullanılır. Test: `TEST_DATABASE_URL=… pnpm --filter
@ilham/database test` (boş DB → migrate → reset → tek admin, tüm izinler).

## 3. Plesk tarafı

Websites & Domains → `konsepthane.net` → **Apache & nginx Settings**:
- **Proxy mode**: kapalı (nginx doğrudan servis etsin)
- **Smart static files processing**: kapalı (aksi halde `/_next/static` Plesk'ten 404 döner)
- **Additional nginx directives**: `infra/plesk/nginx-directives.conf` içeriğini yapıştırın
  (`location / { proxy_pass http://127.0.0.1:8180; … }`)

SSL/TLS Certificates → Let's Encrypt → `konsepthane.net` + `www` (Cloudflare proxy açıkken de
HTTP-01 çalışır) → "Permanent SEO-safe 301 redirect from HTTP to HTTPS" açık. Cloudflare → SSL/TLS
→ **Full (strict)**. `www` → apex yönlendirmesini proje nginx'i de yapar.

Güncelleme: `./infra/deploy/update.sh` (git pull → build → up; migrasyonlar `migrate` servisinde).

## 4. Doğrulama

```bash
curl -I https://konsepthane.net/tr           # 200, HSTS başlığı
curl -I https://konsepthane.net/api/v1/health/live
SEO_AUDIT_BASE=https://konsepthane.net pnpm seo:audit
SEO_AUDIT_BASE=https://konsepthane.net pnpm seo:schema
```

Kayıt akışı: https://konsepthane.net/tr/kayit → doğrulama e-postası → giriş; parola sıfırlama:
/tr/sifremi-unuttum. E-posta gelmiyorsa `docker compose logs api | grep mail`.

## 5. Yedekleme

- **Veritabanı**: `postgres-backup` servisi her gün `./backups/` altına sıkıştırılmış `pg_dump` alır
  (14 günlük, 8 haftalık, 6 aylık saklama; `.env` ile ayarlanır). Geri yükleme:
  `./infra/backup/restore.sh backups/daily/<dosya>.sql.gz` (önce `_restore` veritabanına yükler,
  doğrulayıp takas edersiniz).
- **Yedeği sunucu dışına taşıma**: `backups/` klasörünü `rclone`/`restic` ile ayrı bir bucket'a
  günlük kopyalayın (cron). Yönetilen PostgreSQL kullanıyorsanız sağlayıcının PITR'ını açın.
- **Medya**: `./infra/backup/media-sync.sh` ana bucket'ı ikinci bir bucket'a aynalar (rclone).
- **Geri yükleme tatbikatı**: ayda bir, dump'ı yerelde `_restore` veritabanına yükleyip uygulamayı
  ona bağlayarak deneyin.

## 6. İşletme

- Loglar: `docker compose -f compose.yaml -f compose.prod.yaml logs -f api web`.
- Güncelleme: `git pull && docker compose -f compose.yaml -f compose.prod.yaml up -d --build`
  (migrate servisi migrasyonları uygular).
- Search Console: sitemap `https://konsepthane.net/sitemap.xml`; içerik ekledikçe manuel gönderim.
- Analitik: `NEXT_PUBLIC_GA_ID` doldurulunca, çerez onayı veren ziyaretçilerde GA4 yüklenir.

## 7. Google ile devam et (OAuth istemcisi)

Uygulama Google'ın **Authorization Code + PKCE** akışını kullanır: tarayıcı `GET /api/auth/google`
(web sunucusu) → Google → `GET /api/auth/google/callback` (web sunucusu, client secret burada
kullanılır) → API `POST /v1/auth/google` (ID token doğrulaması + hesap eşleme) → normal üye
oturumu çerezleri. Google Cloud Console → APIs & Services → Credentials → **OAuth client ID**
(**Web application**) oluştururken tam olarak şu değerleri girin:

| Alan | Production | Development (yerel) |
| --- | --- | --- |
| Authorized JavaScript origins | `https://konsepthane.net` | `http://localhost:3200` |
| Authorized redirect URIs | `https://konsepthane.net/api/auth/google/callback` | `http://localhost:3200/api/auth/google/callback` |

- `www.konsepthane.net` origin'i **gerekmez**: nginx `www` isteklerini oturum başlamadan önce
  apex'e 301 ile yönlendirir; callback yalnızca apex'te çalışır.
- Nginx ile 8180 üzerinden geliştiriyorsanız ek olarak `http://localhost:8180` +
  `http://localhost:8180/api/auth/google/callback` ekleyin (`WEB_URL` ile eşleşmeli).
- OAuth consent screen: uygulama adı "Konsepthane", kapsamlar yalnızca `openid`, `email`,
  `profile` (hassas kapsam yok → doğrulama gerekmez). Yayın durumu "In production" olmalı, yoksa
  yalnızca test kullanıcıları giriş yapabilir.

Ortam değişkenleri ve hangi servise verildiği:

| Değişken | Servis | Not |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | web | Yetkilendirme URL'si ve kod değişimi |
| `GOOGLE_CLIENT_SECRET` | web (yalnızca sunucu) | Asla `NEXT_PUBLIC_` değil; loglanmaz, tarayıcıya gitmez |
| `GOOGLE_CLIENT_IDS` | api | Virgülle ayrılmış izinli audience listesi: şimdilik web client id; Android/iOS istemcileri eklendikçe genişletilir |
| `WEB_URL` | web, api | Callback URI (`WEB_URL/api/auth/google/callback`) ve e-posta linkleri buradan üretilir |

Compose `env_file: .env` her servise aynı dosyayı verir; web `GOOGLE_CLIENT_SECRET`'ı yalnızca
sunucu tarafındaki route handler'da okur. Plesk/ayrı servis kurulumunda secret'ı sadece web
servisinin ortamına koymak yeterlidir.

## 8. Çerez onayı (Cookiebot CMP) ve AdSense hazırlığı

Site, Google sertifikalı ve IAB TCF v2.2 uyumlu **Cookiebot (Usercentrics)** CMP'sini kullanır;
custom banner kaldırıldı. Diyalog sayfaya enjekte edildiği için görünümü `globals.css` içindeki
"Cookiebot dialog" bölümüyle Konsepthane tasarımına uyarlanmıştır.

Kurulum (https://www.cookiebot.com):
1. Hesap aç → Domain: `konsepthane.net` (ve yerel test için `localhost`) → **Domain Group ID**'yi
   `.env` → `NEXT_PUBLIC_COOKIEBOT_ID` olarak gir (public bir kimliktir, secret değildir).
2. Dashboard → *Dialog*: **hazır şablon** kullanın (Template: **Default** — çok seviyeli diyalog);
   **"Custom banner" seçmeyin** (o seçenek banner HTML'ini sıfırdan yazmanızı ister). Renk/yazı tipi
   alanlarını varsayılan bırakın; site CSS'i `#CybotCookiebotDialog` markup'ını kendi tasarımına boyar.
   Dil **Türkçe** (`data-culture` sayfa diline göre gönderilir), "Reddet" butonu **açık** (GDPR: red kabul
   kadar kolay), Consent Method **Explicit Consent**.
3. *Settings → Google Consent Mode*: **etkin** — Cookiebot `analytics_storage`, `ad_storage`,
   `ad_user_data`, `ad_personalization` sinyallerini kullanıcının kategori seçimine göre kendisi
   gönderir; sayfa `<head>`'i tüm sinyalleri `denied` ile başlatır (`wait_for_update: 500`).
4. *Settings → IAB TCF*: **etkin** (AdSense/AB kullanıcıları için zorunlu); Google'ı satıcı olarak
   ekleyin.
5. Tarama (scan) tamamlanınca çerezlerin doğru kategoriye atandığını kontrol edin: oturum
   çerezleri (`ilham_member_*`, `konsepthane_admin_*`, `kh_oauth`) → **Necessary**, `_ga*` →
   **Statistics**, reklam çerezleri → **Marketing**.
6. Doğrulama: onay öncesi ağ sekmesinde `googletagmanager.com` isteği **olmamalı**; "Tümünü
   kabul et" sonrası `gtag.js` yüklenmeli; "Reddet" sonrası hiç yüklenmemeli; footer "Çerez
   ayarları" pencereyi yeniden açmalı. `document.cookie` içinde `CookieConsent` çerezi görünmeli.

AdSense öncesi sıra: gerçek içerik (kategori başına yayınlanmış konseptler)
→ CMP canlı ve TCF etkin → `ads.txt` (AdSense'in verdiği satır) `apps/web/public/ads.txt` →
AdSense site doğrulama → reklam alanları için sabit boyutlu, CLS üretmeyen kutular →
Çerez Politikası'na "Reklam" kategorisi/satıcı listesi zaten eklendi (Cookiebot bildirimi TCF
satıcı listesini kendisi gösterir).

Ücretsiz plan sınırı: Cookiebot ücretsiz katman tek alan adı ve ~50 alt sayfa tarar; site
büyüdükçe ücretli plana geçmek gerekir (alternatif: CookieYes, aynı entegrasyon adımları).

## 9. Güvenlik başlıkları (Lighthouse "Best Practices")

- **HSTS** (`max-age=31536000; includeSubDomains`) ve **COOP** (`same-origin`): hem web uygulaması
  (`next.config.ts headers()`) hem proje nginx'i ekler. Cloudflare → SSL/TLS → Edge Certificates →
  HSTS'i de açın (Cloudflare kenarında da gönderilsin). `preload` bilinçli olarak kapalı.
- **CSP** (`apps/web/lib/csp.ts`, `proxy.ts`): istek başına nonce + `strict-dynamic`. Next'in kendi
  script'leri nonce'u CSP istek başlığından alır; Cookiebot bootstrap'i `x-nonce` ile alır; Cookiebot ve
  onay sonrası GA'nın enjekte ettiği script'ler `strict-dynamic` sayesinde geçer. Allowlist:
  Cookiebot, Google Analytics/Tag Manager/google.com/doubleclick (ping'ler), `media.konsepthane.net`
  (görsel), `*.googleusercontent.com` (Google avatarları). `style-src 'unsafe-inline'` kalır (Cookiebot
  inline stil basar).
- İhlaller `/api/csp-report`'a gider ve `docker compose … logs web | grep '\[csp\]'` ile görülür.
  Yeni bir üçüncü taraf (AdSense vb.) eklenecekse önce `.env` → `CSP_REPORT_ONLY=1` ile gözlemleyin,
  allowlist'i genişletip `0`'a çekin.
- Bilinçli olarak yapılmayan: Trusted Types (`require-trusted-types-for`) — React/Next ve Cookiebot'un
  DOM enjeksiyonunu kırar.
