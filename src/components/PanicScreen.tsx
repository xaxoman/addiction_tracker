import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Phone, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { Addiction, TriggerTag } from '../types';
import { useI18n } from '../i18n/useI18n';
import { formatClock, getDaysSince, getSavedLabel } from '../utils/format';
import { formatCountdown, getMilestoneState } from '../utils/milestones';
import TriggerTagPicker from './TriggerTagPicker';

// Cravings rise and fall; ten minutes is long enough for the peak to pass and
// short enough that somebody mid-craving will agree to it.
const SESSION_SECONDS = 10 * 60;

// 4-7-8 breathing. The pacer is driven off elapsed time rather than chained
// timeouts so it cannot drift over a ten-minute session.
const BREATH_PHASES = [
  { key: 'breatheIn', seconds: 4, from: 0.55, to: 1 },
  { key: 'breatheHold', seconds: 7, from: 1, to: 1 },
  { key: 'breatheOut', seconds: 8, from: 1, to: 0.55 }
] as const;

const BREATH_CYCLE_SECONDS = BREATH_PHASES.reduce((total, phase) => total + phase.seconds, 0);

const getBreathState = (elapsedSeconds: number): { key: string; scale: number } => {
  const intoCycle = elapsedSeconds % BREATH_CYCLE_SECONDS;

  let offset = 0;
  for (const phase of BREATH_PHASES) {
    if (intoCycle < offset + phase.seconds) {
      const progress = (intoCycle - offset) / phase.seconds;
      return { key: phase.key, scale: phase.from + (phase.to - phase.from) * progress };
    }
    offset += phase.seconds;
  }

  return { key: BREATH_PHASES[0].key, scale: BREATH_PHASES[0].from };
};

export interface UrgeOutcomePayload {
  intensity?: number;
  triggers: TriggerTag[];
  text?: string;
  precededBy?: string;
  secondsHeld: number;
}

interface PanicScreenProps {
  addiction: Addiction;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  onResisted: (payload: UrgeOutcomePayload) => void;
  onRelapsed: (payload: UrgeOutcomePayload) => void;
  onClose: () => void;
}

type Step = 'ride' | 'resisted' | 'relapsed';

const PanicScreen: React.FC<PanicScreenProps> = ({
  addiction,
  emergencyContactName,
  emergencyContactPhone,
  onResisted,
  onRelapsed,
  onClose
}) => {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>('ride');
  const [elapsed, setElapsed] = useState(0);
  const [intensity, setIntensity] = useState<number | undefined>(undefined);
  const [triggers, setTriggers] = useState<TriggerTag[]>([]);
  const [note, setNote] = useState('');
  const [precededBy, setPrecededBy] = useState('');

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
  const savedLabel = getSavedLabel(addiction);
  const milestone = getMilestoneState(addiction.lastEngaged);

  const plans = (addiction.copingPlans ?? []).filter(plan => plan.cue || plan.action);

  const buildPayload = (): UrgeOutcomePayload => ({
    intensity,
    triggers,
    text: note.trim() || undefined,
    precededBy: precededBy.trim() || undefined,
    secondsHeld: Math.floor((Date.now() - startedAtRef.current) / 1000)
  });

  const renderIntensityPicker = () => (
    <div>
      <label className="block text-sm font-medium text-white/80 mb-2">{t('howStrongWasIt')}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(level => (
          <button
            key={level}
            type="button"
            onClick={() => setIntensity(intensity === level ? undefined : level)}
            aria-pressed={intensity === level}
            className={`flex-1 py-3 rounded-xl text-base font-semibold border transition-colors ${
              intensity === level
                ? 'bg-white text-gray-900 border-white'
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

  return (
    <div
      className="fixed inset-0 z-[200] overflow-y-auto bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white"
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

            <div className="relative mx-auto w-56 h-56 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" className="text-white/10" strokeWidth="3" />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="currentColor"
                  className="text-emerald-400"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 46}`}
                  strokeDashoffset={`${2 * Math.PI * 46 * (1 - progress)}`}
                />
              </svg>
              <div
                className="absolute w-40 h-40 rounded-full bg-emerald-400/20 border border-emerald-300/30"
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
              <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="text-xs uppercase tracking-wide text-white/50 mb-1">{t('currentStreak')}</div>
                <div className="text-3xl font-bold">
                  {streakDays}
                  <span className="ml-1 text-sm font-medium text-white/60">{t('days')}</span>
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="text-xs uppercase tracking-wide text-white/50 mb-1">{t('totalSaved')}</div>
                <div className="text-3xl font-bold break-words">{savedLabel}</div>
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

            <div className="rounded-2xl bg-white/10 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/50 mb-2">
                <ShieldCheck size={14} />
                {t('yourPlan')}
              </div>
              {plans.length === 0 ? (
                <p className="text-sm text-white/60">{t('noCopingPlans')}</p>
              ) : (
                <ul className="space-y-2">
                  {plans.map(plan => (
                    <li key={plan.id} className="text-base leading-relaxed">
                      <span className="text-white/60">{t('copingPlanCue')} </span>
                      <span className="font-medium">{plan.cue}</span>
                      <span className="text-white/60"> {t('copingPlanAction')} </span>
                      <span className="font-medium">{plan.action}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

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
                className="w-full rounded-2xl bg-emerald-500 px-4 py-4 text-lg font-semibold
                         hover:bg-emerald-400 transition-colors"
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

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">{t('noteOptional')}</label>
              <textarea
                value={note}
                onChange={event => setNote(event.target.value)}
                placeholder={t('urgeNotePlaceholder')}
                className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-white
                         placeholder:text-white/40 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400
                         resize-none h-24"
              />
            </div>

            <div className="mt-auto pt-2 space-y-3">
              <button
                type="button"
                onClick={() => onResisted(buildPayload())}
                className="w-full rounded-2xl bg-emerald-500 px-4 py-4 text-lg font-semibold hover:bg-emerald-400 transition-colors"
              >
                {t('save')}
              </button>
              <button
                type="button"
                onClick={() => onResisted({ triggers: [], secondsHeld: Math.floor((Date.now() - startedAtRef.current) / 1000) })}
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
              <p className="mt-1 text-sm text-white/60">{t('panicNoteStep')}</p>
            </div>

            {renderIntensityPicker()}

            <TriggerTagPicker value={triggers} onChange={setTriggers} variant="onDark" hint={t('triggersHint')} />

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">{t('whatPrecededIt')}</label>
              <textarea
                value={precededBy}
                onChange={event => setPrecededBy(event.target.value)}
                placeholder={t('precededByPlaceholder')}
                className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-white
                         placeholder:text-white/40 focus:ring-2 focus:ring-rose-400 focus:border-rose-400
                         resize-none h-20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">{t('whatHappened')}</label>
              <textarea
                value={note}
                onChange={event => setNote(event.target.value)}
                placeholder={t('relapsePrompt')}
                className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-white
                         placeholder:text-white/40 focus:ring-2 focus:ring-rose-400 focus:border-rose-400
                         resize-none h-20"
              />
            </div>

            <div className="mt-auto pt-2 space-y-3">
              <button
                type="button"
                onClick={() => onRelapsed(buildPayload())}
                className="w-full rounded-2xl bg-rose-500 px-4 py-4 text-lg font-semibold hover:bg-rose-400 transition-colors"
              >
                {t('confirmReset')}
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
