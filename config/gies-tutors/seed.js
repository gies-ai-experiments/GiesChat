const { agentIdFor, categoryValueFor } = require('./keys');

/**
 * Idempotently upsert one category + one public tutor agent per entry.
 * @param {object} deps
 * @param {object} deps.methods - db methods (findCategoryByValue, createCategory, updateCategory, getAgent, createAgent, updateAgent)
 * @param {(resourceId: any) => Promise<unknown>} deps.grantPublic - grants public view access to an agent's _id
 * @param {any} deps.authorId - ObjectId of the staff author
 * @param {Array<object>} deps.tutors - tutor entries
 * @param {string} deps.provider - endpoint/provider name
 * @param {string} deps.model - model id
 * @param {(entry: object) => string} deps.buildInstructions
 * @returns {Promise<Array<{ id: string, category: string, created: boolean }>>}
 */
async function seedTutors({ methods, grantPublic, authorId, tutors, provider, model, buildInstructions }) {
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

    const id = agentIdFor(entry);
    const fields = {
      name: entry.tutorName || `${entry.courseCode} Tutor`,
      description: entry.description || `Tutor for ${entry.courseLabel} (${entry.courseCode}).`,
      instructions: entry.instructionsOverride || buildInstructions(entry),
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
