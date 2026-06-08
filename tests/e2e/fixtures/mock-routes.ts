import type { Page, Route } from '@playwright/test';

export const routeDelays: Record<string, number | undefined> = {};
export let abortMocking = false;

export function setAbortMocking(value: boolean) {
  abortMocking = value;
}

export function clearRouteDelays() {
  for (const k of Object.keys(routeDelays)) delete routeDelays[k];
}

export async function setUpMockRoutes(page: Page) {
  const handler = async (route: Route) => {
    if (abortMocking) return route.abort();
    const url = route.request().url();
    if (url.includes('news.ycombinator.com/rss')) {
      if (routeDelays.hn) await new Promise((r) => setTimeout(r, routeDelays.hn));
      await route.fulfill({
        body: `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><item><title>HN Mock Item 1</title><link>https://example.com/hn1</link><comments>https://news.ycombinator.com/item?id=1</comments></item></channel></rss>`,
        contentType: 'text/xml',
      });
    } else if (url.includes('lwn.net/headlines/rss')) {
      if (routeDelays.lwn) await new Promise((r) => setTimeout(r, routeDelays.lwn));
      await route.fulfill({
        body: `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><item><title>LWN Mock Item 1</title><link>https://lwn.net/Articles/1/rss</link></item></channel></rss>`,
        contentType: 'text/xml',
      });
    } else if (url.includes('ourworldindata.org/atom.xml')) {
      if (routeDelays.owid) await new Promise((r) => setTimeout(r, routeDelays.owid));
      await route.fulfill({
        body: `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><item><title>OWID Mock Item 1</title><link>https://example.com/owid1</link></item></channel></rss>`,
        contentType: 'text/xml',
      });
    } else {
      await route.continue();
    }
  };
  await page.route('https://news.ycombinator.com/rss', handler);
  await page.route('https://lwn.net/headlines/rss', handler);
  await page.route('https://ourworldindata.org/atom.xml', handler);
}
