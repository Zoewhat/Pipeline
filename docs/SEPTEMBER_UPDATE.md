# September 20 table update

## Requested behavior

Both panels have the same eleven tabs: Action pairs, Government, Crude, Refined 1/2/3, Shops, Contracts & orders, Upgrades, My refinery and Partner’s refinery. Refinery tabs have a separate teal color. Each panel keeps its own camera and scroll position. The Compare both control is removed: choose the two refinery tabs on opposite panels instead.

The compact header includes year, round, current turn, invite and recovery controls. Refinement costs and scoring stay visible. Whole table is a clickable, word-free schematic of the physical board, with optional details below it. No private reference photo is served.

Tank grades run High, Mid, Low, Crude. Each barrel is a selectable colored square; dashed squares are unused capacity. To refine, choose a worker tile, click a barrel in the tank farm, then click a valid destination beside its eligible pipeline. The action footer confirms the batch. For a market sale, choose an empty market slot and click a barrel in the refinery. Select all sales and purchases before confirming; the server resolves sales first. Selecting a sale is not itself a completed action.

Loans are visible inside Contracts & orders before a contract is selected. Government appears as its own box below the action pairs. All three upgrade levels stay visible. Unconfirmed tiles have gold dashed outlines; clicking either half removes just that tile from the draft. Confirmed tiles cannot be removed this way.

## Random setup and rules

The server chooses either seat with equal probability when a player starts after both tank layouts are locked. Both players see the same 3.2-second alternating highlight animation and a 1.2-second winner reveal before the board opens. The server persists the result and reveal time, and the first five-minute allowance starts after the reveal. Rejoining later does not replay the animation. Saved first-player results remain compatible with earlier games. Contracts already shuffle four per grade and orders two per size; that behavior is unchanged.

The corrected publisher rulebook allows a Government benefit from any combination of open quadrants. The engine already allowed this; the interface now explains that earlier quadrants remain usable. Collect and place from one quadrant, then select another for the remaining benefit.

The publisher’s introductory valuation cards 1 and 2 intentionally repeat oil and pipeline scoring, and card 3 is **$10 per owned tank**. The September 27 request supersedes the earlier fixed variation: the setup page now holds one shared final-valuation configuration. New tables default to $10 per tank and no machine-pipeline bonus. Players can instead turn the tank card off, choose a clearly labeled $5 house rule, or enable the verified repeated-oil, repeated-pipeline, machine-pipeline, and $100-per-level-three-upgrade effects. Any change clears both ready locks. Unsupported or unverified valuations are not presented as choices. Games already in progress before this change keep their previous scoring configuration.

The dark-red end-turn control is visually distinct from ordinary actions. When a player owns no machines, the work and secondary-phase pass control explicitly passes the remaining phases and ends the turn in one server-validated action. It is not automatic, because a player may still want to deliver oil before ending.

## Turn clock (house rule)

Each turn has five minutes, including upgrade benefits and the machine phase. For every **completed** extra minute, $5 moves from the active player to the other player; the first transfer is at 6:00 elapsed. Cash may be negative. The server owns the timestamps and payment count, catches up elapsed payments, and commits each payment before broadcasting. Ending a turn resets the next player’s clock. Reconnecting or restarting does not reset an existing clock. Offline time counts. Finished games stop charging. Games created before clocks existed receive a fresh allowance on their first rejoin after this update.

## Following

Follow partner mirrors panel choices, whole-table mode, network zoom/pan, scrolling and unconfirmed drafts. Following is read-only. Stop following restores the previous panel selection and, if the game revision is unchanged, the prior draft. A small cursor moves between clicked controls, with a one-time highlight. It does not stream mouse movement or screen video.

Presence is bounded, throttled, ephemeral and seat-authenticated. No private seat credentials or recovery snapshots are part of it. It does not mutate the game or increment its revision. Browsing stays independent when following is off. UI state is sent after interactions with a short debounce; this should be inexpensive relative to video or continuous cursor streaming, but production Render load has not been measured.

## Artwork

Built-in image generation produced `public/assets/refinery-sunset.jpg`. The PNG original was converted to an optimized JPEG for the web. The image is decorative; pipe geometry, selectable barrels, numbers and controls remain crisp native elements on opaque panels.

Final generation prompt:

> Use case: stylized-concept. Create a wide landscape background illustration for a readable oil-refinery board game web app. Original painterly gouache and textured brushwork, refinery skyline glowing burnt orange and gold across a harbor, deep slate blue and teal clouds, warm cream sunset light, reflections in dark water. Inspired by the supplied Pipeline cover's industrial sunset mood, without copying its exact composition. Low-detail calm dark edges and generous quiet sky. No text, logos, lettering, game components, borders or watermark. This is decorative backdrop artwork; crisp game controls will be overlaid separately. Save the generated image for use as a local project asset.

## Verification

47 automated tests cover the base engine plus roll persistence, timer boundaries/debt, pause/resume behavior, relay validation, seat isolation, persisted clock transfers, configurable scoring, streamlined turn ending and combined sale/purchase transactions. The optional browser script uses two independent seats and temporary saves, verifies the new controls and follows a full 18-round game. It additionally exercises direct oil selection for refining and selling, standalone loans, mobile width, read-only mirrored drafts and animated click indicators.

The playing table now places fixed refinement/scoring information in the first header row and player balances, view controls, and the right-aligned work action in the second. Panel surfaces use a single translucent layer. Crude-market prices are inside colored oil rings; vacant positions retain dashed rings. Government quadrants use enlarged tiles and dividing lines, with quadrant names retained only as accessibility labels. The refinery scroll viewport has size containment and reserved scrollbar space, and skips redundant grid rebuilds so its own SVG resizing cannot repeatedly alter the observed layout.

## September 27 interface adjustments

`public/assets/pipeline-etching-login.webp`, an original navy-on-parchment pipeline engraving generated from the user's supplied style reference, now provides the shared backdrop for the login face, tank setup and playing table. Setup and play continue the same cream-paper, navy-ink and muted blue-gray panel language; teal, orange and silver remain functional game colors so oil and pipes stay distinct.

Both authenticated seats can pause or resume the server-owned turn clock. Pausing first settles any completed overtime minute, then freezes elapsed time; resuming shifts the start timestamp by the paused duration. The pause state is persisted before broadcast and survives reconnects. A new turn always receives a fresh running five-minute clock.

Cash and the clock remain in each refinery tab and are also shown in larger type inside both refinery panels. Government now shows the complete printed purchase summary above the quadrants: 1/$5, 2/$10, 3/$20, 4/$35 and 5/$55.

The corrected rulebook requires the worker to select a whole Pipe tile when running the personal network, and every eligible pipeline passing through that tile can run. Clicking either half now selects and highlights the complete two-square tile, matching both the authoritative engine selection and the visible worker position.

The September 27 login engraving was regenerated with a substantially larger lake and more open paper space. Repeated tree and pipeline motifs were replaced with varied rock strata, maintenance paths, shoreline equipment, pump structures, catwalks, different pipe diameters, and mechanically distinct routes while keeping the navy-on-cream engraving style.

Final built-in image-generation direction:

> Use case: precise-object-edit. Asset type: extra-wide login background. Preserve the authentic dark-navy copperplate engraving on fibrous cream paper, but make a large calm lake the dominant open area. Concentrate distinct refinery equipment, tanks, pump houses, gantries, catwalks, valve assemblies, ladders, shoreline pilings, varied rock strata and mechanically believable pipelines around the edges. Every route, support and terrain feature should differ; avoid repeated trees, cloned pipe modules, mirrored structures, fantasy machinery, text, logos and watermarks.
