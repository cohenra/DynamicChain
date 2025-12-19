import { test, expect } from '@playwright/test';

test.describe('Inbound Operations (English)', () => {
  test.use({ locale: 'en-US', timezoneId: 'UTC' });
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    // (אותו קוד Setup בדיוק כמו בקבצים האחרים - אפשר להוציא לקובץ עזר בעתיד)
    console.log('Setup: Login & Language Check...');
    await page.goto('http://localhost:5173/login');
    await page.locator('input[type="email"]').fill('admin@logisnap.com');
    await page.locator('input[type="password"]').fill('123456');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 30000 });

    await page.goto('http://localhost:5173/'); 
    await page.waitForLoadState('networkidle');

    const hebrewSwitcher = page.getByRole('combobox').filter({ hasText: 'עברית' }).first();
    if (await hebrewSwitcher.isVisible()) {
        await hebrewSwitcher.click();
        await page.getByRole('option', { name: /English|אנגלית/i }).first().click();
        await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    }
  });

  test('Should create Inbound Order', async ({ page }) => {
    console.log('Navigating to Inbound...');
    // ניווט לתפריט Inbound (ייתכן ונקרא Inbound Orders או משהו דומה)
    await page.getByRole('navigation').getByRole('button', { name: /Inbound|הזמנות קבלה/i }).click();
    
    await expect(page.getByRole('heading', { name: /Inbound/i }).first()).toBeVisible();
    await expect(page.locator('text=Loading...')).toBeHidden();

    // Create Order
    await page.getByRole('button', { name: /Create Order|New Order/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const orderNum = `INB-${Date.now()}`;
    await dialog.locator('input[name="order_number"]').fill(orderNum);
    
    // Date
    const today = new Date().toISOString().split('T')[0];
    await dialog.locator('input[type="date"]').fill(today);

    // Select Supplier/Depositor (First Combobox)
    console.log('Selecting Supplier...');
    await dialog.getByRole('combobox').nth(0).click();
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500); // React rerender wait

    // Add Line Item
    console.log('Adding Line Item...');
    const combos = dialog.getByRole('combobox');
    
    // Product Select (Assuming index 2 or 3 depending on form layout - trial & error might be needed)
    // usually: Supplier -> Status -> Priority -> [Product] -> [UOM]
    // Let's try nth(3) like in Outbound, or scan for it
    await combos.nth(3).click();
    await expect(page.getByRole('option').first()).toBeVisible();
    await page.getByRole('option').first().click();

    // UOM Select
    await combos.nth(4).click();
    await page.getByRole('option').first().click();

    // Quantity
    await dialog.locator('input[type="number"]').first().fill('100');

    // Save
    await dialog.locator('button[type="submit"]').click();
    await expect(dialog).toBeHidden();

    // Verify
    await expect(page.getByRole('row', { name: orderNum })).toBeVisible({ timeout: 10000 });
    console.log(`Inbound Order ${orderNum} created successfully`);
  });
});