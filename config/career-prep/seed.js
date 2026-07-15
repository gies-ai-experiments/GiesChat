const { careerPrepAvatar } = require('../avatar');
const { buildInstructions } = require('./persona');

const AGENT_ID = 'agent_gies_career_prep';
const CATEGORY_VALUE = 'career';

async function seedCareerPrep({ methods, grantPublic, authorId, provider, model }) {
  const category = {
    value: CATEGORY_VALUE,
    label: 'Career',
    description: 'Career preparation and job-search coaching.',
    order: 11,
    isActive: true,
  };
  const existingCategory = await methods.findCategoryByValue(CATEGORY_VALUE);
  if (existingCategory) {
    await methods.updateCategory(CATEGORY_VALUE, category);
  } else {
    await methods.createCategory(category);
  }

  const fields = {
    name: 'Career Prep',
    description:
      'Upload your resume, say what job you want, and get tailored resume feedback, a career plan, interview prep, and a networking playbook.',
    instructions: buildInstructions(),
    provider,
    model,
    category: CATEGORY_VALUE,
    tools: ['file_search'],
    is_promoted: true,
    avatar: { filepath: careerPrepAvatar(), source: 'gies' },
  };

  const existingAgent = await methods.getAgent({ id: AGENT_ID });
  const agent = existingAgent
    ? await methods.updateAgent({ id: AGENT_ID }, fields, { skipVersioning: true })
    : await methods.createAgent({ id: AGENT_ID, author: authorId, ...fields });

  await grantPublic(agent._id);
  return { id: AGENT_ID, created: !existingAgent };
}

module.exports = { seedCareerPrep, AGENT_ID, CATEGORY_VALUE };
