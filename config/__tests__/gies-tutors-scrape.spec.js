const { scrapeSources, isSafeUrl, htmlToText } = require('../gies-tutors/scrape');

const fakeFetch = (bodyByUrl) => async (url) => ({
  ok: bodyByUrl[url] != null,
  status: bodyByUrl[url] != null ? 200 : 404,
  text: async () => bodyByUrl[url] || '',
});

describe('gies-tutors scrape', () => {
  it('refuses non-http and internal hosts (SSRF)', () => {
    expect(isSafeUrl('https://example.com/x')).toBe(true);
    expect(isSafeUrl('http://example.com')).toBe(true);
    expect(isSafeUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeUrl('http://localhost/x')).toBe(false);
    expect(isSafeUrl('http://127.0.0.1/x')).toBe(false);
    expect(isSafeUrl('http://169.254.169.254/latest')).toBe(false);
    expect(isSafeUrl('not a url')).toBe(false);
  });

  it('extracts title + text and strips scripts/tags', () => {
    const { title, text } = htmlToText(
      '<html><head><title> Course </title></head><body><script>bad()</script><p>Hello&nbsp;World</p></body></html>',
    );
    expect(title).toBe('Course');
    expect(text).toContain('Hello World');
    expect(text).not.toContain('bad()');
  });

  it('scrapes provided urls, truncates, and skips failures + unsafe urls', async () => {
    const html = '<title>T</title><body>' + 'x'.repeat(50) + '</body>';
    const entry = {
      sourceUrls: ['https://ok.test/a', 'https://missing.test/b', 'http://localhost/c'],
    };
    const out = await scrapeSources(entry, {
      fetchImpl: fakeFetch({ 'https://ok.test/a': html }),
      maxChars: 10,
    });
    expect(out).toHaveLength(1);
    expect(out[0].url).toBe('https://ok.test/a');
    expect(out[0].text.length).toBe(10);
  });
});
