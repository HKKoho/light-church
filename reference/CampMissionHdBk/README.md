<div align="center">
<img width="1200" height="475" alt="2026 Indonesia Mission Trip" src="./Indonesia.jpg" />
</div>

# 訪宣靈修與詩歌 · Indonesia Mission Trip Companion

A field companion web app for the 2026 訪宣隊 (short-term mission team) trip to Indonesia (P城), 2026-07-27 – 2026-08-03. Built for team members to carry devotionals, hymns, and trip logistics on their phones during the trip.

**Live app:** https://indonesia-trip.vercel.app/

## Features

- **八日靈修材料 (Devotional)** — 8 days of devotional readings tied to the trip itinerary, with adjustable font size, per-day reflection questions, a personal journal that auto-saves to the browser, spoken (TTS) prayer readings, and one-click sync of the whole 8-day plan to Google Calendar.
- **訪宣詩歌本 (Hymnal)** — 29 hymns with search, language/category filters, bookmarking, adjustable lyric font size, click-to-highlight lines for leading worship, and audio playback for hymns that have a recording (e.g. Hymn #1, 耶和華是愛).
- **隨行靈修札記 (Journal)** — Personal reflection notes per devotional question, saved locally per device.
- **行程與須知 (Trip Info)** — Trip background, the full day-by-day timetable, and important on-the-ground notes (etiquette, customs declaration, itinerary highlights).
- **安靜氛圍音樂 (Ambient music)** — Optional looping background music for quiet devotional time.
- **Google Sign-In + Calendar sync** — Firebase Authentication (Google OAuth) lets a user push the 8-day devotional schedule to their Google Calendar.

## Tech Stack

- [Vite](https://vitejs.dev/) + [React 19](https://react.dev/) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Firebase Authentication](https://firebase.google.com/docs/auth) for Google sign-in and Calendar API access
- [lucide-react](https://lucide.dev/) icons

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```
   npm install
   ```
2. Run the app:
   ```
   npm run dev
   ```
3. Open http://localhost:3000

No environment variables are required for local development — the Firebase config used for Google sign-in/Calendar sync is checked into `firebase-applet-config.json`.

## Build

```
npm run build
```

Outputs a static production build to `dist/`, deployable as-is (see `vercel.json`).
