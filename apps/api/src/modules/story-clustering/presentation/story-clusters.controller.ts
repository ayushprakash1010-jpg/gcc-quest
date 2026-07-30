import { Controller, Get, Param, Query, Patch, Body } from '@nestjs/common';
import { StoryClusterRepository } from '../infrastructure/story-cluster.repository';

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
  async finalizeCluster(
    @Param('id') id: string,
    @Body('theme') theme: string,
    @Body('synthesisText') synthesisText: string,
  ) {
    return this.repository.finalizeCluster(id, theme, synthesisText);
  }
}
