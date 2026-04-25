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

**Status:** decided.

**Decided:**
- **Modes for v1 (4a):** three modes sharing the same core combat.
  - **Single Block (Free Select):** pick any height, fight that one block, win or die.
  - **Run (Campaign-lite):** pick a starting height, play forward through `N`, `N+1`, `N+2`, …; state carries between blocks; die ends the run.
  - **Daily Challenge:** today's tip block played as Single Block; score logged locally.
  - Deferred: curated themed runs (halving blocks, fee record blocks, etc.), global leaderboards.
- **Run mechanics (4b):**
  - HP, current weapon, and active buffs persist between blocks within a run.
  - Between blocks: brief 3-choice buff screen (e.g. damage trades, +1 max HP, +25% sats drop). Choices are **deterministic to the block** — same options for everyone playing block `N`; player choice creates run-to-run variation.
  - Death → run summary (blocks cleared, sats earned, time alive).
- **Meta-progression (4c):**
  - Sats persist across runs.
  - Unlock starting weapons at sats thresholds (3–5 weapons in v1, including the default).
  - Deferred: characters, cosmetics, passive perks, prestige.
- **Completion tracking (4d):**
  - Per-block "completed" flag in localStorage on first win (any mode).
  - UI surfaces total blocks explored and milestones (first halving cleared, N difficulty epochs cleared, etc.).
- **Leaderboards (4e):** out of v1 (requires backend + anti-cheat). Local "best score per block" only. Post-v1 candidate: shared per-block leaderboards (natural fit since the level is identical for everyone).

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

**Status:** decided.

**Decided — v1.0 launch definition (6a):**

Gameplay:
- 3 modes: Single Block, Run, Daily Challenge
- 4 enemy types (one per aggression tier + a basic)
- 3 starting weapons (unlockable via sats)
- 5 loot categories (health, sats, weapons, powerups, passives)
- Buff system between blocks in Run mode
- Sats persistence + weapon unlocks
- Per-block completion tracking (localStorage)

Visual:
- 5 shader moods × continuous palette space
- Time-of-day modulation
- Era post-process fade
- Atmosphere (fog, particles, ambient light)

Tech:
- Phaser 3 + TS + Vite
- Deterministic generation pipeline + central `Rng`
- mempool.space client + IndexedDB cache via `idb-keyval`
- Service worker for app shell
- ESLint rule banning `Math.random` in generation
- CI snapshot test on fixed block heights
- Deployed to a public URL

**Decided — milestones (6b):**

| # | Milestone | Goal |
|---|---|---|
| M0 | Foundations | Scaffold; mempool.space client; IndexedDB cache; deterministic `Rng`; lint rules |
| M1 | One block, one fight | Deterministic level from one hash; 1 weapon, 1 enemy. Prove the core loop is fun. |
| M2 | Aesthetics layer | 5 shader moods, palette, atmosphere, time-of-day, era filter |
| M3 | Full mapping | Difficulty scaling; waves; loot biases; 5 categories; 4 enemy types with aggression tiers |
| M4 | Run mode | Multi-block runs, persistent state, buff screen, run summary, sats persistence |
| M5 | Polish & launch | Daily Challenge, completion tracking, unlocks, audio, tutorial, snapshot tests, deploy |

M1 is the make-or-break milestone — if the core loop isn't fun on a single block, biome variation can't rescue it.

**Decided — out of v1 (6c):** mod / scripting hooks, curated themed runs, global leaderboards, characters / cosmetics, mobile / desktop builds, reorg handling, bundled starter pack, full-simulation determinism, multiplayer.

**Decided — launch success criteria (6d):**
- 10–20 manually verified representative blocks generate distinct, playable levels
- Snapshot tests green in CI
- Cold load < 3 s on a typical connection
- Run mode survives a 10+ block run without state corruption
- Daily Challenge rolls over correctly at the day boundary

---

## 7. Player character & controls

**Status:** decided.

**Decided:**
- **Twin-stick controls:** WASD to move, mouse to aim, left-click to fire.
- **Mobile fallback:** polite "use desktop" warning. Touch controls out of v1.
- **Default HP:** 100. Baseline enemy hit = 10 dmg.
- **Movement speed:** 5 tiles/sec baseline (16 px tiles → 80 px/sec at zoom 1).
- **Dodge roll on Space:** ~0.3 s duration, ~3 tiles of travel, ~0.4 s iframes during the roll, ~0.8 s cooldown.

---

## 8. Combat feel

**Status:** decided.

**Decided:**
- **Ranged primary**, projectile-based (not hitscan).
- Default starting weapon is ranged; weapon pool may include melee variants as unlocks/pickups.
- **Mouse aim, hold-to-fire** with per-weapon fire rate. No charging mechanics in v1.
- Dodge roll (#7) is the primary defensive tool.

---

## 9. Map / room structure

**Status:** decided.

**Decided:**
- **Single open arena per block.** Player is locked in until all waves are cleared.
- **Fixed arena size:** ~40×30 tiles (640×480 at 16 px tiles).
- **Layout PRNG (per-block hash bytes 0–15) drives:** obstacle placement, enemy spawn-edge selection per wave, loot drop positions. Arena boundary is fixed; interior varies per block.
- **Run mode:** when a block is cleared, the player exits through a portal that loads the next block's arena.

---

## 10. Visual art direction

**Status:** decided.

**Decided:**
- **16×16 pixel art tiles.**
- **Camera zoom:** 2× (32 effective px per tile on screen).
- **Base sprite style:** simple geometric pixel-art silhouettes — readable shapes, minimal interior detail. Shaders + palette do the aesthetic heavy lifting.
- **Animations:** 2–4 frames per state (idle, move, attack, die).

---

## 11. The 5 shader moods (specifically)

**Status:** decided.

**Decided:** five named moods, each implementable as a single fragment shader.

| # | Mood | Effect | Intensity range |
|---|---|---|---|
| 1 | CRT | scanlines + bloom + slight barrel distortion | scanline opacity 0.2–0.6 |
| 2 | Glitch | chromatic aberration + occasional pixel-shift bands | aberration 0–4 px, band frequency 0–0.3 |
| 3 | Watercolor | low-pass blur + color bleeding + paper grain | blur 0–2 px, bleed 0–0.5 |
| 4 | Neon | bloom + saturation boost + bright edge outline | bloom 0–1.0, saturation 1.0–1.6 |
| 5 | Vintage | sepia tint + film grain + vignette | sepia 0–0.6, grain 0–0.4, vignette 0–0.5 |

Intensity comes from byte 1 of the epoch hash, mapped into each mood's specific range.

---

## Decisions log

A short, dated list of decisions as they're made. Newest at the top.

- **2026-04-25** — Five pre-impl topics decided (#7–#11): twin-stick controls (WASD + mouse + Space dodge, 100 HP, 5 tiles/sec); ranged projectile combat with hold-to-fire; single open arena per block (~40×30 tiles, fixed size, PRNG drives obstacles/spawns/loot positions); 16×16 pixel art at 2× zoom with simple silhouettes; 5 named shader moods (CRT, Glitch, Watercolor, Neon, Vintage) with concrete intensity ranges.
- **2026-04-25** — v1 scope locked (#6): launch definition (modes, enemies, weapons, loot, visuals, tech), milestones M0–M5, out-of-scope list, and launch success criteria all set; M1 is the make-or-break gate. Five new pre-impl topics opened (#7 player, #8 combat, #9 map, #10 art direction, #11 shader moods).
- **2026-04-25** — Progression model locked (#4), full v1: three modes — Single Block (free select), Run (multi-block campaign-lite with persistent HP/weapons/buffs and a 3-choice buff screen between blocks), Daily Challenge; sats persist across runs and unlock 3–5 starting weapons; per-block completion flag in localStorage; leaderboards deferred to post-v1.
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
