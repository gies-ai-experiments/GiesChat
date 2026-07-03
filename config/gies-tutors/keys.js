const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const categoryValueFor = (entry) => slugify(entry.courseCode);
const agentIdFor = (entry) => `agent_gies_${slugify(entry.courseCode)}`;

module.exports = { slugify, categoryValueFor, agentIdFor };
