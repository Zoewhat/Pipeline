# Pipeline — a table for two

A private, two-player implementation of Ryan Courtney’s **Pipeline**, using Node.js, Express and Socket.IO. The introductory base-game preset is playable locally: all three years, government and shop purchases, pipe placement, oil markets, worker and machine refining, contracts, orders, loans, five recommended upgrade families, annual benefits and final scoring.

The board uses original SVG/CSS in the physical game’s charcoal, cream, olive, orange, teal and silver palette. All 135 pipe geometries and the contract/order faces were transcribed from the user’s physical copy. Reference photographs are private and excluded from deployment.

## Play locally

Node.js 22+ and pnpm are required.

```sh
pnpm install --frozen-lockfile
pnpm start
```

Open http://localhost:3001. Create a table and send its invite to the second player, or choose **Same device**. Each player arranges five tanks and clicks **Save & lock**. Once both are ready, click **Start the game**.

Click a government tile to place the worker, then select its edge-sharing neighbors. The eight spaces in each quadrant follow the printed pinwheel arrangement. Selected pipes appear in the bottom action tray: select a pipe, rotate it, click a square in the large refinery beside the supplies, and confirm the purchase after placing every tile. Shop pipes work the same way. Purchases are validated and saved together; canceling an unconfirmed draft spends nothing.

On desktop, the table fits the browser window with public supplies on the left, your refinery and inventory on the right, and the current action and confirmation at the bottom. Use the area tabs for government, markets, shops, contracts/orders, upgrades and action pairs. Each oil market has its own subtab. Switching views preserves an unconfirmed draft.

Use **Partner** or **Compare both** to inspect the other refinery. **Whole table** shows clickable supply summaries and both pipe networks; **Table info** opens refinement/scoring references, next-round order and recent activity. Drag the separator (or focus it and use the arrow keys) to resize the two areas; the browser remembers the width. Use the network’s **+ / −**, **Fit**, and **1:1** controls to inspect a growing refinery. Drag within the network to pan; a drag does not place a tile. Each player’s view and zoom stay independent during remote play. Smaller windows stack the areas and allow normal page scrolling.

Selected purchase totals include applicable secondary-action fees; selected market sales are shown separately. These are previews, and the server still validates funds, capacity, placement and action legality when confirming. Market slots are clickable: occupied slots buy oil and empty slots sell it. Refining starts by clicking a tile in the player’s network. Deliveries can be made between actions. End the machine phase with **End turn**.

## Included preset

- Exactly two players, 8 / 6 / 4 rounds across three years.
- Government, Engineering, Human Resources, Refined Markets and Shops upgrades, levels I–III.
- Fixed valuations 1 / 2 / 3, plus the machine-pipeline valuation tile.
- Refinement costs shuffled from three each of 4 / 5 / 6.
- The physical two-player market masks, refresh amounts and shop counts.

Other valuation cards, the two non-introductory upgrade families, expansions and additional player counts are not selected by this preset.

## Saves and recovery

Every accepted move is committed to `DATA_DIR/rooms.json` before it is broadcast. A process restart on the same filesystem reloads the table. Private seat tokens reserve disconnected seats; reopening a seat replaces its earlier connection.

Each browser also stores an **encrypted, authenticated recovery snapshot**. If the server loses its room file, rejoining can restore that snapshot. Hidden deck order and seat hashes are inside the encrypted snapshot, never exposed as plaintext. **Save recovery file** downloads your private seat credentials and the encrypted table snapshot; use **Restore from a recovery file** in the lobby to move to another device. Keep the file private.

For restoration after a host replacement, set a stable `BACKUP_SECRET`. `render.yaml` generates one as an environment variable. Locally, a private `storage/backup.key` is created when no environment secret is supplied. Losing or replacing that key makes old recovery snapshots unreadable. Local snapshots and browser copies are a recovery mechanism, not an external database: cleared browser storage, lost files or an older snapshot can still cause lost progress. A paid persistent disk or external database remains the stronger storage option.

## Render deployment

**Not deployed yet.** The Render dashboard requires sign-in, and no Pipeline GitHub repository was found in the connected account. No paid resources have been provisioned.

Push the project to a separate private GitHub repository, then create a Render Blueprint from `render.yaml`. Use one Node web-service instance; do not deploy as a static site or run multiple replicas against this file store. The blueprint uses the free plan and generates `BACKUP_SECRET` for browser recovery. Keep that secret unchanged on subsequent deployments.

Render’s free filesystem is ephemeral. For server-side durability, choose a persistent disk mounted at `/var/data` and set `DATA_DIR=/var/data`, or add an external database. This project does not automatically purchase a disk. The public Render URL, once deployed, is what the two distant players should share; localhost links only work on the host computer.

## Rules and verification

The user’s photographs provide printed component data. The publisher’s corrected base rulebook clarifies several first-printing ambiguities, including government adjacency, Engineering III, scoring bonuses, higher-grade deliveries and annual-benefit timing. See [docs/RULE_DECISIONS.md](docs/RULE_DECISIONS.md). No photographs are currently requested.

```sh
pnpm test
```

All 34 automated tests pass. Tests cover all 135 pipe rotations, crossings and machine cuts; atomic actions; prices and capacities; upgrade benefits; all 18 rounds; final scores; malformed actions; connected-seat authorization; stale versions; reconnects; local persistence; and authenticated recovery after a simulated lost server save.

A two-tab browser playthrough completed all 18 rounds with government purchases, rotation/placement, a buy–refine–sell oil cycle, a paid secondary tank purchase, machine placement, an upgrade, a loan, contract penalties and annual benefits. A page refresh during a partly collected benefit retained the remaining entitlement. Final scores were $95–$95, with the winner correctly decided by turn order. This is an initial playtest, not a claim that every possible strategy or rare rules interaction has been exercised.

## Browser layout verification

The optional browser check uses a temporary server and temporary saves, and closes both when finished. It requires Playwright and a browser installed separately; these are not runtime dependencies of the game.

```sh
# Use an installed Playwright package and, optionally, a local Chrome executable.
PLAYWRIGHT_MODULE=/path/to/playwright CHROME_PATH=/path/to/chrome node scripts/check-workspace.cjs
```

It covers two independent seats, atomic pipe placement, rotation, preserved form selections, buying and selling oil, independent views and zoom, overview navigation, keyboard resizing, narrow-window overflow, all 18 rounds and final scores. A separate synthetic 60-tile rendering fixture checks wide-network fitting and panning without changing a saved game.

## Code

- `game/engine.js`: pure authoritative game reducer, setup, turn flow, refresh, scores and public views.
- `public/geometry.js`: shared rotation, placement, pipeline graph and government-space adjacency.
- `game/recovery.js`: AES-256-GCM recovery snapshots.
- `server.js`: rooms, seat authorization, version checks and atomic file persistence.
- `public/table.js`, `public/table.css`: shared table and action drafts.
- `public/workspace.js`, `public/workspace.css`: desktop workspace, independent views, camera controls and responsive layout.
- `scripts/check-workspace.cjs`: optional two-browser UI regression check (Playwright).
- `data/components.json`: transcribed printed data; unrelated/deferred catalog fields retain their original verification flags.
- `scripts/transcribe-pipes.py`: reproducible pipe-face transcription.
- `test/`: rule, geometry, full-round and multiplayer tests.

Unofficial personal adaptation. Game design: Ryan Courtney. Publisher: Capstone Games. The sibling Splendor project is unchanged.
