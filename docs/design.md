# Block Runner — Active Design

Top-down roguelike where every Bitcoin block is a deterministic, playable level.

**References**
- [`mapping-rules.md`](mapping-rules.md) — block-data → level spec (byte allocations, curves)
- [`archive.md`](archive.md) — closed decisions, milestone history, full decisions log

## Current milestone — M3 (full mapping)

| # | Piece | Status |
|---|---|---|
| M3.1 | Difficulty scaling (`block.bits` → enemy HP/damage/speed log curves) | ✅ shipped — see `src/game/difficulty.ts` |
| M3.2 | 4 enemy types + aggression tiers (gated by `log10(difficulty)` thresholds; per-wave selection from per-block hash bytes 26–29) | ⏭ next |
| M3.3 | Loot system + nonce biases (5 categories: health, sats, weapons, powerups, passives; drops on enemy death from per-block hash bytes 22–25; nonce drives per-block category bias) | ⏭ |
| M3.4 | Doc sync + tuning pass | ⏭ |

## After M3

- **M4 — Run mode**: multi-block runs, persistent state, 3-choice buff screen, sats persistence, weapon unlocks.
- **M5 — Polish & launch**: Daily Challenge, completion tracking, audio, tutorial, snapshot tests, deploy.

Closed milestones (M0 foundations, M1 one-block-one-fight, M1.5 polish + early extras, M2 aesthetics layer): see archive.

## Open questions / pending decisions

_None._

## Conventions

- Docs to update on a feature change: this `design.md` (move pieces between Pending and Shipped), `archive.md` (only when something fully closes), `mapping-rules.md` (only if the byte-level spec changes).
- Decisions log lives in `archive.md`; append newest at the top.
- Snapshot-tested deterministic outputs (level generator, visuals) require coordinated test updates whenever derive logic changes.
