// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin user
  const adminPassword = await bcrypt.hash('Admin@1234', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@eventgo.my' },
    update: {},
    create: {
      name: 'EventGo Admin',
      email: 'admin@eventgo.my',
      password: adminPassword,
      role: 'ADMIN',
      emailVerified: true,
    },
  });

  // Demo user
  const userPassword = await bcrypt.hash('User@1234', 10);
  await prisma.user.upsert({
    where: { email: 'demo@eventgo.my' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@eventgo.my',
      password: userPassword,
      role: 'USER',
      emailVerified: true,
    },
  });

  // Vendor categories
  const vendorCategories = [
    'Venue', 'Catering', 'Photography', 'Videography',
    'Decoration', 'Entertainment', 'Transportation', 'Beauty & Makeup',
  ];
  for (const name of vendorCategories) {
    await prisma.vendorCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Expense categories
  const expenseCategories = [
    'Venue', 'Food & Beverage', 'Photography', 'Decoration',
    'Attire', 'Transportation', 'Entertainment', 'Miscellaneous',
  ];
  for (const name of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Sample vendors
  const venueCategory = await prisma.vendorCategory.findFirst({ where: { name: 'Venue' } });
  const cateringCategory = await prisma.vendorCategory.findFirst({ where: { name: 'Catering' } });
  const photoCategory = await prisma.vendorCategory.findFirst({ where: { name: 'Photography' } });

  const vendors = [
    {
      categoryId: venueCategory.id,
      name: 'The Grand Ballroom KL',
      description: 'Luxurious ballroom in the heart of Kuala Lumpur, accommodating up to 1000 guests. Features state-of-the-art AV systems and dedicated event coordinators.',
      minPrice: 5000,
      maxPrice: 25000,
      location: 'Kuala Lumpur',
      imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800',
    },
    {
      categoryId: venueCategory.id,
      name: 'Garden Terrace Putrajaya',
      description: 'Stunning outdoor garden venue surrounded by lush greenery. Perfect for intimate weddings and garden parties.',
      minPrice: 3000,
      maxPrice: 12000,
      location: 'Putrajaya',
      imageUrl: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800',
    },
    {
      categoryId: cateringCategory.id,
      name: 'Golden Feast Catering',
      description: 'Award-winning catering service offering Malaysian, Western, and fusion cuisines. Halal certified with a dedicated team for events of all sizes.',
      minPrice: 2000,
      maxPrice: 15000,
      location: 'Selangor',
      imageUrl: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800',
    },
    {
      categoryId: cateringCategory.id,
      name: 'Nusantara Catering',
      description: 'Specialising in traditional Malay and Asian cuisine. Fresh ingredients, authentic recipes, and professional service.',
      minPrice: 1500,
      maxPrice: 8000,
      location: 'Kuala Lumpur',
      imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    },
    {
      categoryId: photoCategory.id,
      name: 'Luminary Studios',
      description: 'Professional photography and videography for weddings and corporate events. 10+ years of experience capturing your most precious moments.',
      minPrice: 2500,
      maxPrice: 10000,
      location: 'Kuala Lumpur',
      imageUrl: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800',
    },
  ];

  for (const vendor of vendors) {
    await prisma.vendor.create({ data: vendor });
  }

  console.log('✅ Seed complete!');
  console.log('Admin: admin@eventgo.my / Admin@1234');
  console.log('User:  demo@eventgo.my / User@1234');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
