import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, MutationKeys, dataService } from 'librechat-data-provider';
import type { UseMutationResult } from '@tanstack/react-query';
import type { AdminDashboardPanel, AdminDashboardLayoutResponse } from 'librechat-data-provider';

/**
 * Saves the caller's panel layout. On failure the layout query is invalidated so the
 * UI snaps back to what is actually stored rather than showing a layout that was
 * never saved.
 */
export const useUpdateAdminDashboardLayoutMutation = (): UseMutationResult<
  AdminDashboardLayoutResponse,
  unknown,
  AdminDashboardPanel[]
> => {
  const queryClient = useQueryClient();

  return useMutation(
    (panels: AdminDashboardPanel[]) => dataService.updateAdminDashboardLayout(panels),
    {
      mutationKey: [MutationKeys.updateAdminDashboardLayout],
      onSuccess: (data) => {
        queryClient.setQueryData([QueryKeys.adminDashboardLayout], data);
      },
      onError: () => {
        queryClient.invalidateQueries([QueryKeys.adminDashboardLayout]);
      },
    },
  );
};
