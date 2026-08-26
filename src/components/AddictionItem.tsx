import React, { useState, useEffect, useMemo } from 'react';
import {
  MoreVertical, RefreshCw, Edit, Trash2, X, Calendar, ChevronLeft, ChevronRight,
  Download, StickyNote, Flame, ShieldCheck, Zap
} from 'lucide-react';
import { Addiction, RelapseEntry, TriggerTag, UrgeEntry } from '../types';
import { RelapseDetails, UrgeInput } from '../context/AddictionContext';
import ProgressCircle from './ProgressCircle';
import TriggerTagPicker, { TriggerTagList } from './TriggerTagPicker';
import { exportSingleAddictionToCSV } from '../utils/exportData';
import { useI18n } from '../i18n/useI18n';
import {
  formatElapsed, formatHeldDuration, formatMinutesSaved, getDaysSince, getSavedAmount
} from '../utils/format';
import { formatCountdown, getMilestoneState } from '../utils/milestones';
import { startOfCurrentMonth, summarizeUrges } from '../utils/urgeStats';

interface AddictionItemProps {
  addiction: Addiction;
  onReset: (id: string, date: Date, details?: RelapseDetails) => void;
  onDeleteRelapse: (id: string, relapseId: string) => void;
  onLogUrge: (id: string, input: UrgeInput) => void;
  onDeleteUrge: (id: string, urgeId: string) => void;
  onOpenPanic: (addiction: Addiction) => void;
  onEdit: (addiction: Addiction) => void;
  onDelete: (id: string) => void;
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

const toTimeInputValue = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

// The history now holds two kinds of entry. Urges that ended in a relapse are
// left out of the timeline: their relapse already stands for that moment, and
// showing both would read as two separate events.
type TimelineEvent =
  | { kind: 'urge'; id: string; date: Date; urge: UrgeEntry }
  | { kind: 'relapse'; id: string; date: Date; relapse: RelapseEntry };

const buildTimeline = (addiction: Addiction): TimelineEvent[] => {
  const events: TimelineEvent[] = [];

  (Array.isArray(addiction.urges) ? addiction.urges : []).forEach(urge => {
    if (urge.outcome === 'relapsed') return;
    const date = new Date(urge.date);
    if (Number.isNaN(date.getTime())) return;
    events.push({ kind: 'urge', id: urge.id, date, urge });
  });

  (Array.isArray(addiction.notes) ? addiction.notes : []).forEach(relapse => {
    const date = new Date(relapse.date);
    if (Number.isNaN(date.getTime())) return;
    events.push({ kind: 'relapse', id: relapse.id, date, relapse });
  });

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
};

const AddictionItem: React.FC<AddictionItemProps> = ({
  addiction,
  onReset,
  onDeleteRelapse,
  onLogUrge,
  onDeleteUrge,
  onOpenPanic,
  onEdit,
  onDelete
}) => {
  const { t, language } = useI18n();
  const locale = language === 'it' ? 'it-IT' : 'en-US';
  const [timeSince, setTimeSince] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showUrgeDialog, setShowUrgeDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [resetDate, setResetDate] = useState(() => toDateInputValue(new Date()));
  const [resetTime, setResetTime] = useState(() => toTimeInputValue(new Date()));
  const [resetNote, setResetNote] = useState('');
  const [resetPrecededBy, setResetPrecededBy] = useState('');
  const [resetTriggers, setResetTriggers] = useState<TriggerTag[]>([]);
  const [urgeDate, setUrgeDate] = useState(() => toDateInputValue(new Date()));
  const [urgeTime, setUrgeTime] = useState(() => toTimeInputValue(new Date()));
  const [urgeNote, setUrgeNote] = useState('');
  const [urgeIntensity, setUrgeIntensity] = useState<number | undefined>(undefined);
  const [urgeTriggers, setUrgeTriggers] = useState<TriggerTag[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Open the reset dialog with the date/time fields freshly defaulted to "now"
  // (in local time) so stale values from a previous open don't linger.
  const openResetDialog = () => {
    const now = new Date();
    setResetDate(toDateInputValue(now));
    setResetTime(toTimeInputValue(now));
    setResetNote('');
    setResetPrecededBy('');
    setResetTriggers([]);
    setShowResetDialog(true);
  };

  const openUrgeDialog = () => {
    const now = new Date();
    setUrgeDate(toDateInputValue(now));
    setUrgeTime(toTimeInputValue(now));
    setUrgeNote('');
    setUrgeIntensity(undefined);
    setUrgeTriggers([]);
    setShowUrgeDialog(true);
  };

  // Always open the history on the current month with no day selected, so the
  // dialog never reopens on a stale selection.
  const openHistoryDialog = () => {
    setCurrentMonth(new Date());
    setSelectedDay(null);
    setShowHistoryDialog(true);
  };

  useEffect(() => {
    const updateTimeSince = () => {
      const now = new Date();
      const lastEngaged = new Date(addiction.lastEngaged);
      const diffTime = Math.abs(now.getTime() - lastEngaged.getTime());

      const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffTime % (1000 * 60)) / 1000);

      setTimeSince({ days, hours, minutes, seconds });
    };

    updateTimeSince();
    const interval = setInterval(updateTimeSince, 1000);
    return () => clearInterval(interval);
  }, [addiction.lastEngaged]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.menu-container')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Build the timestamp from the picked local date + time components.
  // `new Date(dateValue)` would parse the "YYYY-MM-DD" string as UTC midnight
  // and could land on the wrong day once the local time is applied.
  const combineDateAndTime = (dateValue: string, timeValue: string): Date | null => {
    const [year, month, day] = dateValue.split('-').map(Number);
    const [hours, minutes] = timeValue.split(':').map(Number);
    const combined = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return isNaN(combined.getTime()) ? null : combined;
  };

  const handleResetConfirm = () => {
    const resetDateTime = combineDateAndTime(resetDate, resetTime);
    if (!resetDateTime) {
      return; // Guard against incomplete/invalid input
    }
    onReset(addiction.id, resetDateTime, {
      text: resetNote.trim() || undefined,
      precededBy: resetPrecededBy.trim() || undefined,
      triggers: resetTriggers.length > 0 ? resetTriggers : undefined
    });
    setShowResetDialog(false);
  };

  const handleUrgeConfirm = () => {
    const urgeDateTime = combineDateAndTime(urgeDate, urgeTime);
    if (!urgeDateTime) {
      return;
    }
    onLogUrge(addiction.id, {
      date: urgeDateTime,
      outcome: 'resisted',
      intensity: urgeIntensity,
      triggers: urgeTriggers.length > 0 ? urgeTriggers : undefined,
      text: urgeNote.trim() || undefined,
      source: 'manual'
    });
    setShowUrgeDialog(false);
  };

  const getProgress = (): { current: number; percentage: number } => {
    // Validate goal exists and has valid values
    if (!addiction.goal || !addiction.goal.value || isNaN(addiction.goal.value) || addiction.goal.value <= 0) {
      return { current: 0, percentage: 0 };
    }

    const now = new Date();
    const lastEngaged = new Date(addiction.lastEngaged);
    
    // Validate dates
    if (isNaN(now.getTime()) || isNaN(lastEngaged.getTime())) {
      return { current: 0, percentage: 0 };
    }
    
    const diffTime = Math.abs(now.getTime() - lastEngaged.getTime());
    
    let current = 0;
    let total = addiction.goal.value;
    
    // Ensure cost is a valid number
    const costValue = typeof addiction.cost === 'number' && !isNaN(addiction.cost) ? addiction.cost : 0;
    
    if (addiction.goal.type === 'time') {
      const diffHours = diffTime / (1000 * 60 * 60);
      
      switch (addiction.goal.unit) {
        case 'hours':
          current = diffHours;
          break;
        case 'days':
          current = diffHours / 24;
          break;
        case 'weeks':
          current = diffHours / (24 * 7);
          break;
        case 'months':
          current = diffHours / (24 * 30);
          break;
        default:
          current = diffHours / 24; // Default to days
      }
    } else if (addiction.goal.type === 'money') {
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      current = costValue * diffDays;
      total = addiction.goal.value;
    }
    
    // Ensure we don't divide by zero and return valid numbers
    if (total <= 0 || isNaN(current) || isNaN(total)) {
      return { current: 0, percentage: 0 };
    }
    
    const percentage = Math.min((current / total) * 100, 100);
    return { 
      current: isNaN(current) ? 0 : Math.max(0, current), 
      percentage: isNaN(percentage) ? 0 : Math.max(0, Math.min(100, percentage))
    };
  };

  const daysSince = getDaysSince(addiction.lastEngaged);
  const progress = getProgress();
  const milestone = useMemo(() => getMilestoneState(addiction.lastEngaged), [addiction.lastEngaged, timeSince.days]);
  const monthlyUrges = useMemo(
    () => summarizeUrges(addiction, startOfCurrentMonth()),
    [addiction]
  );

  const getCostLabel = () => {
    const costValue = typeof addiction.cost === 'number' && !isNaN(addiction.cost) ? addiction.cost : 0;
    switch (addiction.costType) {
      case 'money':
        return `$${costValue.toFixed(2)}`;
      case 'time':
        return `${costValue} min`;
      case 'health':
        return `${costValue} impact`;
      default:
        return `${costValue}`;
    }
  };

  const getSavedLabelText = (): string => {
    const amount = getSavedAmount(addiction);
    switch (addiction.costType) {
      case 'money':
        return `$${amount.toFixed(2)}`;
      case 'time':
        return formatMinutesSaved(amount);
      case 'health':
        return `${amount} impact`;
      default:
        return `${amount}`;
    }
  };

  const getGoalLabel = () => {
    if (!addiction.goal || !addiction.goal.value || isNaN(addiction.goal.value)) {
      return t('noGoalSet');
    }
    if (addiction.goal.type === 'money') {
      return `$${addiction.goal.value.toFixed(2)}`;
    }
    return `${addiction.goal.value} ${addiction.goal.unit || 'units'}`;
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const generateCalendarDays = () => {
    const days = [];
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const timeline = useMemo(() => buildTimeline(addiction), [addiction]);

  // Events of the visible month, bucketed by day-of-month. The grid only ever
  // renders markers from this map: the details themselves live in the panel
  // below the calendar so nothing overflows a day cell.
  const eventsByDay = useMemo(() => {
    const grouped = new Map<number, TimelineEvent[]>();

    timeline.forEach(event => {
      if (event.date.getFullYear() !== currentMonth.getFullYear() ||
          event.date.getMonth() !== currentMonth.getMonth()) {
        return;
      }

      const day = event.date.getDate();
      const entries = grouped.get(day) || [];
      entries.push(event);
      grouped.set(day, entries);
    });

    return grouped;
  }, [timeline, currentMonth]);

  // Most recent first, on a copy so the stored order (which the streak anchor
  // depends on) is never mutated.
  const timelineNewestFirst = useMemo(
    () => [...timeline].reverse(),
    [timeline]
  );

  // Weekday headers in the app language. 2023-01-01 was a Sunday, so walking a
  // week from there lines the labels up with the Sunday-first grid.
  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, index) => formatter.format(new Date(2023, 0, 1 + index)));
  }, [locale]);

  const selectedDayEvents = selectedDay === null
    ? []
    : eventsByDay.get(selectedDay) || [];

  const selectedDayLabel = selectedDay === null
    ? ''
    : new Date(currentMonth.getFullYear(), currentMonth.getMonth(), selectedDay)
        .toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Build a new Date instead of mutating the one held in state, which would
  // make React skip the re-render for repeated month steps.
  const changeMonth = (offset: number) => {
    setSelectedDay(null);
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const isToday = (day: number): boolean => {
    const today = new Date();
    return today.getFullYear() === currentMonth.getFullYear() &&
           today.getMonth() === currentMonth.getMonth() &&
           today.getDate() === day;
  };

  const formatEventTime = (date: Date): string => {
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  const handleExportData = () => {
    try {
      exportSingleAddictionToCSV(addiction);
      setIsMenuOpen(false);
      setTimeout(() => {
        alert(t('exportSuccess'));
      }, 100);
    } catch (error) {
      console.error('Export failed:', error);
      alert(t('exportFailed'));
    }
  };

  const renderIntensityPicker = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {t('howStrongWasIt')}
      </label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(level => (
          <button
            key={level}
            type="button"
            onClick={() => setUrgeIntensity(urgeIntensity === level ? undefined : level)}
            aria-pressed={urgeIntensity === level}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              urgeIntensity === level
                ? 'bg-blue-500 border-blue-500 text-white dark:bg-blue-600 dark:border-blue-600'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {level}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[0.7rem] text-gray-400 dark:text-gray-500">
        <span>{t('intensityMild')}</span>
        <span>{t('intensityIntense')}</span>
      </div>
    </div>
  );

  // One timeline row, shared by the selected-day panel and the recent list.
  const renderTimelineRow = (event: TimelineEvent, showDate: boolean) => {
    const isUrge = event.kind === 'urge';
    const triggers = isUrge ? event.urge.triggers : event.relapse.triggers;
    const text = isUrge ? event.urge.text : event.relapse.text;
    const precededBy = isUrge ? undefined : event.relapse.precededBy;
    const heldFor = isUrge ? event.urge.secondsHeld : undefined;

    return (
      <li
        key={event.id}
        className={`flex items-start justify-between gap-3 rounded-lg p-3 ${
          isUrge
            ? 'bg-emerald-50 dark:bg-emerald-900/20'
            : 'bg-rose-50 dark:bg-rose-900/20'
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
              isUrge ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
            }`}>
              {isUrge ? <ShieldCheck size={13} /> : <RefreshCw size={13} />}
              {isUrge ? t('urgeResisted') : t('legendRelapse')}
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {showDate ? event.date.toLocaleString(locale) : formatEventTime(event.date)}
            </span>
          </div>

          {isUrge && event.urge.intensity !== undefined && (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('howStrongWasIt')} {event.urge.intensity}/5
              {heldFor !== undefined && heldFor > 0 && (
                <> · {t('heldFor', { duration: formatHeldDuration(heldFor) })}</>
              )}
            </div>
          )}
          {isUrge && event.urge.intensity === undefined && heldFor !== undefined && heldFor > 0 && (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('heldFor', { duration: formatHeldDuration(heldFor) })}
            </div>
          )}

          <TriggerTagList tags={triggers} className="mt-1.5" />

          {precededBy && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 break-words whitespace-pre-wrap">
              <span className="text-gray-400 dark:text-gray-500">{t('whatPrecededIt')} </span>
              {precededBy}
            </div>
          )}
          {text && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 break-words whitespace-pre-wrap">
              {text}
            </div>
          )}
        </div>
        <button
          onClick={() => (isUrge
            ? onDeleteUrge(addiction.id, event.id)
            : onDeleteRelapse(addiction.id, event.id))}
          className="shrink-0 p-2 rounded-lg text-red-600 dark:text-red-400 
                   hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
          aria-label={isUrge ? t('deleteUrge') : t('deleteRelapse')}
          title={isUrge ? t('deleteUrge') : t('deleteRelapse')}
        >
          <Trash2 size={16} />
        </button>
      </li>
    );
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-lg 
                    transition-all duration-300 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center text-2xl 
                          bg-blue-50 dark:bg-blue-900/30 rounded-xl 
                          text-blue-600 dark:text-blue-400">
              {addiction.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {addiction.name}
                </h3>
                {milestone.latest && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
                                 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    {milestone.latest.emoji} {t(milestone.latest.labelKey)}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <p>Last engaged: {new Date(addiction.lastEngaged).toLocaleDateString()}</p>
                <p className="font-medium text-blue-600 dark:text-blue-400">
                  {formatElapsed(timeSince.days, timeSince.hours, timeSince.minutes, timeSince.seconds)} ago
                </p>
              </div>
            </div>
          </div>
          <div className="relative menu-container">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 
                       p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 
                       transition-colors"
              aria-label="More options"
            >
              <MoreVertical size={20} />
            </button>
            
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 
                            rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 
                            py-1 z-10">
                <button
                  onClick={() => {
                    openUrgeDialog();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 
                           hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <ShieldCheck size={16} />
                  {t('logUrgeManually')}
                </button>
                <button
                  onClick={() => {
                    openHistoryDialog();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 
                           hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Calendar size={16} />
                  {t('viewHistory')}
                </button>
                <button
                  onClick={handleExportData}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 
                           hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Download size={16} />
                  {t('exportData')}
                </button>
                <button
                  onClick={() => {
                    onEdit(addiction);
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 
                           hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Edit size={16} />
                  {t('edit')}
                </button>
                <button
                  onClick={() => {
                    onDelete(addiction.id);
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 
                           hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  {t('delete')}
                </button>
              </div>
            )}
          </div>
        </div>
        
        {addiction.note && (
          <div className="mb-6 flex items-start gap-2 rounded-lg p-3 
                        bg-amber-50 dark:bg-amber-900/20 
                        text-sm text-amber-900 dark:text-amber-200">
            <StickyNote size={16} className="mt-0.5 shrink-0" />
            <p className="whitespace-pre-wrap break-words">{addiction.note}</p>
          </div>
        )}

        <div className="grid grid-cols-4 max-[640px]:grid-cols-2 max-[450px]:grid-cols-1 gap-3 mb-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {t('costPerTime')}
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {getCostLabel()}
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
            <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">
              {t('cleanFor')}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                {daysSince}
              </span>
              <span className="text-blue-600 dark:text-blue-400">
                {t('days')}
              </span>
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-3">
            <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">
              {t('resistedThisMonth')}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                {monthlyUrges.resisted}
              </span>
              {monthlyUrges.total > 0 && (
                <span className="text-sm text-emerald-600 dark:text-emerald-400">
                  / {monthlyUrges.total}
                </span>
              )}
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3">
            <div className="text-sm text-green-600 dark:text-green-400 mb-1">
              {t('goal')}
            </div>
            <div className="text-lg font-semibold text-green-700 dark:text-green-300">
              {getGoalLabel()}
            </div>
          </div>
        </div>

        {milestone.next && milestone.msUntilNext !== undefined && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span className="flex items-center gap-1">
                <Flame size={13} className="text-amber-500" />
                {t('nextMilestone')}: {milestone.next.emoji} {t(milestone.next.labelKey)}
              </span>
              <span>{t('milestoneIn', { time: formatCountdown(milestone.msUntilNext) })}</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400 dark:bg-amber-500 transition-all duration-500"
                style={{ width: `${Math.round(milestone.progressToNext * 100)}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={() => onOpenPanic(addiction)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-4 rounded-xl
                   text-base font-semibold text-white
                   bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500
                   transition-colors"
        >
          <Zap size={18} />
          {t('cravingNow')}
        </button>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {t('totalSaved')}
            </div>
            <div className="text-xl font-semibold text-green-600 dark:text-green-400">
              {getSavedLabelText()}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="w-16 h-16">
              <ProgressCircle percentage={progress.percentage} />
            </div>
            
            <button
              onClick={openResetDialog}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                       bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400
                       hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              <RefreshCw size={16} />
              <span>{t('reset')}</span>
            </button>
          </div>
        </div>
      </div>

      {showUrgeDialog && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('logUrgeManually')}
              </h2>
              <button
                onClick={() => setShowUrgeDialog(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('lastEngagedDate')}
                  </label>
                  <input
                    type="date"
                    value={urgeDate}
                    onChange={(e) => setUrgeDate(e.target.value)}
                    max={toDateInputValue(new Date())}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                              bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                              focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('time')}
                  </label>
                  <input
                    type="time"
                    value={urgeTime}
                    onChange={(e) => setUrgeTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                              bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                              focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {renderIntensityPicker()}

              <TriggerTagPicker value={urgeTriggers} onChange={setUrgeTriggers} hint={t('triggersHint')} />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('noteOptional')}
                </label>
                <textarea
                  value={urgeNote}
                  onChange={(e) => setUrgeNote(e.target.value)}
                  placeholder={t('urgeNotePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                            resize-none h-20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowUrgeDialog(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 
                            rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 
                            transition-colors duration-200"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleUrgeConfirm}
                  className="px-4 py-2 bg-emerald-500 dark:bg-emerald-600 text-white 
                            rounded-lg hover:bg-emerald-600 dark:hover:bg-emerald-500 
                            transition-colors duration-200"
                >
                  {t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResetDialog && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('recordRelapse')}
              </h2>
              <button 
                onClick={() => setShowResetDialog(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('lastEngagedDate')}
                  </label>
                  <input
                    type="date"
                    value={resetDate}
                    onChange={(e) => setResetDate(e.target.value)}
                    max={toDateInputValue(new Date())}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                              bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                              focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('time')}
                  </label>
                  <input
                    type="time"
                    value={resetTime}
                    onChange={(e) => setResetTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                              bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                              focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <TriggerTagPicker value={resetTriggers} onChange={setResetTriggers} hint={t('triggersHint')} />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('whatPrecededIt')}
                </label>
                <textarea
                  value={resetPrecededBy}
                  onChange={(e) => setResetPrecededBy(e.target.value)}
                  placeholder={t('precededByPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                            resize-none h-20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('whatHappened')}
                </label>
                <textarea
                  value={resetNote}
                  onChange={(e) => setResetNote(e.target.value)}
                  placeholder={t('relapsePrompt')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                            resize-none h-20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowResetDialog(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 
                            rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 
                            transition-colors duration-200"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleResetConfirm}
                  className="px-4 py-2 bg-red-500 dark:bg-red-600 text-white 
                            rounded-lg hover:bg-red-600 dark:hover:bg-red-500 
                            transition-colors duration-200"
                >
                  {t('confirmReset')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistoryDialog && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('historyTitle')}
              </h2>
              <button 
                onClick={() => setShowHistoryDialog(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => changeMonth(-1)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  aria-label={t('previousMonth')}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {currentMonth.toLocaleString(locale, { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  onClick={() => changeMonth(1)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  aria-label={t('nextMonth')}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 mb-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  {t('legendResisted')}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 dark:bg-rose-400" />
                  {t('legendRelapse')}
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekdayLabels.map(label => (
                  <div key={label} className="text-center text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {generateCalendarDays().map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  const dayEvents = eventsByDay.get(day) || [];
                  const relapseCount = dayEvents.filter(event => event.kind === 'relapse').length;
                  const urgeCount = dayEvents.length - relapseCount;
                  const isSelected = selectedDay === day;

                  // A relapse dominates the cell's colour: on a day with both,
                  // the slip is the fact the user is looking for.
                  const background = relapseCount > 0
                    ? 'bg-rose-100 dark:bg-rose-900/30 hover:bg-rose-200 dark:hover:bg-rose-900/50'
                    : urgeCount > 0
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                      : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700';

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      aria-pressed={isSelected}
                      aria-label={`${day} - ${urgeCount} ${t('urgesResisted')}, ${relapseCount} ${t('relapses')}`}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-1 
                                transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${background} ${
                        isSelected ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <span className={`text-sm leading-none ${
                        isToday(day)
                          ? 'font-bold text-blue-600 dark:text-blue-400'
                          : 'font-medium text-gray-700 dark:text-gray-300'
                      }`}>
                        {day}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="flex items-center gap-0.5">
                          {urgeCount > 0 && (
                            urgeCount > 1 ? (
                              <span className="min-w-[1.05rem] px-1 rounded-full bg-emerald-500 dark:bg-emerald-600 
                                             text-[0.625rem] leading-4 font-semibold text-white">
                                {urgeCount}
                              </span>
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                            )
                          )}
                          {relapseCount > 0 && (
                            relapseCount > 1 ? (
                              <span className="min-w-[1.05rem] px-1 rounded-full bg-rose-500 dark:bg-rose-600 
                                             text-[0.625rem] leading-4 font-semibold text-white">
                                {relapseCount}
                              </span>
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400" />
                            )
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              {selectedDay === null ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('selectDayHintEvents')}
                </p>
              ) : (
                <>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 first-letter:uppercase">
                    {selectedDayLabel}
                  </h4>
                  {selectedDayEvents.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('noEventsOnDay')}
                    </p>
                  ) : (
                    <ul className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedDayEvents.map(event => renderTimelineRow(event, false))}
                    </ul>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('recentActivity')}
              </h4>
              {timelineNewestFirst.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('noActivityRecorded')}
                </p>
              ) : (
                <ul className="space-y-2 max-h-60 overflow-y-auto">
                  {timelineNewestFirst.map(event => renderTimelineRow(event, true))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddictionItem;
