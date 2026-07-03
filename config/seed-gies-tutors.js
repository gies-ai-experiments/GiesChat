const path = require('path');
require('module-alias')({ base: path.resolve(__dirname, '..', 'api') });
const { PrincipalType, ResourceType, AccessRoleIds } = require('librechat-data-provider');
const { silentExit } = require('./helpers');
const connect = require('./connect');
const { seedTutors } = require('./gies-tutors/seed');
const { buildInstructions } = require('./gies-tutors/persona');
const tutors = require('./gies-tutors/tutors.json');

const GIES_PROVIDER = process.env.GIES_TUTOR_PROVIDER || 'azureOpenAI';
const GIES_MODEL = process.env.GIES_TUTOR_MODEL || 'gpt-5.4';

(async () => {
  await connect();

  const db = require('~/models');
  const { grantPermission } = require('~/server/services/PermissionService');

  const authorEmail = process.env.GIES_TUTOR_AUTHOR_EMAIL || process.argv[2];
  if (!authorEmail) {
    console.red(
      'Usage: GIES_TUTOR_AUTHOR_EMAIL=staff@illinois.edu node config/seed-gies-tutors.js',
    );
    console.orange('The author must be an existing user (create one with `npm run create-user`).');
    silentExit(1);
  }

  const author = await db.findUser({ email: authorEmail }, '_id');
  if (!author) {
    console.red(
      `No user found with email ${authorEmail}. Create one first with \`npm run create-user\`.`,
    );
    silentExit(1);
  }
  const authorId = author._id;

  const grantPublic = (resourceId) =>
    grantPermission({
      principalType: PrincipalType.PUBLIC,
      principalId: null,
      resourceType: ResourceType.AGENT,
      resourceId,
      accessRoleId: AccessRoleIds.AGENT_VIEWER,
      grantedBy: authorId,
    });

  const results = await seedTutors({
    methods: db,
    grantPublic,
    authorId,
    tutors,
    provider: GIES_PROVIDER,
    model: GIES_MODEL,
    buildInstructions,
  });

  console.green(`Seeded ${results.length} Gies tutor(s) on ${GIES_PROVIDER}/${GIES_MODEL}:`);
  results.forEach((r) =>
    console.cyan(`  ${r.id} -> category ${r.category} (${r.created ? 'created' : 'updated'})`),
  );
  silentExit(0);
})();
