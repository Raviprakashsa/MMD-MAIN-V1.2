/* global console */
import { chromium } from '@playwright/test';

const base = 'http://localhost:3000';
const users = [
  { role: 'SUPER_ADMIN', email: 'admin@magnuscopo.com', password: 'Admin123!' },
  { role: 'ADMIN', email: 'admin@magnuscopo.com', password: 'Admin123!' },
  { role: 'COORDINATOR', email: 'manjunath@magnuscopo.com', password: 'Manjunath123!' },
  { role: 'RECRUITER', email: 'rahul@magnuscopo.com', password: 'Rahul123!' },
  { role: 'SCRAPER', email: 'scraper@magnuscopo.com', password: 'Scraper123!' },
];

const routes = ['/dashboard','/dashboard/admin','/dashboard/settings','/dashboard/companies','/dashboard/candidates','/dashboard/leads','/dashboard/reports','/dashboard/users'];

async function login(page, email, password) {
  await page.goto(base + '/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const emailLoc = page.locator('input[name="email"], input[type="email"], input[placeholder*="mail" i]').first();
  const passLoc = page.locator('input[name="password"], input[type="password"], input[placeholder*="password" i]').first();

  await emailLoc.waitFor({ state: 'visible', timeout: 10000 });
  await passLoc.waitFor({ state: 'visible', timeout: 10000 });

  await emailLoc.fill(email);
  await passLoc.fill(password);

  const submit = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login"), button:has-text("Sign in")').first();
  if (await submit.isVisible().catch(() => false)) {
    await Promise.all([
      page.waitForLoadState('networkidle').catch(() => {}),
      submit.click()
    ]);
  } else {
    await passLoc.press('Enter');
    await page.waitForLoadState('networkidle').catch(() => {});
  }

  await page.waitForTimeout(1000);
  return page.url();
}

const out = [];
for (const u of users) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const row = { role: u.role, email: u.email, login: 'FAIL', loginUrl: '', routes: {} };

  try {
    const after = await login(page, u.email, u.password);
    row.loginUrl = after;
    row.login = after.includes('/dashboard') ? 'PASS' : 'FAIL';

    for (const route of routes) {
      const t0 = Date.now();
      await page.goto(base + route, { waitUntil: 'domcontentloaded' });
      const ms = Date.now() - t0;
      const finalUrl = page.url();
      const text = ((await page.textContent('body')) || '').toLowerCase();
        const forbidden = finalUrl.includes('/forbidden') || text.includes('403 - forbidden') || text.includes('access denied') || text.includes('you do not have permission');
      const loggedOut = finalUrl.includes('/login?callbackUrl=');
      row.routes[route] = { ms, result: loggedOut ? 'REDIRECT_LOGIN' : forbidden ? 'FORBIDDEN' : 'OK', finalUrl };
    }
  } catch (e) {
    row.error = String(e?.message || e);
  }

  out.push(row);
  await browser.close();
}

console.log(JSON.stringify(out, null, 2));
