import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';

interface DisclosureProps {
  children: React.ReactNode;
  variant?: 'default' | 'onDark';
  label?: string;
}

// Optional fields live behind this, so a form shows only what it needs.
const Disclosure: React.FC<DisclosureProps> = ({ children, variant = 'default', label }) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const onDark = variant === 'onDark';

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        aria-expanded={isOpen}
        className={`inline-flex items-center gap-1 text-sm font-medium transition-colors ${
          onDark ? 'text-white/70 hover:text-white' : 'text-sage-500 hover:text-sage-800 dark:text-sage-400 dark:hover:text-sage-200'
        }`}
      >
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        {label ?? (isOpen ? t('fewerDetails') : t('moreDetails'))}
      </button>
      {isOpen && <div className="mt-4 space-y-5">{children}</div>}
    </div>
  );
};

export default Disclosure;
