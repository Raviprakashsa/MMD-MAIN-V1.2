
import { test, expect } from '@playwright/test';

// Define the critical routes to test
const ROUTES = [
    { path: '/dashboard', title: 'Dashboard' },
    { path: '/dashboard/companies', title: 'Companies' },
    // { path: '/dashboard/contacts', title: 'Contacts' }, // Pending Implementation
    { path: '/dashboard/candidates', title: 'Candidates' },
    // { path: '/dashboard/jobs', title: 'Jobs' }, // Pending Implementation
    { path: '/dashboard/leads', title: 'Leads' },
    { path: '/dashboard/reports', title: 'Reports' },
];

test.describe('Dashboard Smoke Tests', () => {
    // Global login before all tests in this describe block
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000/login');
        await page.fill('input[type="email"]', 'admin@magnuscopo.com');
        await page.fill('input[type="password"]', 'Admin123!');
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:3000/dashboard');
    });

    for (const route of ROUTES) {
        test(`should load ${route.title} page correctly`, async ({ page }) => {
            console.log(`Navigating to ${route.path}...`);

            const response = await page.goto(`http://localhost:3000${route.path}`);

            // 1. Verify HTTP Status
            expect(response?.status()).toBe(200);

            // 2. Verify Page Title/Header presence
            // Most pages use an <h1> for the title, so we check for that.
            // We accept either the exact title or just the presence of a main header.
            await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

            // 3. Verify no critical error overlays
            const errorOverlay = page.locator('text=Application Error');
            await expect(errorOverlay).toBeHidden();

            console.log(`✅ ${route.title} loaded successfully.`);
        });
    }
});
