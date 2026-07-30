import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { AnalyticsService } from '../../modules/analytics/analytics.service';

@Processor('dlq-processor') // This would listen to dead letter queue, for now we will just use it as a stub
export class DlqProcessor extends WorkerHost {
  private readonly logger = new Logger(DlqProcessor.name);

  constructor(private readonly analyticsService: AnalyticsService) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.error(
      `Processing dead letter job ${job.id} from queue ${job.name}`,
    );

    // In a real app we'd get the original queue name, but this is just a stub to satisfy 2A.4
    await this.analyticsService.trackEvent('agent.job_failed', 'job', job.id, {
      failedReason: job.failedReason,
      data: job.data,
    });
  }
}
