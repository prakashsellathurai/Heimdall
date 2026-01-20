/**
 * @jest-environment jsdom
 */

// Load the core module
const fs = require('fs');
const path = require('path');
const coreCode = fs.readFileSync(path.join(__dirname, '../js/core.js'), 'utf8');

// Execute core.js in global scope
eval(coreCode);

describe('Core Functions', () => {
    describe('SetInitialOption', () => {
        it('should not overwrite existing option', () => {
            localStorage['existing.key'] = 'existingValue';
            SetInitialOption('existing.key', 'newValue');
            expect(localStorage['existing.key']).toBe('existingValue');
        });

        it('should set option when key does not exist', () => {
            // localStorage[key] returns undefined, which we now check for
            SetInitialOption('test.key', 'testValue');
            expect(localStorage['test.key']).toBe('testValue');
        });
    });

    describe('parseFeedLinks', () => {
        const sampleHnRss = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <item>
            <title>Test Article</title>
            <link>https://example.com/article</link>
            <comments>https://news.ycombinator.com/item?id=123</comments>
          </item>
        </channel>
      </rss>`;

        it('should parse HN RSS feed items correctly', () => {
            const links = parseFeedLinks(sampleHnRss);

            expect(links).toHaveLength(1);
            expect(links[0].Title).toBe('Test Article');
            expect(links[0].Link).toBe('https://example.com/article');
            expect(links[0].CommentsLink).toBe('https://news.ycombinator.com/item?id=123');
        });

        const sampleLwnRss = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>LWN: Test LWN Article</title>
              <link>https://lwn.net/Articles/12345/rss</link>
            </item>
          </channel>
        </rss>`;

        it('should parse LWN RSS feed items correctly', () => {
            const links = parseFeedLinks(sampleLwnRss);

            expect(links).toHaveLength(1);
            expect(links[0].Title).toBe('LWN: Test LWN Article');
            expect(links[0].Link).toBe('https://lwn.net/Articles/12345/rss');
        });

        it('should handle missing elements gracefully', () => {
            const incompleteRss = `<?xml version="1.0"?>
        <rss>
          <channel>
            <item>
              <title>No Link Article</title>
            </item>
          </channel>
        </rss>`;

            const links = parseFeedLinks(incompleteRss);
            expect(links).toHaveLength(1);
            expect(links[0].Title).toBe('No Link Article');
            expect(links[0].Link).toBe('');
        });
    });

    describe('SaveLinksToLocalStorage / RetrieveLinksFromLocalStorage', () => {
        it('should save and retrieve HN links correctly', () => {
            const testLinks = [
                { Title: 'HN 1', Link: 'https://hn1.com', CommentsLink: 'https://hn.com/1' },
                { Title: 'HN 2', Link: 'https://hn2.com', CommentsLink: 'https://hn.com/2' }
            ];

            SaveLinksToLocalStorage("HN", testLinks);
            const retrieved = RetrieveLinksFromLocalStorage("HN");

            expect(retrieved).toHaveLength(2);
            expect(retrieved[0].Title).toBe('HN 1');
            expect(retrieved[1].Title).toBe('HN 2');
        });

        it('should save and retrieve LWN links correctly', () => {
            const testLinks = [
                { Title: 'LWN 1', Link: 'https://lwn1.com' }
            ];

            SaveLinksToLocalStorage("LWN", testLinks);
            const retrieved = RetrieveLinksFromLocalStorage("LWN");

            expect(retrieved).toHaveLength(1);
            expect(retrieved[0].Title).toBe('LWN 1');
            expect(localStorage["LWN.Link0"]).toBeDefined();
        });
    });

    describe('openUrl', () => {
        it('should open http URLs using browser API', () => {
            openUrl('https://example.com', true);
            // Uses browser API (polyfill pattern in code)
            expect(browser.tabs.create).toHaveBeenCalledWith({
                url: 'https://example.com',
                active: true
            });
        });

        it('should reject non-http URLs', () => {
            openUrl('javascript:alert(1)', true);
            expect(browser.tabs.create).not.toHaveBeenCalled();
            expect(chrome.tabs.create).not.toHaveBeenCalled();
        });
    });

    describe('printTime', () => {
        it('should format morning time correctly', () => {
            const time = printTime(new Date('2024-01-01T09:30:00'));
            expect(time).toBe('9:30 AM');
        });

        it('should format afternoon time correctly', () => {
            const time = printTime(new Date('2024-01-01T14:45:00'));
            expect(time).toBe('2:45 PM');
        });
    });
});
