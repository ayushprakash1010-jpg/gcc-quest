const Parser = require('rss-parser');
const parser = new Parser({ timeout: 8000 });

const candidates = [
  // India IT/GCC specific
  {
    name: 'Economic Times Tech',
    url: 'https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms',
  },
  {
    name: 'ET MNC/Corporate',
    url: 'https://economictimes.indiatimes.com/industry/rssfeeds/13352306.cms',
  },
  { name: 'Mint Technology', url: 'https://www.livemint.com/rss/technology' },
  {
    name: 'Business Standard IT',
    url: 'https://www.business-standard.com/rss/technology-10615.rss',
  },
  {
    name: 'Hindu BusinessLine Technology',
    url: 'https://www.thehindubusinessline.com/info-tech/?service=rss',
  },
  { name: 'Inc42 Startups', url: 'https://inc42.com/feed/' },
  { name: 'YourStory Technology', url: 'https://yourstory.com/feed' },
  {
    name: 'Moneycontrol Tech',
    url: 'https://www.moneycontrol.com/rss/technology.xml',
  },
  // Global GCC/Shared Services
  { name: 'NASSCOM Community RSS', url: 'https://nasscom.in/feed' },
  { name: 'HfS Research Blog', url: 'https://www.hfsresearch.com/blog/feed/' },
  { name: 'Everest Group Blog', url: 'https://www.everestgrp.com/feed' },
  {
    name: 'Gartner IT Research',
    url: 'https://www.gartner.com/en/newsroom/rss-feeds/releases',
  },
  // AI / Automation (relevant to GCC tech)
  {
    name: 'MIT Technology Review',
    url: 'https://www.technologyreview.com/feed/',
  },
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/ai/feed/' },
  { name: 'The Register', url: 'https://www.theregister.com/headlines.atom' },
  {
    name: 'ZDNet Enterprise',
    url: 'https://www.zdnet.com/topic/enterprise/rss.xml',
  },
];

async function test() {
  console.log('Testing candidate RSS feeds...\n');
  for (const s of candidates) {
    try {
      const feed = await parser.parseURL(s.url);
      console.log(`✅ ${s.name} → ${feed.items.length} items | ${s.url}`);
    } catch (e) {
      console.log(`❌ ${s.name} → ${e.message.substring(0, 50)}`);
    }
  }
}

test();
