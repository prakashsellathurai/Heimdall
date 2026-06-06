import { FeedItem, STORAGE_KEYS } from '../types';
import { getFeeds, getFeedLinks } from '../core/storage';
import { getMixedFeed, updateFeed, setOnFeedUpdate, triggerFeedUpdate } from '../core/feeds';
import { openUrl, openOptionsPage } from '../core/browser';

let currentFeed: string = localStorage.getItem(STORAGE_KEYS.LAST_POPUP_FEED) || 'Home';

setOnFeedUpdate((key: string) => {
  if (key === currentFeed) {
    const cached = getFeedLinks(key);
    if (cached) buildPopup(cached);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  renderTabs();
  main();
  setupEvents();
});

export { renderTabs, switchTab, main, buildPopup, refreshLinks, setupEvents };

function setupEvents(): void {
  const refreshBtn = document.getElementById('refresh');
  refreshBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    refreshLinks();
  });

  const optionsBtn = document.getElementById('open-options');
  optionsBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    openOptionsPage();
  });

  document.querySelectorAll('.tab-button').forEach((tab) => {
    tab.addEventListener('click', () => {
      const feed = (tab as HTMLElement).getAttribute('data-feed');
      if (feed) switchTab(feed);
    });
  });
}

function renderTabs(): void {
  const feeds = getFeeds();
  const tabsContainer = document.getElementById('tabs');
  if (!tabsContainer) return;
  tabsContainer.innerHTML = '';

  const homeBtn = document.createElement('button');
  homeBtn.className = 'tab-button' + (currentFeed === 'Home' ? ' active' : '');
  homeBtn.setAttribute('data-feed', 'Home');
  homeBtn.textContent = 'Home';
  tabsContainer.appendChild(homeBtn);

  for (const key in feeds) {
    if (Object.prototype.hasOwnProperty.call(feeds, key)) {
      const btn = document.createElement('button');
      btn.className = 'tab-button' + (currentFeed === key ? ' active' : '');
      btn.setAttribute('data-feed', key);
      btn.textContent = key;
      tabsContainer.appendChild(btn);
    }
  }
}

function switchTab(feedKey: string): void {
  if (currentFeed === feedKey) return;

  currentFeed = feedKey;
  localStorage.setItem(STORAGE_KEYS.LAST_POPUP_FEED, currentFeed);

  document.querySelectorAll('.tab-button').forEach((btn) => {
    const feed = (btn as HTMLElement).getAttribute('data-feed');
    if (feed === feedKey) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (currentFeed === 'Home') {
    getMixedFeed((links) => buildPopup(links));
  } else {
    const cached = getFeedLinks(currentFeed);
    buildPopup(cached);
    if (!cached) {
      refreshLinks();
    }
  }
}

function main(): void {
  if (currentFeed === 'Home') {
    getMixedFeed((links) => buildPopup(links));
  } else {
    const links = getFeedLinks(currentFeed);
    if (links === null) {
      triggerFeedUpdate(currentFeed, []);
      updateFeed(currentFeed);
    } else {
      buildPopup(links);
    }
  }
}

function buildPopup(links: FeedItem[] | null): void {
  const feed = document.getElementById('feed');
  if (!feed) return;

  while (feed.firstChild) feed.removeChild(feed.firstChild);

  if (!links || links.length === 0) {
    const row = document.createElement('tr');
    const col = document.createElement('td');
    col.textContent = 'No items found. Try refreshing.';
    col.className = 'error';
    row.appendChild(col);
    feed.appendChild(row);
    showElement('container');
    hideElement('spinner');
    return;
  }

  for (let i = 0; i < links.length; i++) {
    const item = links[i];
    const row = document.createElement('tr');
    row.className = 'link';

    const num = document.createElement('td');
    num.textContent = String(i + 1);

    const linkCol = document.createElement('td');
    const title = document.createElement('a');
    title.className = 'link_title';
    title.textContent = item.Title;
    title.href = item.Link;
    title.addEventListener('click', (e) => {
      e.preventDefault();
      const anchor = e.currentTarget as HTMLAnchorElement;
      openUrl(anchor.href, localStorage.getItem(STORAGE_KEYS.BACKGROUND_TABS) === 'false');
    });
    linkCol.appendChild(title);

    if (item.CommentsLink) {
      const comments = document.createElement('a');
      comments.className = 'comments';
      comments.textContent = '(comments)';
      comments.href = item.CommentsLink;
      comments.addEventListener('click', (e) => {
        e.preventDefault();
        const anchor = e.currentTarget as HTMLAnchorElement;
        openUrl(anchor.href, localStorage.getItem(STORAGE_KEYS.BACKGROUND_TABS) === 'false');
      });
      linkCol.appendChild(comments);
    }

    row.appendChild(num);
    row.appendChild(linkCol);
    feed.appendChild(row);
  }

  hideElement('spinner');
  showElement('container');
}

function refreshLinks(): void {
  const feed = document.getElementById('feed');
  if (feed) {
    while (feed.firstChild) feed.removeChild(feed.firstChild);
  }

  hideElement('container');
  showElement('spinner');

  updateFeed(currentFeed);
}

function hideElement(id: string): void {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function showElement(id: string): void {
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
}
