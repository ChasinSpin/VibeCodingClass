# Cosmic Tic-Tac-Toe

A static, installable PWA with computer and two-player modes. No build step.

## Run locally

Run `python3 -m http.server 8000` in this directory, then visit
`http://localhost:8000`. Service workers require HTTPS or localhost; opening
`index.html` directly does not enable installation or offline caching.

## Install and play offline

Serve this entire directory on an HTTPS static host. In a supporting browser,
use its install app option; on iPhone or iPad, use Safari's Share → Add to Home
Screen. After the first successful online visit finishes caching, the game
works offline. Google Fonts are optional; offline play uses system fallback
fonts if the browser has not cached the fonts.

Scores are kept only for the current session, as in the original game.

## Publish updates

Change the cache version in `sw.js` whenever an app file changes, and deploy
all files together. Serve `sw.js` with revalidation (`Cache-Control: no-cache`).
An updated service worker waits until all existing app tabs/windows close
before activating; reopen the app to use the new version.

## Check offline support

Visit once online and wait for the service worker to activate. In browser
developer tools, verify the manifest and service worker, switch the network
to offline, and reload. Check both game modes and New Round. Installation
availability depends on the browser and platform.
