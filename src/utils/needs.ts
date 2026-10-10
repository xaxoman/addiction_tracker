import { Addiction, NEED_TAGS, NeedTag, TriggerTag } from '../types';
import { getUrges } from './urgeStats';

// Labels live in the i18n dictionary, like the trigger tags: `need_<tag>` for
// chips, `needPhrase_<tag>` for use inside a sentence.
export const needLabelKey = (tag: NeedTag): string => `need_${tag}`;
export const needPhraseKey = (tag: NeedTag): string => `needPhrase_${tag}`;

// Healthier ways to meet the same need. Swapping the behaviour only sticks
// when the replacement gives the user what the habit was giving them.
const ALTERNATIVE_COUNT = 3;

export const getAlternativeKeys = (tag: NeedTag): string[] => (
  Array.from({ length: ALTERNATIVE_COUNT }, (_, index) => `alt_${tag}_${index + 1}`)
);

export interface NeedInsight {
  need: NeedTag;
  // Events tagged with this need, and events tagged with any need at all.
  count: number;
  total: number;
  // The trigger that shows up most often alongside this need, if any.
  trigger?: TriggerTag;
}

interface TaggedEvent {
  needs?: NeedTag[];
  triggers?: TriggerTag[];
  date: Date | string;
}

const collectTaggedEvents = (addictions: Addiction[], since?: Date): TaggedEvent[] => {
  const events: TaggedEvent[] = [];

  addictions.forEach(addiction => {
    // A relapsed urge carries the same tags as its relapse; count the pair once.
    getUrges(addiction).forEach(urge => {
      if (urge.outcome !== 'relapsed') events.push(urge);
    });
    (addiction.notes ?? []).forEach(note => events.push(note));
  });

  return events.filter(event => {
    if (!since) return true;
    const time = new Date(event.date).getTime();
    return !Number.isNaN(time) && time >= since.getTime();
  });
};

// "You usually look for relief, mostly when stressed." Null until at least two
// events carry a need, since one answer is not a habit.
export const getNeedInsight = (
  addictions: Addiction | Addiction[],
  { since }: { since?: Date } = {}
): NeedInsight | null => {
  const list = Array.isArray(addictions) ? addictions : [addictions];
  const events = collectTaggedEvents(list, since).filter(event => (event.needs ?? []).length > 0);

  if (events.length < 2) {
    return null;
  }

  const needCounts = new Map<NeedTag, number>();
  events.forEach(event => {
    (event.needs ?? []).forEach(need => needCounts.set(need, (needCounts.get(need) ?? 0) + 1));
  });

  // Ties go to the order of NEED_TAGS so the insight does not flicker.
  const need = [...NEED_TAGS]
    .filter(tag => needCounts.has(tag))
    .sort((a, b) => (needCounts.get(b) ?? 0) - (needCounts.get(a) ?? 0))[0];

  const triggerCounts = new Map<TriggerTag, number>();
  events
    .filter(event => (event.needs ?? []).includes(need))
    .forEach(event => {
      (event.triggers ?? []).forEach(tag => triggerCounts.set(tag, (triggerCounts.get(tag) ?? 0) + 1));
    });

  const trigger = Array.from(triggerCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    need,
    count: needCounts.get(need) ?? 0,
    total: events.length,
    trigger
  };
};
