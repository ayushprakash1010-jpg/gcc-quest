const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.systemSetting.upsert({
    where: { key: 'config.trend_score_threshold' },
    update: { value: '500' },
    create: {
      key: 'config.trend_score_threshold',
      value: '500',
      description: 'Minimum score to detect a trend',
      isPublic: false,
    },
  });
  console.log('Threshold updated to 500 in DB');
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
