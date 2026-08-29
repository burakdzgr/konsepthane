import type { Locale } from '@/lib/i18n';
import { siteIdentity } from '@/lib/site';

/**
 * Trust pages: who publishes Konsepthane, how to reach us, how personal data is handled and the
 * terms members accept. The Turkish texts follow the KVKK (6698) disclosure structure and the
 * platform's actual data flows (account, contributions, uploads, cookies). Legal review before
 * launch is still required; the structure is final, wording may be refined by counsel.
 */
export type TrustSection = { heading: string; paragraphs?: string[]; bullets?: string[] };
export type TrustPageContent = {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  sections: TrustSection[];
};

const { legalName, contactEmail, privacyEmail } = siteIdentity;

const about: Record<Locale, TrustPageContent> = {
  tr: {
    eyebrow: 'Hakkımızda',
    title: 'Konsepthane kimdir?',
    description:
      'Türkiye’de özel gün planlayan insanlara güvenilir, görsel ve uygulanabilir kutlama fikirleri sunan editoryal bir platform.',
    updatedAt: '2026-08-28',
    sections: [
      {
        heading: 'Neden varız',
        paragraphs: [
          '“Bu özel günü nasıl düzenlemeliyim?” sorusu çoğu zaman dağınık Pinterest panoları, çelişkili blog yazıları ve “bize ulaşın” diyen organizasyon sitelerine takılıp kalır. Konsepthane bu boşluğu üç şeyi bir araya getirerek kapatır: editoryal olarak hazırlanmış konseptler, aynı konsepti gerçekten uygulayan insanların fotoğraflı deneyimleri ve planlama sorularına verilen gerçek yanıtlar.',
          'Her konsept malzeme listesi, bütçe aralığı, mekân önerisi ve pratik ipuçlarıyla gelir. Ne kadar pasta gerekir, arka fon kaç metre olmalı, iki saatlik bir kutlama nasıl akmalı gibi sorulara kaynağı belli cevaplar veririz.',
        ],
      },
      {
        heading: 'Nasıl çalışıyoruz',
        bullets: [
          'Konseptleri ve rehberleri Konsepthane editörleri hazırlar; her sayfada yazar ve yayın tarihi görünür.',
          'Gıda güvenliği, çocuk sağlığı ve kişisel veriler gibi konularda yalnızca resmi kaynaklara atıf yaparız; kaynak hiyerarşimiz Editoryal Standartlar sayfasında açıklanır.',
          'Topluluk içerikleri (deneyim, soru, yorum) yayınlanmadan önce moderasyondan geçer.',
          'Sponsorlu içerik, reklam ve satış ortaklığı bu aşamada kapalıdır. Açıldığında görünür şekilde etiketlenecektir.',
        ],
      },
      {
        heading: 'Künye',
        bullets: [`Yayıncı: ${legalName}`, `İletişim: ${contactEmail}`, 'Kuruluş: 2026'],
      },
    ],
  },
  en: {
    eyebrow: 'About',
    title: 'Who is behind Konsepthane?',
    description:
      'An editorial platform giving people in Türkiye trustworthy, visual and actionable celebration ideas.',
    updatedAt: '2026-08-28',
    sections: [
      {
        heading: 'Why we exist',
        paragraphs: [
          'Planning a special day usually ends in scattered Pinterest boards, contradictory blog posts and event-company sites that only say “contact us”. Konsepthane closes that gap by combining editorial concepts, photo-backed experiences from people who actually used them, and real answers to planning questions.',
          'Every concept ships with a materials list, a budget range, venue suggestions and practical tips, with sourced answers to questions like how much cake to order or how long a two-hour party should run.',
        ],
      },
      {
        heading: 'How we work',
        bullets: [
          'Concepts and guides are written by Konsepthane editors; author and publication date are visible on every page.',
          'For food safety, child health and personal data we cite official sources only; the source hierarchy is explained on the Editorial Standards page.',
          'Community content (experiences, questions, comments) is moderated before it goes live.',
          'Sponsored content, ads and affiliate links are currently off. When enabled, they will be clearly labelled.',
        ],
      },
      {
        heading: 'Imprint',
        bullets: [`Publisher: ${legalName}`, `Contact: ${contactEmail}`, 'Founded 2026'],
      },
    ],
  },
};

const contact: Record<Locale, TrustPageContent> = {
  tr: {
    eyebrow: 'İletişim',
    title: 'Bize ulaşın',
    description:
      'Editoryal öneri, düzeltme talebi, gizlilik başvurusu veya iş birliği için doğru adresi seçin.',
    updatedAt: '2026-08-28',
    sections: [
      {
        heading: 'Adresler',
        bullets: [
          `Genel ve editoryal: ${contactEmail}`,
          `Kişisel veri (KVKK) başvuruları: ${privacyEmail}`,
        ],
      },
      {
        heading: 'Düzeltme ve şikâyet',
        paragraphs: [
          'Bir konseptte hatalı bilgi, eksik kaynak veya hak ihlali fark ettiyseniz sayfa bağlantısıyla birlikte yazın. Editoryal düzeltmeleri en geç beş iş günü içinde değerlendirir, düzeltilen sayfalarda güncelleme tarihini görünür hale getiririz.',
          'Topluluk içeriğiyle ilgili şikâyetler için içeriğin altındaki “Bildir” bağlantısı en hızlı yoldur; her bildirim moderasyon kaydına gerekçesiyle işlenir.',
        ],
      },
      {
        heading: 'Yanıt süresi',
        paragraphs: [
          'E-postalara iş günlerinde 48 saat içinde dönüş yapmayı hedefliyoruz. KVKK kapsamındaki başvurular kanunen en geç 30 gün içinde sonuçlandırılır.',
        ],
      },
    ],
  },
  en: {
    eyebrow: 'Contact',
    title: 'Get in touch',
    description:
      'Pick the right address for editorial suggestions, corrections, privacy requests or partnerships.',
    updatedAt: '2026-08-28',
    sections: [
      {
        heading: 'Addresses',
        bullets: [
          `General and editorial: ${contactEmail}`,
          `Personal data requests: ${privacyEmail}`,
        ],
      },
      {
        heading: 'Corrections and complaints',
        paragraphs: [
          'If you spot an error, a missing source or a rights issue in a concept, email us with the page link. Editorial corrections are reviewed within five business days and corrected pages show their update date.',
          'For community content the “Report” link under each item is the fastest route; every report is logged with its reason for moderation.',
        ],
      },
      {
        heading: 'Response time',
        paragraphs: [
          'We aim to reply to email within 48 hours on business days. Data-protection requests are resolved within the statutory 30 days.',
        ],
      },
    ],
  },
};

const privacy: Record<Locale, TrustPageContent> = {
  tr: {
    eyebrow: 'Gizlilik',
    title: 'Kişisel Verilerin Korunması ve Gizlilik Politikası',
    description:
      '6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında hangi verilerinizi, neden ve ne kadar süreyle işlediğimize dair aydınlatma metni.',
    updatedAt: '2026-08-28',
    sections: [
      {
        heading: 'Veri sorumlusu',
        paragraphs: [
          `Bu platformda işlenen kişisel veriler bakımından veri sorumlusu ${legalName}’dir. Başvurularınız için: ${privacyEmail}.`,
        ],
      },
      {
        heading: 'İşlenen veriler',
        bullets: [
          'Hesap verileri: e-posta adresi, kullanıcı adı, görünen ad, şehir, profil fotoğrafı.',
          'Katkı verileri: paylaştığınız deneyim, soru, yorum, anket ve yüklediğiniz fotoğraflar ile bunlara ait tarih, beğeni ve kayıt bilgileri.',
          'Teknik veriler: IP adresi, tarayıcı ve cihaz bilgisi, oturum çerezleri, hata kayıtları.',
          'Tercih verileri: dil seçimi, kaydedilen içerikler ve koleksiyonlar, takip ettiğiniz sorular ve konular, bildirim ayarları.',
        ],
      },
      {
        heading: 'İşleme amaçları ve hukuki sebepler',
        bullets: [
          'Üyelik sözleşmesinin kurulması ve ifası (hesap açma, içerik paylaşma, kaydetme) — KVKK m.5/2-c.',
          'Platform güvenliği, moderasyon ve hukuki yükümlülüklerin yerine getirilmesi — KVKK m.5/2-ç ve m.5/2-f.',
          'Hizmetin iyileştirilmesi için anonimleştirilmiş kullanım analizi — meşru menfaat, KVKK m.5/2-f.',
          'Tanıtım e-postaları ve isteğe bağlı bildirimler — yalnızca açık rızanızla, KVKK m.5/1.',
        ],
      },
      {
        heading: 'Fotoğraflar ve çocuklara ait veriler',
        paragraphs: [
          'Deneyim paylaşırken yüklediğiniz fotoğraflar herkese açık olarak yayınlanır. Çocukların yüzü, okul, adres ve iletişim bilgisi gibi kişisel verileri içeren fotoğrafları yüklemeden önce ilgili kişilerin (veli/vasi) iznini almanız gerekir; Topluluk Kuralları bu konuda bağlayıcıdır. Talep halinde bu tür görselleri gecikmeden kaldırırız.',
        ],
      },
      {
        heading: 'Aktarım',
        paragraphs: [
          'Verileriniz yalnızca hizmetin sunulması için zorunlu olan barındırma, e-posta gönderimi ve medya depolama sağlayıcılarıyla, sözleşme ve KVKK m.8–9 çerçevesinde paylaşılır. Verileriniz satılmaz ve reklam ağlarıyla paylaşılmaz.',
        ],
      },
      {
        heading: 'Çerezler',
        paragraphs: [
          'Oturum çerezleri (giriş durumu) ve dil tercihi çerezi zorunlu çerezlerdir. Yayın öncesinde eklenecek analitik ölçüm, yalnızca toplu ve anonim kullanım istatistiği amacıyla kullanılacak; üçüncü taraf reklam çerezi kullanılmayacaktır.',
        ],
      },
      {
        heading: 'Saklama süresi',
        bullets: [
          'Hesap verileri üyelik süresince ve hesabın kapatılmasından itibaren en fazla 1 yıl (hukuki uyuşmazlık ihtimali için) saklanır.',
          'Herkese açık katkılar, siz kaldırmadıkça veya moderasyon kararıyla kaldırılmadıkça yayında kalır; kaldırılan içerik denetim izi olarak 2 yıl tutulur.',
          'Sunucu ve güvenlik kayıtları en fazla 6 ay saklanır.',
        ],
      },
      {
        heading: 'Haklarınız (KVKK m.11)',
        bullets: [
          'Kişisel verinizin işlenip işlenmediğini öğrenme ve bilgi talep etme.',
          'İşleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme.',
          'Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme.',
          'Eksik veya yanlış işlenmişse düzeltilmesini, şartları oluşmuşsa silinmesini veya yok edilmesini isteme.',
          'Otomatik sistemlerle analiz sonucu aleyhinize bir sonucun ortaya çıkmasına itiraz etme.',
          'Kanuna aykırı işleme nedeniyle zarara uğramanız hâlinde zararın giderilmesini talep etme.',
        ],
      },
      {
        heading: 'Başvuru',
        paragraphs: [
          `Başvurularınızı ${privacyEmail} adresine, kimliğinizi doğrulayan bilgiyle birlikte iletebilirsiniz. Başvurular en geç 30 gün içinde ücretsiz olarak sonuçlandırılır. Bu metin değiştiğinde güncelleme tarihi sayfanın başında görünür.`,
        ],
      },
    ],
  },
  en: {
    eyebrow: 'Privacy',
    title: 'Privacy and Personal Data Notice',
    description:
      'What we process, why, and for how long, under Türkiye’s Personal Data Protection Law (KVKK, No. 6698).',
    updatedAt: '2026-08-28',
    sections: [
      {
        heading: 'Data controller',
        paragraphs: [`${legalName} is the data controller. Requests: ${privacyEmail}.`],
      },
      {
        heading: 'Data we process',
        bullets: [
          'Account data: email, username, display name, city, avatar.',
          'Contribution data: experiences, questions, comments, polls, uploaded photos and their dates, likes and saves.',
          'Technical data: IP address, browser and device information, session cookies, error logs.',
          'Preferences: language, saved items and collections, followed questions and topics, notification settings.',
        ],
      },
      {
        heading: 'Purposes and legal bases',
        bullets: [
          'Performing the membership agreement (account, posting, saving) — KVKK art. 5/2-c.',
          'Platform security, moderation and legal obligations — art. 5/2-ç and 5/2-f.',
          'Anonymised usage analysis to improve the service — legitimate interest, art. 5/2-f.',
          'Promotional email and optional notifications — only with your explicit consent, art. 5/1.',
        ],
      },
      {
        heading: 'Photos and children’s data',
        paragraphs: [
          'Photos uploaded with an experience are published publicly. Obtain consent from parents or guardians before uploading images that show children’s faces, schools, addresses or contact details; the Community Guidelines are binding. We remove such images promptly on request.',
        ],
      },
      {
        heading: 'Transfers',
        paragraphs: [
          'Data is shared only with hosting, email delivery and media storage providers strictly needed to run the service, under contract and KVKK arts. 8–9. We never sell data or share it with ad networks.',
        ],
      },
      {
        heading: 'Cookies',
        paragraphs: [
          'Session cookies (sign-in state) and the language preference cookie are strictly necessary. Analytics to be added before launch will be used for aggregate, anonymous statistics only; no third-party advertising cookies.',
        ],
      },
      {
        heading: 'Retention',
        bullets: [
          'Account data for the life of the membership and up to 1 year after closure (potential legal disputes).',
          'Public contributions stay online until you or moderation remove them; removed content is kept as an audit trail for 2 years.',
          'Server and security logs for up to 6 months.',
        ],
      },
      {
        heading: 'Your rights (KVKK art. 11)',
        bullets: [
          'Learn whether your data is processed and request information.',
          'Learn the purpose and whether data is used accordingly.',
          'Know the third parties it is transferred to, in Türkiye or abroad.',
          'Request correction, and deletion or destruction where the conditions are met.',
          'Object to outcomes produced solely by automated analysis.',
          'Claim compensation for damage caused by unlawful processing.',
        ],
      },
      {
        heading: 'How to apply',
        paragraphs: [
          `Send requests to ${privacyEmail} with information verifying your identity. Requests are resolved free of charge within 30 days. When this notice changes, the update date appears at the top of the page.`,
        ],
      },
    ],
  },
};

const terms: Record<Locale, TrustPageContent> = {
  tr: {
    eyebrow: 'Kullanım koşulları',
    title: 'Kullanım Koşulları',
    description: 'Konsepthane’yi ziyaret eden ve üye olan herkes için geçerli kurallar.',
    updatedAt: '2026-08-28',
    sections: [
      {
        heading: 'Hizmet',
        paragraphs: [
          `Konsepthane, ${legalName} tarafından işletilen; kutlama konseptleri, rehberler, topluluk deneyimleri ve soru-cevap içerikleri sunan bir bilgi platformudur. İçerikler genel bilgilendirme amaçlıdır; gıda, sağlık ve güvenlikle ilgili konularda atıf yapılan resmi kaynaklar esastır.`,
        ],
      },
      {
        heading: 'Üyelik',
        bullets: [
          'Üye olmak için 18 yaşını doldurmuş olmanız gerekir. Hesap bilgilerinizin doğruluğundan ve gizliliğinden siz sorumlusunuz.',
          'Hesabınızı başkasına devredemezsiniz; yetkisiz kullanımı fark ederseniz derhal bize bildirin.',
          'Kuralları ihlal eden hesapları askıya alabilir veya kapatabiliriz; içerik yayınlanmak görünür olmakla, görünür olmak da indekslenmekle aynı şey değildir ve bu kararlar editoryal takdirimizdedir.',
        ],
      },
      {
        heading: 'Paylaştığınız içerik',
        bullets: [
          'Yüklediğiniz metin ve fotoğrafların size ait olduğunu ya da kullanım hakkına sahip olduğunuzu beyan edersiniz; her deneyim paylaşımında bu beyanı ayrıca onaylarsınız.',
          'Paylaştığınız içerik üzerinde Konsepthane’ye, platformda ve tanıtımında yayınlamak, çoğaltmak, uyarlamak ve arşivlemek üzere dünya çapında, bedelsiz, alt lisans verilebilir bir lisans tanırsınız. Telif hakkı sizde kalır.',
          'İçeriğinizi istediğiniz zaman kaldırabilirsiniz; yedekler ve denetim kayıtları Gizlilik Politikası’ndaki sürelerle sınırlı olarak tutulur.',
          'Sponsorlu veya ticari nitelikteki içerik açıkça belirtilmelidir.',
        ],
      },
      {
        heading: 'Yasak kullanımlar',
        bullets: [
          'Başkasının fotoğrafını, özellikle çocukların görsellerini, izinsiz paylaşmak.',
          'Taciz, nefret söylemi, spam, yanıltıcı yönlendirme ve otomatik kazıma.',
          'Platformun güvenliğini veya bütünlüğünü tehlikeye atan girişimler.',
        ],
      },
      {
        heading: 'Sorumluluk',
        paragraphs: [
          'İçerikler “olduğu gibi” sunulur. Bir konsepti uygularken alınacak kararlar (bütçe, mekân, gıda, güvenlik) size aittir. Kanunun izin verdiği ölçüde, dolaylı zararlardan sorumlu değiliz.',
        ],
      },
      {
        heading: 'Değişiklik ve uygulanacak hukuk',
        paragraphs: [
          'Koşulları güncelleyebiliriz; önemli değişiklikleri sayfanın başındaki tarihle ve gerekiyorsa e-postayla duyururuz. Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir; uyuşmazlıklarda İstanbul mahkemeleri ve icra daireleri yetkilidir.',
        ],
      },
    ],
  },
  en: {
    eyebrow: 'Terms',
    title: 'Terms of Use',
    description: 'The rules that apply to everyone who visits or joins Konsepthane.',
    updatedAt: '2026-08-28',
    sections: [
      {
        heading: 'The service',
        paragraphs: [
          `Konsepthane is an information platform operated by ${legalName}, offering celebration concepts, guides, community experiences and Q&A. Content is for general information; for food, health and safety topics the cited official sources prevail.`,
        ],
      },
      {
        heading: 'Membership',
        bullets: [
          'You must be at least 18 to join. You are responsible for the accuracy and confidentiality of your account details.',
          'Accounts are not transferable; report unauthorised use immediately.',
          'We may suspend or close accounts that break the rules. Publication, visibility and indexing are separate editorial decisions at our discretion.',
        ],
      },
      {
        heading: 'Your content',
        bullets: [
          'You confirm that the text and photos you upload are yours or that you hold the rights to use them; each experience post asks you to confirm this.',
          'You grant Konsepthane a worldwide, royalty-free, sublicensable licence to publish, reproduce, adapt and archive your content on the platform and in its promotion. You keep the copyright.',
          'You can remove your content at any time; backups and audit records are kept only for the periods in the Privacy Notice.',
          'Sponsored or commercial content must be clearly labelled.',
        ],
      },
      {
        heading: 'Prohibited uses',
        bullets: [
          'Posting other people’s photos — especially images of children — without permission.',
          'Harassment, hate speech, spam, deceptive redirection and automated scraping.',
          'Attempts to compromise platform security or integrity.',
        ],
      },
      {
        heading: 'Liability',
        paragraphs: [
          'Content is provided “as is”. Decisions made while applying a concept (budget, venue, food, safety) are yours. To the extent permitted by law, we are not liable for indirect damages.',
        ],
      },
      {
        heading: 'Changes and governing law',
        paragraphs: [
          'We may update these terms; material changes are announced with the date at the top of the page and, where needed, by email. These terms are governed by the laws of the Republic of Türkiye; the courts and enforcement offices of Istanbul have jurisdiction.',
        ],
      },
    ],
  },
};

const cookies: Record<Locale, TrustPageContent> = {
  tr: {
    eyebrow: 'Çerez politikası',
    title: 'Çerez Politikası',
    description:
      'Konsepthane’nin hangi çerezleri, hangi amaçla kullandığı ve tercihlerinizi nasıl yönetebileceğiniz.',
    updatedAt: '2026-08-29',
    sections: [
      {
        heading: 'Çerez nedir?',
        paragraphs: [
          'Çerezler, ziyaret ettiğiniz web sitesi tarafından tarayıcınıza yerleştirilen küçük metin dosyalarıdır. Oturumunuzu açık tutmak, tercihlerinizi hatırlamak ve sitenin nasıl kullanıldığını anlamak için kullanılır. Bu politika, 6698 sayılı KVKK ve Avrupa Birliği ePrivacy/GDPR ilkeleri doğrultusunda hazırlanmıştır.',
        ],
      },
      {
        heading: 'Kullandığımız çerezler',
        bullets: [
          'Zorunlu çerezler (her zaman açık): üye oturumu (erişim ve yenileme belirteçleri), yönetim paneli oturumu, dil tercihi ve güvenlik amaçlı çerezler. Bu çerezler olmadan giriş, kaydetme ve pano özellikleri çalışmaz; hukuki dayanağı KVKK m.5/2-c (sözleşmenin ifası) ve m.5/2-f (meşru menfaat)’tir.',
          'Tercih kaydı: çerez seçiminiz, Google sertifikalı onay yönetim platformu Cookiebot (Usercentrics A/S) tarafından “CookieConsent” adlı birinci taraf çerezde 12 ay saklanır; seçim ve zaman damgası dışında kişisel veri içermez. Onay kaydı IAB TCF v2.2 standardına uygun tutulur.',
          'Analitik çerezler (yalnızca izninizle): ziyaret sayısı, sayfa görüntüleme ve trafik kaynakları gibi anonimleştirilmiş IP ile toplanan istatistikler (Google Analytics 4, Consent Mode v2). Hukuki dayanağı açık rızanızdır; rıza verilmeden hiçbir analitik betiği yüklenmez.',
          'Reklam / pazarlama çerezi kullanmıyoruz.',
        ],
      },
      {
        heading: 'Tercihlerinizi yönetme',
        paragraphs: [
          'İlk ziyaretinizde görünen bildirimden “Tümünü kabul et”, “Yalnızca zorunlu” veya “Ayarlar” seçeneklerini kullanabilirsiniz. Seçiminizi istediğiniz zaman sayfa altındaki “Çerez ayarları” bağlantısından (onay penceresi yeniden açılır) değiştirebilirsiniz. Ayrıca tarayıcı ayarlarından çerezleri silebilir veya engelleyebilirsiniz; zorunlu çerezleri engellemek üyelik özelliklerinin çalışmamasına yol açar.',
        ],
      },
      {
        heading: 'Üçüncü taraflar ve saklama süreleri',
        bullets: [
          'Onay yönetimi: Cookiebot / Usercentrics A/S (Danimarka) — onay tercihinizi kaydeder ve etiketleri onaydan önce engeller.',
          'Analitik: Google Ireland Ltd. — yalnızca rıza sonrasında; veriler anonimleştirilmiş IP ile işlenir, saklama süresi en fazla 14 aydır.',
          'Görseller: yüklenen medya içerik dağıtım ağı (CDN) üzerinden sunulur; çerez yerleştirmez.',
          'Oturum çerezleri: erişim belirteci 15 dakika, yenileme belirteci en fazla 30 gün; çıkış yapıldığında silinir.',
        ],
      },
      {
        heading: 'İletişim',
        paragraphs: [
          `Çerezler ve kişisel verilerinizle ilgili sorularınız için ${privacyEmail} adresine yazabilirsiniz. Ayrıntılı bilgi için KVKK Aydınlatma Metni ve Gizlilik Politikası sayfalarına bakın.`,
        ],
      },
    ],
  },
  en: {
    eyebrow: 'Cookie policy',
    title: 'Cookie Policy',
    description: 'Which cookies Konsepthane uses, why, and how you can manage your preferences.',
    updatedAt: '2026-08-29',
    sections: [
      {
        heading: 'What are cookies?',
        paragraphs: [
          'Cookies are small text files a website places in your browser to keep you signed in, remember preferences and understand how the site is used. This policy follows the Turkish KVKK and the EU ePrivacy/GDPR principles.',
        ],
      },
      {
        heading: 'Cookies we use',
        bullets: [
          'Essential (always on): member session tokens, admin session, language preference and security cookies. Without them sign-in, saving and boards do not work (legal basis: performance of a contract / legitimate interest).',
          'Preference record: your choice is stored by the Google-certified consent platform Cookiebot (Usercentrics A/S) in a first-party cookie named “CookieConsent” for 12 months; it holds only the selection and timestamp. Consent is recorded under the IAB TCF v2.2 standard.',
          'Analytics (only with your consent): anonymised-IP statistics such as visits, page views and traffic sources (Google Analytics 4 with Consent Mode v2). No analytics script loads before you consent.',
          'We do not use advertising or marketing cookies.',
        ],
      },
      {
        heading: 'Managing your preferences',
        paragraphs: [
          'Use “Accept all”, “Essential only” or “Settings” in the banner on your first visit. You can change your choice at any time via the “Cookie settings” link in the footer, or delete/block cookies in your browser (blocking essential cookies disables member features).',
        ],
      },
      {
        heading: 'Third parties and retention',
        bullets: [
          'Consent management: Cookiebot / Usercentrics A/S (Denmark) — stores your choice and blocks tags until consent.',
          'Analytics: Google Ireland Ltd. — only after consent; anonymised IP, retention up to 14 months.',
          'Media: uploaded images are served from a CDN that sets no cookies.',
          'Session cookies: access token 15 minutes, refresh token up to 30 days; removed on sign-out.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [
          `Questions about cookies or your data: ${privacyEmail}. See also the Privacy Notice and Privacy Policy.`,
        ],
      },
    ],
  },
};

const kvkk: Record<Locale, TrustPageContent> = {
  tr: {
    eyebrow: 'KVKK',
    title: 'Kişisel Verilerin Korunması Aydınlatma Metni',
    description:
      '6698 sayılı Kişisel Verilerin Korunması Kanunu’nun 10. maddesi uyarınca veri sorumlusu sıfatıyla yapılan aydınlatma.',
    updatedAt: '2026-08-29',
    sections: [
      {
        heading: 'Veri sorumlusu',
        paragraphs: [
          `Bu aydınlatma metni, ${legalName} (“Konsepthane”) tarafından veri sorumlusu sıfatıyla, konsepthane.net alan adlı web sitesi ve bağlı hizmetleri kullanan ziyaretçi ve üyeler için hazırlanmıştır. İletişim: ${privacyEmail}.`,
        ],
      },
      {
        heading: 'İşlenen kişisel veriler',
        bullets: [
          'Kimlik ve iletişim: görünen ad, kullanıcı adı, e-posta adresi.',
          'Hesap ve işlem güvenliği: şifrelenmiş parola özeti, oturum belirteçleri, giriş zamanı, IP adresi ve tarayıcı bilgisi.',
          'Üye içerikleri: paylaştığınız deneyimler, sorular, yanıtlar, yorumlar, panolar, yüklediğiniz fotoğraflar ve bunlara ilişkin meta veriler.',
          'Kullanım verileri: kaydetme/beğeni etkileşimleri, bildirim tercihleri, çerez tercihi; izin verilmesi hâlinde anonimleştirilmiş analitik veriler.',
        ],
      },
      {
        heading: 'İşleme amaçları ve hukuki sebepler',
        bullets: [
          'Üyelik sözleşmesinin kurulması ve ifası, hesabın doğrulanması, giriş ve parola sıfırlama e-postalarının gönderilmesi (KVKK m.5/2-c).',
          'Platform güvenliğinin sağlanması, kötüye kullanımın önlenmesi, moderasyon ve şikâyet süreçlerinin yürütülmesi (m.5/2-f meşru menfaat).',
          'Hukuki yükümlülüklerin yerine getirilmesi ve yetkili makam taleplerinin karşılanması (m.5/2-ç, e).',
          'Analitik ölçüm ve ürün geliştirme (açık rıza, m.5/1) — yalnızca çerez onayı verilmişse.',
        ],
      },
      {
        heading: 'Aktarım',
        paragraphs: [
          'Kişisel veriler; barındırma, veritabanı, e-posta gönderimi, nesne depolama/CDN ve (rıza hâlinde) analitik hizmeti sağlayan tedarikçilere, hizmetin gerektirdiği ölçüde ve sözleşmesel güvencelerle aktarılır. Yurt dışında bulunan sağlayıcılara aktarım, KVKK m.9 kapsamındaki şartlara uygun olarak yapılır. Veriler reklam amacıyla üçüncü kişilere satılmaz.',
        ],
      },
      {
        heading: 'Toplama yöntemi',
        paragraphs: [
          'Veriler; kayıt, giriş, içerik paylaşma ve iletişim formları aracılığıyla elektronik ortamda, otomatik veya kısmen otomatik yollarla toplanır.',
        ],
      },
      {
        heading: 'Saklama süresi',
        bullets: [
          'Hesap verileri üyelik süresince; hesabın kapatılmasından sonra yasal saklama yükümlülükleri (ör. 5651 sayılı Kanun kapsamındaki trafik kayıtları için 2 yıl) saklı kalmak üzere 30 gün içinde silinir veya anonim hâle getirilir.',
          'Yayınlanmış içeriklerde yazar adı, hesabın kapatılması hâlinde platform bütünlüğü için korunabilir; talep üzerine anonimleştirilir.',
          'Analitik verileri en fazla 14 ay.',
        ],
      },
      {
        heading: 'KVKK m.11 kapsamındaki haklarınız',
        bullets: [
          'Kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme.',
          'İşleme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme; aktarıldığı üçüncü kişileri bilme.',
          'Eksik veya yanlış işlenmişse düzeltilmesini, şartları oluşmuşsa silinmesini veya yok edilmesini isteme; bu işlemlerin aktarıldığı üçüncü kişilere bildirilmesini isteme.',
          'Münhasıran otomatik sistemlerle analiz sonucu aleyhinize bir sonucun ortaya çıkmasına itiraz etme.',
          'Kanuna aykırı işleme nedeniyle zarara uğramanız hâlinde zararın giderilmesini talep etme.',
        ],
      },
      {
        heading: 'Başvuru',
        paragraphs: [
          `Haklarınıza ilişkin taleplerinizi, Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ’e uygun olarak ${privacyEmail} adresine e-posta ile veya yazılı olarak iletebilirsiniz. Başvurular en geç 30 gün içinde ücretsiz olarak sonuçlandırılır.`,
        ],
      },
    ],
  },
  en: {
    eyebrow: 'Privacy notice',
    title: 'Personal Data Protection Notice (KVKK)',
    description:
      'Notice provided as data controller under Article 10 of the Turkish Personal Data Protection Law No. 6698.',
    updatedAt: '2026-08-29',
    sections: [
      {
        heading: 'Data controller',
        paragraphs: [
          `${legalName} (“Konsepthane”) is the data controller for visitors and members of konsepthane.net and its services. Contact: ${privacyEmail}.`,
        ],
      },
      {
        heading: 'Personal data we process',
        bullets: [
          'Identity and contact: display name, username, e-mail address.',
          'Account security: hashed password, session tokens, sign-in time, IP address and browser information.',
          'Member content: experiences, questions, answers, comments, boards, uploaded photos and their metadata.',
          'Usage: save/like interactions, notification preferences, cookie choice; anonymised analytics only with consent.',
        ],
      },
      {
        heading: 'Purposes and legal bases',
        bullets: [
          'Creating and performing the membership agreement, verifying the account, sending sign-in and password e-mails (Art. 5/2-c).',
          'Platform security, abuse prevention, moderation and complaint handling (Art. 5/2-f legitimate interest).',
          'Legal obligations and lawful requests of authorities (Art. 5/2-ç, e).',
          'Analytics and product improvement (explicit consent, Art. 5/1) — only after cookie consent.',
        ],
      },
      {
        heading: 'Transfers',
        paragraphs: [
          'Data is shared with hosting, database, e-mail, object storage/CDN and (with consent) analytics providers only to the extent required, under contractual safeguards. Transfers abroad comply with Article 9 of the KVKK. Data is never sold for advertising.',
        ],
      },
      {
        heading: 'Retention',
        bullets: [
          'Account data for the duration of membership; deleted or anonymised within 30 days after closure, subject to statutory retention (e.g. 2 years for traffic logs under Law No. 5651).',
          'Author names on published content may be kept for platform integrity and are anonymised on request.',
          'Analytics data for at most 14 months.',
        ],
      },
      {
        heading: 'Your rights (Art. 11)',
        bullets: [
          'To learn whether your data is processed and to request information.',
          'To learn the purpose and whether data is used accordingly; to know third-party recipients.',
          'To request correction, deletion or destruction where conditions are met, and notification of recipients.',
          'To object to results produced solely by automated analysis; to claim compensation for unlawful processing.',
        ],
      },
      {
        heading: 'Requests',
        paragraphs: [
          `Send requests to ${privacyEmail}; they are answered free of charge within 30 days.`,
        ],
      },
    ],
  },
};

export const trustPages = {
  hakkimizda: about,
  iletisim: contact,
  gizlilik: privacy,
  'kullanim-kosullari': terms,
  'cerez-politikasi': cookies,
  'kvkk-aydinlatma': kvkk,
} as const;
export type TrustSlug = keyof typeof trustPages;
