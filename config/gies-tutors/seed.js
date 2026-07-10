const { agentIdFor, categoryValueFor, courseKeyFor } = require('./keys');
const { buildAvatarDataUri } = require('./avatar');

/**
 * Idempotently upsert one category per subject area (Finance, Accounting, …) and
 * one public tutor agent per entry grouped under it, and (when an entry has
 * sourceUrls) scrape → summarize → store tagged course content and inject a
 * "Course reference" block into the tutor's instructions. Stale per-course
 * categories from the old one-category-per-course layout are deleted.
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
  const categories = tutors.reduce((acc, entry) => {
    const value = categoryValueFor(entry);
    if (!acc.some((category) => category.value === value)) {
      acc.push({ value, label: entry.category });
    }
    return acc;
  }, []);

  for (let i = 0; i < categories.length; i++) {
    const { value, label } = categories[i];
    const categoryData = {
      value,
      label,
      description: `${label} course tutors`,
      order: i,
      isActive: true,
    };
    const existingCategory = await methods.findCategoryByValue(value);
    if (existingCategory) {
      await methods.updateCategory(value, categoryData);
    } else {
      await methods.createCategory(categoryData);
    }
  }

  const categoryValues = new Set(categories.map(({ value }) => value));
  const staleValues = [...new Set(tutors.map(courseKeyFor))].filter(
    (key) => !categoryValues.has(key),
  );
  for (const value of staleValues) {
    await methods.deleteCategory(value);
  }

  const results = [];

  for (const entry of tutors) {
    const category = categoryValueFor(entry);
    const courseKey = courseKeyFor(entry);

    let reference = '';
    if (Array.isArray(entry.sourceUrls) && entry.sourceUrls.length > 0 && scrapeSources) {
      const scraped = await scrapeSources(entry, { maxChars });
      const priorRecords = await methods.findTutorSourcesByCourse(courseKey);
      const prior = {};
      for (const record of priorRecords) {
        prior[record.url] = record;
      }
      const summarized = await summarizePages(scraped, {
        summarize,
        prior,
        maxChars: summaryMaxChars,
      });
      await storeSources({ methods, courseValue: courseKey, scraped: summarized });
      const records = await methods.findTutorSourcesByCourse(courseKey);
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
      category,
      avatar: { filepath: buildAvatarDataUri(entry), source: 'gies' },
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
    results.push({ id, category, created: !existingAgent });
  }

  return results;
}

module.exports = { seedTutors };
