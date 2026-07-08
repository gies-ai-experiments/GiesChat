import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spinner, useToastContext } from '@librechat/client';
import { ArrowUpRight, FileText, LayoutGrid, MessageSquareText, Users } from 'lucide-react';
import type { TRoomListItem } from 'librechat-data-provider';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useGetRoomsQuery, useArchiveRoomMutation } from '~/data-provider';
import { getMessageTimestamp } from '~/utils/messages';
import { NotificationSeverity } from '~/common';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import Shell from './Shell';

type RoomTab = 'active' | 'archived' | 'all';

const SPARK_SLOTS = 7;
const MOST_ACTIVE_LIMIT = 7;

const rankRooms = (rooms: TRoomListItem[]): TRoomListItem[] =>
  rooms
    .filter((room) => !room.archived)
    .sort(
      (a, b) =>
        b.messageCount7d - a.messageCount7d ||
        b.participantCount - a.participantCount ||
        (new Date(b.lastMessageAt ?? 0).getTime() || 0) -
          (new Date(a.lastMessageAt ?? 0).getTime() || 0),
    )
    .slice(0, MOST_ACTIVE_LIMIT);

function Spark({ values }: { values: number[] }) {
  const bars = [...values].sort((a, b) => b - a).slice(0, SPARK_SLOTS);
  const max = Math.max(...bars, 1);
  return (
    <div className="flex h-[34px] items-end gap-1" aria-hidden="true">
      {bars.map((value, i) => (
        <span
          key={i}
          className={cn(
            'min-w-[3px] flex-1 rounded-t-[3px]',
            i === 0 && value > 0 ? 'bg-text-secondary' : 'bg-border-medium',
          )}
          style={{ height: `${Math.max((value / max) * 100, 8)}%` }}
        />
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  children,
  caption,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  children: ReactNode;
  caption: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-border-light bg-surface-primary p-5 shadow-[0_1px_2px_rgba(16,33,71,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(16,33,71,0.10)] motion-reduce:transform-none motion-reduce:transition-none">
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-medium text-text-secondary">{label}</span>
        <span className="flex size-[34px] items-center justify-center rounded-[9px] bg-surface-tertiary text-text-secondary">
          <Icon className="size-[18px]" aria-hidden={true} />
        </span>
      </div>
      <div className="text-3xl font-bold leading-none text-text-primary">
        {value.toLocaleString()}
      </div>
      {children}
      <div className="text-xs text-text-secondary">{caption}</div>
    </div>
  );
}

function StatusPill({
  archived,
  localize,
}: {
  archived: boolean;
  localize: (k: 'com_ui_brainstorm_tab_active' | 'com_ui_brainstorm_tab_archived') => string;
}) {
  return (
    <span className="inline-block rounded-[20px] bg-surface-tertiary px-[9px] py-0.5 text-[11px] font-bold uppercase tracking-[0.03em] text-text-secondary">
      {archived
        ? localize('com_ui_brainstorm_tab_archived')
        : localize('com_ui_brainstorm_tab_active')}
    </span>
  );
}

export default function Overview() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [tab, setTab] = useState<RoomTab>('active');
  const { data: rooms, isLoading } = useGetRoomsQuery();
  const archiveRoom = useArchiveRoomMutation();

  const list = useMemo(() => rooms ?? [], [rooms]);
  const totals = useMemo(
    () =>
      list.reduce(
        (acc, room) => {
          acc.participants += room.participantCount;
          acc.messages7d += room.messageCount7d;
          acc.files += room.fileCount;
          if (room.archived) {
            acc.archived += 1;
          } else {
            acc.active += 1;
          }
          return acc;
        },
        { participants: 0, messages7d: 0, files: 0, active: 0, archived: 0 },
      ),
    [list],
  );
  const mostActive = useMemo(() => rankRooms(list), [list]);
  const rankMax = Math.max(...mostActive.map((room) => room.messageCount7d), 1);
  const filtered = useMemo(
    () => list.filter((room) => tab === 'all' || room.archived === (tab === 'archived')),
    [list, tab],
  );

  const onArchive = (room: TRoomListItem) => {
    if (!window.confirm(localize('com_ui_brainstorm_archive_confirm', { title: room.title }))) {
      return;
    }
    archiveRoom.mutate(room.roomId, {
      onError: () =>
        showToast({
          message: localize('com_ui_brainstorm_error'),
          severity: NotificationSeverity.ERROR,
          showIcon: true,
        }),
    });
  };

  const tabs: { id: RoomTab; label: string }[] = [
    { id: 'active', label: localize('com_ui_brainstorm_tab_active') },
    { id: 'archived', label: localize('com_ui_brainstorm_tab_archived') },
    { id: 'all', label: localize('com_ui_brainstorm_tab_all') },
  ];

  return (
    <Shell title={localize('com_ui_brainstorm_overview')}>
      {isLoading && (
        <div className="flex justify-center py-16" role="status" aria-label="loading">
          <Spinner className="size-6" />
        </div>
      )}

      {!isLoading && list.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-[14px] border border-border-light bg-surface-primary px-6 py-16 text-center">
          <p className="max-w-md text-sm text-text-secondary">
            {localize('com_ui_brainstorm_empty')}
          </p>
          <Link
            to="/brainstorm/new"
            className="rounded-lg bg-surface-submit px-3.5 py-2 text-[13px] font-semibold text-white transition hover:-translate-y-px hover:bg-surface-submit-hover motion-reduce:transform-none"
          >
            + {localize('com_ui_brainstorm_new_room')}
          </Link>
        </div>
      )}

      {!isLoading && list.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={localize('com_ui_brainstorm_rooms')}
              value={list.length}
              icon={LayoutGrid}
              caption={localize('com_ui_brainstorm_active_count', {
                active: totals.active,
                archived: totals.archived,
              })}
            >
              <div
                className="flex h-2 overflow-hidden rounded-[5px] bg-surface-tertiary"
                aria-hidden="true"
              >
                <div
                  className="bg-text-secondary"
                  style={{ width: `${(totals.active / list.length) * 100}%` }}
                />
                <div
                  className="bg-border-medium"
                  style={{ width: `${(totals.archived / list.length) * 100}%` }}
                />
              </div>
            </StatCard>
            <StatCard
              label={localize('com_ui_brainstorm_participants')}
              value={totals.participants}
              icon={Users}
              caption={localize('com_ui_brainstorm_across_rooms', { count: list.length })}
            >
              <Spark values={list.map((room) => room.participantCount)} />
            </StatCard>
            <StatCard
              label={localize('com_ui_brainstorm_messages')}
              value={totals.messages7d}
              icon={MessageSquareText}
              caption={localize('com_ui_brainstorm_last_7_days')}
            >
              <Spark values={list.map((room) => room.messageCount7d)} />
            </StatCard>
            <StatCard
              label={localize('com_ui_brainstorm_files')}
              value={totals.files}
              icon={FileText}
              caption={localize('com_ui_brainstorm_files_caption')}
            >
              <Spark values={list.map((room) => room.fileCount)} />
            </StatCard>
          </div>

          <div className="mt-[22px] grid grid-cols-1 items-start gap-[22px] xl:grid-cols-[1.7fr_1fr]">
            <section className="overflow-hidden rounded-[14px] border border-border-light bg-surface-primary shadow-[0_1px_2px_rgba(16,33,71,0.04)]">
              <div className="flex flex-wrap items-center gap-3 border-b border-border-light px-5 py-[18px]">
                <h2 className="text-base font-bold text-text-primary">
                  {localize('com_ui_brainstorm_your_rooms')}
                </h2>
                <div className="flex items-center gap-1" role="tablist">
                  {tabs.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={tab === id}
                      onClick={() => setTab(id)}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors',
                        tab === id
                          ? 'bg-surface-active text-text-primary'
                          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <Link
                  to="/brainstorm/new"
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-surface-submit px-3.5 py-2 text-[13px] font-semibold text-white transition hover:-translate-y-px hover:bg-surface-submit-hover motion-reduce:transform-none"
                >
                  + {localize('com_ui_brainstorm_new_room')}
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light">
                      {[
                        { label: localize('com_ui_brainstorm_room') },
                        { label: localize('com_ui_brainstorm_status') },
                        { label: localize('com_ui_brainstorm_last_activity') },
                        { label: localize('com_ui_brainstorm_msgs_7d'), num: true },
                        { label: localize('com_ui_brainstorm_people'), num: true },
                        { label: localize('com_ui_brainstorm_files'), num: true },
                        { label: '' },
                      ].map((header, i) => (
                        <th
                          key={i}
                          scope="col"
                          className={cn(
                            'px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-text-secondary',
                            header.num ? 'text-right' : 'text-left',
                          )}
                        >
                          {header.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((room) => (
                      <tr
                        key={room.roomId}
                        className="border-b border-border-light last:border-0 hover:bg-surface-hover"
                      >
                        <td className="max-w-64 px-3 py-3">
                          <Link
                            to={`/brainstorm/${room.roomId}`}
                            className="block truncate font-semibold text-text-primary hover:underline"
                          >
                            {room.title}
                          </Link>
                          <span className="mt-0.5 block truncate font-mono text-[11px] text-text-secondary">
                            {room.roomId}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill archived={room.archived} localize={localize} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-[13px] text-text-secondary">
                          {getMessageTimestamp(room.lastMessageAt)?.relative ?? '—'}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-text-primary">
                          {room.messageCount7d}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-text-primary">
                          {room.participantCount}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-text-primary">
                          {room.fileCount}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-3.5">
                            <Link
                              to={`/brainstorm/${room.roomId}`}
                              className="flex items-center gap-0.5 text-[13px] font-semibold text-text-secondary hover:text-text-primary hover:underline"
                            >
                              {localize('com_ui_brainstorm_open')}
                              <ArrowUpRight className="size-3.5" aria-hidden="true" />
                            </Link>
                            {!room.archived && (
                              <button
                                type="button"
                                disabled={archiveRoom.isLoading}
                                onClick={() => onArchive(room)}
                                className="rounded border border-border-light bg-surface-primary px-2 py-0.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                              >
                                {localize('com_ui_brainstorm_archive')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-8 text-center text-[13px] text-text-secondary"
                        >
                          {localize('com_ui_brainstorm_empty')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-[14px] border border-border-light bg-surface-primary shadow-[0_1px_2px_rgba(16,33,71,0.04)]">
              <div className="border-b border-border-light px-5 py-[18px]">
                <h2 className="text-base font-bold text-text-primary">
                  {localize('com_ui_brainstorm_most_active')}{' '}
                  <span className="font-sans text-xs font-medium text-text-secondary">
                    {localize('com_ui_brainstorm_last_7_days')}
                  </span>
                </h2>
              </div>
              <ol className="grid gap-0.5 px-4 py-1.5">
                {mostActive.map((room, index) => (
                  <li
                    key={room.roomId}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-1 py-[9px]"
                  >
                    <span
                      className={cn(
                        'flex size-[26px] items-center justify-center rounded-full text-xs font-bold',
                        index < 3
                          ? 'bg-surface-tertiary text-text-primary'
                          : 'bg-surface-tertiary text-text-secondary',
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <Link
                        to={`/brainstorm/${room.roomId}`}
                        className="block truncate text-sm font-semibold text-text-primary hover:underline"
                      >
                        {room.title}
                      </Link>
                      <span
                        className="mt-[5px] block h-1 overflow-hidden rounded-sm bg-surface-tertiary"
                        aria-hidden="true"
                      >
                        <span
                          className="block h-full rounded-sm bg-text-secondary"
                          style={{
                            width: `${Math.max((room.messageCount7d / rankMax) * 100, 4)}%`,
                          }}
                        />
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-[13px] font-bold tabular-nums text-text-primary">
                        {room.messageCount7d}
                      </span>
                      <span className="block text-[10px] font-medium text-text-secondary">
                        {localize('com_ui_brainstorm_msgs_label')}
                      </span>
                    </span>
                  </li>
                ))}
                {mostActive.length === 0 && (
                  <li className="px-2 py-7 text-center text-[13px] text-text-secondary">
                    {localize('com_ui_brainstorm_no_active')}
                  </li>
                )}
              </ol>
            </section>
          </div>
        </>
      )}
    </Shell>
  );
}
