const { buildInstructions } = require('../gies-tutors/persona');
const { slugify, agentIdFor, categoryValueFor, courseKeyFor } = require('../gies-tutors/keys');

describe('gies-tutors persona + keys', () => {
  const entry = {
    courseCode: 'BADM 350',
    courseLabel: 'IT for Networked Organizations',
    category: 'Business Administration',
    subject: 'information systems',
  };

  it('builds instructions naming the course and the integrity guardrail', () => {
    const out = buildInstructions(entry);
    expect(out).toContain('IT for Networked Organizations (BADM 350)');
    expect(out).toContain('information systems');
    expect(out).toContain('Academic integrity');
    expect(out).toContain('Do NOT produce completed graded deliverables');
  });

  it('derives the category from the subject area and course keys from the course code', () => {
    expect(slugify('BADM 350')).toBe('badm_350');
    expect(categoryValueFor(entry)).toBe('business_administration');
    expect(courseKeyFor(entry)).toBe('badm_350');
    expect(agentIdFor(entry)).toBe('agent_gies_badm_350');
    expect(() => categoryValueFor({ courseCode: 'BADM 999' })).toThrow(
      /Missing "category" for BADM 999/,
    );
  });
});
