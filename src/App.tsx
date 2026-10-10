import { useState, useEffect, useMemo, useRef } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AddictionProvider, useAddictions, RelapseDetails, UrgeInput } from './context/AddictionContext';
import { AppSettingsProvider, useAppSettings } from './context/AppSettingsContext';
import { CheckInProvider, useCheckIns, CheckInInput, IntentionInput, ReviewInput } from './context/CheckInContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CloudSyncProvider } from './context/CloudSyncContext';
import { Addiction, CopingPlan, FollowThrough } from './types';
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
import WeeklyReviewSheet from './components/WeeklyReviewSheet';
import TrackersScreen from './components/TrackersScreen';
import { capacitorService } from './services/capacitor';
import { safeAreaService } from './services/safeArea';
import { createAutomaticBackupIfDue } from './utils/backup';
import {
  listenForPlanOpens,
  PlanTarget,
  RiskNudge,
  startReminderScheduler,
  ScheduledMilestone
} from './services/checkInNotifications';
import { formatWindowTime, getRiskWindows } from './utils/riskWindows';
import { pickPlan } from './utils/plans';
import { toDayKey } from './utils/dataValidation';
import { WEEKDAY_KEYS } from './utils/weeklyReview';
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
    addCopingPlan,
    reorderAddictions
  } = useAddictions();
  const {
    checkIns,
    todaysCheckIn,
    recordCheckIn,
    intentions,
    todaysIntention,
    setIntention,
    recordIntentionOutcome,
    latestReview,
    saveReview,
    journal
  } = useCheckIns();
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
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [journalSignal, setJournalSignal] = useState(0);
  const [notice, setNotice] = useState<{ text: string; tone: 'backup' | 'urge' } | null>(null);
  // Held by id rather than by object so the open screen keeps re-rendering
  // against the live tracker as urges and relapses are logged.
  const [panicAddictionId, setPanicAddictionId] = useState<string | null>(null);
  // Set when the craving screen is opened from a risk nudge: its plan goes first.
  const [panicPlanId, setPanicPlanId] = useState<string | undefined>(undefined);
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
  // and relapse they have logged, each written up with the plan that fits it.
  // Empty until there is enough data to mean anything. The in-app banner uses
  // them whether or not notifications are on.
  const riskNudges = useMemo<RiskNudge[]>(() => (
    getRiskWindows(addictions).map(window => {
      const addiction = addictions.find(entry => entry.id === window.addictionId);
      const plan = addiction ? pickPlan(addiction, window.triggers) : null;
      const params = { day: t(WEEKDAY_KEYS[window.weekday]), time: formatWindowTime(window) };
      return {
        window,
        title: t('riskNudgeTitle'),
        body: plan
          ? t('riskNudgeSpecificBody', { ...params, plan: plan.action })
          : t('riskNudgeNoPlanBody', params),
        addictionId: addiction?.id,
        planId: plan?.id
      };
    })
  ), [addictions, t]);

  // Yesterday's intention, while it still waits for its "did it go that way?".
  const pendingIntention = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const key = toDayKey(yesterday);
    return intentions.find(entry => entry.date === key && !entry.outcome) ?? null;
  }, [intentions]);

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
      riskEnabled: riskNudgesEnabled && riskNudges.length > 0,
      riskNudges,
      openPlanLabel: t('openPlan'),
      milestoneEnabled: milestoneAlertsEnabled,
      milestones: upcomingMilestones,
      onTrigger: () => {
        capacitorService.vibrate();
      },
      onOpenPlan: target => handleOpenPlanRef.current(target)
    });

    return () => stopScheduler();
  }, [
    dailyCheckInEnabled,
    dailyCheckInTime,
    riskNudgesEnabled,
    riskNudges,
    milestoneAlertsEnabled,
    upcomingMilestones,
    t
  ]);

  useEffect(() => {
    // Check on mount and whenever user data changes so we can create a daily backup.
    const checkAndCreateDailyBackup = async () => {
      try {
        const result = await createAutomaticBackupIfDue(addictions, theme, journal);
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
  }, [addictions, journal, theme]);

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

  const handleOpenPanic = async (addiction: Addiction, planId?: string) => {
    await capacitorService.vibrate();
    setPanicPlanId(planId);
    setPanicAddictionId(addiction.id);
  };

  const closePanic = () => {
    setPanicAddictionId(null);
    setPanicPlanId(undefined);
  };

  // From a risk nudge (notification or in-app banner): the craving screen for
  // the tracker the nudge was about, with its plan first.
  const handleOpenPlan = (target: PlanTarget) => {
    const addiction = findAddiction(target.addictionId ?? '') ?? focusAddiction;
    if (addiction) {
      void handleOpenPanic(addiction, target.planId);
    }
  };

  // Notification callbacks are registered once; this keeps them pointed at the
  // current trackers.
  const handleOpenPlanRef = useRef(handleOpenPlan);
  handleOpenPlanRef.current = handleOpenPlan;

  useEffect(() => listenForPlanOpens(target => handleOpenPlanRef.current(target)), []);

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
      needs: payload.needs,
      text: payload.text,
      planId: payload.planId,
      secondsHeld: payload.secondsHeld,
      source: 'panic',
      relapse: outcome === 'relapsed'
        ? {
            text: payload.text,
            precededBy: payload.precededBy,
            location: payload.location,
            nextTime: payload.nextTime,
            plan: payload.plan
          }
        : undefined
    });

    closePanic();
  };

  const handleRecordCheckIn = async (input: CheckInInput) => {
    await capacitorService.vibrate();
    recordCheckIn(input);
    setNotice({ text: t('checkedInToday'), tone: 'urge' });
  };

  const handleSetIntention = async (input: IntentionInput) => {
    await capacitorService.vibrate();
    setIntention(input);
    setNotice({ text: t('intentionSaved'), tone: 'urge' });
  };

  const handleIntentionOutcome = async (date: string, outcome: FollowThrough) => {
    await capacitorService.vibrate();
    recordIntentionOutcome(date, outcome);
  };

  const handleAddPlan = async (addictionId: string, plan: Omit<CopingPlan, 'id'>) => {
    await capacitorService.vibrate();
    addCopingPlan(addictionId, plan);
    setNotice({ text: t('planAddedToast'), tone: 'urge' });
  };

  const handleSaveReview = async (
    review: ReviewInput,
    plan?: { addictionId: string; plan: Omit<CopingPlan, 'id'> }
  ) => {
    await capacitorService.vibrate();
    saveReview(review);
    if (plan) {
      addCopingPlan(plan.addictionId, plan.plan);
    }
    setIsReviewOpen(false);
    setActiveTab('home');
    setNotice({ text: t('weeklyFocusSaved'), tone: 'urge' });
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
      case 'review':
        setIsReviewOpen(true);
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
                  todaysIntention={todaysIntention}
                  pendingIntention={pendingIntention}
                  latestReview={latestReview}
                  riskNudges={riskNudges}
                  journalSignal={journalSignal}
                  onRecordCheckIn={handleRecordCheckIn}
                  onSetIntention={handleSetIntention}
                  onIntentionOutcome={handleIntentionOutcome}
                  onStartReview={() => setIsReviewOpen(true)}
                  onOpenPlan={handleOpenPlan}
                  onOpenPanic={addiction => handleOpenPanic(addiction)}
                  onOpenBreathing={() => setIsBreathingOpen(true)}
                  onAdd={openAddDialog}
                  onReset={handleReset}
                />
              ) : (
                <EmptyState onAdd={openAddDialog} />
              )
            )}

            {activeTab === 'trackers' && (
              addictions.length > 0 ? (
                <TrackersScreen
                  addictions={addictions}
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
              addictions.length > 0 ? (
                <TrendCharts addictions={addictions} checkIns={checkIns} onAddPlan={handleAddPlan} />
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

      {isReviewOpen && (
        <WeeklyReviewSheet
          addictions={addictions}
          focusAddictionId={focusAddiction?.id}
          checkIns={checkIns}
          intentions={intentions}
          latestReview={latestReview}
          onSave={handleSaveReview}
          onClose={() => setIsReviewOpen(false)}
        />
      )}

      {panicAddiction && (
        <PanicScreen
          // Keyed by the plan too, so opening from a nudge while the screen is
          // already up starts it over with that plan first.
          key={`${panicAddiction.id}:${panicPlanId ?? ''}`}
          addiction={panicAddiction}
          emergencyContactName={emergencyContact?.name}
          emergencyContactPhone={emergencyContact?.phone}
          initialPlanId={panicPlanId}
          onResisted={payload => handlePanicOutcome('resisted', payload)}
          onRelapsed={payload => handlePanicOutcome('relapsed', payload)}
          onClose={closePanic}
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
