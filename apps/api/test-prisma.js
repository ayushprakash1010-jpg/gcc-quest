const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    const drafts = await prisma.contentDraft.findMany({
      where: { status: 'DRAFT' },
      include: {
        article: {
          include: {
            source: true,
            analysis: true,
          },
        },
        cluster: {
          include: {
            articles: { include: { source: true } },
          },
        },
        trend: true,
        versions: { orderBy: { versionNumber: 'desc' } },
      },
    });
    console.log('Success:', drafts.length);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();
