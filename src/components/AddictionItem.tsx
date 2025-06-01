import React, { useState, useEffect } from 'react';
import { MoreVertical, RefreshCw, Edit, Trash2, X, Calendar, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Addiction } from '../types';
import ProgressCircle from './ProgressCircle';
import { exportSingleAddictionToCSV } from '../utils/exportData';

interface AddictionItemProps {
  addiction: Addiction;
  onReset: (id: string, date: Date, note?: string) => void;
  onEdit: (addiction: Addiction) => void;
  onDelete: (id: string) => void;
}

const AddictionItem: React.FC<AddictionItemProps> = ({ addiction, onReset, onEdit, onDelete }) => {
  const [timeSince, setTimeSince] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [resetDate, setResetDate] = useState(new Date().toISOString().split('T')[0]);
  const [resetTime, setResetTime] = useState(
    new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
  );
  const [resetNote, setResetNote] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const updateTimeSince = () => {
      const now = new Date();
      const lastEngaged = new Date(addiction.lastEngaged);
      const diffTime = Math.abs(now.getTime() - lastEngaged.getTime());
      
      const hours = Math.floor(diffTime / (1000 * 60 * 60));
      const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffTime % (1000 * 60)) / 1000);
      
      setTimeSince({ hours, minutes, seconds });
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
    const [hours, minutes] = resetTime.split(':').map(Number);
    const resetDateTime = new Date(resetDate);
    resetDateTime.setHours(hours, minutes);
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
  
  const getSavedAmount = () => {
    const costValue = typeof addiction.cost === 'number' && !isNaN(addiction.cost) ? addiction.cost : 0;
    const savedAmount = costValue * daysSince;
    return isNaN(savedAmount) ? '0.00' : Math.max(0, savedAmount).toFixed(2);
  };

  const getGoalLabel = () => {
    if (!addiction.goal || !addiction.goal.value || isNaN(addiction.goal.value)) {
      return 'No goal set';
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

  const hasRelapseOnDay = (day: number) => {
    if (!addiction.notes || !Array.isArray(addiction.notes)) return false;
    
    return addiction.notes.some(note => {
      const noteDate = new Date(note.date);
      if (isNaN(noteDate.getTime())) return false; // Invalid date
      
      return noteDate.getFullYear() === currentMonth.getFullYear() &&
             noteDate.getMonth() === currentMonth.getMonth() &&
             noteDate.getDate() === day;
    });
  };

  const getRelapsesForDay = (day: number) => {
    if (!addiction.notes || !Array.isArray(addiction.notes)) return [];
    
    return addiction.notes.filter(note => {
      const noteDate = new Date(note.date);
      if (isNaN(noteDate.getTime())) return false; // Invalid date
      
      return noteDate.getFullYear() === currentMonth.getFullYear() &&
             noteDate.getMonth() === currentMonth.getMonth() &&
             noteDate.getDate() === day;
    });
  };

  const handleExportData = () => {
    try {
      exportSingleAddictionToCSV(addiction);
      setIsMenuOpen(false);
      setTimeout(() => {
        alert(`Export successful! Data for "${addiction.name}" has been downloaded as CSV.`);
      }, 100);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
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
                  {timeSince.hours}h {timeSince.minutes}m {timeSince.seconds}s ago
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
                    setShowHistoryDialog(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 
                           hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Calendar size={16} />
                  View History
                </button>
                <button
                  onClick={handleExportData}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 
                           hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Download size={16} />
                  Export Data
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
                  Edit
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
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-3 max-[450px]:grid-cols-1 gap-6 max-[450px]:gap-2 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Cost per time
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {getCostLabel()}
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
            <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">
              Clean for
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                {daysSince}
              </span>
              <span className="text-blue-600 dark:text-blue-400">
                days
              </span>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3">
            <div className="text-sm text-green-600 dark:text-green-400 mb-1">
              Goal
            </div>
            <div className="text-lg font-semibold text-green-700 dark:text-green-300">
              {getGoalLabel()}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Total saved
            </div>
            <div className="text-xl font-semibold text-green-600 dark:text-green-400">
              {addiction.costType === 'money' ? '$' : ''}{getSavedAmount()} 
              {addiction.costType === 'time' ? ' min' : ''}
              {addiction.costType === 'health' ? ' impact' : ''}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="w-16 h-16">
              <ProgressCircle percentage={progress.percentage} />
            </div>
            
            <button
              onClick={() => setShowResetDialog(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                       bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400
                       hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              <RefreshCw size={16} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {showResetDialog && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Record Relapse
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
                    Date
                  </label>
                  <input
                    type="date"
                    value={resetDate}
                    onChange={(e) => setResetDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                              bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                              focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Time
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
                  Note (optional)
                </label>
                <textarea
                  value={resetNote}
                  onChange={(e) => setResetNote(e.target.value)}
                  placeholder="What triggered this relapse?"
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
                  Cancel
                </button>
                <button
                  onClick={handleResetConfirm}
                  className="px-4 py-2 bg-red-500 dark:bg-red-600 text-white 
                            rounded-lg hover:bg-red-600 dark:hover:bg-red-500 
                            transition-colors duration-200"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistoryDialog && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Relapse History
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
                  onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {generateCalendarDays().map((day, index) => (
                  <div
                    key={index}
                    className={`aspect-square p-2 rounded-lg ${
                      day === null
                        ? 'bg-transparent'
                        : hasRelapseOnDay(day)
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : 'bg-gray-50 dark:bg-gray-700/50'
                    }`}
                  >
                    {day !== null && (
                      <div className="h-full">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {day}
                        </div>
                        {hasRelapseOnDay(day) && (
                          <div className="mt-1">
                            {getRelapsesForDay(day).map((relapse, i) => (
                              <div
                                key={i}
                                className="text-xs text-red-600 dark:text-red-400 truncate"
                                title={relapse.text || 'No note'}
                              >
                                {new Date(relapse.date).toLocaleTimeString([], { 
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recent Relapses
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {addiction.notes?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((note, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(note.date).toLocaleString()}
                      </div>
                      {note.text && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {note.text}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddictionItem;