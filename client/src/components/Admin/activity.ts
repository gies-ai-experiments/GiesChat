/** Formats an ISO activity timestamp for display, or `null` when there has been none. */
export const formatLastActivity = (lastActivity: string | null): string | null => {
  if (!lastActivity) {
    return null;
  }
  const date = new Date(lastActivity);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/** Sortable epoch value; rows that never had activity sort as the oldest possible. */
export const activityTime = (lastActivity: string | null): number => {
  if (!lastActivity) {
    return 0;
  }
  const time = new Date(lastActivity).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export const hasNoActivity = (row: { conversationCount: number; messageCount: number }): boolean =>
  row.conversationCount === 0 && row.messageCount === 0;
