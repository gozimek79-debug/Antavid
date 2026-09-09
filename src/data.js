export const DEMO_SNAPSHOT = {
  schemaVersion: 1,
  mode: "DEMO",
  generatedAt: "2026-09-08T20:00:00.000Z",
  source: "ANTAVID deterministic interface fixture",
  methodologyVersion: "research-preview-0.20",
  instruments: [
    {
      symbol: "BTC-USD", name: "Bitcoin", assetClass: "Crypto spot", currency: "USD",
      price: 61240, previousClose: 60320, spreadBps: 8, commissionBps: 10,
      candles: [58410,58680,59020,58770,59420,59810,59640,60220,60710,60480,60920,61240],
      rsi14: 58.4,
      signal: { id: "DEMO-BTC-001", direction: "BULLISH", horizon: "3–7 days", evidenceScore: 68,
        trigger: "Close above $61,600", invalidation: "Close below $58,900",
        summary: "Demo scenario: improving momentum, conditional on a confirmed breakout.",
        drivers: ["Momentum improving", "Breakout unconfirmed", "High volatility"] }
    },
    {
      symbol: "XAU-USD", name: "Gold spot", assetClass: "Commodity spot", currency: "USD",
      price: 3652.4, previousClose: 3668.1, spreadBps: 3, commissionBps: 5,
      candles: [3598,3612,3605,3628,3641,3634,3659,3670,3662,3678,3668,3652.4],
      rsi14: 51.1,
      signal: { id: "DEMO-XAU-001", direction: "NEUTRAL", horizon: "5–15 days", evidenceScore: 47,
        trigger: "Close above $3,680", invalidation: "Close below $3,610",
        summary: "Demo scenario: price remains inside a defined range; no active setup.",
        drivers: ["Range-bound", "Mixed momentum", "Wait for confirmation"] }
    },
    {
      symbol: "BRENT", name: "Brent crude", assetClass: "Commodity reference", currency: "USD",
      price: 79.12, previousClose: 78.44, spreadBps: 6, commissionBps: 8,
      candles: [76.1,76.8,77.3,76.9,77.6,78.2,77.9,78.5,78.1,78.7,78.44,79.12],
      rsi14: 62.7,
      signal: { id: "DEMO-BRENT-001", direction: "BULLISH", horizon: "2–8 days", evidenceScore: 63,
        trigger: "Close above $79.40", invalidation: "Close below $77.20",
        summary: "Demo scenario: upward pressure exists, but the trigger has not been confirmed.",
        drivers: ["Positive momentum", "Event-sensitive", "Trigger pending"] }
    },
    {
      symbol: "ZW", name: "Wheat", assetClass: "Futures reference", currency: "US cents/bushel",
      price: 582.25, previousClose: 588.5, spreadBps: 12, commissionBps: 10,
      candles: [604,601,598,602,596,592,594,589,591,586,588.5,582.25],
      rsi14: 37.9,
      signal: { id: "DEMO-ZW-001", direction: "BEARISH", horizon: "5–20 days", evidenceScore: 65,
        trigger: "Close below 580¢", invalidation: "Close above 596¢",
        summary: "Demo scenario: declining structure; confirmation is required below support.",
        drivers: ["Weak structure", "Near support", "Contract details required"] }
    }
  ]
};

export function validateSnapshot(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.instruments)) return false;
  if (!["LIVE", "DELAYED", "DEMO"].includes(value.mode)) return false;
  if (!Number.isFinite(Date.parse(value.generatedAt))) return false;
  return value.instruments.every((item) =>
    typeof item.symbol === "string" && item.symbol.length > 0 &&
    Number.isFinite(item.price) && item.price > 0 &&
    Number.isFinite(item.previousClose) && item.previousClose > 0 &&
    Array.isArray(item.candles) && item.candles.length >= 2 && item.candles.every(Number.isFinite) &&
    item.signal && typeof item.signal.id === "string" &&
    ["BULLISH", "NEUTRAL", "BEARISH", "UNAVAILABLE"].includes(item.signal.direction)
  );
}
