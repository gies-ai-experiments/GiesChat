const { agentIdFor, categoryValueFor } = require('./keys');

/**
 * Idempotently upsert one category + one public tutor agent per entry, and
 * (when an entry has sourceUrls) scrape → summarize → store tagged course
 * content and inject a "Course reference" block into the tutor's instructions.
 * @param {object} deps
 * @param {object} deps.methods - db methods (categories, agents, tutor sources)
 * @param {(resourceId: any) => Promise<unknown>} deps.grantPublic - grants public view access
 * @param {any} deps.authorId - ObjectId of the staff author
 * @param {Array<object>} deps.tutors - tutor entries
 * @param {string} deps.provider - endpoint/provider name
 * @param {string} deps.model - model id
 * @param {(entry: object) => string} deps.buildInstructions
 * @param {(entry: object, opts: object) => Promise<Array<object>>} [deps.scrapeSources]
 * @param {(scraped: Array<object>, opts: object) => Promise<Array<object>>} [deps.summarizePages]
 * @param {(params: object) => Promise<number>} [deps.storeSources]
 * @param {(records: Array<object>, opts: object) => string} [deps.buildReference]
 * @param {((page: object) => Promise<string>) | null} [deps.summarize]
 * @returns {Promise<Array<{ id: string, category: string, created: boolean }>>}
 */
async function seedTutors({
  methods,
  grantPublic,
  authorId,
  tutors,
  provider,
  model,
  buildInstructions,
  scrapeSources,
  summarizePages,
  storeSources,
  buildReference,
  summarize = null,
  maxChars = 8000,
  summaryMaxChars = 1500,
  referenceMaxChars = 12000,
}) {
  const results = [];

  for (let i = 0; i < tutors.length; i++) {
    const entry = tutors[i];
    const value = categoryValueFor(entry);

    const categoryData = {
      value,
      label: entry.courseLabel,
      description: entry.subject || '',
      order: i,
      isActive: true,
    };
    const existingCategory = await methods.findCategoryByValue(value);
    if (existingCategory) {
      await methods.updateCategory(value, categoryData);
    } else {
      await methods.createCategory(categoryData);
    }

    let reference = '';
    if (Array.isArray(entry.sourceUrls) && entry.sourceUrls.length > 0 && scrapeSources) {
      const scraped = await scrapeSources(entry, { maxChars });
      const priorRecords = await methods.findTutorSourcesByCourse(value);
      const prior = {};
      for (const record of priorRecords) {
        prior[record.url] = record;
      }
      const summarized = await summarizePages(scraped, {
        summarize,
        prior,
        maxChars: summaryMaxChars,
      });
      await storeSources({ methods, courseValue: value, scraped: summarized });
      const records = await methods.findTutorSourcesByCourse(value);
      reference = buildReference(records, { maxChars: referenceMaxChars });
    }

    const baseInstructions = entry.instructionsOverride || buildInstructions(entry);
    const instructions = reference ? `${baseInstructions}\n\n${reference}` : baseInstructions;

    const id = agentIdFor(entry);
    const fields = {
      name: entry.tutorName || `${entry.courseCode} Tutor`,
      description: entry.description || `Tutor for ${entry.courseLabel} (${entry.courseCode}).`,
      instructions,
      provider,
      model,
      category: value,
      is_promoted: Boolean(entry.isPromoted),
    };

    const existingAgent = await methods.getAgent({ id });
    let agent;
    if (existingAgent) {
      agent = await methods.updateAgent({ id }, fields, { skipVersioning: true });
    } else {
      agent = await methods.createAgent({ id, author: authorId, ...fields });
    }

    await grantPublic(agent._id);
    results.push({ id, category: value, created: !existingAgent });
  }

  return results;
}

module.exports = { seedTutors };
