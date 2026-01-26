const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Heimdall Extension Simulation', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

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

    // Mock OWID RSS feed
    await page.route('https://ourworldindata.org/atom.xml', async route => {
      const owidRss = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <item>
            <title>OWID Mock Item 1</title>
            <link>https://example.com/owid1</link>
          </item>
        </channel>
      </rss>`;
      await route.fulfill({ body: owidRss, contentType: 'text/xml' });
    });
  });

  test.describe('Popup View', () => {
    test.beforeEach(async ({ page }) => {
      const popupPath = path.join(__dirname, '../../popup.html');
      const popupUrl = `file://${popupPath}`;
      await page.goto(popupUrl);
    });

    test('should display Home feed items by default', async ({ page }) => {
      await page.waitForTimeout(2000);

      const homeTab = page.locator('button[data-feed="Home"]');
      await expect(homeTab).toHaveClass(/active/);

      const feedContent = await page.locator('#feed').innerText();
      expect(feedContent).toContain('HN Mock Item 1');
      expect(feedContent).toContain('LWN Mock Item 1');
      expect(feedContent).toContain('OWID Mock Item 1');
    });

    test('should switch between feeds using dynamic tabs', async ({ page }) => {
      await page.waitForTimeout(2000);
      const hnTab = page.locator('button[data-feed="HN"]');
      await hnTab.click();

      await expect(hnTab).toHaveClass(/active/);
      await expect(page.locator('text=HN Mock Item 1')).toBeVisible();
      await expect(page.locator('text=LWN Mock Item 1')).not.toBeVisible();
    });

    test('should navigate to Dashboard', async ({ page }) => {
      const dashboardLink = page.locator('#open-options');
      await expect(dashboardLink).toBeVisible();
    });
  });

  test.describe('Dashboard View', () => {
    test.beforeEach(async ({ page }) => {
      const dashboardPath = path.join(__dirname, '../../dashboard.html');
      const dashboardUrl = `file://${dashboardPath}`;
      await page.goto(dashboardUrl);
    });

    test('should display mixed feed on Home view', async ({ page }) => {
      await page.waitForTimeout(2000);
      const homeArticles = await page.locator('#home-articles').innerText();
      expect(homeArticles).toContain('HN Mock Item 1');
      expect(homeArticles).toContain('LWN Mock Item 1');
      expect(homeArticles).toContain('OWID Mock Item 1');
    });

    test('should open article in preview panel', async ({ page }) => {
      await page.waitForTimeout(2000);
      const articleLink = page.locator('text=HN Mock Item 1');
      await articleLink.click();

      const previewPanel = page.locator('#preview-panel');
      await expect(previewPanel).toHaveClass(/open/);

      const iframe = page.locator('#preview-frame');
      await expect(iframe).toHaveAttribute('src', 'https://example.com/hn1');

      await page.locator('#close-preview-btn').click();
      await expect(previewPanel).not.toHaveClass(/open/);
    });

    test('should add a new feed', async ({ page }) => {
      await page.locator('.nav-item[data-view="settings"]').click();

      await page.locator('#new-feed-name').fill('Custom Feed');
      await page.locator('#new-feed-url').fill('https://example.com/custom.rss');

      page.on('dialog', dialog => dialog.accept());
      await page.locator('#add-feed-btn').click();

      await expect(page.locator('#sidebar-feeds')).toContainText('Custom Feed');
      await expect(page.locator('#manage-feeds-list')).toContainText('Custom Feed');
    });
  });
});
