import './setup';

describe('Popup Logic', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="tabs"></div>
      <table id="feed"></table>
      <div id="container" style="display:none"></div>
      <div id="spinner" style="display:none"></div>
      <a href="" id="refresh">Refresh</a>
      <a href="" id="open-options">Dashboard</a>
    `;
    localStorage.clear();
  });

  it('buildPopup renders links with comments', async () => {
    const { buildPopup } = await import('../src/popup/popup');
    const links = [
      { Title: 'T1', Link: 'http://t1.com', CommentsLink: 'http://c1.com' },
      { Title: 'T2', Link: 'http://t2.com', CommentsLink: '' },
    ];
    buildPopup(links);

    const rows = document.querySelectorAll('.link');
    expect(rows.length).toBe(2);
    expect(rows[0].innerHTML).toContain('(comments)');
    expect(rows[1].innerHTML).not.toContain('(comments)');
  });

  it('buildPopup handles empty links', async () => {
    const { buildPopup } = await import('../src/popup/popup');
    buildPopup([]);

    const feed = document.getElementById('feed');
    expect(feed?.innerHTML).toContain('No items found');
    expect(document.getElementById('container')?.style.display).toBe('block');
  });

  it('renderTabs renders Home and feed tabs', async () => {
    localStorage.setItem('Heimdall.Feeds', JSON.stringify({ HN: 'http://hn.com', LWN: 'http://lwn.com' }));
    const { clearFeedsCache } = await import('../src/core/storage');
    clearFeedsCache();

    const { renderTabs } = await import('../src/popup/popup');
    renderTabs();

    const tabs = document.querySelectorAll('.tab-button');
    expect(tabs.length).toBe(3);
    expect(tabs[0].textContent).toBe('Home');
    expect(tabs[1].textContent).toBe('HN');
    expect(tabs[2].textContent).toBe('LWN');
  });

  it('switchTab changes active tab', async () => {
    localStorage.setItem('Heimdall.Feeds', JSON.stringify({ HN: 'http://hn.com' }));
    const { clearFeedsCache } = await import('../src/core/storage');
    clearFeedsCache();

    const { renderTabs, switchTab } = await import('../src/popup/popup');
    renderTabs();
    switchTab('HN');

    expect(localStorage.getItem('Heimdall.LastPopupFeed')).toBe('HN');
    const activeTabs = document.querySelectorAll('.tab-button.active');
    expect(activeTabs.length).toBe(1);
    expect(activeTabs[0].textContent).toBe('HN');
  });
});
