import React from 'react';
import { Flame, Medal } from 'lucide-react';
import { Addiction } from '../types';
import { MountainScene } from './illustrations';
import { StreakStats } from '../utils/streaks';
import { useI18n } from '../i18n/useI18n';

interface HeroStreakCardProps {
  addiction: Addiction;
  streak: StreakStats;
}

const HeroStreakCard: React.FC<HeroStreakCardProps> = ({ addiction, streak }) => {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden rounded-2xl min-h-[15rem] p-5 sm:p-6 text-white flex flex-col justify-between
                      bg-gradient-to-br from-forest-400 via-forest-600 to-forest-900 shadow-card">
      <MountainScene className="absolute inset-x-0 bottom-0 h-3/4 w-full" />

      <div className="relative">
        <p className="text-sm text-white/70">{t('cleanForLabel')}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-6xl font-bold tracking-tight tabular-nums">{streak.current}</span>
          <span className="text-2xl font-semibold text-brand-200">{t('daysCapitalized')}</span>
        </div>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium">
          <span aria-hidden="true">{addiction.icon}</span>
          <span className="truncate max-w-[12rem]">{addiction.name}</span>
        </div>
      </div>

      <div className="relative mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-black/20 px-3 py-2.5 flex items-center gap-2.5">
          <Flame size={18} className="text-amber-300 shrink-0" />
          <div className="min-w-0">
            <div className="text-[0.7rem] uppercase tracking-wide text-white/60">{t('currentStreak')}</div>
            <div className="text-sm font-semibold">{streak.current} {t('days')}</div>
          </div>
        </div>
        <div className="rounded-xl bg-black/20 px-3 py-2.5 flex items-center gap-2.5">
          <Medal size={18} className="text-brand-200 shrink-0" />
          <div className="min-w-0">
            <div className="text-[0.7rem] uppercase tracking-wide text-white/60">{t('bestStreak')}</div>
            <div className="text-sm font-semibold">{streak.best} {t('days')}</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroStreakCard;
