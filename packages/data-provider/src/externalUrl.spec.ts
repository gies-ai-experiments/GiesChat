import { getAllowedExternalUrl } from './externalUrl';

describe('getAllowedExternalUrl', () => {
  it('accepts allowed hosts and normalizes the href', () => {
    expect(getAllowedExternalUrl('https://my-app.replit.app')).toBe('https://my-app.replit.app/');
    expect(getAllowedExternalUrl('  https://x-1.kirk.replit.dev/path?a=1  ')).toBe(
      'https://x-1.kirk.replit.dev/path?a=1',
    );
    expect(getAllowedExternalUrl('https://foo.repl.co')).toBe('https://foo.repl.co/');
  });

  it('rejects non-https, foreign, and look-alike hosts', () => {
    expect(getAllowedExternalUrl('http://my-app.replit.app')).toBeNull();
    expect(getAllowedExternalUrl('https://evil.com')).toBeNull();
    expect(getAllowedExternalUrl('https://evilreplit.app')).toBeNull();
    expect(getAllowedExternalUrl('https://replit.app.evil.com')).toBeNull();
    expect(getAllowedExternalUrl('javascript:alert(1)')).toBeNull();
    expect(getAllowedExternalUrl('')).toBeNull();
    expect(getAllowedExternalUrl(null)).toBeNull();
  });
});
