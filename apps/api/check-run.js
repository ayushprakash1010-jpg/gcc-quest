const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const run = await prisma.agentRun.findFirst({
    where: { contextId: '0a51c432-3b2d-4e43-b140-28f3246cf5bf' },
  });
  console.log(JSON.stringify(run, null, 2));
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
