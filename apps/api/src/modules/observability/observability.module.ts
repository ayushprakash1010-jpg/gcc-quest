import { Global, Module } from '@nestjs/common';
import { ObservabilityService } from './observability.service';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { PrismaModule } from '../../infrastructure/database/prisma.module';

@Global()
@Module({
  imports: [FeatureFlagsModule, PrismaModule],
  providers: [ObservabilityService],
  exports: [ObservabilityService],
})
export class ObservabilityModule {}
