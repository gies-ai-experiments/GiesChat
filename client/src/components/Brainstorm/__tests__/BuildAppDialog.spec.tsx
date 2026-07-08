import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import BuildAppDialog from '../BuildAppDialog';

const mockDraftMutate = jest.fn();
const mockStartMutate = jest.fn();
const mockInitializeServer = jest.fn();
let mockConnectionStatus: Record<string, { connectionState: string }> = {
  replit: { connectionState: 'connected' },
};

jest.mock('~/data-provider', () => ({
  useDraftRoomBuildMutation: () => ({ mutate: mockDraftMutate, isLoading: false }),
  useStartRoomBuildMutation: () => ({ mutate: mockStartMutate, isLoading: false }),
}));
jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useMCPConnectionStatus: () => ({ connectionStatus: mockConnectionStatus }),
}));
jest.mock('~/hooks/MCP', () => ({
  useMCPServerManager: () => ({ initializeServer: mockInitializeServer }),
}));

describe('BuildAppDialog', () => {
  beforeEach(() => jest.clearAllMocks());

  it('drafts a prompt when connected and starts a build', async () => {
    mockDraftMutate.mockImplementation((_v, opts) =>
      opts.onSuccess({ prompt: 'Build CampusPlate' }),
    );
    render(<BuildAppDialog roomId="r1" open onClose={jest.fn()} />);
    await waitFor(() => expect(mockDraftMutate).toHaveBeenCalled());
    const textarea = await screen.findByLabelText('com_ui_brainstorm_build_prompt_label');
    expect((textarea as HTMLTextAreaElement).value).toContain('CampusPlate');
    await userEvent.click(screen.getByText('com_ui_brainstorm_build_start'));
    expect(mockStartMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('CampusPlate'),
        stackType: 'react_website',
      }),
      expect.anything(),
    );
  });

  it('shows the connect state when Replit is not connected', async () => {
    mockConnectionStatus = { replit: { connectionState: 'disconnected' } };
    render(<BuildAppDialog roomId="r1" open onClose={jest.fn()} />);
    const connect = await screen.findByText('com_ui_brainstorm_build_connect_action');
    await userEvent.click(connect);
    expect(mockInitializeServer).toHaveBeenCalledWith('replit');
    mockConnectionStatus = { replit: { connectionState: 'connected' } };
  });
});
