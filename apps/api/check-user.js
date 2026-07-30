const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@gccquest.com' },
  });
  console.log('DB USER:', user);
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
