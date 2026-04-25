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

**Status:** open

**Question:** Where does block data come from at runtime, and how much do we need?

**Options to consider:**
- Public APIs: mempool.space, blockstream.esplora, bitcoin core RPC.
- Bundle headers with the game (~80 bytes × ~900k blocks ≈ 70 MB).
- Cache on first fetch, fall back to bundled data when offline.

**Sub-questions:**
- Which fields do we actually need per block? Candidates: `hash`, `prev_hash`, `merkle_root`, `timestamp`, `nonce`, `bits`/difficulty, `tx_count`, `size`, `weight`.
- Do we need any per-transaction data, or are headers enough?
- How do we handle the chain tip advancing while a player is mid-run?

**Decision:** —

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

**Status:** open

**Question:** What guarantees do we make about reproducibility?

**Constraints implied:**
- Seeded PRNG everywhere — no `Math.random()`, no time-based seeds.
- Fixed iteration order over sets/maps (avoid hash-order nondeterminism).
- Asset versions pinned per game version: a level on v1.0 may differ on v2.0, but within a version it's identical for everyone.
- Physics/AI must be deterministic *for level generation*; in-run player actions can stay non-deterministic.

**Sub-questions:**
- Do we version levels (block height + game version) so old runs are reproducible after updates?
- Is enemy AI itself deterministic (replayable runs), or only the level layout?

**Decision:** —

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
