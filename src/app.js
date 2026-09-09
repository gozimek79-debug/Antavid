import { DEMO_SNAPSHOT, validateSnapshot } from "./data.js";
import {
  STARTING_CASH, createPaperTrade, markToMarket, percentChange, portfolioMetrics,
  settleTrade, settleTriggeredTrades
} from "./engine.js";

const API_ENDPOINT = globalThis.ANTAVID_API_ENDPOINT || "";
const JOURNAL_KEY = "antavid-paper-journal-v2";
const LEGACY_JOURNAL_KEY = "antavid-paper-journal-v1";
const LANG_KEY = "antavid-language";
const LEVEL_KEY = "antavid-experience";
const ORDER = ["BRENT", "XAU-USD", "BTC-USD", "ZW"];
let snapshot = DEMO_SNAPSHOT;
let lang = localStorage.getItem(LANG_KEY) || "pl";
let level = localStorage.getItem(LEVEL_KEY) || "amateur";
let active = "BRENT";
let tradeSide = "LONG";
let selectedInstrument = null;
let chartFrame = "1M";
let journal = loadJournal();

const T = {
  pl: {
    skip:"Przejdź do analizy rynku", demo:"DANE DEMO", preview:"WERSJA BADAWCZA",
    previewText:"notowania i scenariusze są deterministycznymi danymi demonstracyjnymi, a nie bieżącymi cenami ani poradą inwestycyjną.",
    searchLabel:"Szukaj instrumentu", search:"Szukaj instrumentu…", snapshot:"MIGAWKA DANYCH",
    riskPractice:"TRENING ZARZĄDZANIA RYZYKIEM", journal:"Dziennik transakcji", reset:"Wyczyść dziennik",
    equity:"Wartość portfela", cash:"Dostępne środki", reserved:"Zaangażowany kapitał", openPnl:"Otwarty P&L",
    realizedPnl:"Zrealizowany P&L", openRisk:"Otwarte ryzyko", winRate:"Skuteczność", averageR:"Średni wynik R",
    export:"Eksportuj CSV", education:"EDUKACJA I METODOLOGIA", helpTitle:"Jak czytać ANTAVID",
    trustTitle:"Zasady wiarygodności", trust1:"Każda cena musi mieć źródło, czas i status świeżości.",
    trust2:"Wskaźniki muszą wynikać z pokazanej serii danych.", trust3:"Scenariusz musi mieć warunek aktywacji i unieważnienia.",
    trust4:"Prawdopodobieństwa wymagają testów poza próbą i kalibracji.", simulation:"TYLKO SYMULACJA",
    allocation:"Wielkość pozycji (USD)", stopDistance:"Odległość stop loss (%)", targetDistance:"Cel zysku (%)",
    thesis:"Uzasadnienie transakcji", riskNote:"Łączne ryzyko otwartych pozycji nie może przekroczyć 2% wartości portfela. Kapitał pozycji pozostaje zarezerwowany do jej zamknięcia.",
    cancel:"Anuluj", addTrade:"Dodaj transakcję", markets:{BRENT:"Ropa", "XAU-USD":"Złoto", "BTC-USD":"Krypto", ZW:"Żywność"},
    help:"Pomoc", bias:"SCENARIUSZ", bullish:"WZROSTOWY", bearish:"SPADKOWY", neutral:"NEUTRALNY",
    longSetup:"OBSERWUJ LONG", shortSetup:"OBSERWUJ SHORT", wait:"CZEKAJ", drivers:"KLUCZOWE CZYNNIKI",
    evidence:"SIŁA DOWODÓW", trigger:"Warunek aktywacji", invalidation:"Unieważnienie", high:"MAKSIMUM SERII",
    low:"MINIMUM SERII", volatility:"ZMIENNOŚĆ", rsi:"RSI(14)", chart:"WYKRES ŚWIECOWY", older:"starsze dane",
    newer:"nowsze dane", articles:"KONTEKST ANALITYCZNY", paper:"TRANSAKCJA DEMO", simulateLong:"Symuluj LONG",
    simulateShort:"Symuluj SHORT", disclosure:"To nie jest porada finansowa. Scenariusz służy wyłącznie badaniu interfejsu i procesu decyzyjnego.",
    noResults:"Brak obsługiwanego instrumentu. ANTAVID nie tworzy sygnałów dla nieznanych symboli.",
    noTrades:"Brak transakcji demonstracyjnych. Otwórz rynek i zapisz sprawdzalną tezę.", close:"Zamknij pozycję",
    opened:"OTWARTA", closed:"ZAMKNIĘTA", confirmReset:"Usunąć cały dziennik transakcji demonstracyjnych?",
    amateur:"🌱 AMATOR", pro:"⚡ PRO", source:"Źródło", demoSource:"deterministyczna migawka demonstracyjna",
    volHigh:"WYSOKA", volMed:"ŚREDNIA", volLow:"NISKA", signalHistory:"HISTORIA SYGNAŁU (DEMO)",
    beginnerRead:"JAK TO CZYTAĆ", beginnerText:"Najpierw sprawdź kierunek scenariusza. Nie otwieraj pozycji przed spełnieniem warunku aktywacji. Ustal stop-loss i ryzykuj łącznie najwyżej 2% portfela.",
    proPanel:"PANEL TECHNICZNY", spread:"Spread", commission:"Prowizja", method:"Metoda", signalId:"Identyfikator sygnału",
    entry:"Wejście", stopLoss:"Stop-loss", target:"Cel", rr:"Zysk/ryzyko", exit:"Wyjście", reason:"Powód zamknięcia",
    manual:"ręcznie", stop:"stop-loss", targetHit:"cel zysku", orderPreview:"PLAN TRANSAKCJI",
    remainingRisk:"Pozostały limit ryzyka", available:"Dostępne", glossaryKicker:"SŁOWNIK TRADERA",
    glossary:"Najważniejsze pojęcia", glossarySearch:"Szukaj pojęcia…", noGlossary:"Nie znaleziono pojęcia.",
    modeAmateur:"Tryb Amator: objaśnienia, wskazówki i prostszy opis ryzyka są widoczne.",
    modePro:"Tryb Pro: zwarty panel techniczny, koszty transakcji i historia sygnałów są widoczne.",
    errInstrument:"Nieprawidłowy instrument lub kierunek.", errAllocation:"Wielkość pozycji musi wynosić od 10 USD do dostępnych środków.",
    errStop:"Stop loss musi wynosić od 0,1% do 25%.", errTarget:"Cel zysku musi wynosić od 0,2% do 100%.",
    errThesis:"Uzasadnienie musi zawierać co najmniej 12 znaków.", errRisk:"Łączna planowana strata przekracza 2% wartości portfela.",
    helpCards:[
      ["1. Oceń kierunek","Scenariusz pokazuje kierunek obserwacji, a nie polecenie kupna lub sprzedaży."],
      ["2. Poczekaj na aktywację","Warunek aktywacji musi zostać spełniony, zanim rozważysz transakcję."],
      ["3. Zdefiniuj ryzyko","Stop-loss określa punkt błędu. Wszystkie otwarte pozycje mogą ryzykować łącznie najwyżej 2% portfela."],
      ["4. Zapisz tezę","Przed transakcją zapisz, dlaczego ją otwierasz i co udowodni, że się mylisz."],
      ["5. Oceń wynik w R","Wynik R porównuje zysk lub stratę z wcześniej zaplanowanym ryzykiem."],
      ["6. Przejrzyj dziennik","Po serii transakcji analizuj skuteczność, średni wynik R i powtarzające się błędy."]
    ]
  },
  en: {
    skip:"Skip to market analysis", demo:"DEMO DATA", preview:"RESEARCH PREVIEW",
    previewText:"quotes and scenarios are deterministic demo fixtures, not current prices or investment advice.",
    searchLabel:"Search instrument", search:"Search instrument…", snapshot:"DATA SNAPSHOT", riskPractice:"RISK MANAGEMENT PRACTICE",
    journal:"Trading journal", reset:"Reset journal", equity:"Portfolio equity", cash:"Available cash", reserved:"Reserved capital",
    openPnl:"Open P&L", realizedPnl:"Realized P&L", openRisk:"Open risk", winRate:"Win rate", averageR:"Average R",
    export:"Export CSV", education:"EDUCATION & METHODOLOGY", helpTitle:"How to read ANTAVID",
    trustTitle:"Integrity principles", trust1:"Every price needs a source, timestamp and freshness status.",
    trust2:"Indicators must be derived from the displayed data series.", trust3:"Every scenario needs a trigger and invalidation.",
    trust4:"Probability claims require out-of-sample testing and calibration.", simulation:"SIMULATION ONLY",
    allocation:"Position size (USD)", stopDistance:"Stop-loss distance (%)", targetDistance:"Profit target (%)",
    thesis:"Trading thesis", riskNote:"Combined risk across open positions cannot exceed 2% of portfolio equity. Position capital remains reserved until closing.",
    cancel:"Cancel", addTrade:"Add trade", markets:{BRENT:"Oil", "XAU-USD":"Gold", "BTC-USD":"Crypto", ZW:"Food"},
    help:"Help", bias:"SCENARIO", bullish:"BULLISH", bearish:"BEARISH", neutral:"NEUTRAL", longSetup:"WATCH LONG",
    shortSetup:"WATCH SHORT", wait:"WAIT", drivers:"KEY MARKET DRIVERS", evidence:"EVIDENCE STRENGTH", trigger:"Trigger",
    invalidation:"Invalidation", high:"SERIES HIGH", low:"SERIES LOW", volatility:"VOLATILITY", rsi:"RSI(14)",
    chart:"CANDLESTICK CHART", older:"older", newer:"newer", articles:"ANALYTICAL CONTEXT", paper:"PAPER TRADE",
    simulateLong:"Simulate LONG", simulateShort:"Simulate SHORT", disclosure:"Not financial advice. This scenario exists only to test the interface and decision process.",
    noResults:"No supported instrument found. ANTAVID does not invent signals for unknown symbols.",
    noTrades:"No paper trades yet. Open a market and record a testable thesis.", close:"Close position", opened:"OPEN",
    closed:"CLOSED", confirmReset:"Delete the complete paper-trading journal?", amateur:"🌱 AMATEUR", pro:"⚡ PRO",
    source:"Source", demoSource:"deterministic demo snapshot", volHigh:"HIGH", volMed:"MED", volLow:"LOW",
    signalHistory:"SIGNAL HISTORY (DEMO)", beginnerRead:"HOW TO READ THIS", beginnerText:"Check the scenario direction first. Do not open a position before its trigger. Set a stop-loss and keep combined risk below 2% of the portfolio.",
    proPanel:"TECHNICAL PANEL", spread:"Spread", commission:"Commission", method:"Method", signalId:"Signal ID",
    entry:"Entry", stopLoss:"Stop-loss", target:"Target", rr:"Reward/risk", exit:"Exit", reason:"Exit reason",
    manual:"manual", stop:"stop-loss", targetHit:"profit target", orderPreview:"TRADE PLAN", remainingRisk:"Risk allowance left",
    available:"Available", glossaryKicker:"TRADER GLOSSARY", glossary:"Essential concepts", glossarySearch:"Search term…",
    noGlossary:"No matching term.", modeAmateur:"Amateur mode: explanations, guidance and simpler risk language are visible.",
    modePro:"Pro mode: compact technical data, transaction costs and signal history are visible.",
    errInstrument:"Invalid instrument or direction.", errAllocation:"Position size must be between $10 and available cash.",
    errStop:"Stop loss must be between 0.1% and 25%.", errTarget:"Profit target must be between 0.2% and 100%.",
    errThesis:"The thesis must contain at least 12 characters.", errRisk:"Total planned loss exceeds 2% of portfolio equity.",
    helpCards:[
      ["1. Assess direction","The scenario shows an observation bias, not an instruction to buy or sell."],
      ["2. Wait for the trigger","The activation condition must occur before you consider a trade."],
      ["3. Define risk","The stop-loss defines where the idea is wrong. All open positions together may risk at most 2%."],
      ["4. Record the thesis","Before entering, write why and what would prove the idea wrong."],
      ["5. Evaluate in R","R compares the result with the amount you planned to risk."],
      ["6. Review the journal","After a series of trades, review win rate, average R and recurring mistakes."]
    ]
  }
};

const GLOSSARY = [
  {termPl:"Bias rynkowy", term:"Market bias", defPl:"Kierunek scenariusza wynikający z dostępnych przesłanek. Nie jest gwarancją ani rekomendacją.", def:"A scenario direction derived from available evidence. It is neither a guarantee nor a recommendation."},
  {termPl:"Warunek aktywacji", term:"Trigger", defPl:"Cena lub zdarzenie wymagane przed uznaniem scenariusza za aktywny.", def:"A price or event required before the scenario becomes active."},
  {termPl:"Unieważnienie", term:"Invalidation", defPl:"Warunek pokazujący, że pierwotna teza przestała obowiązywać.", def:"The condition showing that the original thesis no longer holds."},
  {termPl:"Stop-loss", term:"Stop-loss", defPl:"Z góry określony poziom wyjścia ograniczający stratę, gdy scenariusz jest błędny.", def:"A predefined exit level limiting loss when the scenario is wrong."},
  {termPl:"Take-profit", term:"Take-profit", defPl:"Z góry określony poziom realizacji zakładanego zysku.", def:"A predefined level for realizing the planned profit."},
  {termPl:"Stosunek zysku do ryzyka", term:"Reward-to-risk", defPl:"Planowany zysk podzielony przez planowaną stratę. Wartość 2:1 oznacza cel dwa razy większy od ryzyka.", def:"Planned reward divided by planned loss. 2:1 means the target is twice the risk."},
  {termPl:"Wynik R", term:"R-multiple", defPl:"Wynik transakcji podzielony przez jej zaplanowane ryzyko.", def:"Trade result divided by its planned risk."},
  {termPl:"Spread", term:"Spread", defPl:"Różnica między ceną kupna i sprzedaży, będąca kosztem wejścia i wyjścia.", def:"The difference between buy and sell prices, creating an entry and exit cost."},
  {termPl:"Zmienność", term:"Volatility", defPl:"Skala wahań ceny. Wyższa zmienność zwykle wymaga mniejszej pozycji.", def:"The scale of price swings. Higher volatility usually calls for a smaller position."},
  {termPl:"RSI(14)", term:"RSI(14)", defPl:"Wskaźnik momentum z 14 okresów. Sam nie stanowi sygnału transakcyjnego.", def:"A 14-period momentum indicator. It is not a trade signal on its own."},
  {termPl:"Świeca OHLC", term:"OHLC candle", defPl:"Pokazuje cenę otwarcia, maksimum, minimum i zamknięcie dla jednego okresu.", def:"Shows open, high, low and close for one period."},
  {termPl:"Paper trading", term:"Paper trading", defPl:"Symulowane transakcje bez użycia prawdziwych pieniędzy.", def:"Simulated trading without using real money."}
];

const $ = (selector) => document.querySelector(selector);
const tx = (key) => T[lang][key] ?? key;
const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const money = (value) => new Intl.NumberFormat(lang === "pl" ? "pl-PL" : "en-US", {style:"currency",currency:"USD",maximumFractionDigits:2}).format(value);
const number = (value) => new Intl.NumberFormat(lang === "pl" ? "pl-PL" : "en-US", {maximumFractionDigits:2}).format(value);

function migrateTrade(trade) {
  if (trade.status !== "OPEN" || !Number.isFinite(trade.entry)) return trade;
  const stopPercent = Number(trade.stopPercent) || 2;
  const targetPercent = Number(trade.targetPercent) || stopPercent * 2;
  return {...trade, stopPercent, targetPercent,
    stopPrice:Number.isFinite(trade.stopPrice) ? trade.stopPrice : trade.entry * (trade.side === "LONG" ? 1-stopPercent/100 : 1+stopPercent/100),
    targetPrice:Number.isFinite(trade.targetPrice) ? trade.targetPrice : trade.entry * (trade.side === "LONG" ? 1+targetPercent/100 : 1-targetPercent/100),
    riskReward:targetPercent/stopPercent};
}
function loadJournal() {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY) || localStorage.getItem(LEGACY_JOURNAL_KEY);
    const value = JSON.parse(raw);
    return value && Array.isArray(value.trades) ? {trades:value.trades.map(migrateTrade)} : {trades:[]};
  } catch { return {trades:[]}; }
}
function saveJournal(){localStorage.setItem(JOURNAL_KEY,JSON.stringify(journal));}
function itemName(item){return lang === "pl" ? item.namePl || item.name : item.name;}
function assetClass(item){return lang === "pl" ? item.assetClassPl || item.assetClass : item.assetClass;}
function signalText(signal,key){return lang === "pl" ? signal[`${key}Pl`] || signal[key] : signal[key];}
function direction(signal){return tx(signal.direction.toLowerCase());}
function action(signal){return signal.direction === "BULLISH" ? tx("longSetup") : signal.direction === "BEARISH" ? tx("shortSetup") : tx("wait");}
function formatPrice(item, value = item.price){return item.currency === "USD" ? money(value) : `${number(value)}¢`;}
function formatHorizon(value){return lang === "pl" ? value.replace("days","dni").replace("day","dzień") : value;}
function volatility(item){const values=item.candles;const range=(Math.max(...values)-Math.min(...values))/item.price*100;return range>5?tx("volHigh"):range>2?tx("volMed"):tx("volLow");}
function localizedError(message){if(message.includes("instrument or direction"))return tx("errInstrument");if(message.includes("Allocation"))return tx("errAllocation");if(message.includes("Stop distance"))return tx("errStop");if(message.includes("Target distance"))return tx("errTarget");if(message.includes("thesis"))return tx("errThesis");if(message.includes("Total planned"))return tx("errRisk");return message;}
function orderedInstruments(){return ORDER.map((symbol)=>snapshot.instruments.find((item)=>item.symbol===symbol)).filter(Boolean);}

function applyLanguage(){
  document.documentElement.lang=lang;
  document.querySelectorAll("[data-i18n]").forEach((el)=>{el.textContent=tx(el.dataset.i18n);});
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el)=>{el.placeholder=tx(el.dataset.i18nPlaceholder);});
  $("#languageButton").textContent=lang.toUpperCase();
  $("#languageButton").setAttribute("aria-label",lang==="pl"?"Zmień język na angielski":"Switch language to Polish");
  $("#marketSearch").placeholder=tx("search");
  $("#tradeThesis").placeholder=lang === "pl" ? "Co musi się wydarzyć i co unieważni ten scenariusz?" : "What must happen, and what would invalidate this scenario?";
  $("#experienceButton").textContent=level === "amateur" ? tx("amateur") : tx("pro");
  renderAll();
}

function renderTicker(){
  const items=orderedInstruments().map((item)=>{const ch=percentChange(item.price,item.previousClose);return `<div class="ticker-item"><b>${safe(item.symbol)}</b>${safe(formatPrice(item))} <span class="${ch>=0?"up":"down"}">${ch>=0?"▲ +":"▼ "}${Math.abs(ch).toFixed(2)}%</span></div>`;}).join("");
  $("#tickerTrack").innerHTML=items+items;
}
function renderTabs(){
  const tabs=orderedInstruments().map((item)=>`<button class="market-tab ${active===item.symbol?"active":""}" data-view="${safe(item.symbol)}"><span>${safe(item.icon)}</span><strong>${safe(tx("markets")[item.symbol])}</strong><small>${safe(direction(item.signal))}</small></button>`);
  tabs.push(`<button class="market-tab ${active==="journal"?"active":""}" data-view="journal"><span>📒</span><strong>${safe(tx("journal"))}</strong><small>${journal.trades.length}</small></button>`,`<button class="market-tab ${active==="help"?"active":""}" data-view="help"><span>❓</span><strong>${safe(tx("help"))}</strong><small>i</small></button>`);
  $("#marketTabs").innerHTML=tabs.join("");
  document.querySelectorAll(".market-tab").forEach((button)=>button.addEventListener("click",()=>switchView(button.dataset.view)));
}
function ohlc(values){
  return values.map((close,index)=>{const open=index?values[index-1]:close*(1-0.003);const movement=Math.abs(close-open);const wick=Math.max(close*0.002,movement*0.35);return {open,close,high:Math.max(open,close)+wick,low:Math.min(open,close)-wick};});
}
function visibleCandles(item){
  const counts={"1D":6,"1W":9,"1M":12};
  return ohlc(item.candles.slice(-counts[chartFrame]));
}
function candleChart(item){
  const candles=visibleCandles(item), width=760,height=190,pad=12;
  const min=Math.min(...candles.map((c)=>c.low)),max=Math.max(...candles.map((c)=>c.high)),range=max-min||1;
  const y=(value)=>height-pad-((value-min)/range)*(height-pad*2);
  const step=(width-pad*2)/candles.length, body=Math.max(5,Math.min(18,step*.52));
  return candles.map((c,index)=>{const x=pad+step*(index+.5),yo=y(c.open),yc=y(c.close),up=c.close>=c.open,top=Math.min(yo,yc),h=Math.max(2,Math.abs(yc-yo));return `<g class="${up?"candle-up":"candle-down"}"><line x1="${x}" y1="${y(c.high)}" x2="${x}" y2="${y(c.low)}"/><rect x="${x-body/2}" y="${top}" width="${body}" height="${h}"/></g>`;}).join("");
}
function historyFor(item){
  const dirs=[item.signal.direction,"NEUTRAL",item.signal.direction,item.signal.direction==="BULLISH"?"BEARISH":"BULLISH"];
  return dirs.map((value,index)=>({direction:value,score:Math.max(30,item.signal.evidenceScore-index*7),label:lang==="pl"?`${index+1} okres temu`:`${index+1} period${index?"s":""} ago`}));
}
function proPanel(item){
  return `<article class="content-card pro-only"><div class="section-label">▸ ${safe(tx("proPanel"))}</div><div class="technical-grid">
    <div><span>${safe(tx("signalId"))}</span><strong>${safe(item.signal.id)}</strong></div>
    <div><span>${safe(tx("spread"))}</span><strong>${safe(item.spreadBps)} bps</strong></div>
    <div><span>${safe(tx("commission"))}</span><strong>${safe(item.commissionBps)} bps / ${lang==="pl"?"strona":"side"}</strong></div>
    <div><span>${safe(tx("method"))}</span><strong>${safe(snapshot.methodologyVersion)}</strong></div>
  </div></article>`;
}
function renderMarket(item){
  const signal=item.signal,ch=percentChange(item.price,item.previousClose),drivers=lang==="pl"?signal.driversPl||signal.drivers:signal.drivers,articles=lang==="pl"?signal.articlesPl||signal.articles:signal.articles;
  const high=Math.max(...item.candles),low=Math.min(...item.candles),biasClass=signal.direction.toLowerCase(),history=historyFor(item);
  $("#marketView").innerHTML=`
    <article class="signal-card"><div class="signal-top"><div><div class="market-id">${safe(item.icon)} ${safe(itemName(item).toUpperCase())} · ${safe(item.symbol)} · ${safe(assetClass(item))}</div><h1 class="market-name">${safe(itemName(item))}</h1><div class="price">${safe(formatPrice(item))}</div><div class="change ${ch>=0?"up":"down"}">${ch>=0?"▲ +":"▼ "}${Math.abs(ch).toFixed(2)}%</div></div><div class="bias-block"><div class="bias ${biasClass}">${safe(direction(signal))}</div><div class="bias-label">${safe(tx("bias"))} · ${safe(formatHorizon(signal.horizon))}</div><div class="action-label ${biasClass}">${safe(action(signal))}</div></div></div><div class="drivers-title">▸ ${safe(tx("drivers"))}</div><div class="drivers">${drivers.map((driver,i)=>`<div class="driver"><b>0${i+1}</b><span>${safe(driver)}</span></div>`).join("")}</div></article>
    <article class="amateur-guide amateur-only"><strong>▸ ${safe(tx("beginnerRead"))}</strong><p>${safe(tx("beginnerText"))}</p></article>
    <div class="scenario-grid"><article class="content-card"><div class="evidence-head"><div><span class="kicker">${safe(tx("evidence"))}</span><h2>${safe(direction(signal))} · ${safe(formatHorizon(signal.horizon))}</h2></div><div class="evidence-score">${safe(signal.evidenceScore)}<small>/100</small></div></div><div class="evidence-track"><i style="width:${Number(signal.evidenceScore)}%"></i></div><p class="scenario-copy">${safe(signalText(signal,"summary"))}</p><p class="amateur-only scenario-copy"><strong>${safe(tx("source"))}:</strong> ${safe(snapshot.mode === "DEMO" ? tx("demoSource") : snapshot.source)}</p></article><article class="content-card"><div class="levels"><div class="level"><span>${safe(tx("trigger"))}</span><strong>${safe(signalText(signal,"trigger"))}</strong></div><div class="level"><span>${safe(tx("invalidation"))}</span><strong>${safe(signalText(signal,"invalidation"))}</strong></div></div></article></div>
    ${proPanel(item)}
    <div class="stats-grid"><article class="stat"><span>${safe(tx("high"))}</span><strong>${safe(formatPrice(item,high))}</strong></article><article class="stat"><span>${safe(tx("low"))}</span><strong>${safe(formatPrice(item,low))}</strong></article><article class="stat"><span>${safe(tx("volatility"))}</span><strong>${volatility(item)}</strong></article><article class="stat"><span>${safe(tx("rsi"))}</span><strong>${safe(number(item.rsi14))}</strong></article></div>
    <article class="chart-card"><div class="chart-head"><h2>▸ ${safe(tx("chart"))} · ${safe(item.symbol)}</h2><div class="timeframes" role="group" aria-label="${lang==="pl"?"Ramy czasowe":"Timeframes"}">${["1D","1W","1M"].map((frame)=>`<button class="${chartFrame===frame?"active":""}" data-frame="${frame}">${frame}</button>`).join("")}</div><span>${safe(tx("older"))} ← → ${safe(tx("newer"))}</span></div><svg class="price-chart" viewBox="0 0 760 190" preserveAspectRatio="none" role="img" aria-label="${safe(tx("chart"))}"><line class="chart-grid" x1="0" y1="48" x2="760" y2="48"/><line class="chart-grid" x1="0" y1="95" x2="760" y2="95"/><line class="chart-grid" x1="0" y1="142" x2="760" y2="142"/>${candleChart(item)}</svg><div class="rsi-row"><div class="rsi-track"><i style="left:${Math.max(0,Math.min(100,item.rsi14))}%"></i></div><strong>RSI ${safe(number(item.rsi14))}</strong></div><p class="chart-note amateur-only">${lang==="pl"?"Świece OHLC są deterministyczną wizualizacją danych demonstracyjnych. Zielona świeca oznacza wzrost, czerwona spadek.":"OHLC candles are a deterministic visualization of demo data. Green means up, red means down."}</p></article>
    <article class="content-card pro-only signal-history"><div class="section-label">▸ ${safe(tx("signalHistory"))}</div><div class="history-row">${history.map((entry)=>`<div><span>${safe(entry.label)}</span><strong class="${entry.direction.toLowerCase()}">${safe(tx(entry.direction.toLowerCase()))}</strong><small>${entry.score}/100</small></div>`).join("")}</div></article>
    <div class="market-bottom"><article class="content-card"><div class="section-label">▸ ${safe(tx("articles"))}</div><div class="article-list">${articles.map((article)=>`<div class="article"><strong>${safe(article)}</strong><span>${safe(snapshot.mode)} · ${safe(item.symbol)}</span></div>`).join("")}</div></article><article class="content-card"><div class="section-label">▸ ${safe(tx("paper"))}</div><div class="trade-actions"><button class="long-button" data-trade="LONG">↗ ${safe(tx("simulateLong"))}</button><button class="short-button" data-trade="SHORT">↘ ${safe(tx("simulateShort"))}</button></div><p class="disclosure">⚠ ${safe(tx("disclosure"))}</p></article></div>`;
  document.querySelectorAll("[data-trade]").forEach((button)=>button.addEventListener("click",()=>openTrade(item,button.dataset.trade)));
  document.querySelectorAll("[data-frame]").forEach((button)=>button.addEventListener("click",()=>{chartFrame=button.dataset.frame;renderMarket(item);}));
}

function switchView(view){
  active=view;
  $("#marketView").classList.toggle("active",!["journal","help"].includes(view));
  $("#journalView").classList.toggle("active",view==="journal");
  $("#helpView").classList.toggle("active",view==="help");
  renderTabs();
  if(view==="journal")renderJournal();else if(view==="help")renderHelp();else{const item=snapshot.instruments.find((entry)=>entry.symbol===view);if(item)renderMarket(item);}
}
function renderGlossary(query=""){
  const q=query.trim().toLowerCase();
  const matches=GLOSSARY.filter((item)=>`${item.term} ${item.termPl} ${item.def} ${item.defPl}`.toLowerCase().includes(q));
  $("#glossaryList").innerHTML=matches.length?matches.map((item)=>`<article><h3>${safe(lang==="pl"?item.termPl:item.term)}</h3><p>${safe(lang==="pl"?item.defPl:item.def)}</p></article>`).join(""):`<div class="empty">${safe(tx("noGlossary"))}</div>`;
}
function renderHelp(){$("#helpGrid").innerHTML=tx("helpCards").map(([title,copy])=>`<article class="help-card"><h2>${safe(title)}</h2><p>${safe(copy)}</p></article>`).join("");renderGlossary($("#glossarySearch").value);}
function reasonLabel(reason){return reason==="STOP"?tx("stop"):reason==="TARGET"?tx("targetHit"):tx("manual");}
function renderJournal(){
  const metrics=portfolioMetrics(journal,snapshot.instruments);
  $("#equityValue").textContent=money(metrics.equity);$("#cashValue").textContent=money(metrics.availableCash);$("#reservedValue").textContent=money(metrics.reservedCapital);
  $("#openPnl").textContent=money(metrics.openPnl);$("#realizedPnl").textContent=money(metrics.realizedPnl);
  $("#openRisk").textContent=`${(metrics.openRisk/Math.max(metrics.equity,1)*100).toFixed(2)}%`;
  $("#winRate").textContent=metrics.winRate===null?"—":`${metrics.winRate.toFixed(1)}%`;$("#averageR").textContent=metrics.averageR===null?"—":`${metrics.averageR.toFixed(2)} R`;
  const list=$("#journalList");list.replaceChildren();
  if(!journal.trades.length){list.innerHTML=`<div class="empty">${safe(tx("noTrades"))}</div>`;return;}
  for(const trade of journal.trades){
    const instrument=snapshot.instruments.find((item)=>item.symbol===trade.symbol);
    const result=trade.status==="OPEN"&&instrument?markToMarket(trade,instrument.price):{pnl:trade.realizedPnl};
    const rValue=trade.plannedRisk?result.pnl/trade.plannedRisk:null;
    const entry=document.createElement("article");entry.className="journal-entry";
    entry.innerHTML=`<div><h3>${safe(trade.side)} · ${safe(trade.symbol)} · ${safe(trade.status==="OPEN"?tx("opened"):tx("closed"))}</h3><p>${safe(trade.thesis)}</p><div class="trade-levels"><span>${safe(tx("entry"))} <b>${safe(formatPrice(instrument||{currency:"USD"},trade.entry))}</b></span><span>${safe(tx("stopLoss"))} <b>${safe(formatPrice(instrument||{currency:"USD"},trade.stopPrice))}</b></span><span>${safe(tx("target"))} <b>${safe(formatPrice(instrument||{currency:"USD"},trade.targetPrice))}</b></span><span>${safe(tx("rr"))} <b>${number(trade.riskReward||0)}:1</b></span></div><small>${money(trade.allocation)} · P&L ${money(result.pnl)} · ${rValue===null?"—":rValue.toFixed(2)+" R"} · ${new Date(trade.openedAt).toLocaleString(lang==="pl"?"pl-PL":"en-US")}${trade.status==="CLOSED"?` · ${safe(tx("reason"))}: ${safe(reasonLabel(trade.exitReason))}`:""}</small></div>`;
    if(trade.status==="OPEN"){const button=document.createElement("button");button.className="ghost-button";button.textContent=tx("close");button.addEventListener("click",()=>closeTrade(trade.id));entry.append(button);}
    list.append(entry);
  }
}
function updateOrderPreview(){
  if(!selectedInstrument)return;
  const amount=Number($("#tradeAllocation").value),stop=Number($("#tradeStop").value),target=Number($("#tradeTarget").value);
  const metrics=portfolioMetrics(journal,snapshot.instruments),risk=amount*stop/100,allowance=Math.max(0,metrics.equity*.02-metrics.openRisk);
  const entry=selectedInstrument.price,stopPrice=entry*(tradeSide==="LONG"?1-stop/100:1+stop/100),targetPrice=entry*(tradeSide==="LONG"?1+target/100:1-target/100);
  $("#orderPreview").innerHTML=`<strong>${safe(tx("orderPreview"))}</strong><div><span>${safe(tx("entry"))}<b>${safe(formatPrice(selectedInstrument,entry))}</b></span><span>${safe(tx("stopLoss"))}<b>${safe(formatPrice(selectedInstrument,stopPrice))}</b></span><span>${safe(tx("target"))}<b>${safe(formatPrice(selectedInstrument,targetPrice))}</b></span><span>${safe(tx("rr"))}<b>${Number.isFinite(target/stop)?number(target/stop):"—"}:1</b></span><span>${safe(tx("openRisk"))}<b>${money(Number.isFinite(risk)?risk:0)}</b></span><span>${safe(tx("remainingRisk"))}<b>${money(allowance)}</b></span></div>`;
}
function openTrade(item,side){
  selectedInstrument=item;tradeSide=side;$("#tradeTitle").textContent=`${side} · ${item.symbol}`;$("#tradeSymbol").value=item.symbol;$("#formError").textContent="";
  const metrics=portfolioMetrics(journal,snapshot.instruments);$("#tradeAllocation").max=metrics.availableCash;
  document.querySelectorAll("[data-side]").forEach((button)=>button.classList.toggle("on",button.dataset.side===side));updateOrderPreview();$("#tradeDialog").showModal();
}
function submitTrade(event){
  event.preventDefault();if(event.submitter?.value==="cancel"){$("#tradeDialog").close();return;}
  try{
    const metrics=portfolioMetrics(journal,snapshot.instruments);
    const trade=createPaperTrade({instrument:selectedInstrument,side:tradeSide,allocation:$("#tradeAllocation").value,stopPercent:$("#tradeStop").value,targetPercent:$("#tradeTarget").value,thesis:$("#tradeThesis").value,equity:metrics.equity,availableCash:metrics.availableCash,existingOpenRisk:metrics.openRisk});
    journal.trades.unshift(trade);saveJournal();$("#tradeDialog").close();event.target.reset();switchView("journal");
  }catch(error){$("#formError").textContent=localizedError(error.message);}
}
function closeTrade(id){
  const index=journal.trades.findIndex((item)=>item.id===id),trade=journal.trades[index],instrument=snapshot.instruments.find((item)=>item.symbol===trade?.symbol);
  if(index<0||!instrument||trade.status!=="OPEN")return;
  journal.trades[index]=settleTrade(trade,instrument.price,"MANUAL");saveJournal();renderJournal();
}
function filterMarket(query){
  const q=query.trim().toLowerCase();if(!q){switchView(["journal","help"].includes(active)?"BRENT":active);return;}
  const item=orderedInstruments().find((entry)=>`${entry.symbol} ${entry.name} ${entry.namePl} ${entry.assetClass} ${entry.assetClassPl}`.toLowerCase().includes(q));
  if(item)switchView(item.symbol);else $("#marketView").innerHTML=`<div class="empty">${safe(tx("noResults"))}</div>`;
}
function exportJournal(){
  const headings=["symbol","side","status","opened_at","closed_at","entry","exit","stop","target","allocation","planned_risk","pnl","r_multiple","exit_reason","thesis"];
  const quote=(value)=>`"${String(value??"").replaceAll('"','""')}"`;
  const rows=journal.trades.map((trade)=>[trade.symbol,trade.side,trade.status,trade.openedAt,trade.closedAt,trade.entry,trade.exit,trade.stopPrice,trade.targetPrice,trade.allocation,trade.plannedRisk,trade.realizedPnl,trade.plannedRisk?Number(trade.realizedPnl||0)/trade.plannedRisk:"",trade.exitReason,trade.thesis].map(quote).join(","));
  const blob=new Blob([[headings.join(","),...rows].join("\n")],{type:"text/csv;charset=utf-8"});
  const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download="antavid-paper-journal.csv";link.click();URL.revokeObjectURL(link.href);
}
function checkAutomaticExits(){
  const result=settleTriggeredTrades(journal,snapshot.instruments);if(result.changed){journal=result.state;saveJournal();}
}
function renderAll(){
  document.body.classList.toggle("pro",level==="pro");$("#experienceButton").setAttribute("aria-pressed",String(level==="pro"));
  $("#modeNotice").textContent=level==="amateur"?tx("modeAmateur"):tx("modePro");
  checkAutomaticExits();renderTicker();renderTabs();
  $("#snapshotTime").textContent=new Date(snapshot.generatedAt).toLocaleString(lang==="pl"?"pl-PL":"en-US",{dateStyle:"short",timeStyle:"short",timeZone:"UTC"})+" UTC";
  switchView(active);
}
async function loadData(){
  if(!API_ENDPOINT)return;
  try{const response=await fetch(API_ENDPOINT,{signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error();const incoming=await response.json();if(!validateSnapshot(incoming))throw new Error();snapshot=incoming;renderAll();}
  catch{snapshot=DEMO_SNAPSHOT;renderAll();}
}

$("#languageButton").addEventListener("click",()=>{lang=lang==="pl"?"en":"pl";localStorage.setItem(LANG_KEY,lang);applyLanguage();});
$("#experienceButton").addEventListener("click",()=>{level=level==="amateur"?"pro":"amateur";localStorage.setItem(LEVEL_KEY,level);applyLanguage();});
$("#marketSearch").addEventListener("input",(event)=>filterMarket(event.target.value));
$("#clearSearch").addEventListener("click",()=>{$("#marketSearch").value="";switchView(["journal","help"].includes(active)?"BRENT":active);});
document.querySelectorAll("[data-side]").forEach((button)=>button.addEventListener("click",()=>{tradeSide=button.dataset.side;document.querySelectorAll("[data-side]").forEach((entry)=>entry.classList.toggle("on",entry===button));updateOrderPreview();}));
["#tradeAllocation","#tradeStop","#tradeTarget"].forEach((selector)=>$(selector).addEventListener("input",updateOrderPreview));
$("#tradeForm").addEventListener("submit",submitTrade);
$("#resetJournal").addEventListener("click",()=>{if(confirm(tx("confirmReset"))){journal={trades:[]};saveJournal();renderJournal();renderTabs();}});
$("#exportJournal").addEventListener("click",exportJournal);
$("#glossarySearch").addEventListener("input",(event)=>renderGlossary(event.target.value));
if("serviceWorker" in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(()=>{});
applyLanguage();loadData();
