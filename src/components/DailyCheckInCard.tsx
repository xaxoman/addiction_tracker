import React, { useEffect, useState } from 'react';
import { CheckCircle2, PencilLine, Sun } from 'lucide-react';
import { DailyCheckIn } from '../types';
import { CheckInInput } from '../context/CheckInContext';
import { useI18n } from '../i18n/useI18n';

interface DailyCheckInCardProps {
  todaysCheckIn: DailyCheckIn | null;
  onRecord: (input: CheckInInput) => void;
  // Incremented by the navigation's "Journal" entry to open the editor.
  openSignal?: number;
}

const MOOD_EMOJI = ['😞', '🙁', '😐', '🙂', '😄'];

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

const DailyCheckInCard: React.FC<DailyCheckInCardProps> = ({ todaysCheckIn, onRecord, openSignal = 0 }) => {
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

  if (todaysCheckIn && !isEditing) {
    return (
      <div className="card p-4 flex items-center justify-between gap-3">
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
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={openEditor}
        className="card w-full p-4 flex items-center gap-3 text-left hover:shadow-card-hover transition-shadow"
      >
        <span className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300">
          <Sun size={20} />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-sage-900 dark:text-white">{t('checkInPrompt')}</div>
          <div className="text-xs text-sage-500 dark:text-sage-400">{t('checkInPromptHint')}</div>
        </div>
      </button>
    );
  }

  return (
    <div className="card p-5 space-y-4">
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
};

export default DailyCheckInCard;
