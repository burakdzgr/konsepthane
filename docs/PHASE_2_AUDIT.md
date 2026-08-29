# Phase 2 başlangıç denetimi

## Korunan Phase 1 temeli

- `apps/web`, `apps/admin`, `apps/api` ve `apps/worker` sınırları korunur.
- NestJS modüler monolit, merkezi JWT/RBAC, Prisma/PostgreSQL, Redis/BullMQ, Meilisearch, MinIO ve Nginx altyapısı yeniden yazılmaz.
- Kategori ve konsept URL'leri korunur; topluluk detay sayfaları bunların yanına eklenir.
- Ticaret, reklam, satış ortaklığı, tedarikçi pazaryeri ve lead üretimi özellik bayraklarıyla kapalı kalır.

## Tespit edilen boşluklar

- Birleşik topluluk akışı, konu grafiği, soru-cevap, tartışma, anket, rehber ve üye profili yoktu.
- Yorum modeli temel bir ağaçtı; kontrollü derinlik, görünürlük, moderasyon ve tepki alanları eksikti.
- Kaydetme ile beğeni ayrışmıyordu; takip, bildirim, rapor ve yaptırım modelleri yoktu.
- İndekslenebilirlik içerik kalitesinden bağımsız yönetilemiyordu.
- Ana sayfa dergi/landing yapısındaydı; topluluk ürünü kimliği taşımıyordu.

## Uygulama kararı

İlham, soru, tartışma, etkinlik deneyimi, anket ve rehber ayrı iş agregalarıdır. Ana akış bu ayrı
kaynakları uygulama katmanında ortak bir sunum sözleşmesine dönüştürür. Polimorfik ilişki yalnızca
konu bağlantısı, tepki, kaydetme, bildirim ve raporlama gibi çapraz özelliklerde kullanılır; soru-cevap,
anket-seçenek-oy ve kullanıcı takibi gibi bütünlük isteyen ilişkiler gerçek yabancı anahtarlara sahiptir.

## Teslim ölçütleri

- Şema değişikliği sıfırlamasız migration ile uygulanır.
- Örnek veriler yalnızca geliştirme ortamında yüklenir; yayın veritabanına girmez.
- Yalnızca onaylı, herkese açık ve kalite eşiğini geçen detaylar indekslenebilir.
- Liste sayfaları filtre kombinasyonlarını varsayılan olarak indeksletmez.
- Masaüstünde üç sütunlu akış, mobilde alt gezinme bulunur.
