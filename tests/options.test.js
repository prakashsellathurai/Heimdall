/**
 * @jest-environment jsdom
 */

const core = require('../js/core');
Object.assign(global, core); // Inject globals

const options = require('../js/options');

describe('Options Page', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <input id="feed-name" />
            <input id="feed-url" />
            <button id="add-btn"></button>
            <div id="feed-list"></div>
        `;
        jest.clearAllMocks();
        localStorage.clear();

        // Mock Core
        global.LoadFeeds = jest.fn().mockReturnValue({
            "Existing": "http://ex.com"
        });
        global.AddFeed = jest.fn();
        global.RemoveFeed = jest.fn();
        global.UpdateFeed = jest.fn((n, cb) => cb([{ Title: 'Preview', Link: 'http://p.com' }]));

        // Mock confirm
        global.confirm = jest.fn().mockReturnValue(true);
        global.alert = jest.fn();
    });

    it('renderFeedList displays feeds', () => {
        options.renderFeedList();
        const list = document.getElementById('feed-list');
        expect(list.innerHTML).toContain('Existing');
        expect(list.innerHTML).toContain('http://ex.com');

        // Should trigger update for preview
        expect(global.UpdateFeed).toHaveBeenCalledWith('Existing', expect.any(Function));
    });

    it('handleAddFeed validates input', () => {
        options.handleAddFeed();
        expect(global.alert).toHaveBeenCalledWith('Please provide both a name and a URL.');

        document.getElementById('feed-name').value = 'New';
        document.getElementById('feed-url').value = 'ftp://bad';
        options.handleAddFeed();
        expect(global.alert).toHaveBeenCalledWith('URL must start with http or https.');
    });

    it('handleAddFeed adds feed', () => {
        document.getElementById('feed-name').value = 'NewFeed';
        document.getElementById('feed-url').value = 'http://new.com';

        options.handleAddFeed();

        expect(global.AddFeed).toHaveBeenCalledWith('NewFeed', 'http://new.com');
        // renderFeedList called again
        expect(global.LoadFeeds).toHaveBeenCalledTimes(1); // once after add (initial manual call not counted as we didn't call renderFeedList before)
    });

    it('Remove button removes feed', () => {
        options.renderFeedList();
        const removeBtn = document.querySelector('.remove-btn');
        removeBtn.click();

        expect(global.confirm).toHaveBeenCalled();
        expect(global.RemoveFeed).toHaveBeenCalledWith('Existing');
    });
});
