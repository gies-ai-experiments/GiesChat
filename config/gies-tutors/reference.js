const HEADER =
  'Course reference (from official course pages). Use this material to ground your help; do not invent facts beyond it:';

function buildReference(records, { maxChars = 12000 } = {}) {
  if (!records || records.length === 0) {
    return '';
  }
  const blocks = [];
  let used = HEADER.length;
  for (const record of records) {
    const title = record.title || record.url;
    const body = record.summary || record.text || '';
    const block = `\n\n## ${title} (${record.url})\n${body}`;
    if (used + block.length > maxChars) {
      const remaining = maxChars - used;
      if (remaining > 200) {
        blocks.push(block.slice(0, remaining));
      }
      break;
    }
    blocks.push(block);
    used += block.length;
  }
  return HEADER + blocks.join('');
}

module.exports = { buildReference };
