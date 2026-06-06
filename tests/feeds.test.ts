import "./setup";
import { getMixedFeed, updateFeed, updateIfReady } from "../src/core/feeds";
import {
  clearFeedsCache,
  getFeeds,
  saveFeedLinks,
  saveFeeds,
} from "../src/core/storage";
import { MockXMLHttpRequest } from "./xml-mock";

beforeEach(() => {
  localStorage.clear();
  clearFeedsCache();
  MockXMLHttpRequest.nextResponse = "";
  MockXMLHttpRequest.nextStatus = 200;
  MockXMLHttpRequest.nextUrlContainsError = false;
});

describe("Feed Updates", () => {
  it("updateFeed calls callback with parsed links", () => {
    getFeeds(); // initialize defaults
    MockXMLHttpRequest.nextResponse = `
      <rss><channel>
        <item><title>Test</title><link>http://test.com</link></item>
      </channel></rss>
    `;

    const cb = jest.fn();
    updateFeed("HN", cb);

    expect(cb).toHaveBeenCalled();
    const links = cb.mock.calls[0][0];
    expect(links[0].Title).toBe("Test");
  });

  it("updateFeed handles error URLs", () => {
    getFeeds();
    MockXMLHttpRequest.nextUrlContainsError = true;

    const cb = jest.fn();
    updateFeed("HN", cb);

    expect(cb).toHaveBeenCalledWith([]);
  });

  it("updateFeed returns empty for missing feed key", () => {
    const cb = jest.fn();
    updateFeed("NonExistent", cb);
    expect(cb).toHaveBeenCalledWith([]);
  });

  it("updateFeed handles 404 status", () => {
    getFeeds();
    MockXMLHttpRequest.nextResponse = "<rss></rss>";
    MockXMLHttpRequest.nextStatus = 404;

    const cb = jest.fn();
    updateFeed("HN", cb);

    expect(cb).toHaveBeenCalledWith([]);
  });
});

describe("Mixed Feed", () => {
  it("getMixedFeed works with cached links", () => {
    getFeeds(); // initialize defaults with HN, LWN, OWID
    saveFeedLinks("HN", [
      { Title: "T1", Link: "http://t1.com", CommentsLink: "" },
    ]);
    saveFeedLinks("LWN", [
      { Title: "T2", Link: "http://t2.com", CommentsLink: "" },
    ]);
    saveFeedLinks("OWID", [
      { Title: "T3", Link: "http://t3.com", CommentsLink: "" },
    ]);

    const cb = jest.fn();
    getMixedFeed(cb);

    expect(cb).toHaveBeenCalled();
    const result = cb.mock.calls[0][0];
    expect(result.length).toBeGreaterThan(0);
  });

  it("getMixedFeed returns empty for no feeds", () => {
    saveFeeds({});
    clearFeedsCache();
    const cb = jest.fn();
    getMixedFeed(cb);
    expect(cb).toHaveBeenCalledWith([]);
  });

  it("getMixedFeed fetches uncached feeds", () => {
    getFeeds();
    // Remove cached items so all feeds need fetching
    localStorage.removeItem("HN");
    localStorage.removeItem("LWN");
    localStorage.removeItem("OWID");

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

describe("UpdateIfReady", () => {
  it("force=true triggers update", () => {
    getFeeds();
    MockXMLHttpRequest.nextResponse = `<rss><channel>
      <item><title>T</title><link>L</link></item>
    </channel></rss>`;

    const cb = jest.fn();
    updateIfReady("HN", true, cb);
    expect(cb).toHaveBeenCalled();
  });

  it("not ready when recent refresh exists", () => {
    getFeeds();
    const now = Date.now();
    localStorage.setItem("HN.LastRefresh", String(now));

    const cb = jest.fn();
    updateIfReady("HN", false, cb);
    expect(cb).not.toHaveBeenCalled();
  });
});
