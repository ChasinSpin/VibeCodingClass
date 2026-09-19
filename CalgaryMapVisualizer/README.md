# Calgary Atlas

A portable, build-free HTML map viewer for the City of Calgary Open Data Portal. Open `index.html` in a modern browser to use it online. All app code and Leaflet are local; maps and live datasets require internet access. Some browsers restrict API access on file URLs; serving the folder is recommended.

## Run / install as a PWA

From this folder, run `python3 -m http.server 8080` and open http://localhost:8080. Or upload the entire folder to any HTTPS static host. Use the browser's Install app / Add to Home Screen option. Service workers require HTTPS or localhost; they cannot operate from a double-clicked file URL. No account, API token, npm install, or build is required.

## Features

- Community services, playground equipment, park sites, and police service layers.
- Additional Calgary spatial datasets by dataset ID or portal URL.
- Attribute search, optional map-extent filtering, feature detail popups, fit-to-layers, geolocation, and GeoJSON export of matching features.
- PWA shell caching and saved copies of successfully loaded datasets, with visible offline timestamps and retry controls. Map tiles are not cached by this app. Offline availability requires at least one successful served visit and dataset load; browser storage can be cleared or evicted.

## Data and limitations

Data comes from https://data.calgary.ca using public Socrata GeoJSON endpoints. Requests paginate in stable `:id` order in batches of 1,000, capped at 20,000 rows per dataset (shown when reached). Nonspatial rows are omitted. Polygon/line extent filtering uses bounding-box intersection. Snapshot pagination can change if the source is edited while loading. Public unauthenticated endpoints may be rate limited or unavailable; failed loads show errors instead of fabricated data. Custom IDs must expose GeoJSON geometry; nonspatial and legacy datasets may not be compatible.

Live API requests returned HTTP 503 in the development environment, so successful production data loads must be verified with portal access. Previously saved data is used only when actually available.

City data is subject to the portal's dataset terms and [Open Data Licence](https://data.calgary.ca/stories/s/Open-Calgary-Terms-of-Use/u45n-7awa). This is an independent project, not an official City application. Basemap: OpenStreetMap contributors. Leaflet 1.9.4 is vendored under its BSD-2-Clause license (vendor/LICENSE).
