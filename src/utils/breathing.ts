// 4-7-8 breathing. The pacer is driven off elapsed time rather than chained
// timeouts so it cannot drift over a long session, and both the craving screen
// and the standalone breathing tool read the same phase from it.
export const BREATH_PHASES = [
  { key: 'breatheIn', seconds: 4, from: 0.55, to: 1 },
  { key: 'breatheHold', seconds: 7, from: 1, to: 1 },
  { key: 'breatheOut', seconds: 8, from: 1, to: 0.55 }
] as const;

export const BREATH_CYCLE_SECONDS = BREATH_PHASES.reduce((total, phase) => total + phase.seconds, 0);

export interface BreathState {
  key: string;
  scale: number;
}

export const getBreathState = (elapsedSeconds: number): BreathState => {
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
