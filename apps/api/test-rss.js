const Parser = require('rss-parser');
const parser = new Parser({
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
});

async function run() {
  try {
    const feed = await parser.parseURL(
      'https://morss.it/https://analyticsindiamag.com/feed/',
    );
    console.log('Success Morss:', feed.items.length);
    if (feed.items.length > 0) {
      console.log(Object.keys(feed.items[0]));
      console.log('Has content?', !!feed.items[0].content);
      console.log('Has snippet?', !!feed.items[0].contentSnippet);
    }
  } catch (e) {
    console.error('Error with morss:', e.message);
  }
}

run();
