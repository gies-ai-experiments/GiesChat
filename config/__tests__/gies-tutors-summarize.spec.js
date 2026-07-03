const { makeSummarizer, summarizePages } = require('../gies-tutors/summarize');

describe('gies-tutors summarize', () => {
  it('makeSummarizer returns null without endpoint/apiKey', () => {
    expect(makeSummarizer({})).toBeNull();
    expect(makeSummarizer({ endpoint: 'x' })).toBeNull();
    expect(makeSummarizer({ apiKey: 'y' })).toBeNull();
  });

  it('summarizer posts and returns the model text', async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '  a tidy summary  ' } }] }),
    });
    const summarize = makeSummarizer({ endpoint: 'https://api/x', apiKey: 'k', fetchImpl });
    expect(await summarize({ title: 'T', text: 'body' })).toBe('a tidy summary');
  });

  it('reuses a prior summary when raw text is unchanged (no model call)', async () => {
    const summarize = jest.fn();
    const prior = { 'https://x/a': { text: 'same', summary: 'cached' } };
    const out = await summarizePages([{ url: 'https://x/a', title: 'A', text: 'same' }], {
      summarize,
      prior,
    });
    expect(out[0].summary).toBe('cached');
    expect(summarize).not.toHaveBeenCalled();
  });

  it('caps output and tolerates a null summarizer', async () => {
    const summarize = async () => 'z'.repeat(5000);
    const capped = await summarizePages([{ url: 'https://x/b', title: 'B', text: 'new' }], {
      summarize,
      maxChars: 100,
    });
    expect(capped[0].summary.length).toBe(100);

    const none = await summarizePages([{ url: 'https://x/c', title: 'C', text: 'new' }], {
      summarize: null,
    });
    expect(none[0].summary).toBe('');
  });
});
