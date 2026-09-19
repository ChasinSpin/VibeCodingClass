# Still — Seizure journal

A responsive, standalone seizure tracker built with HTML, CSS, and JavaScript.

## Run

From this directory, run `python3 -m http.server 5173 --bind 127.0.0.1` and open http://127.0.0.1:5173.

## Features

- Record directly from the main page. The current time is captured when you first interact with the form, or you can enter an earlier event manually.
- Less, Typical, More, and Alarming severity classifications.
- Location and notes, editable history, search, and classification filters.
- Save & Close saves the record before asking the browser to close the tab. If closing is blocked, a persistent confirmation lets you safely close it manually. Sample preview entries stay in preview and do not close the app.
- Latest event, rolling 30-day count and weekly average, and 7/30/90-day daily charts.
- CSV export and an explicitly labeled sample preview kept separate from personal records.

Records are stored in IndexedDB for the browser and origin used to open the app. There is no account or cloud synchronization. Clearing browser data removes records; use CSV export to keep a copy.

## PWA and storage

Open the app once online, then use **Install app** (or your browser's install menu). iPhone/iPad: Safari → Share → Add to Home Screen. The browser determines whether installation is available. The app shell is cached for offline launches and all record operations work offline.

IndexedDB replaces localStorage for records. The first successful launch imports the old journal from the same origin in one atomic transaction, with a migration marker preventing repeated imports. The old localStorage copy is left intact as a migration backup; it is not updated afterward. Each save/delete writes only the affected record and waits for the transaction to commit. Save & Close waits for this commit too.

**Protect saved records** requests persistent storage. The app shows the browser's estimated usage and quota. Persistence and quota are browser-controlled, not guaranteed by PWA installation. Clearing site/app data can still remove the journal; CSV exports remain important. There is no cloud backup or cross-device sync. A different domain, port, or browser has a separate journal. Export before moving to another origin.

Production installation requires an HTTPS host. The local preview at `127.0.0.1` works on this computer only; it is not a phone-accessible deployment. All app assets are local; there are no external font dependencies.

To release updates, change the cache version in `sw.js`. Updates activate after existing app windows close, preserving unsaved forms. Personal records are stored separately from the offline asset cache.

## Verification

Open `/tests/storage.html` on the local server and choose **Run checks**. It tests real IndexedDB migration, commit/readback, concurrent connections, deletion, migration rollback/retry, and failed writes using disposable databases. It does not access the personal journal.
