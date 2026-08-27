import React from 'react';
import { Quote, RefreshCw } from 'lucide-react';
import { HillScene, LeafSprig } from './illustrations';
import { QUOTE_KEYS } from '../utils/quotes';
import { useI18n } from '../i18n/useI18n';

interface QuoteCardProps {
  quoteIndex: number;
  onShuffle: () => void;
}

const QuoteCard = React.forwardRef<HTMLElement, QuoteCardProps>(({ quoteIndex, onShuffle }, ref) => {
  const { t } = useI18n();
  const key = QUOTE_KEYS[((quoteIndex % QUOTE_KEYS.length) + QUOTE_KEYS.length) % QUOTE_KEYS.length];

  return (
    <section
      ref={ref}
      className="relative overflow-hidden rounded-2xl border border-brand-100 dark:border-brand-800/60
               bg-brand-50 dark:bg-brand-900/25 p-5 sm:p-6"
    >
      <HillScene className="absolute bottom-0 right-0 h-24 w-64 text-brand-200 dark:text-brand-800/50" />
      <LeafSprig className="absolute bottom-1 right-8 w-16 h-16 text-brand-400 dark:text-brand-500" />

      <div className="relative max-w-xl">
        <Quote size={22} className="text-brand-400 dark:text-brand-500 mb-2" />
        <p className="text-lg sm:text-xl font-medium leading-relaxed text-sage-800 dark:text-sage-50">
          {t(key)}
        </p>
        <p className="mt-2 text-sm text-sage-500 dark:text-sage-400">— {t('oneDayAtATime')}</p>
      </div>

      <button
        type="button"
        onClick={onShuffle}
        className="absolute top-4 right-4 p-2 rounded-full text-brand-700 dark:text-brand-300
                 hover:bg-brand-100 dark:hover:bg-brand-800/40 transition-colors"
        aria-label={t('newQuote')}
        title={t('newQuote')}
      >
        <RefreshCw size={16} />
      </button>
    </section>
  );
});

QuoteCard.displayName = 'QuoteCard';

export default QuoteCard;
