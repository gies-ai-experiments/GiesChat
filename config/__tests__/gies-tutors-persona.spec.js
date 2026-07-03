const { buildInstructions } = require('../gies-tutors/persona');
const { slugify, agentIdFor, categoryValueFor } = require('../gies-tutors/keys');

describe('gies-tutors persona + keys', () => {
  const entry = {
    courseCode: 'BADM 350',
    courseLabel: 'IT for Networked Organizations',
    subject: 'information systems',
  };

  it('builds instructions naming the course and the integrity guardrail', () => {
    const out = buildInstructions(entry);
    expect(out).toContain('IT for Networked Organizations (BADM 350)');
    expect(out).toContain('information systems');
    expect(out).toContain('Academic integrity');
    expect(out).toContain('Do NOT produce completed graded deliverables');
  });

  it('derives stable slug/id/category keys from the course code', () => {
    expect(slugify('BADM 350')).toBe('badm_350');
    expect(categoryValueFor(entry)).toBe('badm_350');
    expect(agentIdFor(entry)).toBe('agent_gies_badm_350');
  });
});
