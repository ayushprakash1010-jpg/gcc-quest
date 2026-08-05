import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';

export interface AgentRunContext {
  runType: string;
  promptKey?: string;
  promptVersion?: string;
  model: string;
  contextId?: string;
}

const COST_PER_TOKEN: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash': { input: 0.000000075, output: 0.0000003 },
  'gemini-3.5-flash': { input: 0.000000075, output: 0.0000003 },
  'gemini-3.5-flash-lite': { input: 0.0000000375, output: 0.00000015 },
  'gemini-embedding-001': { input: 0.000000001, output: 0 },
};

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  async trackRun<T>(
    context: AgentRunContext,
    fn: () => Promise<T>,
  ): Promise<T> {
    const isEnabled = await this.featureFlags.isEnabled(
      'ENABLE_AI_OBSERVABILITY',
    );

    if (!isEnabled) {
      return fn();
    }

    const startTime = Date.now();
    let runId: string | null = null;

    try {
      // Create initial run record
      const run = await this.prisma.agentRun.create({
        data: {
          runType: context.runType,
          promptKey: context.promptKey,
          promptVersion: context.promptVersion,
          model: context.model,
          contextId: context.contextId,
        },
      });
      runId = run.id;

      // Execute the LLM call
      const result = await fn();

      const durationMs = Date.now() - startTime;

      let tokensInput = 0;
      let tokensOutput = 0;

      // Extract real token usage from Gemini response if available
      if (result && (result as any).usageMetadata) {
        tokensInput = (result as any).usageMetadata.promptTokenCount || 0;
        tokensOutput = (result as any).usageMetadata.candidatesTokenCount || 0;
      } else {
        // Fallback for mock or older responses
        const isEmbedding = context.runType === 'embedding';
        tokensInput = isEmbedding ? 500 : 1500;
        tokensOutput = isEmbedding ? 0 : 500;
      }

      const rates = COST_PER_TOKEN[context.model] || { input: 0, output: 0 };
      const costUsd = tokensInput * rates.input + tokensOutput * rates.output;

      await this.prisma.agentRun.update({
        where: { id: runId },
        data: {
          completedAt: new Date(),
          tokensInput,
          tokensOutput,
          costUsd,
          latencyMs: durationMs,
          success: true,
        },
      });

      return result;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      if (runId) {
        await this.prisma.agentRun.update({
          where: { id: runId },
          data: {
            completedAt: new Date(),
            latencyMs: durationMs,
            success: false,
            errorMessage: error.message || 'Unknown error',
          },
        });
      }

      throw error;
    }
  }
}
