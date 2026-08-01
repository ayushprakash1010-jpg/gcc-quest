import { Module } from '@nestjs/common';
import { ArticleRepository } from './infrastructure/article.repository';
import { AnalysisProcessor } from './application/analysis.processor';
import { EmbeddingProcessor } from './application/embedding.processor';
import { ArticlesController } from './presentation/articles.controller';

@Module({
  controllers: [ArticlesController],
  // AnalysisProcessor extends BullMQ WorkerHost and is registered as a standard NestJS provider.
  // The @Processor(QUEUES.ANALYSIS) decorator binds it to the analysis-queue,
  // which is globally registered in QueueModule.
  providers: [ArticleRepository, AnalysisProcessor, EmbeddingProcessor],
  exports: [ArticleRepository],
})
export class ArticlesModule {}
