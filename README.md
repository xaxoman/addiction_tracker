# Break Free - Addiction Tracker

A Progressive Web App (PWA) and Capacitor mobile app to track addictions, visualize progress, and stay consistent.

## Features

- Addiction tracking with progress stats
- PWA support (installable + offline)
- Android support via Capacitor
- Dark and light theme
- Data export (CSV/TSV)
- JSON backup/import flow with last-backup info
- Optional account (email + password) with automatic cloud backup to Neon Postgres

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Capacitor (Android)
- Workbox (PWA)
- Vercel serverless functions + Neon Postgres (login + cloud backup)

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

## Login + Cloud Backup (Neon)

The app works fully offline without an account. Signing in (Settings -> Account & Cloud Backup) enables automatic cloud backup: every data/settings change is pushed to Neon Postgres a few seconds later, and data can be restored from the cloud on any device.

### One-time setup

1. Create a free database at [neon.tech](https://neon.tech) and copy its connection string.
2. In the Vercel project settings, add these environment variables (see `.env.example`):
   - `DATABASE_URL`: the Neon connection string
   - `JWT_SECRET`: a long random string (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
3. Redeploy. The API creates its tables (`app_users`, `user_backups`) automatically on first use.

### How it works

- `api/auth.ts`: register/login with scrypt-hashed passwords, returns a signed token (30-day expiry)
- `api/backup.ts`: stores one backup JSON per user (upsert), fetched on restore
- Sign-in flow: if a cloud backup exists you choose to restore it or keep local data; while signed in, changes are auto-backed up (debounced)

### Local development with the API

`npm run dev` serves only the web app. To run the serverless functions locally use the Vercel CLI with a `.env` file (copy `.env.example`):

```bash
npx vercel dev
```

### Android builds

The native app needs to know where the API lives. Set `VITE_API_BASE_URL` to the deployed URL before building:

```bash
VITE_API_BASE_URL=https://your-app.vercel.app npm run build:apk
```

(On Windows PowerShell: `$env:VITE_API_BASE_URL = "https://your-app.vercel.app"; npm run build:apk`)

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
