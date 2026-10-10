import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, PencilLine, Sun, Target } from 'lucide-react';
import { Addiction, DailyCheckIn, DailyIntention, FollowThrough } from '../types';
import { CheckInInput, IntentionInput } from '../context/CheckInContext';
import { useI18n } from '../i18n/useI18n';
import { formatWindowTime, getRiskWindows } from '../utils/riskWindows';
import { rankPlans } from '../utils/plans';
import FollowThroughButtons from './FollowThroughButtons';

interface DailyCheckInCardProps {
  todaysCheckIn: DailyCheckIn | null;
  onRecord: (input: CheckInInput) => void;
  todaysIntention: DailyIntention | null;
  // Yesterday's intention, while it still has no answer.
  pendingIntention: DailyIntention | null;
  focusAddiction: Addiction;
  onSetIntention: (input: IntentionInput) => void;
  onIntentionOutcome: (date: string, outcome: FollowThrough) => void;
  // Incremented by the navigation's "Journal" entry to open the editor.
  openSignal?: number;
}

const MOOD_EMOJI = ['😞', '🙁', '😐', '🙂', '😄'];

// From this hour the intention card stops asking about the plan and starts
// asking how it went.
const EVENING_HOUR = 18;

const inputClass = `w-full px-3 py-2 border border-sage-200 dark:border-sage-600 rounded-xl
  bg-white dark:bg-sage-700 text-sage-900 dark:text-white text-sm
  focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500`;

const suggestionChipClass = `px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
  bg-white border-sage-200 text-sage-600 hover:bg-sage-100
  dark:bg-sage-700 dark:border-sage-600 dark:text-sage-200 dark:hover:bg-sage-600`;

// A one-tap row of levels. Both scales are rendered the same way so the card
// stays a five-second interaction rather than a form.
const ScaleRow: React.FC<{
  label: string;
  lowLabel: string;
  highLabel: string;
  values: number[];
  selected: number | null;
  onSelect: (value: number) => void;
  renderValue?: (value: number) => React.ReactNode;
}> = ({ label, lowLabel, highLabel, values, selected, onSelect, renderValue }) => (
  <div>
    <label className="block text-sm font-medium text-sage-700 dark:text-sage-300 mb-1.5">{label}</label>
    <div className="flex gap-2">
      {values.map(value => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          aria-pressed={selected === value}
          aria-label={`${label}: ${value}`}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
            selected === value
              ? 'bg-brand-700 border-brand-700 text-white dark:bg-brand-600 dark:border-brand-600'
              : 'bg-white border-sage-200 text-sage-700 hover:bg-sage-100 dark:bg-sage-700 dark:border-sage-600 dark:text-sage-200 dark:hover:bg-sage-600'
          }`}
        >
          {renderValue ? renderValue(value) : value}
        </button>
      ))}
    </div>
    <div className="flex justify-between mt-1 text-[0.7rem] text-sage-400 dark:text-sage-500">
      <span>{lowLabel}</span>
      <span>{highLabel}</span>
    </div>
  </div>
);

// The morning half of the check-in: name today's risky moment and decide now
// what to do in it. In the evening the same spot asks whether it went that way.
const IntentionSection: React.FC<{
  intention: DailyIntention | null;
  pending: DailyIntention | null;
  focusAddiction: Addiction;
  onSet: (input: IntentionInput) => void;
  onOutcome: (date: string, outcome: FollowThrough) => void;
}> = ({ intention, pending, focusAddiction, onSet, onOutcome }) => {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [riskMoment, setRiskMoment] = useState('');
  const [action, setAction] = useState('');
  const isEvening = new Date().getHours() >= EVENING_HOUR;

  // Today's own risk windows go first among the suggestions: the app already
  // knows when today tends to get hard.
  const momentSuggestions = useMemo(() => {
    const today = new Date().getDay();
    const fromData = getRiskWindows([focusAddiction], { limit: 10 })
      .filter(window => window.weekday === today)
      .slice(0, 2)
      .map(window => t('aroundTime', { time: formatWindowTime(window) }));
    return [...fromData, t('momentAfterWork'), t('momentEvening'), t('momentBeforeBed')];
  }, [focusAddiction, t]);

  const actionSuggestions = useMemo(
    () => rankPlans(focusAddiction).slice(0, 3).map(entry => entry.plan.action),
    [focusAddiction]
  );

  const openEditor = () => {
    setRiskMoment(intention?.riskMoment ?? '');
    setAction(intention?.action ?? '');
    setIsEditing(true);
  };

  const save = () => {
    if (!riskMoment.trim() || !action.trim()) {
      return;
    }
    onSet({ riskMoment, action, addictionId: focusAddiction.id });
    setIsEditing(false);
  };

  return (
    <div className="p-4 space-y-3">
      {pending && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2">
          <p className="text-sm text-sage-700 dark:text-sage-200">
            <span className="font-semibold">{t('yesterdayIntention')}</span> {pending.riskMoment} → {pending.action}
          </p>
          <p className="text-xs text-sage-500 dark:text-sage-400">{t('didItGoThatWay')}</p>
          <FollowThroughButtons size="sm" onChange={outcome => onOutcome(pending.date, outcome)} />
        </div>
      )}

      {isEditing ? (
        <div className="space-y-3">
          <h2 className="card-title">{t('intentionTitle')}</h2>
          <div>
            <label className="block text-sm font-medium text-sage-700 dark:text-sage-300 mb-1">
              {t('intentionRiskMoment')}
            </label>
            <input
              type="text"
              value={riskMoment}
              onChange={event => setRiskMoment(event.target.value)}
              placeholder={t('intentionRiskMomentPlaceholder')}
              className={inputClass}
            />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {momentSuggestions.map(suggestion => (
                <button key={suggestion} type="button" onClick={() => setRiskMoment(suggestion)} className={suggestionChipClass}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-sage-700 dark:text-sage-300 mb-1">
              {t('intentionAction')}
            </label>
            <input
              type="text"
              value={action}
              onChange={event => setAction(event.target.value)}
              placeholder={t('copingPlanActionPlaceholder')}
              className={inputClass}
            />
            {actionSuggestions.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {actionSuggestions.map(suggestion => (
                  <button key={suggestion} type="button" onClick={() => setAction(suggestion)} className={suggestionChipClass}>
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-sage-200 dark:border-sage-600
                       text-sage-700 dark:text-sage-200 hover:bg-sage-100 dark:hover:bg-sage-700 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!riskMoment.trim() || !action.trim()}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-brand-700 dark:bg-brand-600
                       hover:bg-brand-800 dark:hover:bg-brand-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('save')}
            </button>
          </div>
        </div>
      ) : intention ? (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <span className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300">
                <Target size={20} />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-sage-500 dark:text-sage-400">
                  {t('intentionToday')}
                </div>
                <div className="text-sm text-sage-900 dark:text-white break-words">
                  <span className="text-sage-500 dark:text-sage-400">{intention.riskMoment} →</span>{' '}
                  <span className="font-semibold">{intention.action}</span>
                </div>
                {intention.outcome && (
                  <div className="mt-0.5 text-xs text-sage-500 dark:text-sage-400">
                    {t('intentionOutcomeLabel', {
                      outcome: t(intention.outcome === 'yes' ? 'outcomeYes' : intention.outcome === 'partly' ? 'outcomePartly' : 'outcomeNo')
                    })}
                  </div>
                )}
              </div>
            </div>
            {!intention.outcome && (
              <button
                type="button"
                onClick={openEditor}
                className="shrink-0 p-2 rounded-lg text-sage-500 hover:bg-sage-100 dark:text-sage-400 dark:hover:bg-sage-700"
                aria-label={t('edit')}
                title={t('edit')}
              >
                <PencilLine size={15} />
              </button>
            )}
          </div>
          {isEvening && !intention.outcome && (
            <div className="space-y-2 pt-1">
              <p className="text-sm font-medium text-sage-700 dark:text-sage-300">{t('didItGoThatWay')}</p>
              <FollowThroughButtons size="sm" onChange={outcome => onOutcome(intention.date, outcome)} />
            </div>
          )}
        </div>
      ) : (
        <button type="button" onClick={openEditor} className="w-full flex items-center gap-3 text-left">
          <span className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300">
            <Target size={20} />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-sage-900 dark:text-white">{t('intentionTitle')}</div>
            <div className="text-xs text-sage-500 dark:text-sage-400">{t('intentionPrompt')}</div>
          </div>
        </button>
      )}
    </div>
  );
};

const DailyCheckInCard: React.FC<DailyCheckInCardProps> = ({
  todaysCheckIn,
  onRecord,
  todaysIntention,
  pendingIntention,
  focusAddiction,
  onSetIntention,
  onIntentionOutcome,
  openSignal = 0
}) => {
  const { t } = useI18n();
  // Once today is recorded the card collapses to a summary; reopening it edits
  // the same day rather than adding a second entry.
  const [isEditing, setIsEditing] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const [craving, setCraving] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const openEditor = () => {
    setMood(todaysCheckIn?.mood ?? null);
    setCraving(todaysCheckIn?.cravingIntensity ?? null);
    setNote(todaysCheckIn?.note ?? '');
    setIsEditing(true);
  };

  useEffect(() => {
    if (openSignal > 0) {
      openEditor();
    }
    // Only the signal should reopen the editor: re-running this when today's
    // entry changes would fight the user closing the card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSignal]);

  const save = () => {
    if (mood === null || craving === null) {
      return;
    }
    onRecord({ mood, cravingIntensity: craving, note });
    setIsEditing(false);
  };

  let moodSection: React.ReactNode;

  if (todaysCheckIn && !isEditing) {
    moodSection = (
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300">
            <CheckCircle2 size={20} />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-sage-900 dark:text-white">
              {t('checkedInToday')}
            </div>
            <div className="text-xs text-sage-500 dark:text-sage-400">
              {MOOD_EMOJI[todaysCheckIn.mood - 1]} {t('moodLabel')} {todaysCheckIn.mood}/5
              {' · '}
              {t('cravingLabel')} {todaysCheckIn.cravingIntensity}/5
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={openEditor}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                   border border-sage-200 dark:border-sage-600 text-sage-700 dark:text-sage-200
                   hover:bg-sage-100 dark:hover:bg-sage-700 transition-colors"
        >
          <PencilLine size={14} />
          {t('edit')}
        </button>
      </div>
    );
  } else if (!isEditing) {
    moodSection = (
      <button
        type="button"
        onClick={openEditor}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-sage-50 dark:hover:bg-sage-700/40 transition-colors rounded-b-2xl"
      >
        <span className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300">
          <Sun size={20} />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-sage-900 dark:text-white">{t('checkInPrompt')}</div>
          <div className="text-xs text-sage-500 dark:text-sage-400">{t('checkInPromptHint')}</div>
        </div>
      </button>
    );
  } else {
    moodSection = (
      <div className="p-5 space-y-4">
        <h2 className="card-title">{t('checkInPrompt')}</h2>

        <ScaleRow
          label={t('howAreYouToday')}
          lowLabel={t('moodLow')}
          highLabel={t('moodHigh')}
          values={[1, 2, 3, 4, 5]}
          selected={mood}
          onSelect={setMood}
          renderValue={(value) => <span className="text-lg leading-none">{MOOD_EMOJI[value - 1]}</span>}
        />

        <ScaleRow
          label={t('cravingsToday')}
          lowLabel={t('cravingNone')}
          highLabel={t('cravingConstant')}
          values={[0, 1, 2, 3, 4, 5]}
          selected={craving}
          onSelect={setCraving}
        />

        <div>
          <label className="block text-sm font-medium text-sage-700 dark:text-sage-300 mb-1.5">
            {t('noteOptional')}
          </label>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('checkInNotePlaceholder')}
            className="w-full px-3 py-2 border border-sage-200 dark:border-sage-600 rounded-xl
                      bg-white dark:bg-sage-700 text-sage-900 dark:text-white
                      focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 resize-none h-20"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="px-4 py-2.5 rounded-xl font-medium border border-sage-200 dark:border-sage-600
                      text-sage-700 dark:text-sage-200 hover:bg-sage-100 dark:hover:bg-sage-700 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={mood === null || craving === null}
            className="px-5 py-2.5 bg-brand-700 dark:bg-brand-600 text-white rounded-xl font-semibold
                      hover:bg-brand-800 dark:hover:bg-brand-500 transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('save')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card divide-y divide-sage-100 dark:divide-sage-700">
      <IntentionSection
        intention={todaysIntention}
        pending={pendingIntention}
        focusAddiction={focusAddiction}
        onSet={onSetIntention}
        onOutcome={onIntentionOutcome}
      />
      {moodSection}
    </div>
  );
};

export default DailyCheckInCard;
