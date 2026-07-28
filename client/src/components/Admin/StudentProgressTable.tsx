import React, { useMemo, useState, useCallback } from 'react';
import {
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableCaption,
} from '@librechat/client';
import type { AdminStudentUsage } from 'librechat-data-provider';
import type { TranslationKeys } from '~/hooks';
import { useAdminAgentStudentUsageQuery } from '~/data-provider';
import { activityTime, formatLastActivity, hasNoActivity } from './activity';
import QueryState from './QueryState';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

type SortKey = 'name' | 'conversationCount' | 'messageCount' | 'lastActivity';
type SortDirection = 'asc' | 'desc';

const columns: { key: SortKey; labelKey: TranslationKeys; numeric: boolean }[] = [
  { key: 'name', labelKey: 'com_ui_admin_col_student', numeric: false },
  { key: 'conversationCount', labelKey: 'com_ui_admin_col_conversations', numeric: true },
  { key: 'messageCount', labelKey: 'com_ui_admin_col_messages', numeric: true },
  { key: 'lastActivity', labelKey: 'com_ui_admin_col_last_activity', numeric: false },
];

const ariaSortFor = (
  isSorted: boolean,
  direction: SortDirection,
): 'ascending' | 'descending' | 'none' => {
  if (!isSorted) {
    return 'none';
  }
  return direction === 'asc' ? 'ascending' : 'descending';
};

const sortIndicator = (isSorted: boolean, direction: SortDirection): string => {
  if (!isSorted) {
    return '';
  }
  return direction === 'asc' ? ' ↑' : ' ↓';
};

const compare = (a: AdminStudentUsage, b: AdminStudentUsage, key: SortKey): number => {
  if (key === 'name') {
    return a.name.localeCompare(b.name);
  }
  if (key === 'lastActivity') {
    return activityTime(a.lastActivity) - activityTime(b.lastActivity);
  }
  return a[key] - b[key];
};

interface StudentProgressTableProps {
  agentId: string;
  agentName: string;
  groupId: string;
  days: number;
}

export default function StudentProgressTable({
  agentId,
  agentName,
  groupId,
  days,
}: StudentProgressTableProps) {
  const localize = useLocalize();
  const [sortKey, setSortKey] = useState<SortKey>('lastActivity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const params = { days, ...(groupId ? { groupId } : {}) };
  const { data, isLoading, error, refetch } = useAdminAgentStudentUsageQuery(agentId, params);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
        return;
      }
      setSortKey(key);
      setSortDirection(key === 'name' ? 'asc' : 'desc');
    },
    [sortKey],
  );

  const students = data?.students;

  const { rows, inactiveCount } = useMemo(() => {
    if (!students) {
      return { rows: [] as AdminStudentUsage[], inactiveCount: 0 };
    }
    let inactive = 0;
    for (const student of students) {
      if (hasNoActivity(student)) {
        inactive += 1;
      }
    }
    const direction = sortDirection === 'asc' ? 1 : -1;
    const sorted = [...students].sort((a, b) => compare(a, b, sortKey) * direction);
    return { rows: sorted, inactiveCount: inactive };
  }, [students, sortKey, sortDirection]);

  return (
    <QueryState
      isLoading={isLoading}
      error={error}
      isEmpty={rows.length === 0}
      emptyKey="com_ui_admin_students_empty"
      errorKey="com_ui_admin_students_error"
      onRetry={handleRetry}
    >
      <p className="mb-3 text-sm text-text-secondary" role="status">
        {inactiveCount > 0
          ? localize('com_ui_admin_inactive_summary', {
              count: inactiveCount,
              total: rows.length,
            })
          : localize('com_ui_admin_all_active')}
      </p>
      <Table>
        <TableCaption className="sr-only">
          {localize('com_ui_admin_students_caption', { name: agentName })}
        </TableCaption>
        <TableHeader>
          <TableRow>
            {columns.map(({ key, labelKey, numeric }) => (
              <TableHead
                key={key}
                scope="col"
                className={numeric ? 'text-right' : undefined}
                aria-sort={ariaSortFor(sortKey === key, sortDirection)}
              >
                <button
                  type="button"
                  className="rounded font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-heavy"
                  onClick={() => toggleSort(key)}
                >
                  {localize(labelKey)}
                  <span aria-hidden="true">{sortIndicator(sortKey === key, sortDirection)}</span>
                </button>
              </TableHead>
            ))}
            <TableHead scope="col">{localize('com_ui_admin_col_email')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((student) => {
            const inactive = hasNoActivity(student);
            return (
              <TableRow
                key={student.userId}
                className={cn(inactive && 'bg-amber-50 dark:bg-amber-500/10')}
              >
                <TableCell className="font-medium text-text-primary">
                  <span className="flex items-center gap-2">
                    {student.name}
                    {inactive && (
                      <span className="rounded-full border border-amber-500/50 px-2 py-0.5 text-xs font-normal text-amber-700 dark:text-amber-400">
                        {localize('com_ui_admin_no_activity')}
                      </span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {student.conversationCount}
                </TableCell>
                <TableCell className="text-right tabular-nums">{student.messageCount}</TableCell>
                <TableCell className="whitespace-nowrap text-text-secondary">
                  {formatLastActivity(student.lastActivity) ?? localize('com_ui_none')}
                </TableCell>
                <TableCell className="text-text-secondary">{student.email}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </QueryState>
  );
}
