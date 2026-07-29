import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import type { DynamicSettingProps } from 'librechat-data-provider';
import { componentMapping } from '../components';

/**
 * The agent builder renders these controls from `ModelPanel`, which opens standalone from
 * the marketplace and the class dashboard — neither of which mounts `ChatContext.Provider`
 * (only `ChatView` does). Selecting a provider there used to throw
 * "useChatContext must be used within a ChatContext.Provider" and blank the dialog.
 *
 * Every control reachable from `componentMapping` must therefore survive with no chat
 * context at all. Rendering straight into the DOM with no provider is the whole point —
 * do not wrap these in a ChatContext.
 */
describe('Parameters controls outside a chat view', () => {
  const baseProps: DynamicSettingProps = {
    settingKey: 'temperature',
    label: 'Temperature',
    labelCode: false,
    descriptionCode: false,
    placeholderCode: false,
    conversation: null,
    setOption: () => () => undefined,
  };

  const entries = Object.entries(componentMapping).filter(
    (entry): entry is [string, React.ComponentType<DynamicSettingProps>] => entry[1] != null,
  );

  it('exposes at least one mapped control', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it.each(entries)('renders %s without a ChatContext.Provider', (_name, Component) => {
    expect(() =>
      render(
        <div data-testid="host">
          <Component {...baseProps} />
        </div>,
      ),
    ).not.toThrow();
    expect(screen.getByTestId('host')).toBeInTheDocument();
  });
});
