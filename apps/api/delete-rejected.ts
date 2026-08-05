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
    'Cleaning up invalid trends (score < 150 or articleCount < 3)...',
  );
  const trendsResult = await prisma.trend.deleteMany({
    where: {
      OR: [{ score: { lt: 150 } }, { articleCount: { lt: 3 } }],
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
