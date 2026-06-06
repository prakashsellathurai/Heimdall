import { MockXMLHttpRequest } from './xml-mock';
import './setup';

describe('Background Script', () => {
  beforeEach(() => {
    localStorage.clear();
    MockXMLHttpRequest.nextResponse = `<rss><channel><item><title>T</title><link>L</link></item></channel></rss>`;
    MockXMLHttpRequest.nextStatus = 200;
    MockXMLHttpRequest.nextUrlContainsError = false;
  });

  it('sets initial options and background tabs in localStorage on import', async () => {
    await import('../src/background/index');

    expect(localStorage.getItem('HN.RequestInterval')).toBe('1200000');
    expect(localStorage.getItem('LWN.RequestInterval')).toBe('1200000');
    expect(localStorage.getItem('HN.BackgroundTabs')).toBe('false');
  });
});
