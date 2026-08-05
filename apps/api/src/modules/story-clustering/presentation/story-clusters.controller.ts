import {
  Controller,
  Get,
  Param,
  Query,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { StoryClusterRepository } from '../infrastructure/story-cluster.repository';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@gcc-quest/shared-types';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clusters')
export class StoryClustersController {
  constructor(private readonly repository: StoryClusterRepository) {}

  @Get()
  async getClusters(
    @Query('status') status?: any,
    @Query('theme') theme?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.repository.findMany({
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 20,
      status,
      theme,
    });
  }

  @Get(':id')
  async getCluster(@Param('id') id: string) {
    return this.repository.findById(id);
  }

  @Patch(':id/finalize')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async finalizeCluster(
    @Param('id') id: string,
    @Body('theme') theme: string,
    @Body('synthesisText') synthesisText: string,
  ) {
    return this.repository.finalizeCluster(id, theme, synthesisText);
  }
}
