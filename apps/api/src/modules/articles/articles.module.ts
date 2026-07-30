import { Module } from '@nestjs/common';
import { ArticleRepository } from './infrastructure/article.repository';
import { AnalysisProcessor } from './application/analysis.processor';
import { EmbeddingProcessor } from './application/embedding.processor';
import { ArticlesController } from './presentation/articles.controller';

@Module({
  controllers: [ArticlesController],
  providers: [ArticleRepository, AnalysisProcessor, EmbeddingProcessor],
  exports: [ArticleRepository],
})
export class ArticlesModule {}
