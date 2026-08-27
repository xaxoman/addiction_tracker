import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Addiction } from '../types';
import { getDaysCleanSeries } from '../utils/streaks';
import { useI18n } from '../i18n/useI18n';

interface ProgressChartCardProps {
  addiction: Addiction;
}

const RANGES = [30, 90] as const;
type Range = (typeof RANGES)[number];

// Chart geometry, in viewBox units. The SVG scales with the card, so these are
// only ever relative to each other.
const WIDTH = 320;
const HEIGHT = 150;
const PAD_LEFT = 26;
const PAD_RIGHT = 6;
const PAD_TOP = 10;
const PAD_BOTTOM = 20;

const TICK_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 250, 500, 1000];

const ProgressChartCard: React.FC<ProgressChartCardProps> = ({ addiction }) => {
  const { t, language } = useI18n();
  const locale = language === 'it' ? 'it-IT' : 'en-US';
  const [range, setRange] = useState<Range>(30);

  const points = useMemo(() => getDaysCleanSeries(addiction, range), [addiction, range]);

  const maxValue = Math.max(1, ...points.map(point => point.days));
  // Round the axis up to a readable step so the gridlines land on whole days.
  const step = TICK_STEPS.find(candidate => maxValue / candidate <= 4) ?? 1000;
  const top = Math.max(step, Math.ceil(maxValue / step) * step);
  const ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, index) => index * step);

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const toX = (index: number) => PAD_LEFT + (points.length > 1 ? (index / (points.length - 1)) * plotWidth : plotWidth / 2);
  const toY = (value: number) => PAD_TOP + plotHeight - (value / top) * plotHeight;

  const line = points.map((point, index) => `${toX(index).toFixed(2)},${toY(point.days).toFixed(2)}`).join(' ');
  const area = `${PAD_LEFT},${PAD_TOP + plotHeight} ${line} ${(PAD_LEFT + plotWidth).toFixed(2)},${PAD_TOP + plotHeight}`;

  const formatDate = (date: Date) => date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  const labelIndexes = points.length > 1
    ? Array.from(new Set([0, Math.round((points.length - 1) / 3), Math.round(((points.length - 1) * 2) / 3), points.length - 1]))
    : [0];

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="card-title">{t('yourProgress')}</h2>
          <p className="mt-0.5 text-xs text-sage-500 dark:text-sage-400">{t('daysCleanAxis')}</p>
        </div>

        <div className="relative shrink-0">
          <select
            value={range}
            onChange={event => setRange(Number(event.target.value) as Range)}
            className="pill-select"
            aria-label={t('chartRange')}
          >
            {RANGES.map(option => (
              <option key={option} value={option}>
                {t('lastNDays', { count: option })}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-400" />
        </div>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-3 w-full h-auto" role="img" aria-label={t('yourProgress')}>
        <defs>
          <linearGradient id="progress-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        <g className="text-sage-200 dark:text-sage-700">
          {ticks.map(tick => (
            <line
              key={tick}
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={toY(tick)}
              y2={toY(tick)}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray={tick === 0 ? undefined : '3 3'}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>

        <g className="text-sage-400 dark:text-sage-500" fill="currentColor" fontSize="8">
          {ticks.map(tick => (
            <text key={tick} x={PAD_LEFT - 6} y={toY(tick) + 3} textAnchor="end">
              {tick}
            </text>
          ))}
          {labelIndexes.map(index => (
            <text
              key={index}
              x={toX(index)}
              y={HEIGHT - 6}
              textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
            >
              {formatDate(points[index].date)}
            </text>
          ))}
        </g>

        <g className="text-brand-500 dark:text-brand-400">
          <polygon points={area} fill="url(#progress-area)" />
          <polyline
            points={line}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {points.length <= 31 && points.map((point, index) => (
            <circle
              key={point.date.getTime()}
              cx={toX(index)}
              cy={toY(point.days)}
              r="2"
              fill="currentColor"
            >
              <title>{`${formatDate(point.date)}: ${point.days}`}</title>
            </circle>
          ))}
        </g>
      </svg>
    </section>
  );
};

export default ProgressChartCard;
