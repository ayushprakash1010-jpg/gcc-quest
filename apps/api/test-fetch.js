async function run() {
  try {
    const res = await fetch('https://rss.app/feeds/I9Q7q4d1xiQV8zag.xml', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    console.log(res.status);
    const text = await res.text();
    console.log(text.substring(0, 500));
  } catch (e) {
    console.error(e);
  }
}
run();
