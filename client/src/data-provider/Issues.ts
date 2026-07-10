import { useMutation } from '@tanstack/react-query';
import { dataService } from 'librechat-data-provider';
import type { TSubmitIssueRequest, TSubmitIssueResponse } from 'librechat-data-provider';
import type { UseMutationResult } from '@tanstack/react-query';

export const useSubmitIssueMutation = (): UseMutationResult<
  TSubmitIssueResponse,
  unknown,
  TSubmitIssueRequest
> => useMutation((payload: TSubmitIssueRequest) => dataService.submitIssue(payload));
