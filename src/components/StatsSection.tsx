import React, { useMemo } from 'react';
import { Download, Flame, PiggyBank } from 'lucide-react';
import { Addiction } from '../types';
import { exportAddictionsToCSV } from '../utils/exportData';
import { getDaysSince, getSavedAmount } from '../utils/format';
import { useI18n } from '../i18n/useI18n';

interface StatsSectionProps {
  addictions: Addiction[];
}

// Totals across every tracker, next to the per-tracker cards above them.
const StatsSection: React.FC<StatsSectionProps> = ({ addictions }) => {
  const { t } = useI18n();

  const totalSavings = useMemo(() => addictions.reduce((total, addiction) => (
    addiction.costType === 'money' ? total + getSavedAmount(addiction) : total
  ), 0), [addictions]);

  const longestStreak = useMemo(() => (
    addictions.reduce((best, addiction) => Math.max(best, getDaysSince(addiction.lastEngaged)), 0)
  ), [addictions]);

  const handleQuickExport = () => {
    try {
      exportAddictionsToCSV(addictions);
      setTimeout(() => {
        alert(t('exportSuccess'));
      }, 100);
    } catch (error) {
      console.error('Export failed:', error);
      alert(t('exportFailed'));
    }
  };

  if (addictions.length === 0) {
    return null;
  }

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="card-title">{t('yourTotals')}</h2>

        <button
          onClick={handleQuickExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full
                   border border-sage-200 dark:border-sage-600 text-sage-600 dark:text-sage-300
                   hover:bg-sage-100 dark:hover:bg-sage-700 transition-colors"
          title="Quick export to CSV"
        >
          <Download size={13} />
          <span>{t('export')}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-brand-50 dark:bg-brand-900/40 p-4">
          <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300 mb-1">
            <PiggyBank size={16} />
            <span className="text-xs font-medium">{t('moneySaved')}</span>
          </div>
          <p className="text-2xl font-bold text-sage-900 dark:text-white">
            ${isNaN(totalSavings) ? '0.00' : totalSavings.toFixed(2)}
          </p>
        </div>

        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 mb-1">
            <Flame size={16} />
            <span className="text-xs font-medium">{t('longestStreak')}</span>
          </div>
          <p className="text-2xl font-bold text-sage-900 dark:text-white">
            {longestStreak} <span className="text-base font-medium text-sage-500 dark:text-sage-400">{t('days')}</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
