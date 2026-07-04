const path = require('path');
const mongoose = require('mongoose');
require('module-alias')({ base: path.resolve(__dirname, '..', 'api') });
require('@librechat/data-schemas').createModels(mongoose);
const { PrincipalType, ResourceType, AccessRoleIds } = require('librechat-data-provider');
const { silentExit } = require('./helpers');
const connect = require('./connect');
const { seedAppBuilder } = require('./app-builder/seed');

const PROVIDER = process.env.GIES_APP_BUILDER_PROVIDER || 'Azure OpenAI';
const MODEL = process.env.GIES_APP_BUILDER_MODEL || 'gpt-5.4';

(async () => {
  await connect();

  const db = require('~/models');
  const { grantPermission } = require('~/server/services/PermissionService');

  const authorEmail = process.env.GIES_APP_BUILDER_AUTHOR_EMAIL || process.argv[2];
  if (!authorEmail) {
    console.error(
      'Usage: GIES_APP_BUILDER_AUTHOR_EMAIL=staff@illinois.edu node config/seed-app-builder.js',
    );
    silentExit(1);
  }

  const author = await db.findUser({ email: authorEmail }, '_id');
  if (!author) {
    console.error(`No user found for ${authorEmail}`);
    silentExit(1);
  }

  const grantPublic = (resourceId) =>
    grantPermission({
      principalType: PrincipalType.PUBLIC,
      principalId: null,
      resourceType: ResourceType.AGENT,
      resourceId,
      accessRoleId: AccessRoleIds.AGENT_VIEWER,
      grantedBy: author._id,
    });

  const result = await seedAppBuilder({
    methods: db,
    grantPublic,
    authorId: author._id,
    provider: PROVIDER,
    model: MODEL,
  });

  console.log(`App Builder ${result.created ? 'created' : 'updated'} (${result.id})`);
  silentExit(0);
})();
