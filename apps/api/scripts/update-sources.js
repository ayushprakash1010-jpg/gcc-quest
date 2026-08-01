const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // ===== STEP 1: DELETE broken/junk sources =====
  // Remove: NASSCOM Blog (404), Analytics India Mag (broken XML),
  //         2x Test Sources (HackerNews duplicates), NASSCOM Insights (actually hnrss - not NASSCOM)
  const toDelete = [
    '89db4d24-ea22-4f41-bfaa-151aef87a4e6', // NASSCOM Blog (404)
    '59f0a779-54b2-4a49-8efa-2e58a09504cc', // Analytics India Mag (broken XML)
    'da55fcc9-f100-420a-8165-b33ed9cf36e2', // Test Source (HN with timestamp)
    'db7a1b21-3bd4-4254-97ea-efc26063e3ba', // Test Source (HN - duplicate)
    'c989a07d-a566-49c4-a697-b9ae02c02f46', // "NASSCOM Insights" actually pointing to hnrss.org (wrong label)
  ];

  for (const id of toDelete) {
    await p.source.delete({ where: { id } }).catch(() => {});
  }
  console.log(`✅ Deleted ${toDelete.length} broken/junk sources`);

  // ===== STEP 2: FIX ET IT/ITES which returns 0 items - update to a working ET feed =====
  await p.source.update({
    where: { id: '8bff9a98-b43c-4664-a157-a5769807f6e7' },
    data: {
      name: 'ET IT/ITES News',
      url: 'https://economictimes.indiatimes.com/industry/rssfeeds/13352306.cms',
      compositeScore: 8.0,
    },
  });
  console.log('✅ Fixed ET IT/ITES feed URL');

  // ===== STEP 3: ADD new high-quality GCC-relevant sources =====
  const newSources = [
    {
      name: 'Mint Technology',
      url: 'https://www.livemint.com/rss/technology',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      status: 'ACTIVE',
      trustScore: 8.5,
      authorityScore: 8.5,
      freshnessScore: 9.0,
      compositeScore: 8.7,
      tags: ['technology', 'india', 'business', 'gcc'],
    },
    {
      name: 'The Hindu BusinessLine Tech',
      url: 'https://www.thehindubusinessline.com/info-tech/?service=rss',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      status: 'ACTIVE',
      trustScore: 8.0,
      authorityScore: 8.5,
      freshnessScore: 8.0,
      compositeScore: 8.2,
      tags: ['technology', 'india', 'business', 'gcc'],
    },
    {
      name: 'Inc42 – India Startup & Tech',
      url: 'https://inc42.com/feed/',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      status: 'ACTIVE',
      trustScore: 7.5,
      authorityScore: 7.5,
      freshnessScore: 8.5,
      compositeScore: 7.8,
      tags: ['startups', 'technology', 'india', 'gcc'],
    },
    {
      name: 'YourStory Technology',
      url: 'https://yourstory.com/feed',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      status: 'ACTIVE',
      trustScore: 7.5,
      authorityScore: 7.5,
      freshnessScore: 8.5,
      compositeScore: 7.8,
      tags: ['startups', 'technology', 'india'],
    },
    {
      name: 'MIT Technology Review',
      url: 'https://www.technologyreview.com/feed/',
      type: 'RSS',
      category: 'RESEARCH',
      crawlFrequency: 'DAILY',
      status: 'ACTIVE',
      trustScore: 9.5,
      authorityScore: 9.5,
      freshnessScore: 7.0,
      compositeScore: 9.0,
      tags: ['ai', 'technology', 'research', 'innovation'],
    },
    {
      name: 'ZDNet Enterprise',
      url: 'https://www.zdnet.com/topic/enterprise/rss.xml',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      status: 'ACTIVE',
      trustScore: 8.0,
      authorityScore: 8.0,
      freshnessScore: 8.5,
      compositeScore: 8.2,
      tags: ['enterprise', 'technology', 'cloud', 'ai'],
    },
    {
      name: 'The Register – Enterprise',
      url: 'https://www.theregister.com/headlines.atom',
      type: 'RSS',
      category: 'NEWS',
      crawlFrequency: 'HOURLY',
      status: 'ACTIVE',
      trustScore: 8.0,
      authorityScore: 7.5,
      freshnessScore: 9.0,
      compositeScore: 8.1,
      tags: ['enterprise', 'technology', 'cloud', 'software'],
    },
  ];

  for (const s of newSources) {
    await p.source.create({ data: s });
    console.log(`✅ Added: ${s.name}`);
  }

  console.log('\n🎉 Sources updated! Final sources:');
  const all = await p.source.findMany({
    select: { name: true, url: true, compositeScore: true, status: true },
  });
  all.forEach((s) => console.log(`  • ${s.name} (Score: ${s.compositeScore})`));
}

main().finally(() => p.$disconnect());
