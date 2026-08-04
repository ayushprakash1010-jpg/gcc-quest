const Parser = require('rss-parser');
const parser = new Parser(); // no strict: false

async function run() {
  try {
    const res = await fetch('https://rss.app/feeds/I9Q7q4d1xiQV8zag.xml', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const xml = await res.text();
    const feed = await parser.parseString(xml);
    console.log('Success default parser:', feed.items.length);
  } catch (e) {
    console.error('Error with default parser:', e.message);
  }
}

run();
