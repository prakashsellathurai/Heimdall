import { test, expect, Page, Route } from '@playwright/test';

const routeDelays: Record<string, number | undefined> = {};

async function setUpMockRoutes(page: Page) {
  await page.route('https://news.ycombinator.com/rss', async (route: Route) => {
    if (routeDelays['hn']) await new Promise(r => setTimeout(r, routeDelays['hn']));
    await route.fulfill({
      body: `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <item>
            <title>HN Mock Item 1</title>
            <link>https://example.com/hn1</link>
            <comments>https://news.ycombinator.com/item?id=1</comments>
          </item>
        </channel>
      </rss>`,
      contentType: 'text/xml',
    });
  });

  await page.route('https://lwn.net/headlines/rss', async (route: Route) => {
    if (routeDelays['lwn']) await new Promise(r => setTimeout(r, routeDelays['lwn']));
    await route.fulfill({
      body: `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <item>
            <title>LWN Mock Item 1</title>
            <link>https://lwn.net/Articles/1/rss</link>
          </item>
        </channel>
      </rss>`,
      contentType: 'text/xml',
    });
  });

  await page.route('https://ourworldindata.org/atom.xml', async (route: Route) => {
    if (routeDelays['owid']) await new Promise(r => setTimeout(r, routeDelays['owid']));
    await route.fulfill({
      body: `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <item>
            <title>OWID Mock Item 1</title>
            <link>https://example.com/owid1</link>
          </item>
        </channel>
      </rss>`,
      contentType: 'text/xml',
    });
  });
}

test.describe('Heimdall Extension Simulation', () => {
  test.beforeEach(async ({ page }) => {
    Object.keys(routeDelays).forEach(k => delete routeDelays[k]);

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

    await setUpMockRoutes(page);
  });

  test.describe('Popup View', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/popup/popup.html');
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
      await page.goto('/dashboard/dashboard.html');
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

    test('should load cached feeds on Home view without re-fetching', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('Heimdall.Feeds', JSON.stringify({
          'HN': 'https://news.ycombinator.com/rss',
          'LWN': 'https://lwn.net/headlines/rss',
          'OWID': 'https://ourworldindata.org/atom.xml',
        }));
        localStorage.setItem('HN.NumLinks', '1');
        localStorage.setItem('HN.Link0', JSON.stringify({
          Title: 'HN Cached Article',
          Link: 'https://example.com/hn1',
          CommentsLink: 'https://news.ycombinator.com/item?id=1',
        }));
        localStorage.setItem('LWN.NumLinks', '1');
        localStorage.setItem('LWN.Link0', JSON.stringify({
          Title: 'LWN Cached Article',
          Link: 'https://lwn.net/Articles/1/rss',
        }));
        localStorage.setItem('OWID.NumLinks', '1');
        localStorage.setItem('OWID.Link0', JSON.stringify({
          Title: 'OWID Cached Article',
          Link: 'https://example.com/owid1',
        }));
      });

      await page.goto('/dashboard/dashboard.html');

      await page.waitForTimeout(500);
      const homeArticles = await page.locator('#home-articles').innerText();
      expect(homeArticles).toContain('HN Cached Article');
      expect(homeArticles).toContain('LWN Cached Article');
      expect(homeArticles).toContain('OWID Cached Article');
    });

    test('should navigate to individual feed via sidebar', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('Heimdall.Feeds', JSON.stringify({
          'HN': 'https://news.ycombinator.com/rss',
          'LWN': 'https://lwn.net/headlines/rss',
          'OWID': 'https://ourworldindata.org/atom.xml',
        }));
        localStorage.setItem('HN.NumLinks', '2');
        localStorage.setItem('HN.Link0', JSON.stringify({ Title: 'HN Article 1', Link: 'https://example.com/hn1' }));
        localStorage.setItem('HN.Link1', JSON.stringify({ Title: 'HN Article 2', Link: 'https://example.com/hn2' }));
        localStorage.setItem('LWN.NumLinks', '1');
        localStorage.setItem('LWN.Link0', JSON.stringify({ Title: 'LWN Article 1', Link: 'https://lwn.net/Articles/1/rss' }));
        localStorage.setItem('OWID.NumLinks', '1');
        localStorage.setItem('OWID.Link0', JSON.stringify({ Title: 'OWID Article 1', Link: 'https://example.com/owid1' }));
      });

      await page.goto('/dashboard/dashboard.html');
      await page.waitForTimeout(500);

      await page.locator('.nav-item[data-feed="LWN"]').click();

      await expect(page.locator('#view-feed')).toBeVisible();
      await expect(page.locator('#feed-title')).toHaveText('LWN');
      await expect(page.locator('#feed-articles')).toContainText('LWN Article 1');
      await expect(page.locator('#feed-articles')).not.toContainText('HN Article');
      await expect(page.locator('#feed-articles')).not.toContainText('OWID Article');
    });

    test('should show loading state then render feeds', async ({ page }) => {
      routeDelays['hn'] = 800;
      routeDelays['lwn'] = 800;
      routeDelays['owid'] = 800;

      await page.goto('/dashboard/dashboard.html');

      await expect(page.locator('#home-articles')).toContainText(/Loading/);

      await page.waitForTimeout(2000);
      const homeArticles = page.locator('#home-articles');
      await expect(homeArticles).toContainText('HN Mock Item 1');
      await expect(homeArticles).toContainText('LWN Mock Item 1');
      await expect(homeArticles).toContainText('OWID Mock Item 1');
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
