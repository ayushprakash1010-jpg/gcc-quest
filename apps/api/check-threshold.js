const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'config.trend_score_threshold' },
  });
  console.log('Current threshold:', setting ? setting.value : 'Not set');
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
