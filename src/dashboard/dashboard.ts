import { getMixedFeed, updateFeed } from '../core/feeds';
import { addFeed, getFeedLinks, getFeeds, removeFeed } from '../core/storage';
import { type FeedItem, STORAGE_KEYS } from '../types';

function showToast(message: string): void {
  const existing = document.getElementById("heimdall-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "heimdall-toast";
  toast.textContent = message;
  toast.style.cssText =
    "position:fixed;bottom:20px;right:20px;background:#333;color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;z-index:9999;opacity:0;transition:opacity 0.2s;box-shadow:0 2px 8px rgba(0,0,0,0.3)";
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 200);
  }, 2000);
}

window.addEventListener("DOMContentLoaded", () => {
  initDashboard();
});

function initDashboard(): void {
  renderSidebarFeeds();
  setupDashboardEvents();
  const lastView =
    localStorage.getItem(STORAGE_KEYS.LAST_DASHBOARD_VIEW) || "home";
  const lastFeed = localStorage.getItem(STORAGE_KEYS.LAST_DASHBOARD_FEED);
  showView(lastView, lastFeed);
}

function setupDashboardEvents(): void {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      const view = (item as HTMLElement).getAttribute("data-view");
      const feed = (item as HTMLElement).getAttribute("data-feed");
      if (view) showView(view, feed);
    });
  });

  const addBtn = document.getElementById("add-feed-btn");
  addBtn?.addEventListener("click", handleAddFeedDashboard);

  const closeBtn = document.getElementById("close-preview-btn");
  closeBtn?.addEventListener("click", closePreview);
}

function showView(viewId: string, feedKey?: string | null): void {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
    const v = (item as HTMLElement).getAttribute("data-view");
    const f = (item as HTMLElement).getAttribute("data-feed");
    if (v === viewId && (!feedKey || f === feedKey)) {
      item.classList.add("active");
    }
  });

  localStorage.setItem(STORAGE_KEYS.LAST_DASHBOARD_VIEW, viewId);
  if (feedKey) {
    localStorage.setItem(STORAGE_KEYS.LAST_DASHBOARD_FEED, feedKey);
  } else {
    localStorage.removeItem(STORAGE_KEYS.LAST_DASHBOARD_FEED);
  }

  const homeView = document.getElementById("view-home");
  const feedView = document.getElementById("view-feed");
  const settingsView = document.getElementById("view-settings");
  if (homeView) homeView.style.display = "none";
  if (feedView) feedView.style.display = "none";
  if (settingsView) settingsView.style.display = "none";

  const target = document.getElementById(`view-${viewId}`);
  if (target) target.style.display = 'block';

  if (viewId === "home") {
    renderHomeFeed();
  } else if (viewId === "feed") {
    renderIndividualFeed(feedKey);
  } else if (viewId === "settings") {
    renderSettings();
  }
}

function renderSidebarFeeds(): void {
  const feeds = getFeeds();
  const container = document.getElementById("sidebar-feeds");
  if (!container) return;
  container.innerHTML = "";

  for (const key in feeds) {
    if (Object.hasOwn(feeds, key)) {
      const item = document.createElement('div');
      item.className = 'nav-item';
      item.setAttribute('data-view', 'feed');
      item.setAttribute('data-feed', key);
      item.textContent = key;
      item.addEventListener("click", () => showView("feed", key));
      container.appendChild(item);
    }
  }
}

function renderArticle(item: FeedItem, id: number): HTMLDivElement {
  const card = document.createElement("div");
  card.className = "article-card";

  const title = document.createElement("a");
  title.className = "article-title";
  title.href = item.Link;
  title.textContent = `${id}. ${item.Title}`;
  title.addEventListener('click', (e) => {
    e.preventDefault();
    openInPreview(item.Link);
  });
  card.appendChild(title);

  if (item.CommentsLink) {
    const meta = document.createElement("a");
    meta.className = "article-meta";
    meta.href = item.CommentsLink;
    meta.textContent = "  |  (comments)";
    meta.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openInPreview(item.CommentsLink);
    });
    card.appendChild(meta);
  }

  return card;
}

function openInPreview(url: string): void {
  const panel = document.getElementById("preview-panel");
  const frame = document.getElementById(
    "preview-frame",
  ) as HTMLIFrameElement | null;
  const urlDisplay = document.getElementById("preview-url");

  if (frame) frame.src = url;
  if (urlDisplay) urlDisplay.textContent = url;
  panel?.classList.add("open");
}

function closePreview(): void {
  const panel = document.getElementById("preview-panel");
  const frame = document.getElementById(
    "preview-frame",
  ) as HTMLIFrameElement | null;
  panel?.classList.remove("open");
  setTimeout(() => {
    if (frame) frame.src = "about:blank";
  }, 300);
}

function renderHomeFeed(): void {
  const container = document.getElementById("home-articles");
  if (!container) return;
  container.innerHTML = "Loading mixed feed...";

  getMixedFeed((links) => {
    container.innerHTML = "";
    if (links.length === 0) {
      container.innerHTML = "No articles found. Add some feeds in Settings!";
      return;
    }
    let id = 1;
    links.forEach((link) => {
      container.appendChild(renderArticle(link, id++));
    });
  });
}

function renderIndividualFeed(feedKey?: string | null): void {
  const container = document.getElementById("feed-articles");
  const title = document.getElementById("feed-title");
  if (!container || !feedKey) return;
  if (title) title.textContent = feedKey;

  const cached = getFeedLinks(feedKey);
  if (cached) {
    container.innerHTML = "";
    let id = 1;
    cached.forEach((link) => {
      container.appendChild(renderArticle(link, id++));
    });
  } else {
    container.innerHTML = "Loading articles...";
    updateFeed(feedKey, (links) => {
      container.innerHTML = "";
      if (!links || links.length === 0) {
        container.innerHTML = "No articles found in this feed.";
        return;
      }
      let id = 1;
      links.forEach((link) => {
        container.appendChild(renderArticle(link, id++));
      });
    });
  }
}

function renderSettings(): void {
  const feeds = getFeeds();
  const container = document.getElementById("manage-feeds-list");
  if (!container) return;
  container.innerHTML = "";

  for (const key in feeds) {
    if (Object.hasOwn(feeds, key)) {
      const item = document.createElement('div');
      item.className = 'feed-management-item';

      const info = document.createElement("div");
      const nameSpan = document.createElement("strong");
      nameSpan.textContent = key;
      const urlSmall = document.createElement("small");
      urlSmall.textContent = feeds[key];
      info.appendChild(nameSpan);
      info.appendChild(document.createElement("br"));
      info.appendChild(urlSmall);

      const removeBtn = document.createElement("button");
      removeBtn.className = "btn btn-danger";
      removeBtn.textContent = "Unsubscribe";
      removeBtn.addEventListener("click", () => {
        removeFeed(key);
        renderSidebarFeeds();
        renderSettings();
        showToast(`Unsubscribed from ${key}`);
      });

      item.appendChild(info);
      item.appendChild(removeBtn);
      container.appendChild(item);
    }
  }
}

function handleAddFeedDashboard(): void {
  const nameInput = document.getElementById(
    "new-feed-name",
  ) as HTMLInputElement | null;
  const urlInput = document.getElementById(
    "new-feed-url",
  ) as HTMLInputElement | null;

  const name = nameInput?.value.trim();
  const url = urlInput?.value.trim();

  if (!name || !url) {
    showToast("Please fill in both fields");
    return;
  }

  if (!url.startsWith("http:") && !url.startsWith("https:")) {
    showToast("URL must start with http or https");
    return;
  }

  addFeed(name, url);
  if (nameInput) nameInput.value = "";
  if (urlInput) urlInput.value = "";
  renderSidebarFeeds();
  renderSettings();
  showToast("Feed added successfully!");
}

export {
  closePreview,
  handleAddFeedDashboard,
  initDashboard,
  openInPreview,
  renderArticle,
  renderHomeFeed,
  renderIndividualFeed,
  renderSettings,
  renderSidebarFeeds,
  setupDashboardEvents,
  showView,
};
