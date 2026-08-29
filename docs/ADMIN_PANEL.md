# Konsepthane yönetim paneli

Panelin amacı veri tablosu göstermek değil, her operasyonu doğru giriş noktasına ve güvenli yayın
akışına yönlendirmektir. Menü yalnızca oturumdaki kullanıcının güncel yetkileriyle erişebildiği
ekranları gösterir.

## Hangi veri nereden yönetilir?

| Veri          | Panel ekranı                          | Kullanım                                                      | Yayın etkisi                                              |
| ------------- | ------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------- |
| Konsept       | İçerik üretimi → Konseptler           | Ana fikir, kategori, görsel, bütçe, editoryal bölümler, SSS   | `PUBLISHED + INDEX` olduğunda herkese açık keşfe girer    |
| Rehber        | İçerik üretimi → Rehberler            | Uzun biçimli uygulanabilir içerik ve yazar byline'ı           | Yayın ve indeksleme birlikte kontrol edilir               |
| Kategori      | İçerik üretimi → Kategoriler          | Konseptlerin ana sınıflandırması ve kategori giriş metni      | Yalnızca yayınlanan kategori herkese açıktır              |
| Konu          | İçerik üretimi → Konular              | Etkinlik, tema, yaş, renk ve format keşif grafiği             | Bu ekran gözlem ekranıdır; içerik kapsamını gösterir      |
| Deneyim       | İnceleme merkezi → Deneyimler         | Fotoğraflı üye uygulaması, konsept bağı ve SEO uygunluğu      | Onaylanan kayıt görünür; noindex ayrıca yönetilir         |
| Soru          | İnceleme merkezi → Sorular            | Görünürlük, moderasyon, indeksleme, öne çıkarma               | Public + approved kayıtlar yayınlanır                     |
| Yorum         | İnceleme merkezi → Yorumlar           | Kısa yorum ve yanıt görünürlüğü                               | Gizleme ve geri getirme anında uygulanır                  |
| Rapor/vaka    | İnceleme merkezi → Moderasyon kuyruğu | Öncelik, rapor nedeni, içerik bağlamı ve eylem geçmişi        | Kısıtlayıcı eylemler içerik görünürlüğünü değiştirir      |
| Editör        | Ekip ve erişim → Editörler            | Gerçek yazar profili, biyografi, uzmanlık, sosyal bağlantılar | Aktif ve public editör profili site ve sitemap'te görünür |
| Kullanıcı/rol | Ekip ve erişim → Kullanıcılar         | Hesap durumu ve en az ayrıcalıklı rol ataması                 | Rol değişikliği yenileme oturumlarını iptal eder          |
| Denetim kaydı | Ekip ve erişim → Denetim izi          | Aktör, hedef, istek kimliği ve işlem zamanı                   | Salt okunur güvenlik kanıtıdır                            |

## Standart editoryal akış

1. İçeriği `DRAFT` olarak oluşturun.
2. Özet, görsel alt metni, gerçek yazar ve bağlantıları tamamlayın.
3. `IN_REVIEW` durumuna alın ve herkese açık önizlemeyi kontrol edin.
4. Yayına hazır olduğunda `PUBLISHED` yapın.
5. Arama görünürlüğü uygunsa `INDEX`; taslak, inceleme veya zayıf UGC için `NOINDEX` kullanın.

## Erişim ve güvenlik

- Panel görünürlüğü yetki kontrolünün yerine geçmez; her API rotası JWT, canlı hesap durumu ve
  permission guard ile korunur.
- Editörler yalnızca sınırlı byline seçeneklerini okur; tüm kullanıcı envanteri için `user.read`
  gerekir.
- Yönetim mutasyonları istek gövdesi olmadan denetim izine kaydedilir.
- Kalıcı silme, hesap kapatma, rol kaldırma ve görünürlük azaltma işlemleri kullanıcı onayı ister.
- Çıkış, yalnızca çerezi değil sunucu tarafındaki yenileme oturumunu da iptal eder.
