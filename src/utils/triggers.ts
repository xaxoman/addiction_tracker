import { Addiction, TRIGGER_TAGS, TriggerTag } from '../types';
import { getTopTriggers } from './urgeStats';

// Trigger labels live in the i18n dictionary under a `trigger_` prefix, so a
// new tag only needs one entry per language.
export const triggerLabelKey = (tag: TriggerTag): string => `trigger_${tag}`;

// The user's own triggers first, most frequent on top, then the rest of the
// vocabulary: a collapsed picker then shows the chips they actually use.
export const getTriggerOrder = (addiction: Addiction): TriggerTag[] => {
  const frequent = getTopTriggers(addiction, { limit: TRIGGER_TAGS.length }).map(entry => entry.tag);
  return [...frequent, ...TRIGGER_TAGS.filter(tag => !frequent.includes(tag))];
};
