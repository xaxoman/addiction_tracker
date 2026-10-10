import { Addiction, CopingPlan, NeedTag, RelapseEntry, TriggerTag, UrgeEntry } from '../types';
import { createCopingPlanId, createRelapseId, createUrgeId } from './dataValidation';

// Pure transforms over a single tracker. The context only wires these into
// setState, which keeps the rules about how urges, relapses and the streak
// anchor relate to each other in one place.

// Everything the relapse dialog (and the panic screen's "I used" exit) can
// record beyond the timestamp itself.
export interface RelapseDetails {
  text?: string;
  precededBy?: string;
  location?: string;
  triggers?: TriggerTag[];
  needs?: NeedTag[];
  nextTime?: string;
  // When set, the "next time" answer is also saved as an if-then plan, tied to
  // the triggers of this slip, in the same update as the relapse itself.
  plan?: Omit<CopingPlan, 'id'>;
}

export interface UrgeInput {
  date?: Date;
  outcome: 'resisted' | 'relapsed';
  intensity?: number;
  triggers?: TriggerTag[];
  needs?: NeedTag[];
  text?: string;
  planId?: string;
  secondsHeld?: number;
  source?: 'panic' | 'manual';
  // Only read when `outcome` is 'relapsed': the paired relapse entry is written
  // in the same update so the two can never drift apart.
  relapse?: RelapseDetails;
}

// Appends a relapse and moves the streak anchor to it. `previousLastEngaged`
// remembers the anchor it replaced so the entry can be undone later.
export const appendRelapse = (
  addiction: Addiction,
  date: Date,
  details?: RelapseDetails,
  extra: Partial<RelapseEntry> = {}
): { addiction: Addiction; relapse: RelapseEntry } => {
  const plan: CopingPlan | undefined = details?.plan
    ? { id: createCopingPlanId(), ...details.plan }
    : undefined;

  const relapse: RelapseEntry = {
    id: createRelapseId(),
    date,
    text: details?.text,
    precededBy: details?.precededBy,
    location: details?.location,
    triggers: details?.triggers,
    needs: details?.needs,
    nextTime: details?.nextTime,
    planCreatedId: plan?.id,
    previousLastEngaged: new Date(addiction.lastEngaged),
    ...extra
  };

  return {
    addiction: {
      ...addiction,
      lastEngaged: date,
      notes: [...(addiction.notes ?? []), relapse],
      copingPlans: plan ? [...(addiction.copingPlans ?? []), plan] : addiction.copingPlans
    },
    relapse
  };
};

// Removes a relapse and restores the streak anchor it replaced. Only the most
// recently logged relapse drives the current streak, so removing an older entry
// leaves `lastEngaged` untouched. When it is the latest one, restore the anchor
// it replaced (falling back to the previous entry, then to the tracker's
// creation date for data written before anchors were stored).
export const removeRelapse = (addiction: Addiction, relapseId: string): Addiction => {
  const notes = addiction.notes ?? [];
  const index = notes.findIndex(note => note.id === relapseId);
  if (index === -1) {
    return addiction;
  }

  const removed = notes[index];
  const remaining = notes.filter((_, noteIndex) => noteIndex !== index);

  const isMostRecent = index === notes.length - 1;
  const fallback = remaining.length > 0
    ? remaining[remaining.length - 1].date
    : addiction.createdAt;
  const restoredAnchor = removed.previousLastEngaged ?? fallback;

  return {
    ...addiction,
    notes: remaining,
    lastEngaged: isMostRecent ? new Date(restoredAnchor) : addiction.lastEngaged
  };
};

const removeUrgeEntry = (addiction: Addiction, urgeId: string): Addiction => ({
  ...addiction,
  urges: (addiction.urges ?? []).filter(urge => urge.id !== urgeId)
});

// Records a craving. A resisted urge is stored on its own; one that ended in a
// slip also writes the relapse (and moves the streak anchor) in the same
// update, with the two entries pointing at each other.
export const addUrge = (addiction: Addiction, input: UrgeInput): Addiction => {
  const date = input.date ?? new Date();
  const urge: UrgeEntry = {
    id: createUrgeId(),
    date,
    outcome: input.outcome,
    intensity: input.intensity,
    triggers: input.triggers,
    needs: input.needs,
    text: input.text,
    planId: input.planId,
    secondsHeld: input.secondsHeld,
    source: input.source ?? 'manual'
  };

  if (input.outcome !== 'relapsed') {
    return { ...addiction, urges: [...(addiction.urges ?? []), urge] };
  }

  const { addiction: withRelapse, relapse } = appendRelapse(
    addiction,
    date,
    // Fall back to the urge's own triggers/note so the slip carries the context
    // the user already gave on the panic screen.
    {
      ...input.relapse,
      text: input.relapse?.text ?? input.text,
      triggers: input.relapse?.triggers ?? input.triggers,
      needs: input.relapse?.needs ?? input.needs
    },
    { urgeId: urge.id }
  );

  return {
    ...withRelapse,
    urges: [...(withRelapse.urges ?? []), { ...urge, relapseId: relapse.id }]
  };
};

// A relapse logged from the panic screen and the urge that produced it were a
// single action for the user, so deleting either one removes the pair.
export const deleteRelapseEntry = (addiction: Addiction, relapseId: string): Addiction => {
  const linkedUrge = (addiction.urges ?? []).find(urge => urge.relapseId === relapseId);
  const withoutRelapse = removeRelapse(addiction, relapseId);
  return linkedUrge ? removeUrgeEntry(withoutRelapse, linkedUrge.id) : withoutRelapse;
};

export const deleteUrgeEntry = (addiction: Addiction, urgeId: string): Addiction => {
  const urge = (addiction.urges ?? []).find(entry => entry.id === urgeId);
  const withoutUrge = removeUrgeEntry(addiction, urgeId);
  return urge?.relapseId ? removeRelapse(withoutUrge, urge.relapseId) : withoutUrge;
};
