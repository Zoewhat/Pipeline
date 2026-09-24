# Pipeline project guide

User intent: faithful two-player **base game** Pipeline for long-distance play, hosted on Render similarly to the sibling Splendor app. Base game first was explicitly confirmed. Do not change the Splendor project.

Stack: Node.js 22+, Express, Socket.IO, plain browser JS/CSS. `pnpm start`, `pnpm test`. Default port 3001 avoids Splendor on 3000. Use the bundled runtime if Node is not on PATH.

Current app implements the complete introductory game locally, including an interactive shared table, all 18 rounds, upgrades, annual refresh and scoring. It has passed 34 automated tests and an initial two-browser full-game playthrough. It has not been deployed. Never replace missing components with invented ones or mark catalog entries verified without evidence.

Current scope is **two-player introductory base game only**, using fixed valuations 1/2/3 plus the separate machine-pipeline valuation tile. Defer all other valuation cards; they must not block this preset. Twenty private photos and user clarifications now cover the requested components. All 135 pipe faces are received, including the one in IMG_0362. Contract/order requirements and groups, marker multiplicities (three each of 4/5/6/7), upgrade copies (3/1/1 per family), two-player overlays and crude refill maximum 4 are confirmed. No more photos currently requested. Intro refinement excludes the 7s. All 135 pipe geometries are transcribed. Engineering III and first-printing rule corrections are documented in docs/RULE_DECISIONS.md. Read docs/REFERENCE_REVIEW.md before requesting anything again. Preserve the physical charcoal/cream/olive aesthetic with teal/orange/silver pipes.

Read README.md and docs/IMPLEMENTATION.md before extending gameplay. User photos or an authoritative matching-edition source are needed for printed data. Reference photos belong in ignored references/photos/; do not publish them automatically.

Server is authoritative. Never accept a player index from a remote client as authorization. Actions must be atomic, persisted before broadcast, version checked, and tested for malformed input and seat isolation. No private seat credentials in broadcasts. Offline seats remain reserved. Preserve reconnect behavior.

File persistence alone is not durable on Render free; do not claim otherwise. Persistent storage is needed before relying on the app for real games. render.yaml provisions only the free preview; no deployment has been made.

## September 20 user instructions supersede the earlier preset

The user explicitly disabled valuation cards: score oil and pipelines once; keep the separate machine-pipeline tile, omit the tank-card bonus. The published introductory preset intentionally repeats assets via cards 1/2, so document this as a user-selected variation. Turn clocks allow five minutes each turn, then transfer $5 per completed extra minute, including negative balances. Read docs/SEPTEMBER_UPDATE.md for the twin-panel interface, read-only presence relay, generated artwork and verification. Never change the sibling Splendor project.
