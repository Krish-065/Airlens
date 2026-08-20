import { PrismaClient, Category } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo1234', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@airlens.com' },
    update: {},
    create: {
      email: 'demo@airlens.com',
      password: hashedPassword,
      name: 'Demo User',
      coins: 50,
    },
  });

  console.log('✅ Created demo user:', user.email);

  // Create sample reports with placeholder images
  const sampleReports = [
    {
      title: 'Dense smog covers Delhi skyline at dawn',
      description: 'The entire skyline was barely visible through the thick grey-brown haze this morning. AQI numbers don\'t capture how eerie it feels when you can\'t see buildings 500 meters away.',
      category: Category.VEHICULAR,
      city: 'Delhi',
      area: 'Anand Vihar',
      imageUrl: 'https://images.unsplash.com/photo-1567789884554-0b844b597180?w=800&q=80',
    },
    {
      title: 'Industrial emissions near residential area in Kanpur',
      description: 'Multiple factory smokestacks releasing thick dark smoke right next to housing colonies. The air quality is terrible and many children in the area suffer from respiratory issues.',
      category: Category.INDUSTRIAL,
      city: 'Kanpur',
      area: 'Fazalganj',
      imageUrl: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=800&q=80',
    },
    {
      title: 'Construction dust blankets Gurugram neighborhood',
      description: 'Massive construction project generating dust clouds all day. No water sprinkling being done despite regulations. The entire area is covered in fine dust particles.',
      category: Category.CONSTRUCTION_DUST,
      city: 'Gurugram',
      area: 'Sector 56',
      imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
    },
    {
      title: 'Yamuna river pollution at Kalindi Kunj',
      description: 'The river is completely black with industrial waste and sewage. There\'s a terrible smell and foam floating on the surface. This has been going on for months.',
      category: Category.WATER_POLLUTION,
      city: 'Delhi',
      area: 'Kalindi Kunj',
      imageUrl: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?w=800&q=80',
    },
    {
      title: 'Open garbage burning in residential colony',
      description: 'Garbage being burned right next to houses. The toxic smoke is unbearable and people are keeping their windows shut. No action from municipal corporation despite complaints.',
      category: Category.GARBAGE_BURNING,
      city: 'Lucknow',
      area: 'Gomti Nagar',
      imageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&q=80',
    },
    {
      title: 'Crop burning visible from highway near Ambala',
      description: 'Farmers burning crop stubble across vast fields. The smoke is so thick it\'s affecting visibility on the highway. This contributes massively to Delhi\'s winter smog.',
      category: Category.FOREST_FIRE_CROP_BURNING,
      city: 'Ambala',
      area: 'NH-44',
      imageUrl: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=800&q=80',
    },
    {
      title: 'Plastic waste piling up along Mumbai beach',
      description: 'Mountains of plastic waste along the shore. Despite cleanup drives, the waste keeps accumulating. Marine life is severely affected by this pollution.',
      category: Category.PLASTIC_WASTE,
      city: 'Mumbai',
      area: 'Juhu Beach',
      imageUrl: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?w=800&q=80',
    },
    {
      title: 'Heavy vehicular exhaust on Bangalore outer ring road',
      description: 'Rush hour traffic creating a visible cloud of exhaust. The air feels heavy and there\'s a constant burning sensation in the eyes. Need better public transport urgently.',
      category: Category.VEHICULAR,
      city: 'Bangalore',
      area: 'Outer Ring Road',
      imageUrl: 'https://images.unsplash.com/photo-1567789884554-0b844b597180?w=800&q=80',
    },
  ];

  for (const report of sampleReports) {
    await prisma.report.create({
      data: {
        ...report,
        reportDate: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
        userId: user.id,
      },
    });
  }

  console.log(`✅ Created ${sampleReports.length} sample reports`);

  // Add some likes and confirms
  const allReports = await prisma.report.findMany();
  for (const report of allReports.slice(0, 5)) {
    await prisma.like.create({
      data: { userId: user.id, reportId: report.id },
    }).catch(() => {}); // ignore if already exists
  }

  console.log('✅ Added sample likes');
  console.log('🌿 Database seeded successfully!');
  console.log('\n📧 Demo credentials:');
  console.log('   Email: demo@airlens.com');
  console.log('   Password: demo1234');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed!');
    if (e.message && (e.message.includes('Authentication failed') || e.message.includes('Can\'t reach database server'))) {
      console.error('\n⚠️  DATABASE CONNECTION ERROR:');
      console.error('Could not connect to your PostgreSQL database.');
      console.error('Please ensure PostgreSQL is running and update the "DATABASE_URL" in "server/.env".\n');
    } else {
      console.error(e);
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
