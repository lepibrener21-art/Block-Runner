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
- **Epoch seed source:** hash of the first block of the epoch (height where `height % 2016 == 0`).
- **Aesthetic dimensions driven by the epoch hash:** palette, shader (mood), atmosphere. (Enemy tints and music deferred.)
- **Biome theme model:** hybrid — a small set of shader "moods" (target ~5) × continuous palette space.
- **Per-block variation within an epoch:** epoch locks shader, palette family, and atmosphere; per-block hash varies layout, enemy positions, and small tint shifts.

**Open sub-questions:**

### 1e. Hash-byte allocation (internal)
Two separate inputs — the **epoch hash** (first block of the epoch) and the **per-block hash** (the block being played) — each need a documented byte-slice allocation so independent visual systems pull from independent bits.

See proposal in discussion; record table here once agreed.

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
