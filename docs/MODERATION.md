# Moderasyon politikası ve iş akışı

## Akış

1. İçerik gönderilir ve otomatik kontrollerden geçer.
2. Riskli içerik `UNDER_REVIEW`, normal topluluk içeriği ürün politikasına göre `APPROVED` olur.
3. Kullanıcı raporu bir `ContentReport` ve gerekirse tekil `ModerationCase` oluşturur.
4. Moderatör vakayı üstlenir, iç not ekler ve gerekçeli eylem uygular.
5. Sonuç bildirim olarak içerik sahibine iletilir; eylem denetim kaydında kalır.

## Eylemler

Onayla, reddet, gizle, kaldır, geri getir, tartışmayı kilitle, uyar, sustur ve yasakla desteklenir.
Susturma ve yasak süreli olabilir. Kaldırılmış içerik genel API'den dönmez; yetkili yönetici görünümünde
denetim iziyle erişilebilir.

## Temel ilkeler

- Telif, mahremiyet ve çocuk güvenliği raporları yüksek önceliklidir.
- Moderatör kendi içeriğine ait vakada eylem uygulamaz; yönetici istisnası denetim kaydı gerektirir.
- Gizleme ile kalıcı veri silme birbirinden ayrılır.
- Medya yükleyen kişi sahiplik/lisans/izin beyanı verir; reddedilmiş hak durumu yayınlanamaz.
