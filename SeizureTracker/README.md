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

Records are stored in localStorage for the browser and origin used to open the app. There is no server, account, or cloud synchronization. Clearing browser data removes records; use CSV export to keep a copy. The optional Google Fonts stylesheet requires internet; system fonts are used otherwise.
