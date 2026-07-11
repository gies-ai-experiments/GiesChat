import { checkBuildStatus, isValidReplId } from './status';

describe('isValidReplId', () => {
  it('accepts uuid-like and slug ids', () => {
    expect(isValidReplId('4f9c8e2a-1b3d-4e5f-8a9b-0c1d2e3f4a5b')).toBe(true);
    expect(isValidReplId('my-app_123abc')).toBe(true);
  });

  it('rejects malformed ids', () => {
    expect(isValidReplId('')).toBe(false);
    expect(isValidReplId('ab')).toBe(false);
    expect(isValidReplId('bad id with spaces')).toBe(false);
    expect(isValidReplId('<script>alert(1)</script>')).toBe(false);
  });
});

describe('checkBuildStatus', () => {
  const replId = 'repl-abc-123456';

  it('returns ready with the allowlisted preview url', async () => {
    const callTool = jest
      .fn()
      .mockResolvedValue('Build finished! Preview: https://gym-tracker.replit.dev');
    const result = await checkBuildStatus({ callTool, replId });
    expect(result).toEqual({ status: 'ready', url: 'https://gym-tracker.replit.dev/' });
    expect(callTool).toHaveBeenCalledWith('ask_question', expect.objectContaining({ replId }));
  });

  it('ignores non-allowlisted urls and keeps building', async () => {
    const callTool = jest.fn().mockResolvedValue('See https://evil.example.com for the app');
    await expect(checkBuildStatus({ callTool, replId })).resolves.toEqual({ status: 'building' });
  });

  it('returns building while the agent is still working', async () => {
    const callTool = jest.fn().mockResolvedValue('Still building, no preview URL yet.');
    await expect(checkBuildStatus({ callTool, replId })).resolves.toEqual({ status: 'building' });
  });

  it('surfaces tool validation errors', async () => {
    const callTool = jest.fn().mockResolvedValue('MCP error -32602: Input validation error');
    await expect(checkBuildStatus({ callTool, replId })).resolves.toEqual({
      status: 'error',
      detail: 'tool_error',
    });
  });

  it('surfaces thrown tool calls as errors', async () => {
    const callTool = jest.fn().mockRejectedValue(new Error('OAuth required'));
    await expect(checkBuildStatus({ callTool, replId })).resolves.toEqual({
      status: 'error',
      detail: 'tool_call_failed',
    });
  });

  it('reports building when the tool call hangs past the timeout', async () => {
    const callTool = jest.fn().mockReturnValue(new Promise(() => {}));
    await expect(checkBuildStatus({ callTool, replId, timeoutMs: 20 })).resolves.toEqual({
      status: 'building',
      detail: 'tool_timeout',
    });
  });

  it('rejects invalid repl ids without calling the tool', async () => {
    const callTool = jest.fn();
    await expect(checkBuildStatus({ callTool, replId: 'nope!' })).resolves.toEqual({
      status: 'error',
      detail: 'invalid_repl_id',
    });
    expect(callTool).not.toHaveBeenCalled();
  });
});
