/* global console */
import { chromium } from '@playwright/test';

const base = 'http://localhost:3000';
const roles = [
  { role: 'SCRAPER', email: 'scraper@magnuscopo.com', password: 'Scraper123!' },
  { role: 'COORDINATOR', email: 'manjunath@magnuscopo.com', password: 'Coordinator123!' },
  { role: 'ADMIN', email: 'admin@magnuscopo.com', password: 'Admin123!' },
  { role: 'RECRUITER', email: 'rahul@magnuscopo.com', password: 'Recruiter123!' },
];

const checks = [
  '/dashboard',
  '/dashboard/settings',
  '/dashboard/admin',
  '/dashboard/companies',
  '/dashboard/candidates',
  '/dashboard/leads',
  '/dashboard/reports',
  '/dashboard/users',
];

const out = [];
for (const u of roles) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const row = { role: u.role, login: 'FAIL', routes: {} };
  try {
    await page.goto(base + '/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"], input[name="email"]', u.email);
    await page.fill('input[type="password"], input[name="password"]', u.password);
    await Promise.all([
      page.waitForLoadState('networkidle'),
      page.click('button[type="submit"], button:has-text("Sign"), button:has-text("Login")')
    ]);
    if (page.url().includes('/dashboard')) row.login = 'PASS';

    for (const route of checks) {
      const t0 = Date.now();
      await page.goto(base + route, { waitUntil: 'domcontentloaded' });
      const ms = Date.now() - t0;
      const url = page.url();
      const txt = (await page.textContent('body'))?.toLowerCase() || '';
      const forbidden = url.includes('/forbidden') || txt.includes('403 - forbidden') || txt.includes('access denied') || txt.includes('you do not have permission');
      row.routes[route] = { ms, outcome: forbidden ? 'FORBIDDEN' : 'OK', finalUrl: url };
    }
  } catch (e) {
    row.error = String(e.message || e);
  }
  out.push(row);
  await browser.close();
}

console.log(JSON.stringify(out, null, 2));
