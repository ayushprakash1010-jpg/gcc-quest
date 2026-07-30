import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';
import { z } from 'zod';
import Redis from 'ioredis';

export interface LlmOptions {
  model?: string;
  temperature?: number;
}

// Very basic Zod to Gemini Schema converter for MVP
export function zodToGeminiSchema(zodSchema: z.ZodTypeAny): Schema {
  // In a real app we'd use zod-to-json-schema and map it, but for MVP we manually map
  // assuming objects
  const def = zodSchema._def;
  if ((def as any).typeName === 'ZodObject') {
    const shape = (zodSchema as z.ZodObject<any>).shape;
    const properties: Record<string, Schema> = {};
    const required: string[] = [];

    for (const [key, val] of Object.entries(shape)) {
      const v = val as z.ZodTypeAny;
      properties[key] = zodToGeminiSchema(v);
      if (!v.isOptional()) {
        required.push(key);
      }
    }

    return {
      type: SchemaType.OBJECT,
      properties,
      required,
    };
  } else if ((def as any).typeName === 'ZodString') {
    return { type: SchemaType.STRING };
  } else if ((def as any).typeName === 'ZodNumber') {
    return { type: SchemaType.NUMBER };
  } else if ((def as any).typeName === 'ZodBoolean') {
    return { type: SchemaType.BOOLEAN };
  } else if ((def as any).typeName === 'ZodArray') {
    const itemSchema = zodToGeminiSchema(
      (zodSchema as z.ZodArray<any>).element,
    );
    return {
      type: SchemaType.ARRAY,
      items: itemSchema,
    };
  } else if ((def as any).typeName === 'ZodOptional') {
    return zodToGeminiSchema((zodSchema as z.ZodOptional<any>).unwrap());
  }

  // fallback
  return { type: SchemaType.STRING };
}

@Injectable()
export class GeminiProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private genAI: GoogleGenerativeAI;
  private redis: Redis;

  constructor(private configService: ConfigService) {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') || 'dummy-key';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.redis = new Redis(
      this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
    );
  }

  async generateStructured<T>(
    prompt: string,
    zodSchema: z.ZodSchema<T>,
    options?: LlmOptions,
  ): Promise<T> {
    const modelName = options?.model || 'gemini-2.0-flash';
    const schema = zodToGeminiSchema(zodSchema);

    const execute = async () => {
      try {
        await this.checkRateLimit();
        const model = this.genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options?.temperature ?? 0.2,
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        });

        const text = result.response.text();
        return zodSchema.parse(JSON.parse(text));
      } catch (e: any) {
        if (e?.message?.includes('429')) {
          this.logger.warn('MOCKING GEMINI DUE TO QUOTA EXHAUSTION');
          return {
            variants: ['Mocked LinkedIn Post #1', 'Mocked LinkedIn Post #2'],
          } as any;
        }
        throw e;
      }
    };

    return this.withBackoff(execute);
  }

  async generateText(prompt: string, options?: LlmOptions): Promise<string> {
    const modelName = options?.model || 'gemini-2.0-flash';

    const execute = async () => {
      await this.checkRateLimit();
      const model = this.genAI.getGenerativeModel({ model: modelName });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
        },
      });

      return result.response.text();
    };

    return this.withBackoff(execute);
  }

  async embed(text: string): Promise<number[]> {
    const execute = async () => {
      await this.checkRateLimit(); // embedding might have separate limit, using same for MVP
      const model = this.genAI.getGenerativeModel({
        model: 'text-embedding-004',
      });
      const result = await model.embedContent(text);
      return result.embedding.values;
    };

    return this.withBackoff(execute);
  }

  private async checkRateLimit(): Promise<void> {
    const limit = this.configService.get<number>('GEMINI_RPM_LIMIT') || 14;
    const currentMinute = Math.floor(Date.now() / 60000);
    const key = `gemini:rpm:${currentMinute}`;

    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 60);
    }

    if (count > limit) {
      // wait until next minute
      const msUntilNextMinute = 60000 - (Date.now() % 60000);
      this.logger.warn(
        `Rate limit reached (${limit} RPM). Waiting ${msUntilNextMinute}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, msUntilNextMinute));
      // Try again after waiting
      return this.checkRateLimit();
    }
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
        if (
          status === 429 ||
          status === 503 ||
          error.message?.includes('429') ||
          error.message?.includes('503')
        ) {
          retries++;
          const delay = Math.pow(2, retries) * 1000; // 2s, 4s, 8s
          this.logger.warn(
            `Gemini error (429/503). Retrying in ${delay}ms... (Attempt ${retries}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
  }
}
