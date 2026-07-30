import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  getHealth() {
    return {
      status: 'ok',
      version: this.configService.get<string>('APP_VERSION', '0.1.0'),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('dependencies')
  getDependencies() {
    return {
      postgres: true, // TODO: Check actual connection once Prisma is integrated
      redis: true,    // TODO: Check actual connection once Redis is integrated
      qdrant: true,   // TODO: Check actual connection once Qdrant is integrated
    };
  }
}
