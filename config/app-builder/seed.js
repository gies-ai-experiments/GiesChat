const { Constants } = require('librechat-data-provider');
const { appBuilderAvatar } = require('../avatar');
const { buildInstructions } = require('./persona');

const AGENT_ID = 'agent_gies_app_builder';
const CATEGORY_VALUE = 'build';
const REPLIT_SERVER = 'replit';
const ALL_REPLIT_TOOLS = `${Constants.mcp_all}${Constants.mcp_delimiter}${REPLIT_SERVER}`;

async function seedAppBuilder({ methods, grantPublic, authorId, provider, model }) {
  const category = {
    value: CATEGORY_VALUE,
    label: 'Build',
    description: 'Agents that build working software for you.',
    order: 10,
    isActive: true,
  };
  const existingCategory = await methods.findCategoryByValue(CATEGORY_VALUE);
  if (existingCategory) {
    await methods.updateCategory(CATEGORY_VALUE, category);
  } else {
    await methods.createCategory(category);
  }

  const fields = {
    name: 'App Builder',
    description:
      'Describe an app in plain English and watch Replit Agent build it live, right here in GiesChat.',
    instructions: buildInstructions(),
    provider,
    model,
    category: CATEGORY_VALUE,
    tools: [ALL_REPLIT_TOOLS],
    artifacts: 'default',
    is_promoted: true,
    avatar: { filepath: appBuilderAvatar(), source: 'gies' },
  };

  const existingAgent = await methods.getAgent({ id: AGENT_ID });
  const agent = existingAgent
    ? await methods.updateAgent({ id: AGENT_ID }, fields, { skipVersioning: true })
    : await methods.createAgent({ id: AGENT_ID, author: authorId, ...fields });

  await grantPublic(agent._id);
  return { id: AGENT_ID, created: !existingAgent };
}

module.exports = { seedAppBuilder, AGENT_ID, CATEGORY_VALUE, ALL_REPLIT_TOOLS };
