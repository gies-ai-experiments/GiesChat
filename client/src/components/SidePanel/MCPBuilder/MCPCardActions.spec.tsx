import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MCPServerStatus } from 'librechat-data-provider';
import MCPCardActions from './MCPCardActions';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) =>
    ({
      com_ui_more_options: 'More options',
      com_ui_edit: 'Edit',
      com_ui_configure: 'Configure',
      com_nav_mcp_reconnect: 'Reconnect',
      com_ui_revoke: 'Revoke',
    })[key] ?? key,
}));

const connectedOAuthServer: MCPServerStatus = {
  connectionState: 'connected',
  requiresOAuth: true,
};

describe('MCPCardActions', () => {
  it('consolidates server commands into one labeled overflow menu', async () => {
    const user = userEvent.setup();
    const onEditClick = jest.fn();
    const onConfigClick = jest.fn();
    const onInitialize = jest.fn();
    const onRevoke = jest.fn();

    render(
      <MCPCardActions
        serverName="canvas"
        serverStatus={connectedOAuthServer}
        isInitializing={false}
        canCancel={false}
        hasCustomUserVars={true}
        canEdit={true}
        onEditClick={onEditClick}
        onConfigClick={onConfigClick}
        onInitialize={onInitialize}
        onCancel={jest.fn()}
        onRevoke={onRevoke}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'More options: canvas' });
    expect(screen.getAllByRole('button')).toHaveLength(1);

    await user.click(trigger);

    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Configure' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Reconnect' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Revoke' })).toBeVisible();

    await user.click(screen.getByRole('menuitem', { name: 'Reconnect' }));
    expect(onInitialize).toHaveBeenCalledTimes(1);
  });
});
