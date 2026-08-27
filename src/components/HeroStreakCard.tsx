import React from 'react';
import { Addiction } from '../types';
import mountains from '../assets/mountains.webp';
import { StreakStats } from '../utils/streaks';
import { useI18n } from '../i18n/useI18n';

interface HeroStreakCardProps {
  addiction: Addiction;
  streak: StreakStats;
}

const HeroStreakCard: React.FC<HeroStreakCardProps> = ({ addiction, streak }) => {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden rounded-2xl min-h-[15rem] shadow-card bg-brand-50 dark:bg-forest-900">
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
      <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-white/15 to-transparent dark:hidden" />
      <div className="absolute inset-0 hidden dark:block bg-forest-900/75" />

      <div className="relative min-h-[15rem] p-5 sm:p-6 flex flex-col justify-between">
        <div>
          <p className="text-sm font-medium text-forest-600 dark:text-white/70">{t('cleanForLabel')}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-6xl font-bold tracking-tight tabular-nums text-forest-800 dark:text-white">
              {streak.current}
            </span>
            <span className="text-2xl font-semibold text-brand-600 dark:text-brand-200">
              {t('daysCapitalized')}
            </span>
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/75 dark:bg-white/10 px-2.5 py-1 text-xs font-medium text-forest-700 dark:text-white backdrop-blur-sm">
            <span aria-hidden="true">{addiction.icon}</span>
            <span className="truncate max-w-[12rem]">{addiction.name}</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/85 dark:bg-white/10 ring-1 ring-forest-900/5 dark:ring-white/10 backdrop-blur-sm px-3 py-2.5 flex items-center gap-2.5">
            <span className="text-lg leading-none shrink-0" aria-hidden="true">🔥</span>
            <div className="min-w-0">
              <div className="text-[0.65rem] uppercase tracking-wide whitespace-nowrap text-forest-600/80 dark:text-white/60">
                {t('currentStreak')}
              </div>
              <div className="text-sm font-semibold text-forest-800 dark:text-white">
                {streak.current} {t('days')}
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white/85 dark:bg-white/10 ring-1 ring-forest-900/5 dark:ring-white/10 backdrop-blur-sm px-3 py-2.5 flex items-center gap-2.5">
            <span className="text-lg leading-none shrink-0" aria-hidden="true">🏅</span>
            <div className="min-w-0">
              <div className="text-[0.65rem] uppercase tracking-wide whitespace-nowrap text-forest-600/80 dark:text-white/60">
                {t('bestStreak')}
              </div>
              <div className="text-sm font-semibold text-forest-800 dark:text-white">
                {streak.best} {t('days')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroStreakCard;
