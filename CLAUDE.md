# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Native iOS app (ios/)

`ios/` holds the native SideStore app (Swift/SwiftUI, XcodeGen, no .xcodeproj in git, iOS 17+, bundle `dk.thyxo.pengetrick`), built like the owner's other apps (Mosaik, Number Reader):

- `ios/PengeTrick/Model/` is pure Swift (Foundation only): settings, physics (exit edge, flick/tilt glide, shake detector), routine. Tested by `ios/Tests/main.swift`, which CI runs before building: `swiftc ios/PengeTrick/Model/*.swift ios/Tests/main.swift -o /tmp/t && /tmp/t`.
- `ios/PengeTrick/App/` (AppState, CoreMotion, images incl. status-bar scrub and Vision cut-out) and `ios/PengeTrick/Views/` (stage, secret panel: 5 quick taps top-right, hold = re-arm).
- Note images are copied from `assets/` into `ios/PengeTrick/Resources/Notes/` (folder resource). Icon: `python3 scripts/make-icon.py`.
- CI `.github/workflows/ios.yml` (push to `main` under `ios/**`): unsigned IPA → GitHub Release → commits `sidestore/apps.json`. Pull `main` before pushing. Bump `MARKETING_VERSION` in `ios/project.yml` for bigger changes.

## What this is

Penge Trick is a Danish-language mobile PWA implementing a magic trick: the app displays a photo of the user's own home screen while a folded banknote/coin image can be dragged out from the edge of the display, creating the illusion that a real note is emerging from the phone. It's a static site (no build step, no framework, no package.json) — vanilla HTML/CSS/JS, deployed to Vercel at penge-trick.vercel.app.

## Commands

There is no build/lint/test tooling in this repo. To run locally:

```bash
node dev-server.js
```

Serves the static files at `http://127.0.0.1:4173/` (port overridable via `PORT` env var). It's a minimal `http` server with no-cache headers, no bundling — edits to `app.js`/`styles.css`/`index.html` are reflected on refresh.

## Architecture

Everything lives in three files at the repo root, loaded directly by `index.html` with no bundler:

- **`index.html`** — all DOM markup: the stage, the hidden setup panel (with "Valør"/single and "Rutine"/routine tabs), floating controls, and the draggable note image.
- **`styles.css`** — all styling.
- **`app.js`** — a single IIFE containing all logic (~1400 lines). No modules, no classes — plain functions closing over a module-level `state` object and cached DOM element references declared at the top of the file.

### State model

`state` (app.js:85) is the single source of truth, persisted to `localStorage` under key `penge-trick:v1` (`loadState`/`saveState`). Key fields:
- `bg` — data URL of the user's home-screen screenshot background.
- `denom` — current banknote/coin denomination key (e.g. `"100"`, `"eur20Small"`), looked up in `noteImages`/`noteColors`/`denominationLabels` maps near the top of app.js.
- `edge`, `size`, `rotation`, `sensitivity`, `x`/`y` — note placement/appearance and the edge it disappears toward when dragged past a threshold.
- `bgX`/`bgY`/`bgScale` — background image offset/zoom, to align the fake home screen with the real one.
- `hidden`/`awaitingReveal`/`shakeReveal`/`shakeStrength` — "shake-to-reveal" mode: the note starts hidden and a device-motion shake gesture (via `devicemotion`/`deviceorientation` listeners) reveals it.
- `routineQueue`/`routineIndex`/`routineActive`/`routineComplete`/`routineShakeNext` — "routine" mode: a queued sequence of denominations shown one after another (optionally gated by a shake between each), for doing the trick multiple times in a row without reopening settings.
- `activeTab` — which setup tab (single denomination vs. routine builder) is shown.

`applyState()` re-renders all visual/DOM effects from `state` after any mutation; UI event handlers mutate `state` then call `applyState()` + `saveState()`.

### Interaction/physics

Dragging the note is handled via pointer events (`pointerdown`/`pointermove`/`pointerup`) with velocity tracking for a bounce/inertia effect at drop time (`endDrag`, `bounceTiltAtEdges`, `updateTiltPhysics` run in a `requestAnimationFrame` loop). Tilt mode reads `deviceorientation` to let the phone's physical tilt drive the note's position, requiring the iOS motion-permission prompt (`toggleTilt`/`calibrateTilt`). Shake detection (`handleDeviceMotion`/`handleShakeOrientation`/`recordShakeHit`) analyzes acceleration/orientation deltas against `shakeStrength` to trigger `triggerShakeReveal()`.

### PWA/offline

`service-worker.js` does a cache-first-fallback (network-first, falls back to cache) strategy over a fixed asset list, with cache name `penge-trick-vNN` — **bump this version string whenever cached assets (index.html/styles.css/app.js/manifest/icons/assets) change**, otherwise installed users may keep stale cached files. `manifest.webmanifest` configures fullscreen, portrait-locked, installable PWA behavior (used for the "Add to Home Screen" flow documented in README.md).

### Assets

Note/coin images live in `assets/*.png`, one per denomination key used in `noteImages`. `icons/icon.svg` is the PWA icon.
