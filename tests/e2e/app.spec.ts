import { expect, test } from '@playwright/test';

test.describe('MoguMogu mobile app flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/');
  });

  test('loads home, navigates to game, pauses and resumes without bottom navbar', async ({
    page,
  }) => {
    await expect(page.getByRole('button', { name: /play|遊ぶ/i })).toBeVisible();

    await page.getByRole('button', { name: /play|遊ぶ/i }).click();
    await expect(page.getByRole('button', { name: /pause|一時停止/i })).toBeVisible({
      timeout: 6_000,
    });
    await expect(page.getByRole('navigation')).toHaveCount(0);

    await page.getByRole('button', { name: /pause|一時停止/i }).click();
    await expect(page.getByText(/paused|一時停止/i)).toBeVisible();

    await page.getByRole('button', { name: /resume|続ける/i }).click();
    await expect(page.getByRole('button', { name: /pause|一時停止/i })).toBeVisible();
  });

  test('unknown routes show the branded not-found screen', async ({ page }) => {
    await page.goto('/#/lost-tunnel');
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText(/Lost in the burrow|トンネルで迷子/i)).toBeVisible();
  });

  test('language can switch to Japanese without layout collapse', async ({ page }) => {
    await page.goto('/#/settings');
    await page.getByRole('button', { name: /日本語/i }).click();

    await expect(page.getByRole('heading', { name: /設定/i })).toBeVisible();
    await expect(page.getByText(/効果音/i)).toBeVisible();

    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThanOrEqual(430);
  });
});
