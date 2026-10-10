import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, Phone, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { Addiction, CopingPlan, NeedTag, TriggerTag } from '../types';
import { useI18n } from '../i18n/useI18n';
import { formatClock, getDaysSince, getSavedLabel } from '../utils/format';
import { formatCountdown, getMilestoneState } from '../utils/milestones';
import TriggerTagPicker, { NeedTagPicker } from './TriggerTagPicker';
import { NextTimePlanField, PlanUsedPicker } from './PlanFields';
import { getBreathState } from '../utils/breathing';
import { getCleanDays } from '../utils/streaks';
import { buildCueFromTriggers, formatPlanStats, getPlanCueText, rankPlans } from '../utils/plans';

// Cravings rise and fall; ten minutes is long enough for the peak to pass and
// short enough that somebody mid-craving will agree to it.
const SESSION_SECONDS = 10 * 60;

export interface UrgeOutcomePayload {
  intensity?: number;
  triggers: TriggerTag[];
  needs?: NeedTag[];
  text?: string;
  planId?: string;
  precededBy?: string;
  location?: string;
  nextTime?: string;
  // Only on a relapse whose "next time" answer should become an if-then plan.
  plan?: Omit<CopingPlan, 'id'>;
  secondsHeld: number;
}

interface PanicScreenProps {
  addiction: Addiction;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  // Opened from a risk nudge: the plan the nudge named goes first.
  initialPlanId?: string;
  onResisted: (payload: UrgeOutcomePayload) => void;
  onRelapsed: (payload: UrgeOutcomePayload) => void;
  onClose: () => void;
}

type Step = 'ride' | 'resisted' | 'relapsed';

const PanicScreen: React.FC<PanicScreenProps> = ({
  addiction,
  emergencyContactName,
  emergencyContactPhone,
  initialPlanId,
  onResisted,
  onRelapsed,
  onClose
}) => {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>('ride');
  const [elapsed, setElapsed] = useState(0);
  const [intensity, setIntensity] = useState<number | undefined>(undefined);
  const [triggers, setTriggers] = useState<TriggerTag[]>([]);
  const [needs, setNeeds] = useState<NeedTag[]>([]);
  const [usedPlanId, setUsedPlanId] = useState<string | undefined>(undefined);
  const [note, setNote] = useState('');
  const [precededBy, setPrecededBy] = useState('');
  const [location, setLocation] = useState('');
  const [nextTime, setNextTime] = useState('');
  const [saveAsPlan, setSaveAsPlan] = useState(true);
  // The relapse debrief is fully required, but nothing is flagged until the
  // first attempt to save it.
  const [showRelapseErrors, setShowRelapseErrors] = useState(false);

  // Wall-clock based, so a backgrounded phone or a throttled tab still shows
  // the real time held rather than however many ticks the timer managed.
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    tick();
    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, []);

  // The craving screen is a takeover: nothing behind it should scroll while it
  // is open.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const remaining = Math.max(0, SESSION_SECONDS - elapsed);
  const breath = getBreathState(elapsed);
  const progress = Math.min(1, elapsed / SESSION_SECONDS);

  const streakDays = getDaysSince(addiction.lastEngaged);
  const cleanDays = getCleanDays(addiction);
  const savedLabel = getSavedLabel(addiction);
  const milestone = getMilestoneState(addiction.lastEngaged);

  // Re-ranked on every tap of "what's happening", so the plan made for this
  // situation rises to the top while the user is still choosing.
  const rankedPlans = useMemo(() => {
    const ranked = rankPlans(addiction, triggers);
    const pinned = ranked.findIndex(entry => entry.plan.id === initialPlanId);
    if (pinned > 0 && triggers.length === 0) {
      ranked.unshift(...ranked.splice(pinned, 1));
    }
    return ranked;
  }, [addiction, triggers, initialPlanId]);
  const [topPlan, ...otherPlans] = rankedPlans;
  const plans = rankedPlans.map(entry => entry.plan);

  const secondsHeld = () => Math.floor((Date.now() - startedAtRef.current) / 1000);

  const buildPayload = (): UrgeOutcomePayload => ({
    intensity,
    triggers,
    needs: needs.length > 0 ? needs : undefined,
    text: note.trim() || undefined,
    planId: usedPlanId,
    precededBy: precededBy.trim() || undefined,
    location: location.trim() || undefined,
    secondsHeld: secondsHeld()
  });

  // Only the relapse step is gated: the resisted exit stays one tap away, since
  // blocking a win behind a form is how a win goes unlogged. Where it happened
  // and the free-text account are optional; what happens next time is not.
  const relapseErrors = {
    intensity: intensity === undefined,
    triggers: triggers.length === 0,
    precededBy: precededBy.trim().length === 0,
    nextTime: nextTime.trim().length === 0
  };
  const isRelapseIncomplete = Object.values(relapseErrors).some(Boolean);

  const handleRelapseConfirm = () => {
    if (isRelapseIncomplete) {
      setShowRelapseErrors(true);
      return;
    }
    const action = nextTime.trim();
    onRelapsed({
      ...buildPayload(),
      nextTime: action,
      plan: saveAsPlan
        ? { cue: buildCueFromTriggers(triggers, t), action, triggers }
        : undefined
    });
  };

  const relapseFieldClass = (hasError: boolean, extra: string = ''): string => `
    w-full rounded-xl bg-white/10 border px-3 py-2 text-white placeholder:text-white/40
    focus:ring-2 ${extra} ${
      showRelapseErrors && hasError
        ? 'border-rose-300 focus:ring-rose-300 focus:border-rose-300'
        : 'border-white/20 focus:ring-rose-400 focus:border-rose-400'
    }`;

  const renderRelapseFieldError = (hasError: boolean) => (
    showRelapseErrors && hasError
      ? <p className="mt-1 text-xs font-medium text-rose-200">{t('fieldRequired')}</p>
      : null
  );

  const renderIntensityPicker = (required: boolean = false) => (
    <div>
      <label className="block text-sm font-medium text-white/80 mb-2">
        {t('howStrongWasIt')}
        {required && <span className="text-rose-300" aria-hidden="true"> *</span>}
      </label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(level => (
          <button
            key={level}
            type="button"
            onClick={() => setIntensity(intensity === level ? undefined : level)}
            aria-pressed={intensity === level}
            className={`flex-1 py-3 rounded-xl text-base font-semibold border transition-colors ${
              intensity === level
                ? 'bg-white text-sage-900 border-white'
                : 'bg-white/10 border-white/25 text-white/80 hover:bg-white/20'
            }`}
          >
            {level}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[0.7rem] text-white/50">
        <span>{t('intensityMild')}</span>
        <span>{t('intensityIntense')}</span>
      </div>
      {required && showRelapseErrors && relapseErrors.intensity && (
        <p className="mt-1 text-xs font-medium text-rose-200">{t('intensityRequired')}</p>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[200] overflow-y-auto bg-gradient-to-br from-forest-500 via-forest-700 to-forest-900 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={t('panicTitle')}
    >
      <div
        className="min-h-full flex flex-col px-5 pb-8"
        style={{
          paddingTop: 'calc(var(--safe-area-inset-top) + 1rem)',
          paddingBottom: 'calc(var(--safe-area-inset-bottom) + 2rem)'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={step === 'ride' ? onClose : () => setStep('ride')}
            className="flex items-center gap-1 -ml-2 px-2 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="text-sm font-medium">{t('panicBack')}</span>
          </button>
          <div className="flex items-center gap-2 text-sm font-medium text-white/70">
            <span className="text-lg">{addiction.icon}</span>
            <span className="truncate max-w-[10rem]">{addiction.name}</span>
          </div>
        </div>

        {step === 'ride' && (
          <div className="flex-1 flex flex-col gap-6">
            <div className="text-center">
              <h1 className="text-2xl font-semibold">{t('panicTitle')}</h1>
              <p className="mt-1 text-sm text-white/60">
                {remaining > 0 ? t('panicSubtitle') : t('panicTimeUp')}
              </p>
            </div>

            <TriggerTagPicker
              value={triggers}
              onChange={setTriggers}
              variant="onDark"
              size="sm"
              label={t('whatsHappening')}
            />

            <div className="rounded-2xl bg-white/10 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/50 mb-2">
                <ShieldCheck size={14} />
                {topPlan && topPlan.matches > 0 ? t('planForThisMoment') : t('yourPlan')}
              </div>
              {!topPlan ? (
                <p className="text-sm text-white/60">{t('noCopingPlans')}</p>
              ) : (
                <>
                  <p className="text-lg leading-relaxed">
                    <span className="text-white/60">{t('copingPlanCue')} </span>
                    <span className="font-medium">{getPlanCueText(topPlan.plan, t)}</span>
                    <span className="text-white/60"> {t('copingPlanAction')} </span>
                    <span className="font-semibold">{topPlan.plan.action}</span>
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-xs text-white/60">{formatPlanStats(topPlan.stats, t)}</span>
                    <button
                      type="button"
                      onClick={() => setUsedPlanId(usedPlanId === topPlan.plan.id ? undefined : topPlan.plan.id)}
                      aria-pressed={usedPlanId === topPlan.plan.id}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                        usedPlanId === topPlan.plan.id
                          ? 'bg-white text-forest-700'
                          : 'bg-white/15 text-white hover:bg-white/25'
                      }`}
                    >
                      {usedPlanId === topPlan.plan.id && <Check size={15} />}
                      {t('doingThisPlan')}
                    </button>
                  </div>

                  {otherPlans.length > 0 && (
                    <ul className="mt-3 pt-3 border-t border-white/10 space-y-2">
                      {otherPlans.slice(0, 3).map(({ plan, stats }) => (
                        <li key={plan.id}>
                          <button
                            type="button"
                            onClick={() => setUsedPlanId(usedPlanId === plan.id ? undefined : plan.id)}
                            aria-pressed={usedPlanId === plan.id}
                            className={`w-full text-left rounded-xl px-3 py-2 text-sm transition-colors ${
                              usedPlanId === plan.id ? 'bg-white/20' : 'hover:bg-white/10'
                            }`}
                          >
                            <span className="text-white/60">{t('copingPlanCue')} </span>
                            <span>{getPlanCueText(plan, t)}</span>
                            <span className="text-white/60"> {t('copingPlanAction')} </span>
                            <span className="font-medium">{plan.action}</span>
                            <span className="block text-xs text-white/50 mt-0.5">{formatPlanStats(stats, t)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            <div className="relative mx-auto w-56 h-56 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" className="text-white/10" strokeWidth="3" />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="currentColor"
                  className="text-brand-300"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 46}`}
                  strokeDashoffset={`${2 * Math.PI * 46 * (1 - progress)}`}
                />
              </svg>
              <div
                className="absolute w-40 h-40 rounded-full bg-brand-400/25 border border-brand-200/30"
                // The pacer transitions between sampled scales rather than
                // animating in CSS, so the phase label and the circle can never
                // fall out of step.
                style={{ transform: `scale(${breath.scale})`, transition: 'transform 250ms linear' }}
              />
              <div className="relative text-center">
                <div className="text-4xl font-bold tabular-nums">{formatClock(remaining)}</div>
                <div className="mt-1 text-sm text-white/70">{t(breath.key)}</div>
              </div>
            </div>

            <div>
              <h2 className="text-xs uppercase tracking-wide text-white/50 mb-2">{t('atStake')}</h2>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white/10 p-3">
                  <div className="text-[0.65rem] uppercase tracking-wide text-white/50 mb-1">{t('currentStreak')}</div>
                  <div className="text-2xl font-bold">
                    {streakDays}
                    <span className="ml-1 text-xs font-medium text-white/60">{t('days')}</span>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <div className="text-[0.65rem] uppercase tracking-wide text-white/50 mb-1">{t('cleanDaysShort')}</div>
                  <div className="text-2xl font-bold tabular-nums">
                    {cleanDays.clean}
                    <span className="text-xs font-medium text-white/60">/{cleanDays.total}</span>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <div className="text-[0.65rem] uppercase tracking-wide text-white/50 mb-1">{t('totalSaved')}</div>
                  <div className="text-xl font-bold break-words">{savedLabel}</div>
                </div>
              </div>
            </div>

            {milestone.next && milestone.msUntilNext !== undefined && (
              <div className="rounded-2xl bg-amber-400/15 border border-amber-300/25 p-4 flex items-center gap-3">
                <Target className="w-5 h-5 shrink-0 text-amber-300" />
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wide text-amber-200/70">{t('nextMilestone')}</div>
                  <div className="text-base font-semibold">
                    {milestone.next.emoji} {t(milestone.next.labelKey)}
                    <span className="ml-2 text-sm font-normal text-white/70">
                      {t('milestoneIn', { time: formatCountdown(milestone.msUntilNext) })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {addiction.note && (
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/50 mb-2">
                  <Sparkles size={14} />
                  {t('yourReasons')}
                </div>
                <p className="text-base leading-relaxed whitespace-pre-wrap break-words">{addiction.note}</p>
              </div>
            )}

            {emergencyContactPhone && (
              <a
                href={`tel:${emergencyContactPhone}`}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10
                         px-4 py-4 text-base font-semibold hover:bg-white/20 transition-colors"
              >
                <Phone size={18} />
                {t('panicCallContact', { name: emergencyContactName || emergencyContactPhone })}
              </a>
            )}

            <div className="mt-auto pt-2 space-y-3">
              <button
                type="button"
                onClick={() => setStep('resisted')}
                className="w-full rounded-2xl bg-white px-4 py-4 text-lg font-semibold text-forest-700
                         hover:bg-brand-50 transition-colors"
              >
                {t('panicResisted')}
              </button>
              <button
                type="button"
                onClick={() => setStep('relapsed')}
                className="w-full rounded-2xl border border-white/20 px-4 py-3 text-sm font-medium
                         text-white/70 hover:bg-white/10 transition-colors"
              >
                {t('panicUsed')}
              </button>
            </div>
          </div>
        )}

        {step === 'resisted' && (
          <div className="flex-1 flex flex-col gap-5">
            <div>
              <h2 className="text-2xl font-semibold">{t('panicResisted')}</h2>
              <p className="mt-1 text-sm text-white/60">
                {t('heldFor', { duration: formatClock(elapsed) })} · {t('panicNoteStep')}
              </p>
            </div>

            {renderIntensityPicker()}

            <TriggerTagPicker value={triggers} onChange={setTriggers} variant="onDark" hint={t('triggersHint')} />

            <NeedTagPicker value={needs} onChange={setNeeds} variant="onDark" />

            <PlanUsedPicker plans={plans} value={usedPlanId} onChange={setUsedPlanId} variant="onDark" />

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">{t('noteOptional')}</label>
              <textarea
                value={note}
                onChange={event => setNote(event.target.value)}
                placeholder={t('urgeNotePlaceholder')}
                className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-white
                         placeholder:text-white/40 focus:ring-2 focus:ring-brand-400 focus:border-brand-400
                         resize-none h-24"
              />
            </div>

            <div className="mt-auto pt-2 space-y-3">
              <button
                type="button"
                onClick={() => onResisted(buildPayload())}
                className="w-full rounded-2xl bg-white px-4 py-4 text-lg font-semibold text-forest-700 hover:bg-brand-50 transition-colors"
              >
                {t('save')}
              </button>
              <button
                type="button"
                // Triggers and the plan were tapped on purpose during the craving,
                // so skipping the form keeps them and drops only the rest.
                onClick={() => onResisted({ triggers, planId: usedPlanId, secondsHeld: secondsHeld() })}
                className="w-full rounded-2xl border border-white/20 px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/10 transition-colors"
              >
                {t('skipAndSave')}
              </button>
            </div>
          </div>
        )}

        {step === 'relapsed' && (
          <div className="flex-1 flex flex-col gap-5">
            <div>
              <h2 className="text-2xl font-semibold">{t('recordRelapse')}</h2>
              <p className="mt-1 text-sm text-white/70">{t('relapseKindIntro')}</p>
            </div>

            {renderIntensityPicker(true)}

            <TriggerTagPicker
              value={triggers}
              onChange={setTriggers}
              variant="onDark"
              label={`${t('triggers')} *`}
              hint={t('triggersHint')}
              error={showRelapseErrors && relapseErrors.triggers ? t('triggersRequired') : undefined}
            />

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">
                {t('whatPrecededIt')}<span className="text-rose-300" aria-hidden="true"> *</span>
              </label>
              <textarea
                required
                value={precededBy}
                onChange={event => setPrecededBy(event.target.value)}
                placeholder={t('precededByPlaceholder')}
                aria-invalid={showRelapseErrors && relapseErrors.precededBy}
                className={relapseFieldClass(relapseErrors.precededBy, 'resize-none h-20')}
              />
              {renderRelapseFieldError(relapseErrors.precededBy)}
            </div>

            <NeedTagPicker value={needs} onChange={setNeeds} variant="onDark" />

            <PlanUsedPicker plans={plans} value={usedPlanId} onChange={setUsedPlanId} variant="onDark" />

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">
                {t('whereDidItHappen')} <span className="text-white/50 font-normal">{t('optionalSuffix')}</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={event => setLocation(event.target.value)}
                placeholder={t('locationPlaceholder')}
                className={relapseFieldClass(false)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">
                {t('whatHappened')} <span className="text-white/50 font-normal">{t('optionalSuffix')}</span>
              </label>
              <textarea
                value={note}
                onChange={event => setNote(event.target.value)}
                placeholder={t('relapsePrompt')}
                className={relapseFieldClass(false, 'resize-none h-20')}
              />
            </div>

            <NextTimePlanField
              value={nextTime}
              onChange={setNextTime}
              saveAsPlan={saveAsPlan}
              onSaveAsPlanChange={setSaveAsPlan}
              triggers={triggers}
              variant="onDark"
              error={showRelapseErrors && relapseErrors.nextTime ? t('fieldRequired') : undefined}
            />

            {showRelapseErrors && isRelapseIncomplete && (
              <p role="alert" className="text-sm font-medium text-rose-200">
                {t('relapseFieldsRequired')}
              </p>
            )}

            <div className="mt-auto pt-2 space-y-3">
              <button
                type="button"
                onClick={handleRelapseConfirm}
                className="w-full rounded-2xl bg-rose-500 px-4 py-4 text-lg font-semibold hover:bg-rose-400 transition-colors"
              >
                {t('saveAndRestart')}
              </button>
              <button
                type="button"
                onClick={() => setStep('ride')}
                className="w-full rounded-2xl border border-white/20 px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/10 transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PanicScreen;
