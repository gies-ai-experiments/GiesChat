import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen } from '@testing-library/react';
import AgentsPageHeader from '../AgentsPageHeader';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) =>
    ({
      com_ui_agents: 'Agents',
      com_agents_marketplace_subtitle: 'Find the right agent.',
      com_agents_browse: 'Browse',
      com_agents_my_agents: 'My GPTs',
      com_agents_create: 'Create agent',
    })[key] ?? key,
}));

describe('AgentsPageHeader', () => {
  it('presents Browse, My GPTs, and Create as one workspace', () => {
    render(
      <AgentsPageHeader
        isMyAgents={false}
        canCreate
        onBrowse={jest.fn()}
        onMyAgents={jest.fn()}
        onCreate={jest.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Agents' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Browse' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'My GPTs' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('button', { name: 'Create agent' })).toBeInTheDocument();
  });

  it('calls the existing mode and create handlers', () => {
    const onBrowse = jest.fn();
    const onMyAgents = jest.fn();
    const onCreate = jest.fn();
    render(
      <AgentsPageHeader
        isMyAgents
        canCreate
        onBrowse={onBrowse}
        onMyAgents={onMyAgents}
        onCreate={onCreate}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Browse' }));
    fireEvent.click(screen.getByRole('tab', { name: 'My GPTs' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create agent' }));

    expect(onBrowse).toHaveBeenCalledTimes(1);
    expect(onMyAgents).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('hides personal-agent controls without create permission', () => {
    render(
      <AgentsPageHeader
        isMyAgents={false}
        canCreate={false}
        onBrowse={jest.fn()}
        onMyAgents={jest.fn()}
        onCreate={jest.fn()}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Browse' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'My GPTs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create agent' })).not.toBeInTheDocument();
  });
});
