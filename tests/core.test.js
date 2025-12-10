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

        // Note: SetInitialOption has a bug - it checks for null but localStorage returns undefined
        // This test documents the current (buggy) behavior
        it('should not set option when key does not exist (documenting bug)', () => {
            // localStorage[key] returns undefined, not null, so condition fails
            SetInitialOption('test.key', 'testValue');
            expect(localStorage['test.key']).toBeUndefined();
        });
    });

    describe('parseHNLinks', () => {
        const sampleRss = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <item>
            <title>Test Article</title>
            <link>https://example.com/article</link>
            <comments>https://news.ycombinator.com/item?id=123</comments>
          </item>
        </channel>
      </rss>`;

        it('should parse RSS feed items correctly', () => {
            const links = parseHNLinks(sampleRss);

            expect(links).toHaveLength(1);
            expect(links[0].Title).toBe('Test Article');
            expect(links[0].Link).toBe('https://example.com/article');
            expect(links[0].CommentsLink).toBe('https://news.ycombinator.com/item?id=123');
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

            const links = parseHNLinks(incompleteRss);
            expect(links).toHaveLength(1);
            expect(links[0].Title).toBe('No Link Article');
            expect(links[0].Link).toBe('');
        });
    });

    describe('SaveLinksToLocalStorage / RetrieveLinksFromLocalStorage', () => {
        it('should save and retrieve links correctly', () => {
            const testLinks = [
                { Title: 'Test 1', Link: 'https://test1.com', CommentsLink: 'https://hn.com/1' },
                { Title: 'Test 2', Link: 'https://test2.com', CommentsLink: 'https://hn.com/2' }
            ];

            SaveLinksToLocalStorage(testLinks);
            const retrieved = RetrieveLinksFromLocalStorage();

            expect(retrieved).toHaveLength(2);
            expect(retrieved[0].Title).toBe('Test 1');
            expect(retrieved[1].Title).toBe('Test 2');
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

        it('should reject file URLs', () => {
            openUrl('file:///etc/passwd', true);
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

        it('should handle noon correctly', () => {
            const time = printTime(new Date('2024-01-01T12:00:00'));
            expect(time).toBe('12:00 PM');
        });

        it('should handle midnight correctly', () => {
            const time = printTime(new Date('2024-01-01T00:00:00'));
            expect(time).toBe('12:00 AM');
        });
    });
});
