import React, { useState, useEffect, useMemo } from 'react';
import { MoreVertical, RefreshCw, Edit, Trash2, X, Calendar, ChevronLeft, ChevronRight, Download, StickyNote } from 'lucide-react';
import { Addiction, RelapseEntry } from '../types';
import ProgressCircle from './ProgressCircle';
import { exportSingleAddictionToCSV } from '../utils/exportData';
import { useI18n } from '../i18n/useI18n';

interface AddictionItemProps {
  addiction: Addiction;
  onReset: (id: string, date: Date, note?: string) => void;
  onDeleteRelapse: (id: string, relapseId: string) => void;
  onEdit: (addiction: Addiction) => void;
  onDelete: (id: string) => void;
}

// Compact, human-readable elapsed time. Rolls hours up into days so the
// value never grows unbounded (e.g. 2762h -> 115d 6h 49m). Seconds are only
// shown for short durations where the live ticker is meaningful.
const formatElapsed = (days: number, hours: number, minutes: number, seconds: number): string => {
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

// Time-based savings are accumulated in minutes; roll them up into
// hours and days so large totals stay readable (e.g. 1725 min -> 1d 4h).
const formatMinutesSaved = (totalMinutes: number): string => {
  const mins = Math.max(0, Math.round(totalMinutes));
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const minutes = mins % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

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

const AddictionItem: React.FC<AddictionItemProps> = ({ addiction, onReset, onDeleteRelapse, onEdit, onDelete }) => {
  const { t, language } = useI18n();
  const locale = language === 'it' ? 'it-IT' : 'en-US';
  const [timeSince, setTimeSince] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [resetDate, setResetDate] = useState(() => toDateInputValue(new Date()));
  const [resetTime, setResetTime] = useState(() => toTimeInputValue(new Date()));
  const [resetNote, setResetNote] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Open the reset dialog with the date/time fields freshly defaulted to "now"
  // (in local time) so stale values from a previous open don't linger.
  const openResetDialog = () => {
    const now = new Date();
    setResetDate(toDateInputValue(now));
    setResetTime(toTimeInputValue(now));
    setResetNote('');
    setShowResetDialog(true);
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

  const handleResetConfirm = () => {
    // Build the timestamp from the picked local date + time components.
    // `new Date(resetDate)` would parse the "YYYY-MM-DD" string as UTC
    // midnight and could land on the wrong day once the local time is applied.
    const [year, month, day] = resetDate.split('-').map(Number);
    const [hours, minutes] = resetTime.split(':').map(Number);
    const resetDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
    if (isNaN(resetDateTime.getTime())) {
      return; // Guard against incomplete/invalid input
    }
    onReset(addiction.id, resetDateTime, resetNote.trim() || undefined);
    setShowResetDialog(false);
    setResetNote('');
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

  const getDaysSince = (): number => {
    const now = new Date();
    const lastEngaged = new Date(addiction.lastEngaged);
    
    // Validate dates
    if (isNaN(now.getTime()) || isNaN(lastEngaged.getTime())) {
      return 0;
    }
    
    const diffTime = Math.abs(now.getTime() - lastEngaged.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return isNaN(diffDays) ? 0 : diffDays;
  };

  const daysSince = getDaysSince();
  const progress = getProgress();
  
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
  
  const getSavedAmount = (): number => {
    const costValue = typeof addiction.cost === 'number' && !isNaN(addiction.cost) ? addiction.cost : 0;
    const savedAmount = costValue * daysSince;
    return isNaN(savedAmount) ? 0 : Math.max(0, savedAmount);
  };

  const getSavedLabel = (): string => {
    const amount = getSavedAmount();
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

  // Relapses of the visible month, bucketed by day-of-month. The grid only ever
  // renders a counter from this map: the details themselves live in the panel
  // below the calendar so nothing overflows a day cell.
  const relapsesByDay = useMemo(() => {
    const grouped = new Map<number, RelapseEntry[]>();

    (Array.isArray(addiction.notes) ? addiction.notes : []).forEach(note => {
      const noteDate = new Date(note.date);
      if (isNaN(noteDate.getTime())) return; // Invalid date

      if (noteDate.getFullYear() !== currentMonth.getFullYear() ||
          noteDate.getMonth() !== currentMonth.getMonth()) {
        return;
      }

      const day = noteDate.getDate();
      const entries = grouped.get(day) || [];
      entries.push(note);
      grouped.set(day, entries);
    });

    grouped.forEach(entries => {
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    return grouped;
  }, [addiction.notes, currentMonth]);

  // Most recent first, on a copy so the stored order (which the streak anchor
  // depends on) is never mutated.
  const relapsesNewestFirst = useMemo(() => {
    return [...(Array.isArray(addiction.notes) ? addiction.notes : [])]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [addiction.notes]);

  // Weekday headers in the app language. 2023-01-01 was a Sunday, so walking a
  // week from there lines the labels up with the Sunday-first grid.
  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, index) => formatter.format(new Date(2023, 0, 1 + index)));
  }, [locale]);

  const selectedDayRelapses = selectedDay === null
    ? []
    : relapsesByDay.get(selectedDay) || [];

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

  const formatRelapseTime = (date: Date | string): string => {
    return new Date(date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {addiction.name}
              </h3>
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
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 
                            rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 
                            py-1 z-10">
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

        <div className="grid grid-cols-3 max-[450px]:grid-cols-1 gap-6 max-[450px]:gap-2 mb-6">
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

          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3">
            <div className="text-sm text-green-600 dark:text-green-400 mb-1">
              {t('goal')}
            </div>
            <div className="text-lg font-semibold text-green-700 dark:text-green-300">
              {getGoalLabel()}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {t('totalSaved')}
            </div>
            <div className="text-xl font-semibold text-green-600 dark:text-green-400">
              {getSavedLabel()}
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

      {showResetDialog && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl animate-fade-in-up">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('noteOptional')}
                </label>
                <textarea
                  value={resetNote}
                  onChange={(e) => setResetNote(e.target.value)}
                  placeholder={t('relapsePrompt')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                            resize-none h-24"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
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
                {t('relapseHistory')}
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

                  const relapseCount = (relapsesByDay.get(day) || []).length;
                  const isSelected = selectedDay === day;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      aria-pressed={isSelected}
                      aria-label={`${day} - ${relapseCount} ${t('relapses')}`}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-1 
                                transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        relapseCount > 0
                          ? 'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50'
                          : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                      } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                    >
                      <span className={`text-sm leading-none ${
                        isToday(day)
                          ? 'font-bold text-blue-600 dark:text-blue-400'
                          : 'font-medium text-gray-700 dark:text-gray-300'
                      }`}>
                        {day}
                      </span>
                      {relapseCount > 0 && (
                        relapseCount > 1 ? (
                          <span className="min-w-[1.05rem] px-1 rounded-full bg-red-500 dark:bg-red-600 
                                         text-[0.625rem] leading-4 font-semibold text-white">
                            {relapseCount}
                          </span>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400" />
                        )
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              {selectedDay === null ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('selectDayHint')}
                </p>
              ) : (
                <>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 first-letter:uppercase">
                    {selectedDayLabel}
                  </h4>
                  {selectedDayRelapses.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('noRelapsesOnDay')}
                    </p>
                  ) : (
                    <ul className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedDayRelapses.map(relapse => (
                        <li
                          key={relapse.id}
                          className="flex items-start justify-between gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatRelapseTime(relapse.date)}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 break-words whitespace-pre-wrap">
                              {relapse.text || t('noNote')}
                            </div>
                          </div>
                          <button
                            onClick={() => onDeleteRelapse(addiction.id, relapse.id)}
                            className="shrink-0 p-2 rounded-lg text-red-600 dark:text-red-400 
                                     hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            aria-label={t('deleteRelapse')}
                            title={t('deleteRelapse')}
                          >
                            <Trash2 size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('recentRelapses')}
              </h4>
              {relapsesNewestFirst.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('noRelapsesRecorded')}
                </p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {relapsesNewestFirst.map(note => (
                    <div
                      key={note.id}
                      className="flex items-start justify-between gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(note.date).toLocaleString(locale)}
                        </div>
                        {note.text && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 break-words whitespace-pre-wrap">
                            {note.text}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => onDeleteRelapse(addiction.id, note.id)}
                        className="shrink-0 p-2 rounded-lg text-red-600 dark:text-red-400 
                                 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        aria-label={t('deleteRelapse')}
                        title={t('deleteRelapse')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddictionItem;