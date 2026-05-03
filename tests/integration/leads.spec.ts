import { test, expect } from '@playwright/test';

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'admin@magnuscopo.com';
const TEST_PASSWORD = 'Admin123!';

test.describe('Lead Lifecycle', () => {
    test.beforeEach(({ page }) => {
        page.on('console', msg => console.log(`[BROWSER]: ${msg.text()}`));
        page.on('pageerror', err => console.error(`[BROWSER ERROR]: ${err.message}`));
    });

    test('should create, move, and persist a lead', async ({ page }) => {
        // 1. Login
        console.log('Logging in...');
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', TEST_EMAIL);
        await page.fill('input[type="password"]', TEST_PASSWORD);
        await page.click('button[type="submit"]');

        // Check for error messages if navigation doesn't happen quickly
        const errorLocator = page.locator('.bg-\\[rgba\\(239\\,68\\,68\\,0\\.08\\)\\]');

        try {
            await expect(page).toHaveURL(`${BASE_URL}/dashboard`, { timeout: 15000 });
            console.log('Login successful');
        } catch (e) {
            const errorMsg = await errorLocator.textContent().catch(() => 'No visible error message');
            console.error(`Login failed. Error message on page: ${errorMsg}`);
            throw e;
        }

        // 2. Navigate to Leads
        console.log('Navigating to Leads...');
        await page.goto(`${BASE_URL}/dashboard/leads`);
        try {
            await expect(page.getByRole('heading', { name: /Leads Management/i })).toBeVisible({ timeout: 10000 });
        } catch (e) {
            console.error(`Url: ${page.url()}`);
            console.error('Text not found. Printing page content snippet:');
            const body = await page.innerHTML('body');
            console.error(body.slice(0, 500));
            await page.screenshot({ path: 'leads-fail-nav.png' });
            throw e;
        }

        // 3. Create Lead
        console.log('Creating Lead...');
        try {
            await page.click("button:has-text('New Lead')");
        } catch (e) {
            await page.screenshot({ path: 'leads-fail-create-btn.png' });
            const html = await page.innerHTML('.flex.gap-2'); // Should contain the button
            console.error('Button area content:', html);
            throw e;
        }

        const companyName = `Test Corp ${Date.now()}`;
        await page.selectOption('#create-source', 'LinkedIn');
        await page.fill('#create-company', companyName);
        await page.selectOption('#create-sector', 'IT');
        await page.fill('#create-confidence', '90');
        await page.click("button:has-text('Add Lead')");

        // Verify creation
        console.log('Verifying creation...');
        const row = page.locator('tr', { hasText: companyName }).first();
        await expect(row).toBeVisible({ timeout: 10000 });

        // 4. Update status to CONTACTED using Edit modal (current UI flow)
        console.log('Updating status to CONTACTED...');
        await row.locator('button[title="View lead"]').click();
        await expect(page.getByRole('button', { name: 'Edit Lead' })).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: 'Edit Lead' }).click();
        await page.selectOption('#edit-status', 'CONTACTED');
        await page.click("button:has-text('Save Changes')");
        await expect(page.locator('text=Lead Updated')).toBeVisible({ timeout: 10000 });

        // 5. Verify Persistence
        console.log('Reloading to verify persistence...');
        await page.reload();

        const reloadedRow = page.locator('tr', { hasText: companyName }).first();
        await expect(reloadedRow).toBeVisible({ timeout: 10000 });
        await expect(reloadedRow).toContainText('Contacted');

        // Open edit again to verify persisted status in form controls
        console.log('Verifying status in edit modal...');
        await reloadedRow.locator('button[title="View lead"]').click();
        await page.getByRole('button', { name: 'Edit Lead' }).click();
        await expect(page.locator('#edit-status')).toHaveValue('CONTACTED');
        console.log('✅ Integration Test Passed!');
    });
});
