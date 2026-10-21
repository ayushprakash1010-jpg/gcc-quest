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
    },
  });
  console.log('Trend threshold updated to 500 in DB');

  await prisma.systemSetting.upsert({
    where: { key: 'config.analysis_threshold' },
    update: { value: '8' },
    create: {
      key: 'config.analysis_threshold',
      value: '8',
      description: 'Min businessImpact to trigger generation',
    },
  });
  console.log('Analysis threshold updated to 8 in DB');
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
