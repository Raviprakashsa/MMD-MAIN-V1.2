/* global URLSearchParams, console, process */
import { request } from '@playwright/test';

const base = 'http://localhost:3000';

async function run(email, password) {
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

  const r = await api.get('/api/auth/session');
  const txt = await r.text();
  console.log('SESSION:', txt);
  const state = await api.storageState();
  console.log('STORAGE STATE:', JSON.stringify(state.cookies, null, 2));
  // Debug endpoint removed; rely on session and storage state checks above.
  const dash = await api.get('/dashboard');
  console.log('/dashboard status:', dash.status);
  const dashText = await dash.text();
  console.log('/dashboard body snippet:', dashText.slice(0, 1200));
  const lowered = dashText.toLowerCase();
  const hasForbidden = lowered.includes('403 - forbidden') || lowered.includes('access denied') || lowered.includes('you do not have permission');
  console.log('/dashboard contains forbidden:', hasForbidden);
  if (hasForbidden) {
    const idx = lowered.indexOf('403 - forbidden') >= 0 ? lowered.indexOf('403 - forbidden') : lowered.indexOf('access denied');
    console.log('context:', dashText.slice(Math.max(0, idx - 80), idx + 120));
  }
}

run('admin@magnuscopo.com','Admin123!').catch((err) => { console.error(err); process.exit(1) })
