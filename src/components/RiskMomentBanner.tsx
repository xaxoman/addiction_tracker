import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';
import { getActiveRiskWindow } from '../utils/riskWindows';
import { PlanTarget, RiskNudge, RISK_NUDGE_LEAD_MINUTES } from '../services/checkInNotifications';

interface RiskMomentBannerProps {
  nudges: RiskNudge[];
  onOpenPlan: (target: PlanTarget) => void;
}

// The in-app half of a risk nudge: shown from just before one of the user's
// hard windows until it has passed, with the plan for it one tap away. It also
// covers devices where notifications are off.
const RiskMomentBanner: React.FC<RiskMomentBannerProps> = ({ nudges, onOpenPlan }) => {
  const { t } = useI18n();
  const [now, setNow] = useState(() => new Date());
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const active = getActiveRiskWindow(nudges.map(nudge => nudge.window), RISK_NUDGE_LEAD_MINUTES, now);
  const nudge = active ? nudges.find(entry => entry.window === active) : undefined;
  const key = active ? `${active.weekday}-${active.hour}` : null;

  if (!nudge || key === dismissedKey) {
    return null;
  }

  return (
    <section
      role="status"
      className="rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-900/25 p-4 flex items-start gap-3"
    >
      <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-sage-900 dark:text-white">{nudge.body}</p>
        <button
          type="button"
          onClick={() => onOpenPlan({ addictionId: nudge.addictionId, planId: nudge.planId })}
          className="mt-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-sage-900 transition-colors"
        >
          {t('openPlan')}
        </button>
      </div>
      <button
        type="button"
        onClick={() => setDismissedKey(key)}
        className="shrink-0 p-1.5 rounded-lg text-sage-500 hover:bg-amber-100 dark:text-sage-400 dark:hover:bg-amber-900/40"
        aria-label={t('close')}
      >
        <X size={16} />
      </button>
    </section>
  );
};

export default RiskMomentBanner;
