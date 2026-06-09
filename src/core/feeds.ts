import {
  COLD_START_BONUS,
  type FeedItem,
  MIXED_FEED_TIMEOUT,
  MS_TO_HOURS,
  RETRY_MS,
  SCORE_WEIGHTS,
} from '../types';
import { parseFeedLinks } from './parser';
import {
  getClickCount,
  getFeedLinks,
  getFeeds,
  getLastInteraction,
  getLastRefresh,
  saveFeedLinks,
  setLastRefresh,
} from './storage';

let _onFeedUpdate: ((key: string, items: FeedItem[]) => void) | null = null;

export function setOnFeedUpdate(cb: ((key: string, items: FeedItem[]) => void) | null): void {
  _onFeedUpdate = cb;
}

export function triggerFeedUpdate(key: string, items: FeedItem[]): void {
  _onFeedUpdate?.(key, items);
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getMixedFeed(callback: (links: FeedItem[]) => void): void {
  const feeds = getFeeds();
  const feedKeys = Object.keys(feeds);
  const allLinks: FeedItem[] = [];
  let completed = 0;

  if (feedKeys.length === 0) {
    callback([]);
    return;
  }

  const fallbackTimer = setTimeout(() => {
    if (completed < feedKeys.length) {
      callback(shuffleArray(allLinks));
    }
  }, MIXED_FEED_TIMEOUT);

  feedKeys.forEach((key) => {
    const cached = getFeedLinks(key);
    if (cached) {
      allLinks.push(...cached.slice(0, 5));
      completed++;
      if (completed === feedKeys.length) {
        clearTimeout(fallbackTimer);
        callback(shuffleArray(allLinks));
      }
    } else {
      updateFeed(key, (links) => {
        allLinks.push(...links.slice(0, 5));
        completed++;
        if (completed === feedKeys.length) {
          clearTimeout(fallbackTimer);
          callback(shuffleArray(allLinks));
        }
      });
    }
  });
}

export function updateIfReady(
  feedKey: string,
  force?: boolean,
  callback?: (links: FeedItem[]) => void,
): void {
  const lastRefresh = getLastRefresh(feedKey);
  const interval = RETRY_MS;
  const nextRefresh = lastRefresh + interval;
  const curTime = Date.now();
  const isReady = curTime > nextRefresh;

  if (force || Number.isNaN(lastRefresh)) {
    updateFeed(feedKey, callback);
  } else if (isReady) {
    updateFeed(feedKey, callback);
  }
}

export function updateFeed(feedKey: string, callback?: (links: FeedItem[]) => void): void {
  const feeds = getFeeds();
  const url = feeds[feedKey];

  if (!url) {
    callback?.([]);
    return;
  }

  const xhr = new XMLHttpRequest();
  xhr.open('GET', url);

  xhr.onload = () => {
    if (xhr.status === 200) {
      onRssSuccess(feedKey, xhr.responseText, callback);
    } else {
      onRssError(feedKey, callback);
    }
  };

  xhr.onerror = () => {
    onRssError(feedKey, callback);
  };

  xhr.send();
}

function onRssSuccess(feedKey: string, doc: string, callback?: (links: FeedItem[]) => void): void {
  if (!doc) {
    handleFeedParsingFailed(feedKey);
    return;
  }

  const links = parseFeedLinks(doc);
  saveFeedLinks(feedKey, links);

  callback?.(links);
  triggerFeedUpdate(feedKey, links);

  setLastRefresh(feedKey, Date.now());
}

function handleFeedParsingFailed(feedKey: string): void {
  const lastRefresh = getLastRefresh(feedKey) || Date.now();
  setLastRefresh(feedKey, lastRefresh + RETRY_MS);
}

function onRssError(feedKey: string, callback?: (links: FeedItem[]) => void): void {
  handleFeedParsingFailed(feedKey);
  callback?.([]);
}

export function getRecommendedFeeds(max: number): string[] {
  const feeds = getFeeds();
  const keys = Object.keys(feeds);
  if (keys.length <= max) return keys;

  let maxClicks = 1;
  for (const key of keys) {
    const clicks = getClickCount(key);
    if (clicks > maxClicks) maxClicks = clicks;
  }

  const scored = keys.map((key) => {
    const lastInteraction = getLastInteraction(key);
    const hoursSinceInteraction = lastInteraction
      ? (Date.now() - lastInteraction) / MS_TO_HOURS
      : Infinity;
    const recencyFactor = lastInteraction ? 1 / (1 + hoursSinceInteraction) : 0;

    const clicks = getClickCount(key);
    const engagementFactor = maxClicks > 0 ? clicks / maxClicks : 0;

    const lastRefresh = getLastRefresh(key);
    const hoursSinceRefresh = lastRefresh ? (Date.now() - lastRefresh) / MS_TO_HOURS : Infinity;
    const freshnessFactor = lastRefresh ? 1 / (1 + hoursSinceRefresh) : 0;

    let score =
      SCORE_WEIGHTS.RECENCY * recencyFactor +
      SCORE_WEIGHTS.ENGAGEMENT * engagementFactor +
      SCORE_WEIGHTS.FRESHNESS * freshnessFactor;

    if (lastInteraction === 0 && clicks === 0) {
      score += COLD_START_BONUS;
    }

    return { key, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.key.localeCompare(b.key);
  });

  return scored.slice(0, max).map((s) => s.key);
}
