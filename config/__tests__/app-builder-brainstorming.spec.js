const fs = require('fs');
const path = require('path');
const { buildInstructions } = require('../app-builder/persona');

const REQUIRED_GATE =
  /MUST ask 2-3 idea-specific brainstorming questions[\s\S]*ONE AT A TIME[\s\S]*MUST NOT call create_app_from_prompt[\s\S]*explicitly asks you to build (?:it )?directly/i;

describe('App Builder brainstorming gate', () => {
  it('requires brainstorming before the seeded App Builder invokes Replit', () => {
    expect(buildInstructions()).toMatch(REQUIRED_GATE);
  });

  it('requires the same gate for every use of the Replit MCP server', () => {
    const config = fs.readFileSync(path.join(__dirname, '../../librechat.yaml'), 'utf8');

    expect(config).toMatch(REQUIRED_GATE);
  });
});
