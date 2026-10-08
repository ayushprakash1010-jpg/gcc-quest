import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting DB redesign updates...');

  // 1. Update Calendar Rules to ensure maxPerDay is 1
  const rule = await prisma.calendarRule.findFirst({
    where: { ruleType: 'MAX_PER_DAY' },
  });

  if (rule) {
    await prisma.calendarRule.update({
      where: { id: rule.id },
      data: {
        config: { max: 1 },
      },
    });
    console.log('Updated MAX_PER_DAY calendar rule to 1 post/day.');
  } else {
    await prisma.calendarRule.create({
      data: {
        name: 'Max Posts Per Day',
        ruleType: 'MAX_PER_DAY',
        config: { max: 1 },
        isActive: true,
      },
    });
    console.log('Created MAX_PER_DAY calendar rule with 1 post/day.');
  }

  // 2. Pause irrelevant/generic sources
  const genericSources = [
    'The New Stack',
    'InfoQ',
    'TechCrunch Enterprise',
    'The Register',
    'ZDNet Enterprise',
    'MIT Technology Review',
    'The Hindu BusinessLine Tech',
    'Analytics India Magazine (Proxy)',
  ];

  await prisma.source.updateMany({
    where: {
      name: { in: genericSources },
    },
    data: {
      status: 'PAUSED',
    },
  });
  console.log('Paused generic tech sources.');

  // 3. Add new manager-requested sources (if they don't already exist)
  const newSources = [
    {
      name: 'Moneycontrol Tech',
      url: 'https://www.moneycontrol.com/rss/technology.xml', // Placeholder RSS
      type: 'RSS' as const,
      category: 'NEWS' as const,
      status: 'ACTIVE' as const,
      trustScore: 8.5,
      authorityScore: 8.5,
    },
    {
      name: 'Business Standard Tech',
      url: 'https://www.business-standard.com/rss/technology-108.rss',
      type: 'RSS' as const,
      category: 'NEWS' as const,
      status: 'ACTIVE' as const,
      trustScore: 9.0,
      authorityScore: 9.0,
    },
    {
      name: 'Financial Express Tech',
      url: 'https://www.financialexpress.com/feed/',
      type: 'RSS' as const,
      category: 'NEWS' as const,
      status: 'ACTIVE' as const,
      trustScore: 8.5,
      authorityScore: 8.5,
    },
  ];

  for (const source of newSources) {
    const exists = await prisma.source.findUnique({
      where: { url: source.url },
    });

    if (!exists) {
      await prisma.source.create({
        data: source,
      });
      console.log(`Added new source: ${source.name}`);
    } else {
      console.log(`Source already exists: ${source.name}`);
    }
  }

  console.log('Database redesign updates completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
