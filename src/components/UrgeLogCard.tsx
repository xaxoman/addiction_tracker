import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Addiction } from '../types';
import {
  startOfCurrentMonth,
  startOfCurrentWeek,
  summarizeUrgeIntensity
} from '../utils/urgeStats';
import { useI18n } from '../i18n/useI18n';

interface UrgeLogCardProps {
  addiction: Addiction;
}

type Period = 'week' | 'month';

// Donut geometry. Segments are drawn as dashes on one circle so they always
// meet exactly, whatever the counts are.
const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const UrgeLogCard: React.FC<UrgeLogCardProps> = ({ addiction }) => {
  const { t } = useI18n();
  const [period, setPeriod] = useState<Period>('week');

  const since = period === 'week' ? startOfCurrentWeek() : startOfCurrentMonth();
  const breakdown = useMemo(
    () => summarizeUrgeIntensity(addiction, since),
    // `since` is derived from `period`; recomputing on the period is enough and
    // keeps the value stable between renders on the same day.
    [addiction, period] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const slices = [
    { key: 'low', value: breakdown.low, color: '#348A5E', label: t('intensityLow') },
    { key: 'medium', value: breakdown.medium, color: '#F0B429', label: t('intensityMedium') },
    { key: 'high', value: breakdown.high, color: '#E4572E', label: t('intensityHigh') },
    { key: 'unrated', value: breakdown.unrated, color: '#C2CDBE', label: t('intensityUnrated') }
  ].filter(slice => slice.value > 0);

  let offset = 0;

  return (
    <section className="card p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <h2 className="card-title">{t('urgeLog')}</h2>
        <div className="relative shrink-0">
          <select
            value={period}
            onChange={event => setPeriod(event.target.value as Period)}
            className="pill-select"
            aria-label={t('urgeLog')}
          >
            <option value="week">{t('thisWeek')}</option>
            <option value="month">{t('thisMonth')}</option>
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-400" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-5 sm:gap-4 lg:flex-col lg:gap-4">
        <div className="relative w-28 h-28 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              strokeWidth="11"
              className="text-sage-100 dark:text-sage-700"
              stroke="currentColor"
            />
            {slices.map(slice => {
              const length = (slice.value / breakdown.total) * CIRCUMFERENCE;
              const dash = `${Math.max(0, length - 2)} ${CIRCUMFERENCE - Math.max(0, length - 2)}`;
              const element = (
                <circle
                  key={slice.key}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                />
              );
              offset += length;
              return element;
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-sage-900 dark:text-white tabular-nums">
              {breakdown.total}
            </span>
            <span className="text-[0.65rem] font-medium uppercase tracking-wide text-sage-400">
              {t('logged')}
            </span>
          </div>
        </div>

        <ul className="space-y-1.5 min-w-0 lg:w-full">
          {breakdown.total === 0 ? (
            <li className="text-sm text-sage-500 dark:text-sage-400">{t('noUrgesInPeriod')}</li>
          ) : (
            slices.map(slice => (
              <li key={slice.key} className="flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                <span className="text-sage-600 dark:text-sage-300">{slice.label}</span>
                <span className="ml-auto font-semibold text-sage-900 dark:text-white tabular-nums">
                  {slice.value}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
};

export default UrgeLogCard;
