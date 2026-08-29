# İçerik türleri ve yayın kuralları

## Ortak durumlar

- `visibility`: `PUBLIC`, `UNLISTED`, `HIDDEN`, `REMOVED`
- `moderationStatus`: taslak, gönderildi, incelemede, onaylandı, reddedildi, arşivlendi
- `indexability`: bekliyor, indeksle, noindex

Yayınlanmak görünür olmakla, görünür olmak da indekslenmekle aynı şey değildir.

## Kalite eşiği

Bir detay URL'si ancak başlık ve gövde asgari uzunluklarını geçiyor, herkese açık, moderasyondan onaylı,
özgün kanonik URL'ye sahip ve spam/ince içerik sinyali taşımıyorsa `INDEX` olabilir. Soru sayfalarında
anlamlı gövde ve en az bir görünür yanıt tercih edilir; geçerli kabul edilmiş yanıt varsa `QAPage`
yapılandırılmış verisi üretilebilir. Cevapsız veya zayıf sorular erişilebilir kalır ama `noindex` olur.

## Oluşturma deneyimi

Oluşturucu önce niyeti seçtirir: İlham paylaş, Soru sor, Tartışma başlat, Deneyim anlat veya Anket oluştur.
Her form yalnızca kendi iş kuralı alanlarını gösterir. Rehber editoryal akıştan yayınlanır.

## Silme ve düzenleme

Kullanıcı içeriği doğrudan fiziksel silinmez; görünürlük kaldırılır ve denetim izi korunur. Düzenlemeler
`updatedAt` ile, yorum düzenlemeleri ayrıca `editedAt` ile işaretlenir. Moderasyon eylemleri gerekçe ve
aktörle kaydedilir.
