import type { Page, Route } from '@playwright/test';

export const routeDelays: Record<string, number | undefined> = {};
export const fetchCounts: Record<string, number> = {};
export let abortMocking = false;

export function setAbortMocking(value: boolean) {
  abortMocking = value;
}

export function clearRouteDelays() {
  for (const k of Object.keys(routeDelays)) delete routeDelays[k];
}

export function clearFetchCounts() {
  for (const k of Object.keys(fetchCounts)) delete fetchCounts[k];
}

function mockBody(label: string, itemNum: number, link: string, commentsLink?: string): string {
  const comments = commentsLink ? `<comments>${commentsLink}</comments>` : '';
  const titleSuffix = itemNum > 1 ? ' (Refreshed)' : '';
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><item><title>${label} Mock Item ${itemNum}${titleSuffix}</title><link>${link}</link>${comments}</item></channel></rss>`;
}

export async function setUpMockRoutes(page: Page) {
  const handler = async (route: Route) => {
    if (abortMocking) return route.abort();
    const url = route.request().url();
    if (url.includes('news.ycombinator.com/rss')) {
      if (routeDelays.hn) await new Promise((r) => setTimeout(r, routeDelays.hn));
      fetchCounts.hn = (fetchCounts.hn || 0) + 1;
      await route.fulfill({
        body: mockBody(
          'HN',
          fetchCounts.hn,
          `https://example.com/hn${fetchCounts.hn}`,
          `https://news.ycombinator.com/item?id=${fetchCounts.hn}`,
        ),
        contentType: 'text/xml',
      });
    } else if (url.includes('lwn.net/headlines/rss')) {
      if (routeDelays.lwn) await new Promise((r) => setTimeout(r, routeDelays.lwn));
      fetchCounts.lwn = (fetchCounts.lwn || 0) + 1;
      await route.fulfill({
        body: mockBody('LWN', fetchCounts.lwn, `https://lwn.net/Articles/${fetchCounts.lwn}/rss`),
        contentType: 'text/xml',
      });
    } else if (url.includes('ourworldindata.org/atom.xml')) {
      if (routeDelays.owid) await new Promise((r) => setTimeout(r, routeDelays.owid));
      fetchCounts.owid = (fetchCounts.owid || 0) + 1;
      await route.fulfill({
        body: mockBody('OWID', fetchCounts.owid, `https://example.com/owid${fetchCounts.owid}`),
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
