const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - 96); // 4 days ago

  const result = await prisma.storyCluster.updateMany({
    where: { status: 'FORMING' },
    data: { lastArticleAt: cutoffDate },
  });

  console.log(`Updated ${result.count} clusters to bypass 72-hour window.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
