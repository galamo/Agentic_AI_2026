import { test, expect } from '@playwright/test';

// Random username generated once per test run
const randomSuffix = Math.floor(Math.random() * 90_000) + 10_000;
const userName = `gal_${randomSuffix}`;
const phone = '0505050505';

// Use tomorrow to ensure no existing bookings block the 12:00–13:00 slot
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const bookingDate = tomorrow.toISOString().split('T')[0]; // "YYYY-MM-DD"

test('book Court 4 at 12:00–13:00, validate confirmation, then delete the booking', async ({ page }) => {

  // ─── 1. Go to the Courts page ─────────────────────────────────────────────
  await page.goto('/courts');
  await page.waitForLoadState('networkidle');

  // ─── 2. Click "Book Now" on Court 4 (identified by its unique full name) ──
  // Court 4 fullName is "Teal Hard Court" — unique on the page
  const court4Card = page
    .locator('div')
    .filter({ hasText: 'Teal Hard Court' })
    .filter({ has: page.getByRole('button', { name: 'Book Now' }) })
    .last();

  await court4Card.getByRole('button', { name: 'Book Now' }).click();

  // ─── 3. Assert the booking dialog opened for Court 4 ──────────────────────
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Book Court 4');

  // ─── 4. Set Date to tomorrow (avoids conflicts with today's bookings) ────
  await dialog.getByLabel('Date').fill(bookingDate);

  // ─── 5. Set Start Time to 12:00 ──────────────────────────────────────────
  // MUI TextField[select] renders a div[role="combobox"] linked to the label
  await dialog.getByLabel('Start Time').click();
  // After clicking, MUI opens a ul[role="listbox"] in the page (not inside dialog DOM-wise)
  await page.getByRole('option', { name: '12:00', exact: true }).click();

  // ─── 6. Set End Time to 13:00 ─────────────────────────────────────────────
  await dialog.getByLabel('End Time').click();
  await page.getByRole('option', { name: '13:00', exact: true }).click();

  // ─── 6. Fill in Name and Phone ────────────────────────────────────────────
  await dialog.getByLabel('Your Name').fill(userName);
  await dialog.getByLabel('Phone Number').fill(phone);

  // ─── 7. Submit the booking ────────────────────────────────────────────────
  await dialog.getByRole('button', { name: 'Confirm Booking' }).click();

  // ─── 8. Validate the success confirmation screen ──────────────────────────
  await expect(dialog).toContainText('Booking Confirmed!', { timeout: 10_000 });
  await expect(dialog).toContainText(userName);
  await expect(dialog).toContainText('Court 4');
  await expect(dialog).toContainText('12:00');
  await expect(dialog).toContainText('13:00');

  // ─── 9. Close the dialog ──────────────────────────────────────────────────
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).not.toBeVisible();

  // ─── 10. Navigate to the Bookings page ────────────────────────────────────
  await page.goto('/bookings');
  await page.waitForLoadState('networkidle');

  // ─── 11. Find our booking row and validate it ─────────────────────────────
  const bookingRow = page.locator('tr').filter({ hasText: userName });
  await expect(bookingRow).toBeVisible({ timeout: 8_000 });
  await expect(bookingRow).toContainText('Court 4');
  await expect(bookingRow).toContainText('12:00');

  // ─── 12. Delete the booking (window.confirm is accepted automatically) ────
  page.once('dialog', async (dlg) => {
    expect(dlg.message()).toContain('Cancel this booking?');
    await dlg.accept();
  });

  await bookingRow.getByRole('button', { name: 'Cancel booking' }).click();

  // ─── 13. Confirm the row is removed from the table ────────────────────────
  await expect(bookingRow).not.toBeVisible({ timeout: 8_000 });
});
