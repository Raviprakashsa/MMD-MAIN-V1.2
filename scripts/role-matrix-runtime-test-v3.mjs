/* global console, URLSearchParams */
import { request, chromium } from '@playwright/test';

const base = 'http://localhost:3000';
const users = [
  { role: 'SUPER_ADMIN', email: 'admin@magnuscopo.com', password: 'Admin123!' },
  { role: 'ADMIN', email: 'admin@magnuscopo.com', password: 'Admin123!' },
  { role: 'COORDINATOR', email: 'manjunath@magnuscopo.com', password: 'Coordinator123!' },
  { role: 'RECRUITER', email: 'rahul@magnuscopo.com', password: 'Recruiter123!' },
  { role: 'SCRAPER', email: 'scraper@magnuscopo.com', password: 'Scraper123!' },
];

const routes = ['/dashboard','/dashboard/admin','/dashboard/settings','/dashboard/companies','/dashboard/candidates','/dashboard/leads','/dashboard/reports','/dashboard/users'];

async function createAuthedContext(email, password) {
  const api = await request.newContext({ baseURL: base });
  const csrfRes = await api.get('/api/auth/csrf');
  const csrfJson = await csrfRes.json();
  const csrfToken = csrfJson?.csrfToken;
  if (!csrfToken) throw new Error('No csrf token');

  const form = new URLSearchParams();
  form.set('email', email);
  form.set('password', password);
  form.set('csrfToken', csrfToken);
  form.set('callbackUrl', '/dashboard');
  form.set('json', 'true');

  await api.post('/api/auth/callback/credentials', {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data: form.toString(),
  });

  const state = await api.storageState();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: state });
  const page = await context.newPage();
  return { browser, context, page };
}

const out = [];
for (const u of users) {
  const row = { role: u.role, email: u.email, login: 'FAIL', routes: {} };
  let browser;
  try {
    const authed = await createAuthedContext(u.email, u.password);
    browser = authed.browser;
    const page = authed.page;

    await page.goto(base + '/api/auth/session', { waitUntil: 'domcontentloaded' });
    const sessionText = await page.textContent('body');
    row.login = sessionText && sessionText.includes('"email":"' + u.email + '"') ? 'PASS' : 'FAIL';

    for (const route of routes) {
      const t0 = Date.now();
      await page.goto(base + route, { waitUntil: 'domcontentloaded' });
      const ms = Date.now() - t0;
      const finalUrl = page.url();
      const body = ((await page.textContent('body')) || '').toLowerCase();
      const redirectLogin = finalUrl.includes('/login?callbackUrl=');
      const forbidden = finalUrl.includes('/forbidden') || body.includes('403 - forbidden') || body.includes('access denied') || body.includes('you do not have permission');
      row.routes[route] = { ms, result: redirectLogin ? 'REDIRECT_LOGIN' : forbidden ? 'FORBIDDEN' : 'OK', finalUrl };
    }

    const perf = {};
    for (const r of ['/dashboard','/dashboard/companies','/dashboard/candidates','/dashboard/requirements','/dashboard/reports']) {
      const c0 = Date.now();
      await page.goto(base + r, { waitUntil: 'domcontentloaded' });
      const cold = Date.now() - c0;
      const w0 = Date.now();
      await page.goto(base + r, { waitUntil: 'domcontentloaded' });
      const warm = Date.now() - w0;
      perf[r] = { coldMs: cold, warmMs: warm, deltaMs: cold - warm };
    }
    row.performance = perf;

  } catch (e) {
    row.error = String(e?.message || e);
  }
  out.push(row);
  if (browser) await browser.close();
}

console.log(JSON.stringify(out, null, 2));
