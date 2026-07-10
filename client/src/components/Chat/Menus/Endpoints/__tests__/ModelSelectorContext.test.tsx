import { fireEvent, render, screen } from '@testing-library/react';
import type { TModelSpec, TStartupConfig } from 'librechat-data-provider';
import { ModelSelectorProvider, useModelSelectorContext } from '../ModelSelectorContext';

const mockOnSelectSpec = jest.fn();

jest.mock('~/hooks', () => ({
  useAgentDefaultPermissionLevel: () => undefined,
  useSelectorEffects: () => undefined,
  useKeyDialog: () => ({}),
  useEndpoints: () => ({
    mappedEndpoints: [],
    endpointRequiresUserKey: () => false,
  }),
  useLocalize: () => (key: string) => key,
}));

jest.mock('~/Providers', () => ({
  useAgentsMapContext: () => ({}),
  useAssistantsMapContext: () => ({}),
  useLiveAnnouncer: () => ({ announcePolite: jest.fn() }),
}));

jest.mock('~/data-provider', () => ({
  useGetEndpointsQuery: () => ({ data: {} }),
  useListAgentsQuery: () => ({ data: null }),
}));

jest.mock('~/hooks/Input/useSelectMention', () => () => ({
  onSelectEndpoint: jest.fn(),
  onSelectSpec: mockOnSelectSpec,
}));

jest.mock('../ModelSelectorChatContext', () => ({
  useModelSelectorChatContext: () => ({
    endpoint: 'Azure OpenAI',
    model: 'gpt-5.4',
    spec: 'gieschat-general',
    agent_id: null,
    assistant_id: null,
    getConversation: jest.fn(),
    newConversation: jest.fn(),
  }),
}));

const claudeSpec = {
  name: 'gieschat-claude-sonnet-5',
  label: 'Claude Sonnet 5',
  preset: {
    endpoint: 'anthropic',
    model: 'claude-sonnet-5',
  },
} as TModelSpec;

const startupConfig = {
  modelSpecs: {
    list: [claudeSpec],
  },
} as TStartupConfig;

function SelectionHarness() {
  const { selectedValues, handleSelectSpec } = useModelSelectorContext();

  return (
    <>
      <output data-testid="selected-spec">{selectedValues.modelSpec}</output>
      <button type="button" onClick={() => handleSelectSpec(claudeSpec)}>
        Select Claude
      </button>
    </>
  );
}

describe('ModelSelectorProvider', () => {
  beforeEach(() => {
    mockOnSelectSpec.mockClear();
  });

  it('waits for conversation state before changing the displayed model spec', () => {
    render(
      <ModelSelectorProvider startupConfig={startupConfig}>
        <SelectionHarness />
      </ModelSelectorProvider>,
    );

    expect(screen.getByTestId('selected-spec')).toHaveTextContent('gieschat-general');

    fireEvent.click(screen.getByRole('button', { name: 'Select Claude' }));

    expect(mockOnSelectSpec).toHaveBeenCalledWith(claudeSpec);
    expect(screen.getByTestId('selected-spec')).toHaveTextContent('gieschat-general');
  });
});
