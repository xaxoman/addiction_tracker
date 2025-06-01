import React, { useMemo } from 'react';
import { LineChart, BarChart, Download } from 'lucide-react';
import { Addiction } from '../types';
import { exportAddictionsToCSV } from '../utils/exportData';

interface StatsSectionProps {
  addictions: Addiction[];
}

const StatsSection: React.FC<StatsSectionProps> = ({ addictions }) => {
  const totalSavings = useMemo(() => {
    return addictions.reduce((total, addiction) => {
      if (addiction.costType !== 'money') return total;
      
      const lastEngaged = new Date(addiction.lastEngaged);
      const now = new Date();
      
      // Validate dates and cost
      if (isNaN(now.getTime()) || isNaN(lastEngaged.getTime())) return total;
      
      const costValue = typeof addiction.cost === 'number' && !isNaN(addiction.cost) ? addiction.cost : 0;
      const diffTime = Math.abs(now.getTime() - lastEngaged.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      const savings = costValue * diffDays;
      return total + (isNaN(savings) ? 0 : Math.max(0, savings));
    }, 0);
  }, [addictions]);
  
  const longestStreak = useMemo(() => {
    if (addictions.length === 0) return 0;
    
    return Math.max(...addictions.map(addiction => {
      const lastEngaged = new Date(addiction.lastEngaged);
      const now = new Date();
      
      // Validate dates
      if (isNaN(now.getTime()) || isNaN(lastEngaged.getTime())) return 0;
      
      const diffTime = Math.abs(now.getTime() - lastEngaged.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return isNaN(diffDays) ? 0 : Math.max(0, diffDays);
    }));
  }, [addictions]);

  const handleQuickExport = () => {
    try {
      exportAddictionsToCSV(addictions);
      setTimeout(() => {
        alert('Export successful! Your addiction data has been downloaded as CSV.');
      }, 100);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  if (addictions.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-medium text-blue-800 dark:text-blue-300">Your Progress</h2>
        
        <button
          onClick={handleQuickExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                   bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300
                   hover:bg-blue-200 dark:hover:bg-blue-800/70 transition-colors"
          title="Quick export to CSV"
        >
          <Download size={12} />
          <span>Export</span>
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
            <BarChart size={16} />
            <span className="text-sm font-medium">Money Saved</span>
          </div>
          <p className="text-xl font-bold text-gray-800 dark:text-white">
            ${isNaN(totalSavings) ? '0.00' : totalSavings.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
            <LineChart size={16} />
            <span className="text-sm font-medium">Longest Streak</span>
          </div>
          <p className="text-xl font-bold text-gray-800 dark:text-white">
            {isNaN(longestStreak) ? 0 : longestStreak} days
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatsSection;