import { type FeedItem, MAX_FEED_ITEMS } from "../types";

function getTextContent(
  element: Element,
  tagName: string,
  index = 0,
): string | null {
  const tags = element.getElementsByTagName(tagName);
  const tag = tags[index];
  return tag?.textContent ?? null;
}

function getAttribute(
  element: Element,
  tagName: string,
  attr: string,
  index = 0,
): string | null {
  const tags = element.getElementsByTagName(tagName);
  const tag = tags[index];
  return tag?.getAttribute(attr) ?? null;
}

export function parseFeedLinks(rawXml: string): FeedItem[] {
  const doc = new DOMParser().parseFromString(rawXml, "text/xml");

  let entries = doc.getElementsByTagName("entry");
  if (entries.length === 0) {
    entries = doc.getElementsByTagName("item");
  }

  const count = Math.min(entries.length, MAX_FEED_ITEMS);
  const links: FeedItem[] = [];

  for (let i = 0; i < count; i++) {
    const item = entries.item(i);
    if (!item) continue;

    const title = getTextContent(item, "title") || "Unknown Title";

    const linkText = getTextContent(item, "link");
    let link: string;

    if (linkText) {
      link = linkText;
    } else {
      const href = getAttribute(item, "link", "href");
      if (href) {
        link = href;
      } else {
        const comments = getTextContent(item, "comments");
        link = comments ?? "";
      }
    }

    const commentsLink = getTextContent(item, "comments") ?? "";

    links.push({ Title: title, Link: link, CommentsLink: commentsLink });
  }

  return links;
}
