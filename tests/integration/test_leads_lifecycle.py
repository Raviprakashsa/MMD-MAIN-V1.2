import os
import time
from playwright.sync_api import sync_playwright, expect
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

BASE_URL = "http://localhost:3000"
# Use a test user if available, or admin creds
TEST_EMAIL = "admin@magnuscopo.com" 
TEST_PASSWORD = "Admin123!"

def test_lead_lifecycle():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("🚀 Starting Lead Lifecycle Test...")

        # 1. Login
        print("🔑 Logging in...")
        page.goto(f"{BASE_URL}/login")
        page.fill('input[type="email"]', TEST_EMAIL)
        page.fill('input[type="password"]', TEST_PASSWORD)
        page.click('button[type="submit"]')
        
        # Wait for dashboard
        page.wait_for_url(f"{BASE_URL}/dashboard")
        print("✅ Login Successful")

        # 2. Navigate to Leads
        print("📂 Navigating to Leads...")
        page.goto(f"{BASE_URL}/dashboard/leads")
        expect(page.get_by_role("heading", name="Leads Management")).to_be_visible()

        # 3. Create New Lead
        print("➕ Creating New Lead...")
        page.click("button:has-text('New Lead')")
        
        test_company = f"Test Corp {int(time.time())}"
        page.select_option('#create-source', "LinkedIn")
        page.fill('#create-company', test_company)
        page.select_option('#create-sector', "IT")
        page.fill('#create-confidence', "85")
        page.click("button:has-text('Add Lead')")

        # Verify lead appears in table
        print(f"✅ Verifying {test_company} appears in leads table...")
        lead_row = page.locator('tr', has_text=test_company).first
        expect(lead_row).to_be_visible()

        # 4. Move to CONTACTED via Edit modal (current UI flow)
        print("✋ Updating Lead status to CONTACTED...")
        lead_row.locator('button[title="View lead"]').click()
        page.get_by_role("button", name="Edit Lead").click()
        page.select_option('#edit-status', "CONTACTED")
        page.click("button:has-text('Save Changes')")
        expect(page.get_by_text("Lead Updated")).to_be_visible()

        # 5. Reload and Verify Persistence
        print("🔄 Reloading to verify persistence...")
        page.reload()

        print("🔍 Verifying status persisted...")
        persisted_row = page.locator('tr', has_text=test_company).first
        expect(persisted_row).to_be_visible()
        expect(persisted_row).to_contain_text("Contacted")

        persisted_row.locator('button[title="View lead"]').click()
        page.get_by_role("button", name="Edit Lead").click()
        expect(page.locator('#edit-status')).to_have_value("CONTACTED")
        
        print("✅ Lifecycle Test Passed!")
        
        browser.close()

if __name__ == "__main__":
    test_lead_lifecycle()
