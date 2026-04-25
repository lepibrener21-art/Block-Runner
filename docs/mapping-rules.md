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

- **Byte allocation:** see tables below.

### Epoch hash (32 bytes) — per-epoch identity

| Bytes | Drives | Notes |
|---|---|---|
| 0 | Shader mood index | `byte % 5` picks 1 of 5 shaders. |
| 1 | Shader intensity | 0–255 → per-mood intensity range. |
| 2–7 | Palette | Two HSL anchor points (3 bytes each: H, S, L) defining the epoch's color gradient. |
| 8 | Fog density | 0–255 → 0.0–1.0. |
| 9 | Particle density | 0–255 → particles per screen. |
| 10–11 | Particle hue + saturation | Tinted relative to palette. |
| 12 | Ambient light tone | Cool ↔ warm. |
| 13 | Ambient light intensity | Dim ↔ bright. |
| 14–31 | _reserved_ | Headroom for future epoch-level features. |

### Per-block hash (32 bytes) — per-level variation within the epoch

| Bytes | Drives | Notes |
|---|---|---|
| 0–15 | Layout PRNG seed | 128 bits feeds the level generator. |
| 16–17 | Per-block palette tint shift | ≤10° hue, ≤10% saturation nudge from the epoch palette. |
| 18–31 | _reserved_ | Headroom for downstream subsystems. |

Section 1 closed. Move on to §2.

---

## 2. Difficulty / bits → enemy strength

**Decided:**
- Scaling is non-linear — late blocks must stay playable.
- **Curve shape:** logarithmic with a cap. Generic form: `mult = min(cap, 1 + log10(difficulty) * k)`. Stays playable indefinitely even as difficulty grows.
- **Multi-stat scaling with different curves** so combat doesn't degrade into a bullet-sponge fight:
  - HP scales the most.
  - Damage scales moderately.
  - Speed scales mildly.
  - Aggression / behavior unlocks at discrete thresholds (e.g. dodging at one tier, ranged attacks at another).
- **Separation of concerns:** difficulty drives **quality** (per-enemy strength). `tx_count` drives **quantity** (count + waves). No overlap.

**Target ceiling at chain tip (~difficulty 10¹⁴):**

| Stat | Multiplier at tip | Implied `k` (with cap) |
|---|---|---|
| HP    | 5–8×    | ~0.5  (cap 8×)  |
| Damage | 2–3×   | ~0.15 (cap 3×)  |
| Speed | 1.3–1.5× | ~0.035 (cap 1.5×) |

Exact `k` values and aggression thresholds will be tuned in playtesting; the framework above is the design contract.

**Open sub-questions:** none.

---

## 3. tx_count → loot + enemy waves

**Decided:**
- Drives loot quantity and enemy count.
- Enemies spawn in waves, structure determined programmatically.
- **Total enemies per level:** `total = clamp(6, 100, 4 × √tx_count)`. Sub-linear with floor (genesis-era still has a real fight) and cap (modern blocks aren't enemy floods).
- **Wave count:** `waves = clamp(2, 8, ceil(log2(total / 5)))`, enemies spread evenly across waves.
- **Wave trigger:** kill-based — next wave spawns when ≥80% of current wave is dead. 30 s safety timeout in case the wave stalls.
- **Loot drops per level:** `loot = clamp(2, 20, √tx_count / 2)`. Same sub-linear shape as enemy count.
- **Hash byte allocation** (from per-block hash reserved space):

| Bytes | Drives |
|---|---|
| 18–21 | Wave-spawn positions and timing jitter |
| 22–25 | Loot drop positions |
| 26–29 | Enemy-type selection within each wave |
| 30–31 | _reserved_ |

Specific tuning numbers (the constants in the formulas) will be revisited in playtesting.

**Open sub-questions:** none.

---

## 4. timestamp → era / lighting

**Decided:**
- **Time-of-day:** `tod = (timestamp % 86400) / 86400` → 0..1 mapped onto a 24h lighting cycle (midnight = deep blue/dim, sunrise = warm orange, noon = neutral/bright, sunset = red-orange/warm). Adds per-block flavor orthogonal to the epoch palette.
- **Era flavoring:** subtle vintage post-process (faint grain / desaturation / CRT scanlines) whose intensity fades continuously from genesis to modern blocks.
- **Layer order** (weakest → strongest):
  1. Epoch (§1) — base palette, fog, particles, ambient light tone & intensity.
  2. Time-of-day — global directional warm/cool lighting modulator on top.
  3. Era filter — post-process pass on the final image.
- Time-of-day **modulates** the epoch's ambient light; it does not replace it. Each axis adds independent flavor, none overrides the others.
- Era intensity is a **continuous fade** based on years since genesis (no abrupt jumps between adjacent blocks).

**Open sub-questions:** none.

---

## 5. nonce → loot table

**Open sub-questions:**
- Does nonce pick the *table* (which items can drop) or the *roll* (what actually drops)?
- Interaction with `tx_count` (quantity) — clear separation of concerns?

---

## 6. size / weight — not used

**Decided:** unused. Changing level dimensions per block adds significant generator complexity without clear gameplay payoff.

May revisit if we later want optional "epic" levels for unusually large blocks.
