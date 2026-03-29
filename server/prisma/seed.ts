import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding Database...');

  // Create Users
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@example.com' },
    update: {},
    create: {
      name: 'Bruce Wayne',
      email: 'buyer@example.com',
      password_hash: passwordHash,
      role: 'BUYER'
    }
  });

  const seller = await prisma.user.upsert({
    where: { email: 'seller@example.com' },
    update: {},
    create: {
      name: 'Tony Stark',
      email: 'seller@example.com',
      password_hash: passwordHash,
      role: 'SELLER'
    }
  });

  // Create an active auction closing in 30 minutes
  const auction = await prisma.auction.create({
    data: {
      title: '1961 Mercedes-Benz 300SL Roadster',
      description: 'One of only 1,858 Roadsters built, this matching-numbers example is finished in its original silver-blue metallic over premium Oxblood leather. Recently emerged from a multi-year restoration by specialist Paul Russell & Company. Complete provenance records including the original factory build sheet.',
      image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDq0Xufy3zrSkT7DooJFbqPdVRUu2RiFpk0OCyAMMHUJ2fXRfMIOcAe_i9y7MgDHjtcdcs4HVYS_4x7_EMalomPqKnTvZZi0iCzZLNPVdOWwEKgzqeGAgcSLk-DGID5PFwbOBJyIkNDZrz7GfgR7U5zbf3peUG76iaWwIvKH_Twnb9PuQOt6e2e7NbSziX_EEyYRAqR3xBlGItQNJfa6IEu4q7C6ziF9I6xxrDhb-uR7PfEHUiLiKP-XSD5FcEpfnD-M1SdR3Pg9gM',
      start_price: 1245000,
      current_highest_bid: 1245000,
      end_time: new Date(Date.now() + 30 * 60000), // 30 mins from now
      seller_id: seller.id
    }
  });

  console.log(`Successfully created auction: ${auction.title}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
