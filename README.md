# Pastors' Network Overview

A **read-only** dashboard for Senior Pastor Bong Quilos & Pastora Anna Quilos to see
the live progress of every network leader's cell report — all in one place.

## How it works

This app doesn't have its own database. It reads live, in real time, from the exact
same 10 Google Sheets that each network leader's own cell-report app already writes
to (Abraham, Claudio/Sonny, Flores/Franklin, Imee Patal, Jacaria, Jay Abraham, Jotoy,
Laparan, Pendon, Rodemio). Whatever a network leader updates in their own app shows
up here automatically — no double data entry, no separate spreadsheet to keep in sync.

Nothing in this app can add, edit, or delete a record. All "Add", "Edit", "Delete",
and "Pick Timothy" controls from the original per-leader apps have been removed —
pastors can drill all the way down (Network → Boys/Girls → Lifegroup Leader →
Open/Close Cell → Sub-leaders) but never change anything.

## Screens

1. **Networks Overview** — combined totals across all 10 networks, plus a card per
   network showing its leaders and live counts.
2. **Network Home** — Boys/Girls doors for the selected network (same as each
   leader's own home screen).
3. **Gender → Lifegroup Leader → Open/Close Cell → Sub-leader** — same drill-down
   depth as the original apps, showing every disciple's track progress (SUYNL, Life
   Class, Encounter, Water Baptism, SOL 1/2/3, Re-Encounter, LG Leader).
4. **Consolidation** (sidebar tab) — a **read-only** view of every First Timer /
   VIP logged, who they're assigned to, and their current follow-up status
   (Not Yet Contacted → Contacted → Invited to Cell → Attending Cell). Nothing
   can be added or edited from here, same as the rest of this dashboard — data
   entry happens in the separate **Consolidation System** app (its own project,
   built for the welcome/consolidation team), which writes to the same
   `ConsolidationBackend.gs` source shown below, so anything logged there
   appears here automatically.

## Setting up Consolidation

The Consolidation tab reads from its own small Google Sheet + Apps Script backend
(separate from the 10 leader sheets, since First Timers aren't tied to one
network until they're assigned). This is the same backend the standalone
**Consolidation System** app writes to — set it up once and point both apps
at the same URL.

1. Create a new Google Sheet (any name, e.g. "TRCF Consolidation System").
2. Extensions → Apps Script → paste in `ConsolidationBackend.gs`.
3. Run the `setup` function once (creates the "FirstTimers" tab, asks you to
   authorize — normal).
4. Deploy → New deployment → **Web app** → Execute as **Me** → Who has access
   **Anyone** → Deploy. Copy the URL it gives you.
5. Open `src/App.jsx` in this project, find the line near the top:
   ```js
   const CONSOLIDATION_SCRIPT_URL = "PASTE_YOUR_CONSOLIDATION_WEB_APP_URL_HERE";
   ```
   and replace it with the URL you copied.
6. Rebuild (`npm run build`) and redeploy this dashboard.

Until that URL is filled in, the Consolidation tab will show a friendly
"Not connected yet" message instead of erroring.

## Running it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build (outputs to dist/)
```

Deploy the `dist/` folder anywhere that serves static files (Vercel, Netlify, GitHub
Pages, etc.) — same as the individual leader apps.

## Updating the network list

If a new network leader's app comes online, or one leader's Apps Script URL changes,
just add/edit an entry in the `NETWORKS` array near the top of `src/App.jsx`:

```js
{ id:"example", label:"Example Network", boys:"Name", girls:"Name",
  scriptUrl:"https://script.google.com/macros/s/.../exec" }
```
