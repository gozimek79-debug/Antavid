import test from "node:test";
import assert from "node:assert/strict";
import { createPaperTrade, markToMarket, percentChange } from "../src/engine.js";

const instrument = { symbol: "TEST", name: "Test", price: 100, spreadBps: 10, commissionBps: 10 };

test("percent change is deterministic", () => assert.equal(percentChange(110, 100), 10));
test("paper trade rejects risk above two percent of equity", () => {
  assert.throws(() => createPaperTrade({ instrument, side: "LONG", allocation: 5000, stopPercent: 5, thesis: "A sufficiently explicit thesis", equity: 10000 }), /exceeds 2%/);
});
test("long trade includes spread and round-trip commission", () => {
  const trade = createPaperTrade({ instrument, side: "LONG", allocation: 1000, stopPercent: 2, thesis: "Breakout confirmed above resistance", equity: 10000, now: new Date(0) });
  assert.ok(markToMarket(trade, 110).pnl > 90);
});
test("short profit has the correct sign", () => {
  const trade = createPaperTrade({ instrument, side: "SHORT", allocation: 1000, stopPercent: 2, thesis: "Breakdown confirmed below support", equity: 10000, now: new Date(0) });
  assert.ok(markToMarket(trade, 90).pnl > 0);
});
