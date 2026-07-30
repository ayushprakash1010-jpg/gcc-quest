import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ArticleRepository } from '../infrastructure/article.repository';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ArticleStatus } from '@prisma/client';
import { UserRole } from '@gcc-quest/shared-types';

@Controller('articles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ArticlesController {
  constructor(private readonly articleRepository: ArticleRepository) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.ANALYST)
  async getArticles(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('sourceId') sourceId?: string,
    @Query('status') status?: ArticleStatus,
  ) {
    return this.articleRepository.findMany({
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 20,
      sourceId,
      status,
    });
  }

  @Get('search')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.ANALYST)
  async searchArticles(@Query('q') q: string) {
    if (!q) {
      return [];
    }
    return this.articleRepository.search(q);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.ANALYST)
  async getArticle(@Param('id') id: string) {
    return this.articleRepository.findById(id);
  }

  @Post(':id/analyze')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async analyzeArticle(@Param('id') id: string) {
    // In Sprint 4/7 this will trigger BullMQ analysis job
    // For now, just update status
    return this.articleRepository.updateStatus(id, 'ANALYZED');
  }

  @Post(':id/skip')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async skipArticle(@Param('id') id: string) {
    return this.articleRepository.updateStatus(id, 'SKIPPED');
  }
}
