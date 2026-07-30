import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@gcc-quest/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/feature-flags')
export class FeatureFlagsController {
  constructor(private featureFlagsService: FeatureFlagsService) {}

  @Get()
  async getAllFlags() {
    return this.featureFlagsService.getAllFlags();
  }

  @Put(':key')
  async toggleFlag(
    @Param('key') key: string, 
    @Body('value') value: boolean,
    @CurrentUser() user: any
  ) {
    await this.featureFlagsService.setFlag(key, value, user.id);
    return { success: true, key, value };
  }
}
