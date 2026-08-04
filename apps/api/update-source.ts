import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const source = await prisma.source.findFirst({
      where: { name: 'Analytics India Magazine' },
    });

    if (source) {
      console.log(`Found source: ${source.id} with URL ${source.url}`);

      const updated = await prisma.source.update({
        where: { id: source.id },
        data: { url: 'https://rss.app/feeds/I9Q7q4d1xiQV8zag.xml' },
      });

      console.log(`Successfully updated URL to: ${updated.url}`);
    } else {
      console.log('Source not found.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
