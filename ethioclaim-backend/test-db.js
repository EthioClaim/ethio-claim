const { PrismaClient } = require('@prisma/client');

const neonUrl = "postgresql://neondb_owner:npg_F9nHIWL2qApw@ep-sweet-art-b4c1g04y-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=60&pool_timeout=60";
console.log('Testing with pool_timeout=60...');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: neonUrl,
    },
  },
});

async function main() {
  const start = Date.now();
  try {
    console.log('Connecting to Prisma...');
    const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
    console.log(`Connected in ${Date.now() - start}ms! Users found:`, users);
  } catch (err) {
    console.error('Error connecting to database:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
