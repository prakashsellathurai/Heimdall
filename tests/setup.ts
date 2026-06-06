import { JSDOM } from "jsdom";
import { MockXMLHttpRequest } from "./xml-mock";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
  storageQuota: 10 * 1024 * 1024,
});

const { window } = dom;

// Set up DOM globals
Object.assign(globalThis, {
  window,
  document: window.document,
  localStorage: window.localStorage,
  DOMParser: window.DOMParser,
  HTMLElement: window.HTMLElement,
  HTMLIFrameElement: window.HTMLIFrameElement,
  HTMLInputElement: window.HTMLInputElement,
  HTMLAnchorElement: window.HTMLAnchorElement,
  MouseEvent: window.MouseEvent,
  CustomEvent: window.CustomEvent,
  requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(cb, 0),
  cancelAnimationFrame: (id: number) => clearTimeout(id),
});

// Mock browser APIs for extension testing
const tabCreateMock = jest.fn().mockReturnValue(Promise.resolve());
const openOptionsPageMock = jest.fn().mockReturnValue(Promise.resolve());

Object.assign(globalThis, {
  chrome: {
    tabs: { create: tabCreateMock },
    runtime: { openOptionsPage: openOptionsPageMock },
  },
  browser: {
    tabs: { create: tabCreateMock },
    runtime: { openOptionsPage: openOptionsPageMock },
  },
});

// Replace XMLHttpRequest with mock
Object.assign(globalThis, {
  XMLHttpRequest: MockXMLHttpRequest as unknown as typeof XMLHttpRequest,
});

export { MockXMLHttpRequest, openOptionsPageMock, tabCreateMock };
