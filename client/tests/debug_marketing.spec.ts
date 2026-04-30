import { test, expect } from '@playwright/test';

test('Marketing Management Page Loads', async ({ page }) => {
  // Go to the login page first
  await page.goto('http://localhost:5173/login');
  
  // Fill in login credentials (assuming standard dev ones)
  // Adjust these if needed, but usually it's admin/admin or similar
  // Let's try to just go to the dashboard if it's already logged in or has no auth for dev
  await page.goto('http://localhost:5173/dashboard/marketing-management');
  
  // Wait for a bit to see if there's a crash
  await page.waitForTimeout(2000);
  
  // Check if the page contains the title
  const title = page.locator('h1:has-text("Marketing Management")');
  await expect(title).toBeVisible();
});
