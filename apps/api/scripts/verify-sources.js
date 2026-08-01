const Parser = require('rss-parser');
const parser = new Parser({ timeout: 8000 });

const sources = [
  {
    name: 'TechCrunch Enterprise',
    url: 'https://techcrunch.com/category/enterprise/feed/',
  },
  {
    name: 'ET IT/ITES News',
    url: 'https://economictimes.indiatimes.com/industry/rssfeeds/13352306.cms',
  },
  {
    name: 'ET CIO GCC News',
    url: 'https://ciso.economictimes.indiatimes.com/rss/topstories',
  },
  { name: 'Mint Technology', url: 'https://www.livemint.com/rss/technology' },
  {
    name: 'The Hindu BusinessLine Tech',
    url: 'https://www.thehindubusinessline.com/info-tech/?service=rss',
  },
  { name: 'Inc42', url: 'https://inc42.com/feed/' },
  { name: 'YourStory Technology', url: 'https://yourstory.com/feed' },
  {
    name: 'MIT Technology Review',
    url: 'https://www.technologyreview.com/feed/',
  },
  {
    name: 'ZDNet Enterprise',
    url: 'https://www.zdnet.com/topic/enterprise/rss.xml',
  },
  {
    name: 'The Register – Enterprise',
    url: 'https://www.theregister.com/headlines.atom',
  },
];

async function test() {
  let working = 0,
    broken = 0;
  for (const s of sources) {
    try {
      const feed = await parser.parseURL(s.url);
      console.log(`✅ ${s.name} → ${feed.items.length} articles`);
      working++;
    } catch (e) {
      console.log(`❌ ${s.name} → BROKEN: ${e.message.substring(0, 60)}`);
      broken++;
    }
  }
  console.log(`\nResult: ${working} working, ${broken} broken`);
}

test();
