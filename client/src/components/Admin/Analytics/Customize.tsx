import React, { useRef, useMemo, useState, useCallback } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { GripVertical, SlidersHorizontal } from 'lucide-react';
import { resolveLayout } from 'librechat-data-provider';
import {
  Button,
  OGDialog,
  OGDialogTitle,
  OGDialogContent,
  useToastContext,
} from '@librechat/client';
import type { AdminDashboardPanel, AdminPanelId } from 'librechat-data-provider';
import { useUpdateAdminDashboardLayoutMutation } from '~/data-provider';
import { PANEL_ORDER, panelFor } from './registry';
import { useLocalize } from '~/hooks';

const DRAG_TYPE = 'admin-analytics-panel';

/** Order and visibility are the whole layout, so this is a complete equality check. */
const signature = (panels: AdminDashboardPanel[]): string =>
  panels.map((panel) => `${panel.id}:${panel.visible ? 1 : 0}`).join('|');

interface RowProps {
  panel: AdminDashboardPanel;
  index: number;
  label: string;
  reorderLabel: string;
  onToggle: (id: AdminPanelId) => void;
  onMove: (from: number, to: number) => void;
}

function Row({ panel, index, label, reorderLabel, onToggle, onMove }: RowProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [, drop] = useDrop<{ index: number }>({
    accept: DRAG_TYPE,
    hover(item) {
      if (item.index === index) {
        return;
      }
      onMove(item.index, index);
      item.index = index;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: DRAG_TYPE,
    item: () => ({ index }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`flex items-center gap-3 rounded-lg border border-border-light px-3 py-2 ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <GripVertical
        className="size-4 shrink-0 cursor-grab text-text-secondary"
        aria-label={reorderLabel}
      />
      <input
        type="checkbox"
        id={`admin-panel-${panel.id}`}
        checked={panel.visible}
        onChange={() => onToggle(panel.id)}
        aria-label={label}
        className="size-4"
      />
      <label htmlFor={`admin-panel-${panel.id}`} className="text-sm text-text-primary">
        {label}
      </label>
    </div>
  );
}

/**
 * Edits are held locally so the dashboard reflows live behind the dialog; the save
 * fires once when the dialog closes rather than once per checkbox click.
 */
export default function Customize({ layout }: { layout: AdminDashboardPanel[] }) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { mutate } = useUpdateAdminDashboardLayoutMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<AdminDashboardPanel[]>(layout);

  const defaultLayout = useMemo(() => resolveLayout([], PANEL_ORDER), []);

  const handleToggle = useCallback((id: AdminPanelId) => {
    setDraft((current) =>
      current.map((panel) => (panel.id === id ? { ...panel, visible: !panel.visible } : panel)),
    );
  }, []);

  const handleMove = useCallback((from: number, to: number) => {
    setDraft((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const handleReset = useCallback(() => setDraft(defaultLayout), [defaultLayout]);

  /**
   * Closing is the save. `signature` guards the two ways that can fire twice — an
   * explicit Done plus Radix's own unmount `onOpenChange` — and also skips the
   * request entirely when a professor opened the dialog and changed nothing.
   */
  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open) {
        setDraft(layout);
        return;
      }
      if (signature(draft) === signature(layout)) {
        return;
      }
      mutate(draft, {
        onError: () => showToast({ message: localize('com_ui_admin_customize_error') }),
      });
    },
    [draft, layout, mutate, showToast, localize],
  );

  return (
    <>
      <Button variant="outline" onClick={() => handleOpenChange(true)}>
        <SlidersHorizontal className="mr-2 size-4" aria-hidden="true" />
        {localize('com_ui_admin_customize')}
      </Button>
      <OGDialog open={isOpen} onOpenChange={handleOpenChange}>
        <OGDialogContent className="w-11/12 max-w-sm">
          <OGDialogTitle>{localize('com_ui_admin_customize_title')}</OGDialogTitle>
          <div className="grid gap-2 py-2">
            {draft.map((panel, index) => {
              const definition = panelFor(panel.id);
              if (definition === undefined) {
                return null;
              }
              const label = localize(definition.labelKey);
              return (
                <Row
                  key={panel.id}
                  panel={panel}
                  index={index}
                  label={label}
                  reorderLabel={localize('com_ui_admin_customize_reorder', { name: label })}
                  onToggle={handleToggle}
                  onMove={handleMove}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={handleReset} className="px-2">
              {localize('com_ui_admin_customize_reset')}
            </Button>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {localize('com_ui_admin_customize_done')}
            </Button>
          </div>
        </OGDialogContent>
      </OGDialog>
    </>
  );
}
