# Pipeline — a table for two

A private, two-player implementation of Ryan Courtney’s **Pipeline**, using Node.js, Express and Socket.IO. The two-player introductory base game, with the requested turn timer and valuation cards disabled, is playable locally: all three years, government and shop purchases, pipe placement, oil markets, worker and machine refining, contracts, orders, loans, five recommended upgrade families, annual benefits and final scoring.

The board uses a warm, old-fashioned tabletop treatment with cream, olive, dark yellow, teal, orange and silver playing surfaces. A dense pale-sage pattern of pipes, gauges, refinery silhouettes and flowing ornament sits quietly in the background without competing with game text. All 135 pipe geometries and the contract/order faces were transcribed from the user’s physical copy. Reference photographs are private and excluded from deployment.

## Play locally

Node.js 22+ and pnpm are required.

```sh
pnpm install --frozen-lockfile
pnpm start
```

Open http://localhost:3001. Create a table and send its invite to the second player, or choose **Same device**. Each player arranges five tanks and clicks **Save & lock**. Once both are ready, click **Start the game**. The server randomly chooses the first player. An animated highlight moves between the two players and reveals who starts before the board opens.

Click a government tile to place the worker, then select its edge-sharing neighbors. The eight spaces in each quadrant follow the printed pinwheel arrangement. Selected pipes appear in the bottom action tray: select a pipe, rotate it, click a square in the large refinery beside the supplies, and confirm the purchase after placing every tile. Shop pipes work the same way. Purchases are validated and saved together; canceling an unconfirmed draft spends nothing.

The compact header shows the turn, year, invite/recovery controls, clocks, refinement costs and scoring. Both panels have identical tabs, so choose any two areas to inspect together. Action pairs comes first, followed by Government, separate markets, shops, contracts/orders, upgrades and the two distinctly colored refinery tabs. Whole table displays an illustrated schematic arranged like the physical board. Resize the panels with the separator; use + / −, Fit and 1:1 for each refinery.

Follow partner mirrors their panel choices, zoom, scrolling and unconfirmed draft without allowing actions. A cursor moves between their clicked controls and briefly highlights each one. Stop following restores your view. Each turn has five minutes; each completed extra minute transfers $5 to the partner, allowing negative cash. Offline time counts. These are server-owned clocks that survive reconnects and restarts.

Tank rows run High to Crude. Click colored barrel boxes to select oil; dashed boxes show free capacity. For refining, select a worker tile, a barrel and an eligible destination in the refinery, then confirm the batch below. Draft pipe tiles have gold dashed outlines; click one again to remove just that tile. Loans are always visible inside Contracts & orders, and all upgrade levels can be read in advance.

Selected purchase totals include applicable secondary-action fees; selected market sales are shown separately. These are previews, and the server still validates funds, capacity, placement and action legality when confirming. Market slots are clickable: occupied slots buy oil and empty slots sell it. Select both sales and purchases before confirming a market action; sales resolve first. Deliveries can be made between actions. End the machine phase with **End turn**.

## Included preset

- Exactly two players, 8 / 6 / 4 rounds across three years.
- Government, Engineering, Human Resources, Refined Markets and Shops upgrades, levels I–III.
- Valuation cards disabled at the user’s request; oil and pipelines score once. The separate machine-pipeline valuation tile remains. This differs from the published introductory scoring.
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

All 42 automated tests pass. Tests cover all 135 pipe rotations, crossings and machine cuts; atomic actions; prices and capacities; upgrade benefits; all 18 rounds; final scores; malformed actions; connected-seat authorization; stale versions; reconnects; local persistence; and authenticated recovery after a simulated lost server save.

The updated two-browser check completes all 18 rounds and verifies first-player selection, mirrored tabs and drafts, individual tile removal, oil selection, market trading, loans and responsive layout. This is targeted regression coverage, not a claim that every strategy or rare rules interaction has been exercised. See [the September update](docs/SEPTEMBER_UPDATE.md) for the controls, scoring variation, timer semantics and artwork prompt.

## Browser layout verification

The optional browser check uses a temporary server and temporary saves, and closes both when finished. It requires Playwright and a browser installed separately; these are not runtime dependencies of the game.

```sh
# Use an installed Playwright package and, optionally, a local Chrome executable.
PLAYWRIGHT_MODULE=/path/to/playwright CHROME_PATH=/path/to/chrome node scripts/check-workspace.cjs
```

It uses temporary saves and two independent browser contexts, then closes both the server and browser. Desktop and 390px mobile widths are checked, including synchronized views, preview isolation, direct oil controls and final scoring.

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
