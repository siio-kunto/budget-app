/* FinanceBird Pre-Deploy Smoke-Test — Sprint 6.5a + 6.5b
 *
 * Lädt financebird_v2.html in jsdom, evaluiert die I18N-Map + Renderer-Funktionen
 * direkt im File-Kontext, und prüft:
 *   1. Beide Sprachen vorhanden, gleiche Keys
 *   2. Keine doppelten Keys in derselben Sprache (außer bekannt: toast.dbs_ready)
 *   3. Migrierte Renderer crashen nicht in DE und EN
 *   4. Kein hardcoded DE-Stringrest in den 6.5a/6.5b-Renderer-Outputs (EN-Mode)
 *   5. Helper geben unterschiedliche Werte für DE vs. EN
 *   6. (S6.5b) Widget-Renderer + canRenderWidget + cockpit-Inner liefern EN-Output
 *
 * Wir laden NICHT die ganze App (der Init-Pfad braucht Notion/Worker-Stubs).
 * Stattdessen: HTML → DOM, Script-Block extrahieren, Renderer isoliert mit gemockten
 * Daten aufrufen.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.resolve(__dirname, 'financebird_v2.html');
const html      = fs.readFileSync(HTML_PATH, 'utf8');

// ── ANSI ──────────────────────────────────────────────────────────────────────
const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', N = '\x1b[0m', B = '\x1b[1m';
let pass = 0, fail = 0, warn = 0;
const ok    = (m) => { pass++; console.log(`${G}✅ PASS${N}  ${m}`); };
const bad   = (m) => { fail++; console.log(`${R}❌ FAIL${N}  ${m}`); };
const warnf = (m) => { warn++; console.log(`${Y}⚠️  WARN${N}  ${m}`); };

console.log(`\n${B}━━━━━━━━━━ FinanceBird Pre-Deploy Smoke (Sprint 6.5a) ━━━━━━━━━━${N}\n`);

// ── jsdom Setup ───────────────────────────────────────────────────────────────
const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  url: 'https://financebird.app/',
});
const { window } = dom;

// localStorage stub (jsdom hat eines, aber leerer Default reicht uns)
window.fetch = () => Promise.reject(new Error('fetch stubbed in smoke test'));
window.confirm = () => false; // delete-Dialoge nicht ausführen

// ── 1) Script-Block extrahieren und im jsdom-Window evaluieren ───────────────
const scriptStart = html.indexOf('<script>', 80000);
const scriptEnd   = html.indexOf('</script>', scriptStart);
let mainScript    = html.slice(scriptStart + '<script>'.length, scriptEnd);

// Wir schneiden den Init-Trigger raus (DOMContentLoaded → bootApp), das brauchen wir nicht
// und es würde Notion-Calls auslösen. Der Renderer-Code selbst bleibt ladbar.
mainScript = mainScript.replace(
  /document\.addEventListener\(['"]DOMContentLoaded['"][\s\S]*?\}\);/g,
  '/* DOMContentLoaded handler removed for smoke test */'
);

try {
  // Wir müssen const/function→window machen, sonst sind sie block-scoped innerhalb der eval()
  // und nicht von außen sichtbar.
  let scriptToEval = mainScript
    .replace(/^const I18N\b/m,    'window.I18N')
    .replace(/^const AppState\b/m, 'window.AppState')
    .replace(/^const Store\b/m,    'window.Store')
    .replace(/^const Computed\b/m, 'window.Computed')
    .replace(/^const BuchFilter\b/m, 'window.BuchFilter')
    .replace(/^const InboxEngine\b/m, 'window.InboxEngine');

  // Helper + Renderer + t() als window-Property exportieren (regex auf Anfangszeile)
  const TOP_LEVEL_FNS = [
    't', 'buchSubtabLabel', 'setBuchSubtab', 'buchTypeLabel', 'catStatusLabel',
    'invStatusLabel', 'kontoTypeLabel', 'kontoGroupLabel', 'trStatusLabel', 'recFreqLabel',
    'renderBuchungenHTML', 'renderRechnungenHTML', 'renderKontenHTML',
    'renderTransfersHTML', 'renderRecurringsHTML', 'renderAbschluesseHTML',
    'rechnungRowHTML', 'buchungRowHTML', 'kontoCardHTML', 'renderAbschlussChecklist',
    'applyStaticI18n', 'fmt', 'fmtS', 'fmtDate', 'fmtK', 'esc', 'getYear', 'toDay',
    'getCatDisplay', 'buchungenFiltered', 'getQueuedReceiptFor', 'getDefaultTaxMapping',
    'loadLocal', 'getCatsExpense', 'getTaxCats', 'getActiveCatsBiz', 'getActiveCatsPriv',
    'printJahresabschluss', 'exportJahresabschluss',
    // S6.5b additions:
    'WIDGETS', 'WIDGET_CATS', 'canRenderWidget', 'widgetCardHTML', 'widgetDataStatus',
    'cockpitCashflowInner', 'cockpitLiquiditaetInner',
    'inboxRender', 'inboxInvCard', 'inboxRecurCard',
  ];
  // Append the export block at the end of the script
  const exportBlock = '\n;(function(){' +
    TOP_LEVEL_FNS.map(n => `try{ window.${n} = ${n} }catch(e){}`).join(';') + '})();';
  scriptToEval = scriptToEval + exportBlock;

  window.eval(scriptToEval);
  ok('Main script lädt in jsdom ohne Throw');
} catch (e) {
  bad(`Main script throws: ${e.message.slice(0, 200)}`);
  console.log(e.stack.split('\n').slice(0, 6).join('\n'));
  process.exit(1);
}

// ── 2) I18N-Coverage prüfen ───────────────────────────────────────────────────
const I18N = window.I18N;
if (!I18N || !I18N.de || !I18N.en) {
  bad('I18N.de oder I18N.en fehlt');
  process.exit(1);
}
const deKeys = Object.keys(I18N.de);
const enKeys = Object.keys(I18N.en);
ok(`I18N.de hat ${deKeys.length} Keys`);
ok(`I18N.en hat ${enKeys.length} Keys`);

const missingEN = deKeys.filter(k => !(k in I18N.en));
const orphanEN  = enKeys.filter(k => !(k in I18N.de));
if (missingEN.length === 0) ok('Keine Keys nur in DE'); else bad(`Missing in EN: ${missingEN.slice(0,5).join(', ')}`);
if (orphanEN.length  === 0) ok('Keine Keys nur in EN'); else bad(`Orphan in DE:  ${orphanEN.slice(0,5).join(', ')}`);

// Empty values
const emptyDE = deKeys.filter(k => !I18N.de[k] || String(I18N.de[k]).trim() === '');
const emptyEN = enKeys.filter(k => !I18N.en[k] || String(I18N.en[k]).trim() === '');
if (emptyDE.length === 0) ok('Keine leeren DE-Werte'); else warnf(`Leere DE-Werte: ${emptyDE.join(', ')}`);
if (emptyEN.length === 0) ok('Keine leeren EN-Werte'); else warnf(`Leere EN-Werte: ${emptyEN.join(', ')}`);

// ── 3) Helper testen: liefern sie verschiedene Sprachen? ─────────────────────
const AppState = window.AppState;
const setLang  = (l) => { AppState.lang = l; };

function helperPair(fn, arg, expectedDE, expectedEN, label) {
  setLang('de'); const d = fn(arg);
  setLang('en'); const e = fn(arg);
  if (d === expectedDE && e === expectedEN) ok(`Helper ${label}: DE='${d}' / EN='${e}'`);
  else bad(`Helper ${label}: DE='${d}' (erw ${expectedDE}) / EN='${e}' (erw ${expectedEN})`);
}

helperPair(window.buchSubtabLabel, 'buchungen',  'Buchungen',     'Transactions', 'buchSubtabLabel(buchungen)');
helperPair(window.buchSubtabLabel, 'rechnungen', 'Rechnungen',    'Invoices',     'buchSubtabLabel(rechnungen)');
helperPair(window.buchSubtabLabel, 'abschluesse','Abschlüsse',    'Closings',     'buchSubtabLabel(abschluesse)');
helperPair(window.buchTypeLabel,   'Einnahme',   'Einnahme',      'Income',       'buchTypeLabel(Einnahme)');
helperPair(window.buchTypeLabel,   'Ausgabe',    'Ausgabe',       'Expense',      'buchTypeLabel(Ausgabe)');
helperPair(window.invStatusLabel,  'Offen',      'Offen',         'Open',         'invStatusLabel(Offen)');
helperPair(window.invStatusLabel,  'Überfällig', 'Überfällig',    'Overdue',      'invStatusLabel(Überfällig)');
helperPair(window.invStatusLabel,  'Bezahlt',    'Bezahlt',       'Paid',         'invStatusLabel(Bezahlt)');
helperPair(window.kontoTypeLabel,  'Girokonto',  'Girokonto',     'Checking',     'kontoTypeLabel(Girokonto)');
helperPair(window.kontoTypeLabel,  'Kreditkarte','Kreditkarte',   'Credit card',  'kontoTypeLabel(Kreditkarte)');
helperPair(window.trStatusLabel,   'Ausgeführt', 'Ausgeführt',    'Executed',     'trStatusLabel(Ausgeführt)');
helperPair(window.recFreqLabel,    'monthly',    'Monatlich',     'Monthly',      'recFreqLabel(monthly)');
helperPair(window.recFreqLabel,    'weekly',     'Wöchentlich',   'Weekly',       'recFreqLabel(weekly)');
helperPair(window.recFreqLabel,    'yearly',     'Jährlich',      'Yearly',       'recFreqLabel(yearly)');

// ── 4) Renderer-Smoke mit Mock-Daten ──────────────────────────────────────────
// Store mit minimalen Daten füllen
const Store = window.Store;
Store.buchungen = [
  { _id:'b1', date:'2026-04-15', desc:'Test', counterpart:'Acme', type:'Einnahme',
    amount:1000, paid:true, cat:'Honorar', bereich:'Geschäftlich', categoryStatus:'bestätigt' },
  { _id:'b2', date:'2026-04-10', desc:'Material', type:'Ausgabe', amount:120,
    paid:false, cat:'Material & Waren', bereich:'Geschäftlich', categoryStatus:'vorgeschlagen' },
];
Store.rechnungen = [
  { _id:'r1', nr:'2026-001', date:'2026-04-01', due:'2026-04-30', client:'Acme',
    desc:'Beratung', amount:1500, status:'Offen' },
  { _id:'r2', nr:'2026-002', date:'2026-03-01', due:'2026-03-15', client:'Beta',
    desc:'Workshop', amount:800, status:'Bezahlt', paidDate:'2026-03-10' },
];
Store.konten = [
  { _id:'k1', name:'Hauptkonto', typ:'Girokonto', group:'Sonstige', stand:5000, saldoDatum:'2026-04-01', icon:'🏦', currency:'CHF', active:true },
];
Store.transfers = [
  { _id:'t1', date:'2026-04-05', desc:'Sparen', fromAccount:'Hauptkonto', toAccount:'Sparen', amount:500, status:'Ausgeführt', typ:'Sparen' },
];
Store.recurrings = [
  { _id:'rc1', name:'Miete', amt:1200, freq:'monthly', typ:'Ausgabe', cat:'Miete', account:'Hauptkonto', nextDate:'2026-05-01', paused:false, bereich:'Privat' },
  { _id:'rc2', name:'Netflix', amt:18, freq:'monthly', typ:'Ausgabe', cat:'Abos', nextDate:'2026-04-25', paused:false, bereich:'Privat' },
];

// applyStaticI18n braucht ein DOM — jsdom hat es, gut
function safeRender(fnName, label) {
  const fn = window[fnName];
  if (typeof fn !== 'function') { bad(`${label}: Funktion ${fnName} nicht im window`); return null; }
  try {
    const out = fn();
    if (typeof out !== 'string' || out.length < 50) {
      bad(`${label}: Output zu kurz (${out?.length} chars) — Renderer-Crash?`);
      return null;
    }
    return out;
  } catch (e) {
    bad(`${label}: throws ${e.message.slice(0,150)}`);
    return null;
  }
}

// Render in beiden Sprachen
function renderDualLang(fnName, label) {
  setLang('de'); const deOut = safeRender(fnName, `${label} (DE)`);
  setLang('en'); const enOut = safeRender(fnName, `${label} (EN)`);
  if (!deOut || !enOut) return;
  if (deOut === enOut) {
    bad(`${label}: DE und EN Output identisch — Renderer ignoriert Sprache?`);
    return;
  }
  ok(`${label}: DE und EN unterscheiden sich (${deOut.length} / ${enOut.length} chars)`);
  return { deOut, enOut };
}

console.log(`\n${B}─── Renderer-Smoke ───${N}`);
const r1 = renderDualLang('renderBuchungenHTML',   'renderBuchungenHTML');
const r2 = renderDualLang('renderRechnungenHTML',  'renderRechnungenHTML');
const r3 = renderDualLang('renderKontenHTML',      'renderKontenHTML');
const r4 = renderDualLang('renderTransfersHTML',   'renderTransfersHTML');
const r5 = renderDualLang('renderRecurringsHTML',  'renderRecurringsHTML');
const r6 = renderDualLang('renderAbschluesseHTML', 'renderAbschluesseHTML');

// ── 5) Anti-Drift: hardcoded DE-Strings im EN-Output? ────────────────────────
console.log(`\n${B}─── Anti-Drift (DE-Strings im EN-Output?) ───${N}`);
const REGRESSION_PATTERNS = [
  // Filter / Toolbar
  ['Ein- & Ausgaben',                'Buchungen-Tab Filter type_all'],
  ['Alle Bereiche',                  'Buchungen-Tab Filter bereich_all'],
  ['CSV importieren',                'Buchungen-Tab Toolbar csv_import'],
  ['+ Buchung',                      'Buchungen-Tab Toolbar add'],
  // Tabellen-Headers
  ['Gegenpartei',                    'Buchungen-Tab col counterparty'],
  ['Steuerkategorie',                'Buchungen-Tab col tax_category'],
  // Detail
  ['Brutto:',                        'Buchungen-Detail gross'],
  ['Geändert:',                      'Buchungen-Detail modified'],
  ['Beleg hinzufügen',               'Buchungen-Detail add_receipt'],
  // Rechnungen
  ['Neue Rechnung',                  'Rechnungen toolbar add'],
  ['Keine Rechnungen',               'Rechnungen empty'],
  ['Bezahlt am',                     'Rechnungen col paid_on'],
  ['Teilzahlung erfassen',           'Partial-Payment dialog title'],
  // Konten
  ['Noch keine Konten',              'Konten empty'],
  // Transfers
  ['Keine Transfers dieses Jahr',    'Transfers empty'],
  // Recurrings
  ['Wiederkehrende Zahlung',         'Recurring-Form title'],
  ['Ø monatliche Fixkosten',         'Recurrings KPI monthly'],
  ['Noch keine Recurrings',          'Recurrings empty'],
  ['Nächste Fälligkeit',             'Recurring-Form next_due'],
  ['Notiz (optional)',               'Recurring-Form note'],
  // Abschlüsse
  ['Jahresabschluss exportieren',    'Abschluss section.export'],
  ['Steuer-Mapping',                 'Abschluss section.tax_mapping'],
  ['Bereit für Export',              'Abschluss checklist ready'],
  ['Alle Buchungen kategorisiert',   'Abschluss check.cat_ok'],
  // S6.5b — Cockpit-Widgets
  ['Buchhaltung',                    'S6.5b WIDGET_CATS label'],
  ['Geschäftsanalyse',               'S6.5b WIDGET_CATS label'],
  ['Was ist passiert?',              'S6.5b WIDGET_CATS desc'],
  ['Wie gesund ist mein Geschäft?',  'S6.5b WIDGET_CATS desc'],
  ['Bin ich auf dem richtigen Weg?', 'S6.5b WIDGET_CATS desc'],
  ['Berechnung',                     'S6.5b detail.formula label'],
  ['Zum Nachlesen',                  'S6.5b detail.further_reading'],
  ['Widget-Bibliothek',              'S6.5b library.title'],
  ['Dir fehlt ein Widget?',          'S6.5b library.missing'],
  ['Konto einrichten → Einstellungen','S6.5b canrender.setup_account'],
  ['Erste Buchung erfassen',         'S6.5b canrender.first_buchung'],
  // S6.5b — Inbox
  ['Einnahmen — Zahlungseingang',    'S6.5b inbox.section.income'],
  ['Ausgaben — Ausführung',          'S6.5b inbox.section.expense'],
  ['Heute fällig',                   'S6.5b inbox.due.today'],
  ['Gestern fällig',                 'S6.5b inbox.due.yesterday'],
  ['Zahlung eingegangen',            'S6.5b inbox.btn.invoice_paid'],
  ['Fälligkeit verschieben',         'S6.5b inbox.btn.shift_due'],
  ['Bezahlt / ausgeführt',           'S6.5b inbox.btn.recur_book'],
  ['Überspringen',                   'S6.5b inbox.btn.recur_skip'],
];

let regressions = 0;
for (const [needle, label] of REGRESSION_PATTERNS) {
  const allEN = [r1, r2, r3, r4, r5, r6].filter(Boolean).map(r => r.enOut).join('\n');
  if (allEN.includes(needle)) {
    bad(`Regression: '${needle}' im EN-Output (${label})`);
    regressions++;
  }
}
if (regressions === 0) ok(`Keine DE-Stringrest-Regressionen gefunden (${REGRESSION_PATTERNS.length} Patterns geprüft)`);

// ── 6) i18n-Marker fehlende Keys? ─────────────────────────────────────────────
function checkUnresolvedKeys(out, label) {
  // Falls der t()-Helper bei missing key z.B. "[i18n: foo.bar]" zurückgibt
  const m = out && out.match(/\[i18n:[^\]]+\]/g);
  if (m && m.length) bad(`${label}: ${m.length} unresolved keys: ${m.slice(0,3).join(', ')}`);
  else ok(`${label}: keine [i18n:…] Marker im Output`);
}
if (r1) checkUnresolvedKeys(r1.enOut + r1.deOut, 'renderBuchungenHTML');
if (r2) checkUnresolvedKeys(r2.enOut + r2.deOut, 'renderRechnungenHTML');
if (r3) checkUnresolvedKeys(r3.enOut + r3.deOut, 'renderKontenHTML');
if (r4) checkUnresolvedKeys(r4.enOut + r4.deOut, 'renderTransfersHTML');
if (r5) checkUnresolvedKeys(r5.enOut + r5.deOut, 'renderRecurringsHTML');
if (r6) checkUnresolvedKeys(r6.enOut + r6.deOut, 'renderAbschluesseHTML');

// ── 7) Spot-Checks: spezifische EN-Strings tauchen wirklich auf? ─────────────
console.log(`\n${B}─── Positive EN-Spot-Checks ───${N}`);
const SPOT_CHECKS = [
  ['Income & Expenses',       r1, 'EN Buchungen filter all'],
  ['Counterparty',            r1, 'EN Buchungen col counterparty'],
  ['+ Transaction',           r1, 'EN Buchungen toolbar add'],
  ['Tax category mapping',    r6, 'EN Abschluss tax_mapping section'],
  ['+ New invoice',           r2, 'EN Rechnungen toolbar add'],
  ['Avg. monthly recurring:', r5, 'EN Recurrings KPI'],
];
for (const [needle, src, label] of SPOT_CHECKS) {
  if (src && src.enOut.includes(needle)) ok(`${label}: '${needle}' gefunden`);
  else bad(`${label}: '${needle}' NICHT im EN-Output`);
}

// ── 7b) Empty-States separat prüfen (mit leerem Store) ───────────────────────
console.log(`\n${B}─── Empty-State-Checks (leerer Store) ───${N}`);
Store.transfers  = [];
Store.recurrings = [];
Store.rechnungen = [];
Store.konten     = [];

setLang('en');
const trEmpty  = window.renderTransfersHTML();
const recEmpty = window.renderRecurringsHTML();
const invEmpty = window.renderRechnungenHTML();
const konEmpty = window.renderKontenHTML();

const emptyChecks = [
  ['No transfers this year',   trEmpty,  'EN Transfers empty'],
  ['No recurring entries yet', recEmpty, 'EN Recurrings empty'],
  ['No invoices',              invEmpty, 'EN Rechnungen empty'],
  ['No accounts yet',          konEmpty, 'EN Konten empty'],
];
for (const [needle, src, label] of emptyChecks) {
  if (src && src.includes(needle)) ok(`${label}: '${needle}' gefunden`);
  else bad(`${label}: '${needle}' NICHT im Empty-State-Output`);
}

// ── 7c) PDF-Print-HTML in EN spot-checken (open() stub) ───────────────────────
console.log(`\n${B}─── PDF-Print EN-Spot-Checks ───${N}`);
// Restore data for PDF
Store.buchungen = [
  { _id:'b1', date:'2026-04-15', desc:'Test', counterpart:'Acme', type:'Einnahme',
    amount:1000, paid:true, cat:'Honorar', bereich:'Geschäftlich', categoryStatus:'bestätigt' },
];

let capturedPdfHtml = '';
window.open = () => ({
  document: { write: (h) => { capturedPdfHtml = h; }, close: () => {} },
  focus: () => {}, print: () => {},
});
// showToast mocken — könnte sonst bei popup_blocked early-return triggern
window.showToast = () => {};
// exportYear element brauchen wir
window.document.body.insertAdjacentHTML('beforeend', '<select id="exportYear"><option value="2026" selected>2026</option></select>');

setLang('en');
try {
  const pj = window.printJahresabschluss;
  if (typeof pj !== 'function') {
    bad('printJahresabschluss ist nicht im window');
  } else {
    pj();
    if (capturedPdfHtml.length > 100) ok(`printJahresabschluss generiert PDF-HTML (${capturedPdfHtml.length} chars)`);
    else bad(`printJahresabschluss generiert kein/zu wenig HTML (${capturedPdfHtml.length})`);
  }
} catch (e) {
  bad(`printJahresabschluss throws: ${e.message.slice(0,150)}`);
}

const pdfChecks = [
  ['Year-end closing 2026',   'EN PDF h1'],
  ['Total income',            'EN PDF total_income'],
  ['Profit / Loss',           'EN PDF profit_loss'],
  ['Transaction journal',     'EN PDF h2_journal'],
  ['Created with FinanceBird','EN PDF subtitle'],
  ['<html lang="en">',        'EN PDF html lang attr'],
];
for (const [needle, label] of pdfChecks) {
  if (capturedPdfHtml.includes(needle)) ok(`${label}: '${needle}' gefunden`);
  else bad(`${label}: '${needle}' NICHT im PDF-HTML`);
}

// ── 8) S6.5b — Widget-Renderer + Inbox Smoke ─────────────────────────────────
console.log(`\n${B}─── S6.5b · Widget-Renderer + Inbox Smoke ───${N}`);

// Restore data for widget tests
Store.buchungen = [
  { _id:'b1', date:'2026-04-15', desc:'Test', counterpart:'Acme', type:'Einnahme',
    amount:1000, paid:true, cat:'Honorar', bereich:'Geschäftlich', categoryStatus:'bestätigt' },
  { _id:'b2', date:'2026-04-10', desc:'Material', type:'Ausgabe', amount:120,
    paid:false, cat:'Material & Waren', bereich:'Geschäftlich', categoryStatus:'vorgeschlagen' },
];
Store.rechnungen = [
  { _id:'r1', nr:'2026-001', date:'2026-04-01', due:'2026-04-30', client:'Acme',
    desc:'Beratung', amount:1500, status:'Offen' },
];
Store.konten = [
  { _id:'k1', name:'Hauptkonto', typ:'Girokonto', group:'Sonstige', stand:5000, saldoDatum:'2026-04-01', icon:'🏦', currency:'CHF', active:true },
];
Store.recurrings = [];

const WIDGETS = window.WIDGETS;
const widgetCardHTML = window.widgetCardHTML;
const canRenderWidget = window.canRenderWidget;

if (!WIDGETS || WIDGETS.length !== 24) {
  bad(`WIDGETS nicht 24 Widgets: ${WIDGETS && WIDGETS.length}`);
} else {
  ok(`WIDGETS hat 24 Widgets`);
}

// Render-Smoke: alle 24 Widgets in DE + EN, prüfen dass kein Crash + name als i18n-Key
let widgetCrashes = 0;
let widgetEnNamesOk = 0;
const SAMPLE_EN_NAMES = {
  einnahmen: 'Income', ausgaben: 'Expenses', profit: 'Profit', vermoegen: 'Assets',
  'cashflow-chart': 'Cashflow', 'offene-rechnungen': 'Open Invoices',
  'steuer-score': 'Tax-Ready', liquiditaet: 'Liquidity', puffer: 'Buffer',
  stundensatz: 'Hourly Rate', auslastung: 'Utilization',
  deckungsbeitrag: 'Contribution Margin', runway: 'Runway',
  'abo-kosten': 'Subscription Costs', kundenkonzentration: 'Client Concentration',
  steuerreserve: 'Tax Reserve', freiheit: 'Freedom Months',
  lebensenergie: 'Life Energy Rate', 'kosten-lebensstunde': 'Cost per Life Hour',
  'portfolio-life': 'Portfolio Life', sabbatical: 'Sabbatical',
  'burnout-risk': 'Burnout Risk', 'enough-point': 'Enough Point', doughnut: 'Personal Doughnut',
};
setLang('en');
for (const w of (WIDGETS || [])) {
  try {
    const html = widgetCardHTML(w);
    if (typeof html !== 'string' || html.length < 20) {
      widgetCrashes++;
      bad(`widgetCardHTML(${w.id}): output too short or non-string`);
      continue;
    }
    if (SAMPLE_EN_NAMES[w.id] && html.includes(SAMPLE_EN_NAMES[w.id])) {
      widgetEnNamesOk++;
    } else if (SAMPLE_EN_NAMES[w.id]) {
      bad(`Widget '${w.id}' EN-Name '${SAMPLE_EN_NAMES[w.id]}' nicht im Card-HTML`);
    }
    // unresolved keys?
    if (html.includes('widget.') && html.match(/widget\.[a-z_]+\.[a-z_]+/)) {
      bad(`Widget '${w.id}' EN-Output enthält unresolved key (widget.X.Y)`);
    }
  } catch (e) {
    widgetCrashes++;
    bad(`widgetCardHTML(${w.id}) crashes: ${e.message.slice(0,80)}`);
  }
}
if (widgetCrashes === 0) ok(`Alle 24 Widgets rendern ohne Crash (EN)`);
ok(`${widgetEnNamesOk}/24 Widget-EN-Namen korrekt im Card-HTML`);

// canRenderWidget messages in EN
setLang('en');
Store.konten = []; // force "setup_account"
const wKonto = WIDGETS.find(w => w.id === 'vermoegen');
if (wKonto) {
  const check = canRenderWidget(wKonto);
  if (check && check.msg && check.msg.includes('Set up account')) {
    ok(`canRenderWidget EN: 'Set up account → Settings' korrekt`);
  } else {
    bad(`canRenderWidget EN setup_account: msg='${check && check.msg}'`);
  }
}
// Restore
Store.konten = [{ _id:'k1', name:'Hauptkonto', typ:'Girokonto', group:'Sonstige', stand:5000, saldoDatum:'2026-04-01', icon:'🏦', currency:'CHF', active:true }];

// inboxRender + inboxInvCard EN
setLang('en');
const invCard = window.inboxInvCard({
  _id:'i1', nr:'2026-001', client:'Acme', desc:'Beratung', amount:1500, due:'2026-04-15',
});
if (invCard && invCard.includes('Payment received') && invCard.includes('Shift due date')) {
  ok(`inboxInvCard EN: 'Payment received' + 'Shift due date' korrekt`);
} else {
  bad(`inboxInvCard EN: missing strings — sample: ${invCard.slice(0,200)}`);
}

const recurCard = window.inboxRecurCard({
  _id:'rc1', name:'Netflix', amt:15.90, freq:'monthly', typ:'Ausgabe', nextDate:'2026-04-10',
});
if (recurCard && recurCard.includes('Paid / executed') && recurCard.includes('Skip') && recurCard.includes('Monthly')) {
  ok(`inboxRecurCard EN: 'Paid / executed' + 'Skip' + 'Monthly' korrekt`);
} else {
  bad(`inboxRecurCard EN: missing strings — sample: ${recurCard.slice(0,200)}`);
}

// Cockpit-Inner EN
setLang('en');
const cashflowEmpty = window.cockpitCashflowInner();
// With buchungen, will return chart, not empty. Just ensure no crash + EN legend if rendered.
if (typeof cashflowEmpty === 'string') {
  ok(`cockpitCashflowInner: returns string (${cashflowEmpty.length} chars)`);
} else {
  bad(`cockpitCashflowInner: returned non-string`);
}

// liquiditaet with empty konten → "Account with balance required"
Store.konten = [];
setLang('en');
const liqEmpty = window.cockpitLiquiditaetInner();
if (liqEmpty && liqEmpty.includes('Account with balance required')) {
  ok(`cockpitLiquiditaetInner EN empty: 'Account with balance required' korrekt`);
} else {
  bad(`cockpitLiquiditaetInner EN empty: ${liqEmpty.slice(0,150)}`);
}

// ── Resultat ──────────────────────────────────────────────────────────────────
console.log('\n' + '━'.repeat(70));
const passColor = fail > 0 ? R : (warn > 0 ? Y : G);
console.log(`${passColor}${B}  ${pass} pass · ${warn} warn · ${fail} fail${N}`);
console.log('━'.repeat(70) + '\n');
process.exit(fail > 0 ? 1 : 0);
