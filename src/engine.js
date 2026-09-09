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

export function createPaperTrade({
  instrument, side, allocation, stopPercent, targetPercent, thesis,
  equity, availableCash = equity, existingOpenRisk = 0, now = new Date()
}) {
  const amount = Number(allocation), stop = Number(stopPercent), target = Number(targetPercent);
  if (!instrument || !["LONG", "SHORT"].includes(side)) throw new Error("Invalid instrument or direction.");
  if (!Number.isFinite(amount) || amount < 10 || amount > availableCash) throw new Error("Allocation must be between $10 and available cash.");
  if (!Number.isFinite(stop) || stop < 0.1 || stop > 25) throw new Error("Stop distance must be between 0.1% and 25%.");
  if (!Number.isFinite(target) || target < 0.2 || target > 100) throw new Error("Target distance must be between 0.2% and 100%.");
  if (typeof thesis !== "string" || thesis.trim().length < 12) throw new Error("Trading thesis must contain at least 12 characters.");
  if (!Number.isFinite(equity) || equity <= 0) throw new Error("Portfolio equity is invalid.");
  const halfSpread = (instrument.spreadBps || 0) / 20_000;
  const entry = instrument.price * (side === "LONG" ? 1 + halfSpread : 1 - halfSpread);
  const quantity = amount / entry;
  const stopPrice = entry * (side === "LONG" ? 1 - stop / 100 : 1 + stop / 100);
  const targetPrice = entry * (side === "LONG" ? 1 + target / 100 : 1 - target / 100);
  const draft = {
    id: globalThis.crypto?.randomUUID?.() || `paper-${now.getTime()}`,
    symbol: instrument.symbol, name: instrument.name, side, allocation: amount, quantity,
    entry, stopPercent: stop, targetPercent: target, stopPrice, targetPrice,
    spreadBps: instrument.spreadBps || 0, commissionBps: instrument.commissionBps || 0,
    openedAt: now.toISOString(), status: "OPEN"
  };
  const plannedRisk = Math.abs(Math.min(0, markToMarket(draft, stopPrice).pnl));
  const plannedReward = Math.max(0, markToMarket(draft, targetPrice).pnl);
  if (existingOpenRisk + plannedRisk > equity * MAX_RISK_FRACTION + 1e-8) throw new Error("Total planned loss exceeds 2% of portfolio equity.");
  return {...draft, plannedRisk, plannedReward, riskReward:plannedRisk ? plannedReward / plannedRisk : 0, thesis:thesis.trim()};
}

export function markToMarket(trade, marketPrice) {
  if (!Number.isFinite(marketPrice) || marketPrice <= 0) throw new Error("Invalid market price.");
  const halfSpread = (trade.spreadBps || 0) / 20_000;
  const exit = marketPrice * (trade.side === "LONG" ? 1 - halfSpread : 1 + halfSpread);
  const gross = trade.side === "LONG" ? trade.quantity * (exit - trade.entry) : trade.quantity * (trade.entry - exit);
  const commissions = trade.allocation * (trade.commissionBps || 0) / 10_000 * 2;
  return { exit, pnl: gross - commissions };
}

export function exitReasonAtPrice(trade, marketPrice) {
  if (trade.status !== "OPEN" || !Number.isFinite(trade.stopPrice) || !Number.isFinite(trade.targetPrice)) return null;
  if (trade.side === "LONG") {
    if (marketPrice <= trade.stopPrice) return "STOP";
    if (marketPrice >= trade.targetPrice) return "TARGET";
  } else {
    if (marketPrice >= trade.stopPrice) return "STOP";
    if (marketPrice <= trade.targetPrice) return "TARGET";
  }
  return null;
}

export function settleTrade(trade, marketPrice, reason = "MANUAL", now = new Date()) {
  if (!trade || trade.status !== "OPEN") throw new Error("Only an open trade can be closed.");
  const result = markToMarket(trade, marketPrice);
  return {...trade, status:"CLOSED", exit:result.exit, realizedPnl:result.pnl, closedAt:now.toISOString(), exitReason:reason};
}

export function settleTriggeredTrades(state, instruments, now = new Date()) {
  const bySymbol = new Map(instruments.map((item) => [item.symbol, item]));
  let changed = false;
  const trades = state.trades.map((trade) => {
    const instrument = bySymbol.get(trade.symbol);
    const reason = instrument ? exitReasonAtPrice(trade, instrument.price) : null;
    if (!reason) return trade;
    changed = true;
    return settleTrade(trade, instrument.price, reason, now);
  });
  return {state:{...state, trades}, changed};
}

export function portfolioMetrics(state, instruments) {
  const trades = Array.isArray(state?.trades) ? state.trades : [];
  const bySymbol = new Map(instruments.map((item) => [item.symbol, item]));
  const openTrades = trades.filter((trade) => trade.status === "OPEN");
  const closedTrades = trades.filter((trade) => trade.status === "CLOSED");
  const openPnl = openTrades.reduce((sum, trade) => {
    const instrument = bySymbol.get(trade.symbol);
    return sum + (instrument ? markToMarket(trade, instrument.price).pnl : 0);
  }, 0);
  const realizedPnl = closedTrades.reduce((sum, trade) => sum + (Number(trade.realizedPnl) || 0), 0);
  const openRisk = openTrades.reduce((sum, trade) => sum + (Number(trade.plannedRisk) || 0), 0);
  const reservedCapital = openTrades.reduce((sum, trade) => sum + (Number(trade.allocation) || 0), 0);
  const availableCash = Math.max(0, STARTING_CASH + realizedPnl - reservedCapital);
  const winners = closedTrades.filter((trade) => trade.realizedPnl > 0).length;
  const rMultiples = closedTrades.filter((trade) => trade.plannedRisk > 0).map((trade) => trade.realizedPnl / trade.plannedRisk);
  return {
    openPnl, realizedPnl, openRisk, reservedCapital, availableCash,
    equity: STARTING_CASH + realizedPnl + openPnl,
    openCount: openTrades.length, closedCount: closedTrades.length,
    winRate: closedTrades.length ? winners / closedTrades.length * 100 : null,
    averageR: rMultiples.length ? rMultiples.reduce((sum, value) => sum + value, 0) / rMultiples.length : null
  };
}
