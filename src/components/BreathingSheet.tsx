import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { BREATH_CYCLE_SECONDS, getBreathState } from '../utils/breathing';
import { useI18n } from '../i18n/useI18n';

interface BreathingSheetProps {
  onClose: () => void;
}

// The 4-7-8 pacer from the craving screen, on its own: something to reach for
// before an urge has taken hold rather than during one.
const BreathingSheet: React.FC<BreathingSheetProps> = ({ onClose }) => {
  const { t } = useI18n();
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    tick();
    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const breath = getBreathState(elapsed);
  const cycles = Math.floor(elapsed / BREATH_CYCLE_SECONDS);

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4
               bg-gradient-to-br from-forest-500 via-forest-700 to-forest-900 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={t('breathing')}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        style={{ top: 'calc(var(--safe-area-inset-top) + 1rem)' }}
        aria-label={t('close')}
      >
        <X size={22} />
      </button>

      <div className="flex flex-col items-center text-center">
        <h2 className="text-2xl font-semibold">{t('breathing')}</h2>
        <p className="mt-1 text-sm text-white/60 max-w-xs">{t('breathingDesc')}</p>

        <div className="relative mt-10 w-60 h-60 flex items-center justify-center">
          <div className="absolute w-full h-full rounded-full border border-white/15" />
          <div
            className="absolute w-48 h-48 rounded-full bg-brand-400/25 border border-brand-200/30"
            style={{ transform: `scale(${breath.scale})`, transition: 'transform 250ms linear' }}
          />
          <div className="relative">
            <div className="text-xl font-semibold">{t(breath.key)}</div>
            <div className="mt-1 text-sm text-white/60">{t('cyclesCompleted', { count: cycles })}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-12 px-6 py-3 rounded-xl bg-white text-forest-700 font-semibold hover:bg-brand-50 transition-colors"
        >
          {t('done')}
        </button>
      </div>
    </div>
  );
};

export default BreathingSheet;
