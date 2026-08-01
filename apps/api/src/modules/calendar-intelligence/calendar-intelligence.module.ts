import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { CalendarIntelligenceService } from './application/calendar-intelligence.service';

@Module({
  imports: [PrismaModule],
  providers: [CalendarIntelligenceService],
  exports: [CalendarIntelligenceService],
})
export class CalendarIntelligenceModule {}
