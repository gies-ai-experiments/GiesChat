import React, { useMemo } from 'react';

/**
 * Both hues were run through the data-viz palette validator against the light and
 * dark chart surfaces. Series 2 exists only to call out one bucket; it is never a
 * second data series, so no legend is needed anywhere in this section.
 */
const SERIES_1 = 'text-[#2a78d6] dark:text-[#3987e5]';
const SERIES_2 = 'text-[#eb6834] dark:text-[#d95926]';

const AREA_WIDTH = 600;
const AREA_HEIGHT = 160;
const COLUMN_WIDTH = 600;
const COLUMN_HEIGHT = 150;

interface AreaChartProps {
  values: number[];
  ariaLabel: string;
  /** Rendered inside <title>, where a value a tooltip would show still reaches everyone. */
  detail: string;
}

/** Single series over time. The shape is the point; exact values live in the detail. */
export function AreaChart({ values, ariaLabel, detail }: AreaChartProps) {
  const { line, area } = useMemo(() => {
    const padTop = 10;
    const padBottom = 18;
    const peak = Math.max(1, ...values);
    const step = values.length <= 1 ? 0 : AREA_WIDTH / (values.length - 1);
    const x = (index: number) => (values.length <= 1 ? AREA_WIDTH / 2 : index * step);
    const y = (value: number) =>
      AREA_HEIGHT - padBottom - (value / peak) * (AREA_HEIGHT - padTop - padBottom);

    if (values.length === 0) {
      return { line: '', area: '' };
    }

    let path = '';
    let filled = `M ${x(0)} ${AREA_HEIGHT - padBottom} `;
    values.forEach((value, index) => {
      path += `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(value)} `;
      filled += `L ${x(index)} ${y(value)} `;
    });
    filled += `L ${x(values.length - 1)} ${AREA_HEIGHT - padBottom} Z`;

    return { line: path.trim(), area: filled };
  }, [values]);

  return (
    <svg
      viewBox={`0 0 ${AREA_WIDTH} ${AREA_HEIGHT}`}
      className={`w-full ${SERIES_1}`}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="none"
    >
      <title>{detail}</title>
      <path d={area} fill="currentColor" fillOpacity="0.13" />
      <path
        data-line
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

interface ColumnChartProps {
  buckets: { label: string; count: number }[];
  ariaLabel: string;
  /** Index drawn in the second hue — used to call out the one-turn bucket. */
  emphasizeIndex?: number;
}

export function ColumnChart({ buckets, ariaLabel, emphasizeIndex }: ColumnChartProps) {
  const padTop = 18;
  const padBottom = 20;
  const gap = 9;
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const barWidth =
    buckets.length === 0 ? 0 : (COLUMN_WIDTH - gap * (buckets.length - 1)) / buckets.length;

  return (
    <svg
      viewBox={`0 0 ${COLUMN_WIDTH} ${COLUMN_HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={ariaLabel}
    >
      {buckets.map((bucket, index) => {
        const barHeight = (bucket.count / max) * (COLUMN_HEIGHT - padTop - padBottom);
        const x = index * (barWidth + gap);
        const y = COLUMN_HEIGHT - padBottom - barHeight;
        return (
          <g key={bucket.label} className={index === emphasizeIndex ? SERIES_2 : SERIES_1}>
            <rect
              data-bar
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="4"
              fill="currentColor"
            />
            <text
              x={x + barWidth / 2}
              y={y - 6}
              textAnchor="middle"
              className="fill-text-secondary text-[11px] font-semibold tabular-nums"
            >
              {bucket.count}
            </text>
            <text
              x={x + barWidth / 2}
              y={COLUMN_HEIGHT - 5}
              textAnchor="middle"
              className="fill-text-secondary text-[11px]"
            >
              {bucket.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface MeterProps {
  value: number;
  total: number;
  label: string;
}

export function Meter({ value, total, label }: MeterProps) {
  const percent = total === 0 ? 0 : Math.min(100, Math.round((value / total) * 100));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={total}
      className="h-3.5 w-full overflow-hidden rounded-full border border-border-light bg-surface-secondary"
    >
      <div className={`h-full ${SERIES_1} bg-current`} style={{ width: `${percent}%` }} />
    </div>
  );
}
