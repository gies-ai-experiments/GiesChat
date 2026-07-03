const { buildReference } = require('../gies-tutors/reference');

describe('gies-tutors reference', () => {
  it('returns empty string for no records', () => {
    expect(buildReference([])).toBe('');
    expect(buildReference(undefined)).toBe('');
  });

  it('includes a header, titles and urls', () => {
    const out = buildReference([{ url: 'https://x/a', title: 'Syllabus', text: 'content here' }]);
    expect(out).toContain('Course reference');
    expect(out).toContain('Syllabus');
    expect(out).toContain('https://x/a');
    expect(out).toContain('content here');
  });

  it('prefers summary over raw text when present', () => {
    const out = buildReference([
      { url: 'https://x/a', title: 'Syllabus', text: 'long raw text', summary: 'tight summary' },
    ]);
    expect(out).toContain('tight summary');
    expect(out).not.toContain('long raw text');
  });

  it('respects the total cap', () => {
    const big = { url: 'https://x/a', title: 'T', text: 'y'.repeat(5000) };
    const out = buildReference([big], { maxChars: 500 });
    expect(out.length).toBeLessThanOrEqual(500);
  });
});
