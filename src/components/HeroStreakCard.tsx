import React from 'react';
import { Addiction } from '../types';
import mountains from '../assets/mountains.webp';
import { getCleanDays, StreakStats } from '../utils/streaks';
import { getSavedLabel } from '../utils/format';
import { formatCountdown, getMilestoneState } from '../utils/milestones';
import { useI18n } from '../i18n/useI18n';

interface HeroStreakCardProps {
  addiction: Addiction;
  streak: StreakStats;
}

// Where the user stands, in one card: the streak, the month (which a slip does
// not zero), what has been saved, and the next milestone.
const HeroStreakCard: React.FC<HeroStreakCardProps> = ({ addiction, streak }) => {
  const { t } = useI18n();
  const cleanDays = getCleanDays(addiction);
  const milestone = getMilestoneState(addiction.lastEngaged);

  const pills = [
    { key: 'clean', emoji: '🌱', label: t('last30Days'), value: t('cleanDaysValue', { clean: cleanDays.clean, total: cleanDays.total }) },
    { key: 'saved', emoji: '💰', label: t('savedShort'), value: getSavedLabel(addiction) }
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl shadow-card bg-brand-50 dark:bg-forest-900">
      <img
        src={mountains}
        alt=""
        aria-hidden="true"
        // The crop favours the sun and the tall peak on narrow screens, and
        // centres once the card is wide enough to show the whole horizon.
        className="absolute inset-0 w-full h-full object-cover object-[68%_50%] sm:object-center"
      />
      {/* Light theme: a soft wash so the figure keeps its contrast wherever the
          crop lands. Dark theme: the same scene, dimmed for light type. */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/75 via-white/25 to-transparent dark:hidden" />
      <div className="absolute inset-0 hidden dark:block bg-forest-900/75" />

      <div className="relative p-5 sm:p-6">
        <p className="text-sm font-medium text-forest-600 dark:text-white/70">{t('cleanForLabel')}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-6xl font-bold tracking-tight tabular-nums text-forest-800 dark:text-white">
            {streak.current}
          </span>
          <span className="text-2xl font-semibold text-brand-600 dark:text-brand-200">
            {t('daysCapitalized')}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {pills.map(pill => (
            <div
              key={pill.key}
              className="rounded-xl bg-white/85 dark:bg-white/10 ring-1 ring-forest-900/5 dark:ring-white/10 backdrop-blur-sm px-3 py-2.5 flex items-center gap-2.5"
            >
              <span className="text-lg leading-none shrink-0" aria-hidden="true">{pill.emoji}</span>
              <div className="min-w-0">
                <div className="text-[0.65rem] uppercase tracking-wide whitespace-nowrap text-forest-600/80 dark:text-white/60">
                  {pill.label}
                </div>
                <div className="text-sm font-semibold text-forest-800 dark:text-white tabular-nums truncate">
                  {pill.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        {milestone.next && milestone.msUntilNext !== undefined && (
          <div className="mt-3 rounded-xl bg-white/85 dark:bg-white/10 ring-1 ring-forest-900/5 dark:ring-white/10 backdrop-blur-sm px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-forest-800 dark:text-white truncate">
                {t('nextMilestone')}: {milestone.next.emoji} {t(milestone.next.labelKey)}
              </span>
              <span className="shrink-0 text-forest-600/80 dark:text-white/60">
                {t('milestoneIn', { time: formatCountdown(milestone.msUntilNext) })}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-forest-900/10 dark:bg-white/15 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-500 dark:bg-brand-300 transition-all duration-500"
                style={{ width: `${Math.round(milestone.progressToNext * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroStreakCard;
