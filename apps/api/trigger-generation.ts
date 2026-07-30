import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from './src/infrastructure/database/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const eventEmitter = app.get(EventEmitter2);
  const prisma = app.get(PrismaService);

  const article = await prisma.article.findFirst({
    include: { analysis: true },
    where: { analysis: { impactScore: { gte: 9.0 } } },
  });

  if (!article) {
    console.error('No article with high impact score found.');
    await app.close();
    return;
  }

  // Clean up any drafts for this article so we ensure a fresh one is created
  await prisma.contentDraft.deleteMany({ where: { articleId: article.id } });

  console.log(`Emitting ARTICLE_ANALYZED for article ${article.id}...`);

  // This will trigger ContentGenerationProcessor.handleArticleAnalyzed
  eventEmitter.emit('article.analyzed', {
    articleId: article.id,
    sourceId: article.sourceId,
  });

  // Wait 15 seconds for LLM to finish
  console.log('Waiting 20 seconds for AI generation to complete...');
  await new Promise((resolve) => setTimeout(resolve, 20000));

  const draft = await prisma.contentDraft.findFirst({
    where: { articleId: article.id },
    include: { versions: true },
  });

  if (!draft) {
    console.log('❌ Failed to create draft.');
  } else {
    console.log('✅ ContentDraft created:', draft.id);
    if (draft.versions && draft.versions.length > 0) {
      console.log(`✅ ${draft.versions.length} ContentVersion(s) created!`);
      console.log(
        'Content preview:',
        draft.versions[0].content.substring(0, 100) + '...',
      );
      console.log('JSON:', JSON.stringify(draft, null, 2));
    } else {
      console.log('❌ ContentDraft was created but has 0 versions!');
    }
  }

  await app.close();
}

bootstrap().catch(console.error);
