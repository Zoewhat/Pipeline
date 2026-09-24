# Harbor appearance update

The background now uses a muted slate overlay, reduced saturation and contrast. All text areas have opaque or nearly opaque blue-gray surfaces. The public areas, refinery, tank farm, header, footer, setup and lobby use the same harbor palette. Dark network cells retain light labels.

Oil markers are native circular SVGs, with a colored ring for crude and colored pie fills of one-third, two-thirds and full for Low, Mid and High. Orange, teal and silver identify oil type. Accessible labels include both type and grade. The shared marker renderer covers markets, contracts, orders, refinery storage and action previews. Empty tank spaces remain dashed boxes.

Equipment illustrations were generated with the built-in image-generation tool and optimized to 512px WebP assets. Prices and sold-state labels remain separate native text. These are decorative equipment illustrations, not transcriptions of printed component data.

- Tank: `public/assets/tank-market.webp`
- Machine: `public/assets/machine-market.webp`
- Theme: `public/harbor.css`

## Final tank prompt

Use case: stylized-concept. Asset type: small readable shop illustration for the Pipeline board game web app. Hand-painted gouache, subtle dry-brush texture, matching a painterly industrial harbor at dusk. Palette: muted slate blue, dusty blue-gray, aged ivory, small warm copper highlights. Clear bold silhouette, restrained detail, soft diffuse light, no dramatic contrast. Three-quarter view, centered single object filling 80% of a square canvas. Background: flat pale blue-gray #dce4e5, no scenery, no decorative frame. No text, letters, numbers, symbols, price, logo, or watermark. Subject: a single refinery storage tank: wide upright cylindrical steel oil tank, low domed roof, thin raised rim, external ladder and a small pipe valve at its base. Aged ivory body with blue-gray shadows and understated warm copper fittings. Charming board-game illustration, practical industrial realism.

## Final machine prompt

Use case: stylized-concept. Asset type: small readable shop illustration for the Pipeline board game web app. Hand-painted gouache, subtle dry-brush texture, matching a painterly industrial harbor at dusk. Palette: muted slate blue, dusty blue-gray, aged ivory, small warm copper highlights. Clear bold silhouette, restrained detail, soft diffuse light, no dramatic contrast. Three-quarter view, centered single object filling 80% of a square canvas. Background: flat pale blue-gray #dce4e5, no scenery, no decorative frame. No text, letters, numbers, symbols, price, logo, or watermark. Subject: a single compact refinery processing machine: substantial blue-gray horizontal pump/compressor housing, large rounded flywheel casing, curved copper inlet and outlet pipes, small cream pressure gauge, mounted on a short rectangular base. Charming board-game illustration, practical industrial realism. Make its shape clearly different from a cylindrical storage tank.

## Verification

Visually checked the shop illustrations, all four grades in all three colors, the refinery, markets and text surfaces in an isolated browser preview without changing the live game. JavaScript syntax and whitespace checks passed.

## Responsive board and opening screen

The opening wordmark is now “Pipeline.” in a large, light Helvetica Neue/system sans-serif with wider spacing. Only the lobby increases the illustration’s brightness, saturation and contrast. Tank setup uses neutral edges and full-height backgrounds to avoid the old warm margin bands. The table code is hidden as soon as both seats are occupied.

The whole-table view uses a full-width responsive grid with the actual pipe faces, card requirements, oil slots, equipment and randomized action pairs. Its pale translucent sections open the corresponding panel. The action tray is hidden while viewing the overview to leave room for the entire board, and restored when returning to panels. Desktop (1280px) and phone (390px) widths were checked in the browser.

The active table now uses two compact header rows: year/round and both player summaries on the first, refinement/scoring prices and view controls on the second. Narrow screens wrap within those same sections. Shop equipment uses three columns, so the three machines form one row and the six tanks form two rows. The first-player selector highlights the two named player cards before settling on the server-selected player, with a reduced-motion alternative; no additional image assets are required.

Upgrade families now use two columns, with each level a single keyboard-accessible card. Available levels are light, unavailable levels gray, and selected levels highlighted. Affordability, action access, the two-upgrade limit, stock, locks, and prior levels determine availability. Contract/order tiles retain accessible labels without repeating visible type labels, and order row barrel counts are removed.

The refinery grid extends to the viewport at the current zoom with square cells throughout. Resizing either panel or the browser recalculates the available grid, while networks continue to expand and support dragging/scrolling. Browser checks covered whole-card upgrade selection/deselection, the two-selection limit, placement/removal beyond the former grid edge, zoom coverage, and two-column upgrades at 390px.

The opening title is now larger and bold ice-white, with a translucent blurred lobby panel and blue-gray primary buttons. Tank setup retains Copy invite, removes the Setup badge and name/status subtitle, and aligns Table activity under the right-hand player (stacking on narrow screens). Same-device tables remain restricted to one device; their copy confirmation explains this distinction.

## Warm vintage board-game theme

The active game now loads `public/vintage.css` after the earlier theme layers. It keeps the selected cream, dark/light yellow, dark/light green, teal and orange palette while replacing the sunset backdrop with `public/assets/pipeline-pattern-sage.webp`. The transparent pattern is repeated at a fixed aspect ratio and is never stretched. Its pale-green line work stays in the outer background and the major game sheets remain opaque so labels and values remain readable.

Nested presentation boxes were removed from the government board, reference strip and panel contents. Borders remain where they communicate a real division or interaction: the two main viewing panels, game pieces, market spaces, upgrade choices, refinery boundaries and the action dock.

### Final background pattern prompt

Use case: stylized-concept. Asset type: seamless-looking transparent background overlay for a warm vintage board-game web interface. Create a rich, intricate, magical-feeling but pipeline-related ornamental pattern that can repeat across a large cream game surface while remaining extremely subtle. Interlace refinery pipes, graceful valve wheels, pressure-gauge arcs, tiny rivet constellations, looping flow paths, restrained botanical curls that transform into pipe elbows, faint refinery silhouettes and delicate schematic geometry. Use very fine antique copperplate line engraving and faint lithographic blueprint marks, elegant and old-fashioned, slightly whimsical and enchanted but still industrial. Make a square repeat-friendly tile with balanced density, no central focal point and no border. Use one very pale sage-green/light olive-green ink only, with low contrast and a genuinely transparent background. Line art only; no text, letters, numbers, logos, watermark, solid background, shadows, large objects, frames, modern geometric icons, fantasy creatures or steampunk props. It must remain unobtrusive behind dark interface text at low opacity.

### Theme verification

The full 42-test suite passes. The real game was also exercised through its full browser workflow at desktop and phone widths, including the two-panel layout, refinement, overview, clocks, following, loans and all 18 rounds.
