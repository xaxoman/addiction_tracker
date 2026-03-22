# Break Free - Addiction Tracker

A Progressive Web App (PWA) and Capacitor mobile app to track addictions, visualize progress, and stay consistent.

## Features

- Addiction tracking with progress stats
- PWA support (installable + offline)
- Android support via Capacitor
- Dark and light theme
- Data export (CSV/TSV)
- JSON backup/import flow with last-backup info

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Capacitor (Android)
- Workbox (PWA)

## Prerequisites

- Node.js 18+ (Node 22 is supported)
- npm
- Android Studio + Android SDK (for APK builds)
- Java 17 (required by recent Android Gradle plugins)

## Setup

```bash
git clone <repository-url>
cd addiction_tracker
npm install
```

## Run PWA Locally (Debug)

Start dev server:

```bash
npm run dev
```

Open:

- `http://localhost:5173`

Build and preview production PWA locally:

```bash
npm run build
npm run preview
```

## Android Workflow

### Fast Local Mobile Debug (Live Reload)

```bash
npm run dev:mobile
```

This pushes the app to a connected Android device/emulator with live reload.

### One-Command APK Build

Use the unified APK script:

```bash
npm run build:apk
```

This automatically runs:

1. `npm run build`
2. `npx cap sync android`
3. `android/gradlew(.bat) assembleDebug`

APK output:

- `android/app/build/outputs/apk/debug/app-debug.apk`

Optional dry run (prints the pipeline without executing):

```bash
npm run build:apk -- --dry-run
```

### Open Android Studio Project

```bash
npm run build:android
```

This builds web assets, syncs Capacitor, and opens Android Studio.

## Available Scripts

- `npm run dev`: Start Vite dev server
- `npm run build`: Production web build
- `npm run preview`: Preview production build
- `npm run build:pwa`: Build + Capacitor sync
- `npm run dev:mobile`: Run Android with live reload
- `npm run build:apk`: Build debug APK in one command
- `npm run build:android`: Build + sync + open Android Studio
- `npm run lint`: Run ESLint

## Troubleshooting

- If `vite` is not recognized: run `npm install`.
- If Android build fails: verify Java 17 and Android SDK setup.
- If Vercel fails with Rollup native module errors: ensure lockfile is up to date and redeploy from latest `main`.

## License

MIT. See `LICENSE`.
