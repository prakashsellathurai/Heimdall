const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('RSS Feed Simulation', () => {
    test.beforeEach(async ({ page }) => {
        // Mock HN RSS feed
        await page.route('https://news.ycombinator.com/rss', async route => {
            const hnRss = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <item>
            <title>HN Mock Item 1</title>
            <link>https://example.com/hn1</link>
            <comments>https://news.ycombinator.com/item?id=1</comments>
          </item>
          <item>
            <title>HN Mock Item 2</title>
            <link>https://example.com/hn2</link>
            <comments>https://news.ycombinator.com/item?id=2</comments>
          </item>
        </channel>
      </rss>`;
            await route.fulfill({ body: hnRss, contentType: 'text/xml' });
        });

        // Mock LWN RSS feed
        await page.route('https://lwn.net/headlines/rss', async route => {
            const lwnRss = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <item>
            <title>LWN Mock Item 1</title>
            <link>https://lwn.net/Articles/1/rss</link>
          </item>
        </channel>
      </rss>`;
            await route.fulfill({ body: lwnRss, contentType: 'text/xml' });
        });

        // Navigate to the popup.html
        const popupPath = path.join(__dirname, '../../popup.html');
        const popupUrl = `file://${popupPath}`;
        await page.goto(popupUrl);
    });

    test('should display HN feed items by default', async ({ page }) => {
        // Check if HN items are rendered
        await expect(page.locator('text=HN Mock Item 1')).toBeVisible();
        await expect(page.locator('text=HN Mock Item 2')).toBeVisible();

        // Check if the tab is active
        const hnButton = page.locator('button[data-feed="HN"]');
        await expect(hnButton).toHaveClass(/active/);
    });

    test('should switch to LWN feed when tab is clicked', async ({ page }) => {
        // Click LWN tab
        const lwnButton = page.locator('button[data-feed="LWN"]');
        await lwnButton.click();

        // Check if LWN items are rendered
        await expect(page.locator('text=LWN Mock Item 1')).toBeVisible();

        // Check if the tab is active
        await expect(lwnButton).toHaveClass(/active/);

        // HN items should not be visible (or should be replaced)
        await expect(page.locator('text=HN Mock Item 1')).not.toBeVisible();
    });

    test('should handle refresh action', async ({ page }) => {
        // Initially items are visible
        await expect(page.locator('text=HN Mock Item 1')).toBeVisible();

        // Click refresh
        const refreshButton = page.locator('#refresh');
        await refreshButton.click();

        // Verify items still visible (or updated if we changed the mock)
        await expect(page.locator('text=HN Mock Item 1')).toBeVisible();
    });
});
