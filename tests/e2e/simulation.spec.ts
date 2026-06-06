import { expect, type Page, type Route, test } from "@playwright/test";

const routeDelays: Record<string, number | undefined> = {};
let abortMocking = false;

async function setUpMockRoutes(page: Page) {
  const handler = async (route: Route) => {
    if (abortMocking) return route.abort();
    const url = route.request().url();
    if (url.includes("news.ycombinator.com/rss")) {
      if (routeDelays.hn)
        await new Promise((r) => setTimeout(r, routeDelays.hn));
      await route.fulfill({
        body: `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><item><title>HN Mock Item 1</title><link>https://example.com/hn1</link><comments>https://news.ycombinator.com/item?id=1</comments></item></channel></rss>`,
        contentType: "text/xml",
      });
    } else if (url.includes("lwn.net/headlines/rss")) {
      if (routeDelays.lwn)
        await new Promise((r) => setTimeout(r, routeDelays.lwn));
      await route.fulfill({
        body: `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><item><title>LWN Mock Item 1</title><link>https://lwn.net/Articles/1/rss</link></item></channel></rss>`,
        contentType: "text/xml",
      });
    } else if (url.includes("ourworldindata.org/atom.xml")) {
      if (routeDelays.owid)
        await new Promise((r) => setTimeout(r, routeDelays.owid));
      await route.fulfill({
        body: `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><item><title>OWID Mock Item 1</title><link>https://example.com/owid1</link></item></channel></rss>`,
        contentType: "text/xml",
      });
    } else {
      await route.continue();
    }
  };
  await page.route("https://news.ycombinator.com/rss", handler);
  await page.route("https://lwn.net/headlines/rss", handler);
  await page.route("https://ourworldindata.org/atom.xml", handler);
}

// ─── CHROMIUM WEB SERVER TESTS ─────────────────────────────────
test.describe("Heimdall Extension - Chrome", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Chrome web server test",
  );

  test.beforeEach(async ({ page }) => {
    abortMocking = false;
    for (const k of Object.keys(routeDelays)) delete routeDelays[k];
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
    page.on("pageerror", (error) => console.log("PAGE ERROR:", error.message));
    await setUpMockRoutes(page);
  });

  test.describe("Popup View", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/popup/popup.html");
    });

    test("should display Home feed items by default", async ({ page }) => {
      await page.waitForTimeout(2000);
      await expect(page.locator('button[data-feed="Home"]')).toHaveClass(
        /active/,
      );
      const text = await page.locator("#feed").innerText();
      expect(text).toContain("HN Mock Item 1");
      expect(text).toContain("LWN Mock Item 1");
      expect(text).toContain("OWID Mock Item 1");
    });

    test("should switch between feeds using dynamic tabs", async ({ page }) => {
      await page.waitForTimeout(2000);
      const hnTab = page.locator('button[data-feed="HN"]');
      await hnTab.click();
      await expect(hnTab).toHaveClass(/active/);
      await expect(page.locator("text=HN Mock Item 1")).toBeVisible();
      await expect(page.locator("text=LWN Mock Item 1")).not.toBeVisible();
    });

    test("should navigate to Dashboard", async ({ page }) => {
      await expect(page.locator("#open-options")).toBeVisible();
    });
  });

  test.describe("Dashboard View", () => {
    test("should display mixed feed on Home view", async ({ page }) => {
      await page.goto("/dashboard/dashboard.html");
      await page.waitForTimeout(2000);
      const text = await page.locator("#home-articles").innerText();
      expect(text).toContain("HN Mock Item 1");
      expect(text).toContain("LWN Mock Item 1");
      expect(text).toContain("OWID Mock Item 1");
    });

    test("should open article in preview panel", async ({ page }) => {
      await page.goto("/dashboard/dashboard.html");
      await page.waitForTimeout(2000);
      await page.locator("text=HN Mock Item 1").click();
      await expect(page.locator("#preview-panel")).toHaveClass(/open/);
      await expect(page.locator("#preview-frame")).toHaveAttribute(
        "src",
        "https://example.com/hn1",
      );
      await page.locator("#close-preview-btn").click();
      await expect(page.locator("#preview-panel")).not.toHaveClass(/open/);
    });

    test("should load cached feeds on Home view without re-fetching", async ({
      page,
    }) => {
      await page.goto("/dashboard/dashboard.html");
      await page.waitForTimeout(2000);

      await page.goto("/dashboard/dashboard.html");
      await page.waitForTimeout(500);

      const text = await page.locator("#home-articles").innerText();
      expect(text).toContain("HN Mock Item 1");
      expect(text).toContain("LWN Mock Item 1");
      expect(text).toContain("OWID Mock Item 1");
    });

    test("should navigate to individual feed via sidebar", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem(
          "Heimdall.Feeds",
          JSON.stringify({
            HN: "https://news.ycombinator.com/rss",
            LWN: "https://lwn.net/headlines/rss",
            OWID: "https://ourworldindata.org/atom.xml",
          }),
        );
      });
      await page.goto("/dashboard/dashboard.html");
      await page.waitForTimeout(2000);
      await page.locator('.nav-item[data-feed="LWN"]').click();
      await expect(page.locator("#view-feed")).toBeVisible();
      await expect(page.locator("#feed-title")).toHaveText("LWN");
      await expect(page.locator("#feed-articles")).toContainText(
        "LWN Mock Item 1",
      );
      await expect(page.locator("#feed-articles")).not.toContainText("HN Mock");
      await expect(page.locator("#feed-articles")).not.toContainText(
        "OWID Mock",
      );
    });

    test("should show loading state then render feeds", async ({ page }) => {
      routeDelays.hn = 3000;
      routeDelays.lwn = 3000;
      routeDelays.owid = 3000;
      await page.goto("/dashboard/dashboard.html");
      await expect(page.locator("#home-articles")).toContainText(/Loading/);
      await page.waitForTimeout(4000);
      const articles = page.locator("#home-articles");
      await expect(articles).toContainText("HN Mock Item 1");
      await expect(articles).toContainText("LWN Mock Item 1");
      await expect(articles).toContainText("OWID Mock Item 1");
    });

    test("should add a new feed", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem(
          "Heimdall.Feeds",
          JSON.stringify({
            HN: "https://news.ycombinator.com/rss",
            LWN: "https://lwn.net/headlines/rss",
            OWID: "https://ourworldindata.org/atom.xml",
          }),
        );
      });
      await page.goto("/dashboard/dashboard.html");
      await page.waitForTimeout(2000);
      await page.locator('.nav-item[data-view="settings"]').click();
      await page.locator("#new-feed-name").fill("Custom Feed");
      await page
        .locator("#new-feed-url")
        .fill("https://example.com/custom.rss");
      page.on("dialog", (dialog) => dialog.accept());
      await page.locator("#add-feed-btn").click();
      await expect(page.locator("#sidebar-feeds")).toContainText("Custom Feed");
      await expect(page.locator("#manage-feeds-list")).toContainText(
        "Custom Feed",
      );
    });
  });
});

// ─── FIREFOX HTTP SERVER TESTS ───────────────────────────────
test.describe("Heimdall Extension - Firefox", () => {
  test.skip(
    ({ browserName }) => browserName !== "firefox",
    "Firefox HTTP test",
  );

  test.beforeEach(async ({ page }) => {
    abortMocking = false;
    for (const k of Object.keys(routeDelays)) delete routeDelays[k];
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
    page.on("pageerror", (error) => console.log("PAGE ERROR:", error.message));
    await setUpMockRoutes(page);
  });

  test.describe("Popup View", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/popup/popup.html");
    });

    test("should display Home feed items by default", async ({ page }) => {
      await page.waitForTimeout(2000);
      await expect(page.locator('button[data-feed="Home"]')).toHaveClass(
        /active/,
      );
      const text = await page.locator("#feed").innerText();
      expect(text).toContain("HN Mock Item 1");
      expect(text).toContain("LWN Mock Item 1");
      expect(text).toContain("OWID Mock Item 1");
    });

    test("should switch between feeds using dynamic tabs", async ({ page }) => {
      await page.waitForTimeout(2000);
      const hnTab = page.locator('button[data-feed="HN"]');
      await hnTab.click();
      await expect(hnTab).toHaveClass(/active/);
      await expect(page.locator("text=HN Mock Item 1")).toBeVisible();
      await expect(page.locator("text=LWN Mock Item 1")).not.toBeVisible();
    });

    test("should navigate to Dashboard", async ({ page }) => {
      await expect(page.locator("#open-options")).toBeVisible();
    });
  });

  test.describe("Dashboard View", () => {
    test("should display mixed feed on Home view", async ({ page }) => {
      await page.goto("/dashboard/dashboard.html");
      await page.waitForTimeout(2000);
      const text = await page.locator("#home-articles").innerText();
      expect(text).toContain("HN Mock Item 1");
      expect(text).toContain("LWN Mock Item 1");
      expect(text).toContain("OWID Mock Item 1");
    });

    test("should open article in preview panel", async ({ page }) => {
      await page.goto("/dashboard/dashboard.html");
      await page.waitForTimeout(2000);
      await page.locator("text=HN Mock Item 1").click();
      await expect(page.locator("#preview-panel")).toHaveClass(/open/);
      await expect(page.locator("#preview-frame")).toHaveAttribute(
        "src",
        "https://example.com/hn1",
      );
      await page.locator("#close-preview-btn").click();
      await expect(page.locator("#preview-panel")).not.toHaveClass(/open/);
    });

    test("should load cached feeds on Home view without re-fetching", async ({
      page,
    }) => {
      await page.goto("/dashboard/dashboard.html");
      await page.waitForTimeout(2000);

      await page.goto("/dashboard/dashboard.html");
      await page.waitForTimeout(500);

      const text = await page.locator("#home-articles").innerText();
      expect(text).toContain("HN Mock Item 1");
      expect(text).toContain("LWN Mock Item 1");
      expect(text).toContain("OWID Mock Item 1");
    });

    test("should navigate to individual feed via sidebar", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem(
          "Heimdall.Feeds",
          JSON.stringify({
            HN: "https://news.ycombinator.com/rss",
            LWN: "https://lwn.net/headlines/rss",
            OWID: "https://ourworldindata.org/atom.xml",
          }),
        );
      });
      await page.goto("/dashboard/dashboard.html");
      await page.waitForTimeout(2000);
      await page.locator('.nav-item[data-feed="LWN"]').click();
      await expect(page.locator("#view-feed")).toBeVisible();
      await expect(page.locator("#feed-title")).toHaveText("LWN");
      await expect(page.locator("#feed-articles")).toContainText(
        "LWN Mock Item 1",
      );
      await expect(page.locator("#feed-articles")).not.toContainText("HN Mock");
      await expect(page.locator("#feed-articles")).not.toContainText(
        "OWID Mock",
      );
    });

    test("should show loading state then render feeds", async ({ page }) => {
      routeDelays.hn = 3000;
      routeDelays.lwn = 3000;
      routeDelays.owid = 3000;
      await page.goto("/dashboard/dashboard.html");
      await expect(page.locator("#home-articles")).toContainText(/Loading/);
      await page.waitForTimeout(4000);
      const articles = page.locator("#home-articles");
      await expect(articles).toContainText("HN Mock Item 1");
      await expect(articles).toContainText("LWN Mock Item 1");
      await expect(articles).toContainText("OWID Mock Item 1");
    });

    test("should add a new feed", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem(
          "Heimdall.Feeds",
          JSON.stringify({
            HN: "https://news.ycombinator.com/rss",
            LWN: "https://lwn.net/headlines/rss",
            OWID: "https://ourworldindata.org/atom.xml",
          }),
        );
      });
      await page.goto("/dashboard/dashboard.html");
      await page.waitForTimeout(2000);
      await page.locator('.nav-item[data-view="settings"]').click();
      await page.locator("#new-feed-name").fill("Custom Feed");
      await page
        .locator("#new-feed-url")
        .fill("https://example.com/custom.rss");
      page.on("dialog", (dialog) => dialog.accept());
      await page.locator("#add-feed-btn").click();
      await expect(page.locator("#sidebar-feeds")).toContainText("Custom Feed");
      await expect(page.locator("#manage-feeds-list")).toContainText(
        "Custom Feed",
      );
    });
  });
});
