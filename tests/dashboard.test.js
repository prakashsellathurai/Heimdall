/**
 * @jest-environment jsdom
 */

const core = require('../js/core');
Object.assign(global, core); // Inject globals

const dashboard = require('../js/dashboard');

describe('Dashboard Logic', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="sidebar-feeds"></div>
            
            <div id="view-home" style="display:none">
                <div id="home-articles"></div>
            </div>
            <div id="view-feed" style="display:none">
                <h2 id="feed-title"></h2>
                <div id="feed-articles"></div>
            </div>
            <div id="view-settings" style="display:none">
                <div id="manage-feeds-list"></div>
                <input id="new-feed-name" />
                <input id="new-feed-url" />
                <button id="add-feed-btn"></button>
            </div>
            
            <div id="preview-panel" class="">
                <button id="close-preview-btn"></button>
                <div id="preview-url"></div>
                <iframe id="preview-frame"></iframe>
            </div>
            
            <!-- Static nav items -->
            <div class="nav-item" data-view="home">Home</div>
            <div class="nav-item" data-view="settings">Settings</div>
        `;

        jest.clearAllMocks();
        localStorage.clear();

        // Mock Core
        global.LoadFeeds = jest.fn().mockReturnValue({
            "Feed1": "http://f1.com",
            "Feed2": "http://f2.com"
        });
        global.AddFeed = jest.fn();
        global.RemoveFeed = jest.fn();
        // Mock async callbacks
        global.GetMixedFeed = jest.fn((cb) => cb([
            { Title: 'M1', Link: 'http://m1.com' },
            { Title: 'M2', Link: 'http://m2.com', CommentsLink: 'http://c2.com' }
        ]));
        global.UpdateFeed = jest.fn((k, cb) => cb([
            { Title: k + '1', Link: 'http://k1.com' }
        ]));

        global.alert = jest.fn();
        global.confirm = jest.fn().mockReturnValue(true);
    });

    it('initDashboard loads view', () => {
        dashboard.initDashboard();
        expect(document.getElementById('sidebar-feeds').children.length).toBe(2);

        // Default view is home
        expect(document.getElementById('view-home').style.display).toBe('block');
        expect(global.GetMixedFeed).toHaveBeenCalled();
    });

    it('setupDashboardEvents attaches listeners', () => {
        dashboard.setupDashboardEvents();

        // Test nav item click
        const homeNav = document.querySelector('.nav-item[data-view="home"]');
        homeNav.click();
        expect(document.getElementById('view-home').style.display).toBe('block');

        // Test add feed btn
        const addBtn = document.getElementById('add-feed-btn');
        // Click handled by handleAddFeedDashboard
        // We can test that via direct call or click event if listeners are attached
        // Listeners are attached by setupDashboardEvents

        // Since setupDashboardEvents is called, click should work
        // But we need to verify side effect (alert or mock call)
        document.getElementById('new-feed-name').value = ''; // invalid
        addBtn.click();
        expect(global.alert).toHaveBeenCalled();
    });

    it('showView switches views', () => {
        dashboard.showView('settings');
        expect(document.getElementById('view-home').style.display).toBe('none');
        expect(document.getElementById('view-settings').style.display).toBe('block');

        // Should render settings
        expect(document.getElementById('manage-feeds-list').children.length).toBeGreaterThan(0);
    });

    it('showView feed loads feed', () => {
        dashboard.showView('feed', 'Feed1');
        expect(document.getElementById('view-feed').style.display).toBe('block');
        expect(document.getElementById('feed-title').textContent).toBe('Feed1');
        expect(global.UpdateFeed).toHaveBeenCalledWith('Feed1', expect.any(Function));
    });

    it('renderArticle creates cards', () => {
        const item = { Title: 'T', Link: 'L', CommentsLink: 'C' };
        const card = dashboard.renderArticle(item, 1);

        expect(card.className).toBe('article-card');
        expect(card.innerHTML).toContain('T');
        expect(card.innerHTML).toContain('(comments)');

        // Test click on title
        const link = card.querySelector('.article-title');
        link.click();

        // Check preview opened
        const panel = document.getElementById('preview-panel');
        expect(panel.classList.contains('open')).toBe(true);
        expect(document.getElementById('preview-frame').src).toContain('L');
    });

    it('closePreview resets panel', () => {
        jest.useFakeTimers();
        dashboard.openInPreview('http://test.com');
        dashboard.closePreview();

        const panel = document.getElementById('preview-panel');
        expect(panel.classList.contains('open')).toBe(false);

        jest.runAllTimers();
        expect(document.getElementById('preview-frame').src).toBe('about:blank');
        jest.useRealTimers();
    });

    describe('Feed Management', () => {
        it('handleAddFeedDashboard success', () => {
            document.getElementById('new-feed-name').value = 'New';
            document.getElementById('new-feed-url').value = 'http://new.com';

            dashboard.handleAddFeedDashboard();

            expect(global.AddFeed).toHaveBeenCalledWith('New', 'http://new.com');
            expect(global.alert).toHaveBeenCalledWith('Feed added successfully!');
        });

        it('handleAddFeedDashboard validation', () => {
            dashboard.handleAddFeedDashboard();
            expect(global.alert).toHaveBeenCalledWith('Please fill in both fields');
        });

        it('Settings unsubscribe works', () => {
            dashboard.renderSettings();
            const removeBtn = document.querySelector('.btn-danger');
            removeBtn.click();

            expect(global.confirm).toHaveBeenCalled();
            expect(global.RemoveFeed).toHaveBeenCalledWith('Feed1'); // First one iteration order
        });
    });
});
