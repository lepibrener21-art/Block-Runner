# Block Runner

A top-down roguelike where every Bitcoin block — from the genesis block onward — is a deterministic, playable level.

Block data drives level generation. Enter a block height, and the same level is reproduced for every player.

## Design

- Living design doc: [`docs/design.md`](docs/design.md)
- Block-data → level mapping rules: [`docs/mapping-rules.md`](docs/mapping-rules.md)

## Quick start

```sh
npm install
npm run dev        # start Vite dev server on http://localhost:5173
npm run build      # production build to dist/
npm run lint       # ESLint (bans Math.random in src/)
npm run typecheck  # TypeScript strict check
npm test           # Vitest suite
```

## Status

Pre-alpha. Currently at milestone **M0 — Foundations**: project scaffold, deterministic `Rng`, mempool.space client, IndexedDB cache. No gameplay yet.
