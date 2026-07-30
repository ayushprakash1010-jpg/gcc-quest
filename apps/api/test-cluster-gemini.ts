import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/infrastructure/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const config = app.get(ConfigService);

  const cluster = await prisma.storyCluster.findUnique({
    where: { id: 'd0cdc99c-d815-40c1-a968-ebedbc074e93' },
    include: { articles: { include: { analysis: true } } },
  });

  if (!cluster) {
    console.error('Cluster not found!');
    await app.close();
    return;
  }

  const summaries = cluster.articles
    .map(
      (a, i) => `Article ${i + 1} (${a.title}): ${a.analysis?.summary || ''}`,
    )
    .join('\n\n');

  const prompt = `Synthesize the following related articles into a single coherent narrative.\n\n${summaries}`;

  console.log('=== EXACT PROMPT ===');
  console.log(prompt);
  console.log('====================\n');

  const apiKey = config.get('GEMINI_API_KEY');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

  // Matching what gemini.provider.ts sends:
  const schema: any = {
    type: SchemaType.OBJECT,
    properties: {
      theme: { type: SchemaType.STRING },
      synthesisText: { type: SchemaType.STRING },
    },
    required: ['theme', 'synthesisText'],
  };

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    console.log('=== RAW GEMINI RESPONSE (result.response.text()) ===');
    console.log(result.response.text());
    console.log('===========================\n');

    // Check if JSON.parse fails or if it's the schema
    try {
      const parsed = JSON.parse(result.response.text());
      console.log('JSON.parse result:', parsed);
      console.log('Type of parsed object:', typeof parsed);
    } catch (e) {
      console.log('JSON.parse failed:', e.message);
    }
  } catch (e) {
    console.error('Gemini call failed:', e);
  }

  await app.close();
}
bootstrap();
