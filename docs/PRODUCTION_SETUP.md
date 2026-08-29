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
| 4 | **Let's Encrypt e-postası** | Sertifika bildirimleri | teknik@konsepthane.net |
| 5 | **SMTP bilgileri** `noreply@konsepthane.net` için (host, port, parola; kullanıcı adı çoğu sağlayıcıda adresin kendisi) | Doğrulama / parola sıfırlama e-postaları | Yandex 360, Google Workspace, Zoho, Brevo… |
| 6 | **E-posta alan adı doğrulaması**: SPF, DKIM, DMARC kayıtları (sağlayıcı verir) | Mailler spam'e düşmesin | `TXT @ v=spf1 include:…` |
| 7 | **Nesne depolama** (S3 uyumlu): AWS S3 / Cloudflare R2 / DO Spaces — bucket adı, anahtarlar, public URL/CDN | Yüklenen görseller | `media.konsepthane.net` CNAME → CDN |
| 8 | ~~Şirket bilgileri~~ — karar: unvan/adres yayınlanmaz, yayıncı kimliği `konsepthane.net`; iletişim `info@konsepthane.net`, OTP/parola e-postaları `noreply@konsepthane.net` | Yasal sayfalar, JSON-LD | `.env`'de hazır |
| 9 | ~~GA4 ölçüm kimliği~~ — `G-0Q7XW1FPLN` tanımlandı; yalnızca çerez onayı sonrası yüklenir | Analitik | `NEXT_PUBLIC_GA_ID` |
| 10 | (İsteğe bağlı) Sosyal profil URL'leri | `Organization.sameAs` | Instagram, Pinterest |

Alternatif: sunucu yerine yönetilen platform (Coolify, Railway, Render) kullanılacaksa aynı env
listesi geçerlidir; nginx/certbot adımları platformun TLS'i ile değişir.

## 1. Sunucu hazırlığı

```bash
apt update && apt install -y docker.io docker-compose-plugin git ufw
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
git clone <repo> /srv/konsepthane && cd /srv/konsepthane
cp .env.production.example .env   # tüm CHANGE_ME alanlarını doldur
openssl rand -base64 48            # JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, MEILISEARCH_MASTER_KEY için ayrı ayrı
```

## 2. İlk sertifika (nginx ayağa kalkmadan önce)

```bash
docker compose -f compose.yaml -f compose.prod.yaml run --rm -p 80:80 --entrypoint sh certbot -c \
  "certbot certonly --standalone -d konsepthane.net -d www.konsepthane.net --email $LETSENCRYPT_EMAIL --agree-tos --no-eff-email"
```

Sertifika `certbot-etc` volume'una yazılır; `certbot` servisi 12 saatte bir yeniler. Yenileme sonrası
nginx'i yeniden yükle: `docker compose -f compose.yaml -f compose.prod.yaml exec nginx nginx -s reload`
(cron'a `0 4 * * *` olarak eklenebilir).

## 3. Uygulamayı başlatma

```bash
docker compose -f compose.yaml -f compose.prod.yaml up -d --build
# migrate servisi sadece `pnpm db:deploy` çalıştırır (örnek veri seed'i yok)
CONFIRM_RESET=yes ADMIN_EMAIL=admin@konsepthane.net ADMIN_USERNAME=konsepthane ADMIN_PASSWORD='…' \
  docker compose -f compose.yaml -f compose.prod.yaml exec migrate pnpm --filter @ilham/database reset:launch
```

`reset:launch` yalnızca **ilk kurulumda** (boş veritabanı) çalıştırılır. Sonrasında admin
panelinden içerik girin: https://konsepthane.net/admin/giris (kullanıcı adı `konsepthane`).

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
2. Dashboard → *Dialog*: şablon **Custom** (tema CSS'imizin ezilmemesi için), dil **Türkçe**
   (`data-culture` sayfa diline göre gönderilir), "Reddet" butonu **açık** (GDPR: red kabul kadar kolay).
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
