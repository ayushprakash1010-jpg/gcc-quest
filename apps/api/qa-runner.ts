import { PrismaClient } from '@prisma/client';
import * as assert from 'assert';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:4000/api/v1';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runQA() {
  console.log('--- STARTING COMPREHENSIVE QA PASS ---');
  let token = '';

  // 1. Database connection
  await prisma.$connect();
  console.log('✅ DB Connected');

  // Seed an admin user if not exists
  const hashedPassword = 'testpassword'; // in real db it should be hashed, but we can just use the auth endpoint directly if we hit the actual seed
  // For QA, let's just use the seed script user
  const adminEmail = 'admin@gccquest.com';
  const adminPassword = 'admin123'; // From seed

  // 2. Authentication & Rate Limiting
  console.log('Testing Authentication & Security Headers...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });

  assert(loginRes.ok, 'Login failed');
  const loginData = await loginRes.json();
  token = loginData.data.accessToken;
  assert(token, 'No access token received');

  // Check headers
  const helmetCsp = loginRes.headers.get('content-security-policy');
  assert(helmetCsp, 'Helmet CSP header missing');
  console.log('✅ Authentication & Helmet Headers Verified');

  // Test Rate Limiter on login (5 attempts / 15 min)
  console.log('Testing Rate Limiter on Login...');
  let rateLimited = false;
  for (let i = 0; i < 6; i++) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'wrong@test.com', password: 'wrong' }),
    });
    if (res.status === 429) {
      rateLimited = true;
      break;
    }
  }
  assert(
    rateLimited,
    'Rate limiter did not block after 5 failed login attempts',
  );
  console.log('✅ Rate Limiting Verified');

  // 3. Discovery: Create Source
  console.log('Testing Source Creation & Discovery...');
  const testUrl = 'https://ciso.economictimes.indiatimes.com/rss/topstories';
  let sourceObj = await prisma.source.findUnique({ where: { url: testUrl } });

  if (!sourceObj) {
    const sourceRes = await fetch(`${API_URL}/sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'ET CIO RSS',
        url: testUrl,
        type: 'RSS',
        category: 'NEWS',
        crawlFrequency: 'HOURLY',
      }),
    });
    const source = await sourceRes.json();
    if (!sourceRes.ok) {
      console.log('Source Creation Failed:', source);
    }
    sourceObj = source.data ? source.data : source;
  }

  assert(sourceObj?.id, 'Source ID missing');
  console.log(`✅ Source Ready: ${sourceObj.id}`);

  // 4. Trigger Crawl
  const crawlRes = await fetch(`${API_URL}/sources/${sourceObj.id}/crawl`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(crawlRes.ok, 'Manual crawl failed');
  console.log('✅ Manual Crawl Triggered');

  // Wait for articles to be crawled
  console.log('Waiting for Crawler to process... (Polling DB)');
  let articlesFound = false;
  let articleId = '';
  for (let i = 0; i < 30; i++) {
    const articles = await prisma.article.findMany({
      where: { sourceId: sourceObj.id },
    });
    if (articles.length > 0) {
      articlesFound = true;
      articleId = articles[0].id;
      break;
    }
    await sleep(2000);
  }
  assert(articlesFound, 'No articles were crawled within 60s');
  console.log(`✅ Articles Crawled Successfully. Found article: ${articleId}`);

  // 5. Wait for Analysis
  console.log('Waiting for AI Analysis to complete...');
  let analysisFound = false;
  for (let i = 0; i < 30; i++) {
    const analysis = await prisma.articleAnalysis.findUnique({
      where: { articleId },
    });
    if (analysis) {
      analysisFound = true;
      assert(analysis.summary.length > 10, 'Summary is empty');
      assert(analysis.gccCategory, 'Category is missing');
      break;
    }
    await sleep(3000);
  }
  assert(analysisFound, 'Analysis did not complete within 90s');
  console.log('✅ AI Analysis Completed');

  // 6. Wait for Content Generation
  console.log('Waiting for Content Draft Generation...');
  let draftFound = false;
  let draftId = '';
  for (let i = 0; i < 30; i++) {
    const drafts = await prisma.contentDraft.findMany({ where: { articleId } });
    if (drafts.length > 0) {
      draftFound = true;
      draftId = drafts[0].id;
      break;
    }
    await sleep(3000);
  }
  assert(draftFound, 'Content Draft did not generate within 90s');
  console.log(`✅ Content Draft Generated: ${draftId}`);

  // 7. Review and Approve Draft
  console.log('Approving Draft...');
  const approveRes = await fetch(
    `${API_URL}/content/drafts/${draftId}/status`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: 'APPROVED' }),
    },
  );
  if (!approveRes.ok) {
    const errorBody = await approveRes.text();
    console.log('Approval Failed:', errorBody);
  }
  assert(approveRes.ok, 'Draft approval failed');
  console.log('✅ Draft Approved');

  // 8. Analytics Check
  console.log('Testing Analytics Endpoints...');
  const overviewRes = await fetch(`${API_URL}/analytics/overview?period=30d`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(overviewRes.ok, 'Analytics overview failed');
  const overviewBody = await overviewRes.json();
  const overview = overviewBody.data || overviewBody;
  assert(overview.totalArticles >= 1, 'Analytics totalArticles mismatch');
  console.log('✅ Analytics Overview Passed');

  console.log('--- ALL QA TESTS PASSED ---');
  process.exit(0);
}

runQA().catch((err) => {
  console.error('❌ QA Test Failed:', err);
  process.exit(1);
});
