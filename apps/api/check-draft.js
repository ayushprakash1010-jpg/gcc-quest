const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const draft = await prisma.contentDraft.findUnique({
    where: { id: 'cd011d53-6755-4738-b4fb-aa771636bb84' },
    include: { versions: true },
  });
  console.log(JSON.stringify(draft, null, 2));
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
