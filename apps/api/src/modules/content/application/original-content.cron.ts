import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { LlmService } from '../../llm/llm.service';
import { thoughtLeadershipV2 } from '../../prompts/templates/writer/thought-leadership.v2';
import { draftsSchema } from '../../prompts/schemas/content-generation.schema';
import { ObservabilityService } from '../../agent-observability/application/observability.service';

@Injectable()
export class OriginalContentCron {
  private readonly logger = new Logger(OriginalContentCron.name);

  constructor(
    private prisma: PrismaService,
    private llm: LlmService,
    private observability: ObservabilityService,
  ) {}

  // Run twice a week, Tuesday and Thursday at 10:00 AM
  @Cron('0 10 * * 2,4')
  async generateOriginalThoughtLeadership() {
    this.logger.log('Starting original thought leadership generation loop...');

    // 1. Pick a random active topic
    const topics = await this.prisma.contentTopic.findMany({
      where: { isActive: true },
    });

    if (topics.length === 0) {
      this.logger.warn(
        'No active topics found in the database. Seeding defaults...',
      );
      await this.seedDefaultTopics();
      return this.generateOriginalThoughtLeadership();
    }

    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    this.logger.log(
      `Selected topic for original generation: ${randomTopic.name}`,
    );

    try {
      // 2. Prepare Prompt
      const renderedPrompt = thoughtLeadershipV2({
        topic: randomTopic.name,
      });

      // 3. Generate Draft via LLM
      const result = await this.observability.trackRun(
        {
          runType: 'original-generation',
          promptKey: 'writer:thought-leadership',
          promptVersion: 'v2',
          model: 'gpt-4o-mini', // Defaults to ChatGPT for original thought, LlmService routes based on env
          contextId: randomTopic.id,
        },
        () => this.llm.generateStructured(renderedPrompt, draftsSchema),
      );

      // 4. Save Draft
      const draftContent = result.drafts[0]?.content;
      if (!draftContent) {
        throw new Error('LLM returned empty draft content');
      }

      await this.prisma.contentDraft.create({
        data: {
          topicId: randomTopic.id,
          status: 'DRAFT',
          targetPlatform: 'LINKEDIN',
          versions: {
            create: {
              versionNumber: 1,
              content: draftContent,
              promptKey: 'writer:thought-leadership',
              promptVersion: 'v2',
              generatedBy: 'AI',
            },
          },
        },
      });

      this.logger.log(
        `Successfully generated and saved original draft for topic: ${randomTopic.name}`,
      );
    } catch (e: any) {
      this.logger.error(
        `Error generating original content for topic ${randomTopic.name}: ${e.message}`,
        e.stack,
      );
    }
  }

  private async seedDefaultTopics() {
    const defaults = [
      'The shift from cost arbitrage to innovation hubs in Indian GCCs',
      'The rise of Enterprise AI adoption within capability centers',
      'Talent retention and leadership growth in the GCC ecosystem',
      'How GCCs are driving global digital transformation',
      'The impact of women leaders in the Indian tech ecosystem',
    ];

    await this.prisma.contentTopic.createMany({
      data: defaults.map((name) => ({ name })),
      skipDuplicates: true,
    });
  }
}
