const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const sources = await p.source.findMany({
    select: {
      id: true,
      name: true,
      url: true,
      status: true,
      totalArticles: true,
      compositeScore: true,
      lastError: true,
    },
  });
  console.log(JSON.stringify(sources, null, 2));
}

main().finally(() => p.$disconnect());
