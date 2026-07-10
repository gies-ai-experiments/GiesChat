import { canSubmitIssue, diagnoseIssue } from './service';

describe('issue diagnostics', () => {
  it('returns a low-confidence result when no matching logs exist', () => {
    expect(diagnoseIssue([])).toEqual({
      diagnosis:
        'No matching server warning or error was recorded in the recent diagnostic window. The report was saved for review.',
      confidence: 'low',
    });
  });

  it('prefers the latest error and caps the returned diagnosis', () => {
    const result = diagnoseIssue([
      { timestamp: new Date().toISOString(), level: 'warn', message: 'retrying' },
      { timestamp: new Date().toISOString(), level: 'error', message: 'OAuth redirect rejected' },
    ]);
    expect(result).toEqual({
      diagnosis: 'Recent server activity indicates: OAuth redirect rejected',
      confidence: 'high',
    });
  });

  it('limits each user to five reports per thirty minutes', () => {
    const userId = `user-${Date.now()}`;
    for (let index = 0; index < 5; index += 1) {
      expect(canSubmitIssue(userId, 1_000 + index)).toBe(true);
    }
    expect(canSubmitIssue(userId, 2_000)).toBe(false);
    expect(canSubmitIssue(userId, 31 * 60 * 1000)).toBe(true);
  });
});
