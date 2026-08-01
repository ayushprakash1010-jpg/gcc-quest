import { z } from 'zod';
import { SchemaType } from '@google/generative-ai';
import { zodToGeminiSchema } from './src/modules/llm/providers/gemini.provider';

function runTests() {
  console.log('=== Testing Zod Schema Conversion ===');

  // 1. Basic Object
  const basicObj = z.object({ foo: z.string(), bar: z.number() });
  const res1 = zodToGeminiSchema(basicObj) as any;
  console.assert(res1.type === SchemaType.OBJECT, 'Basic Object failed');
  console.assert(
    res1.properties?.foo?.type === SchemaType.STRING,
    'Basic Object foo failed',
  );
  console.assert(
    res1.properties?.bar?.type === SchemaType.NUMBER,
    'Basic Object bar failed',
  );
  console.log('✅ Basic Object OK');

  // 2. Nested Object
  const nestedObj = z.object({
    parent: z.object({
      child: z.boolean(),
    }),
  });
  const res2 = zodToGeminiSchema(nestedObj) as any;
  console.assert(res2.type === SchemaType.OBJECT, 'Nested Object failed');
  console.assert(
    res2.properties?.parent?.type === SchemaType.OBJECT,
    'Nested Object parent failed',
  );
  console.log('✅ Nested Object OK');

  // 3. Object with .describe() (Regression Test)
  const describedObj = z
    .object({
      theme: z.string().describe('The theme'),
    })
    .describe('The top level object');

  const res3 = zodToGeminiSchema(describedObj) as any;
  if (res3.type !== SchemaType.OBJECT) {
    throw new Error('Regression Test Failed: Object fell back to ' + res3.type);
  }
  console.assert(
    res3.properties?.theme?.type === SchemaType.STRING,
    'Described field failed',
  );
  console.log('✅ .describe() Regression Test OK');

  // 4. Array test
  const arrObj = z.array(z.string());
  const res4 = zodToGeminiSchema(arrObj) as any;
  console.assert(res4.type === SchemaType.ARRAY, 'Array failed');
  console.log('✅ Array Test OK');

  console.log('All tests passed!');
}

runTests();
