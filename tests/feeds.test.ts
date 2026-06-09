import './setup';
import { getMixedFeed, getRecommendedFeeds, updateFeed, updateIfReady } from '../src/core/feeds';
import {
  clearFeedsCache,
  getClickCount,
  getFeeds,
  getLastRefresh,
  recordInteraction,
  saveFeedLinks,
  saveFeeds,
  setLastRefresh,
} from '../src/core/storage';
import { MAX_POPUP_FEED_TABS } from '../src/types';
import { MockXMLHttpRequest } from './xml-mock';

beforeEach(() => {
  localStorage.clear();
  clearFeedsCache();
  MockXMLHttpRequest.nextResponse = '';
  MockXMLHttpRequest.nextStatus = 200;
  MockXMLHttpRequest.nextUrlContainsError = false;
});

describe('Feed Updates', () => {
  it('updateFeed calls callback with parsed links', () => {
    getFeeds(); // initialize defaults
    MockXMLHttpRequest.nextResponse = `
      <rss><channel>
        <item><title>Test</title><link>http://test.com</link></item>
      </channel></rss>
    `;

    const cb = jest.fn();
    updateFeed('HN', cb);

    expect(cb).toHaveBeenCalled();
    const links = cb.mock.calls[0][0];
    expect(links[0].Title).toBe('Test');
  });

  it('updateFeed handles error URLs', () => {
    getFeeds();
    MockXMLHttpRequest.nextUrlContainsError = true;

    const cb = jest.fn();
    updateFeed('HN', cb);

    expect(cb).toHaveBeenCalledWith([]);
  });

  it('updateFeed returns empty for missing feed key', () => {
    const cb = jest.fn();
    updateFeed('NonExistent', cb);
    expect(cb).toHaveBeenCalledWith([]);
  });

  it('updateFeed handles 404 status', () => {
    getFeeds();
    MockXMLHttpRequest.nextResponse = '<rss></rss>';
    MockXMLHttpRequest.nextStatus = 404;

    const cb = jest.fn();
    updateFeed('HN', cb);

    expect(cb).toHaveBeenCalledWith([]);
  });
});

describe('Mixed Feed', () => {
  it('getMixedFeed works with cached links', () => {
    getFeeds(); // initialize defaults with HN, LWN, OWID
    saveFeedLinks('HN', [{ Title: 'T1', Link: 'http://t1.com', CommentsLink: '' }]);
    saveFeedLinks('LWN', [{ Title: 'T2', Link: 'http://t2.com', CommentsLink: '' }]);
    saveFeedLinks('OWID', [{ Title: 'T3', Link: 'http://t3.com', CommentsLink: '' }]);

    const cb = jest.fn();
    getMixedFeed(cb);

    expect(cb).toHaveBeenCalled();
    const result = cb.mock.calls[0][0];
    expect(result.length).toBeGreaterThan(0);
  });

  it('getMixedFeed returns empty for no feeds', () => {
    saveFeeds({});
    clearFeedsCache();
    const cb = jest.fn();
    getMixedFeed(cb);
    expect(cb).toHaveBeenCalledWith([]);
  });

  it('getMixedFeed fetches uncached feeds', () => {
    getFeeds();
    // Remove cached items so all feeds need fetching
    localStorage.removeItem('HN');
    localStorage.removeItem('LWN');
    localStorage.removeItem('OWID');

    MockXMLHttpRequest.nextResponse = `<rss><channel>
      <item><title>Fetched</title><link>http://f.com</link></item>
    </channel></rss>`;

    jest.useFakeTimers();
    const cb = jest.fn();
    getMixedFeed(cb);

    // Advance past the 10s safety timeout
    jest.advanceTimersByTime(10000);

    expect(cb).toHaveBeenCalled();
    jest.useRealTimers();
  });
});

describe('UpdateIfReady', () => {
  it('force=true triggers update', () => {
    getFeeds();
    MockXMLHttpRequest.nextResponse = `<rss><channel>
      <item><title>T</title><link>L</link></item>
    </channel></rss>`;

    const cb = jest.fn();
    updateIfReady('HN', true, cb);
    expect(cb).toHaveBeenCalled();
  });

  it('not ready when recent refresh exists', () => {
    getFeeds();
    const now = Date.now();
    localStorage.setItem('HN.LastRefresh', String(now));

    const cb = jest.fn();
    updateIfReady('HN', false, cb);
    expect(cb).not.toHaveBeenCalled();
  });
});

describe('Recommendation Logic', () => {
  beforeEach(() => {
    // Initialize with 5 feeds so recommendation chooses from > MAX_POPUP_FEED_TABS
    saveFeeds({
      Alpha: 'http://alpha.com',
      Beta: 'http://beta.com',
      Gamma: 'http://gamma.com',
      Delta: 'http://delta.com',
      Epsilon: 'http://epsilon.com',
    });
    clearFeedsCache();
  });

  it('returns all feeds when count <= max', () => {
    const result = getRecommendedFeeds(10);
    expect(result).toHaveLength(5);
  });

  it('returns max feeds when more feeds than max', () => {
    const result = getRecommendedFeeds(MAX_POPUP_FEED_TABS);
    expect(result).toHaveLength(MAX_POPUP_FEED_TABS);
  });

  it('prioritizes feeds with recent interactions', () => {
    jest.useFakeTimers();
    jest.setSystemTime(100_000);

    setLastRefresh('Alpha', 100_000);
    setLastRefresh('Beta', 100_000);
    setLastRefresh('Gamma', 100_000);
    setLastRefresh('Delta', 100_000);
    setLastRefresh('Epsilon', 100_000);

    // Record interaction for Beta (most recent), Alpha (older), Gamma (oldest)
    recordInteraction('Gamma');
    jest.setSystemTime(200_000);
    recordInteraction('Alpha');
    jest.setSystemTime(300_000);
    recordInteraction('Beta');

    jest.setSystemTime(300_000);
    const result = getRecommendedFeeds(3);
    expect(result[0]).toBe('Beta');
    expect(result[1]).toBe('Alpha');
    expect(result[2]).toBe('Gamma');

    jest.useRealTimers();
  });

  it('prioritizes feeds with more clicks', () => {
    const now = Date.now();
    setLastRefresh('Alpha', now);
    setLastRefresh('Beta', now);
    setLastRefresh('Gamma', now);
    setLastRefresh('Delta', now);
    setLastRefresh('Epsilon', now);

    recordInteraction('Alpha');
    recordInteraction('Alpha');
    recordInteraction('Beta');
    recordInteraction('Gamma');
    recordInteraction('Gamma');
    recordInteraction('Gamma');

    const result = getRecommendedFeeds(3);
    expect(result[0]).toBe('Gamma');
    expect(result[1]).toBe('Alpha');
    expect(result[2]).toBe('Beta');
  });

  it('cold-start feeds get a bonus score', () => {
    // Give Delta and Epsilon high engagement but no interaction history for Alpha/Beta/Gamma
    const now = Date.now();
    setLastRefresh('Alpha', now);
    setLastRefresh('Beta', now);
    setLastRefresh('Gamma', now);
    setLastRefresh('Delta', now);
    setLastRefresh('Epsilon', now);

    // Delta has very high clicks
    recordInteraction('Delta');
    recordInteraction('Delta');
    recordInteraction('Delta');
    recordInteraction('Delta');

    // Epsilon has moderate clicks
    recordInteraction('Epsilon');
    recordInteraction('Epsilon');

    // Alpha, Beta, Gamma are cold-start (0 clicks, 0 interaction)
    // They should still appear in the top 3 due to cold-start bonus
    // when competing against each other equally, they fall back to alphabetical

    const result = getRecommendedFeeds(3);
    // Delta has highest engagement
    expect(result[0]).toBe('Delta');
    // Alpha and Beta have cold-start bonus, Epsilon has some engagement
    // With all at same freshness, Alpha has cold-start bonus + alphabetical tiebreak
    expect(result).toContain('Alpha');
  });

  it('ties broken alphabetically', () => {
    const now = Date.now();
    setLastRefresh('Alpha', now);
    setLastRefresh('Beta', now);
    setLastRefresh('Gamma', now);
    setLastRefresh('Delta', now);
    setLastRefresh('Epsilon', now);

    const result = getRecommendedFeeds(3);
    // All have equal scores, alphabetical tiebreak: Alpha, Beta, Delta (D < G)
    expect(result[0]).toBe('Alpha');
    expect(result[1]).toBe('Beta');
    expect(result[2]).toBe('Delta');
  });
});
