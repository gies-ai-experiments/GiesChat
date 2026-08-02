import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { AdminDashboardPanel } from 'librechat-data-provider';
import Customize from '../Customize';

const mockMutate = jest.fn();
const mockShowToast = jest.fn();

jest.mock('~/data-provider', () => ({
  useUpdateAdminDashboardLayoutMutation: () => ({ mutate: mockMutate }),
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string, values?: Record<string, string | number>) =>
    values === undefined ? key : `${key}:${Object.values(values).join(',')}`,
}));

jest.mock('@librechat/client', () => {
  const actual = jest.requireActual('@librechat/client');
  return { ...actual, useToastContext: () => ({ showToast: mockShowToast }) };
});

const layout: AdminDashboardPanel[] = [
  { id: 'kpi', visible: true },
  { id: 'activity', visible: true },
  { id: 'reach', visible: false },
  { id: 'depth', visible: true },
  { id: 'signals', visible: true },
];

/** `DndProvider` lives in `App.jsx` in the real app; a bare render has no drag context. */
const renderCustomize = () =>
  render(
    <DndProvider backend={HTML5Backend}>
      <Customize layout={layout} />
    </DndProvider>,
  );

const open = () => fireEvent.click(screen.getByRole('button', { name: 'com_ui_admin_customize' }));

describe('Customize', () => {
  beforeEach(() => {
    mockMutate.mockClear();
    mockShowToast.mockClear();
  });

  it('lists every panel with its stored visibility', () => {
    renderCustomize();
    open();

    expect(screen.getByRole('checkbox', { name: 'com_ui_admin_panel_kpi' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'com_ui_admin_panel_reach' })).not.toBeChecked();
  });

  it('does not save on every click — only when the dialog closes', () => {
    renderCustomize();
    open();
    fireEvent.click(screen.getByRole('checkbox', { name: 'com_ui_admin_panel_depth' }));

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('saves the edited layout when the dialog closes', () => {
    renderCustomize();
    open();
    fireEvent.click(screen.getByRole('checkbox', { name: 'com_ui_admin_panel_depth' }));
    fireEvent.click(screen.getByRole('button', { name: 'com_ui_admin_customize_done' }));

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate.mock.calls[0][0]).toEqual([
      { id: 'kpi', visible: true },
      { id: 'activity', visible: true },
      { id: 'reach', visible: false },
      { id: 'depth', visible: false },
      { id: 'signals', visible: true },
    ]);
  });

  it('restores every panel when Reset is clicked', () => {
    renderCustomize();
    open();
    fireEvent.click(screen.getByRole('button', { name: 'com_ui_admin_customize_reset' }));

    expect(screen.getByRole('checkbox', { name: 'com_ui_admin_panel_reach' })).toBeChecked();
  });

  it('does not save when nothing changed', () => {
    renderCustomize();
    open();
    fireEvent.click(screen.getByRole('button', { name: 'com_ui_admin_customize_done' }));

    expect(mockMutate).not.toHaveBeenCalled();
  });
});
