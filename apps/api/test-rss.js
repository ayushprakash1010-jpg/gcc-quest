const Parser = require('rss-parser');
const parser = new Parser({
  xml2js: { strict: false },
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept:
      'application/rss+xml, application/xml, application/atom+xml, text/xml, text/html, */*',
  },
});

async function run() {
  try {
    const feed = await parser.parseURL('https://analyticsindiamag.com/feed/');
    console.log('Success:', feed.items.length);
  } catch (e) {
    console.error('Error with rss-parser:', e.message);
  }
}

run();
