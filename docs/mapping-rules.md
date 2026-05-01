# Mapping Rules — Block Data → Level

The byte-level spec for how Bitcoin block fields drive level generation. All rules below are decided; this doc is the active reference for anything that maps block data to mechanics. For project state and milestone progress, see [`design.md`](design.md). For closed decisions and history, see [`archive.md`](archive.md).

---

## Overview

| Field | Drives | Status |
|---|---|---|
| `hash` | aesthetics: biome look, palette, enemy appearance, shaders | decided |
| `difficulty` / `bits` | enemy strength (non-linear scaling) | decided |
| `tx_count` | loot quantity, enemy count, wave structure | decided |
| `timestamp` | era / lighting flavor | decided |
| `nonce` | loot table biases | decided |
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

- **Byte allocation:** see tables below. Bitcoin block hashes have several leading zero bytes (the proof-of-work property), so the byte indices below address **entropy-uniform bytes derived from the hash via the central `Rng`** — same input → same 32 bytes, but the distribution is flat. Reading the raw hash directly would pin every visual subsystem (shader mood, intensity, palette anchor A) to zero.

### Epoch hash (32 bytes) — per-epoch identity

| Bytes | Drives | Notes |
|---|---|---|
| 0 | Shader mood index | `byte % 5` picks 1 of 5 shaders. |
| 1 | Shader intensity | 0–255 → per-mood intensity range. |
| 2–7 | Palette | Two HSL anchor points (3 bytes each: H, S, L) defining the epoch's color gradient. |
| 8 | Fog density | 0–255 → 0.0–1.0. |
| 9 | Particle density | 0–255 → 8–80 particles alive at a time, drifting across the arena with a sine-faded alpha. Coloured by bytes 10–11 (particle hue + saturation) on top of the accent-derived base. |
| 10–11 | Particle hue + saturation | Tinted relative to palette. Byte 10 nudges the particle hue ±20° from the accent-derived base; byte 11 nudges saturation ±0.15. |
| 12 | Ambient light tone | Cool ↔ warm. |
| 13 | Ambient light intensity | Dim ↔ bright. |
| 14–31 | _reserved_ | Headroom for future epoch-level features. |

### Per-block hash (32 bytes) — per-level variation within the epoch

| Bytes | Drives | Notes |
|---|---|---|
| 0–15 | Layout PRNG seed | 128 bits feeds the level generator. |
| 16–17 | Per-block palette tint shift | ≤10° hue, ≤10% saturation nudge from the epoch palette. |
| 18–31 | _reserved_ | Headroom for downstream subsystems. |

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

**Tuned ceiling at chain tip (~difficulty 10¹⁴):**

| Stat | `k` | Cap | Mid-chain feel (block ~100k, ld ≈ 4) |
|---|---|---|---|
| HP    | 0.35  | 6×    | ~2.4× |
| Damage | 0.12  | 2.5×  | ~1.5× |
| Speed | 0.025 | 1.4×  | ~1.10× |

Caps land in the 5–8× / 2–3× / 1.3–1.5× ranges originally agreed in the design contract. The lower-half choice was made post-shipment when mid-chain felt too steep and tip-area blocks were unplayable solo before player upgrades land (loot in M3.3, weapons in M4).

**Aggression-tier unlocks (M3.2):**

| Tier | `log10(difficulty)` ≥ | Unlocked types |
|---|---|---|
| 0 | 0 (genesis) | chaser |
| 1 | 4 (~block 100k era) | chaser, dasher |
| 2 | 8 (~mid-2014) | chaser, dasher, **shooter** (Phase B) |
| 3 | 12 (~2019+) | chaser, dasher, shooter, **orbiter** (Phase B) |

Per-wave type selection is deterministic per `(block hash, tier)`: a labeled `Rng.fromHex('enemy-types:<blockHash>')` stream picks one of the unlocked types per spawn, uniform across the available set. Independent of the layout / wave-spawn streams.

**Shipped (M3.1):** `src/game/difficulty.ts` derives `log10(difficulty)` directly from `block.bits` (compact target encoding) without ever materialising the huge integer target — `targetLog10 = log10(mantissa) + 8 × (exponent − 3) × log10(2)`, and `log10(difficulty) = log10(maxTarget) − targetLog10`. From there, `difficultyMultipliers(bits)` returns `{ hp, damage, speed }` capped per the table above. `Enemy.applyDifficulty(mults)` rounds HP and damage to integers and scales speed; `ArenaScene.spawnWave` computes the multiplier triple once per wave from `block.bits` and applies it to every enemy spawned in that wave.

**Shipped (M3.2):** `src/game/enemy-spec.ts` exposes `aggressionTier(ld)`, `availableEnemyTypes(tier)`, and `pickEnemyTypes(blockHash, tier, count)`. `Enemy` has an `enemyType` field and a unified `tick(time, targetX, targetY)` that branches behaviour. **Chaser:** straight-line approach. **Dasher:** walks at 55 % speed; every 3 s captures the player's current direction and dashes for 0.4 s at 3.5 × speed — telegraphed and dodgeable. **Shooter:** moves at 70 % speed, holds a 110–170 px gap from the player (advances if too far, retreats if too close, otherwise still), fires an aimed projectile every 2 s. **Orbiter:** moves at 110 % speed, follows a tangential orbit at 130 px with a radial spring pulling it back to the ring, fires an aimed projectile every 2.5 s. Each type has its own silhouette: square chaser, triangle dasher, diamond shooter, circle orbiter. Enemy bullets are a new entity (`EnemyBullet`) with their own group, depth, and tinted halo (orange-red so they read as danger); they collide with walls (despawn) and overlap the player (apply damage and despawn). Bullet damage is taken from the firing enemy's `contactDamage` at the moment of fire so it scales with difficulty alongside everything else.


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

**Shipped (M2 phase 2):**
- **Time-of-day:** interpolates between four anchor stops over the day (midnight 220° / s 0.55 / l 0.15 / α 0.35 → sunrise 25° / s 0.65 / l 0.50 / α 0.22 → noon 60° / s 0.15 / l 0.90 / α 0.06 → sunset 12° / s 0.65 / l 0.45 / α 0.22 → wraps back to midnight). Renders as a screen-tint rectangle at depth 70, above particles (60), below the HUD camera, on top of which the active mood shader runs.
- **Era post-process:** continuous linear fade — `intensity = clamp(0, 1, 1 − years_since_genesis / 17)`, so genesis = 1.0, 2017.5 ≈ 0.5, 2026+ = 0. Implemented as a second post-FX pipeline on the camera, run *after* the active mood shader, so the layer order is epoch base → time-of-day overlay → mood shader → era filter. The era pipeline applies a cream-toned wash on luminance, mild desaturation, animated film grain, faint horizontal scanlines, and a soft vignette — each effect scaled by `intensity` so modern blocks are untouched and old blocks read clearly aged.


---

## 5. nonce → loot table

**Decided:**
- **What it drives:** per-block bias weights across item categories (the "table"), giving each block a deterministic loot identity.
- **Per-drop selection:** reuses per-block hash bytes 22–25 — those bytes already place each loot slot and now also pick the specific item rolled at that slot.
- **Item categories (v1):**
  - Health pickups — restore HP
  - Currency (**sats**) — meta-currency for between-run upgrades
  - Weapons — temporary weapon swap / upgrade
  - Powerups — temporary buff (speed, damage, etc.)
  - Passive items — rare permanent run modifier
- **Bias strength:** medium — category weights range 0.5×–2×. Noticeable lean per block, no block ever lacks essentials.
- **Nonce expansion:** hash the 4-byte nonce to expand it into a 32-byte PRNG seed; treat it like any other deterministic seed downstream.

**Clean three-way split for loot:**
- §3 `tx_count` → quantity (how many drops)
- per-block hash bytes 22–25 → position + per-drop roll
- §5 nonce → table biases (which categories this block leans toward)


---

## 6. size / weight — not used

**Decided:** unused. Changing level dimensions per block adds significant generator complexity without clear gameplay payoff.

May revisit if we later want optional "epic" levels for unusually large blocks.
