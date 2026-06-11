import './setup';
import { MockXMLHttpRequest } from './xml-mock';

describe('Dashboard Logic', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="sidebar-feeds"></div>
      <div id="view-home" style="display:none">
        <div id="header"><span>Home Feed</span><button type="button" id="refresh-btn" class="btn btn-refresh">Refresh</button></div>
        <div id="home-articles"></div>
      </div>
      <div id="view-feed" style="display:none">
        <div id="header"><span id="feed-title"></span><button type="button" id="refresh-btn" class="btn btn-refresh">Refresh</button></div>
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
      <div class="nav-item" data-view="home">Home</div>
      <div class="nav-item" data-view="settings">Settings</div>
    `;
    localStorage.clear();
  });

  it('renderSidebarFeeds renders feed list', async () => {
    localStorage.setItem(
      'Heimdall.Feeds',
      JSON.stringify({ F1: 'http://f1.com', F2: 'http://f2.com' }),
    );
    const { clearFeedsCache } = await import('../src/core/storage');
    clearFeedsCache();

    const { renderSidebarFeeds } = await import('../src/dashboard/dashboard');
    renderSidebarFeeds();

    const items = document.querySelectorAll('.nav-item[data-view="feed"]');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe('F1');
  });

  it('showView switches to settings view', async () => {
    const { showView } = await import('../src/dashboard/dashboard');
    showView('settings');

    expect(document.getElementById('view-home')?.style.display).toBe('none');
    expect(document.getElementById('view-settings')?.style.display).toBe('block');
  });

  it('renderArticle creates card with preview on click', async () => {
    const { renderArticle } = await import('../src/dashboard/dashboard');
    const item = {
      Title: 'T',
      Link: 'http://t.com',
      CommentsLink: 'http://c.com',
    };
    const card = renderArticle(item, 1);

    expect(card.className).toBe('article-card');
    expect(card.innerHTML).toContain('(comments)');

    const link = card.querySelector('.article-title') as HTMLElement;
    link.click();

    const panel = document.getElementById('preview-panel');
    expect(panel?.classList.contains('open')).toBe(true);
    expect(document.getElementById('preview-url')?.textContent).toBe('http://t.com');
  });

  it('closePreview resets iframe', async () => {
    jest.useFakeTimers();
    const { openInPreview, closePreview } = await import('../src/dashboard/dashboard');

    openInPreview('http://test.com');
    closePreview();

    const panel = document.getElementById('preview-panel');
    expect(panel?.classList.contains('open')).toBe(false);

    jest.runAllTimers();
    const frame = document.getElementById('preview-frame') as HTMLIFrameElement;
    expect(frame?.src).toBe('about:blank');
    jest.useRealTimers();
  });

  it('renderSettings shows feeds with unsubscribe buttons', async () => {
    localStorage.setItem(
      'Heimdall.Feeds',
      JSON.stringify({ F1: 'http://f1.com', F2: 'http://f2.com' }),
    );
    const { clearFeedsCache } = await import('../src/core/storage');
    clearFeedsCache();

    const { renderSettings } = await import('../src/dashboard/dashboard');
    renderSettings();

    const btns = document.querySelectorAll('.btn-danger');
    expect(btns.length).toBe(2);
  });

  it('handleAddFeedDashboard shows toast on invalid input', async () => {
    const { handleAddFeedDashboard } = await import('../src/dashboard/dashboard');
    handleAddFeedDashboard();

    const toast = document.getElementById('heimdall-toast');
    expect(toast?.textContent).toContain('Please fill in both fields');
  });

  it('handleRefresh on home view fetches and renders all feeds', async () => {
    localStorage.setItem(
      'Heimdall.Feeds',
      JSON.stringify({ F1: 'http://f1.com/rss', F2: 'http://f2.com/rss' }),
    );
    const { clearFeedsCache } = await import('../src/core/storage');
    clearFeedsCache();

    const homeView = document.getElementById('view-home');
    if (homeView) homeView.style.display = 'block';

    MockXMLHttpRequest.nextResponse = `<?xml version="1.0"?><rss version="2.0"><channel>
      <item><title>Article A</title><link>http://a.com</link></item>
      <item><title>Article B</title><link>http://b.com</link><comments>http://b.com/c</comments></item>
    </channel></rss>`;
    MockXMLHttpRequest.nextStatus = 200;
    MockXMLHttpRequest.nextUrlContainsError = false;

    const { handleRefresh } = await import('../src/dashboard/dashboard');
    handleRefresh();

    const container = document.getElementById('home-articles');
    expect(container?.innerHTML).toContain('Article A');
    expect(container?.innerHTML).toContain('Article B');
  });

  it('handleRefresh on home view shows empty message when no feeds', async () => {
    localStorage.setItem('Heimdall.Feeds', JSON.stringify({}));
    const { clearFeedsCache } = await import('../src/core/storage');
    clearFeedsCache();

    const homeView = document.getElementById('view-home');
    if (homeView) homeView.style.display = 'block';

    const { handleRefresh } = await import('../src/dashboard/dashboard');
    handleRefresh();

    const container = document.getElementById('home-articles');
    expect(container?.textContent).toContain('No articles found');
  });

  it('handleRefresh on feed view fetches and renders the active feed', async () => {
    localStorage.setItem(
      'Heimdall.Feeds',
      JSON.stringify({ HN: 'http://hn.com/rss', LWN: 'http://lwn.com/rss' }),
    );
    localStorage.setItem('Heimdall.LastDashboardFeed', 'LWN');
    const { clearFeedsCache } = await import('../src/core/storage');
    clearFeedsCache();

    document.getElementById('view-home')!.style.display = 'none';
    document.getElementById('view-feed')!.style.display = 'block';

    MockXMLHttpRequest.nextResponse = `<?xml version="1.0"?><rss version="2.0"><channel>
      <item><title>LWN Story</title><link>http://lwn.com/1</link></item>
    </channel></rss>`;
    MockXMLHttpRequest.nextStatus = 200;
    MockXMLHttpRequest.nextUrlContainsError = false;

    const { handleRefresh } = await import('../src/dashboard/dashboard');
    handleRefresh();

    const container = document.getElementById('feed-articles');
    expect(container?.innerHTML).toContain('LWN Story');
  });
});
