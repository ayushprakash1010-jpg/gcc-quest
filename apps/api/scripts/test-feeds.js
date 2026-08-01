const Parser = require('rss-parser');
const parser = new Parser({ timeout: 8000 });

const sources = [
  { name: 'NASSCOM Blog', url: 'https://community.nasscom.in/blogs/rss' },
  {
    name: 'ET CIO GCC News',
    url: 'https://ciso.economictimes.indiatimes.com/rss/topstories',
  },
  {
    name: 'ET IT/ITES News',
    url: 'https://economictimes.indiatimes.com/tech/ites/rssfeeds/24082305.cms',
  },
  { name: 'NASSCOM Insights (hnrss)', url: 'https://hnrss.org/newest' },
  { name: 'Analytics India Mag', url: 'https://analyticsindiamag.com/feed/' },
  { name: 'Test Source (HN)', url: 'https://news.ycombinator.com/rss' },
  {
    name: 'TechCrunch Enterprise',
    url: 'https://techcrunch.com/category/enterprise/feed/',
  },
];

async function test() {
  for (const s of sources) {
    try {
      const feed = await parser.parseURL(s.url);
      console.log(`✅ ${s.name} → ${feed.items.length} items`);
    } catch (e) {
      console.log(`❌ ${s.name} → BROKEN: ${e.message.substring(0, 60)}`);
    }
  }
}

test();
