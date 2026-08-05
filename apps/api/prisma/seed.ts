import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Feature Flags & Config
  const settings = [
    {
      key: 'feature.story_clustering',
      value: 'true',
      description: 'Enable/disable story clustering',
    },
    {
      key: 'feature.trend_detection',
      value: 'true',
      description: 'Enable/disable trend detection',
    },
    {
      key: 'feature.feedback_learning',
      value: 'true',
      description: 'Enable/disable feedback learning',
    },
    {
      key: 'feature.semantic_dedup',
      value: 'true',
      description: 'Enable/disable Qdrant semantic deduplication',
    },
    {
      key: 'feature.auto_generation',
      value: 'true',
      description: 'Auto-generate posts for high-impact articles',
    },
    {
      key: 'feature.auto_schedule',
      value: 'false',
      description: 'Auto-assign calendar slots',
    },
    {
      key: 'feature.ai_observability',
      value: 'true',
      description: 'Log all LLM calls to agent_runs table',
    },
    {
      key: 'config.analysis_threshold',
      value: '7',
      description: 'Min businessImpact to trigger generation',
    },
    {
      key: 'config.cluster_similarity',
      value: '0.80',
      description: 'Cosine similarity threshold for clustering',
    },
    {
      key: 'config.cluster_window_hours',
      value: '24',
      description: 'Hours to wait before finalizing a story cluster',
    },
    {
      key: 'config.trend_score_threshold',
      value: '15',
      description: 'Weighted score to classify a trend',
    },
    {
      key: 'config.max_article_tokens',
      value: '8000',
      description: 'Max tokens per article before truncation',
    },
    {
      key: 'config.dedup_ttl_days',
      value: '30',
      description: 'Redis dedup key TTL in days',
    },
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
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const crypto = require('crypto');
    const randomPassword = crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin User',
        role: UserRole.ADMIN,
        passwordHash,
      },
    });
    console.log(
      `Admin user seeded (Email: ${adminEmail} / Password: ${randomPassword}). IMPORTANT: Save this password or change it immediately.`,
    );
  } else {
    console.log('Admin user already exists.');
  }

  // 3. Initial 10 Targeted High-Quality Sources (Phase 1 Quick Wins)
  const initialSources = [
    {
      name: 'Economic Times CIO',
      url: 'https://ciso.economictimes.indiatimes.com/rss/topstories',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      trustScore: 9.0,
      authorityScore: 9.0,
      compositeScore: 9.0,
      status: 'ACTIVE',
    },
    {
      name: 'Economic Times — GCC/Corporate',
      url: 'https://economictimes.indiatimes.com/tech/rssfeeds.cms',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      trustScore: 9.0,
      authorityScore: 9.0,
      compositeScore: 9.0,
      status: 'ACTIVE',
    },
    {
      name: 'YourStory',
      url: 'https://yourstory.com/feed',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      trustScore: 8.5,
      authorityScore: 8.0,
      compositeScore: 8.25,
      status: 'ACTIVE',
    },
    {
      name: 'Inc42',
      url: 'https://inc42.com/feed/',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      trustScore: 8.5,
      authorityScore: 8.5,
      compositeScore: 8.5,
      status: 'ACTIVE',
    },
    {
      name: 'Business Standard Tech',
      url: 'https://www.business-standard.com/rss/technology-108.rss',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      trustScore: 9.0,
      authorityScore: 9.0,
      compositeScore: 9.0,
      status: 'ACTIVE',
    },
    {
      name: 'Moneycontrol Tech',
      url: 'https://www.moneycontrol.com/rss/technology.xml',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      trustScore: 8.5,
      authorityScore: 8.5,
      compositeScore: 8.5,
      status: 'ACTIVE',
    },
    {
      name: 'Analytics India Magazine',
      url: 'https://analyticsindiamag.com/feed/',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      trustScore: 8.5,
      authorityScore: 8.5,
      compositeScore: 8.5,
      status: 'ACTIVE',
    },
    {
      name: 'Mint (Livemint) Companies',
      url: 'https://www.livemint.com/rss/companies',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      trustScore: 9.0,
      authorityScore: 9.0,
      compositeScore: 9.0,
      status: 'ACTIVE',
    },
    {
      name: 'The Hindu BusinessLine',
      url: 'https://www.thehindubusinessline.com/info-tech/?service=rss',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      trustScore: 9.0,
      authorityScore: 9.0,
      compositeScore: 9.0,
      status: 'ACTIVE',
    },
    {
      name: 'Walmart Global Tech (India GCC)',
      url: 'https://tech.walmart.com/',
      type: 'WEB',
      category: 'RESEARCH',
      crawlFrequency: 'DAILY',
      trustScore: 9.5,
      authorityScore: 9.0,
      compositeScore: 9.25,
      status: 'ACTIVE',
    },
  ];

  for (const src of initialSources) {
    const existing = await prisma.source.findFirst({ where: { url: src.url } });
    if (!existing) {
      await prisma.source.create({ data: src as any });
    }
  }
  console.log('Initial sources seeded.');

  // 4. Default Brand Voice
  const existingBrandVoice = await prisma.brandVoice.findFirst({
    where: { isDefault: true },
  });
  if (!existingBrandVoice) {
    await prisma.brandVoice.create({
      data: {
        name: 'GCC Quest Default',
        description: 'Standard analytical and professional tone for GCC Quest',
        tone: 'Professional, analytical, forward-looking, and objective.',
        guidelines: [
          'Use clear business terminology without excessive jargon.',
          'Focus on business impact, talent strategy, and technological innovation.',
          'Maintain an objective, third-person perspective.',
        ],
        isDefault: true,
      },
    });
    console.log('Default brand voice seeded.');
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
