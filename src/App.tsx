import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AddictionProvider, useAddictions, RelapseDetails, UrgeInput } from './context/AddictionContext';
import { AppSettingsProvider, useAppSettings } from './context/AppSettingsContext';
import { CheckInProvider, useCheckIns, CheckInInput } from './context/CheckInContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CloudSyncProvider } from './context/CloudSyncContext';
import { Addiction } from './types';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import BottomTabBar from './components/BottomTabBar';
import { AppTab, NavAction } from './components/navigation';
import AddAddictionDialog from './components/AddAddictionDialog';
import SettingsDialog from './components/SettingsDialog';
import AccountDialog from './components/AccountDialog';
import OverviewScreen from './components/OverviewScreen';
import TrendCharts from './components/TrendCharts';
import EmptyState from './components/EmptyState';
import BreathingSheet from './components/BreathingSheet';
import PanicScreen, { UrgeOutcomePayload } from './components/PanicScreen';
import { capacitorService } from './services/capacitor';
import { safeAreaService } from './services/safeArea';
import { createAutomaticBackupIfDue } from './utils/backup';
import { startReminderScheduler, ScheduledMilestone } from './services/checkInNotifications';
import { getRiskWindows } from './utils/riskWindows';
import { getUpcomingMilestones } from './utils/milestones';
import { getStreakStats } from './utils/streaks';
import { useI18n } from './i18n/useI18n';

const AppContent = () => {
  const {
    addictions,
    addAddiction,
    removeAddiction,
    updateAddiction,
    resetLastEngaged,
    deleteRelapse,
    logUrge,
    deleteUrge,
    reorderAddictions
  } = useAddictions();
  const { checkIns, todaysCheckIn, recordCheckIn } = useCheckIns();
  const { theme } = useTheme();
  const { session } = useAuth();
  const {
    dailyCheckInEnabled,
    dailyCheckInTime,
    riskNudgesEnabled,
    milestoneAlertsEnabled,
    emergencyContact
  } = useAppSettings();
  const { t } = useI18n();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddiction, setEditingAddiction] = useState<Addiction | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isBreathingOpen, setIsBreathingOpen] = useState(false);
  const [journalSignal, setJournalSignal] = useState(0);
  const [notice, setNotice] = useState<{ text: string; tone: 'backup' | 'urge' } | null>(null);
  // Held by id rather than by object so the open screen keeps re-rendering
  // against the live tracker as urges and relapses are logged.
  const [panicAddictionId, setPanicAddictionId] = useState<string | null>(null);
  // The tracker the overview's hero, chart and urge log are about. Falls back
  // to the first one so a deleted or never-chosen focus still resolves.
  const [focusId, setFocusId] = useState<string | null>(null);

  const panicAddiction = addictions.find(addiction => addiction.id === panicAddictionId) ?? null;
  const focusAddiction = addictions.find(addiction => addiction.id === focusId) ?? addictions[0] ?? null;
  const isDarkMode = theme === 'dark';

  // Initialize Capacitor services
  useEffect(() => {
    const initializeApp = async () => {
      await capacitorService.initialize();
      await safeAreaService.initialize();
      
      // Set status bar style based on theme
      await capacitorService.setStatusBarStyle(isDarkMode);
    };

    initializeApp();
  }, []);

  // Update status bar when theme changes
  useEffect(() => {
    capacitorService.setStatusBarStyle(isDarkMode);
  }, [isDarkMode]);

  // The user's own high-risk weekday/hour windows, worked out from every urge
  // and relapse they have logged. Empty until there is enough data to mean
  // anything, in which case only the fixed daily reminder is scheduled.
  const riskWindows = useMemo(
    () => (riskNudgesEnabled ? getRiskWindows(addictions) : []),
    [addictions, riskNudgesEnabled]
  );

  const upcomingMilestones = useMemo<ScheduledMilestone[]>(() => {
    if (!milestoneAlertsEnabled) {
      return [];
    }

    return getUpcomingMilestones(addictions).map(({ addictionId, addictionName, milestone, at }) => ({
      key: `${addictionId}:${milestone.id}:${at.getTime()}`,
      at,
      title: t('milestoneNotificationTitle', { milestone: t(milestone.labelKey) }),
      body: t('milestoneNotificationBody', { name: addictionName, milestone: t(milestone.labelKey) })
    }));
  }, [addictions, milestoneAlertsEnabled, t]);

  // The sidebar's streak card speaks for the whole app, so it shows the
  // longest run currently going rather than the focused tracker's.
  const longestCurrentStreak = useMemo(
    () => addictions.reduce((best, addiction) => Math.max(best, getStreakStats(addiction).current), 0),
    [addictions]
  );

  useEffect(() => {
    const stopScheduler = startReminderScheduler({
      dailyEnabled: dailyCheckInEnabled,
      reminderTime: dailyCheckInTime,
      dailyTitle: t('checkInTitle'),
      dailyBody: t('checkInBody'),
      riskEnabled: riskNudgesEnabled && riskWindows.length > 0,
      riskWindows,
      riskTitle: t('riskNudgeTitle'),
      riskBody: t('riskNudgeBody'),
      milestoneEnabled: milestoneAlertsEnabled,
      milestones: upcomingMilestones,
      onTrigger: () => {
        capacitorService.vibrate();
      }
    });

    return () => stopScheduler();
  }, [
    dailyCheckInEnabled,
    dailyCheckInTime,
    riskNudgesEnabled,
    riskWindows,
    milestoneAlertsEnabled,
    upcomingMilestones,
    t
  ]);

  useEffect(() => {
    // Check on mount and whenever user data changes so we can create a daily backup.
    const checkAndCreateDailyBackup = async () => {
      try {
        const result = await createAutomaticBackupIfDue(addictions, theme, checkIns);
        if (result.created) {
          setNotice({ text: t('autoBackupCreatedPill'), tone: 'backup' });
        }
      } catch (error) {
        console.error('Automatic backup failed:', error);
      }
    };

    checkAndCreateDailyBackup();
    const intervalId = window.setInterval(() => {
      void checkAndCreateDailyBackup();
    }, 60 * 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [addictions, checkIns, theme]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNotice(null);
    }, 2600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [notice]);

  const handleAddAddiction = async (data: any) => {
    // Provide haptic feedback on native platforms
    await capacitorService.vibrate();
    
    if (editingAddiction) {
      updateAddiction({
        ...editingAddiction,
        ...data
      });
      setEditingAddiction(null);
    } else {
      addAddiction({
        name: data.name,
        icon: data.icon,
        cost: data.cost,
        costType: data.costType,
        lastEngaged: data.lastEngaged,
        goal: data.goal,
        note: data.note,
        copingPlans: data.copingPlans
      });
    }
    setIsDialogOpen(false);
  };

  const handleEdit = (addiction: Addiction) => {
    setEditingAddiction(addiction);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('deleteConfirm'))) {
      // Provide haptic feedback on deletion
      await capacitorService.vibrate();
      removeAddiction(id);
    }
  };

  const handleReset = async (id: string, date: Date, details?: RelapseDetails) => {
    // Provide haptic feedback on reset
    await capacitorService.vibrate();
    // Honor the date/time (and optional debrief) chosen in the reset dialog.
    // Fall back to now only if no date was provided.
    resetLastEngaged(id, date ?? new Date(), details);
  };

  const handleLogUrge = async (id: string, input: UrgeInput) => {
    await capacitorService.vibrate();
    logUrge(id, input);
    if (input.outcome === 'resisted') {
      setNotice({ text: t('urgeLoggedToast'), tone: 'urge' });
    }
  };

  const findAddiction = (id: string) => addictions.find(addiction => addiction.id === id);

  const handleDeleteRelapse = async (id: string, relapseId: string) => {
    // A relapse logged from the craving screen takes its urge with it, so warn
    // about that rather than showing the plain confirmation.
    const hasLinkedUrge = (findAddiction(id)?.urges ?? []).some(urge => urge.relapseId === relapseId);
    const message = hasLinkedUrge ? t('deleteRelapseWithUrgeConfirm') : t('deleteRelapseConfirm');

    if (!window.confirm(message)) {
      return;
    }
    await capacitorService.vibrate();
    deleteRelapse(id, relapseId);
  };

  const handleDeleteUrge = async (id: string, urgeId: string) => {
    const urge = (findAddiction(id)?.urges ?? []).find(entry => entry.id === urgeId);
    const message = urge?.relapseId ? t('deleteUrgeWithRelapseConfirm') : t('deleteUrgeConfirm');

    if (!window.confirm(message)) {
      return;
    }
    await capacitorService.vibrate();
    deleteUrge(id, urgeId);
  };

  const handleOpenPanic = async (addiction: Addiction) => {
    await capacitorService.vibrate();
    setPanicAddictionId(addiction.id);
  };

  const handlePanicOutcome = async (
    outcome: 'resisted' | 'relapsed',
    payload: UrgeOutcomePayload
  ) => {
    if (!panicAddictionId) {
      return;
    }

    await handleLogUrge(panicAddictionId, {
      outcome,
      intensity: payload.intensity,
      triggers: payload.triggers.length > 0 ? payload.triggers : undefined,
      text: payload.text,
      secondsHeld: payload.secondsHeld,
      source: 'panic',
      relapse: outcome === 'relapsed'
        ? { text: payload.text, precededBy: payload.precededBy }
        : undefined
    });

    setPanicAddictionId(null);
  };

  const handleRecordCheckIn = async (input: CheckInInput) => {
    await capacitorService.vibrate();
    recordCheckIn(input);
    setNotice({ text: t('checkedInToday'), tone: 'urge' });
  };

  const handleTabChange = async (tab: AppTab) => {
    setActiveTab(tab);
    await capacitorService.vibrate();
  };

  // The navigation's non-destination entries: each one opens a surface the app
  // already has, from wherever the user happens to be.
  const handleNavAction = (action: NavAction) => {
    switch (action) {
      case 'urge':
        if (focusAddiction) {
          void handleOpenPanic(focusAddiction);
        }
        break;
      case 'journal':
        setActiveTab('home');
        setJournalSignal(signal => signal + 1);
        break;
      case 'breathing':
        setIsBreathingOpen(true);
        break;
      case 'settings':
        setIsSettingsOpen(true);
        break;
      case 'account':
        setIsAccountOpen(true);
        break;
    }
  };

  const openAddDialog = () => {
    setEditingAddiction(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-sage-50 dark:bg-sage-900 text-sage-900 dark:text-sage-100 transition-colors duration-200">
      <div className="lg:flex">
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onAction={handleNavAction}
          streakDays={longestCurrentStreak}
          accountEmail={session?.email}
        />

        <div className="flex-1 min-w-0">
          <TopBar onOpenAccount={() => setIsAccountOpen(true)} isSignedIn={Boolean(session)} />

          <main className="mx-auto w-full max-w-6xl px-4 lg:px-8 py-5 lg:py-8 pb-28 lg:pb-12">
            {activeTab === 'home' && (
              focusAddiction ? (
                <OverviewScreen
                  addictions={addictions}
                  focusAddiction={focusAddiction}
                  onFocusChange={setFocusId}
                  todaysCheckIn={todaysCheckIn}
                  journalSignal={journalSignal}
                  onRecordCheckIn={handleRecordCheckIn}
                  onOpenPanic={handleOpenPanic}
                  onOpenBreathing={() => setIsBreathingOpen(true)}
                  onAdd={openAddDialog}
                  onReset={handleReset}
                  onDeleteRelapse={handleDeleteRelapse}
                  onLogUrge={handleLogUrge}
                  onDeleteUrge={handleDeleteUrge}
                  onReorder={reorderAddictions}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ) : (
                <EmptyState onAdd={openAddDialog} />
              )
            )}

            {activeTab === 'trends' && (
              <h1 className="text-xl sm:text-2xl font-semibold text-sage-900 dark:text-white mb-4">
                {t('progress')}
              </h1>
            )}

            {activeTab === 'trends' && (
              addictions.length > 0 ? (
                <TrendCharts addictions={addictions} checkIns={checkIns} />
              ) : (
                <div className="card p-6 text-center">
                  <h2 className="card-title mb-2">{t('trends')}</h2>
                  <p className="text-sm text-sage-500 dark:text-sage-400">{t('noData')}</p>
                </div>
              )
            )}
          </main>
        </div>
      </div>

      <BottomTabBar activeTab={activeTab} onTabChange={handleTabChange} onAction={handleNavAction} />

      {notice && (
        <div className={`fixed left-1/2 bottom-[calc(5rem+var(--safe-area-inset-bottom))] lg:bottom-8 -translate-x-1/2 z-[120] px-4 py-2.5 rounded-full text-white shadow-lg flex items-center gap-2 text-sm font-medium animate-fade-in-up ${
          notice.tone === 'urge' ? 'bg-brand-700' : 'bg-brand-600'
        }`}>
          {notice.tone === 'urge' ? <ShieldCheck className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{notice.text}</span>
        </div>
      )}
      
      <AddAddictionDialog 
        isOpen={isDialogOpen} 
        onClose={() => {
          setIsDialogOpen(false);
          setEditingAddiction(null);
        }}
        onAdd={handleAddAddiction}
        editingAddiction={editingAddiction}
      />

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        addictions={addictions}
      />

      <AccountDialog
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
      />

      {isBreathingOpen && <BreathingSheet onClose={() => setIsBreathingOpen(false)} />}

      {panicAddiction && (
        <PanicScreen
          addiction={panicAddiction}
          emergencyContactName={emergencyContact?.name}
          emergencyContactPhone={emergencyContact?.phone}
          onResisted={payload => handlePanicOutcome('resisted', payload)}
          onRelapsed={payload => handlePanicOutcome('relapsed', payload)}
          onClose={() => setPanicAddictionId(null)}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <AppSettingsProvider>
      <ThemeProvider>
        <AddictionProvider>
          <CheckInProvider>
            <AuthProvider>
              <CloudSyncProvider>
                <AppContent />
              </CloudSyncProvider>
            </AuthProvider>
          </CheckInProvider>
        </AddictionProvider>
      </ThemeProvider>
    </AppSettingsProvider>
  );
}

export default App;
