import { Constants } from 'librechat-data-provider';
import {
  createReplitExternalUrlArtifact,
  getReplitBuildEvent,
  getReplitPreviewUrl,
  isReplitToolCallName,
} from '../replitLifecycle';
import { TOOL_ARTIFACT_TYPES } from '../artifacts';

const replitTool = (name: string) => `${name}${Constants.mcp_delimiter}replit`;

describe('replitLifecycle', () => {
  it('recognizes only Replit app-builder MCP tool names', () => {
    expect(isReplitToolCallName(replitTool('create_app_from_prompt'))).toBe(true);
    expect(isReplitToolCallName(replitTool('ask_question'))).toBe(true);
    expect(isReplitToolCallName(replitTool('update_app_using_prompt'))).toBe(true);
    expect(isReplitToolCallName('create_app_from_prompt')).toBe(true);
    expect(isReplitToolCallName(`search${Constants.mcp_delimiter}replit`)).toBe(false);
    expect(isReplitToolCallName(replitTool('create_app_from_prompt') + '-extra')).toBe(false);
  });

  it('extracts only allowed Replit preview URLs from nested output', () => {
    expect(
      getReplitPreviewUrl({
        content: [
          {
            type: 'text',
            text: 'Done: https://student-demo.replit.dev/path?q=1',
          },
        ],
      }),
    ).toBe('https://student-demo.replit.dev/path?q=1');

    expect(getReplitPreviewUrl('See http://student-demo.replit.dev')).toBeUndefined();
    expect(getReplitPreviewUrl('See https://evil.example.com')).toBeUndefined();
  });

  it('returns building for create/update calls before preview URL is available', () => {
    expect(
      getReplitBuildEvent({
        name: replitTool('create_app_from_prompt'),
        args: JSON.stringify({ name: 'Quiz Builder' }),
        output: JSON.stringify({ replId: 'abc123', replUrl: 'https://replit.com/@team/app' }),
      }),
    ).toEqual({
      status: 'building',
      replId: 'abc123',
      title: 'Quiz Builder',
    });
  });

  it('returns ready and builds an external-url artifact when a preview URL appears', () => {
    const event = getReplitBuildEvent({
      name: replitTool('ask_question'),
      args: JSON.stringify({ replId: 'abc123' }),
      output: 'The app is ready at https://student-demo.replit.app',
    });

    expect(event).toEqual({
      status: 'ready',
      replId: 'abc123',
      title: 'Replit app',
      previewUrl: 'https://student-demo.replit.app/',
    });

    if (event == null) {
      throw new Error('expected a build event');
    }
    const artifact = createReplitExternalUrlArtifact(event);
    expect(artifact).toEqual(
      expect.objectContaining({
        id: 'replit-app-abc123',
        identifier: 'replit-app',
        title: 'Replit app',
        type: TOOL_ARTIFACT_TYPES.EXTERNAL_URL,
        content: 'https://student-demo.replit.app/',
      }),
    );
  });
});
