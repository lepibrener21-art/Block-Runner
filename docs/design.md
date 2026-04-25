# Block Runner — Design Document

A living document tracking open questions and decisions for the game.

## Concept

Block Runner is a top-down roguelike where every Bitcoin block — from the genesis block onward — is a playable level. Block data drives deterministic level generation: enter a block height, and the same level is reproduced for every player, every time.

## How to use this document

- **Open questions** are listed under each topic. Add notes, options considered, and tradeoffs as we discuss them.
- When a question is resolved, move it to the **Decision** line for that topic and record the date.
- Keep entries short. Link out to longer notes (e.g. mapping-rules.md) when a topic outgrows a few bullet points.

---

## 1. Data source & offline play

**Status:** decided.

**Decided:**
- **Fields per block (A):** `hash`, `bits`, `tx_count`, `timestamp`, `nonce`, `height`. ~50 bytes packed. No `prev_hash` / `merkle_root` / `size` / `weight` / transactions / fees.
- **Fetch strategy (B):** lazy + epoch-aware. Player picks height `N` → IndexedDB lookup → on miss, fetch `/api/v1/blocks/:N` (returns 15 blocks centered on `N`) and cache all 15. Also fetch the epoch retarget block at `floor(N / 2016) * 2016` if not cached. Worst case: 2 round-trips per fresh load.
- **Cache & offline (C):** IndexedDB via `idb-keyval`, keyed by height. Cached blocks never expire (block data is immutable modulo reorgs, which we ignore). Service worker caches the app shell so the game itself loads offline. No bundled starter pack for v1.
- **Chain tip (D):** refresh tip height on app focus or every ~10 min via `/api/v1/blocks/tip/height`. Loading by height is always deterministic. Reorgs ignored — they affect only the most recent ~6 blocks and are rare.
- **Politeness & errors (E):** dedupe in-flight fetches; retry with exponential backoff on network errors (2 retries, 1 s and 3 s); clear UX when a block can't be fetched ("offline + not cached"); always prefer the 15-block batch endpoint over single-block when prefetching.

---

## 2. Mapping rules (block data → level)

**Status:** decided — see `mapping-rules.md` for full details.

**High-level allocation (decided 2026-04-25):**
- `hash` → aesthetics (biome look, palette, enemy appearance, shader effects)
- `difficulty` / `bits` → enemy strength, with non-linear scaling so late blocks stay playable
- `tx_count` → loot quantity + enemy count, via programmatic wave spawning
- `timestamp` → era / lighting flavor
- `nonce` → loot table seed
- `size` / `weight` → **not used** (would require costly level-dimension changes during generation)

**Cross-cutting decisions:**
- Biome shifts every 2016 blocks, mirroring Bitcoin's difficulty retarget epoch.
- Visuals between biomes should be *subtly* different, driven programmatically (shaders, palette swaps) so that 2D sprite asset creation stays minimal.
- Mapping is **opaque** to the player (no in-game "byte 3 → red enemy" tooling). This is also the cheaper design path.

Open sub-topics tracked in `mapping-rules.md`.

---

## 3. Determinism contract

**Status:** decided.

**Decided:**
- **Scope (3a):** layout-only determinism for v1. The generated level — layout, enemy spawns, loot positions, palette, shader — is bit-identical for everyone given the same height + game version. In-game runtime (AI, physics, inputs) is not deterministic. Architecture keeps randomness centralized so full-simulation determinism can be added post-v1 if replays/leaderboards demand it.
- **Versioning (3b):** latest-only. Every release regenerates levels; changelogs call out "balance changed, levels regenerated." Versioned levels and locked-at-v1 alternatives deferred.
- **Engineering rules (3c):**
  - All randomness flows through centralized `Rng` instances seeded from block data (built on `seedrandom`).
  - `Math.random()` banned in generation code, enforced via ESLint `no-restricted-properties`.
  - Generation runs on integer grids; avoid float-fragile math (`Math.sin/cos/sqrt`) in generation paths to dodge cross-browser FP differences. Rendering can use floats freely.
  - Stable iteration: Maps/Arrays in generation, not Sets. No iteration over plain objects in hot paths.
  - Asset versions pinned per release tag.
- **Verification (3d):** CI snapshot test. For a fixed set of heights (0, 1, 100, 2016, 100000, 700000), generate the level, serialize key state (palette HSL, shader index, room layout, enemy positions, loot drops), hash it, and compare to a checked-in expected hash. Any change forces an explicit snapshot bump and signals that the game version should also bump.

---

## 4. Progression model

**Status:** open

**Question:** How does the player engage with 900k+ levels?

**Modes to consider:**
- **Campaign:** play blocks in order from genesis. Long-term goal: reach the tip.
- **Daily challenge:** today's tip block (or yesterday's, to keep it stable).
- **Free select:** enter any height and play.
- **Curated runs:** themed sequences (e.g. "halving blocks," "blocks with the highest fees").

**Sub-questions:**
- Meta-progression across runs? Unlocks tied to block milestones?
- Leaderboards per block height?
- Is "completion" of a block a meaningful concept, and does it persist?

**Decision:** —

---

## 5. Tech stack

**Status:** decided.

**Decided:**
- **Framework:** Phaser 3
- **Language:** TypeScript
- **Target:** web-first. Desktop/mobile builds out of scope for v1.
- **Bundler / dev server:** Vite
- **PRNG library:** `seedrandom` (swap for hand-rolled xoshiro256++ later only if we need zero deps)
- **Block data API:** mempool.space — open, CORS-friendly, no API key
- **Local cache:** IndexedDB via `idb-keyval`
- **Hosting:** any static host (final choice deferred until we have something to deploy)
- **Mod / scripting hooks:** out of v1 scope. May revisit post-launch.

Rationale: web-native, ~1 MB bundle and instant cold-load (critical for "share a link to block N" UX), TypeScript fits the data-mapping logic, WebGL shaders supported for the 5 mood shaders, deploys to any static host without special headers.

---

## 6. Scope for v1

**Status:** open

**Proposed minimum viable slice:**
- One biome
- Three enemy types
- One weapon
- Deterministic generation from a single block hash
- "Load block by height" entry point
- One block playable end-to-end and fun

Once the core loop is fun on one block, scale up biomes / enemies / mechanics.

**Sub-questions:**
- What's the "fun test"? How do we know the core loop works before adding more?
- Do we ship a public demo at v1, or keep it internal?

**Decision:** —

---

## Decisions log

A short, dated list of decisions as they're made. Newest at the top.

- **2026-04-25** — Data source & offline play locked (#1): store only `hash`, `bits`, `tx_count`, `timestamp`, `nonce`, `height` per block (~50 B); lazy + epoch-aware fetching via `/api/v1/blocks/:N` 15-block batches plus epoch retarget block; IndexedDB cache via `idb-keyval` (no expiry) + service worker for app shell; tip height refreshed on focus / 10 min, reorgs ignored; in-flight dedupe + exponential backoff retries + clear offline UX.
- **2026-04-25** — Determinism contract locked (#3): layout-only determinism for v1 (in-game runtime not deterministic, but architecture keeps RNG centralized for future full-sim); latest-only versioning with changelog notes; engineering rules (centralized `Rng`, `Math.random` banned via ESLint, integer-grid generation, stable iteration, pinned asset versions); CI snapshot test on a fixed set of block heights to catch accidental nondeterminism.
- **2026-04-25** — Tech stack fully locked (#5): Phaser 3 + TypeScript, web-first. Vite for build, `seedrandom` for PRNG, mempool.space for block data, `idb-keyval` for IndexedDB cache, static hosting. Mod/scripting hooks deferred past v1.
- **2026-04-25** — `nonce` → loot table biases locked (mapping-rules §5): nonce drives per-block category bias weights (medium strength, 0.5×–2×); per-drop rolls reuse per-block hash bytes 22–25; v1 categories are health, sats, weapons, powerups, passives; in-game currency is "sats"; nonce is hashed to a 32-byte PRNG seed. Mapping-rules doc is now fully closed.
- **2026-04-25** — Timestamp → era / lighting locked (mapping-rules §4): time-of-day from `timestamp % 86400` modulates epoch ambient light on a 24h cycle; subtle vintage post-process fades continuously from genesis to modern; layer order is epoch → time-of-day → era filter, none replaces the others.
- **2026-04-25** — `tx_count` → loot + enemy waves locked (mapping-rules §3): sub-linear scaling with floors/caps for both enemies (6–100) and loot (2–20); kill-based wave trigger with safety timeout; per-block hash bytes 18–29 allocated to wave/loot/enemy-type RNG.
- **2026-04-25** — Difficulty → enemy strength locked (mapping-rules §2): log curve with cap; multi-stat scaling with separate curves (HP 5–8×, damage 2–3×, speed 1.3–1.5× at chain tip); aggression unlocks at discrete thresholds; difficulty = quality, `tx_count` = quantity (no overlap).
- **2026-04-25** — Hash → aesthetics byte allocation locked (mapping-rules §1e): epoch hash bytes 0–13 drive shader/palette/atmosphere (14–31 reserved); per-block hash bytes 0–15 seed layout PRNG, 16–17 drive per-block tint shift (18–31 reserved). Palette uses HSL anchors; 5 shader moods.
- **2026-04-25** — Hash → aesthetics details (mapping-rules §1): epoch seed = first block of epoch; epoch hash drives palette + shader + atmosphere; biome model is hybrid (~5 shader moods × continuous palette); epoch locks shader/palette/atmosphere, per-block hash drives layout + enemy positions + small tint shifts.
- **2026-04-25** — High-level mapping allocation set (see #2): hash → aesthetics; difficulty → enemy strength (non-linear); tx_count → loot + enemy waves; timestamp → era/lighting; nonce → loot table; size/weight unused.
- **2026-04-25** — Biomes change every 2016 blocks (difficulty epoch). Visual variation is programmatic (shaders/palette), not new sprite sets.
- **2026-04-25** — Mapping is opaque to the player.
