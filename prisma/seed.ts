import * as bcrypt from 'bcryptjs';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? 'file:./dev.db',
  }),
});

/** Tile photo for the storefront category strip, self-hosted like the rest. */
function categoryPhoto(slug: string) {
  return `/photos/categories/${slug}.webp`;
}

const categories = [
  { slug: 'sut-mahsulotlari', name: 'Sut mahsulotlari', icon: 'Milk' },
  { slug: 'non-va-nonushta', name: 'Non va nonushta', icon: 'Croissant' },
  { slug: 'gosht-va-baliq', name: "Go'sht va baliq", icon: 'Beef' },
  { slug: 'sabzavot-va-meva', name: 'Sabzavot va meva', icon: 'Carrot' },
  { slug: 'ichimliklar', name: 'Ichimliklar', icon: 'CupSoda' },
  { slug: 'uy-rozgor', name: "Uy-ro'zg'or", icon: 'SprayCan' },
  { slug: 'shirinliklar', name: 'Shirinliklar', icon: 'Candy' },
  { slug: 'muzqaymoq', name: 'Muzqaymoq', icon: 'IceCreamCone' },
].map((c) => ({ ...c, imageUrl: categoryPhoto(c.slug) }));

/**
 * Product photos are served from our own origin, not hot-linked.
 *
 * images.unsplash.com is not resolvable from every network — when it is not,
 * browsers report net::ERR_NAME_NOT_RESOLVED and every product picture on the
 * site silently disappears. The originals are noted beside each call so they
 * can be re-downloaded into bozor/public/photos/products/.
 */
function productPhoto(slug: string) {
  return `/photos/products/${slug}.webp`;
}

const products = [
  {
    slug: 'farmon-sut-2-5',
    name: 'Farmon sut 2.5%',
    categorySlug: 'sut-mahsulotlari',
    price: 14000,
    discountPrice: 11500,
    unit: '1 l',
    emoji: 'Milk',
    imageUrl: productPhoto('farmon-sut-2-5'), // unsplash 1576186726188-c9d70843790f
    isPopular: true,
    rating: 4.8,
    description:
      "Tabiiy sigir sutidan tayyorlangan, pasterizatsiyadan o'tgan sut.",
    composition: "Pasterizangan sigir suti, yog'lilik 2.5%",
  },
  {
    slug: 'qatiq',
    name: 'Qatiq',
    categorySlug: 'sut-mahsulotlari',
    price: 9000,
    unit: '500 g',
    emoji: 'Milk',
    imageUrl: productPhoto('qatiq'), // unsplash 1571212515416-fef01fc43637
    isPopular: true,
    rating: 4.6,
    description:
      'Foydali bakteriyalarga boy, tabiiy achitqida tayyorlangan qatiq.',
    composition: 'Sut, achitqi kulturasi',
  },
  {
    slug: 'oq-non',
    name: 'Oq non',
    categorySlug: 'non-va-nonushta',
    price: 4000,
    unit: '1 dona',
    emoji: 'Croissant',
    imageUrl: productPhoto('oq-non'), // unsplash 1693480532368-de842fb9dcf4
    isPopular: true,
    rating: 4.9,
    description: "Har kuni yangi pishiriladigan an'anaviy oq non.",
    composition: 'Un, suv, tuz, achitqi',
  },
  {
    slug: 'tovuq-filesi',
    name: 'Tovuq filesi',
    categorySlug: 'gosht-va-baliq',
    price: 55000,
    discountPrice: 45000,
    unit: '1 kg',
    emoji: 'Drumstick',
    imageUrl: productPhoto('tovuq-filesi'), // unsplash 1682991136736-a2b44623eeba
    rating: 4.7,
    description: "Muzlatilgan, sifat nazoratidan o'tgan tovuq ko'krak filesi.",
    composition: "100% tovuq go'shti",
  },
  {
    slug: 'mol-goshti',
    name: "Mol go'shti",
    categorySlug: 'gosht-va-baliq',
    price: 95000,
    unit: '1 kg',
    emoji: 'Beef',
    imageUrl: productPhoto('mol-goshti'), // unsplash 1690983321402-35ff91692b56
    rating: 4.5,
    description:
      "Yangi, mahalliy fermerlardan yetkazib beriladigan mol go'shti.",
    composition: "100% mol go'shti",
  },
  {
    slug: 'pomidor',
    name: 'Pomidor',
    categorySlug: 'sabzavot-va-meva',
    price: 12000,
    discountPrice: 8000,
    unit: '1 kg',
    emoji: 'Carrot',
    imageUrl: productPhoto('pomidor'), // unsplash 1561619128-84d4badf416e
    stock: 20,
    isPopular: true,
    rating: 4.4,
    description: 'Yetilgan, sershira mahalliy pomidorlar.',
  },
  {
    slug: 'olma-qizil',
    name: 'Olma (qizil)',
    categorySlug: 'sabzavot-va-meva',
    price: 16000,
    unit: '1 kg',
    emoji: 'Apple',
    imageUrl: productPhoto('olma-qizil'), // unsplash 1621800656676-37d9e21e4f62
    isPopular: true,
    rating: 4.6,
    description: "Shirin va sersuv qizil olmalar, bevosita bog'dan.",
  },
  {
    slug: 'banan',
    name: 'Banan',
    categorySlug: 'sabzavot-va-meva',
    price: 18000,
    discountPrice: 14000,
    unit: '1 kg',
    emoji: 'Apple',
    imageUrl: productPhoto('banan'), // unsplash 1662150681339-867e940ea30d
    stock: 12,
    rating: 4.7,
    description: 'Yetilgan, shirin bananlar. Vitamin va kaliyga boy.',
  },
  {
    slug: 'coca-cola',
    name: 'Coca-Cola',
    categorySlug: 'ichimliklar',
    price: 13000,
    unit: '1.5 l',
    emoji: 'CupSoda',
    imageUrl: productPhoto('coca-cola'), // unsplash 1567103472667-6898f3a79cf2
    isPopular: true,
    rating: 4.8,
    description: 'Gazlangan alkogolsiz ichimlik, 1.5 litrli qadoqda.',
  },
  {
    slug: 'tabiiy-sharbat-olma',
    name: 'Tabiiy sharbat (olma)',
    categorySlug: 'ichimliklar',
    price: 17000,
    discountPrice: 13500,
    unit: '1 l',
    emoji: 'CupSoda',
    imageUrl: productPhoto('tabiiy-sharbat-olma'), // unsplash 1722874357621-e99d024b02f9
    stock: 15,
    rating: 4.5,
    description: "100% tabiiy olma sharbati, qo'shimcha shakarsiz.",
    composition: 'Olma sharbati konsentrati, suv',
  },
  {
    slug: 'idish-yuvish-suyuqligi',
    name: 'Idish yuvish suyuqligi',
    categorySlug: 'uy-rozgor',
    price: 22000,
    unit: '500 ml',
    emoji: 'SprayCan',
    imageUrl: productPhoto('idish-yuvish-suyuqligi'), // unsplash 1585077082572-52c006739dcd
    stock: 18,
    rating: 4.3,
    description:
      "Yog'ni samarali eritadigan, qo'llarga shikast yetkazmaydigan formula.",
  },
  {
    slug: 'tualet-qogozi',
    name: "Tualet qog'ozi (4 dona)",
    categorySlug: 'uy-rozgor',
    price: 21000,
    discountPrice: 17000,
    unit: '4 dona',
    emoji: 'SprayCan',
    imageUrl: productPhoto('tualet-qogozi'), // unsplash 1674656801311-2442717f7968
    isPopular: true,
    rating: 4.6,
    description: "Yumshoq, 3 qatlamli tualet qog'ozi, 4 donali o'ram.",
  },
  {
    slug: 'shokolad-batonchasi',
    name: 'Shokolad batonchasi',
    categorySlug: 'shirinliklar',
    price: 7000,
    unit: '1 dona',
    emoji: 'Candy',
    imageUrl: productPhoto('shokolad-batonchasi'), // unsplash 1623660053975-cf75a8be0908
    rating: 4.7,
    description: "Sut shokoladi va yong'oq bilan to'ldirilgan batonchasi.",
  },
  {
    slug: 'muzqaymoq-vafli',
    name: 'Muzqaymoq (vafli)',
    categorySlug: 'muzqaymoq',
    price: 6000,
    discountPrice: 4500,
    unit: '1 dona',
    emoji: 'IceCreamCone',
    imageUrl: productPhoto('muzqaymoq-vafli'), // unsplash 1629385701021-fcd568a743e8
    isPopular: true,
    rating: 4.9,
    description: 'Vafli qadoqdagi klassik plombir muzqaymoq.',
  },
  {
    slug: 'cheese-cake',
    name: 'Cheese cake',
    categorySlug: 'shirinliklar',
    price: 28000,
    unit: '1 dona',
    emoji: 'Cookie',
    imageUrl: productPhoto('cheese-cake'), // unsplash 1702925614886-50ad13c88d3f
    rating: 4.8,
    description: "Nyu-York uslubidagi krem-pishloqli tort bo'lagi.",
  },
  {
    slug: 'bulgor-qalampiri',
    name: "Bulg'or qalampiri",
    categorySlug: 'sabzavot-va-meva',
    price: 20000,
    discountPrice: 15000,
    unit: '1 kg',
    emoji: 'Carrot',
    imageUrl: productPhoto('bulgor-qalampiri'), // unsplash 1563565375-f3fdfdbefa83
    stock: 8,
    rating: 4.4,
    description: "Rang-barang, xrustli bulg'or qalampiri aralashmasi.",
  },
];

const couriers = [
  { name: "Azizbek To'xtayev", phone: '+998901112233', status: 'ONLINE' as const, efficiencyPercent: 94 },
  { name: 'Bobur Ahmadov', phone: '+998902223344', status: 'ONLINE' as const, efficiencyPercent: 92 },
  { name: 'Davron Mirzayev', phone: '+998903334455', status: 'ONLINE' as const, efficiencyPercent: 91 },
  { name: 'Shahzod Karimov', phone: '+998904445566', status: 'OFFLINE' as const, efficiencyPercent: 88 },
  { name: 'Jasur Yusupov', phone: '+998905556677', status: 'ONLINE' as const, efficiencyPercent: 85 },
  { name: 'Otabek Rasulov', phone: '+998906667788', status: 'OFFLINE' as const, efficiencyPercent: 90 },
];

const branches = [
  {
    name: 'Chilonzor filiali',
    address: "Chilonzor tumani, Bunyodkor shoh ko'chasi, 12",
    lat: 41.2789,
    lng: 69.2079,
  },
  {
    name: 'Yunusobod filiali',
    address: "Yunusobod tumani, Amir Temur ko'chasi, 45",
    lat: 41.3562,
    lng: 69.2879,
  },
  {
    name: "Mirzo Ulug'bek filiali",
    address: "Mirzo Ulug'bek tumani, Universitet ko'chasi, 7",
    lat: 41.33,
    lng: 69.32,
  },
  {
    name: 'Sergeli filiali',
    address: "Sergeli tumani, Qatortol ko'chasi, 3",
    lat: 41.2058,
    lng: 69.228,
  },
];

async function main() {
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
  }

  for (const p of products) {
    const category = await prisma.category.findUniqueOrThrow({
      where: { slug: p.categorySlug },
    });
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        price: p.price,
        discountPrice: p.discountPrice,
        unit: p.unit,
        emoji: p.emoji,
        imageUrl: p.imageUrl,
        stock: p.stock ?? 100,
        isPopular: p.isPopular ?? false,
        rating: p.rating,
        description: p.description,
        composition: p.composition,
        categoryId: category.id,
      },
      create: {
        slug: p.slug,
        name: p.name,
        price: p.price,
        discountPrice: p.discountPrice,
        unit: p.unit,
        emoji: p.emoji,
        imageUrl: p.imageUrl,
        stock: p.stock ?? 100,
        isPopular: p.isPopular ?? false,
        rating: p.rating,
        description: p.description,
        composition: p.composition,
        categoryId: category.id,
      },
    });
  }

  for (const b of branches) {
    const existing = await prisma.branch.findFirst({ where: { name: b.name } });
    if (existing) {
      await prisma.branch.update({ where: { id: existing.id }, data: b });
    } else {
      await prisma.branch.create({ data: b });
    }
  }

  const savedCouriers: Awaited<ReturnType<typeof prisma.courier.create>>[] = [];
  for (const c of couriers) {
    const existing = await prisma.courier.findFirst({ where: { name: c.name } });
    savedCouriers.push(
      existing
        ? await prisma.courier.update({ where: { id: existing.id }, data: c })
        : await prisma.courier.create({ data: c })
    );
  }

  const ordersWithoutCourier = await prisma.order.findMany({
    where: { courierId: null },
    orderBy: { createdAt: 'asc' },
  });
  for (const [i, order] of ordersWithoutCourier.entries()) {
    const courier = savedCouriers[i % savedCouriers.length];
    await prisma.order.update({
      where: { id: order.id },
      data: { courierId: courier.id },
    });
  }

  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@bozor.uz' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@bozor.uz',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  console.log('Seed tugadi. Admin: admin@bozor.uz / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
