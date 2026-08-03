import * as bcrypt from 'bcryptjs';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? 'file:./dev.db',
  }),
});

const categories = [
  { slug: 'sut-mahsulotlari', name: 'Sut mahsulotlari', icon: '🥛' },
  { slug: 'non-va-nonushta', name: 'Non va nonushta', icon: '🍞' },
  { slug: 'gosht-va-baliq', name: "Go'sht va baliq", icon: '🥩' },
  { slug: 'sabzavot-va-meva', name: 'Sabzavot va meva', icon: '🥦' },
  { slug: 'ichimliklar', name: 'Ichimliklar', icon: '🧃' },
  { slug: 'uy-rozgor', name: "Uy-ro'zg'or", icon: '🧴' },
  { slug: 'shirinliklar', name: 'Shirinliklar', icon: '🍫' },
  { slug: 'muzqaymoq', name: 'Muzqaymoq', icon: '🍦' },
];

const products = [
  {
    slug: 'farmon-sut-2-5',
    name: 'Farmon sut 2.5%',
    categorySlug: 'sut-mahsulotlari',
    price: 14000,
    discountPrice: 11500,
    unit: '1 l',
    emoji: '🥛',
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
    emoji: '🍶',
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
    emoji: '🍞',
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
    emoji: '🍗',
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
    emoji: '🥩',
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
    emoji: '🍅',
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
    emoji: '🍎',
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
    emoji: '🍌',
    rating: 4.7,
    description: 'Yetilgan, shirin bananlar. Vitamin va kaliyga boy.',
  },
  {
    slug: 'coca-cola',
    name: 'Coca-Cola',
    categorySlug: 'ichimliklar',
    price: 13000,
    unit: '1.5 l',
    emoji: '🥤',
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
    emoji: '🧃',
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
    emoji: '🧴',
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
    emoji: '🧻',
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
    emoji: '🍫',
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
    emoji: '🍦',
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
    emoji: '🍰',
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
    emoji: '🫑',
    rating: 4.4,
    description: "Rang-barang, xrustli bulg'or qalampiri aralashmasi.",
  },
];

const branches = [
  {
    name: 'Chilonzor filiali',
    address: "Chilonzor tumani, Bunyodkor shoh ko'chasi, 12",
  },
  {
    name: 'Yunusobod filiali',
    address: "Yunusobod tumani, Amir Temur ko'chasi, 45",
  },
  {
    name: "Mirzo Ulug'bek filiali",
    address: "Mirzo Ulug'bek tumani, Universitet ko'chasi, 7",
  },
  { name: 'Sergeli filiali', address: "Sergeli tumani, Qatortol ko'chasi, 3" },
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
    if (!existing) {
      await prisma.branch.create({ data: b });
    }
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
