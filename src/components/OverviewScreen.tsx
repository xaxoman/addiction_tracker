import React, { useEffect, useRef, useState } from 'react';
import { Plus, Zap } from 'lucide-react';
import { Addiction, DailyCheckIn } from '../types';
import { RelapseDetails, UrgeInput } from '../context/AddictionContext';
import { CheckInInput } from '../context/CheckInContext';
import HeroStreakCard from './HeroStreakCard';
import MilestoneCard from './MilestoneCard';
import ProgressChartCard from './ProgressChartCard';
import UrgeLogCard from './UrgeLogCard';
import ToolsAndSupport from './ToolsAndSupport';
import QuoteCard from './QuoteCard';
import DailyCheckInCard from './DailyCheckInCard';
import DraggableAddictionList from './DraggableAddictionList';
import StatsSection from './StatsSection';
import { getStreakStats } from '../utils/streaks';
import { getQuoteOfTheDay } from '../utils/quotes';
import { useI18n } from '../i18n/useI18n';

interface OverviewScreenProps {
  addictions: Addiction[];
  focusAddiction: Addiction;
  onFocusChange: (id: string) => void;
  todaysCheckIn: DailyCheckIn | null;
  // Bumped by the navigation's "Journal" entry so the check-in editor opens
  // and scrolls into view from anywhere in the app.
  journalSignal: number;
  onRecordCheckIn: (input: CheckInInput) => void;
  onOpenPanic: (addiction: Addiction) => void;
  onOpenBreathing: () => void;
  onAdd: () => void;
  onReset: (id: string, date: Date, details?: RelapseDetails) => void;
  onDeleteRelapse: (id: string, relapseId: string) => void;
  onLogUrge: (id: string, input: UrgeInput) => void;
  onDeleteUrge: (id: string, urgeId: string) => void;
  onReorder: (startIndex: number, endIndex: number) => void;
  onEdit: (addiction: Addiction) => void;
  onDelete: (id: string) => void;
}

const getGreetingKey = (hour: number): string => {
  if (hour < 12) return 'goodMorning';
  if (hour < 18) return 'goodAfternoon';
  return 'goodEvening';
};

const OverviewScreen: React.FC<OverviewScreenProps> = ({
  addictions,
  focusAddiction,
  onFocusChange,
  todaysCheckIn,
  journalSignal,
  onRecordCheckIn,
  onOpenPanic,
  onOpenBreathing,
  onAdd,
  onReset,
  onDeleteRelapse,
  onLogUrge,
  onDeleteUrge,
  onReorder,
  onEdit,
  onDelete
}) => {
  const { t } = useI18n();
  const [quoteIndex, setQuoteIndex] = useState(() => getQuoteOfTheDay());
  const quoteRef = useRef<HTMLElement>(null);
  const journalRef = useRef<HTMLDivElement>(null);

  const streak = getStreakStats(focusAddiction);

  // The nav's Journal entry scrolls the check-in card into view; the card
  // itself opens its editor off the same signal.
  useEffect(() => {
    if (journalSignal > 0) {
      journalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [journalSignal]);

  const showMotivation = () => {
    setQuoteIndex(current => current + 1);
    quoteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-2xl font-semibold text-sage-900 dark:text-white">
          {t(getGreetingKey(new Date().getHours()))}, {t('youveGotThis')}
        </h1>

        <button
          type="button"
          onClick={() => onOpenPanic(focusAddiction)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-xl shrink-0
                   bg-brand-700 hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500
                   text-white text-sm font-semibold shadow-card transition-colors"
        >
          <Zap size={17} />
          {t('logUrge')}
        </button>
      </div>

      {addictions.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0" role="tablist" aria-label={t('selectHabit')}>
          {addictions.map(addiction => {
            const isActive = addiction.id === focusAddiction.id;
            return (
              <button
                key={addiction.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onFocusChange(addiction.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-brand-700 border-brand-700 text-white dark:bg-brand-600 dark:border-brand-600'
                    : 'bg-white border-sage-200 text-sage-600 hover:bg-sage-100 dark:bg-sage-800 dark:border-sage-700 dark:text-sage-300 dark:hover:bg-sage-700'
                }`}
              >
                <span aria-hidden="true">{addiction.icon}</span>
                <span>{addiction.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <HeroStreakCard addiction={focusAddiction} streak={streak} />
        </div>
        <div className="lg:col-span-5">
          <MilestoneCard addiction={focusAddiction} />
        </div>

        <div className="lg:col-span-12" ref={journalRef}>
          <DailyCheckInCard
            todaysCheckIn={todaysCheckIn}
            onRecord={onRecordCheckIn}
            openSignal={journalSignal}
          />
        </div>

        <div className="lg:col-span-8">
          <ProgressChartCard addiction={focusAddiction} />
        </div>
        <div className="lg:col-span-4">
          <UrgeLogCard addiction={focusAddiction} />
        </div>

        <div className="lg:col-span-12">
          <ToolsAndSupport
            onOpenUrgeTracker={() => onOpenPanic(focusAddiction)}
            onOpenJournal={() => journalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            onOpenBreathing={onOpenBreathing}
            onOpenMotivation={showMotivation}
          />
        </div>

        <div className="lg:col-span-12">
          <QuoteCard ref={quoteRef} quoteIndex={quoteIndex} onShuffle={showMotivation} />
        </div>

        <div className="lg:col-span-12">
          <StatsSection addictions={addictions} />
        </div>
      </div>

      <section className="pt-2">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold text-sage-900 dark:text-white">{t('yourTrackers')}</h2>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                     border border-sage-200 dark:border-sage-700 bg-white dark:bg-sage-800
                     text-sage-700 dark:text-sage-200 hover:bg-sage-100 dark:hover:bg-sage-700 transition-colors"
          >
            <Plus size={16} />
            {t('addTracker')}
          </button>
        </div>

        <DraggableAddictionList
          addictions={addictions}
          onReset={onReset}
          onDeleteRelapse={onDeleteRelapse}
          onLogUrge={onLogUrge}
          onDeleteUrge={onDeleteUrge}
          onOpenPanic={onOpenPanic}
          onReorder={onReorder}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </section>
    </div>
  );
};

export default OverviewScreen;
