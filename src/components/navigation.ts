export type AppTab = 'home' | 'trends';

// Actions that live in the navigation next to the two real destinations: each
// one opens a surface the app already has (craving screen, daily check-in,
// breathing pacer, settings, account).
export type NavAction = 'urge' | 'journal' | 'breathing' | 'settings' | 'account';
