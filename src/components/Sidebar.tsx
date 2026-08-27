import React from 'react';
import {
  BarChart3, ChevronRight, Flame, Home, NotebookPen, Settings, Sprout, Wind, Zap
} from 'lucide-react';
import { AppTab, NavAction } from './navigation';
import { LeafSprig } from './illustrations';
import { useI18n } from '../i18n/useI18n';

interface SidebarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onAction: (action: NavAction) => void;
  // The longest run currently going, shown in the sidebar's streak card.
  streakDays: number;
  accountEmail?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onAction,
  streakDays,
  accountEmail
}) => {
  const { t } = useI18n();

  const destinations: Array<{ key: AppTab; icon: React.ReactNode; label: string }> = [
    { key: 'home', icon: <Home size={18} />, label: t('overview') },
    { key: 'trends', icon: <BarChart3 size={18} />, label: t('progress') }
  ];

  const tools: Array<{ key: NavAction; icon: React.ReactNode; label: string }> = [
    { key: 'urge', icon: <Zap size={18} />, label: t('urgeTracker') },
    { key: 'journal', icon: <NotebookPen size={18} />, label: t('journal') },
    { key: 'breathing', icon: <Wind size={18} />, label: t('breathing') }
  ];

  const itemClass = (isActive: boolean) => `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
    isActive
      ? 'bg-forest-500 text-white'
      : 'text-brand-100/70 hover:text-white hover:bg-white/5'
  }`;

  return (
    <div className="hidden lg:block lg:w-[264px] lg:shrink-0 bg-forest-900 text-white">
    <aside className="sticky top-0 h-screen flex flex-col p-4 overflow-y-auto">
      <div className="flex items-center gap-3 px-2 py-3">
        <span className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-300 flex items-center justify-center">
          <Sprout size={20} />
        </span>
        <div className="leading-tight">
          <div className="text-lg font-semibold">{t('appTitle')}</div>
          <div className="text-xs text-brand-100/50">{t('appTagline')}</div>
        </div>
      </div>

      <nav className="mt-4 space-y-1" aria-label={t('overview')}>
        {destinations.map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => onTabChange(item.key)}
            className={itemClass(item.key === activeTab)}
            aria-current={item.key === activeTab ? 'page' : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-6 px-3.5 text-[0.7rem] font-semibold uppercase tracking-wider text-brand-100/35">
        {t('toolsAndSupport')}
      </div>
      <nav className="mt-2 space-y-1">
        {tools.map(tool => (
          <button
            key={tool.key}
            type="button"
            onClick={() => onAction(tool.key)}
            className={itemClass(false)}
          >
            {tool.icon}
            <span>{tool.label}</span>
          </button>
        ))}
        <button type="button" onClick={() => onAction('settings')} className={itemClass(false)}>
          <Settings size={18} />
          <span>{t('settings')}</span>
        </button>
      </nav>

      <div className="mt-auto pt-6 space-y-4">
        <div className="relative overflow-hidden rounded-2xl bg-forest-700 p-4">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-2xl font-bold">
              <Flame size={20} className="text-amber-400" />
              {streakDays}
            </div>
            <div className="text-sm font-medium text-white/90">{t('dayStreak')}</div>
            <p className="mt-2 text-xs leading-relaxed text-brand-100/60 max-w-[9.5rem]">
              {t('streakEncouragement')}
            </p>
          </div>
          <LeafSprig className="absolute -bottom-3 -right-2 w-20 h-20 text-brand-300" />
        </div>

        <button
          type="button"
          onClick={() => onAction('account')}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left hover:bg-white/5 transition-colors border-t border-white/10 pt-4"
        >
          <span className="w-8 h-8 rounded-full bg-brand-500 text-white text-sm font-semibold uppercase flex items-center justify-center shrink-0">
            {(accountEmail ?? t('you')).charAt(0)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium truncate">
              {accountEmail ?? t('you')}
            </span>
            <span className="block text-xs text-brand-100/50">
              {accountEmail ? t('signedIn') : t('notSignedIn')}
            </span>
          </span>
          <ChevronRight size={16} className="text-brand-100/40 shrink-0" />
        </button>
      </div>
    </aside>
    </div>
  );
};

export default Sidebar;
