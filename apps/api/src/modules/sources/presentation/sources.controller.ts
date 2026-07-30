import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateSourceUseCase } from '../application/use-cases/create-source.use-case';
import { UpdateSourceUseCase } from '../application/use-cases/update-source.use-case';
import { DeleteSourceUseCase } from '../application/use-cases/delete-source.use-case';
import { TriggerCrawlUseCase } from '../application/use-cases/trigger-crawl.use-case';
import { SourceRepository } from '../infrastructure/source.repository';
import { CreateSourceDto } from '../application/dtos/create-source.dto';
import { UpdateSourceDto } from '../application/dtos/update-source.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { SourceStatus, SourceCategory } from '@prisma/client';
import { UserRole } from '@gcc-quest/shared-types';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UpdateQualityDto } from '../application/dtos/update-quality.dto';
import { SourceQualityService } from '../application/source-quality.service';

@Controller('sources')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SourcesController {
  constructor(
    private readonly createSourceUseCase: CreateSourceUseCase,
    private readonly updateSourceUseCase: UpdateSourceUseCase,
    private readonly deleteSourceUseCase: DeleteSourceUseCase,
    private readonly triggerCrawlUseCase: TriggerCrawlUseCase,
    private readonly sourceRepository: SourceRepository,
    private readonly sourceQualityService: SourceQualityService,
  ) {}

  @Get()
  async findAll(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('status') status?: SourceStatus,
    @Query('category') category?: SourceCategory,
  ) {
    return this.sourceRepository.findAll({
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
      status,
      category,
    });
  }

  @Get('quality-report')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.ANALYST)
  async getQualityReport() {
    return this.sourceRepository.findQualityReport();
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async create(@Body() dto: CreateSourceDto, @CurrentUser() user: any) {
    return this.createSourceUseCase.execute(dto, user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.sourceRepository.findById(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async update(@Param('id') id: string, @Body() dto: UpdateSourceDto) {
    return this.updateSourceUseCase.execute(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.deleteSourceUseCase.execute(id);
    return { success: true };
  }

  @Post(':id/crawl')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async triggerCrawl(@Param('id') id: string) {
    return this.triggerCrawlUseCase.execute(id);
  }

  @Put(':id/quality')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async updateQuality(@Param('id') id: string, @Body() dto: UpdateQualityDto) {
    const existing = await this.sourceRepository.findById(id);
    if (!existing) {
      throw new Error(`Source ${id} not found`);
    }

    const freshness =
      this.sourceQualityService.calculateFreshnessScore(existing);
    const composite = this.sourceQualityService.calculateCompositeScore(
      dto.trustScore,
      dto.authorityScore,
      freshness,
    );

    return this.sourceRepository.updateSystemScores(id, {
      trustScore: dto.trustScore,
      authorityScore: dto.authorityScore,
      compositeScore: composite,
    });
  }
}
