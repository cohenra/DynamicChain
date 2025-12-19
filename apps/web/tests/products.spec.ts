import { test, expect } from '@playwright/test';

test.describe('Product Management (English)', () => {
  test.use({ locale: 'en-US', timezoneId: 'UTC' });
  test.setTimeout(90000);

  // --- Reusable Setup ---
  test.beforeEach(async ({ page }) => {
    console.log('Setup: Login & Language Check...');
    await page.goto('http://localhost:5173/login');
    await page.locator('input[type="email"]').fill('admin@logisnap.com');
    await page.locator('input[type="password"]').fill('123456');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 30000 });

    // Hard Navigation & Language Enforcement
    await page.goto('http://localhost:5173/'); 
    await page.waitForLoadState('networkidle');

    const hebrewSwitcher = page.getByRole('combobox').filter({ hasText: 'עברית' }).first();
    if (await hebrewSwitcher.isVisible()) {
        await hebrewSwitcher.click();
        await page.getByRole('option', { name: /English|אנגלית/i }).first().click();
        await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    }
  });

  test('Should create a New Product successfully', async ({ page }) => {
    console.log('Navigating to Products...');
    await page.getByRole('navigation').getByRole('button', { name: /Products|מוצרים/i }).click();
    
    // Validate Page
    await expect(page.getByRole('heading', { name: /Products/i }).first()).toBeVisible();
    await expect(page.locator('text=Loading...')).toBeHidden();

    // Open Dialog
    await page.getByRole('button', { name: /Add Product|products.addProduct/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill Form
    const sku = `SKU-${Date.now()}`;
    console.log(`Creating Product: ${sku}`);
    
    await page.locator('input[name="sku"]').fill(sku);
    await page.locator('input[name="name"]').fill(`Test Product ${sku}`);
    
    // Select Depositor (Combobox 0)
    await page.getByRole('combobox').nth(0).click();
    await page.getByRole('option').first().click();

    // Select Base Unit (Combobox 1)
    await page.getByRole('combobox').nth(1).click();
    // Assuming 'Each' or similar is available, pick first
    await page.getByRole('option').first().click();

    // Save
    await page.getByRole('button', { name: /Save Product|Save/i }).click();

    // Validation
    await expect(page.getByRole('dialog')).toBeHidden();
    
    // Verify in table (Reload to be safe, though React Query should handle it)
    await expect(page.getByRole('cell', { name: sku })).toBeVisible({ timeout: 10000 });
    console.log('Product Created Successfully');
  });
});