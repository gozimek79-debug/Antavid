import test from "node:test";
import assert from "node:assert/strict";
import {
  createPaperTrade, exitReasonAtPrice, markToMarket, percentChange,
  portfolioMetrics, settleTrade, settleTriggeredTrades
} from "../src/engine.js";

const instrument = { symbol:"TEST", name:"Test", price:100, spreadBps:10, commissionBps:10 };
const thesis = "Breakout confirmed above resistance";

function trade(overrides = {}) {
  return createPaperTrade({instrument, side:"LONG", allocation:1000, stopPercent:2, targetPercent:4, thesis, equity:10000, availableCash:10000, ...overrides, now:new Date(0)});
}

test("percent change is deterministic", () => assert.equal(percentChange(110,100),10));
test("trade reserves a stop, target and 2:1 reward/risk", () => {
  const value=trade();
  assert.ok(value.stopPrice<value.entry);
  assert.ok(value.targetPrice>value.entry);
  assert.equal(value.riskReward,2);
});
test("single trade rejects risk above two percent of equity", () => {
  assert.throws(()=>trade({allocation:5000,stopPercent:5}),/exceeds 2%/);
});
test("aggregate open risk cannot exceed two percent", () => {
  assert.throws(()=>trade({allocation:1000,stopPercent:1,existingOpenRisk:195}),/exceeds 2%/);
});
test("allocation cannot exceed available cash even when equity is higher", () => {
  assert.throws(()=>trade({allocation:1000,availableCash:900}),/available cash/);
});
test("target distance is validated", () => {
  assert.throws(()=>trade({targetPercent:0.1}),/Target distance/);
});
test("long trade includes spread and round-trip commission", () => assert.ok(markToMarket(trade(),110).pnl>90));
test("short profit has the correct sign", () => {
  const value=trade({side:"SHORT"});
  assert.ok(markToMarket(value,90).pnl>0);
});
test("stop and target triggers work for long and short", () => {
  const long=trade(), short=trade({side:"SHORT"});
  assert.equal(exitReasonAtPrice(long,long.stopPrice),"STOP");
  assert.equal(exitReasonAtPrice(long,long.targetPrice),"TARGET");
  assert.equal(exitReasonAtPrice(short,short.stopPrice),"STOP");
  assert.equal(exitReasonAtPrice(short,short.targetPrice),"TARGET");
});
test("manual settlement records result and reason", () => {
  const closed=settleTrade(trade(),105,"MANUAL",new Date(1000));
  assert.equal(closed.status,"CLOSED");
  assert.equal(closed.exitReason,"MANUAL");
  assert.ok(closed.realizedPnl>0);
});
test("triggered positions settle automatically at a new snapshot", () => {
  const open=trade();
  const result=settleTriggeredTrades({trades:[open]},[{...instrument,price:open.targetPrice}],new Date(1000));
  assert.equal(result.changed,true);
  assert.equal(result.state.trades[0].exitReason,"TARGET");
});
test("portfolio reports reserved cash, aggregate risk, win rate and average R", () => {
  const open=trade(), closed=settleTrade(trade({now:new Date(1)}),105,"MANUAL",new Date(2));
  const metrics=portfolioMetrics({trades:[open,closed]},[instrument]);
  assert.equal(metrics.reservedCapital,1000);
  assert.ok(metrics.availableCash>9000);
  assert.equal(metrics.openRisk,20);
  assert.equal(metrics.winRate,100);
  assert.ok(metrics.averageR>0);
});
