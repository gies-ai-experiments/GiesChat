const { fetch: undiciFetch } = require('undici');

const BLOCKED_HOST =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|::1|\[::1\])/i;

function isSafeUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return false;
  }
  return !BLOCKED_HOST.test(u.hostname);
}

function htmlToText(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = (titleMatch ? titleMatch[1] : '').replace(/\s+/g, ' ').trim();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|apos);/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return { title, text };
}

async function scrapeSources(entry, { fetchImpl = undiciFetch, maxChars = 8000, timeoutMs = 10000 } = {}) {
  const urls = Array.isArray(entry.sourceUrls) ? entry.sourceUrls : [];
  const out = [];
  for (const url of urls) {
    if (!isSafeUrl(url)) {
      console.warn(`[gies-tutors] skipping unsafe URL: ${url}`);
      continue;
    }
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) {
        console.warn(`[gies-tutors] ${res.status} for ${url}`);
        continue;
      }
      const html = await res.text();
      const { title, text } = htmlToText(html);
      out.push({ url, title: title || url, text: text.slice(0, maxChars) });
    } catch (err) {
      console.warn(`[gies-tutors] fetch failed ${url}: ${err.message}`);
    }
  }
  return out;
}

// ponytail: SSRF guard checks URL literals only, no DNS resolution — fine for
// staff-vetted URLs; add resolve-and-recheck if sources ever become untrusted.
module.exports = { scrapeSources, isSafeUrl, htmlToText };
