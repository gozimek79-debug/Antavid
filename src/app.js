import { DEMO_SNAPSHOT, validateSnapshot } from "./data.js";
import { STARTING_CASH, createPaperTrade, markToMarket, percentChange, portfolioMetrics } from "./engine.js";

const API_ENDPOINT = globalThis.ANTAVID_API_ENDPOINT || "";
const STORE_KEY = "antavid-paper-journal-v1";
let snapshot = DEMO_SNAPSHOT;
let journal = loadJournal();
let selectedInstrument = null;

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function loadJournal() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY));
    return parsed && Array.isArray(parsed.trades) ? parsed : { trades: [] };
  } catch { return { trades: [] }; }
}
function saveJournal() { localStorage.setItem(STORE_KEY, JSON.stringify(journal)); }
function formatPrice(item) { return item.currency === "USD" ? money.format(item.price) : `${number.format(item.price)} ¢`; }
function escapeText(value) { return String(value ?? ""); }

function linePath(values) {
  const width = 300, height = 84, pad = 5, min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const points = values.map((value, index) => [pad + index * ((width - pad * 2) / (values.length - 1)), height - pad - ((value - min) / range) * (height - pad * 2)]);
  const line = `M ${points.map(([x,y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")}`;
  return { line, area: `${line} L ${points.at(-1)[0]} ${height} L ${points[0][0]} ${height} Z` };
}

function renderHeader() {
  const generated = new Date(snapshot.generatedAt);
  document.querySelector("#snapshotTime").textContent = generated.toLocaleString([], { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
  document.querySelector("#snapshotSource").textContent = snapshot.source;
  document.querySelector("#modeChip").textContent = `${snapshot.mode} DATA`;
  const connection = document.querySelector("#connection");
  connection.className = `connection ${snapshot.mode === "LIVE" ? "live" : "offline"}`;
  connection.querySelector("span").textContent = snapshot.mode === "LIVE" ? "Verified feed" : "No live feed";
  document.querySelector("#integrityBanner").innerHTML = snapshot.mode === "DEMO"
    ? "<strong>Research preview.</strong> Demo scenarios are not current prices or trading recommendations."
    : "<strong>Live analytical feed.</strong> Verify venue, timestamp and setup conditions before any decision.";
}

function renderMarkets(filter = "") {
  const grid = document.querySelector("#marketGrid");
  grid.replaceChildren();
  const query = filter.trim().toLowerCase();
  const instruments = snapshot.instruments.filter((i) => `${i.symbol} ${i.name} ${i.assetClass}`.toLowerCase().includes(query));
  for (const item of instruments) {
    const card = document.querySelector("#marketCardTemplate").content.firstElementChild.cloneNode(true);
    const change = percentChange(item.price, item.previousClose);
    const paths = linePath(item.candles);
    card.querySelector(".asset-type").textContent = item.assetClass;
    card.querySelector(".asset-name").textContent = item.name;
    card.querySelector(".asset-symbol").textContent = `${item.symbol} · ${item.currency}`;
    card.querySelector(".asset-price").textContent = formatPrice(item);
    const changeEl = card.querySelector(".asset-change");
    changeEl.textContent = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
    changeEl.classList.add(change >= 0 ? "up" : "down");
    const quality = card.querySelector(".quality-badge");
    quality.textContent = snapshot.mode === "LIVE" ? "VERIFIED" : "DEMO";
    quality.classList.add(snapshot.mode === "LIVE" ? "verified" : "demo");
    card.querySelector(".spark-path").setAttribute("d", paths.line);
    card.querySelector(".spark-area").setAttribute("d", paths.area);
    card.querySelector(".signal-horizon").textContent = item.signal.horizon;
    card.querySelector(".signal-evidence").textContent = `${item.signal.evidenceScore}/100`;
    card.querySelector(".signal-rsi").textContent = number.format(item.rsi14);
    const signal = card.querySelector(".signal-panel");
    signal.classList.add(item.signal.direction.toLowerCase());
    card.querySelector(".signal-direction").textContent = item.signal.direction;
    card.querySelector(".signal-summary").textContent = item.signal.summary;
    card.querySelector(".signal-trigger").textContent = item.signal.trigger;
    card.querySelector(".signal-invalidation").textContent = item.signal.invalidation;
    card.querySelector(".signal-id").textContent = item.signal.id;
    const drivers = card.querySelector(".drivers");
    for (const text of item.signal.drivers) { const tag = document.createElement("span"); tag.className = "driver"; tag.textContent = escapeText(text); drivers.append(tag); }
    card.querySelector(".trade-button").addEventListener("click", () => openTrade(item));
    grid.append(card);
  }
  if (!instruments.length) grid.innerHTML = '<div class="empty-state">No supported instrument matches this filter. ANTAVID does not invent a signal for unknown symbols.</div>';
}

function openTrade(item) {
  selectedInstrument = item;
  document.querySelector("#tradeTitle").textContent = `Paper trade · ${item.symbol}`;
  document.querySelector("#tradeSymbol").value = item.symbol;
  document.querySelector("#formError").textContent = "";
  document.querySelector("#tradeDialog").showModal();
}

function submitTrade(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") { document.querySelector("#tradeDialog").close(); return; }
  const metrics = portfolioMetrics(journal, snapshot.instruments);
  try {
    const trade = createPaperTrade({
      instrument: selectedInstrument, side: document.querySelector("#tradeSide").value,
      allocation: document.querySelector("#tradeAllocation").value, stopPercent: document.querySelector("#tradeStop").value,
      thesis: document.querySelector("#tradeThesis").value, equity: metrics.equity
    });
    journal.trades.unshift(trade); saveJournal(); document.querySelector("#tradeDialog").close();
    switchView("journal"); renderJournal(); event.target.reset();
  } catch (error) { document.querySelector("#formError").textContent = error.message; }
}

function closeTrade(id) {
  const trade = journal.trades.find((item) => item.id === id);
  const instrument = snapshot.instruments.find((item) => item.symbol === trade?.symbol);
  if (!trade || !instrument || trade.status !== "OPEN") return;
  const result = markToMarket(trade, instrument.price);
  Object.assign(trade, { status: "CLOSED", exit: result.exit, realizedPnl: result.pnl, closedAt: new Date().toISOString() });
  saveJournal(); renderJournal();
}

function renderJournal() {
  const metrics = portfolioMetrics(journal, snapshot.instruments);
  document.querySelector("#cashValue").textContent = money.format(STARTING_CASH + metrics.realizedPnl);
  document.querySelector("#openPnl").textContent = money.format(metrics.openPnl);
  document.querySelector("#realizedPnl").textContent = money.format(metrics.realizedPnl);
  document.querySelector("#openRisk").textContent = `${(metrics.openRisk / Math.max(metrics.equity, 1) * 100).toFixed(2)}%`;
  const list = document.querySelector("#journalList"); list.replaceChildren();
  if (!journal.trades.length) { list.innerHTML = '<div class="empty-state">No paper trades yet. Open a market scenario and record a testable thesis.</div>'; return; }
  for (const trade of journal.trades) {
    const instrument = snapshot.instruments.find((i) => i.symbol === trade.symbol);
    const result = trade.status === "OPEN" && instrument ? markToMarket(trade, instrument.price) : { pnl: trade.realizedPnl };
    const entry = document.createElement("article"); entry.className = "journal-entry";
    const body = document.createElement("div");
    const title = document.createElement("h3"); title.textContent = `${trade.side} · ${trade.symbol} · ${trade.status}`;
    const thesis = document.createElement("p"); thesis.textContent = trade.thesis;
    const meta = document.createElement("div"); meta.className = "journal-meta"; meta.textContent = `Allocation ${money.format(trade.allocation)} · planned risk ${money.format(trade.plannedRisk)} · P&L ${money.format(result.pnl)}`;
    body.append(title, thesis, meta); entry.append(body);
    if (trade.status === "OPEN") { const button = document.createElement("button"); button.className = "secondary-button"; button.textContent = "Close at demo price"; button.addEventListener("click", () => closeTrade(trade.id)); entry.append(button); }
    list.append(entry);
  }
}

function switchView(view) {
  document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  document.querySelectorAll(".view").forEach((section) => section.classList.toggle("active", section.id === `${view}View`));
}

async function refreshData() {
  const button = document.querySelector("#refreshButton"); button.disabled = true; button.textContent = "Checking…";
  if (API_ENDPOINT) {
    try {
      const response = await fetch(API_ENDPOINT, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
      const candidate = await response.json();
      if (!response.ok || !validateSnapshot(candidate)) throw new Error("Invalid market snapshot");
      snapshot = candidate;
    } catch { snapshot = DEMO_SNAPSHOT; }
  }
  renderHeader(); renderMarkets(document.querySelector("#marketSearch").value); renderJournal();
  button.disabled = false; button.textContent = API_ENDPOINT ? "Refresh data" : "Demo data loaded";
}

document.querySelectorAll(".nav-button").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
document.querySelector("#marketSearch").addEventListener("input", (event) => renderMarkets(event.target.value));
document.querySelector("#refreshButton").addEventListener("click", refreshData);
document.querySelector("#tradeForm").addEventListener("submit", submitTrade);
document.querySelector("#resetJournal").addEventListener("click", () => { if (confirm("Reset the complete paper journal?")) { journal = { trades: [] }; saveJournal(); renderJournal(); } });

if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js").catch(() => {});
renderHeader(); renderMarkets(); renderJournal();
