import React, { useEffect, useRef, useState } from 'react';
import { Plus, Wind, Zap } from 'lucide-react';
import { Addiction, DailyCheckIn, DailyIntention, FollowThrough, WeeklyReview } from '../types';
import { RelapseDetails } from '../context/AddictionContext';
import { CheckInInput, IntentionInput } from '../context/CheckInContext';
import { PlanTarget, RiskNudge } from '../services/checkInNotifications';
import HeroStreakCard from './HeroStreakCard';
import TodayCard from './TodayCard';
import RiskMomentBanner from './RiskMomentBanner';
import RelapseDialog from './RelapseDialog';
import { getStreakStats } from '../utils/streaks';
import { useI18n } from '../i18n/useI18n';

interface OverviewScreenProps {
  addictions: Addiction[];
  focusAddiction: Addiction;
  onFocusChange: (id: string) => void;
  todaysCheckIn: DailyCheckIn | null;
  todaysIntention: DailyIntention | null;
  pendingIntention: DailyIntention | null;
  latestReview: WeeklyReview | null;
  riskNudges: RiskNudge[];
  // Bumped by the navigation's "Journal" entry so the check-in editor opens
  // and scrolls into view from anywhere in the app.
  journalSignal: number;
  onRecordCheckIn: (input: CheckInInput) => void;
  onSetIntention: (input: IntentionInput) => void;
  onIntentionOutcome: (date: string, outcome: FollowThrough) => void;
  onStartReview: () => void;
  onOpenPlan: (target: PlanTarget) => void;
  onOpenPanic: (addiction: Addiction) => void;
  onOpenBreathing: () => void;
  onAdd: () => void;
  onReset: (id: string, date: Date, details?: RelapseDetails) => void;
}

const getGreetingKey = (hour: number): string => {
  if (hour < 12) return 'goodMorning';
  if (hour < 18) return 'goodAfternoon';
  return 'goodEvening';
};

// Home answers one question: what do I do now? Where you stand, one button for
// a craving, and today's short list. Stats live on Progress, habit management
// on Trackers.
const OverviewScreen: React.FC<OverviewScreenProps> = ({
  addictions,
  focusAddiction,
  onFocusChange,
  todaysCheckIn,
  todaysIntention,
  pendingIntention,
  latestReview,
  riskNudges,
  journalSignal,
  onRecordCheckIn,
  onSetIntention,
  onIntentionOutcome,
  onStartReview,
  onOpenPlan,
  onOpenPanic,
  onOpenBreathing,
  onAdd,
  onReset
}) => {
  const { t } = useI18n();
  const todayRef = useRef<HTMLDivElement>(null);
  const [isRelapseOpen, setIsRelapseOpen] = useState(false);

  const streak = getStreakStats(focusAddiction);

  // The nav's Journal entry scrolls the Today card into view; the card itself
  // opens its check-in editor off the same signal.
  useEffect(() => {
    if (journalSignal > 0) {
      todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [journalSignal]);

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <h1 className="text-lg sm:text-xl font-semibold text-sage-900 dark:text-white">
        {t(getGreetingKey(new Date().getHours()))}
      </h1>

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
          <button
            type="button"
            onClick={onAdd}
            className="shrink-0 w-8 h-8 rounded-full border border-dashed border-sage-300 dark:border-sage-600 text-sage-500 dark:text-sage-400 flex items-center justify-center hover:bg-sage-100 dark:hover:bg-sage-700"
            aria-label={t('addTracker')}
            title={t('addTracker')}
          >
            <Plus size={16} />
          </button>
        </div>
      )}

      <RiskMomentBanner nudges={riskNudges} onOpenPlan={onOpenPlan} />

      <HeroStreakCard addiction={focusAddiction} streak={streak} />

      <div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onOpenPanic(focusAddiction)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl
                     bg-brand-700 hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500
                     text-white text-base font-semibold shadow-card transition-colors"
          >
            <Zap size={19} />
            {t('cravingNow')}
          </button>
          <button
            type="button"
            onClick={onOpenBreathing}
            className="shrink-0 w-14 rounded-2xl border border-sage-200 dark:border-sage-700 bg-white dark:bg-sage-800
                     text-brand-700 dark:text-brand-300 flex items-center justify-center
                     hover:bg-sage-100 dark:hover:bg-sage-700 transition-colors"
            aria-label={t('breathing')}
            title={t('breathing')}
          >
            <Wind size={20} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setIsRelapseOpen(true)}
          className="mt-2 w-full py-2 text-sm font-medium text-sage-500 hover:text-rose-600 dark:text-sage-400 dark:hover:text-rose-300 transition-colors"
        >
          {t('hadRelapseLink')}
        </button>
      </div>

      <div ref={todayRef}>
        <TodayCard
          todaysCheckIn={todaysCheckIn}
          onRecord={onRecordCheckIn}
          todaysIntention={todaysIntention}
          pendingIntention={pendingIntention}
          focusAddiction={focusAddiction}
          onSetIntention={onSetIntention}
          onIntentionOutcome={onIntentionOutcome}
          latestReview={latestReview}
          onStartReview={onStartReview}
          openSignal={journalSignal}
        />
      </div>

      {isRelapseOpen && (
        <RelapseDialog
          addiction={focusAddiction}
          onClose={() => setIsRelapseOpen(false)}
          onConfirm={(date, details) => {
            onReset(focusAddiction.id, date, details);
            setIsRelapseOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default OverviewScreen;
