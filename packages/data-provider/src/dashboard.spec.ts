import {
  packRows,
  resolveLayout,
  sanitizeLayout,
  isAdminPanelId,
  ADMIN_PANEL_IDS,
} from './dashboard';
import type { AdminPanelId, AdminDashboardPanel } from './dashboard';

describe('isAdminPanelId', () => {
  it('accepts every known id', () => {
    for (const id of ADMIN_PANEL_IDS) {
      expect(isAdminPanelId(id)).toBe(true);
    }
  });

  it('rejects anything else', () => {
    expect(isAdminPanelId('nope')).toBe(false);
    expect(isAdminPanelId(null)).toBe(false);
    expect(isAdminPanelId(7)).toBe(false);
    expect(isAdminPanelId({ id: 'kpi' })).toBe(false);
  });
});

describe('sanitizeLayout', () => {
  it('returns an empty layout for anything that is not an array', () => {
    expect(sanitizeLayout(undefined)).toEqual([]);
    expect(sanitizeLayout(null)).toEqual([]);
    expect(sanitizeLayout('kpi')).toEqual([]);
    expect(sanitizeLayout({ panels: [] })).toEqual([]);
  });

  it('drops unknown ids and malformed entries', () => {
    expect(
      sanitizeLayout([
        { id: 'kpi', visible: true },
        { id: 'bogus', visible: true },
        null,
        'depth',
        { visible: false },
      ]),
    ).toEqual([{ id: 'kpi', visible: true }]);
  });

  it('de-duplicates by id, keeping the first occurrence', () => {
    expect(
      sanitizeLayout([
        { id: 'depth', visible: false },
        { id: 'depth', visible: true },
      ]),
    ).toEqual([{ id: 'depth', visible: false }]);
  });

  it('treats a missing visible flag as visible', () => {
    expect(sanitizeLayout([{ id: 'reach' }])).toEqual([{ id: 'reach', visible: true }]);
  });
});

describe('resolveLayout', () => {
  it('returns every panel visible, in registry order, for an empty layout', () => {
    expect(resolveLayout([])).toEqual(ADMIN_PANEL_IDS.map((id) => ({ id, visible: true })));
    expect(resolveLayout(undefined)).toEqual(resolveLayout([]));
    expect(resolveLayout(null)).toEqual(resolveLayout([]));
  });

  it('preserves stored order and visibility', () => {
    const stored: AdminDashboardPanel[] = [
      { id: 'signals', visible: true },
      { id: 'kpi', visible: false },
    ];
    const resolved = resolveLayout(stored);
    expect(resolved.slice(0, 2)).toEqual(stored);
  });

  it('appends registry panels the stored layout has never seen, visible, at the end', () => {
    const resolved = resolveLayout([{ id: 'signals', visible: true }]);
    expect(resolved[0]).toEqual({ id: 'signals', visible: true });
    expect(resolved).toHaveLength(ADMIN_PANEL_IDS.length);
    for (const panel of resolved.slice(1)) {
      expect(panel.visible).toBe(true);
    }
  });

  it('drops a stored id that is no longer in the registry order', () => {
    const order: AdminPanelId[] = ['kpi', 'activity'];
    const resolved = resolveLayout(
      [
        { id: 'depth', visible: true },
        { id: 'activity', visible: false },
      ],
      order,
    );
    expect(resolved).toEqual([
      { id: 'activity', visible: false },
      { id: 'kpi', visible: true },
    ]);
  });
});

describe('packRows', () => {
  const columns = (n: number) => () => n;

  it('packs the default layout into today’s three rows', () => {
    const packed = packRows([5, 3, 2, 3, 2], (width) => width);
    expect(packed.map((entry) => entry.columns)).toEqual([5, 3, 2, 3, 2]);
  });

  it('widens a lone wide panel to fill its row', () => {
    const packed = packRows([5, 3, 3, 2], (width) => width);
    expect(packed.map((entry) => entry.columns)).toEqual([5, 5, 3, 2]);
  });

  it('widens a single narrow panel to full width', () => {
    expect(packRows([2], columns(2)).map((entry) => entry.columns)).toEqual([5]);
  });

  it('gives the trailing panel the remainder when two narrow panels share a row', () => {
    expect(packRows([2, 2], (width) => width).map((entry) => entry.columns)).toEqual([2, 3]);
  });

  it('leaves a row that fills exactly alone', () => {
    expect(packRows([3, 2], (width) => width).map((entry) => entry.columns)).toEqual([3, 2]);
  });

  it('returns an empty result for an empty layout', () => {
    expect(packRows([], columns(2))).toEqual([]);
  });

  it('never exceeds the grid width', () => {
    expect(packRows([9], columns(9)).map((entry) => entry.columns)).toEqual([5]);
  });
});
