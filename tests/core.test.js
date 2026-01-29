/**
 * @jest-environment jsdom
 */

const core = require('../js/core');

describe('Core Functions', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
        jest.clearAllMocks();
        // Reset FEEDS
        if (core.DEFAULT_FEEDS) {
            core.SaveFeeds(core.DEFAULT_FEEDS);
        }
    });

    describe('Feed Management', () => {
        it('LoadFeeds should return default feeds if empty', () => {
            const feeds = core.LoadFeeds();
            expect(feeds).toEqual(core.DEFAULT_FEEDS);
            expect(JSON.parse(localStorage["Heimdall.Feeds"])).toEqual(core.DEFAULT_FEEDS);
        });

        it('LoadFeeds should return stored feeds', () => {
            const customFeeds = { "Custom": "http://test.com" };
            localStorage["Heimdall.Feeds"] = JSON.stringify(customFeeds);
            const feeds = core.LoadFeeds();
            expect(feeds).toEqual(customFeeds);
        });

        it('LoadFeeds should handle parse error', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            localStorage["Heimdall.Feeds"] = "invalid json";
            const feeds = core.LoadFeeds();
            // Should fall through? The original code returns undefined if try/catch fails but doesn't re-init defaults immediately if 'storedFeeds' was truthy but invalid.
            // Actually, looking at code: catch(e) caught, but function doesn't return in catch.
            // It continues to: localStorage["Heimdall.Feeds"] = JSON.stringify(DEFAULT_FEEDS);
            // return DEFAULT_FEEDS;
            expect(feeds).toEqual(core.DEFAULT_FEEDS);
            consoleSpy.mockRestore();
        });

        it('AddFeed should add a feed', () => {
            core.AddFeed('NewFeed', 'http://new.com');
            const feeds = core.LoadFeeds();
            expect(feeds['NewFeed']).toBe('http://new.com');
        });

        it('RemoveFeed should remove a feed', () => {
            core.AddFeed('ToRem', 'http://rem.com');
            core.RemoveFeed('ToRem');
            const feeds = core.LoadFeeds();
            expect(feeds['ToRem']).toBeUndefined();
        });
    });

    describe('Settings', () => {
        it('SetInitialOption should set only if undefined', () => {
            core.SetInitialOption('testkey', 'val1');
            expect(localStorage['testkey']).toBe('val1');

            core.SetInitialOption('testkey', 'val2');
            expect(localStorage['testkey']).toBe('val1');
        });
    });

    describe('Feed Updates', () => {
        it('UpdateIfReady force=true', () => {
            const cb = jest.fn();
            // Setup mock for xhr
            const x = new XMLHttpRequest();
            x.mockResponse = '<rss></rss>';
            jest.spyOn(global, 'XMLHttpRequest').mockImplementation(() => x);

            core.UpdateIfReady('HN', true, cb);
            expect(cb).toHaveBeenCalled();
        });

        it('UpdateIfReady time based', () => {
            const cb = jest.fn();
            const now = new Date().getTime();
            localStorage['HN.LastRefresh'] = now - 10000;
            localStorage['HN.RequestInterval'] = 5000; // Ready

            // Mock XHR
            const x = new XMLHttpRequest();
            x.mockResponse = '<rss></rss>';
            jest.spyOn(global, 'XMLHttpRequest').mockImplementation(() => x);

            core.UpdateIfReady('HN', false, cb);
            expect(cb).toHaveBeenCalled();
        });

        it('UpdateIfReady not ready', () => {
            const cb = jest.fn();
            const now = new Date().getTime();
            localStorage['HN.LastRefresh'] = now;
            localStorage['HN.RequestInterval'] = 5000; // Not ready

            core.UpdateIfReady('HN', false, cb);
            expect(cb).not.toHaveBeenCalled();
        });

        it('UpdateFeed handles success', () => {
            const cb = jest.fn();
            const x = new XMLHttpRequest();
            x.mockResponse = `
                <rss>
                    <channel>
                        <item>
                            <title>Test</title>
                            <link>http://test.com</link>
                        </item>
                    </channel>
                </rss>
            `;
            jest.spyOn(global, 'XMLHttpRequest').mockImplementation(() => x);

            core.UpdateFeed('HN', cb);

            expect(cb).toHaveBeenCalled();
            const links = cb.mock.calls[0][0];
            expect(links[0].Title).toBe('Test');
        });

        it('UpdateFeed handles error', () => {
            const cb = jest.fn();
            core.SaveFeeds({ 'HN': 'http://error.com' });

            const x = new XMLHttpRequest();
            // Since we set the URL to error.com, it will contain 'error' and trigger onerror in mock
            jest.spyOn(global, 'XMLHttpRequest').mockImplementation(() => x);

            core.UpdateFeed('HN', cb);
            expect(cb).toHaveBeenCalledWith([]);
        });

        it('UpdateFeed handles 404', () => {
            const cb = jest.fn();
            const x = new XMLHttpRequest();
            x.status = 404;
            jest.spyOn(global, 'XMLHttpRequest').mockImplementation(() => {
                const req = new x.constructor();
                req.status = 404;
                return req;
            });

            // Need to override the mock implementation properly or pass status
            // Since my simple mock just sets 200 on send(), we need to subclass or modify it for this test
            // Redefine send for this test instance
            const req = new XMLHttpRequest();
            req.send = function () {
                this.status = 404;
                this.onload && this.onload();
            };
            jest.spyOn(global, 'XMLHttpRequest').mockImplementation(() => req);

            core.UpdateFeed('HN', cb);
            expect(cb).toHaveBeenCalledWith([]);
        });

    });

    describe('Feed Parsing', () => {
        it('onRssSuccess handles empty doc', () => {
            const cb = jest.fn();
            core.onRssSuccess('HN', null, cb);
            // Should fail
            // handleFeedParsingFailed called
        });

        it('parseFeedLinks handles Atom format', () => {
            const atomXml = `
                <feed>
                    <entry>
                        <title>Atom Title</title>
                        <link href="http://atom.com"/>
                    </entry>
                </feed>
            `;
            const links = core.parseFeedLinks(atomXml);
            expect(links[0].Title).toBe('Atom Title');
            expect(links[0].Link).toBe('http://atom.com');
        });

        it('parseFeedLinks handles missing title/link', () => {
            const badXml = `
                <rss><channel><item>
                </item></channel></rss>
            `;
            const links = core.parseFeedLinks(badXml);
            expect(links[0].Title).toBe('Unknown Title');
            expect(links[0].Link).toBe('');
        });

        it('parseFeedLinks fallback to comments link', () => {
            // Mock seems to handle simple structure, assume comments tag works
            // My DOMParsermock is very simple regex, need to check if it supports <comments>
            // The mock uses generic tag matching, so it should work.

            // BUT my mock getElementsByTagName('link') returns empty if no link.
            // Code: var itemLink = item.getElementsByTagName('link')[0];
            // In my mock, item.getElementsByTagName returns array of objects.

            // core.js:
            // var itemLink = item.getElementsByTagName('link')[0];
            // if (!itemLink || !itemLink.textContent) ...

            // Test logic for comments fallback
            const xml = `<rss><channel><item>
                  <title>T</title>
                  <comments>http://comments.com</comments>
               </item></channel></rss>`;

            const links = core.parseFeedLinks(xml);
            expect(links[0].Link).toBe('http://comments.com');
        });
    });

    describe('Mixed Feed', () => {
        it('GetMixedFeed works with cached links', () => {
            const links = [{ Title: 'T1', Link: 'L1' }]
            core.SaveLinksToLocalStorage('HN', links);
            core.SaveLinksToLocalStorage('LWN', links);

            const cb = jest.fn();
            core.GetMixedFeed(cb);

            expect(cb).toHaveBeenCalled();
            const result = cb.mock.calls[0][0];
            expect(result.length).toBeGreaterThan(0);
        });

        it('GetMixedFeed works with empty feeds', () => {
            core.SaveFeeds({});
            const cb = jest.fn();
            core.GetMixedFeed(cb);
            expect(cb).toHaveBeenCalledWith([]);
        });

        it('GetMixedFeed updates if not cached', () => {
            localStorage.clear();
            core.SaveFeeds({ 'HN': 'url' });

            const x = new XMLHttpRequest();
            x.mockResponse = '<rss><item><title>T</title><link>L</link></item></rss>';
            jest.spyOn(global, 'XMLHttpRequest').mockImplementation(() => x);

            const cb = jest.fn();
            core.GetMixedFeed(cb);
            expect(cb).toHaveBeenCalled();
        });
    });

    describe('Utilities', () => {
        it('printTime formats correctly', () => {
            const d = new Date(2023, 0, 1, 9, 5); // 9:05 AM
            expect(core.printTime(d)).toBe('9:05 AM');

            const d2 = new Date(2023, 0, 1, 13, 10); // 1:10 PM
            expect(core.printTime(d2)).toBe('1:10 PM');

            const d3 = new Date(2023, 0, 1, 0, 15); // 12:15 AM
            expect(core.printTime(d3)).toBe('12:15 AM');
        });

        it('openUrl validates protocol', () => {
            core.openUrl('javascript:alert(1)', true);
            expect(browser.tabs.create).not.toHaveBeenCalled();

            core.openUrl('http://test.com', true);
            expect(browser.tabs.create).toHaveBeenCalled();
        });

        it('hideElement/showElement/toggle', () => {
            const el = document.createElement('div');
            el.id = 'test';
            document.body.appendChild(el);

            core.hideElement('test');
            expect(el.style.display).toBe('none');

            core.showElement('test');
            expect(el.style.display).toBe('block');

            core.toggle('test');
            expect(el.style.display).toBe('none');
            core.toggle('test');
            expect(el.style.display).toBe('block');
        });
    });

    describe('Parsing Fallback', () => {
        it('parseXml uses ActiveXObject if available (IE)', () => {
            // This test is tricky in JSDOM environment, but we can try to force the path
            // core.js uses ActiveXObject if new DOMParser fails or just try block?
            // "try { xmlDoc = new ActiveXObject... } catch(e) { xmlDoc = (new DOMParser)... }"
            // Since JSDOM has DOMParser, it usually goes there.
            // If we delete DOMParser?
            const originalDOMParser = global.DOMParser;
            delete global.DOMParser;
            global.ActiveXObject = class {
                constructor() { this.async = false; }
                loadXML(x) { this.xml = x; } // simple mock
            };

            // Wait, parseXml returns xmlDoc.
            // If ActiveXObject is used, it returns that object.

            // But core.js: 
            // try { xmlDoc = new ActiveXObject...; xmlDoc.loadXML(xml) } catch...

            // In setup.js I mocked ActiveXObject.
            // If I want to hit that branch, I should make sure it doesn't throw.
            // But line 167 `new ActiveXObject` might throw if not defined?
            // I defined it in setup.js.
            // But line 172 is catch block.
            // Wait, core.js attempts ActiveXObject FIRST.
            // So if I have ActiveXObject mocked, it should take that path!

            // Let's see if parseXml is exported. Yes.
            const doc = core.parseXml('<xml/>');
            // If it used ActiveXObject, result should be instance of my mock.
            expect(doc).toBeInstanceOf(global.ActiveXObject);

            // Restore
            global.DOMParser = originalDOMParser;
        });

        it('parseXml falls back to DOMParser', () => {
            // To force fallback, ActiveXObject must throw
            const originalActiveX = global.ActiveXObject;
            global.ActiveXObject = function () { throw new Error('No IE'); };

            const doc = core.parseXml('<xml/>');
            // Should return what DOMParser returns (my mock returns object with getElementsByTagName)
            expect(doc.getElementsByTagName).toBeDefined();

            global.ActiveXObject = originalActiveX;
        });
    });
});
