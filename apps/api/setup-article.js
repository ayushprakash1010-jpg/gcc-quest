const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  // Setup Prompt
  const promptKey = 'writer-linkedin-v1';
  const existingPrompt = await prisma.promptTemplate.findFirst({
    where: { key: promptKey, isActive: true },
  });
  if (!existingPrompt) {
    console.log('Creating prompt template...');
    await prisma.promptTemplate.create({
      data: {
        key: promptKey,
        version: 'v1.0',
        name: 'LinkedIn Post Generator',
        description: 'Generates LinkedIn drafts based on an article analysis',
        template:
          'Here is an article summary:\n{{summary}}\n\nBrand Voice:\n{{brandVoiceConfig}}\n\nFeedback Context:\n{{feedbackContext}}\n\nGenerate two LinkedIn post variants.',
        isActive: true,
        createdBy: 'system',
      },
    });
  }

  // Setup Article
  const article = await prisma.article.findFirst({
    include: { analysis: true },
    where: { analysis: { impactScore: { gte: 9.0 } } },
  });
  if (!article) {
    console.log('No article found. Creating one...');
    const source = await prisma.source.findFirst();
    const newArticle = await prisma.article.create({
      data: {
        sourceId: source.id,
        externalUrl: 'https://example.com/test-article-' + Date.now(),
        title: 'Test Article for Generation',
        contentHash: 'hash-' + Date.now(),
        analysis: {
          create: {
            summary: 'This is a test summary for generation.',
            sentiment: 'POSITIVE',
            gccCategory: 'TECHNOLOGY',
            impactScore: 9.5, // High impact to trigger generation
            promptKey: 'test',
            promptVersion: '1',
          },
        },
      },
    });
    console.log('Created article:', newArticle.id);
  } else {
    console.log('Found article:', article.id);
  }
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
