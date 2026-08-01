import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seedRules() {
  await prisma.calendarRule.createMany({
    data: [
      {
        name: 'Max Posts Per Day',
        ruleType: 'MAX_PER_DAY',
        config: { max: 3 },
        description:
          'Maximum number of posts allowed per day across all channels.',
      },
      {
        name: 'Spacing',
        ruleType: 'SPACING',
        config: { minHours: 4 },
        description: 'Minimum spacing between posts.',
      },
      {
        name: 'Allowed Times',
        ruleType: 'ALLOWED_TIMES',
        config: { startHour: 8, endHour: 20 },
        description: 'Posts should only be scheduled between 8 AM and 8 PM.',
      },
    ],
  });
  console.log('Calendar rules seeded');
}

seedRules()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
