# Physical reference review — updated September 14, 2026

All twenty supplied HEIC originals have been copied into ignored `references/photos/`, with JPEG decoding previews beside them. Original copies were checked byte-for-byte against Downloads. They are not in `public/` and are not served by the app. `data/sources.json` records their hashes and subjects.

## Latest scope and confirmations — supersedes earlier requests

User requests only the two-player introductory base game: fixed valuations 1/2/3 plus the separate valuation tile. Other valuations, including tables 14–16, are deferred and must not block progress. No further photos currently requested.

IMG_0365 shows the separate valuation tile (value of pipelines attached to machines) and the six three-player overlay faces. IMG_0366 shows their two-player reverse faces; it is an overlay photo, not a valuation-card back. All originals are hash-checked against Downloads.

The user confirms three markers of each value 4/5/6/7, upgrade copies 3/1/1 per family, maximum crude refill of four, and grouping by the visible contract/order symbols. Intro refinement shuffles the nine non-7 markers. The earlier “best to lowest” description referred to an orientation difference; do not reverse transcribed front requirements. Contract face-photo rows are low/mid/high and order face-photo rows are 3/4/5. Board display rows run the opposite way.

Two-player refined-market slots retain only the expensive printed pair (indices 2/3); the blank two-dot overlays cover the cheaper pair. Crude rows exclude the last two slots marked for 3+/4 players. Two-player tank shops have two slots per price row, machine shops one. Recorded demand maxima below are low/mid/high from IMG_0366, applied separately per row and limited by cubes present:

| Market | Color | Low / mid / high removal |
| --- | --- | --- |
| 1 | Orange | 2 / 1 / 1 |
| 1 | Silver | 1 / 2 / 0 |
| 2 | Orange | 1 / 2 / 1 |
| 2 | Teal | 3 / 1 / 1 |
| 3 | Silver | 3 / 2 / 1 |
| 3 | Teal | 2 / 1 / 0 |

The user’s four-cube comment concerns crude replenishment; it does not replace the different refined-demand symbols in the supplied overlays. `data/sources.json` records textual confirmations as USER_INTRO_SCOPE. `game/intro.js` retains the fixed preset and arithmetic helpers; `game/engine.js` implements the complete introductory game and final score.

## Received and reviewed

| Photo | Contents | Review |
| --- | --- | --- |
| IMG_0347 | Main board | Printed market and construction prices readable. Some small refresh icons need close-ups. Market overlays are not fitted or separately shown. |
| IMG_0348 | Player board | Starting cash/tanks, end-game oil and pipeline values, contract/order rates and penalty track readable after rotating the viewing copy. |
| IMG_0349 | Rulebook cover, page 1 | Received. No exact print revision identified. |
| IMG_0350 | Pages 2–3, contents | Received; small inventory text is soft. Illustrations do not establish the whole deck distribution. |
| IMG_0351 | Pages 4–5, setup | Superseded by clear photos IMG_0356 and IMG_0357. |
| IMG_0352 | Pages 6–7 | Turn structure, refresh, market transactions, contracts and loan rules reviewed. |
| IMG_0353 | Pages 8–9 | Shops, upgrades, government pipes, pipe placement and refinement rules reviewed. |
| IMG_0354 | Pages 10–11 | Machine phase, fulfillment, end game and seven upgrade families reviewed. |
| IMG_0355 | Page 12 | All sixteen valuation descriptions reviewed. Tiny numerical payout tables on cards 14–16 are not reliably readable. |

| IMG_0356 | Page 4, clear setup | Two-player supply, starting contract/order displays and recommended upgrades readable. Physical print retains a “5 players” typo; the two-player line is clear. |
| IMG_0357 | Page 5, clear setup | Tank recommendation, random setup, action-tile reverses and first-game choices confirmed. |
| IMG_0358 | 36 pipe tiles | Nine rows of four; all individual geometries transcribed. |
| IMG_0359 | 45 pipe tiles | Nine rows of five; all individual geometries transcribed. |
| IMG_0360 | 53 pipe tiles | Five columns of nine and one column of eight; all geometries transcribed. |
| IMG_0361 | 24 orders | Three rows of eight; all individual oil type/grade requirements transcribed. |
| IMG_0362 | 30 contracts plus one pipe | Three rows of ten; all individual requirements transcribed. Some mid/high-row contracts mix grades. Backs not shown. The single pipe above the contracts completes the 135 observed faces. |
| IMG_0363 | 12 upgrade faces and four action tiles | Machines, Shops, Government, Contracts & Orders, levels I–III; all four action labels and turn-order symbols visible. |
| IMG_0364 | Nine upgrade faces | HR, Refined Markets, Engineering, levels I–III. Engineering III card and appendix wording differ; publisher correction applied (RULE_DECISIONS.md). |

The full rulebook is present. Do not ask for another photograph of every page. Component data follows the physical copy; documented first-printing corrections follow the publisher’s corrected base rulebook. See RULE_DECISIONS.md.

## Confirmed data recorded

`data/rules.json` contains starting $40, five tanks, two barrels per tank, the 8/6/4-round schedule, and these printed costs and values. The recommended 2/1/1/1 tank distribution is now physically verified against IMG_0357. Shared two-player setup values and the complete introductory deal are implemented in the engine.

| Item | Values |
| --- | --- |
| Government pipes, 1 through 5 tiles | $5 / $10 / $20 / $35 / $55 |
| Shop pipes | Exactly 2 for $15 or 4 for $40 |
| Tank shop price rows | $5 / $10 / $15 |
| Machine shop price rows | $20 / $30 / $40 |
| Normal secondary action | $10 |
| Normal machine phase | $15 for activation of any number of machines |
| Upgrade | $20, up to two available types per upgrade action |
| Loan | $15 received plus one penalty token |
| Contract barrel, low/mid/high | $20 / $35 / $45 |
| Order barrel, low/mid/high | $30 / $45 / $55 |
| End-game oil, low/mid/high | $10 / $20 / $30 |
| End-game pipeline, maximum crude-to grade low/mid/high | $10 / $20 / $30 |
| Total penalty deduction, tokens 1–10 | $20 / $50 / $90 / $140 / $200 / $270 / $350 / $440 / $540 / $650 |

Crude has no end-game asset payout; it is not interchangeable with a refined-grade delivery. The printed penalty table stops at ten. The original helper retains that limit; the full engine’s explicit extension assumption is documented in RULE_DECISIONS.md.

`data/components.json` now includes all four market areas' **unmasked printed prices**. Each crude price group has two physical slots; each refined price group also has two. These are not the final two-player slots. `twoPlayerSlots` and refresh settings now follow the supplied overlays. Shop slots use the confirmed two-player quantities.

The catalog records all seven upgrade families and sixteen valuations. The five introductory upgrade families, valuations 1/2/3 and separate valuation tile are implemented. Other families and valuations are deferred; overall `verified` remains false. All 135 pipe geometries and contract/order fronts are transcribed with stable source IDs. Contract and order grouping follows the user’s confirmation of visible symbols; no backs are currently requested.

## Rules captured for implementation

- Eight central actions allow an optional paired secondary action after paying its cost; occupied worker spaces are permitted. Turn-order choices apply to the next round. Passing is allowed.
- Market transactions finish all sales before purchases. A higher grade can be sold into a lower-grade slot. Cash, occupancy, matching oil type and storage must all be checked together.
- Contracts are taken by row, at most one per row in an ordinary contracts action. They may be active now or deferred until next year; no deferral in year three. Active contracts repeat annually if completed; incomplete ones incur a penalty and are removed. Fulfillment can be partial, but cannot interrupt a main or secondary action.
- Orders are completed all at once and paid at their separate order rates. Keep delivered oil history for relevant valuations.
- Government buying starts from the worker's selected tile and can include its orthogonal neighbors in that quadrant. The annual limit of open quadrants is two, then three, then four.
- Newly placed pipe tiles require an orthogonal physical pipe connection, but colors need not match at the placement boundary. Refining follows continuous matching-color pipelines; multiple pipelines of the same color can cross one tile.
- Refinement costs add across grades. Only the destination grade needs tank capacity. A normal pipeline refines one barrel, each barrel runs only once in a simultaneous batch, and worker-run lines cannot be attached to machines.
- A machine covers half of an existing pipe tile, splits the covered pipelines and contributes no segment. Machines activate simultaneously.
- Engineering I adds one virtual segment per four actual segments; II replaces that with two per four. Engineering III runs two barrels of the same starting grade, including crude, on ordinary and machine pipelines; see the publisher correction in RULE_DECISIONS.md.
- End game assesses failed contracts, oil, every qualifying pipeline, valuations, penalties and cash. Turn order breaks a tie. The engine computes the complete introductory final score.

## New setup findings

- Select four contracts per grade for two players; display two per grade, retaining two in each supply stack. The rightmost display slot is unused. Physical p4’s separate “5 players” line is a print typo and is not used here.
- Select two orders of each size (3, 4, 5); return remaining orders to the box.
- Reveal four pipe tiles at each shop. Choose five upgrade families; the recommended families are Government, Engineering, HR, Refined Markets and Shops.
- Deal nine refinement markers; for a first game exclude value 7. The user confirmed three copies each of 4/5/6/7; no photograph is needed.
- Deal three valuations; first-game recommendations are cards 1, 2 and 3. The separate valuation tile is also used.
- Shuffle four action tiles. Reverse faces only change orientation, with no gameplay difference. Action-tile faces are now received; no backs needed.
- Choose the starting player randomly; five tanks and $40 per player, with tanks recommended 2/1/1/1. Tank columns do not matter; grade rows do.

## Previous requests (resolved or deferred; do not repeat)

1. **Two-player market overlays**, both sides, and close-ups of the board’s crude/refined supply and demand symbols with nearby player-count dots.
2. **Valuation tile and cards 14, 15 and 16**, close enough to read every payout number.
3. **All 12 refinement-cost markers**, face up, including repeated numbers.
4. **Upgrade copy counts per level** (text is sufficient), plus **one contract back from each row of IMG_0362**, keeping each row identifiable. All 21 distinct upgrade faces are received; this does not establish the number of duplicate physical cards. Contract front requirements and grouping are confirmed by the user.

No need to resend the boards, rulebook, 135 pipe faces, 30 contract fronts, 24 order fronts, action tiles or upgrade faces. Pipe geometry transcription is complete. Ask only for a specifically identified crop if a connection proves unreadable. Photos and inspection crops stay private.
