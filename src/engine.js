export const STARTING_CASH = 10_000;
export const MAX_RISK_FRACTION = 0.02;

export function percentChange(price, previous) {
  if (![price, previous].every(Number.isFinite) || previous <= 0) return null;
  return ((price - previous) / previous) * 100;
}

export function calculateRsi(closes, period = 14) {
  if (!Array.isArray(closes) || closes.length <= period) return null;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i += 1) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) gains += delta; else losses -= delta;
  }
  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - (100 / (1 + rs));
}

export function createPaperTrade({ instrument, side, allocation, stopPercent, thesis, equity, now = new Date() }) {
  const amount = Number(allocation), stop = Number(stopPercent);
  if (!instrument || !["LONG", "SHORT"].includes(side)) throw new Error("Invalid instrument or direction.");
  if (!Number.isFinite(amount) || amount < 10 || amount > equity) throw new Error("Allocation must be between $10 and available equity.");
  if (!Number.isFinite(stop) || stop < 0.1 || stop > 25) throw new Error("Stop distance must be between 0.1% and 25%.");
  if (typeof thesis !== "string" || thesis.trim().length < 12) throw new Error("Trading thesis must contain at least 12 characters.");
  const plannedRisk = amount * stop / 100;
  if (plannedRisk > equity * MAX_RISK_FRACTION) throw new Error("Planned loss exceeds 2% of portfolio equity.");
  const halfSpread = (instrument.spreadBps || 0) / 20_000;
  const entry = instrument.price * (side === "LONG" ? 1 + halfSpread : 1 - halfSpread);
  const quantity = amount / entry;
  return {
    id: globalThis.crypto?.randomUUID?.() || `paper-${now.getTime()}`,
    symbol: instrument.symbol, name: instrument.name, side, allocation: amount, quantity,
    entry, stopPercent: stop, plannedRisk, thesis: thesis.trim(),
    spreadBps: instrument.spreadBps || 0, commissionBps: instrument.commissionBps || 0,
    openedAt: now.toISOString(), status: "OPEN"
  };
}

export function markToMarket(trade, marketPrice) {
  if (!Number.isFinite(marketPrice) || marketPrice <= 0) throw new Error("Invalid market price.");
  const halfSpread = trade.spreadBps / 20_000;
  const exit = marketPrice * (trade.side === "LONG" ? 1 - halfSpread : 1 + halfSpread);
  const gross = trade.side === "LONG" ? trade.quantity * (exit - trade.entry) : trade.quantity * (trade.entry - exit);
  const commissions = trade.allocation * trade.commissionBps / 10_000 * 2;
  return { exit, pnl: gross - commissions };
}

export function portfolioMetrics(state, instruments) {
  const bySymbol = new Map(instruments.map((item) => [item.symbol, item]));
  const openPnl = state.trades.filter((t) => t.status === "OPEN").reduce((sum, trade) => {
    const instrument = bySymbol.get(trade.symbol);
    return sum + (instrument ? markToMarket(trade, instrument.price).pnl : 0);
  }, 0);
  const realizedPnl = state.trades.filter((t) => t.status === "CLOSED").reduce((sum, t) => sum + t.realizedPnl, 0);
  const openRisk = state.trades.filter((t) => t.status === "OPEN").reduce((sum, t) => sum + t.plannedRisk, 0);
  return { openPnl, realizedPnl, openRisk, equity: STARTING_CASH + realizedPnl + openPnl };
}
