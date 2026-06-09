export interface FeedItem {
  Title: string;
  Link: string;
  CommentsLink: string;
}

export interface Feeds {
  [name: string]: string;
}

export const STORAGE_KEYS = {
  FEEDS: 'Heimdall.Feeds',
  LAST_POPUP_FEED: 'Heimdall.LastPopupFeed',
  LAST_DASHBOARD_VIEW: 'Heimdall.LastDashboardView',
  LAST_DASHBOARD_FEED: 'Heimdall.LastDashboardFeed',
  BACKGROUND_TABS: 'HN.BackgroundTabs',
  REQUEST_INTERVAL_SUFFIX: '.RequestInterval',
  LAST_REFRESH_SUFFIX: '.LastRefresh',
  LAST_INTERACTION_SUFFIX: '.LastInteraction',
  CLICK_COUNT_SUFFIX: '.ClickCount',
} as const;

export const DEFAULT_FEEDS: Feeds = {
  HN: 'https://news.ycombinator.com/rss',
  LWN: 'https://lwn.net/headlines/rss',
  OWID: 'https://ourworldindata.org/atom.xml',
};

export const MAX_FEED_ITEMS = 20;
export const RETRY_MS = 120000;
export const MIXED_FEED_TIMEOUT = 10000;
export const REFRESH_INTERVAL = 60000;
export const DEFAULT_REQUEST_INTERVAL = 1200000;
export const MAX_POPUP_FEED_TABS = 3;

export const SCORE_WEIGHTS = {
  RECENCY: 0.4,
  ENGAGEMENT: 0.3,
  FRESHNESS: 0.3,
} as const;

export const COLD_START_BONUS = 0.2;
export const MS_TO_HOURS = 3_600_000;
