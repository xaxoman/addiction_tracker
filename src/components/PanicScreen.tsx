import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, Phone, ShieldCheck, Sparkles } from 'lucide-react';
import { Addiction, CopingPlan, NeedTag, TriggerTag } from '../types';
import { useI18n } from '../i18n/useI18n';
import { formatClock, getDaysSince, getSavedLabel } from '../utils/format';
import TriggerTagPicker, { NeedTagPicker } from './TriggerTagPicker';
import { NextTimePlanField, PlanUsedPicker } from './PlanFields';
import Disclosure from './Disclosure';
import { getBreathState } from '../utils/breathing';
import { getCleanDays } from '../utils/streaks';
import { buildCueFromTriggers, formatPlanStats, getPlanCueText, rankPlans } from '../utils/plans';
import { getTriggerOrder } from '../utils/triggers';

// Cravings rise and fall; ten minutes is long enough for the peak to pass and
// short enough that somebody mid-craving will agree to it.
const SESSION_SECONDS = 10 * 60;

// Chips shown before "more": enough for the user's usual triggers, few enough
// to take in mid-craving.
const COLLAPSED_TRIGGERS = 5;

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
  const [showOtherPlans, setShowOtherPlans] = useState(false);
  const [note, setNote] = useState('');
  const [precededBy, setPrecededBy] = useState('');
  const [location, setLocation] = useState('');
  const [nextTime, setNextTime] = useState('');
  const [saveAsPlan, setSaveAsPlan] = useState(true);
  // The relapse form's required fields are only flagged after the first
  // attempt to save it.
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
  const triggerOrder = useMemo(() => getTriggerOrder(addiction), [addiction]);

  // Re-ranked on every tap of "what's going on", so the plan made for this
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
  // blocking a win behind a form is how a win goes unlogged.
  const relapseErrors = {
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

  const fieldClass = (hasError: boolean, extra = ''): string => `
    w-full rounded-xl bg-white/10 border px-3 py-2 text-white placeholder:text-white/40
    focus:ring-2 ${extra} ${
      showRelapseErrors && hasError
        ? 'border-rose-300 focus:ring-rose-300 focus:border-rose-300'
        : 'border-white/20 focus:ring-brand-300 focus:border-brand-300'
    }`;

  const intensityPicker = (
    <div>
      <label className="block text-sm font-medium text-white/80 mb-2">{t('howStrongWasIt')}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(level => (
          <button
            key={level}
            type="button"
            onClick={() => setIntensity(intensity === level ? undefined : level)}
            aria-pressed={intensity === level}
            className={`flex-1 py-2.5 rounded-xl text-base font-semibold border transition-colors ${
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
    </div>
  );

  const triggerPicker = (label: string, error?: string) => (
    <TriggerTagPicker
      value={triggers}
      onChange={setTriggers}
      variant="onDark"
      size="sm"
      label={label}
      order={triggerOrder}
      collapsedCount={COLLAPSED_TRIGGERS}
      error={error}
    />
  );

  return (
    <div
      className="fixed inset-0 z-[200] overflow-y-auto bg-gradient-to-br from-forest-500 via-forest-700 to-forest-900 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={t('panicTitle')}
    >
      <div
        className="min-h-full max-w-md mx-auto flex flex-col px-5"
        style={{
          paddingTop: 'calc(var(--safe-area-inset-top) + 1rem)',
          paddingBottom: 'calc(var(--safe-area-inset-bottom) + 2rem)'
        }}
      >
        <div className="flex items-center justify-between mb-2">
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
          <div className="flex-1 flex flex-col gap-5">
            <div className="text-center">
              <h1 className="text-2xl font-semibold">{t('panicTitle')}</h1>
              <p className="mt-1 text-sm text-white/60">
                {remaining > 0 ? t('panicSubtitle') : t('panicTimeUp')}
              </p>
            </div>

            <div className="relative mx-auto w-44 h-44 flex items-center justify-center">
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
                className="absolute w-32 h-32 rounded-full bg-brand-400/25 border border-brand-200/30"
                // The pacer transitions between sampled scales rather than
                // animating in CSS, so the phase label and the circle can never
                // fall out of step.
                style={{ transform: `scale(${breath.scale})`, transition: 'transform 250ms linear' }}
              />
              <div className="relative text-center">
                <div className="text-3xl font-bold tabular-nums">{formatClock(remaining)}</div>
                <div className="mt-0.5 text-sm text-white/70">{t(breath.key)}</div>
              </div>
            </div>

            {triggerPicker(t('whatsHappening'))}

            <div className="rounded-2xl bg-white/10 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/50 mb-2">
                <ShieldCheck size={14} />
                {topPlan && topPlan.matches > 0 ? t('planForThisMoment') : t('yourPlan')}
              </div>
              {!topPlan ? (
                <p className="text-sm text-white/60">{t('noCopingPlans')}</p>
              ) : (
                <>
                  <p className="text-lg leading-snug">
                    <span className="text-white/60">{t('copingPlanCue')} </span>
                    <span className="font-medium">{getPlanCueText(topPlan.plan, t)}</span>
                    <span className="text-white/60"> {t('copingPlanAction')} </span>
                    <span className="font-semibold">{topPlan.plan.action}</span>
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
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
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setShowOtherPlans(open => !open)}
                        aria-expanded={showOtherPlans}
                        className="text-sm text-white/70 hover:text-white"
                      >
                        {showOtherPlans ? t('hideOtherPlans') : t('otherPlansCount', { count: otherPlans.length })}
                      </button>
                      {showOtherPlans && (
                        <ul className="mt-2 space-y-1">
                          {otherPlans.map(({ plan }) => (
                            <li key={plan.id}>
                              <button
                                type="button"
                                onClick={() => setUsedPlanId(usedPlanId === plan.id ? undefined : plan.id)}
                                aria-pressed={usedPlanId === plan.id}
                                className={`w-full text-left rounded-xl px-3 py-2 text-sm transition-colors ${
                                  usedPlanId === plan.id ? 'bg-white/20' : 'hover:bg-white/10'
                                }`}
                              >
                                <span className="text-white/60">{getPlanCueText(plan, t)} → </span>
                                <span className="font-medium">{plan.action}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {addiction.note && (
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/50 mb-1.5">
                  <Sparkles size={14} />
                  {t('yourReasons')}
                </div>
                <p className="text-base leading-relaxed whitespace-pre-wrap break-words">{addiction.note}</p>
              </div>
            )}

            <p className="text-center text-sm text-white/70">
              {t('builtLine', {
                days: streakDays,
                clean: cleanDays.clean,
                total: cleanDays.total,
                saved: getSavedLabel(addiction)
              })}
            </p>

            {emergencyContactPhone && (
              <a
                href={`tel:${emergencyContactPhone}`}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10
                         px-4 py-3.5 text-base font-semibold hover:bg-white/20 transition-colors"
              >
                <Phone size={18} />
                {t('panicCallContact', { name: emergencyContactName || emergencyContactPhone })}
              </a>
            )}

            {/* The two ways out stay on screen while the rest scrolls. */}
            <div className="sticky bottom-0 mt-auto -mx-5 px-5 pt-6 pb-3 space-y-2 bg-gradient-to-t from-forest-900 via-forest-900/95 to-transparent">
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
                className="w-full rounded-2xl px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/10 transition-colors"
              >
                {t('panicUsed')}
              </button>
            </div>
          </div>
        )}

        {step === 'resisted' && (
          <div className="flex-1 flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-semibold">{t('panicResisted')}</h2>
              <p className="mt-1 text-sm text-white/60">{t('heldFor', { duration: formatClock(elapsed) })}</p>
            </div>

            <PlanUsedPicker plans={plans} value={usedPlanId} onChange={setUsedPlanId} variant="onDark" />

            <NeedTagPicker value={needs} onChange={setNeeds} variant="onDark" hint="" />

            {triggerPicker(t('whatSetItOff'))}

            <Disclosure variant="onDark">
              {intensityPicker}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">{t('noteLabel')}</label>
                <textarea
                  value={note}
                  onChange={event => setNote(event.target.value)}
                  placeholder={t('urgeNotePlaceholder')}
                  className={fieldClass(false, 'resize-none h-20')}
                />
              </div>
            </Disclosure>

            <div className="mt-auto pt-2">
              <button
                type="button"
                onClick={() => onResisted(buildPayload())}
                className="w-full rounded-2xl bg-white px-4 py-4 text-lg font-semibold text-forest-700 hover:bg-brand-50 transition-colors"
              >
                {t('save')}
              </button>
            </div>
          </div>
        )}

        {step === 'relapsed' && (
          <div className="flex-1 flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-semibold">{t('recordRelapse')}</h2>
              <p className="mt-1 text-sm text-white/70">{t('relapseKindIntro')}</p>
            </div>

            {triggerPicker(
              t('whatSetItOff'),
              showRelapseErrors && relapseErrors.triggers ? t('triggersRequired') : undefined
            )}

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">{t('whatPrecededIt')}</label>
              <textarea
                value={precededBy}
                onChange={event => setPrecededBy(event.target.value)}
                placeholder={t('precededByPlaceholder')}
                aria-invalid={showRelapseErrors && relapseErrors.precededBy}
                className={fieldClass(relapseErrors.precededBy, 'resize-none h-16')}
              />
              {showRelapseErrors && relapseErrors.precededBy && (
                <p className="mt-1 text-xs font-medium text-rose-200">{t('fieldRequired')}</p>
              )}
            </div>

            <NeedTagPicker value={needs} onChange={setNeeds} variant="onDark" hint="" />

            <NextTimePlanField
              value={nextTime}
              onChange={setNextTime}
              saveAsPlan={saveAsPlan}
              onSaveAsPlanChange={setSaveAsPlan}
              triggers={triggers}
              variant="onDark"
              error={showRelapseErrors && relapseErrors.nextTime ? t('fieldRequired') : undefined}
            />

            <Disclosure variant="onDark">
              {intensityPicker}
              <PlanUsedPicker plans={plans} value={usedPlanId} onChange={setUsedPlanId} variant="onDark" />
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">{t('whereDidItHappen')}</label>
                <input
                  type="text"
                  value={location}
                  onChange={event => setLocation(event.target.value)}
                  placeholder={t('locationPlaceholder')}
                  className={fieldClass(false)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">{t('whatHappened')}</label>
                <textarea
                  value={note}
                  onChange={event => setNote(event.target.value)}
                  placeholder={t('relapsePrompt')}
                  className={fieldClass(false, 'resize-none h-20')}
                />
              </div>
            </Disclosure>

            {showRelapseErrors && isRelapseIncomplete && (
              <p role="alert" className="text-sm font-medium text-rose-200">
                {t('relapseFieldsRequired')}
              </p>
            )}

            <div className="mt-auto pt-2 space-y-2">
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
                className="w-full rounded-2xl px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/10 transition-colors"
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
