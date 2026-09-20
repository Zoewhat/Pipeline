# Implementation status

The fixed two-player introductory game now has an authoritative engine and an interactive shared table. It is playable locally and has completed an initial 18-round two-browser playthrough. Read README.md for controls, test coverage and deployment status.

## Implemented

- All 135 physical pipe faces, rotations, connected-placement validation, same-color pipeline graphs and machine cuts.
- Government pinwheel grids, shared supplies, two-player market/shop masks, contract reserves, order displays, refinement costs and randomized action pairs.
- Main / secondary / machine phases; HR additional actions; between-action deliveries; next-round turn order; all three years.
- Government and shop purchases with atomic placement drafts; tank grades and machines.
- Sell-before-buy market transactions, downgrades, cumulative refinement costs and simultaneous capacity.
- Active/deferred contracts, partial deliveries, complete orders, loans and penalties.
- All three levels of the five recommended introductory upgrade families; immediate and annual benefits persisted as pending choices.
- Annual market/shop/contract refresh and introductory final valuation, including Engineering bonuses and turn-order tiebreak.
- Seat authorization, stale-action rejection, atomic persistence, reconnects, encrypted browser backups and portable private recovery files.

## Deployment boundary

No deployment or new cloud resource has been created. Render is at its sign-in page. No Pipeline repository was found via the connected GitHub search, and the repository connector does not provide repository creation. The local directory is ready to publish as a separate private repository; user account access/destination is the remaining external step.

Free Render hosting is compatible with the generated stable BACKUP_SECRET and browser recovery. That is not an external database or a durable server filesystem. README.md states its limits. Do not claim remote play is available until a public service has actually been deployed and tested.

## Scope and rule notes

The user requested the two-player introductory game. Its five upgrade families are Government, Engineering, Human Resources, Refined Markets and Shops; its valuations are 1/2/3 plus the machine-pipeline tile. Other valuations, Machines/Contracts upgrade families, player counts above two and expansions are outside this preset. Do not treat those deferred catalog entries as missing components for this game.

See RULE_DECISIONS.md for the publisher corrections applied to the user’s early-printing rules and the rare penalty-track extension assumption.

## Verification

The automated suite exercises geometry, economic actions, upgrades, phase control, all 18 rounds, scoring, malformed payloads, cross-seat attempts, revision conflicts, persistence and recovery. The browser playthrough tests actual controls and multiple connected clients. Add targeted regression cases when changing rules; preserve the pure reducer contract and commit-before-broadcast semantics.

## Desktop workspace

Public areas and the refinery now share a fixed-height desktop workspace. Local view controls provide market subtabs, partner inspection, both-refinery comparison, a whole-table summary, panel resizing, and per-refinery zoom/pan. The action tray retains a separate price preview and confirmation area. Narrow windows keep a stacked scrolling fallback. No server, authorization or persistence protocol changes were made.

The optional `scripts/check-workspace.cjs` exercises the interface using isolated temporary saves and two independent browser contexts; see README.md for requirements and coverage.
