const { fetch: undiciFetch } = require('undici');

const SYSTEM =
  'You compress course web pages into a concise study reference for an AI tutor. ' +
  'Keep topics, key concepts, structure, policies and deadlines; drop navigation and ' +
  'boilerplate. Output plain text, no preamble.';

function makeSummarizer({ endpoint, apiKey, model = 'gpt-5.4', fetchImpl = undiciFetch } = {}) {
  if (!endpoint || !apiKey) {
    return null;
  }
  return async function summarize(page) {
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        'api-key': apiKey,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 500,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Title: ${page.title}\n\n${page.text}` },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`summary endpoint ${res.status}`);
    }
    const data = await res.json();
    return (
      data && data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : ''
    ).trim();
  };
}

async function summarizePages(scraped, { summarize, prior = {}, maxChars = 1500 } = {}) {
  const out = [];
  for (const page of scraped) {
    const priorRec = prior[page.url];
    if (priorRec && priorRec.text === page.text && priorRec.summary) {
      out.push({ ...page, summary: priorRec.summary });
      continue;
    }
    let summary = '';
    if (summarize) {
      try {
        summary = ((await summarize(page)) || '').slice(0, maxChars);
      } catch (err) {
        console.warn(`[gies-tutors] summarize failed ${page.url}: ${err.message}`);
      }
    }
    out.push({ ...page, summary });
  }
  return out;
}

module.exports = { makeSummarizer, summarizePages };
