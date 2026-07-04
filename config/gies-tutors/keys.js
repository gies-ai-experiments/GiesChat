const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const categoryValueFor = (entry) => {
  if (!entry.category) {
    throw new Error(`Missing "category" for ${entry.courseCode} in tutors.json`);
  }
  return slugify(entry.category);
};
const courseKeyFor = (entry) => slugify(entry.courseCode);
const agentIdFor = (entry) => `agent_gies_${slugify(entry.courseCode)}`;

module.exports = { slugify, categoryValueFor, courseKeyFor, agentIdFor };
