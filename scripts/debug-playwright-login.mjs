import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const EMAIL = 'admin@magnuscopo.com';
const PASSWORD = 'Admin123!';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('[PAGE CONSOLE]', msg.type(), msg.text()));
  page.on('request', req => {
    if (req.url().includes('/api/auth/')) {
      console.log('[REQUEST] ', req.method(), req.url());
      try { console.log('[REQUEST POST]', req.postData()); } catch (e) {}
    }
  });
  page.on('requestfailed', req => {
    if (req.url().includes('/api/auth/')) console.log('[REQUEST FAILED]', req.url(), req.failure());
  });
  page.on('response', async res => {
    if (res.url().includes('/api/auth/')) {
      console.log('[RESPONSE] ', res.status(), res.url());
      try {
        const txt = await res.text();
        console.log('[RESPONSE BODY]', txt);
      } catch (e) { console.log('[RESPONSE BODY] <unavailable>'); }
    }
  });

  await page.goto(BASE + '/login');
  // log form attributes
  try {
    const formInfo = await page.evaluate(() => {
      const f = document.querySelector('form');
      if (!f) return null;
      return { action: f.getAttribute('action'), method: f.getAttribute('method') };
    });
    console.log('Login form:', formInfo);
  } catch (e) { console.log('Failed to read form info', e.message); }
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');

  // wait and capture any auth-related network activity
  await page.waitForTimeout(5000);

  console.log('Final URL:', page.url());
  const body = await page.content();
  console.log('Page body snippet:', body.slice(0, 1000));

  await browser.close();
  process.exit(0);
})();
