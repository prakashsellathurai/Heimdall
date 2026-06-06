import './setup';
import { addFeed, clearFeedsCache, getFeeds, removeFeed } from '../src/core/storage';
import { DEFAULT_FEEDS } from '../src/types';

beforeEach(() => {
  localStorage.clear();
  clearFeedsCache();
});

describe("Feed Management", () => {
  it("getFeeds returns default feeds when empty", () => {
    const feeds = getFeeds();
    expect(feeds).toEqual(DEFAULT_FEEDS);
    expect(localStorage.getItem("Heimdall.Feeds")).toBe(
      JSON.stringify(DEFAULT_FEEDS),
    );
  });

  it("getFeeds returns stored feeds", () => {
    const customFeeds = { Custom: "http://test.com" };
    localStorage.setItem("Heimdall.Feeds", JSON.stringify(customFeeds));
    const feeds = getFeeds();
    expect(feeds).toEqual(customFeeds);
  });

  it("getFeeds handles parse error and re-initializes", () => {
    localStorage.setItem("Heimdall.Feeds", "invalid json");
    const feeds = getFeeds();
    expect(feeds).toEqual(DEFAULT_FEEDS);
  });

  it("addFeed adds a feed", () => {
    addFeed("NewFeed", "http://new.com");
    const feeds = getFeeds();
    expect(feeds.NewFeed).toBe('http://new.com');
  });

  it("removeFeed removes a feed", () => {
    addFeed("ToRem", "http://rem.com");
    removeFeed("ToRem");
    const feeds = getFeeds();
    expect(feeds.ToRem).toBeUndefined();
  });
});
