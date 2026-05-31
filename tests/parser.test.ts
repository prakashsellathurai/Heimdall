import './setup';
import { parseFeedLinks } from '../src/core/parser';

describe('parseFeedLinks', () => {
  it('handles Atom format with href attribute', () => {
    const atomXml = `
      <feed>
        <entry>
          <title>Atom Title</title>
          <link href="http://atom.com"/>
        </entry>
      </feed>
    `;
    const links = parseFeedLinks(atomXml);
    expect(links[0].Title).toBe('Atom Title');
    expect(links[0].Link).toBe('http://atom.com');
  });

  it('handles RSS format', () => {
    const rssXml = `
      <rss>
        <channel>
          <item>
            <title>RSS Title</title>
            <link>http://rss.com</link>
          </item>
        </channel>
      </rss>
    `;
    const links = parseFeedLinks(rssXml);
    expect(links[0].Title).toBe('RSS Title');
    expect(links[0].Link).toBe('http://rss.com');
  });

  it('handles missing title and link', () => {
    const badXml = `<rss><channel><item></item></channel></rss>`;
    const links = parseFeedLinks(badXml);
    expect(links[0].Title).toBe('Unknown Title');
    expect(links[0].Link).toBe('');
  });

  it('falls back to comments link when link is missing', () => {
    const xml = `<rss><channel><item>
      <title>T</title>
      <comments>http://comments.com</comments>
    </item></channel></rss>`;
    const links = parseFeedLinks(xml);
    expect(links[0].Link).toBe('http://comments.com');
  });

  it('includes comments link when present', () => {
    const xml = `<rss><channel><item>
      <title>T</title>
      <link>http://article.com</link>
      <comments>http://comments.com</comments>
    </item></channel></rss>`;
    const links = parseFeedLinks(xml);
    expect(links[0].CommentsLink).toBe('http://comments.com');
  });

  it('limits to MAX_FEED_ITEMS', () => {
    const items = Array.from({ length: 25 }, (_, i) => `
      <item>
        <title>Item ${i}</title>
        <link>http://item${i}.com</link>
      </item>
    `).join('\n');
    const xml = `<rss><channel>${items}</channel></rss>`;
    const links = parseFeedLinks(xml);
    expect(links.length).toBe(20);
  });
});
