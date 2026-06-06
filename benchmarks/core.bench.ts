import { JSDOM } from 'jsdom';
import { bench, group, run } from 'mitata';
import { parseFeedLinks } from '../src/core/parser';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
});
globalThis.DOMParser = dom.window.DOMParser;

function generateXML(itemCount: number): string {
  let items = '';
  for (let i = 0; i < itemCount; i++) {
    items += `
        <item>
            <title>Test Item ${i}</title>
            <link>http://example.com/item/${i}</link>
            <comments>http://example.com/item/${i}/comments</comments>
            <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
            <description>This is a description for item ${i}.</description>
        </item>`;
  }
  return `
    <rss version="2.0">
        <channel>
            <title>Benchmark Feed</title>
            <link>http://example.com</link>
            <description>A feed for benchmarking.</description>
            ${items}
        </channel>
    </rss>`;
}

const smallXML = generateXML(5);
const mediumXML = generateXML(20);
const largeXML = generateXML(100);
const extraLargeXML = generateXML(1000);

group('Feed Parsing', () => {
  bench('Small Feed (5 items) [Baseline]', () => {
    parseFeedLinks(smallXML);
  });

  bench('Medium Feed (20 items)', () => {
    parseFeedLinks(mediumXML);
  });

  bench('Large Feed (100 items)', () => {
    parseFeedLinks(largeXML);
  });

  bench('Extra Large Feed (1000 items)', () => {
    parseFeedLinks(extraLargeXML);
  });
});

await run();
