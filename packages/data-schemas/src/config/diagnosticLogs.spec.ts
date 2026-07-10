import { captureDiagnosticLog, getRecentDiagnosticLogs } from './diagnosticLogs';

describe('diagnostic logs', () => {
  it('returns only warnings and errors belonging to the requested user', () => {
    const suffix = `${Date.now()}`;
    captureDiagnosticLog({ level: 'info', message: 'ignore', userId: `a-${suffix}` });
    captureDiagnosticLog({ level: 'warn', message: 'match', userId: `a-${suffix}` });
    captureDiagnosticLog({ level: 'error', message: 'other user', userId: `b-${suffix}` });

    expect(
      getRecentDiagnosticLogs({ userId: `a-${suffix}`, since: new Date(Date.now() - 1000) }),
    ).toEqual([
      expect.objectContaining({ level: 'warn', message: 'match', userId: `a-${suffix}` }),
    ]);
  });
});
