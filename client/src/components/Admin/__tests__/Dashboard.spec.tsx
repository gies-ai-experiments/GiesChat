import React from 'react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import type {
  AdminAgentUsageResponse,
  AdminGroupListResponse,
  AdminAgentStudentUsageResponse,
} from 'librechat-data-provider';
import AdminDashboard from '../Dashboard';

const mockGetAdminEffectiveCapabilities = jest.fn();
const mockGetAdminGroups = jest.fn();
const mockGetAdminAgentUsage = jest.fn();
const mockGetAdminAgentStudentUsage = jest.fn();
const mockGetAgentById = jest.fn();

jest.mock('librechat-data-provider', () => {
  const actual = jest.requireActual('librechat-data-provider');
  return {
    ...actual,
    dataService: {
      ...actual.dataService,
      getAdminEffectiveCapabilities: () => mockGetAdminEffectiveCapabilities(),
      getAdminGroups: () => mockGetAdminGroups(),
      getAdminAgentUsage: (params?: unknown) => mockGetAdminAgentUsage(params),
      getAdminAgentStudentUsage: () => mockGetAdminAgentStudentUsage(),
      getAgentById: () => mockGetAgentById(),
    },
  };
});

jest.mock('~/components/Sharing/GenericGrantAccessDialog', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

/** The real builder pulls in the whole agent-panel provider tree; only its presence matters here. */
jest.mock('~/components/SidePanel/Agents/AgentPanelSwitch', () => ({
  __esModule: true,
  default: () => <div data-testid="agent-panel-switch" />,
}));

/** Mocked at the leaf, not the `~/hooks` barrel — mocking the barrel deadlocks its circular requires. */
const mockUseHasAccess = jest.fn();
jest.mock('~/hooks/Roles/useHasAccess', () => ({
  __esModule: true,
  default: () => mockUseHasAccess(),
}));

const forbidden = () =>
  Promise.reject({ isAxiosError: true, response: { status: 403 }, message: 'Forbidden' });

const serverError = () =>
  Promise.reject({ isAxiosError: true, response: { status: 500 }, message: 'Server error' });

/** What a professor actually holds: the dashboard reads usage AND class rosters. */
const professorCapabilities = ['access:admin', 'read:usage', 'read:groups'];

const groups: AdminGroupListResponse = {
  groups: [{ _id: 'group-1', name: 'BADM 350' }],
  total: 1,
  limit: 200,
  offset: 0,
};

const agentUsage: AdminAgentUsageResponse = {
  agents: [
    {
      agent_id: 'agent_1',
      name: 'Case Study Coach',
      conversationCount: 12,
      userCount: 4,
      messageCount: 96,
      lastActivity: '2026-07-20T10:00:00.000Z',
    },
  ],
};

const studentUsage: AdminAgentStudentUsageResponse = {
  agent_id: 'agent_1',
  students: [
    {
      userId: 'user-1',
      name: 'Active Student',
      email: 'active@illinois.edu',
      conversationCount: 3,
      messageCount: 21,
      lastActivity: '2026-07-20T10:00:00.000Z',
    },
    {
      userId: 'user-2',
      name: 'Quiet Student',
      email: 'quiet@illinois.edu',
      conversationCount: 0,
      messageCount: 0,
      lastActivity: null,
    },
  ],
};

const renderDashboard = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHasAccess.mockReturnValue(true);
    mockGetAdminEffectiveCapabilities.mockResolvedValue({ capabilities: professorCapabilities });
    mockGetAdminGroups.mockResolvedValue(groups);
    mockGetAdminAgentUsage.mockResolvedValue(agentUsage);
    mockGetAdminAgentStudentUsage.mockResolvedValue(studentUsage);
    mockGetAgentById.mockResolvedValue({ _id: 'db-id-1', id: 'agent_1', name: 'Case Study Coach' });
  });

  it('opens the agent builder inline without leaving the dashboard', async () => {
    renderDashboard();
    const build = await screen.findByRole('button', { name: /build an agent/i });
    await userEvent.click(build);
    /**
     * Asserts the builder actually renders, not merely that a handler fired. The first
     * implementation navigated to /c/new and preselected the agent-builder side panel,
     * which the unified sidebar filters out — so the click silently did nothing.
     */
    expect(await screen.findByTestId('agent-panel-switch')).toBeInTheDocument();
    /** The modal aria-hides the page behind it, so "never left" is proved on close. */
    await userEvent.keyboard('{Escape}');
    expect(await screen.findByRole('heading', { name: /class dashboard/i })).toBeInTheDocument();
  });

  it('refetches usage when the builder closes so a new agent shows up', async () => {
    renderDashboard();
    await userEvent.click(await screen.findByRole('button', { name: /build an agent/i }));
    await screen.findByTestId('agent-panel-switch');
    const callsBefore = mockGetAdminAgentUsage.mock.calls.length;
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(mockGetAdminAgentUsage.mock.calls.length).toBeGreaterThan(callsBefore),
    );
  });

  it('hides the build button from a professor without create permission', async () => {
    mockUseHasAccess.mockReturnValue(false);
    renderDashboard();
    await screen.findByRole('heading', { name: /agents/i });
    expect(screen.queryByRole('button', { name: /build an agent/i })).not.toBeInTheDocument();
  });

  it('shows a loading state while the capability check is in flight', () => {
    mockGetAdminEffectiveCapabilities.mockReturnValue(new Promise(() => undefined));
    renderDashboard();

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows the forbidden message when the user lacks the admin capability', async () => {
    mockGetAdminEffectiveCapabilities.mockImplementation(forbidden);
    renderDashboard();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "You don't have access to the class dashboard",
    );
    expect(mockGetAdminAgentUsage).not.toHaveBeenCalled();
  });

  /**
   * `access:admin` only means the capabilities endpoint answered. The nav link and this
   * view are both driven by `useAdminAccess`, so a helpdesk admin who lacks the
   * dashboard's own capabilities must be turned away here rather than at a 403.
   */
  it.each<[string, string[]]>([
    ['access:admin alone', ['access:admin']],
    ['read:users but not read:usage', ['access:admin', 'read:users']],
    ['read:usage but not read:groups', ['access:admin', 'read:usage']],
    ['read:groups but not read:usage', ['access:admin', 'read:groups']],
    ['no capabilities at all', []],
  ])('denies a user holding %s', async (_label, capabilities) => {
    mockGetAdminEffectiveCapabilities.mockResolvedValue({ capabilities });
    renderDashboard();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "You don't have access to the class dashboard",
    );
    expect(mockGetAdminAgentUsage).not.toHaveBeenCalled();
    expect(mockGetAdminGroups).not.toHaveBeenCalled();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('admits a professor granted manage:groups, which implies read:groups', async () => {
    mockGetAdminEffectiveCapabilities.mockResolvedValue({
      capabilities: ['access:admin', 'read:usage', 'manage:groups'],
    });
    renderDashboard();

    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('warns that the class list is truncated when the server reports more', async () => {
    mockGetAdminGroups.mockResolvedValue({ ...groups, total: 412 });
    renderDashboard();

    expect(await screen.findByText(/Showing the first 1 of 412 classes/)).toBeInTheDocument();
  });

  it('shows no truncation warning when every class is listed', async () => {
    renderDashboard();
    await screen.findByRole('table');

    expect(screen.queryByText(/Showing the first/)).not.toBeInTheDocument();
  });

  it('renders agent usage once the data resolves', async () => {
    renderDashboard();

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /View student progress for Case Study Coach/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Conversations' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '96' })).toBeInTheDocument();
  });

  it('renders an empty state when the professor has no agents', async () => {
    mockGetAdminAgentUsage.mockResolvedValue({ agents: [] });
    renderDashboard();

    expect(await screen.findByText(/No agents yet/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders an error state with a retry when agent usage fails', async () => {
    mockGetAdminAgentUsage.mockImplementation(serverError);
    renderDashboard();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load agent activity.");

    mockGetAdminAgentUsage.mockResolvedValue(agentUsage);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('defaults to an unfiltered 30-day window and filters usage by the selected class', async () => {
    renderDashboard();
    await screen.findByRole('table');

    expect(mockGetAdminAgentUsage).toHaveBeenCalledWith({ days: 30 });
    expect(screen.getAllByText('All classes').length).toBeGreaterThan(0);

    await userEvent.click(screen.getByTestId('admin-class-select'));
    await userEvent.click(await screen.findByRole('option', { name: 'BADM 350' }));

    await waitFor(() =>
      expect(mockGetAdminAgentUsage).toHaveBeenCalledWith({ days: 30, groupId: 'group-1' }),
    );
  });

  it('drills into student progress and flags students with no activity', async () => {
    renderDashboard();

    await userEvent.click(
      await screen.findByRole('button', { name: /View student progress for Case Study Coach/ }),
    );

    expect(await screen.findByText(/Student progress/)).toBeInTheDocument();
    expect(
      screen.getByText('1 of 2 students have no activity in this window.'),
    ).toBeInTheDocument();
    expect(screen.getByText('No activity')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'quiet@illinois.edu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share with class' })).toBeInTheDocument();
  });

  it('sorts the student table when a column header is activated', async () => {
    renderDashboard();

    await userEvent.click(
      await screen.findByRole('button', { name: /View student progress for Case Study Coach/ }),
    );
    await screen.findByText(/Student progress/);

    const messagesHeader = () => screen.getByRole('columnheader', { name: /Messages/ });
    expect(messagesHeader()).toHaveAttribute('aria-sort', 'none');

    await userEvent.click(screen.getByRole('button', { name: /Messages/ }));

    await waitFor(() => expect(messagesHeader()).toHaveAttribute('aria-sort', 'descending'));
    const rowNames = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.textContent ?? '');
    expect(rowNames[0]).toContain('Active Student');

    await userEvent.click(screen.getByRole('button', { name: /Messages/ }));
    await waitFor(() => expect(messagesHeader()).toHaveAttribute('aria-sort', 'ascending'));
    expect(screen.getAllByRole('row')[1].textContent ?? '').toContain('Quiet Student');
  });
});
