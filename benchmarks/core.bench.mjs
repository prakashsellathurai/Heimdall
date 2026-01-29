
import { run, bench, group } from 'mitata';
import { JSDOM } from 'jsdom';
import { createRequire } from 'module';

// Setup Mock Environment for core.js
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: "http://localhost/",
});
global.window = dom.window;
global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser;
global.Node = dom.window.Node;

// Simple LocalStorage Mock
global.localStorage = {
    _data: {},
    getItem(key) { return this._data[key] || null; },
    setItem(key, value) { this._data[key] = String(value); },
    removeItem(key) { delete this._data[key]; },
    clear() { this._data = {}; }
};

// Also proxy property access for localStorage[key]
const localStorageProxy = new Proxy(global.localStorage, {
    get: function (target, prop) {
        if (prop in target) return target[prop];
        return target.getItem(prop);
    },
    set: function (target, prop, value) {
        if (prop in target) return target[prop] = value;
        target.setItem(prop, value);
        return true;
    }
});
global.localStorage = localStorageProxy;


// Import core.js (CommonJS)
const require = createRequire(import.meta.url);
const core = require('../js/core.js');

// Test Data Generation
function generateXML(itemCount) {
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
const mediumXML = generateXML(20); // core.js maxFeedItems is 15, so this hits the limit
const largeXML = generateXML(100);
const extraLargeXML = generateXML(1000);

group('Feed Parsing', () => {
    bench('Small Feed (5 items) [Baseline]', () => {
        core.parseFeedLinks(smallXML);
    });

    bench('Medium Feed (20 items)', () => {
        core.parseFeedLinks(mediumXML);
    });

    bench('Large Feed (100 items)', () => {
        core.parseFeedLinks(largeXML);
    });

    bench('Extra Large Feed (1000 items)', () => {
        core.parseFeedLinks(extraLargeXML);
    });
});

await run();
