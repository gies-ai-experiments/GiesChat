import React from 'react';
import { RecoilRoot } from 'recoil';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SystemRoles } from 'librechat-data-provider';
import type { TUser } from 'librechat-data-provider';
import useUnifiedSidebarLinks from '../useUnifiedSidebarLinks';

const mockGetAdminEffectiveCapabilities = jest.fn();

jest.mock('librechat-data-provider', () => {
  const actual = jest.requireActual('librechat-data-provider');
  return {
    ...actual,
    dataService: {
      ...actual.dataService,
      getAdminEffectiveCapabilities: () => mockGetAdminEffectiveCapabilities(),
    },
  };
});

jest.mock('librechat-data-provider/react-query', () => ({
  ...jest.requireActual('librechat-data-provider/react-query'),
  useUserKeyQuery: () => ({ data: { expiresAt: undefined } }),
}));

const mockUser = jest.fn<Partial<TUser> | undefined, []>();

jest.mock('~/hooks', () => ({
  useAuthContext: () => ({ user: mockUser() }),
  useShowMarketplace: () => false,
}));

jest.mock('~/hooks/Nav/useSideNavLinks', () => ({
  __esModule: true,
  default: () => [],
}));

jest.mock('~/components/Brainstorm/BrainstormPanel', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('~/components/UnifiedSidebar/ConversationsSection', () => ({
  __esModule: true,
  default: () => null,
}));

/** `useAdminAccess` stays real — the gate under test is the request it does or does not fire. */
jest.mock('~/data-provider', () => ({
  useAdminAccess: jest.requireActual('~/data-provider/Admin/queries').useAdminAccess,
  useGetStartupConfig: () => ({ data: undefined }),
  useGetEndpointsQuery: () => ({ data: {} }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <RecoilRoot>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </RecoilRoot>
  );
}

/**
 * The sidebar mounts for every signed-in user, so an ungated admin capability
 * check costs every student a 403 on first page load — a request whose answer
 * the client can already predict from the role it holds.
 */
describe('useUnifiedSidebarLinks — admin capability gate', () => {
  beforeEach(() => {
    mockGetAdminEffectiveCapabilities.mockReset();
    mockGetAdminEffectiveCapabilities.mockResolvedValue({
      capabilities: ['access:admin', 'read:usage', 'read:groups'],
    });
  });

  it('never asks the server about admin capabilities for a default-role user', async () => {
    mockUser.mockReturnValue({ id: 'u1', role: SystemRoles.USER });

    const { result } = renderHook(() => useUnifiedSidebarLinks(), { wrapper });

    await waitFor(() => expect(result.current.length).toBeGreaterThan(0));
    expect(mockGetAdminEffectiveCapabilities).not.toHaveBeenCalled();
    expect(result.current.some((link) => link.id === 'admin-dashboard')).toBe(false);
  });

  it('does not ask before the user is known', async () => {
    mockUser.mockReturnValue(undefined);

    renderHook(() => useUnifiedSidebarLinks(), { wrapper });

    await waitFor(() => expect(mockGetAdminEffectiveCapabilities).not.toHaveBeenCalled());
  });

  it('still asks, and shows the dashboard link, for an admin', async () => {
    mockUser.mockReturnValue({ id: 'u2', role: SystemRoles.ADMIN });

    const { result } = renderHook(() => useUnifiedSidebarLinks(), { wrapper });

    await waitFor(() => expect(mockGetAdminEffectiveCapabilities).toHaveBeenCalled());
    await waitFor(() =>
      expect(result.current.some((link) => link.id === 'admin-dashboard')).toBe(true),
    );
  });

  it('asks for a non-default custom role, which may still hold a grant', async () => {
    mockUser.mockReturnValue({ id: 'u3', role: 'INSTRUCTOR' });

    renderHook(() => useUnifiedSidebarLinks(), { wrapper });

    await waitFor(() => expect(mockGetAdminEffectiveCapabilities).toHaveBeenCalled());
  });
});
