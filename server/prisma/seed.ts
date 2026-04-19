import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient().$extends(withAccelerate());

const BCRYPT_ROUNDS = 10;

async function main() {
  console.log('Seeding database...');

  // Create default user
  const passHash = await bcrypt.hash('admin123', BCRYPT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passHash
    }
  });

  console.log(`Created user: ${user.username} (id: ${user.id})`);
  console.log('Seed completed.');
}

main()
  .then(async () => {
    await (prisma as any).$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await (prisma as any).$disconnect();
    process.exit(1);
  });
