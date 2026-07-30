import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { PromptService } from '../infrastructure/prompt.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@gcc-quest/shared-types';

@Controller('api/v1/admin/prompts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PromptsController {
  constructor(private readonly promptService: PromptService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  getAllPrompts() {
    return this.promptService.getAllTemplates().map((t) => ({
      key: t.key,
      description: t.description,
      versions: t.versions.map((v) => v.version),
    }));
  }

  @Get(':key')
  @Roles(UserRole.ADMIN)
  getPromptVersions(@Param('key') key: string) {
    const versions = this.promptService.getAllVersions(key);
    return versions.map((v) => ({
      version: v.version,
    }));
  }

  @Put(':key/activate')
  @Roles(UserRole.ADMIN)
  activatePrompt(@Param('key') key: string, @Body('version') version: string) {
    this.promptService.setActive(key, version);
    return { success: true, key, activeVersion: version };
  }
}
