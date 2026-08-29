import { hash } from 'bcrypt';
import {
  CommunityContentType,
  ContentStatus,
  ExperienceStatus,
  IndexabilityStatus,
  ModerationStatus,
  PrismaClient,
  QuestionStatus,
  TopicKind,
  UserStatus,
} from '@prisma/client';

import { PERMISSION_KEYS, ROLE_KEYS, ROLE_NAMES, rolePermissions } from '../src';

const prisma = new PrismaClient();

const roles = ROLE_KEYS.map((key) => [key, ROLE_NAMES[key]] as const);
const permissions = PERMISSION_KEYS;

async function main() {
  const permissionRows = await Promise.all(
    permissions.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, description: `${key} yetkisi` },
      }),
    ),
  );

  for (const [key, name] of roles) {
    const role = await prisma.role.upsert({
      where: { key },
      update: { name },
      create: { key, name },
    });
    const granted = new Set<string>(rolePermissions(key));
    const allowed = permissionRows.filter((item) => granted.has(item.key));
    // Role grants are authoritative: stale permissions from earlier seeds are revoked.
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permissionId: { notIn: allowed.map((item) => item.id) } },
    });
    await prisma.rolePermission.createMany({
      data: allowed.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
      skipDuplicates: true,
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: 'super_admin' } });
  const email = process.env.ADMIN_EMAIL ?? 'admin@ilham.local';
  const passwordHash = await hash(process.env.ADMIN_PASSWORD ?? 'Ilham-Local-2026!', 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
    create: {
      email,
      passwordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: 'Konsepthane Yöneticisi',
          username: 'konsepthane-yonetimi',
          city: 'İstanbul',
        },
      },
    },
  });
  await prisma.profile.upsert({
    where: { userId: admin.id },
    update: { username: 'konsepthane-yonetimi', displayName: 'Konsepthane Yöneticisi' },
    create: {
      userId: admin.id,
      displayName: 'Konsepthane Yöneticisi',
      username: 'konsepthane-yonetimi',
      city: 'İstanbul',
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  const categoryData = [
    ['Doğum Günü', 'dogum-gunu', 'Her yaş için tema, süsleme ve planlama fikirleri.'],
    [
      'Baby Shower',
      'baby-shower',
      'Bebeği karşılamaya hazırlanırken zarif ve uygulanabilir fikirler.',
    ],
    ['Nişan', 'nisan', 'Nişan masası, dekorasyon ve davet ilhamı.'],
    ['Söz', 'soz', 'Evde ve mekânda söz organizasyonu fikirleri.'],
    ['Kına', 'kina', 'Modern ve geleneksel kına gecesi planları.'],
    ['Bekarlığa Veda', 'bekarliga-veda', 'Samimi kutlamalardan hafta sonu planlarına seçkiler.'],
    ['Cinsiyet Partisi', 'cinsiyet-partisi', 'Sürprizi öne çıkaran dengeli kutlama konseptleri.'],
    ['Diş Buğdayı', 'dis-bugdayi', 'İlk diş kutlaması için masa ve ikram fikirleri.'],
  ] as const;

  for (const [name, slug, description] of categoryData) {
    await prisma.category.upsert({
      where: { slug },
      update: { name, description },
      create: { name, slug, description, status: ContentStatus.PUBLISHED, publishedAt: new Date() },
    });
  }

  const birthday = await prisma.category.findUniqueOrThrow({ where: { slug: 'dogum-gunu' } });
  const safariConcept = await prisma.concept.upsert({
    where: { slug: '3-yas-kiz-cocuk-safari-dogum-gunu' },
    update: { featured: true, moderationStatus: ModerationStatus.APPROVED },
    create: {
      categoryId: birthday.id,
      authorId: admin.id,
      title: '3 Yaş Kız Çocuk Safari Doğum Günü',
      slug: '3-yas-kiz-cocuk-safari-dogum-gunu',
      summary: 'Doğal tonlar, sevimli hayvan detayları ve kolay uygulanabilir bir safari planı.',
      description:
        'Bej ve yeşil paleti temel alın. Hayvan figürlerini masa üzerinde küçük gruplar halinde kullanın; girişte isim panosu, pasta arkasında katmanlı yaprak formları ve çocuklar için keşif köşesi hazırlayın. Tek kullanımlık ürünleri azaltmak için kumaş örtü ve yeniden kullanılabilir ahşap yükseltiler seçin.',
      status: ContentStatus.PUBLISHED,
      budgetMin: 4500,
      budgetMax: 12000,
      heroImageUrl: '/placeholders/safari-concept.svg',
      heroImageAlt: 'Yeşil ve bej tonlarda safari doğum günü masa düzeni illüstrasyonu',
      publishedAt: new Date(),
      featured: true,
    },
  });
  const teddyConcept = await prisma.concept.upsert({
    where: { slug: '1-yas-ayicik-temali-dogum-gunu-konsepti' },
    update: { featured: true, moderationStatus: ModerationStatus.APPROVED },
    create: {
      categoryId: birthday.id,
      authorId: admin.id,
      title: '1 Yaş Ayıcık Temalı Doğum Günü Konsepti',
      slug: '1-yas-ayicik-temali-dogum-gunu-konsepti',
      summary:
        'Krem, kahve ve sıcak bej tonlarıyla hazırlanan zamansız bir ilk yaş kutlaması rehberi.',
      introduction:
        'İlk yaş kutlamalarında sakin bir renk paleti, bebeğin ve ailenin fotoğraflarda öne çıkmasını sağlar. Bu konsept ev, butik salon ve bahçe için ölçeklenebilir bir kurgu sunar.',
      description:
        'Ayıcık temasını tek bir figürü tekrar etmek yerine doku, renk ve küçük el işi ayrıntılarıyla kurun. Ana odak alanını pasta masasının arkasında tutun; misafir masalarında ise yalnızca renk paletini ve doğal malzemeleri devam ettirin.',
      colorPalette: [
        { name: 'Krem', hex: '#F4EBDD' },
        { name: 'Sıcak bej', hex: '#D8BE9A' },
        { name: 'Kakao', hex: '#806047' },
        { name: 'Adaçayı', hex: '#A7AD8B' },
      ],
      decorationIdeas:
        'Keten fon, ahşap yükseltiler, kumaş flamalar ve farklı boylarda ayıcık illüstrasyonları kullanın. Görsel kalabalığı önlemek için figürleri üçlü küçük gruplar hâlinde yerleştirin.',
      tableSetup:
        'Krem masa örtüsü üzerine kraft isim kartları ve kakao tonunda peçeteler ekleyin. Pasta, içecek ve servis alanlarını ayrı tutarak küçük mekânda dolaşımı kolaylaştırın.',
      balloonIdeas:
        'Mat krem, bej ve az miktarda kahve balon kullanın. Organik balon zincirini tek köşede yoğunlaştırın; tüm duvarı kaplamak yerine keten fonu görünür bırakın.',
      cakeIdeas:
        'Tek katlı açık krem pasta, küçük bir ayıcık figürü ve ahşap isim yazısı temayı taşımak için yeterlidir. Şeker hamuru yoğun tasarımlar yerine dokulu krema tercih edilebilir.',
      venueSuggestions:
        'Evde uygulamada 2,5–3 metrelik odak duvarı yeterlidir. Butik salonda çocuk oyun alanı ile pasta masasının arasına en az 1,5 metre geçiş bırakın.',
      practicalTips:
        'Kurulumu bir gün önce zeminde prova edin. Fotoğraf saatini bebeğin uyku düzenine göre planlayın. Yedek kıyafet, ıslak mendil ve sade bir fotoğraf köşesini erişilebilir tutun.',
      alternatives:
        'Daha modern bir görünüm için adaçayını artırın; romantik bir yorum için pudra dokunuşları ekleyin. Bütçe dostu sürümde baskılı fon yerine keten perde ve iki ahşap oyuncak kullanın.',
      faq: [
        {
          question: 'Ayıcık konsepti küçük salonda kalabalık görünür mü?',
          answer:
            'Renkleri üç ana tonla sınırlayıp tek bir odak duvarı kullanırsanız 20 m² alanda dengeli görünür.',
        },
        {
          question: 'Kaç metre arka fon gerekir?',
          answer: 'Ev uygulamalarında 2,5–3 metre genişlik çoğu masa düzeni için yeterlidir.',
        },
      ],
      status: ContentStatus.PUBLISHED,
      budgetMin: 5500,
      budgetMax: 15000,
      heroImageUrl: '/placeholders/teddy-concept.svg',
      heroImageAlt: 'Krem ve kahve tonlarında ayıcık temalı ilk yaş doğum günü masası',
      publishedAt: new Date(),
      featured: true,
    },
  });
  await prisma.conceptImage.deleteMany({ where: { conceptId: teddyConcept.id } });
  await prisma.conceptImage.createMany({
    data: [
      {
        conceptId: teddyConcept.id,
        url: '/placeholders/teddy-concept.svg',
        altText: 'Krem ve kahve tonlarında ayıcık temalı pasta masası ve keten fon',
        sortOrder: 0,
      },
      {
        conceptId: teddyConcept.id,
        url: '/placeholders/teddy-experience-2.svg',
        altText: 'Ayıcık konseptinde tek köşede toplanan mat balon zinciri',
        sortOrder: 1,
      },
      {
        conceptId: teddyConcept.id,
        url: '/placeholders/teddy-experience-3.svg',
        altText: 'Ayıcık konseptinde tek katlı krem pasta ve ahşap isim yazısı',
        sortOrder: 2,
      },
    ],
  });
  const minimalConcept = await prisma.concept.upsert({
    where: { slug: 'minimal-bej-evde-dogum-gunu' },
    update: { featured: true, moderationStatus: ModerationStatus.APPROVED },
    create: {
      categoryId: birthday.id,
      authorId: admin.id,
      title: 'Minimal Bej Evde Doğum Günü',
      slug: 'minimal-bej-evde-dogum-gunu',
      summary: 'Küçük bir evde az malzemeyle ferah, sıcak ve fotoğraflarda dengeli bir kutlama.',
      introduction:
        'Minimal bir doğum günü, eksik bırakılmış bir masa değil; gözü yormayan bir odak alanı ve iyi düşünülmüş birkaç ayrıntıdır.',
      description:
        'Keten bir fon, sıcak bej tekstiller ve tek bir adaçayı vurgusu kullanın. Pasta masasını pencereye yakın kurup çocukların hareket alanını açık bırakın.',
      colorPalette: [
        { name: 'Kırık beyaz', hex: '#F7F1E8' },
        { name: 'Sıcak bej', hex: '#CDB79E' },
        { name: 'Adaçayı', hex: '#9CA58D' },
      ],
      decorationIdeas:
        'Kumaş flama, iki seramik vazo ve evde bulunan ahşap oyuncakları tekrarlı dekor yerine odak parçaları olarak kullanın.',
      tableSetup:
        'Servis tabaklarını farklı yüksekliklere çıkarın; masayı doldurmak yerine boşluk bırakarak fotoğraf kadrajını sakin tutun.',
      balloonIdeas:
        'Balon kullanacaksanız iki mat renkten küçük bir küme hazırlayın ve yalnızca masanın bir köşesine yerleştirin.',
      cakeIdeas:
        'Dokulu açık krem pasta, doğal ahşap bir isim detayı ve mevsim meyvesi minimal çizgiyi korur.',
      venueSuggestions:
        '12–20 kişilik ev kutlamalarında servis ve fotoğraf alanını ayırmak akışı rahatlatır.',
      practicalTips:
        'Kurulumdan önce masanın fotoğrafını çekip kadrajda kalabalık duran iki öğeyi kaldırın.',
      alternatives:
        'Adaçayı yerine soluk lavanta; ahşap yerine mat beyaz yükseltiler kullanılabilir.',
      faq: [
        {
          question: 'Minimal masa boş görünür mü?',
          answer:
            'Farklı yükseklikler ve tek bir güçlü arka fon kullandığınızda sade ama tamamlanmış görünür.',
        },
      ],
      status: ContentStatus.PUBLISHED,
      budgetMin: 3000,
      budgetMax: 8000,
      heroImageUrl: '/placeholders/minimal-concept.svg',
      heroImageAlt: 'Keten fon ve sıcak bej detaylarla minimal ev doğum günü masası',
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      featured: true,
    },
  });

  const babyShower = await prisma.category.findUniqueOrThrow({ where: { slug: 'baby-shower' } });
  const butterflyConcept = await prisma.concept.upsert({
    where: { slug: '2-yas-kiz-cocuk-kelebek-temali-dogum-gunu' },
    update: { moderationStatus: ModerationStatus.APPROVED },
    create: {
      categoryId: birthday.id,
      authorId: admin.id,
      title: '2 Yaş Kız Çocuk Kelebek Temalı Doğum Günü',
      slug: '2-yas-kiz-cocuk-kelebek-temali-dogum-gunu',
      summary:
        'Lavanta, adaçayı ve krem tonlarında; pembeye boğulmayan, bahçe ve balkon için ölçeklenebilir bir kelebek konsepti.',
      introduction:
        'Kelebek teması pastel pembe zorunluluğu taşımaz. Lavanta ve adaçayı ile kurulan palet hem fotoğraflarda sakin durur hem de iki yaş enerjisine alan bırakır.',
      description:
        'Kelebekleri baskılı fon yerine kâğıt ve kumaş formlarda, farklı yüksekliklerde kullanın. Masayı ışığa dik kurup pasta arkasında iki-üç büyük kelebekle odak oluşturun; misafir alanında yalnızca renk paletini sürdürün.',
      colorPalette: [
        { name: 'Lavanta', hex: '#C9B6D9' },
        { name: 'Adaçayı', hex: '#A9B394' },
        { name: 'Krem', hex: '#F4E7D8' },
        { name: 'Mürdüm', hex: '#8F7AA6' },
      ],
      decorationIdeas:
        'Kâğıt kelebekleri tel üzerinde havada asılı bırakın; tavana değil, fonun önüne konumlandırın. Kumaş flama ve iki cam vazoda kuru lavanta yeterli.',
      tableSetup:
        'Krem örtü, lavanta peçete ve kraft isim kartları. Çocuk masasını yetişkin masasından ayırıp alçak tutun.',
      balloonIdeas:
        'Mat lavanta, adaçayı ve krem balonlardan küçük bir organik küme; parlak folyo kelebek balonlardan kaçının.',
      cakeIdeas:
        'İki katlı açık krem pasta, kenarlarda şeker kâğıdı kelebekler ve tepede taze lavanta dalı.',
      venueSuggestions:
        'Bahçe ve balkon ideal. Kapalı alanda pencere önünü tercih edin; gün ışığı lavantayı gri göstermez.',
      practicalTips:
        'Kelebekleri bir gün önce hazırlayıp kutuda taşıyın. İki yaş için oyun alanını masadan uzakta, halı üstünde kurun.',
      alternatives:
        'Daha sıcak bir yorum için lavanta yerine pudra şeftali; daha doğal görünüm için tamamen kuru çiçek kullanın.',
      faq: [
        {
          question: 'Kelebek konsepti erkek çocuk için de uygun mu?',
          answer:
            'Evet; lavantayı adaçayı ve krem ile dengelediğinizde cinsiyet çağrışımı taşımayan bir bahçe konseptine dönüşür.',
        },
      ],
      status: ContentStatus.PUBLISHED,
      budgetMin: 4000,
      budgetMax: 11000,
      heroImageUrl: '/placeholders/butterfly-concept.svg',
      heroImageAlt: 'Lavanta ve adaçayı tonlarında kelebek temalı doğum günü masası',
      publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      featured: false,
    },
  });
  const spaceConcept = await prisma.concept.upsert({
    where: { slug: '4-yas-erkek-cocuk-uzay-temali-dogum-gunu' },
    update: { moderationStatus: ModerationStatus.APPROVED },
    create: {
      categoryId: birthday.id,
      authorId: admin.id,
      title: '4 Yaş Erkek Çocuk Uzay Temalı Doğum Günü',
      slug: '4-yas-erkek-cocuk-uzay-temali-dogum-gunu',
      summary:
        'Lacivert, kömür ve hardal paletinde; karikatür roketler yerine gezegen ve yıldız dokularıyla kurulan yetişkinlerin de sevdiği bir uzay konsepti.',
      introduction:
        'Uzay teması parlak neon ve plastik roketlerle değil, koyu bir fon üstünde birkaç sıcak vurguyla daha etkileyici olur.',
      description:
        'Koyu lacivert kumaş fonu odak yapın; gezegenleri farklı boylarda kâğıt fenerlerle temsil edin. Hardal ve krem detaylar sıcaklık katar, yıldızlar için küçük pirinç ışıklar yeterlidir.',
      colorPalette: [
        { name: 'Lacivert', hex: '#2F3547' },
        { name: 'Kömür', hex: '#4A4F5E' },
        { name: 'Hardal', hex: '#D9A441' },
        { name: 'Krem', hex: '#F3E6C3' },
      ],
      decorationIdeas:
        'Kâğıt fener gezegenler, koyu fonda pirinç ışık zinciri ve birkaç kraft yıldız. Tavanı doldurmak yerine tek bir odak duvarı.',
      tableSetup:
        'Koyu örtü üstünde krem tabaklar ve hardal peçeteler; her çocuk için kraft “görev kartı” isimlik.',
      balloonIdeas:
        'Mat lacivert, gri ve az miktarda hardal balon; folyo yıldız yerine krom balonlardan bir-iki tane.',
      cakeIdeas:
        'Koyu lacivert dokulu krema, üstte tek bir hardal gezegen ve yenilebilir altın yıldız tozu.',
      venueSuggestions:
        'Işığı kontrol edebildiğiniz kapalı alanlar daha uygundur. Evde perdeleri kapatıp ışık zincirini öne çıkarın.',
      practicalTips:
        'Koyu fonu kırışıksız asmak için bir gün önce ütüleyin. Çocuklar için “ay taşı avı” gibi 15 dakikalık kısa bir etkinlik planlayın.',
      alternatives:
        'Daha aydınlık bir yorum için lacivert yerine adaçayı gri; kız-erkek karışık grupta hardalı pudra ile değiştirin.',
      faq: [
        {
          question: 'Koyu fon fotoğraflarda karanlık çıkar mı?',
          answer:
            'Işık zincirini fonun önüne, pastayı pencereye yakın koyarsanız karanlık değil derinlikli görünür.',
        },
      ],
      status: ContentStatus.PUBLISHED,
      budgetMin: 4500,
      budgetMax: 12500,
      heroImageUrl: '/placeholders/space-concept.svg',
      heroImageAlt: 'Lacivert ve hardal tonlarında uzay temalı doğum günü masası',
      publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      featured: false,
    },
  });
  const sageShowerConcept = await prisma.concept.upsert({
    where: { slug: 'adacayi-yesili-baby-shower-konsepti' },
    update: { moderationStatus: ModerationStatus.APPROVED },
    create: {
      categoryId: babyShower.id,
      authorId: admin.id,
      title: 'Adaçayı Yeşili Baby Shower Konsepti',
      slug: 'adacayi-yesili-baby-shower-konsepti',
      summary:
        'Okaliptüs, krem ve doğal ahşap ile cinsiyet vurgusu taşımayan, ev ve butik mekân için sade bir baby shower kurgusu.',
      introduction:
        'Baby shower için pembe-mavi ikilemine girmeden, doğal yeşil ve krem tonlarıyla zamansız bir masa kurmak mümkündür.',
      description:
        'Okaliptüs dallarını masa boyunca tek hat hâlinde serin; balon kümesini iki köşede küçük tutun. Tatlı masası, hediye alanı ve fotoğraf köşesini birbirinden ayırın.',
      colorPalette: [
        { name: 'Adaçayı', hex: '#A9B394' },
        { name: 'Krem', hex: '#F7F3EA' },
        { name: 'Doğal ahşap', hex: '#B89A78' },
      ],
      decorationIdeas:
        'Okaliptüs ve zeytin dalları, ahşap yükseltiler, cam kavanozlarda tek tip mum.',
      tableSetup:
        'Krem keten örtü, adaçayı peçete ve kraft menü kartı; ikramları farklı yüksekliklerde sunun.',
      balloonIdeas:
        'Adaçayı, krem ve şeffaf balonlardan iki asimetrik küme; folyo harf balonlardan kaçının.',
      cakeIdeas:
        'Dokulu açık krem pasta, üstte küçük okaliptüs dalı ve minik ahşap bir isim plakası.',
      venueSuggestions:
        'Gün ışığı alan salonlar ve bahçeler. Evde ana masayı pencere önüne, hediye alanını girişe yakın kurun.',
      practicalTips:
        'Yeşillikleri bir gün önce suda dinlendirin. Anne adayı için oturma alanını hem masaya hem fotoğraf köşesine yakın planlayın.',
      alternatives:
        'Daha sıcak bir yorum için krem yerine kum beji; kış kutlamalarında okaliptüs yerine çam ve pamuk dalı.',
      faq: [
        {
          question: 'Cinsiyet açıklanmadıysa bu konsept uygun mu?',
          answer:
            'Evet; palet cinsiyetten bağımsızdır ve doğum sonrası kutlamalarda da tekrar kullanılabilir.',
        },
      ],
      status: ContentStatus.PUBLISHED,
      budgetMin: 5000,
      budgetMax: 14000,
      heroImageUrl: '/placeholders/sage-shower-concept.svg',
      heroImageAlt: 'Adaçayı yeşili, krem ve doğal ahşap tonlarında baby shower masası',
      publishedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      featured: false,
    },
  });

  const eventTypes = [
    'Doğum Günü',
    'Baby Shower',
    'Nişan',
    'Söz',
    'Kına',
    'Bekarlığa Veda',
    'Cinsiyet Partisi',
    'Diş Buğdayı',
  ];
  const themes = ['Safari', 'Kelebek', 'Ayıcık', 'Prenses', 'Futbol', 'Boho', 'Minimal', 'Okyanus'];
  const colors = [
    ['Pembe', '#E9A6B5'],
    ['Mavi', '#8CB9D8'],
    ['Bej', '#D8C7AE'],
    ['Yeşil', '#7A9B76'],
    ['Altın', '#C7A24A'],
    ['Mor', '#9B7BB5'],
  ] as const;
  for (const name of eventTypes)
    await prisma.eventType.upsert({
      where: { slug: slugify(name) },
      update: { name },
      create: { name, slug: slugify(name) },
    });
  for (const name of themes)
    await prisma.eventTheme.upsert({
      where: { slug: slugify(name) },
      update: { name },
      create: { name, slug: slugify(name) },
    });
  for (const [name, hex] of colors)
    await prisma.color.upsert({
      where: { slug: slugify(name) },
      update: { name, hex },
      create: { name, slug: slugify(name), hex },
    });

  const memberRole = await prisma.role.findUniqueOrThrow({ where: { key: 'member' } });
  const samplePasswordHash = await hash('Ilham-Ornek-2026!', 12);
  const sampleProfiles = [
    {
      email: 'derya.ornek@ilham.local',
      username: 'derya-ornek',
      displayName: 'Derya Kaya · Örnek',
      city: 'İstanbul',
      bio: 'Örnek profil — evde hazırlanan sade doğum günü fikirlerini paylaşıyor.',
    },
    {
      email: 'mert.ornek@ilham.local',
      username: 'mert-ornek',
      displayName: 'Mert Aydın · Örnek',
      city: 'Ankara',
      bio: 'Örnek profil — bütçe, ikram ve oyun planlarını konuşuyor.',
    },
    {
      email: 'selin.ornek@ilham.local',
      username: 'selin-ornek',
      displayName: 'Selin Aras · Örnek',
      city: 'İzmir',
      bio: 'Örnek profil — renk paletleri ve çocuk dostu masa düzenleriyle ilgileniyor.',
    },
  ] as const;
  const sampleUsers = [];
  for (const profile of sampleProfiles) {
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: {
        passwordHash: samplePasswordHash,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
      create: {
        email: profile.email,
        passwordHash: samplePasswordHash,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        username: profile.username,
        displayName: profile.displayName,
        city: profile.city,
        bio: profile.bio,
      },
      create: {
        userId: user.id,
        username: profile.username,
        displayName: profile.displayName,
        city: profile.city,
        bio: profile.bio,
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: memberRole.id } },
      update: {},
      create: { userId: user.id, roleId: memberRole.id },
    });
    sampleUsers.push(user);
  }
  const [derya, mert, selin] = sampleUsers;

  const topicData = [
    ['Doğum Günü', 'dogum-gunu', TopicKind.EVENT_TYPE, true, 'Doğum günü planlama topluluğu.'],
    ['1 Yaş', '1-yas', TopicKind.AGE, true, 'İlk yaş kutlaması fikirleri.'],
    ['3 Yaş', '3-yas', TopicKind.AGE, true, 'Üç yaş için oyun ve tema fikirleri.'],
    ['5–7 Yaş', '5-7-yas', TopicKind.AGE, false, 'Okul dönemi çocukları için kutlamalar.'],
    ['Safari', 'safari', TopicKind.THEME, true, 'Doğal tonlarda safari teması.'],
    ['Minimal', 'minimal', TopicKind.THEME, true, 'Sade ve tekrar kullanılabilir düzenler.'],
    ['Evde Kutlama', 'evde-kutlama', TopicKind.FORMAT, true, 'Ev ortamına uygun planlar.'],
    ['Düşük Bütçe', 'dusuk-butce', TopicKind.BUDGET, true, 'Bütçe dostu alternatifler.'],
    ['Pastel Renkler', 'pastel-renkler', TopicKind.COLOR, false, 'Yumuşak renk paletleri.'],
    ['Oyunlar', 'oyunlar', TopicKind.GENERAL, false, 'Yaşa uygun etkinlik ve oyunlar.'],
    ['İkram', 'ikram', TopicKind.GENERAL, false, 'Menü, pasta ve servis fikirleri.'],
    ['Yağmurlu Gün', 'yagmurlu-gun', TopicKind.GENERAL, false, 'Kapalı alanda B planı.'],
    // Header topic strip: every chip maps to a real topic hub (`/konu/<slug>`).
    ['2 Yaş', '2-yas', TopicKind.AGE, true, 'İki yaş kutlamaları için tema ve oyun fikirleri.'],
    ['Kız Çocuk', 'kiz-cocuk', TopicKind.THEME, true, 'Kız çocukları için tema ve renk fikirleri.'],
    [
      'Erkek Çocuk',
      'erkek-cocuk',
      TopicKind.THEME,
      true,
      'Erkek çocukları için tema ve renk fikirleri.',
    ],
    ['Ayıcık', 'ayicik', TopicKind.THEME, true, 'Ayıcık temalı kutlama konseptleri.'],
    ['Pastalar', 'pastalar', TopicKind.GENERAL, true, 'Pasta tasarımı, boyut ve servis fikirleri.'],
    [
      'Balon & Dekor',
      'balon-dekor',
      TopicKind.GENERAL,
      true,
      'Balon düzenlemeleri ve dekor fikirleri.',
    ],
    ['Masa Süsleme', 'masa-susleme', TopicKind.GENERAL, true, 'Masa düzeni ve süsleme fikirleri.'],
  ] as const;
  const topicBySlug = new Map<string, string>();
  for (const [name, slug, kind, featured, description] of topicData) {
    const topic = await prisma.topic.upsert({
      where: { slug },
      update: { name, kind, featured, description },
      create: { name, slug, kind, featured, description },
    });
    topicBySlug.set(slug, topic.id);
  }
  const birthdayEventType = await prisma.eventType.findUniqueOrThrow({
    where: { slug: 'dogum-gunu' },
  });

  const questionOne = await prisma.question.upsert({
    where: { slug: 'evde-6-yas-dogum-gunu-icin-sessiz-oyun-onerisi' },
    update: { authorId: derya!.id },
    create: {
      authorId: derya!.id,
      title: 'Evde 6 yaş doğum günü için sakin oyun öneriniz var mı?',
      slug: 'evde-6-yas-dogum-gunu-icin-sessiz-oyun-onerisi',
      body: 'Örnek içerik: Sekiz çocuk gelecek ve alt katta komşumuz var. Koşmalı oyunlar yerine 20–30 dakika sürdürülebilecek, malzemesi kolay bulunan ve çocukları sırada çok bekletmeyen oyunlar arıyorum. Hazine avını düşündüm ama alanımız dar; deneyenlerin önerisini merak ediyorum.',
      moderationStatus: ModerationStatus.APPROVED,
      indexability: IndexabilityStatus.INDEX,
      featured: true,
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  });
  const questionTwo = await prisma.question.upsert({
    where: { slug: 'safari-temasinda-hangi-yesil-tonu-daha-uyumlu' },
    update: {
      authorId: selin!.id,
      conceptId: safariConcept.id,
      eventTypeId: birthdayEventType.id,
    },
    create: {
      authorId: selin!.id,
      conceptId: safariConcept.id,
      eventTypeId: birthdayEventType.id,
      title: 'Safari temasında hangi yeşil tonu daha uyumlu olur?',
      slug: 'safari-temasinda-hangi-yesil-tonu-daha-uyumlu',
      body: 'Örnek içerik: Bej masa örtüsü ve kraft etiketlerle adaçayı yeşili mi, daha koyu orman yeşili mi kullanmalıyım? Mekân gün ışığı alıyor ve masayı ağır göstermemek istiyorum. Balon yerine kumaş flamalar da kullanacağım.',
      moderationStatus: ModerationStatus.APPROVED,
      indexability: IndexabilityStatus.INDEX,
      publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    },
  });
  const questionThree = await prisma.question.upsert({
    where: { slug: '12-kisilik-dogum-gunu-ikram-miktari' },
    update: { authorId: mert!.id },
    create: {
      authorId: mert!.id,
      title: '12 kişilik ev doğum gününde ikram miktarını nasıl hesaplamalıyım?',
      slug: '12-kisilik-dogum-gunu-ikram-miktari',
      body: 'Örnek içerik: Kutlama öğleden sonra olacak; altı yetişkin ve altı çocuk var. Pasta dışında iki tuzlu, bir tatlı ve meyve hazırlamak istiyorum. İsraf etmeden yeterli porsiyonu nasıl bölersiniz?',
      moderationStatus: ModerationStatus.APPROVED,
      indexability: IndexabilityStatus.INDEX,
      publishedAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
    },
  });
  const teddyQuestion = await prisma.question.upsert({
    where: { slug: 'ayicik-konsepti-icin-arka-fon-kac-metre-olmali' },
    update: {
      authorId: selin!.id,
      conceptId: teddyConcept.id,
      eventTypeId: birthdayEventType.id,
    },
    create: {
      authorId: selin!.id,
      conceptId: teddyConcept.id,
      eventTypeId: birthdayEventType.id,
      title: 'Ayıcık konsepti için arka fon kaç metre olmalı?',
      slug: 'ayicik-konsepti-icin-arka-fon-kac-metre-olmali',
      body: 'Örnek içerik: 20 m² salonumuzda pasta masasını pencerenin karşısına kuracağız. İki farklı arka fon ölçüsü buldum; 2,5 metre yeterli olur mu, yoksa fotoğraflarda daha dengeli görünmesi için 3 metre seçmeli miyim?',
      moderationStatus: ModerationStatus.APPROVED,
      indexability: IndexabilityStatus.INDEX,
      featured: true,
      publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
  });
  await prisma.questionImage.deleteMany({ where: { questionId: teddyQuestion.id } });
  await prisma.questionImage.createMany({
    data: [
      {
        questionId: teddyQuestion.id,
        url: '/placeholders/teddy-experience-1.svg',
        altText: 'Ayıcık temalı 2,5 metrelik arka fon seçeneği',
        sortOrder: 0,
      },
      {
        questionId: teddyQuestion.id,
        url: '/placeholders/teddy-experience-2.svg',
        altText: 'Ayıcık temalı 3 metrelik arka fon seçeneği',
        sortOrder: 1,
      },
    ],
  });

  await prisma.answer.deleteMany({
    where: {
      questionId: { in: [questionOne.id, questionTwo.id, questionThree.id, teddyQuestion.id] },
    },
  });
  const acceptedAnswer = await prisma.answer.create({
    data: {
      questionId: questionOne.id,
      authorId: mert!.id,
      body: 'Örnek yanıt: Resimli bingo iyi çalışıyor. Her çocuğa 3x3 kart verip odadaki küçük ayrıntıları buldurabilirsiniz. İkinci seçenek olarak, peçeteye sarılı bir nesneyi yalnızca dokunarak tahmin ettirin. İkisi de küçük alanda ve kısa turlarla ilerliyor.',
      helpfulCount: 7,
    },
  });
  await prisma.answer.create({
    data: {
      questionId: questionOne.id,
      authorId: selin!.id,
      body: 'Örnek yanıt: Ortak bir hikâye çizimi de sakin oluyor. Her çocuk kâğıda 30 saniye bir ekleme yapıp yanındakine geçiriyor; sonunda çizimleri duvara asabilirsiniz.',
      helpfulCount: 4,
    },
  });
  await prisma.answer.create({
    data: {
      questionId: teddyQuestion.id,
      authorId: derya!.id,
      body: 'Örnek yanıt: 2,5 metre küçük salonda yeterli olur. Masayı 140–160 cm arasında tutup fonun iki yanında en az 40 cm boşluk bırakırsanız fotoğraf kadrajı dengeli görünür.',
      helpfulCount: 8,
    },
  });
  await prisma.answer.create({
    data: {
      questionId: questionTwo.id,
      authorId: derya!.id,
      body: 'Örnek yanıt: Gün ışığında adaçayı daha yumuşak duruyor. Orman yeşilini yalnızca isim panosu ve iki küçük vazoda vurgu olarak kullanırsanız derinlik korunur.',
      helpfulCount: 5,
    },
  });
  await prisma.question.update({
    where: { id: questionOne.id },
    data: { acceptedAnswerId: acceptedAnswer.id, answerCount: 2, status: QuestionStatus.RESOLVED },
  });
  await prisma.question.update({
    where: { id: questionTwo.id },
    data: { answerCount: 1, status: QuestionStatus.ANSWERED },
  });
  await prisma.question.update({
    where: { id: questionThree.id },
    data: { answerCount: 0, status: QuestionStatus.OPEN },
  });
  await prisma.question.update({
    where: { id: teddyQuestion.id },
    data: { answerCount: 1, status: QuestionStatus.ANSWERED },
  });

  const discussionOne = await prisma.discussion.upsert({
    where: { slug: 'cocuk-partilerinde-hediye-poseti-gerekli-mi' },
    update: { authorId: mert!.id },
    create: {
      authorId: mert!.id,
      title: 'Çocuk partilerinde hediye poşeti gerçekten gerekli mi?',
      slug: 'cocuk-partilerinde-hediye-poseti-gerekli-mi',
      body: 'Örnek tartışma: Küçük plastik oyuncaklarla dolu poşetler yerine çocukların etkinlikte yaptığı bir şeyi eve götürmesi bana daha anlamlı geliyor. Sizce davetliler klasik hediye poşeti bekliyor mu, yoksa tohum kartı veya birlikte boyanan bez çanta daha iyi bir hatıra mı?',
      moderationStatus: ModerationStatus.APPROVED,
      indexability: IndexabilityStatus.INDEX,
      featured: true,
      publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
  });
  const discussionTwo = await prisma.discussion.upsert({
    where: { slug: 'evde-kutlamada-zaman-akisi-nasil-olmali' },
    update: { authorId: derya!.id },
    create: {
      authorId: derya!.id,
      title: 'Evde kutlamada iki saatlik zaman akışı nasıl olmalı?',
      slug: 'evde-kutlamada-zaman-akisi-nasil-olmali',
      body: 'Örnek tartışma: Karşılama, serbest oyun, bir ortak etkinlik, ikram ve pasta için iki saat yeterli görünüyor. Çocukların enerjisi dağılmadan pasta anını hangi sıraya koyduğunuzu ve vedaya geçişi nasıl yumuşattığınızı paylaşır mısınız?',
      moderationStatus: ModerationStatus.APPROVED,
      indexability: IndexabilityStatus.INDEX,
      publishedAt: new Date(Date.now() - 34 * 60 * 60 * 1000),
    },
  });

  const poll = await prisma.poll.upsert({
    where: { slug: 'evde-dogum-gunu-icin-en-kullanisli-renk-paleti' },
    update: { authorId: selin!.id },
    create: {
      authorId: selin!.id,
      title: 'Evde doğum günü için en kullanışlı renk paleti hangisi?',
      slug: 'evde-dogum-gunu-icin-en-kullanisli-renk-paleti',
      body: 'Örnek anket: Sonuçlar örnek topluluk verisidir.',
      moderationStatus: ModerationStatus.APPROVED,
      indexability: IndexabilityStatus.NOINDEX,
      publishedAt: new Date(Date.now() - 11 * 60 * 60 * 1000),
    },
  });
  await prisma.pollVote.deleteMany({ where: { pollId: poll.id } });
  await prisma.pollOption.deleteMany({ where: { pollId: poll.id } });
  const pollOptions = await Promise.all(
    [
      ['Bej + adaçayı', 14],
      ['Pastel gökkuşağı', 9],
      ['Mavi + krem', 6],
      ['Canlı ana renkler', 4],
    ].map(([label, voteCount], sortOrder) =>
      prisma.pollOption.create({
        data: { pollId: poll.id, label: String(label), voteCount: Number(voteCount), sortOrder },
      }),
    ),
  );
  await prisma.poll.update({
    where: { id: poll.id },
    data: { voteCount: pollOptions.reduce((sum, option) => sum + option.voteCount, 0) },
  });

  const guide = await prisma.guide.upsert({
    where: { slug: 'evde-dogum-gunu-icin-48-saatlik-hazirlik-plani' },
    update: { authorId: admin.id },
    create: {
      authorId: admin.id,
      title: 'Evde doğum günü için 48 saatlik hazırlık planı',
      slug: 'evde-dogum-gunu-icin-48-saatlik-hazirlik-plani',
      summary:
        'Örnek rehber: son iki günü alışveriş, hazırlık, kurulum ve dinlenme bloklarına ayıran sade plan.',
      body: 'Örnek içerik. 48–24 saat kala menüyü netleştirin, kuru malzemeleri ve servis ekipmanını tek masada toplayın. Bir gün kala soğuk hazırlıkları tamamlayın ve çocukların kullanacağı alanı güvenli hâle getirin. Etkinlik sabahı yalnızca taze ikramlar, masa kurulumu ve 20 dakikalık bir toparlanma payı bırakın. Fotoğraf köşesi, oyun malzemesi ve yedek peçeteyi ayrı kutularda tutun.',
      status: ContentStatus.PUBLISHED,
      moderationStatus: ModerationStatus.APPROVED,
      indexability: IndexabilityStatus.INDEX,
      featured: true,
      publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
    },
  });
  const guideTwo = await prisma.guide.upsert({
    where: { slug: 'evde-dogum-gunu-icin-20-hazirlik-fikri' },
    update: { authorId: admin.id, status: ContentStatus.PUBLISHED },
    create: {
      authorId: admin.id,
      title: 'Evde Doğum Günü İçin 20 Hazırlık Fikri',
      slug: 'evde-dogum-gunu-icin-20-hazirlik-fikri',
      summary:
        'Örnek rehber: küçük alanda oturma, servis, oyun ve fotoğraf akışını kolaylaştıran uygulanabilir öneriler.',
      body: 'Örnek içerik. Misafir sayısını alana göre sınırlayın, servis masasını duvara yaklaştırın ve çocukların kullanacağı geçişleri boş bırakın. Dekoru tek bir odak duvarında yoğunlaştırın. İkramları küçük porsiyonlara bölün, yedek servisleri mutfakta tutun ve fotoğraf için gün ışığı alan kısa bir zaman aralığı planlayın.',
      status: ContentStatus.PUBLISHED,
      moderationStatus: ModerationStatus.APPROVED,
      indexability: IndexabilityStatus.INDEX,
      featured: true,
      publishedAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    },
  });
  const guideThree = await prisma.guide.upsert({
    where: { slug: '20-kisilik-dogum-gununde-ne-kadar-pasta-gerekir' },
    update: { authorId: admin.id, status: ContentStatus.PUBLISHED },
    create: {
      authorId: admin.id,
      title: '20 Kişilik Doğum Gününde Ne Kadar Pasta Gerekir?',
      slug: '20-kisilik-dogum-gununde-ne-kadar-pasta-gerekir',
      summary:
        'Örnek rehber: çocuk ve yetişkin sayısına göre porsiyon, ikram dengesi ve güvenli pay hesabı.',
      body: 'Örnek içerik. Standart bir dilim için yetişkin başına yaklaşık 120–150 gram, küçük çocuklar için 70–100 gram planlanabilir. Menüde başka tatlılar varsa toplamı azaltın; servis biçimi ve pastanın yüksekliği porsiyon sayısını etkileyebilir. Sipariş verirken pastacınızın kalıp ve dilim ölçüsünü mutlaka teyit edin.',
      status: ContentStatus.PUBLISHED,
      moderationStatus: ModerationStatus.APPROVED,
      indexability: IndexabilityStatus.INDEX,
      featured: true,
      publishedAt: new Date(Date.now() - 42 * 60 * 60 * 1000),
    },
  });

  const story = await prisma.experience.upsert({
    where: { slug: 'salonda-sade-5-yas-dogum-gunu-deneyimi' },
    update: {
      authorId: derya!.id,
      conceptId: safariConcept.id,
      eventTypeId: birthdayEventType.id,
    },
    create: {
      authorId: derya!.id,
      conceptId: safariConcept.id,
      eventTypeId: birthdayEventType.id,
      title: 'Salonda sade 5 yaş doğum günü deneyimi',
      slug: 'salonda-sade-5-yas-dogum-gunu-deneyimi',
      summary: 'Örnek deneyim: 10 çocuk, iki saat ve tekrar kullanılabilir süslerle evde kutlama.',
      body: 'Örnek içerik: Masayı duvara yaslayarak orta alanı oyun için boş bıraktık. Kumaş flamalar ve iki demet mevsim çiçeği yeterli oldu. En iyi kararımız pastayı ilk saatin sonunda kesmekti; çocuklar yorulmadan fotoğraf çekebildik. Bir dahaki sefere serbest oyun bölümünü on dakika daha kısa tutarım.',
      status: ExperienceStatus.APPROVED,
      eventDate: new Date('2026-08-10'),
      city: 'İstanbul',
      district: 'Kadıköy',
      venueType: 'Evde',
      guestCount: 18,
      ageLabel: '5 yaş',
      budgetLabel: '5.000–8.000 TL',
      themeVariation: 'Sade safari',
      colors: ['Bej', 'Adaçayı', 'Krem'],
      tips: 'Kurulumdan önce masa ve oyun alanını zeminde bantla işaretleyin.',
      whatWorked: 'Kumaş flamalar ve pastayı ilk saatin sonunda kesmek.',
      whatWouldChange: 'Serbest oyun bölümünü on dakika kısaltmak.',
      heroImageUrl: '/placeholders/home-birthday.svg',
      indexability: IndexabilityStatus.INDEX,
      featured: true,
    },
  });
  const teddyExperience = await prisma.experience.upsert({
    where: { slug: 'evde-1-yas-ayicik-dogum-gunu-deneyimimiz' },
    update: {
      authorId: selin!.id,
      conceptId: teddyConcept.id,
      eventTypeId: birthdayEventType.id,
    },
    create: {
      authorId: selin!.id,
      conceptId: teddyConcept.id,
      eventTypeId: birthdayEventType.id,
      title: 'Kızımın 1 Yaş Ayıcık Doğum Günü',
      slug: 'evde-1-yas-ayicik-dogum-gunu-deneyimimiz',
      summary: 'Örnek deneyim: krem ve kahve tonlarında, evde tamamen kendimiz hazırladık.',
      body: 'Örnek içerik: Konsepti evde uyguladık. Keten perdeyi fon yaptık, masayı pencereye dik yerleştirdik ve hazır set almak yerine ahşap oyuncakları dekor olarak kullandık. Fotoğraflarda en iyi çalışan ayrıntı sade renk paleti oldu.',
      status: ExperienceStatus.APPROVED,
      eventDate: new Date('2026-07-18'),
      city: 'İzmir',
      venueType: 'Evde',
      guestCount: 22,
      ageLabel: '1 yaş',
      budgetLabel: '8.000–12.000 TL',
      themeVariation: 'Krem ve kahve ayıcık',
      colors: ['Krem', 'Kahve', 'Adaçayı'],
      tips: 'Bebeğin uyku saatinden sonra 45 dakikalık fotoğraf payı bırakın.',
      whatWorked: 'Keten fon ve evdeki ahşap oyuncakların dekor olarak kullanılması.',
      whatWouldChange: 'Pasta masasını pencereye biraz daha uzak kurardım.',
      heroImageUrl: '/placeholders/teddy-experience-1.svg',
      indexability: IndexabilityStatus.INDEX,
      featured: true,
    },
  });
  const teddyExperienceTwo = await prisma.experience.upsert({
    where: { slug: 'butik-salonda-krem-ayicik-konsepti' },
    update: {
      authorId: derya!.id,
      conceptId: teddyConcept.id,
      eventTypeId: birthdayEventType.id,
    },
    create: {
      authorId: derya!.id,
      conceptId: teddyConcept.id,
      eventTypeId: birthdayEventType.id,
      title: 'Butik Salonda Krem Ayıcık Konsepti',
      slug: 'butik-salonda-krem-ayicik-konsepti',
      summary: 'Örnek deneyim: 30 kişilik küçük salonda sade bir ayıcık düzeni.',
      body: 'Örnek içerik: Salondaki koyu duvarı yumuşatmak için üç metre krem fon kullandık. Balonları yalnızca sağ köşede topladık ve masalarda aynı temayı tekrar etmek yerine bej peçeteler kullandık.',
      status: ExperienceStatus.APPROVED,
      eventDate: new Date('2026-06-29'),
      city: 'İstanbul',
      venueType: 'Butik salon',
      guestCount: 30,
      ageLabel: '1 yaş',
      budgetLabel: '12.000–18.000 TL',
      themeVariation: 'Minimal ayıcık',
      colors: ['Krem', 'Bej', 'Kakao'],
      tips: 'Fon genişliğini masa genişliğinden en az 80 cm fazla planlayın.',
      whatWorked: 'Balonları tek köşede yoğunlaştırmak.',
      whatWouldChange: 'Çocuk masası için daha fazla boş alan bırakırdım.',
      heroImageUrl: '/placeholders/teddy-experience-2.svg',
      indexability: IndexabilityStatus.NOINDEX,
    },
  });
  await prisma.experienceImage.deleteMany({
    where: { experienceId: { in: [story.id, teddyExperience.id, teddyExperienceTwo.id] } },
  });
  await prisma.experienceImage.createMany({
    data: [
      {
        experienceId: story.id,
        url: '/placeholders/home-birthday.svg',
        altText: 'Sade safari kutlamasında masa düzeni',
        sortOrder: 0,
      },
      ...['1', '2', '3'].map((number, sortOrder) => ({
        experienceId: teddyExperience.id,
        url: `/placeholders/teddy-experience-${number}.svg`,
        altText: `Evde ayıcık temalı ilk yaş kutlamasından görünüm ${number}`,
        sortOrder,
      })),
      ...['2', '3'].map((number, sortOrder) => ({
        experienceId: teddyExperienceTwo.id,
        url: `/placeholders/teddy-experience-${number}.svg`,
        altText: `Butik salonda ayıcık konsepti görünümü ${sortOrder + 1}`,
        sortOrder,
      })),
    ],
  });

  const links = [
    [
      CommunityContentType.INSPIRATION,
      safariConcept.id,
      ['dogum-gunu', '3-yas', 'safari', 'kiz-cocuk', 'masa-susleme'],
    ],
    [
      CommunityContentType.INSPIRATION,
      teddyConcept.id,
      ['dogum-gunu', '1-yas', 'minimal', 'ayicik', 'pastalar', 'masa-susleme'],
    ],
    [
      CommunityContentType.INSPIRATION,
      minimalConcept.id,
      ['dogum-gunu', 'evde-kutlama', 'minimal', 'masa-susleme', 'balon-dekor'],
    ],
    [
      CommunityContentType.INSPIRATION,
      butterflyConcept.id,
      ['dogum-gunu', 'pastel-renkler', '2-yas', 'kiz-cocuk', 'balon-dekor'],
    ],
    [
      CommunityContentType.INSPIRATION,
      spaceConcept.id,
      ['dogum-gunu', 'evde-kutlama', 'erkek-cocuk', 'balon-dekor'],
    ],
    [
      CommunityContentType.INSPIRATION,
      sageShowerConcept.id,
      ['minimal', 'pastel-renkler', 'masa-susleme', 'balon-dekor'],
    ],
    [
      CommunityContentType.QUESTION,
      questionOne.id,
      ['dogum-gunu', '5-7-yas', 'evde-kutlama', 'oyunlar'],
    ],
    [CommunityContentType.QUESTION, questionTwo.id, ['dogum-gunu', 'safari', 'pastel-renkler']],
    [CommunityContentType.QUESTION, teddyQuestion.id, ['dogum-gunu', '1-yas', 'minimal', 'ayicik']],
    [
      CommunityContentType.QUESTION,
      questionThree.id,
      ['dogum-gunu', 'evde-kutlama', 'ikram', 'dusuk-butce', 'pastalar'],
    ],
    [CommunityContentType.DISCUSSION, discussionOne.id, ['dogum-gunu', 'dusuk-butce']],
    [CommunityContentType.DISCUSSION, discussionTwo.id, ['dogum-gunu', 'evde-kutlama']],
    [CommunityContentType.POLL, poll.id, ['dogum-gunu', 'pastel-renkler']],
    [CommunityContentType.GUIDE, guide.id, ['dogum-gunu', 'evde-kutlama', 'dusuk-butce']],
    [CommunityContentType.GUIDE, guideTwo.id, ['dogum-gunu', 'evde-kutlama', 'dusuk-butce']],
    [CommunityContentType.GUIDE, guideThree.id, ['dogum-gunu', 'ikram', 'pastalar']],
    [
      CommunityContentType.EVENT_EXPERIENCE,
      story.id,
      ['dogum-gunu', '5-7-yas', 'evde-kutlama', 'minimal'],
    ],
    [
      CommunityContentType.EVENT_EXPERIENCE,
      teddyExperience.id,
      ['dogum-gunu', '1-yas', 'evde-kutlama', 'minimal', 'ayicik', 'masa-susleme'],
    ],
    [
      CommunityContentType.EVENT_EXPERIENCE,
      teddyExperienceTwo.id,
      ['dogum-gunu', '1-yas', 'minimal', 'ayicik', 'pastalar'],
    ],
  ] as const;
  await prisma.contentTopic.deleteMany({
    where: { contentId: { in: links.map(([, contentId]) => contentId) } },
  });
  for (const [contentType, contentId, slugs] of links) {
    await prisma.contentTopic.createMany({
      data: slugs.map((slug) => ({
        topicId: topicBySlug.get(slug)!,
        contentType,
        contentId,
      })),
      skipDuplicates: true,
    });
  }
  for (const topicId of topicBySlug.values()) {
    const contentCount = await prisma.contentTopic.count({ where: { topicId } });
    await prisma.topic.update({ where: { id: topicId }, data: { contentCount } });
  }

  await prisma.comment.deleteMany({
    where: {
      entityId: {
        in: [discussionOne.id, discussionTwo.id, story.id, teddyExperience.id, teddyConcept.id],
      },
    },
  });
  const firstComment = await prisma.comment.create({
    data: {
      authorId: selin!.id,
      entityType: CommunityContentType.DISCUSSION,
      entityId: discussionOne.id,
      body: 'Örnek yorum: Biz küçük bir saksıya dikilecek fesleğen tohumu verdik. Çocuklar etiketini etkinlikte boyadı; poşet hazırlamaktan daha az maliyetliydi.',
    },
  });
  await prisma.comment.create({
    data: {
      authorId: derya!.id,
      parentId: firstComment.id,
      depth: 1,
      entityType: CommunityContentType.DISCUSSION,
      entityId: discussionOne.id,
      body: 'Örnek yanıt: Etiketi partide boyatma fikri harika; hem etkinlik hem hatıra oluyor.',
    },
  });
  await prisma.discussion.update({ where: { id: discussionOne.id }, data: { commentCount: 2 } });
  await prisma.comment.createMany({
    data: [
      {
        authorId: mert!.id,
        entityType: CommunityContentType.EVENT_EXPERIENCE,
        entityId: teddyExperience.id,
        body: 'Örnek yorum: Keten fon fikri özellikle gün ışığında çok doğal görünmüş.',
      },
      {
        authorId: selin!.id,
        entityType: CommunityContentType.INSPIRATION,
        entityId: teddyConcept.id,
        body: 'Örnek yorum: Krem ve adaçayı paletinin bu kadar sakin görünmesini çok sevdim.',
      },
    ],
  });

  const sampleCollection = await prisma.collection.upsert({
    where: { ownerId_slug: { ownerId: derya!.id, slug: 'evde-kutlama-ornek-secimim' } },
    update: {
      title: "Defne'nin 1 Yaş Doğum Günü · Örnek",
      description:
        'Ayıcık konsepti, ev uygulamaları ve hazırlık rehberlerinden oluşan ornek planlama panosu.',
      coverImageUrl: '/placeholders/teddy-concept.svg',
      visibility: 'PUBLIC',
    },
    create: {
      ownerId: derya!.id,
      title: "Defne'nin 1 Yaş Doğum Günü · Örnek",
      slug: 'evde-kutlama-ornek-secimim',
      description:
        'Ayıcık konsepti, ev uygulamaları ve hazırlık rehberlerinden oluşan ornek planlama panosu.',
      coverImageUrl: '/placeholders/teddy-concept.svg',
      visibility: 'PUBLIC',
    },
  });
  await prisma.collectionItem.deleteMany({ where: { collectionId: sampleCollection.id } });
  await prisma.collectionItem.createMany({
    data: [
      {
        collectionId: sampleCollection.id,
        entityType: CommunityContentType.INSPIRATION,
        entityId: teddyConcept.id,
        sortOrder: 0,
      },
      {
        collectionId: sampleCollection.id,
        entityType: CommunityContentType.GUIDE,
        entityId: guide.id,
        sortOrder: 1,
      },
      {
        collectionId: sampleCollection.id,
        entityType: CommunityContentType.EVENT_EXPERIENCE,
        entityId: story.id,
        sortOrder: 2,
      },
    ],
  });
  await prisma.collection.update({ where: { id: sampleCollection.id }, data: { itemCount: 3 } });

  const minimalCollection = await prisma.collection.upsert({
    where: { ownerId_slug: { ownerId: selin!.id, slug: 'minimal-nisan-fikirlerim-ornek' } },
    update: {
      title: 'Minimal Nişan Fikirlerim · Örnek',
      coverImageUrl: '/placeholders/minimal-concept.svg',
      visibility: 'PUBLIC',
    },
    create: {
      ownerId: selin!.id,
      title: 'Minimal Nişan Fikirlerim · Örnek',
      slug: 'minimal-nisan-fikirlerim-ornek',
      description: 'Sıcak nötr renkler ve küçük mekân çözümleri için ornek moodboard.',
      coverImageUrl: '/placeholders/minimal-concept.svg',
      visibility: 'PUBLIC',
    },
  });
  await prisma.collectionItem.deleteMany({ where: { collectionId: minimalCollection.id } });
  await prisma.collectionItem.createMany({
    data: [
      {
        collectionId: minimalCollection.id,
        entityType: CommunityContentType.INSPIRATION,
        entityId: minimalConcept.id,
        sortOrder: 0,
      },
      {
        collectionId: minimalCollection.id,
        entityType: CommunityContentType.EVENT_EXPERIENCE,
        entityId: teddyExperienceTwo.id,
        sortOrder: 1,
      },
      {
        collectionId: minimalCollection.id,
        entityType: CommunityContentType.GUIDE,
        entityId: guideTwo.id,
        sortOrder: 2,
      },
    ],
  });
  await prisma.collection.update({ where: { id: minimalCollection.id }, data: { itemCount: 3 } });

  const showerCollection = await prisma.collection.upsert({
    where: { ownerId_slug: { ownerId: mert!.id, slug: 'baby-shower-hazirliklari-ornek' } },
    update: {
      title: 'Baby Shower Hazırlıkları · Örnek',
      coverImageUrl: '/placeholders/home-birthday.svg',
      visibility: 'PUBLIC',
    },
    create: {
      ownerId: mert!.id,
      title: 'Baby Shower Hazırlıkları · Örnek',
      slug: 'baby-shower-hazirliklari-ornek',
      description: 'Masa akışı, ikram hesabı ve sade dekor notlarından oluşan ornek pano.',
      coverImageUrl: '/placeholders/home-birthday.svg',
      visibility: 'PUBLIC',
    },
  });
  await prisma.collectionItem.deleteMany({ where: { collectionId: showerCollection.id } });
  await prisma.collectionItem.createMany({
    data: [
      {
        collectionId: showerCollection.id,
        entityType: CommunityContentType.GUIDE,
        entityId: guideThree.id,
        sortOrder: 0,
      },
      {
        collectionId: showerCollection.id,
        entityType: CommunityContentType.QUESTION,
        entityId: questionThree.id,
        sortOrder: 1,
      },
      {
        collectionId: showerCollection.id,
        entityType: CommunityContentType.INSPIRATION,
        entityId: safariConcept.id,
        sortOrder: 2,
      },
    ],
  });
  await prisma.collection.update({ where: { id: showerCollection.id }, data: { itemCount: 3 } });

  // Denormalized counters always reflect real relations; ornek data never inflates activity.
  await reconcileCounters();

  for (const [key, enabled] of [
    ['ugc_enabled', true],
    ['affiliate_enabled', false],
    ['vendor_marketplace_enabled', false],
    ['ads_enabled', false],
    ['comments_enabled', true],
    ['registrations_enabled', true],
    ['commerce_enabled', false],
    ['shoppable_images_enabled', false],
    ['ai_concept_planner_enabled', false],
    ['lead_generation_enabled', false],
    ['sponsored_content_enabled', false],
  ] as const) {
    await prisma.featureFlag.upsert({
      where: { key },
      update: { enabled },
      create: { key, enabled },
    });
  }
}

async function reconcileCounters() {
  const concepts = await prisma.concept.findMany({ select: { id: true } });
  for (const { id } of concepts) {
    const [experienceCount, questionCount, commentCount, saveCount, reactionCount] =
      await Promise.all([
        prisma.experience.count({ where: { conceptId: id, status: ExperienceStatus.APPROVED } }),
        prisma.question.count({
          where: { conceptId: id, moderationStatus: ModerationStatus.APPROVED },
        }),
        prisma.comment.count({
          where: { entityType: CommunityContentType.INSPIRATION, entityId: id, deletedAt: null },
        }),
        prisma.contentSave.count({
          where: { contentType: CommunityContentType.INSPIRATION, contentId: id },
        }),
        prisma.contentReaction.count({
          where: { contentType: CommunityContentType.INSPIRATION, contentId: id },
        }),
      ]);
    await prisma.concept.update({
      where: { id },
      data: { experienceCount, questionCount, commentCount, saveCount, reactionCount },
    });
  }
  const experiences = await prisma.experience.findMany({ select: { id: true } });
  for (const { id } of experiences) {
    const [commentCount, saveCount, reactionCount] = await Promise.all([
      prisma.comment.count({
        where: { entityType: CommunityContentType.EVENT_EXPERIENCE, entityId: id, deletedAt: null },
      }),
      prisma.contentSave.count({
        where: { contentType: CommunityContentType.EVENT_EXPERIENCE, contentId: id },
      }),
      prisma.contentReaction.count({
        where: { contentType: CommunityContentType.EVENT_EXPERIENCE, contentId: id },
      }),
    ]);
    await prisma.experience.update({
      where: { id },
      data: { commentCount, saveCount, reactionCount },
    });
  }
  const questions = await prisma.question.findMany({ select: { id: true } });
  for (const { id } of questions) {
    const [answerCount, saveCount, reactionCount, followerCount] = await Promise.all([
      prisma.answer.count({ where: { questionId: id, visibility: 'PUBLIC' } }),
      prisma.contentSave.count({
        where: { contentType: CommunityContentType.QUESTION, contentId: id },
      }),
      prisma.contentReaction.count({
        where: { contentType: CommunityContentType.QUESTION, contentId: id },
      }),
      prisma.questionFollow.count({ where: { questionId: id } }),
    ]);
    await prisma.question.update({
      where: { id },
      data: { answerCount, saveCount, reactionCount, followerCount },
    });
  }
  const guides = await prisma.guide.findMany({ select: { id: true } });
  for (const { id } of guides) {
    const [commentCount, saveCount, reactionCount] = await Promise.all([
      prisma.comment.count({
        where: { entityType: CommunityContentType.GUIDE, entityId: id, deletedAt: null },
      }),
      prisma.contentSave.count({
        where: { contentType: CommunityContentType.GUIDE, contentId: id },
      }),
      prisma.contentReaction.count({
        where: { contentType: CommunityContentType.GUIDE, contentId: id },
      }),
    ]);
    await prisma.guide.update({ where: { id }, data: { commentCount, saveCount, reactionCount } });
  }
  const collections = await prisma.collection.findMany({ select: { id: true } });
  for (const { id } of collections) {
    const itemCount = await prisma.collectionItem.count({ where: { collectionId: id } });
    await prisma.collection.update({ where: { id }, data: { itemCount } });
  }
}

function slugify(value: string) {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, (letter) => map[letter] ?? letter)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

void main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
