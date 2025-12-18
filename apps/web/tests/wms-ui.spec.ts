import { test, expect } from '@playwright/test';

test.describe('Critical UI Flows (English)', () => {
  // 1. הגדרת שפה לאנגלית וזמן ריצה ארוך (למקרה שהדפדפן נקי)
  test.use({ locale: 'en-US', timezoneId: 'UTC' });
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    console.log('Starting Login Flow...');
    
    // התחברות
    await page.goto('http://localhost:5173/login');
    
    // מילוי פרטי התחברות
    await page.locator('input[type="email"]').fill('admin@logisnap.com');
    await page.locator('input[type="password"]').fill('123456');
    await page.locator('button[type="submit"]').click();
    
    // וידוא כניסה והמתנה לטעינת הניווט
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 30000 });

    // --- תיקון שפה: אכיפת אנגלית דרך ה-UI ---
    // בדיקה אם הממשק נטען בעברית (לפי ה-Snapshot שלך, הקומבובוקס מכיל "עברית")
    const hebrewSwitcher = page.getByRole('combobox').filter({ hasText: 'עברית' }).first();
    
    if (await hebrewSwitcher.isVisible()) {
        console.log('Detected Hebrew interface. Switching to English...');
        await hebrewSwitcher.click();
        // בחירה באופציה אנגלית (English)
        await page.getByRole('option', { name: /English|אנגלית/i }).first().click();
        
        // המתנה שהממשק יתעדכן (למשל שהמילה "Dashboard" תופיע)
        await expect(page.getByText('Dashboard')).toBeVisible({ timeout: 10000 });
        console.log('Switched to English successfully.');
    }
    // ----------------------------------------

    // ניקוי מצב (Hard Navigation) כדי להבטיח שהזיכרון נקי והשפה התעדכנה
    await page.goto('http://localhost:5173/'); 
    await page.waitForLoadState('networkidle');
    console.log('Login & Reset Complete');
  });

  test('Should create Wave without Crashing', async ({ page }) => {
    console.log('Navigating to Outbound Orders...');
    // ניווט לעמוד הזמנות יציאה
    await page.goto('http://localhost:5173/outbound');
    
    // וידוא שאנחנו בעמוד הנכון (באנגלית)
    await expect(page.getByRole('heading', { name: /Outbound/i }).first()).toBeVisible({ timeout: 15000 });

    // 1. פתיחת החלונית
    // המתנה שהטבלה תסיים להיטען (העלמות ה-Loader)
    await expect(page.locator('text=Loading...')).toBeHidden();

    // לחיצה על כפתור יצירת הזמנה
    // הלוקייטור תומך גם במקרה של חוסר בתרגום (outbound.createOrder)
    const newOrderBtn = page.getByRole('button', { name: /Create Order|New Order|outbound\.createOrder/i }).first();
    
    console.log('Clicking New Order Button...');
    await expect(newOrderBtn).toBeVisible();
    await newOrderBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // 2. מילוי כותרת
    const orderNum = `ORD-${Date.now()}`;
    await dialog.locator('input[name="order_number"]').fill(orderNum); 
    
    // מילוי תאריך (חובה)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await dialog.locator('input[type="date"]').fill(dateStr);

    // 3. בחירת לקוח (חובה לבצע ראשון - גורם לאיפוס שורות!)
    console.log('Selecting Customer...');
    const combos = dialog.getByRole('combobox');
    
    // אינדקס 0: לקוח (Customer)
    await combos.nth(0).click(); 
    await page.waitForTimeout(200); // אנימציית פתיחה
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    
    // קריטי: המתנה לאיפוס השורות שקורה ב-React בעת שינוי לקוח
    await page.waitForTimeout(500);

    // 4. מילוי השורה הראשונה (הקיימת)
    // הערה: הטופס נטען עם שורה אחת ריקה, לכן לא לוחצים על Add Item
    
    // מיפוי משוער של הקומבובוקסים בטופס כרגע:
    // 0: Customer (מולא)
    // 1: Order Type
    // 2: Priority
    // 3: Product (בשורה הראשונה)
    // 4: UOM (בשורה הראשונה)

    console.log('Filling Product Line...');
    
    // מילוי מוצר (אינדקס 3)
    // מוודאים שהאלמנט קיים לפני הלחיצה
    await expect(combos.nth(3)).toBeVisible();
    await combos.nth(3).click();
    
    // בחירת האופציה הראשונה הזמינה
    await expect(page.getByRole('option').first()).toBeVisible();
    await page.getByRole('option').first().click();

    // מילוי יחידה - UOM (אינדקס 4)
    await combos.nth(4).click();
    await expect(page.getByRole('option').first()).toBeVisible();
    await page.getByRole('option').first().click();

    // מילוי כמות
    await dialog.locator('input[type="number"]').first().fill('5');

    // 5. שמירה
    const submitButton = dialog.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    
    // וידוא סגירה של הדיאלוג
    await expect(dialog).toBeHidden();
    console.log(`Order ${orderNum} Created Successfully`);

    // 6. יצירת גל (Wave)
    // ריענון לוודא שהטבלה מעודכנת
    await page.reload(); 
    await page.waitForLoadState('networkidle');
    
    // וידוא שהשורה קיימת בטבלה
    const row = page.getByRole('row', { name: orderNum });
    await expect(row).toBeVisible({ timeout: 10000 });
    
    // בחירת השורה (Check)
    await row.getByRole('checkbox').check();
    
    // לחיצה על Create Wave
    console.log('Creating Wave...');
    await page.getByRole('button', { name: /Create Wave|Wave|outbound\.actions\.createWave/i }).click();
    
    // 7. בדיקה סופית שהניווט קיים (המערכת לא קרסה)
    await expect(page.getByRole('navigation')).toBeVisible();
    console.log('Test Completed Successfully');
  });
});