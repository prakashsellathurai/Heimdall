import {
  DEFAULT_FEEDS,
  DEFAULT_REQUEST_INTERVAL,
  type FeedItem,
  type Feeds,
  STORAGE_KEYS,
} from '../types';

let feedsCache: Feeds | null = null;

export function clearFeedsCache(): void {
  feedsCache = null;
}

export function getFeeds(): Feeds {
  if (feedsCache) return feedsCache;

  const stored = localStorage.getItem(STORAGE_KEYS.FEEDS);
  if (stored) {
    try {
      feedsCache = JSON.parse(stored) as Feeds;
      return feedsCache;
    } catch {
      console.error('Failed to parse stored feeds');
    }
  }

  localStorage.setItem(STORAGE_KEYS.FEEDS, JSON.stringify(DEFAULT_FEEDS));
  feedsCache = { ...DEFAULT_FEEDS };
  return feedsCache;
}

export function saveFeeds(feeds: Feeds): void {
  localStorage.setItem(STORAGE_KEYS.FEEDS, JSON.stringify(feeds));
  feedsCache = feeds;
}

export function addFeed(name: string, url: string): Feeds {
  const feeds = getFeeds();
  feeds[name] = url;
  saveFeeds(feeds);
  return feeds;
}

export function removeFeed(name: string): Feeds {
  const feeds = getFeeds();
  delete feeds[name];
  saveFeeds(feeds);
  return feeds;
}

export function getFeedLinks(key: string): FeedItem[] | null {
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as FeedItem[];
  } catch {
    return null;
  }
}

export function saveFeedLinks(key: string, items: FeedItem[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

export function getLastRefresh(key: string): number {
  const val = localStorage.getItem(key + STORAGE_KEYS.LAST_REFRESH_SUFFIX);
  return val ? parseFloat(val) : 0;
}

export function setLastRefresh(key: string, time: number): void {
  localStorage.setItem(key + STORAGE_KEYS.LAST_REFRESH_SUFFIX, String(time));
}

export function getRequestInterval(key: string): number {
  const val = localStorage.getItem(key + STORAGE_KEYS.REQUEST_INTERVAL_SUFFIX);
  return val ? parseFloat(val) : DEFAULT_REQUEST_INTERVAL;
}

export function setInitialOption(key: string, value: string): void {
  if (localStorage.getItem(key) === null) {
    localStorage.setItem(key, value);
  }
}

export function recordInteraction(feedKey: string): void {
  const clickKey = feedKey + STORAGE_KEYS.CLICK_COUNT_SUFFIX;
  const current = parseInt(localStorage.getItem(clickKey) || '0', 10);
  localStorage.setItem(clickKey, String(current + 1));
  localStorage.setItem(feedKey + STORAGE_KEYS.LAST_INTERACTION_SUFFIX, String(Date.now()));
}

export function getClickCount(feedKey: string): number {
  return parseInt(localStorage.getItem(feedKey + STORAGE_KEYS.CLICK_COUNT_SUFFIX) || '0', 10);
}

export function getLastInteraction(feedKey: string): number {
  const val = localStorage.getItem(feedKey + STORAGE_KEYS.LAST_INTERACTION_SUFFIX);
  return val ? parseFloat(val) : 0;
}
