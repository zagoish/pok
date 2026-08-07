# Pokémon Splendor

Pokémon Splendor is a private, browser-only prototype reskin of the Splendor board game.

## Overview

- **Private prototype**: no public deployment, no server component. The entire game runs in the browser from static files.
- **Computer players**: three rule-based opponents (`src/ai/chooseAction.ts`) evaluate legal actions by a deterministic scoring policy, with seeded tie-breaking.
- **Assets**: card and trainer artwork is downloaded from the public PokéAPI sprite repository and stored locally under `web/public/assets/pokemon`. Every asset's exact source URL is recorded in `src/data/asset-sources.ts`; `src/data/assets.ts` maps image keys to local paths.

## Commands

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Run tests:

```bash
npm test -- --run
```

Build for production:

```bash
npm run build
```

(Re-)download the PokéAPI artwork into `web/public/assets/pokemon` (optional; assets are already committed):

```bash
npm run download:assets
```
