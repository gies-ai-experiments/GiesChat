import React from 'react';
import type { AdminAnalyticsResponse } from 'librechat-data-provider';
import { AreaChart, ColumnChart, Meter } from './Charts';
import { useLocalize } from '~/hooks';

/** Shares arrive as 0–1; the dashboard speaks in whole percentages. */
const percent = (value: number, digits = 0): string =>
  (value * 100).toFixed(digits).replace(/\.0$/, '');

interface PanelProps {
  data: AdminAnalyticsResponse;
}

function Card({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border-light bg-surface-primary p-4">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      <p className="mb-3 mt-0.5 text-xs text-text-secondary">{caption}</p>
      {children}
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border-light bg-surface-primary p-4">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="text-3xl font-semibold tabular-nums text-text-primary">{value}</p>
      {sub != null && <p className="text-xs text-text-secondary">{sub}</p>}
    </div>
  );
}

export function KpiRow({ data }: PanelProps) {
  const localize = useLocalize();
  const perStudent =
    data.activeStudents === 0 ? '0' : (data.conversationCount / data.activeStudents).toFixed(1);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Tile
        label={localize('com_ui_admin_analytics_active_students')}
        value={String(data.activeStudents)}
        sub={localize('com_ui_admin_analytics_students', { total: data.enrolledStudents })}
      />
      <Tile
        label={localize('com_ui_admin_analytics_conversations')}
        value={String(data.conversationCount)}
        sub={localize('com_ui_admin_analytics_per_student', { value: perStudent })}
      />
      <Tile
        label={localize('com_ui_admin_analytics_median_turns')}
        value={String(data.medianTurns)}
      />
      <Tile
        label={localize('com_ui_admin_analytics_return_rate')}
        value={`${percent(data.returnRate)}%`}
      />
    </div>
  );
}

export function ActivityPanel({ data }: PanelProps) {
  const localize = useLocalize();
  const peak =
    data.dailyActivity.length === 0
      ? 0
      : Math.max(...data.dailyActivity.map((point) => point.conversationCount));

  const points = data.dailyActivity.map((point) => ({
    value: point.conversationCount,
    tooltip: `${point.date} · ${point.conversationCount} ${localize(
      'com_ui_admin_analytics_conversations',
    ).toLowerCase()}`,
  }));

  return (
    <Card
      title={localize('com_ui_admin_analytics_activity')}
      caption={localize('com_ui_admin_analytics_activity_caption')}
    >
      <AreaChart
        points={points}
        ariaLabel={localize('com_ui_admin_analytics_activity')}
        detail={localize('com_ui_admin_analytics_peak', { count: peak })}
      />
    </Card>
  );
}

/** Buckets carry their own share of the total, which is what a hover is really asking. */
function withShares(
  buckets: AdminAnalyticsResponse['depthBuckets'],
  unit: string,
): { label: string; count: number; tooltip: string }[] {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  return buckets.map((bucket) => ({
    ...bucket,
    tooltip:
      total === 0
        ? `${bucket.count} ${unit}`
        : `${bucket.count} ${unit} · ${Math.round((bucket.count / total) * 100)}%`,
  }));
}

export function ReachPanel({ data }: PanelProps) {
  const localize = useLocalize();
  /** Without a class filter the roster size is unknown, so a ratio would be meaningless. */
  const hasRoster = data.enrolledStudents > data.activeStudents;

  return (
    <Card
      title={localize('com_ui_admin_analytics_reach')}
      caption={localize('com_ui_admin_analytics_reach_caption')}
    >
      {hasRoster && (
        <div className="mb-4 grid gap-2">
          <Meter
            value={data.activeStudents}
            total={data.enrolledStudents}
            label={localize('com_ui_admin_analytics_reach_used')}
          />
          <div className="flex justify-between text-xs text-text-secondary">
            <span>{localize('com_ui_admin_analytics_reach_used')}</span>
            <b className="tabular-nums text-text-primary">
              {data.activeStudents} / {data.enrolledStudents}
            </b>
          </div>
          <div className="flex justify-between text-xs text-text-secondary">
            <span>{localize('com_ui_admin_analytics_reach_never')}</span>
            <b className="tabular-nums text-text-primary">
              {data.enrolledStudents - data.activeStudents}
            </b>
          </div>
        </div>
      )}
      <p className="mb-2 text-xs text-text-secondary">
        {localize('com_ui_admin_analytics_repeat')}
      </p>
      <ColumnChart
        buckets={withShares(
          data.reachBuckets,
          localize('com_ui_admin_analytics_reach_unit').toLowerCase(),
        )}
        ariaLabel={localize('com_ui_admin_analytics_repeat')}
      />
    </Card>
  );
}

export function DepthPanel({ data }: PanelProps) {
  const localize = useLocalize();
  return (
    <Card
      title={localize('com_ui_admin_analytics_depth')}
      caption={localize('com_ui_admin_analytics_depth_caption')}
    >
      <ColumnChart
        buckets={withShares(
          data.depthBuckets,
          localize('com_ui_admin_analytics_conversations').toLowerCase(),
        )}
        emphasizeIndex={0}
        ariaLabel={localize('com_ui_admin_analytics_depth')}
      />
    </Card>
  );
}

export function SignalsPanel({ data }: PanelProps) {
  const localize = useLocalize();
  /** A class can shrink after activity is recorded, which would otherwise read as negative. */
  const neverUsed = Math.max(0, data.enrolledStudents - data.activeStudents);

  const signals = [
    {
      tone: 'bg-red-500',
      text: localize('com_ui_admin_analytics_one_turn', { percent: percent(data.oneTurnShare) }),
    },
    {
      tone: 'bg-amber-500',
      text: localize('com_ui_admin_analytics_never_used', { count: neverUsed }),
    },
    {
      tone: 'bg-amber-500',
      text: localize('com_ui_admin_analytics_errors', { percent: percent(data.errorRate, 1) }),
    },
    {
      tone: 'bg-green-600',
      text: localize('com_ui_admin_analytics_returned', { percent: percent(data.returnRate) }),
    },
  ];

  return (
    <Card
      title={localize('com_ui_admin_analytics_signals')}
      caption={localize('com_ui_admin_analytics_signals_caption')}
    >
      <ul className="grid gap-2.5">
        {signals.map((signal) => (
          <li key={signal.text} className="flex items-center gap-2.5 text-sm text-text-secondary">
            <span className={`size-2 shrink-0 rounded-full ${signal.tone}`} aria-hidden="true" />
            {signal.text}
          </li>
        ))}
      </ul>
    </Card>
  );
}
