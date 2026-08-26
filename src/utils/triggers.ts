import { TriggerTag } from '../types';

// Trigger labels live in the i18n dictionary under a `trigger_` prefix, so a
// new tag only needs one entry per language.
export const triggerLabelKey = (tag: TriggerTag): string => `trigger_${tag}`;
