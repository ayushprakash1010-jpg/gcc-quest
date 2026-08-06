import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Deleting rejected drafts...');
  const result = await prisma.contentDraft.deleteMany({
    where: {
      status: 'REJECTED',
    },
  });
  console.log(`Deleted ${result.count} rejected drafts.`);

  console.log(
    'Cleaning up invalid trends (score < 300 or articleCount < 5)...',
  );
  const trendsResult = await prisma.trend.deleteMany({
    where: {
      OR: [{ score: { lt: 300 } }, { articleCount: { lt: 5 } }],
    },
  });
  console.log(`Deleted ${trendsResult.count} invalid trends.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
