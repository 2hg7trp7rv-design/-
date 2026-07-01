import { expect, test } from '@playwright/test';

test.describe('visual guardrails', () => {
  test('home screen keeps the app-frame visual balance', async ({ page }) => {
    await page.goto('/#/');
    await expect(page.locator('#root')).toHaveScreenshot('home-mobile.png', {
      animations: 'disabled',
    });
  });

  test('game idle screen stays inside the mobile app viewport', async ({ page }) => {
    await page.goto('/#/game');
    await expect(
      page.getByRole('button', { name: /tap to start|タップしてスタート/i }),
    ).toBeVisible();
    await expect(page.locator('#root')).toHaveScreenshot('game-idle-mobile.png', {
      animations: 'disabled',
    });
  });
});
