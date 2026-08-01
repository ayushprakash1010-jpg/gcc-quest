import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { BrandVoiceRepository } from '../infrastructure/brand-voice.repository';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@gcc-quest/shared-types';

@Controller('brand-voices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BrandVoiceController {
  constructor(private readonly repository: BrandVoiceRepository) {}

  @Get()
  async getAll() {
    return this.repository.findAll();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() body: any) {
    return this.repository.create(body);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() body: any) {
    return this.repository.update(id, body);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: string) {
    return this.repository.delete(id);
  }

  @Post(':id/default')
  @Roles(UserRole.ADMIN)
  async setDefault(@Param('id') id: string) {
    return this.repository.setDefault(id);
  }
}
