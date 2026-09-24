# Base rule decisions

Component faces, prices, counts and two-player overlays come from the user’s photographs and text confirmations. The twenty photographs remain in ignored `references/photos/`.

The publisher’s corrected base rulebook was consulted for first-printing discrepancies:
https://capstone-games.com/wp-content/uploads/2019/10/Pipeline-rules-v2-web.pdf

The old direct PDF endpoint returns 404 when opened, but the publisher’s indexed PDF text was available by page-specific search. These corrections were read from that primary source on September 14, 2026. No expansion rules are used.

- Page 9: government purchases include the worker tile and edge-sharing neighbors, **excluding diagonals**. Each quadrant is a pinwheel of eight domino spaces on a 4×4 half-grid, as shown on the physical board and setup illustration. The geometry helper uses the actual shared edges, so a central space can have four neighbors.
- Page 9: ordinary pipeline throughput is once **per action**, not per turn. HR III can therefore run a pipeline again with its second main action.
- Page 10: higher-grade oil can fulfill lower-grade contracts and orders, earning the amount for the required grade.
- Page 11: Engineering I/II virtual refinement bonuses also apply to end-game pipeline valuation.
- Page 11: Engineering III runs two barrels of the same starting grade, including crude; the corrected text applies to pipelines generally, including machine-connected pipelines.
- Page 11: Government immediate benefits can draw from any combination of open quadrants. A benefit may open a new quadrant when none has opened that year, within the general annual limit.
- Page 11: Shops II/III pipes can come from either shop, across multiple choices.
- Page 11: annual Government/Shops benefits are collected on the owner’s first turn of each new year, after shared refresh, not before both players’ turns.
- Physical page 6: refill crude from the rightmost empty slot moving left. Refined demand removes from the right. Refills/drains stop at the row’s available capacity/occupancy.
- Physical page 10: machines remove the covered half’s segments, splitting the pipeline; multiple machines do not rerun a line in one machine phase.

The $5 refinement-market modifier affects refined grades for both sales and purchases; crude remains unaffected. Off-color oil sold under Refined Markets III retains the physical cube’s color when placed in the market. It is downgraded to the slot’s grade, and can later be purchased as that cube’s color.

The ten printed penalty totals follow `5 × n × (n + 3)`. The full engine continues that progression beyond ten penalties so an extreme repeated-loan game can finish; **this continuation is an explicit implementation assumption, not a separately verified printed rule**. The original arithmetic helper retains its strict ten-token range. All tested normal-game totals use the printed range.

The introductory preset deliberately excludes the two optional upgrade families and other valuation cards. Their unverified/deferred catalog flags are not silently changed.

## September 20 user-selected variations

The active game ignores valuation cards 1/2/3 per the user’s explicit follow-up; oil and pipeline assets therefore count once, with no tank-card bonus. The separate machine-pipeline tile remains. The publisher actually requires the repeated asset bonuses when cards 1/2 are selected, so this is a variation, not a rule correction. A five-minute turn clock transfers $5 for each completed extra minute and permits negative cash. See SEPTEMBER_UPDATE.md for exact timing. Government benefits across older open quadrants and sell-before-buy transactions were reconfirmed and remain unchanged.

## Contract reserve visibility (September 20 check)

The publisher’s indexed corrected rulebook, page 4, setup step 4, explicitly places each remaining contract stack face up beside its row. The current top-of-stack preview therefore stays visible; deeper reserve order remains hidden. Page 6 supplies the next annual contract column from those stacks. Source: https://capstone-games.com/wp-content/uploads/2019/10/Pipeline-rules-v2-web.pdf
