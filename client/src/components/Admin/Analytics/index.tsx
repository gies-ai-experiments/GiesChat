import React, { useCallback } from 'react';
import { useAdminAgentAnalyticsQuery } from '~/data-provider';
import { KpiRow, ActivityPanel, ReachPanel, DepthPanel, SignalsPanel } from './Panels';
import { useLocalize } from '~/hooks';
import QueryState from '../QueryState';

interface AnalyticsSectionProps {
  /** Empty string means unfiltered, matching how the tables read the class filter. */
  groupId: string;
  days: number;
}

/**
 * Class-wide activity for the agents the caller can edit. Aggregate only — the
 * endpoint identifies no student, and neither does anything rendered here.
 */
export default function AnalyticsSection({ groupId, days }: AnalyticsSectionProps) {
  const localize = useLocalize();
  const params = { days, ...(groupId ? { groupId } : {}) };
  const { data, isLoading, error, refetch } = useAdminAgentAnalyticsQuery(params);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <section aria-labelledby="admin-analytics-heading" className="mb-8">
      <h2 id="admin-analytics-heading" className="mb-3 text-lg font-medium text-text-primary">
        {localize('com_ui_admin_analytics_heading')}
      </h2>
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={data != null && data.conversationCount === 0}
        emptyKey="com_ui_admin_analytics_empty"
        errorKey="com_ui_admin_analytics_error"
        onRetry={handleRetry}
      >
        {data != null && (
          <>
            <KpiRow data={data} />
            <div className="mb-3 grid gap-3 lg:grid-cols-[1.5fr_1fr]">
              <ActivityPanel data={data} />
              <ReachPanel data={data} />
            </div>
            <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
              <DepthPanel data={data} />
              <SignalsPanel data={data} />
            </div>
          </>
        )}
      </QueryState>
    </section>
  );
}
