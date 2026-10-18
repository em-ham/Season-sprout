# Season & Sprout — Personal Seasonal Produce Planner

A static, browser-based web app seeded with the ingredient preferences and seasonal starter data from the Excel planner.

## Run locally
You can open `index.html` directly in a browser. For best compatibility, use a simple local web server:
- Python: `python -m http.server 8000`
- Then visit `http://localhost:8000`

## Publish on GitHub Pages
1. Create a new GitHub repository, e.g. `season-and-sprout`.
2. Upload `index.html`, `styles.css`, `app.js`, and `ingredients.js` to the repository root.
3. In the repository, go to **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `main` and folder `/(root)`, then Save.
6. Wait for GitHub Pages to publish and open the URL it provides.

## Data and privacy
- This version is static and requires no server or API keys.
- Recipe, plan, and ingredient edits are saved in `localStorage` in the browser on that device.
- Use **Export my data** to download a JSON backup regularly.
- Browser-local data does not automatically sync between devices. Import/restore is not implemented in this starter version.
- Anyone with access to the published site can use the app, but their browser-local edits are not shared with you or other users.

## Seasonal data caveat
Month markers are an indicative starter calendar. Some records have incomplete season information and require review. UK-grown season, global season, and preserved gap-filler availability should be verified before relying on the app as a definitive availability source.

## Current features
- Monthly seasonal overview with priority groupings
- Produce search and filters by category and preference
- Ingredient editing and adding
- Recipe idea capture with 16 recipe styles
- Simple meal planner and shopping list
- JSON data export


## Database integration — Batch 33

This build bundles the 213-record Season & Sprout database audited in Batch 33. The monthly guide distinguishes:
- UK outdoor harvest windows
- UK storage availability windows
- UK protected-growing windows (currently unpopulated in the database)
- imported growing-region season windows
- preserved options where the database has relevant metadata

The app does not check live retail stock. An empty month window means “not recorded”, not proof of unavailability. Imported growing-region windows are not necessarily evidence of UK imports from that origin in that month. Evidence URLs and verification notes are shown on produce cards where available.

When this build opens in a browser with older Season & Sprout local data, it refreshes seasonal database fields from the bundled dataset while retaining saved preferences, personal notes, recipes, plans and user-added ingredients. Back up important data using **Export my data** before updating. Local data stays in that browser and does not sync between devices.


## Seasonal display update
The seasonal guide now filters by explicit month arrays for UK outdoor harvest, storage, protected growing and imported growing-region season. It no longer falls back to the generic `months` array. Produce cards show compact UK-month and import-season lists; detailed verification and source notes are tucked into a disclosure. A blank month field means the database has no recorded window, not proof that the produce cannot be bought.


## Seed-packet-style month strip
Produce cards use a 12-month UK calendar: green = UK outdoor/protected harvest window; yellow = UK storage window; grey = no UK harvest/storage window recorded. Grey must not be interpreted as guaranteed retail unavailability, because some data is incomplete. User-facing labels use “UK harvest season this month” and “Available from UK storage”.
