# Visual direction

The user requested a similar aesthetic while providing the physical game. Preserve the physical board’s industrial character: charcoal refinery panels, warm cream tiles, muted olive shop areas, and teal/orange/silver pipe colors. Retain the simple two-player lobby and invitation flow.

Use original browser-rendered components. The lobby SVG is newly drawn from the connectivity visible in IMG_0358 row 1 column 1 and the single pipe in IMG_0362. It is decorative, not a playable geometry model. All 135 playable pipe faces have been transcribed. Reference photographs are not web assets.

Large labels use clean sans-serif typography. Thin borders, restrained metal bands and pipe couplings echo the physical pieces. Oil types should ultimately have redundant symbols; grades must use fill levels and readable labels, not color alone. Player identity and connection state remain legible next to each refinery.

The desktop game uses a fixed-height workspace: public-area tabs on the left, the player’s refinery and tank inventory on the right, and an action tray with a fixed confirmation area below. The government pinwheel, pipe geometry and action-pair relationships retain their gameplay meaning. Market subtabs keep a selected market beside inventory; whole-table view provides clickable supply summaries and both networks. Detailed forms, long inventories and oversized networks scroll locally. At 980px and below, the workspace stacks into a normally scrolling page.

`workspace.js` reorganizes the existing rendered components without sending game actions. Area, refinery and zoom controls remain usable on a partner’s turn. View preferences do not follow the other player’s actions. PipelineTable retains draft ownership and existing authoritative validation; form values survive local draft rerenders. Network camera controls scale only the SVG, and pointer drags are distinguished from placement clicks. Sidebar sizing is adjustable with pointer or keyboard and saved in browser storage.

`workspace.css` layers the desktop layout over the original theme. Preserve readable text and fixed-size controls while scaling pipe geometry. Keep setup and lobby layouts independent of the in-game workspace.
