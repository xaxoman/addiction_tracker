import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AddictionProvider, useAddictions, RelapseDetails, UrgeInput } from './context/AddictionContext';
import { AppSettingsProvider, useAppSettings } from './context/AppSettingsContext';
import { CheckInProvider, useCheckIns, CheckInInput } from './context/CheckInContext';
import { AuthProvider } from './context/AuthContext';
import { CloudSyncProvider } from './context/CloudSyncContext';
import { Addiction } from './types';
import Header from './components/Header';
import AddAddictionButton from './components/AddAddictionButton';
import AddAddictionDialog from './components/AddAddictionDialog';
import DraggableAddictionList from './components/DraggableAddictionList';
import StatsSection from './components/StatsSection';
import TrendCharts from './components/TrendCharts';
import EmptyState from './components/EmptyState';
import DailyCheckInCard from './components/DailyCheckInCard';
import PanicScreen, { UrgeOutcomePayload } from './components/PanicScreen';
import BottomTabBar, { AppTab } from './components/BottomTabBar';
import { capacitorService } from './services/capacitor';
import { safeAreaService } from './services/safeArea';
import { createAutomaticBackupIfDue } from './utils/backup';
import { startReminderScheduler, ScheduledMilestone } from './services/checkInNotifications';
import { getRiskWindows } from './utils/riskWindows';
import { getUpcomingMilestones } from './utils/milestones';
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
  const [notice, setNotice] = useState<{ text: string; tone: 'backup' | 'urge' } | null>(null);
  // Held by id rather than by object so the open screen keeps re-rendering
  // against the live tracker as urges and relapses are logged.
  const [panicAddictionId, setPanicAddictionId] = useState<string | null>(null);

  const panicAddiction = addictions.find(addiction => addiction.id === panicAddictionId) ?? null;
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <Header />
      
      <main className="container mx-auto px-4 py-6 pb-36">
        {activeTab === 'home' && (
          <>
            {addictions.length > 0 ? (
              <>
                <DailyCheckInCard todaysCheckIn={todaysCheckIn} onRecord={handleRecordCheckIn} />
                <StatsSection addictions={addictions} />
                <DraggableAddictionList
                  addictions={addictions}
                  onReset={handleReset}
                  onDeleteRelapse={handleDeleteRelapse}
                  onLogUrge={handleLogUrge}
                  onDeleteUrge={handleDeleteUrge}
                  onOpenPanic={handleOpenPanic}
                  onReorder={reorderAddictions}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </>
            ) : (
              <EmptyState onAdd={() => setIsDialogOpen(true)} />
            )}
          </>
        )}

        {activeTab === 'trends' && (
          <>
            {addictions.length > 0 ? (
              <TrendCharts addictions={addictions} checkIns={checkIns} />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('trends')}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('noData')}</p>
              </div>
            )}
          </>
        )}
      </main>
      
      {activeTab === 'home' && (
        <AddAddictionButton onClick={() => {
          setEditingAddiction(null);
          setIsDialogOpen(true);
        }} />
      )}

      <BottomTabBar activeTab={activeTab} onTabChange={handleTabChange} />

      {notice && (
        <div className={`fixed left-1/2 bottom-[calc(5rem+var(--safe-area-inset-bottom))] -translate-x-1/2 z-[120] px-3 py-2 rounded-full text-white shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          notice.tone === 'urge' ? 'bg-emerald-600' : 'bg-green-600'
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
