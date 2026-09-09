# ANTAVID v0.21

ANTAVID is an evidence-first market-intelligence research preview with a persistent paper-trading journal.

## Interface direction

Version 0.21 restores the identity and navigation model of the original v19 prototype: compact market terminal, scrolling ticker, dedicated Oil/Gold/Crypto/Food tabs, detailed signal panels, charts, RSI, analytical context, paper trading, journal and educational help. Polish is the default language and the PL/EN control switches the complete interface. Amateur/Pro mode is retained as a presentation preference.

## Current status

This repository intentionally starts in **DEMO DATA** mode. The included scenarios are deterministic interface fixtures—not current market prices, forecasts, or investment recommendations. Unknown instruments never receive generated estimates.

## What changed from the v19 prototype

- Removed random OHLC, RSI, sparklines, search estimates and hard-coded “LIVE” claims.
- Added explicit data provenance and operating mode.
- Added a validated snapshot contract and fail-safe demo fallback.
- Reframed signals as conditional scenarios with horizon, trigger and invalidation.
- Rebuilt paper trading with persistence, input validation, spread, commission, correct short P&L and a 2% planned-risk ceiling.
- Added responsive, accessible navigation and rendering that avoids injecting backend text as HTML.
- Added automated tests and a GitHub Actions quality gate.

## Run locally

Serve the repository with any static HTTP server, for example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Live data contract

Set `globalThis.ANTAVID_API_ENDPOINT` before loading `src/app.js`. The endpoint must return the schema represented by `DEMO_SNAPSHOT` in `src/data.js`. Production work still requires server-side schema validation, licensed market data, immutable signal storage, freshness SLAs and out-of-sample model evidence.

## Production gates

1. Licensed and timestamped price/news providers.
2. Server-side validation and immutable input snapshots.
3. Deterministic feature pipeline using the same candles displayed to users.
4. Walk-forward and out-of-sample evaluation including fees, spread and slippage.
5. Probability calibration before any probability or confidence claims.
6. Independent security, methodology and Netherlands/EU compliance review.

ANTAVID does not execute orders and does not provide personalized investment advice.
