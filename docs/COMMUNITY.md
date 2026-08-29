# Topluluk mimarisi

## İçerik aileleri

| İçerik   | Model                              | Amaç                          | Birincil etkileşim                       |
| -------- | ---------------------------------- | ----------------------------- | ---------------------------------------- |
| İlham    | `Concept`                          | Görsel ve uygulanabilir fikir | beğen, kaydet, yorumla                   |
| Soru     | `Question` + `Answer`              | Çözüm arama                   | yanıtla, faydalı bul, kabul et, takip et |
| Tartışma | `Discussion`                       | Görüş alışverişi              | yorumla, takip et                        |
| Deneyim  | `Experience` + `ExperienceImage`   | Fotoğraflı gerçek uygulama    | beğen, kaydet, yorumla, bildir           |
| Anket    | `Poll` + `PollOption` + `PollVote` | Tercih toplama                | oy ver, yorumla                          |
| Rehber   | `Guide`                            | Editoryal, kalıcı bilgi       | kaydet, yorumla                          |

`CommunityContentType` çapraz özelliklerin tip güvenli ayırıcısıdır. İçerik sahibinin ve yaşam
döngüsünün kuralları kendi modelinde kalır.

## Konsept altındaki katkı seçicisi

Konsept ve rehberlerde kullanıcıya tek bir genel yorum alanı gösterilmez. “Ne paylaşmak istiyorsun?”
seçicisi aynı anda yalnızca bir form açar:

- `Yorum`: kısa görüş; ortak yorum ağacı, beğeni/faydalı ve rapor.
- `Soru`: yardım niyeti; Concept bağlantılı veya bağımsız olabilir, görsel isteğe bağlıdır.
- `Deneyim`: “bunu yaptım” niyeti; fotoğraf ve görsel hak beyanı zorunludur, moderasyona gider.

Onaylanan Experience ilgili konseptin “Bu konsepti deneyenler” bölümünde, `/deneyimler` görsel
ızgarasında ve yazar profilinde görünür. Zengin ve özgün olmayan Experience varsayılan olarak noindex kalır.

## Akış ve sıralama

Birleşik akış yalnızca `PUBLIC` ve `APPROVED` içerikleri getirir. Varsayılan sıralama deterministiktir:

`puan = tazelik + min(tepki, 20) * 2 + min(yanıt/yorum, 15) * 3 + öne_çıkan * 30`

Aynı puanda `publishedAt DESC, id ASC` kullanılır. “Takip ettiklerim” sekmesi kullanıcı, konu ve içerik
takiplerini uygular. Misafirler için bu sekme giriş çağrısı gösterir.

## Etkileşim kuralları

- Beğeni ve kaydetme farklı tablolardır; sayaçları işlem içinde güncellenir.
- Yorum ağacı en fazla iki cevap seviyesi kabul eder. Servis parent içerik eşleşmesini ve derinliği doğrular.
- Soru sahibi yalnızca kendi sorusuna ait bir yanıtı kabul edebilir. Kabul edilen yanıt tekildir.
- Kullanıcı kendisini takip edemez. Takip sayaçları aynı işlem içinde güncellenir.
- Bir kullanıcı açık ankette tek oy kullanır; seçenek anketle eşleşmelidir.
- Bildirimler mutasyon sonrasında yazılır; kullanıcının kendi eylemi için bildirim üretilmez.

## Konu grafiği

`Topic` organizasyon türü, tema, yaş, renk, bütçe, format ve genel konuları birleştirir. İlk derinlik
`Doğum Günü`dür. `ContentTopic` çapraz bağlantısı servis tarafından hedef içerik varlığı kontrol edilerek
yazılır. Kategori URL'leri korunur; konu sayfaları yeni keşif katmanıdır.

## Sayaçlar ve tutarlılık

Okuma trafiği için denormalize sayaçlar kullanılır. Etkileşim mutasyonları sayaç ve ilişki satırını tek
veritabanı işlemi içinde günceller. Periyodik uzlaştırma işi gerçek ilişki sayılarını tekrar hesaplayabilir.
