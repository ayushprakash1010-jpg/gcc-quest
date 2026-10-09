import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { LlmOptions } from './gemini.provider';

@Injectable()
export class OpenAiProvider {
  private readonly logger = new Logger(OpenAiProvider.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey =
      this.configService.get<string>('OPENAI_API_KEY') || 'dummy-key';
    this.openai = new OpenAI({ apiKey });
  }

  async generateStructured<T>(
    prompt: string,
    zodSchema: z.ZodSchema<T>,
    options?: LlmOptions,
  ): Promise<T> {
    const modelName = options?.model || 'gpt-4o-mini';

    const execute = async () => {
      try {
        const response = await this.openai.beta.chat.completions.parse({
          model: modelName,
          messages: [{ role: 'user', content: prompt }],
          response_format: zodResponseFormat(zodSchema as any, 'result'),
          temperature: options?.temperature ?? 0.2,
        });

        const result = response.choices[0].message.parsed;
        if (!result) throw new Error('OpenAI returned null parsed result');
        return result as T;
      } catch (e: any) {
        this.logger.error(`OpenAI Error: ${e.message}`);
        throw e;
      }
    };

    return this.withBackoff(execute);
  }

  async generateText(prompt: string, options?: LlmOptions): Promise<string> {
    const modelName = options?.model || 'gpt-4o-mini';

    const execute = async () => {
      const response = await this.openai.chat.completions.create({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature ?? 0.7,
      });

      return response.choices[0].message.content || '';
    };

    return this.withBackoff(execute);
  }

  private async withBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    let retries = 0;
    while (true) {
      try {
        return await fn();
      } catch (error: any) {
        if (retries >= maxRetries) throw error;
        const status = error?.status || error?.response?.status;
        if (status === 429 || status >= 500) {
          retries++;
          const delay = Math.pow(2, retries) * 1000;
          this.logger.warn(
            `OpenAI error (${status}). Retrying in ${delay}ms... (Attempt ${retries}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
  }
}
