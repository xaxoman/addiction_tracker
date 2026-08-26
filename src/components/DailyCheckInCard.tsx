import React, { useState } from 'react';
import { CheckCircle2, PencilLine, Sun } from 'lucide-react';
import { DailyCheckIn } from '../types';
import { CheckInInput } from '../context/CheckInContext';
import { useI18n } from '../i18n/useI18n';

interface DailyCheckInCardProps {
  todaysCheckIn: DailyCheckIn | null;
  onRecord: (input: CheckInInput) => void;
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
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    <div className="flex gap-2">
      {values.map(value => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          aria-pressed={selected === value}
          aria-label={`${label}: ${value}`}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
            selected === value
              ? 'bg-blue-500 border-blue-500 text-white dark:bg-blue-600 dark:border-blue-600'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          {renderValue ? renderValue(value) : value}
        </button>
      ))}
    </div>
    <div className="flex justify-between mt-1 text-[0.7rem] text-gray-400 dark:text-gray-500">
      <span>{lowLabel}</span>
      <span>{highLabel}</span>
    </div>
  </div>
);

const DailyCheckInCard: React.FC<DailyCheckInCardProps> = ({ todaysCheckIn, onRecord }) => {
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

  const save = () => {
    if (mood === null || craving === null) {
      return;
    }
    onRecord({ mood, cravingIntensity: craving, note });
    setIsEditing(false);
  };

  if (todaysCheckIn && !isEditing) {
    return (
      <div className="mb-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
              {t('checkedInToday')}
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-300/80">
              {MOOD_EMOJI[todaysCheckIn.mood - 1]} {t('moodLabel')} {todaysCheckIn.mood}/5
              {' · '}
              {t('cravingLabel')} {todaysCheckIn.cravingIntensity}/5
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={openEditor}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   bg-white/70 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200
                   hover:bg-white dark:hover:bg-emerald-900/60 transition-colors"
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
        className="w-full mb-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4
                 flex items-center gap-3 text-left hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
      >
        <Sun className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" />
        <div>
          <div className="text-sm font-medium text-blue-900 dark:text-blue-200">{t('checkInPrompt')}</div>
          <div className="text-xs text-blue-700 dark:text-blue-300/80">{t('checkInPromptHint')}</div>
        </div>
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-4">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t('checkInPrompt')}</h2>

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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('noteOptional')}
        </label>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t('checkInNotePlaceholder')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none h-20"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 
                    rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={mood === null || craving === null}
          className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg 
                    hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('save')}
        </button>
      </div>
    </div>
  );
};

export default DailyCheckInCard;
