const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  const articlesByStatus = await p.article.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const totalDrafts = await p.contentDraft.count();
  const draftsByStatus = await p.contentDraft.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const pendingAnalysis = await p.article.count({
    where: { status: 'DISCOVERED' },
  });

  console.log('\n=== ARTICLE STATUS BREAKDOWN ===');
  articlesByStatus.forEach((s) =>
    console.log(`  ${s.status}: ${s._count.id} articles`),
  );

  console.log('\n=== DRAFT STATUS BREAKDOWN ===');
  draftsByStatus.forEach((s) =>
    console.log(`  ${s.status}: ${s._count.id} drafts`),
  );

  console.log('\n=== PIPELINE HEALTH ===');
  console.log(`  Still waiting for Gemini analysis: ${pendingAnalysis}`);
  console.log(`  Total drafts created: ${totalDrafts}`);

  if (pendingAnalysis === 0) {
    console.log('\n✅ ALL ARTICLES HAVE BEEN PROCESSED BY GEMINI!');
  } else {
    console.log(`\n⏳ ${pendingAnalysis} articles still being processed...`);
  }
}

check().finally(() => p.$disconnect());
