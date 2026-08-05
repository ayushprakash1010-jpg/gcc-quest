const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.source.updateMany({
    where: { name: { contains: 'Zinnov' } },
    data: { config: { isIndexPage: true, linkSelector: 'a' } },
  });

  await prisma.source.updateMany({
    where: { name: { contains: 'NASSCOM' } },
    data: {
      type: 'WEB',
      url: 'https://community.nasscom.in/',
      config: { isIndexPage: true, linkSelector: 'a' },
    },
  });
  console.log('Database updated successfully!');
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
