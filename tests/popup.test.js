/**
 * @jest-environment jsdom
 */

const core = require('../js/core');
// Inject core functions into global scope as popup.js expects them (browser environment)
Object.assign(global, core);

// Now require popup

describe('Popup Logic', () => {
    let popup;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = `
            <div id="tabs"></div>
            <table id="feed"></table>
            <div id="container" style="display:none"></div>
            <div id="spinner" style="display:none"></div>
            <button id="refresh"></button>
            <button id="open-options"></button>
        `;
        jest.clearAllMocks();
        localStorage.clear();

        // Mock core functions used by popup
        Object.assign(global, core); // ensure globals set
        global.LoadFeeds = jest.fn().mockReturnValue({
            "HN": "http://hn.com",
            "LWN": "http://lwn.com"
        });
        global.GetMixedFeed = jest.fn((cb) => cb([{ Title: 'Mixed', Link: 'http://m.com' }]));
        global.RetrieveLinksFromLocalStorage = jest.fn().mockReturnValue([{ Title: 'Cache', Link: 'http://cache.com' }]);
        global.UpdateFeed = jest.fn((key) => { }); // async/callbacks usually
        global.buildPopupAfterResponse = false;

        // Reset modules to get fresh popup instance with fresh state vars
        jest.resetModules();
        // we need to re-mock core imports if they were required?
        // popup.js doesn't require core.js (it expects globals).
        // But we need to make sure 'core' is still available.
        popup = require('../js/popup');
    });

    it('setupEvents attaches listeners', () => {
        // We need to trigger the logic manually or via setupEvents
        popup.setupEvents();

        const refreshBtn = document.getElementById('refresh');
        const optionsBtn = document.getElementById('open-options');

        // Setup spies
        // refreshLinks is internal? No, exported.
        // But setupEvents caches the function reference *inside* popup.js?
        // popup.js: document.getElementById("refresh").addEventListener('click', refreshLinks, false);
        // refreshLinks is defined in popup.js scope.

        // To test if it calls refreshLinks, we can spy on the exported one IF it uses the exported one?
        // No, it uses the internal one. 
        // We can check side effects.

        // Test refresh click
        refreshBtn.click();
        expect(document.getElementById('spinner').style.display).toBe('block');

        // Test options click
        optionsBtn.click();
        expect(browser.runtime.openOptionsPage).toHaveBeenCalled();
    });


    it('switchTab updates UI and content', () => {
        popup.renderTabs(); // needed for listener attachment if we tested that, but switchTab is direct
        popup.switchTab('HN');

        expect(localStorage["Heimdall.LastPopupFeed"]).toBe('HN');
        expect(global.RetrieveLinksFromLocalStorage).toHaveBeenCalledWith('HN');
        // buildPopup called with cached results
        const feed = document.getElementById('feed');
        expect(feed.children.length).toBe(1); // 1 item from mock
    });
    
    it('switchTab triggers refresh if cache miss', () => {
        global.RetrieveLinksFromLocalStorage.mockReturnValue(null);
        popup.switchTab('LWN');
        // valid cache miss -> refreshLinks -> UpdateFeed
        expect(global.UpdateFeed).toHaveBeenCalledWith('LWN');
    });

    describe('buildPopup', () => {
        it('handles empty links', () => {
            popup.buildPopup([]);
            const feed = document.getElementById('feed');
            expect(feed.innerHTML).toContain('No items found');
            expect(document.getElementById('container').style.display).toBe('block');
        });

        it('renders links', () => {
            const links = [
                { Title: 'T1', Link: 'http://t1.com', CommentsLink: 'http://c1.com' },
                { Title: 'T2', Link: 'http://t2.com' }
            ];
            popup.buildPopup(links);

            const rows = document.querySelectorAll('.link');
            expect(rows.length).toBe(2);

            // First item has comments
            expect(rows[0].innerHTML).toContain('(comments)');

            // Second item no comments
            expect(rows[1].innerHTML).not.toContain('(comments)');
        });
    });

    it('refreshLinks updates UI and triggers feed update', () => {
        popup.refreshLinks();
        expect(document.getElementById('spinner').style.display).toBe('block');
        expect(global.UpdateFeed).toHaveBeenCalled();
    });

    it('main handles initialization', () => {
        // Default is Home
        popup.main();
        expect(global.GetMixedFeed).toHaveBeenCalled();

        // Set storage
        global.currentFeed = 'HN'; // update internal var? 
        // currentFeed is top level var in popup.js.
        // modifying exports won't change internal var if it's not exported/assigned?
        // In popup.js:
        // var currentFeed = localStorage["Heimdall.LastPopupFeed"] || "Home";
        // We can't easily change `currentFeed` from outside unless we reload module.

        // BUT switchTab changes it.
        popup.switchTab('LWN');
        popup.main();
        // Should call RetrieveLinks
        expect(global.RetrieveLinksFromLocalStorage).toHaveBeenCalledWith('LWN');
    });
});
