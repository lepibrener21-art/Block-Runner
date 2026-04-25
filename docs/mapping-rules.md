# Mapping Rules — Block Data → Level

Detailed working doc for how Bitcoin block fields drive level generation. Companion to `design.md` §2.

Each section follows the same shape: **decided** items at the top, **open** items below. Move bullets up as decisions are made.

---

## Overview

| Field | Drives | Status |
|---|---|---|
| `hash` | aesthetics: biome look, palette, enemy appearance, shaders | in progress |
| `difficulty` / `bits` | enemy strength (non-linear scaling) | open |
| `tx_count` | loot quantity, enemy count, wave structure | open |
| `timestamp` | era / lighting flavor | open |
| `nonce` | loot table seed | open |
| `size` / `weight` | _not used_ | decided |

---

## 1. Hash → aesthetics

The hash is the main randomness source for everything visual.

**Decided:**
- Biome epoch = 2016 blocks (difficulty retarget window).
- Variation between biomes is subtle and programmatic — no new sprite sets per biome. Shaders and palette swaps do the heavy lifting.
- Mapping is opaque to the player.

**Open sub-questions:**

### 1a. Epoch seed source
What seeds the per-epoch biome look?
- Option A: hash of the **first block** of the epoch (the retarget block, height % 2016 == 0). Simple, stable, naturally framed as "this epoch's identity."
- Option B: hash of all 2016 block hashes concatenated. More entropy, but no real benefit if we already have 256 bits.

### 1b. Aesthetic dimensions to drive
Which visual layers does the epoch hash control?
- Palette (background, tiles, accent colors)
- Tile shader (e.g. CRT, glitch, watercolor, neon outline)
- Atmosphere (fog density, particle color/density, ambient light)
- Enemy color tint / sprite-variant selection
- Music / SFX theme (probably out of scope for v1)

### 1c. Biome theme model
How structured are the biomes?
- Option A: **fully continuous** — one base tile set; epoch hash picks a point in continuous palette + shader space. Maximum variety, minimum assets.
- Option B: **~5–10 named themes** (e.g. cyber, organic, crystal, void, ruins) chosen by epoch hash, with continuous palette variation within each theme.
- Option C: hybrid — a small set of shader "moods" × continuous palette space.

### 1d. Per-block variation within an epoch
What shifts block-to-block within the same biome?
- Likely: enemy/loot positions, specific tints, layout seed, tile-pattern variation.
- Likely fixed for the epoch: shader, palette family, atmosphere style.

### 1e. Hash-byte allocation (internal)
We need a clear internal allocation so different aesthetic systems pull from independent slices of the hash. Sketch (refine after 1a–1d):
- bytes 0–3: palette seed
- bytes 4–7: shader/mood selection
- bytes 8–11: atmosphere parameters
- bytes 12–15: enemy tint / variant
- remaining bytes: layout / per-block randomness

---

## 2. Difficulty / bits → enemy strength

**Decided:**
- Scaling is non-linear — late blocks must stay playable.

**Open sub-questions:**
- Curve shape: log scale on raw difficulty? Normalized within an epoch? Capped above some height?
- Which stats does it scale: HP, damage, speed, behavior aggression?
- Does difficulty also affect enemy *count*, or is that strictly `tx_count`'s job?

---

## 3. tx_count → loot + enemy waves

**Decided:**
- Drives loot quantity and enemy count.
- Enemies spawn in waves, structure determined programmatically.

**Open sub-questions:**
- How is wave structure derived from `tx_count`? (e.g. number of waves, enemies per wave, time between waves)
- Cap on max enemies per level? Modern blocks can have 3000+ txs.
- How is loot quantity bounded so it doesn't trivialize the run?

---

## 4. timestamp → era / lighting

**Open sub-questions:**
- Time-of-day mapping (timestamp → 24h cycle position)?
- Era flavoring tied to year (e.g. 2009 = "early days" visual treatment)?
- Interaction with epoch shader/atmosphere — who wins if they conflict?

---

## 5. nonce → loot table

**Open sub-questions:**
- Does nonce pick the *table* (which items can drop) or the *roll* (what actually drops)?
- Interaction with `tx_count` (quantity) — clear separation of concerns?

---

## 6. size / weight — not used

**Decided:** unused. Changing level dimensions per block adds significant generator complexity without clear gameplay payoff.

May revisit if we later want optional "epic" levels for unusually large blocks.
