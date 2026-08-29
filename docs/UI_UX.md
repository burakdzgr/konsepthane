# Public UI/UX ve bilgi mimarisi

## CURRENT PROBLEMS

Önceki topluluk ağırlıklı yüzey, çalışan soru, tartışma ve etkileşim özelliklerini ana ürün gibi
gösteriyordu. Kronolojik kartlar içerik keşfinden önce geliyor; büyük kahraman alanı bir yaşam stili
yayınından çok ürün pazarlama sayfası hissi veriyor; metin/emoji kategorileri görsel ilham ihtiyacını
karşılamıyor ve koleksiyonlar planlama panosu yerine kimlik listesi gibi görünüyordu.

Çözüm topluluk özelliklerini kaldırmak değil, onları editoryal içeriğin çevresine yerleştirmektir.
Yönetim, kimlik doğrulama, sorular, yanıtlar, yorumlar, kaydetme, moderasyon ve bildirimler korunur.

## TARGET PRODUCT HIERARCHY

Kamuya açık ürün sırası:

1. Concept veya Guide: bağımsız değer üreten editoryal içerik.
2. Visual Gallery: temayı ve uygulanabilir ayrıntıları gösteren görsel kanıt.
3. Experience: “Bunu yaptım” diyen zorunlu fotoğraflı UGC.
4. Question: “Yardıma ihtiyacım var” diyen bağlamsal veya bağımsız soru.
5. Comment: içeriğin altında kalan kısa tepki ve tartışma.

Ana sayfa bir feed değildir. Topluluk, konseptlerin sosyal kanıtı ve planlama desteğidir. Ticaret ve AI
planlayıcı kapalı özellik bayrakları olarak geleceğe bırakılır.

## HOMEPAGE WIREFRAME

1. Etkinlik odaklı üst navigasyon ve kompakt arama.
2. “Kutlaman için ilham bul” başlığı, arama ve popüler konu bağlantıları olan kompakt hero.
3. Fotoğraf ağırlıklı kategori keşfi; mobilde yatay kaydırma.
4. “Bu hafta ilham verenler”; bir büyük ve iki ikincil editoryal seçim.
5. “Fikirleri keşfet”; Popüler, Yeni ve En çok kaydedilen filtreleriyle görsel grid.
6. “Gerçek insanlar nasıl yapmış?”; fotoğraf ağırlıklı Experience kartları.
7. “Topluluğun hazırladığı panolar”; kolajlı public koleksiyonlar.
8. “Topluluğa danış”; ana sayfayı ele geçirmeyen dört kompakt soru.
9. Hazırlık rehberleri ve sade footer.

Hedef görsel denge yaklaşık yüzde 50–60 Concept/Guide, yüzde 20–30 Experience ve yüzde 10–20
Question/topluluk modülüdür. Bu oranlar veritabanı kuralı değildir.

## CONCEPT DETAIL WIREFRAME

1. Breadcrumb, güçlü H1, kısa giriş, yazar ve yayın/güncelleme tarihi.
2. Kaydet/paylaş eylemleri ve büyük hero/gallery.
3. Giriş, renk paleti, dekorasyon, masa, balon, pasta, mekân, alternatifler ve pratik ipuçları.
4. “Bu konsepti deneyenler” görsel Experience grid’i ve paylaşım CTA’sı.
5. Konseptle ilişkili sorular ve Soru Sor CTA’sı.
6. Yorumlar.
7. Tek katkı seçicisi: Yorum, Soru Sor veya Deneyimini Paylaş. Aynı anda yalnızca seçilen form açılır.
8. SSS ve ilişkili Concept’ler.

Makale topluluk bölümleri olmasa da arama kullanıcısının niyetini tek başına karşılamalıdır.

## QUESTIONS UX

Question “yardıma ihtiyacım var” anlamına gelir. Görsel ekleri isteğe bağlıdır ve Concept ilişkisi
zorunlu değildir. Ana sayfada sorular kısa, düşük yoğunluklu satırlar olarak görünür. `/sorular`
sayfası Popüler, Yeni, Cevapsız ve Takip ettiklerim niyetleriyle daha metin ağırlıklı olabilir; soru
detayında yanıtlar, kabul edilen yanıt, faydalı oyları, takip ve bildirim davranışları görünür kalır.

## EXPERIENCES UX

Experience “bunu gerçekten yaptım” anlamına gelir ve en az bir görsel gerektirir. Kartlarda kullanıcı
fotoğrafı ana yüzeydir; etkinlik, yaş, tema, mekân, yazar, beğeni ve yorum bilgileri ikincildir.
Experience’lar ilgili Concept altında, `/deneyimler`, profil, seçili ana sayfa modülleri ve aramada
görünür. Yeni gönderiler onaylanana kadar `NOINDEX` ve moderasyon kuyruğundadır.

## COLLECTION UX

Public koleksiyonlar görsel moodboard olarak sunulur: kapak kolajı, başlık, sahibi, kısa açıklama ve
kayıtlı fikir sayısı. Koleksiyon detayı Concept, Guide, Experience ve gerektiğinde Question
içeriklerini gerçek başlık/görsel/hedef bağlantılarıyla çözer; ham veritabanı kimlikleri gösterilmez.
Kaydedilenler varsayılan olarak özeldir, kullanıcı açıkça public yaparsa profilde ve keşif modüllerinde
görünebilir.

## NAVIGATION

Masaüstü ana navigasyonu Doğum Günü, Baby Shower, Nişan, Söz & Kına, Fikirler, Deneyimler ve
Sorular sırasını izler. Sağ taraf arama, Kaydedilenler, Profil ve `+ Paylaş` eylemlerini taşır.
Oluşturma ekranında öncelik Fikir/İçerik, Deneyim ve Soru’dadır; Tartışma ilk varsayılan değildir.
Public sayfalarda kalıcı forum tipi sol sidebar kullanılmaz.

## TASARIM SİSTEMİ (2026-08-26 tema güncellemesi)

Referans karışımı: wannart'ın temiz, beyaz-zeminli dergi düzeni ve kategori şeridi + Catch My Party'nin
fotoğraf-öncelikli parti karoları. Uygulama `apps/web/app/globals.css` içindeki token ve bileşen
sınıflarıyla yapılır; sayfalar Tailwind yardımcılarından çok bu sınıfları kullanır.

- Tipografi: tüm sistemde `Poppins` (400/500/600/700; başlıklar 600–700). `next/font/google` ile
  `latin` + `latin-ext`; CSS değişkeni `--font-poppins` → `--font-sans`/`--font-display`.
- Grid: tek konteyner `.wrap` (`--wrap-max: 1240px`, yatay iç boşluk 1.25rem / lg 2rem). Header, konu
  şeridi, bölümler ve footer aynı kenarları paylaşır; okuma sütunları `.wrap.reading` ile 760px'e
  daralır ama sola hizalı kalır (ortalanmış dar blok yok).
- Kart yoğunluğu: konsept/koleksiyon/deneyim kartları 4 sütun (`.card-grid-4`, `.concept-discovery-grid`),
  tablet 3, mobil 2; büyük "öne çıkan" kart yok. Kategori karoları 6 sütun.
- Form alanları: `TextArea`/`TextInput` (`@ilham/ui`, istemci bileşeni) canlı karakter sayacı taşır:
  minimum karşılanmadan "En az N karakter · X karakter daha", ardından "X/N karakter". API doğrulama
  mesajları Türkçeye çevrilerek (`translateValidationMessage`) flash olarak gösterilir.
- Primitif sınıflar (`.btn`, `.field`, `.chip`, `.surface`, `.avatar`, sekmeler, çipler) her iki
  uygulamanın da içe aktardığı `packages/ui/src/primitives.css` dosyasında yaşar.
- Renk: sıcak beyaz `--paper`, krem `--paper-2/3`, mürekkep `--ink`, mercan-gül vurgu `--accent`
  (`#e2606c`), ikincil pastel çipler `--mint`, `--butter`, `--lavender`, `--sky`.
- Bileşen sınıfları: `.btn` (`-primary/-ghost/-soft`), `.field`, `.surface`, `.chip-*`, `.avatar`,
  `.tile` (konsept/koleksiyon kartı: görsel üstünde kategori etiketi + kaydet düğmesi),
  `.party-tile` (deneyim karosu: 4:4.6 fotoğraf, alt gradyan üzerinde başlık, altında yazar/istatistik),
  `.discovery-tabs` (segmentli sekme), `.filter-chips`, `.section-heading`, `.page-header`,
  `.article-hero`, `.cta-band`, `.site-header` + `.topic-strip`, `.site-footer`, `.mobile-bottom-nav`.
- İkonlar: `@ilham/ui` içindeki `Icon` (tek yol SVG seti); unicode glif ikonlar kaldırıldı.
- Sıfır değerli sayaçlar kartlarda ve konsept istatistik şeridinde gizlenir.

## DESIGN TOKENS

Temel token’lar `--paper`, `--ink`, `--muted`, `--line`, `--accent`, `--accent-strong`,
`--accent-soft`, `--surface-cream`, `--surface-stone`, `--surface-sage`, `--surface-lavender`,
`--surface-rose` ve `--shadow-soft` değerleridir. Sıcak beyaz, taş, yumuşak bej, kömür, ölçülü gül,
adaçayı ve gerektiğinde lavanta kullanılır. Görsel dil premium ve sıcak; fakat çocukça, aşırı pembe,
pill/gradient ağırlıklı veya SaaS dashboard görünümünde değildir.

Başlıklarda tek editoryal serif yığını, gövde ve kontrollerde tek okunaklı sans-serif yığını kullanılır.
Türkçe karakterler ve uzun biçimli okuma önceliklidir. Dokunma hedefleri en az 44 px, klavye odağı
görünürdür.

## MOBILE UX

- Üst başlık kompakt kalır; masaüstü kategori navigasyonu kopyalanmaz.
- Kategori kartları yatay kaydırmalı ve görsel ağırlıklıdır.
- İçerik grid’i okunabilir genişlikte iki, gerektiğinde tek sütuna iner.
- Galeri ana görsel + kaydırılabilir/ikincil görseller biçiminde çalışır.
- Katkı seçicisi yalnızca seçilen formu açar ve görsel yükleme alanı kolay erişilir kalır.
- Alt navigasyon: Ana Sayfa, Keşfet, Paylaş, Kaydedilenler ve Profil.

## ACCESSIBILITY AND STATES

Görseller anlamlı olduğunda Türkçe alt metin taşır; yalnızca dekoratif kolaj parçaları boş alt metin
kullanır. Formların görünür veya ekran okuyucu etiketi vardır. Boş, yükleniyor, hata, giriş gerekli ve
moderasyon bekliyor durumları ayrı ve açık metinlerle anlatılır. Hareketler kısa ve dekoratif olmalı;
okumayı veya odağı engellememelidir.
