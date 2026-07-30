import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Feature Flags & Config
  const settings = [
    { key: 'feature.story_clustering', value: 'true', description: 'Enable/disable story clustering' },
    { key: 'feature.trend_detection', value: 'true', description: 'Enable/disable trend detection' },
    { key: 'feature.feedback_learning', value: 'true', description: 'Enable/disable feedback learning' },
    { key: 'feature.semantic_dedup', value: 'true', description: 'Enable/disable Qdrant semantic deduplication' },
    { key: 'feature.auto_generation', value: 'true', description: 'Auto-generate posts for high-impact articles' },
    { key: 'feature.auto_schedule', value: 'false', description: 'Auto-assign calendar slots' },
    { key: 'feature.ai_observability', value: 'true', description: 'Log all LLM calls to agent_runs table' },
    { key: 'config.analysis_threshold', value: '7', description: 'Min businessImpact to trigger generation' },
    { key: 'config.cluster_similarity', value: '0.80', description: 'Cosine similarity threshold for clustering' },
    { key: 'config.cluster_window_hours', value: '72', description: 'Hours window for cluster formation' },
    { key: 'config.trend_score_threshold', value: '15', description: 'Weighted score to classify a trend' },
    { key: 'config.max_article_tokens', value: '8000', description: 'Max tokens per article before truncation' },
    { key: 'config.dedup_ttl_days', value: '30', description: 'Redis dedup key TTL in days' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log('System settings seeded.');

  // 2. Admin User
  const adminEmail = 'admin@gccquest.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin User',
        role: UserRole.ADMIN,
        passwordHash,
      },
    });
    console.log('Admin user seeded (admin@gccquest.com / admin123).');
  } else {
    console.log('Admin user already exists.');
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
