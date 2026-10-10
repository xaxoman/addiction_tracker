import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Addiction, NeedTag, TriggerTag } from '../types';
import { RelapseDetails } from '../context/AddictionContext';
import { useI18n } from '../i18n/useI18n';
import TriggerTagPicker, { NeedTagPicker } from './TriggerTagPicker';
import { NextTimePlanField } from './PlanFields';
import Disclosure from './Disclosure';
import { buildCueFromTriggers } from '../utils/plans';
import { getTriggerOrder } from '../utils/triggers';

interface RelapseDialogProps {
  addiction: Addiction;
  onClose: () => void;
  onConfirm: (date: Date, details: RelapseDetails) => void;
}

// Local-time (not UTC) formatting for the date/time inputs. Using
// toISOString() here would format in UTC, which can show the wrong day near
// midnight for users whose timezone differs from UTC.
const toDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toTimeInputValue = (date: Date): string => (
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
);

// Built from the picked local date + time components. `new Date(dateValue)`
// would parse "YYYY-MM-DD" as UTC midnight and could land on the wrong day.
const combineDateAndTime = (dateValue: string, timeValue: string): Date | null => {
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hours, minutes] = timeValue.split(':').map(Number);
  const combined = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return isNaN(combined.getTime()) ? null : combined;
};

// Recording a slip after the fact. It asks only for what changes what happens
// next: when, what set it off, what came before, and what to do next time.
// Everything else waits behind "more details".
const RelapseDialog: React.FC<RelapseDialogProps> = ({ addiction, onClose, onConfirm }) => {
  const { t } = useI18n();
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [time, setTime] = useState(() => toTimeInputValue(new Date()));
  const [triggers, setTriggers] = useState<TriggerTag[]>([]);
  const [needs, setNeeds] = useState<NeedTag[]>([]);
  const [precededBy, setPrecededBy] = useState('');
  const [nextTime, setNextTime] = useState('');
  const [saveAsPlan, setSaveAsPlan] = useState(true);
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  // Errors stay hidden until the first save attempt, so an untouched form does
  // not open covered in red.
  const [showErrors, setShowErrors] = useState(false);

  const triggerOrder = useMemo(() => getTriggerOrder(addiction), [addiction]);

  const errors = {
    date: date.trim().length === 0,
    time: time.trim().length === 0,
    triggers: triggers.length === 0,
    precededBy: precededBy.trim().length === 0,
    nextTime: nextTime.trim().length === 0
  };
  const isIncomplete = Object.values(errors).some(Boolean);

  const handleConfirm = () => {
    const at = combineDateAndTime(date, time);
    if (isIncomplete || !at) {
      setShowErrors(true);
      return;
    }
    const action = nextTime.trim();
    onConfirm(at, {
      text: note.trim() || undefined,
      precededBy: precededBy.trim(),
      location: location.trim() || undefined,
      triggers,
      needs: needs.length > 0 ? needs : undefined,
      nextTime: action,
      plan: saveAsPlan ? { cue: buildCueFromTriggers(triggers, t), action, triggers } : undefined
    });
  };

  const fieldClass = (hasError: boolean, extra = ''): string => `
    w-full px-3 py-2 border rounded-xl bg-white dark:bg-sage-700 text-sage-900 dark:text-white
    focus:ring-2 ${extra} ${
      showErrors && hasError
        ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-500 focus:border-rose-500'
        : 'border-sage-200 dark:border-sage-600 focus:ring-brand-500 focus:border-brand-500'
    }`;

  const fieldError = (hasError: boolean) => (
    showErrors && hasError
      ? <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">{t('fieldRequired')}</p>
      : null
  );

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div
        className="bg-white dark:bg-sage-800 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md max-h-[92vh] overflow-y-auto shadow-xl animate-fade-in-up"
        role="dialog"
        aria-modal="true"
        aria-label={t('recordRelapse')}
      >
        <div className="flex justify-between items-start gap-3 mb-1">
          <h2 className="text-xl font-semibold text-sage-900 dark:text-white">{t('recordRelapse')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-sage-500 hover:text-sage-700 dark:text-sage-400 dark:hover:text-sage-200"
            aria-label={t('close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="mb-5 text-sm text-sage-500 dark:text-sage-400">{t('relapseKindIntro')}</p>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-sage-700 dark:text-sage-300 mb-1">{t('when')}</label>
              <input
                type="date"
                value={date}
                onChange={event => setDate(event.target.value)}
                max={toDateInputValue(new Date())}
                aria-invalid={showErrors && errors.date}
                className={fieldClass(errors.date)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-sage-700 dark:text-sage-300 mb-1">{t('timeOfDay')}</label>
              <input
                type="time"
                value={time}
                onChange={event => setTime(event.target.value)}
                aria-invalid={showErrors && errors.time}
                className={fieldClass(errors.time)}
              />
            </div>
          </div>

          <TriggerTagPicker
            value={triggers}
            onChange={setTriggers}
            label={t('whatSetItOff')}
            order={triggerOrder}
            collapsedCount={6}
            error={showErrors && errors.triggers ? t('triggersRequired') : undefined}
          />

          <div>
            <label className="block text-sm font-medium text-sage-700 dark:text-sage-300 mb-1">
              {t('whatPrecededIt')}
            </label>
            <textarea
              value={precededBy}
              onChange={event => setPrecededBy(event.target.value)}
              placeholder={t('precededByPlaceholder')}
              aria-invalid={showErrors && errors.precededBy}
              className={fieldClass(errors.precededBy, 'resize-none h-16')}
            />
            {fieldError(errors.precededBy)}
          </div>

          <NeedTagPicker value={needs} onChange={setNeeds} hint="" />

          <NextTimePlanField
            value={nextTime}
            onChange={setNextTime}
            saveAsPlan={saveAsPlan}
            onSaveAsPlanChange={setSaveAsPlan}
            triggers={triggers}
            error={showErrors && errors.nextTime ? t('fieldRequired') : undefined}
          />

          <Disclosure>
            <div>
              <label className="block text-sm font-medium text-sage-700 dark:text-sage-300 mb-1">
                {t('whereDidItHappen')}
              </label>
              <input
                type="text"
                value={location}
                onChange={event => setLocation(event.target.value)}
                placeholder={t('locationPlaceholder')}
                className={fieldClass(false)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-sage-700 dark:text-sage-300 mb-1">
                {t('whatHappened')}
              </label>
              <textarea
                value={note}
                onChange={event => setNote(event.target.value)}
                placeholder={t('relapsePrompt')}
                className={fieldClass(false, 'resize-none h-20')}
              />
            </div>
          </Disclosure>

          {showErrors && isIncomplete && (
            <p role="alert" className="text-sm font-medium text-rose-600 dark:text-rose-400">
              {t('relapseFieldsRequired')}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-sage-200 dark:border-sage-600 text-sage-700 dark:text-sage-200
                       rounded-xl hover:bg-sage-100 dark:hover:bg-sage-700 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2.5 bg-rose-600 text-white font-semibold rounded-xl hover:bg-rose-700 dark:hover:bg-rose-500 transition-colors"
            >
              {t('saveAndRestart')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelapseDialog;
