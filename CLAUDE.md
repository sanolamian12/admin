# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Frontend (run from repo root):
- `npm run dev` — Vite dev server with HMR
- `npm run build` — production build to `dist/`
- `npm run lint` — ESLint over `**/*.{js,jsx}`
- `npm run preview` — serve the built bundle locally

Cloud Functions (run from `functions/`):
- `npm run serve` — `firebase emulators:start --only functions`
- `npm run shell` — `firebase functions:shell` (also `npm start`)
- `npm run deploy` — `firebase deploy --only functions`
- `npm run logs` — tail deployed function logs

There are no tests in this repo.

## Environment

Firebase web config is read from Vite env vars in `src/firebase.js` (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`). They live in `.env.local` (gitignored).

Cloud Functions are pinned to region `australia-southeast1` (Sydney) via `setGlobalOptions` and the storage bucket is hardcoded to `stlc-church-app.appspot.com` in `functions/index.js`. Public thumbnail URLs are generated against `stlc-church-app.firebasestorage.app`.

## Architecture

This is the **admin web** for a church app (project "stlc-church-app"). React 19 + Vite + Tailwind v4 frontend backed entirely by Firebase (Auth, Firestore, Storage, Functions). The mobile/user-facing app is a separate codebase; this repo only ships the admin console + the shared Cloud Functions.

### Frontend layout

- `src/main.jsx` → `src/App.jsx` defines the entire route tree under `BrowserRouter`. `/` redirects to `/admin`, `/login` is public, everything under `/admin/*` is wrapped in `ProtectedRoute` and renders inside `AdminLayout` via `<Outlet />`.
- `src/ProtectedRoute.jsx` uses `react-firebase-hooks/auth` (`useAuthState`) and redirects to `/login` when no user. Login itself is plain `signInWithEmailAndPassword` and a hard `window.location.href = "/admin"` redirect.
- All admin features live in `src/pages/` as flat `*List` / `*Form` / `*Edit` / `*Detail` components per domain: **Notice**, **Weekly** (예배 게시물), **Calendar**, **Photo** (앨범), **NoticeComment**, **PhotoComment**, **Request** (신규 계정 요청). UI strings and code comments are predominantly Korean — preserve that when editing.
- Tailwind v4 is wired through `@tailwindcss/vite` in `vite.config.js` with `@import "tailwindcss"` in `src/index.css`. No design tokens or component library — pages style inline with utility classes.

### Firestore data model (authoritative comment in `src/AdminApp.jsx`)

Normalized into a parent collection + `*_views` log + `*_detail` payload pattern:

- `users` — `{ uid, name, email, role, photo_url, created_at, last_login, isActive }`. `role` is `admin` or `user`.
- `weekly` (1) ↔ `weekly_detail` (1) and ↔ `weekly_views` (N, keyed by `content_id`).
- `notice` (1) ↔ `notice_detail` (1) and ↔ `notice_views` (N).
- `photo` (1) ↔ `photo_detail` (N, one per image; `picture_id` `001` is the cover) and ↔ `photo_views` (N).
- `calendar` — flat per-user events; spec says no edit, only delete + re-create.
- `settings` — per-device push prefs (`uuid`, `pushEnabled`, `pushTime` as `"HH:mm"` device local). Daily reminders are now scheduled locally on-device via `flutter_local_notifications`; the server no longer reads or writes `fcmToken`. Legacy `fcmToken` values may remain in old docs and can be ignored.

Access intent (enforced in Firestore rules, not in this repo): admins have full CRUD across collections; users only CRUD their own `photo`/`notice`/`calendar` rows and read others.

### Cloud Functions (`functions/index.js`, all `australia-southeast1`)

- `generatePhotoThumbnail` — Storage `onObjectFinalized`. Triggered on every upload; ignores non-images and anything prefixed `thumb_`. Path convention is `{photoId}/images/{pictureId}.{ext}`; it writes a 300px-wide thumb to `{photoId}/thumbs/thumb_{name}`, builds the public URL against `stlc-church-app.firebasestorage.app`, and writes `thumb_url` back to `photo/{photoId}/photo_detail/{pictureId}`. If `pictureId === "001"`, also updates `photo/{photoId}.thumb_url` as the album cover.
- `syncWeeklyViews` / `syncPhotoViews` / `syncNoticeViews` — Firestore `onDocumentCreated` on the `*_views` collections; transactionally `+1`s the parent's `views` counter using `data.content_id` as the join key. This is how view counts are aggregated — never write `views` directly from the client.

The repo no longer ships server-side push: `sendDailyVerse`, `triggerDailyPushTest`, `cleanupOldPushLogs`, and the shared `executePushToTargets` were removed. Daily reminders are scheduled locally in the Flutter client. If old deployments of those functions still exist on GCP, delete them with `firebase functions:delete sendDailyVerse triggerDailyPushTest cleanupOldPushLogs --region=australia-southeast1`. The `push_logs/*` Firestore collection is no longer written and can be deleted at will.

### Things to know when editing

- The header in `App.jsx` ("Tailwind 연결 확인 🎨") and `AdminLayout.jsx` ("[DEBUG v3]") are dev scaffolding visible in the deployed UI — confirm before removing in case the user is still using them as visual signals.
- View counts must flow through `*_views` writes so the Cloud Function increments the parent. Don't bypass.
- Photo thumbnails are produced server-side; never set `thumb_url` from the client on upload — wait for the function. Cover thumb is whichever picture is named `001`.
