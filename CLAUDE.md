# CLAUDE.md — FinanceBird / OHKT Budget App

> Kontext-Datei für KI-Assistenten. Letzte Aktualisierung: 2026-03-03

---

## Was ist das?

Eine **Single-File PWA** für Schweizer Einzelfirma-Buchhaltung (Oswald H. König Transformation, Kanton Zürich).
Technologie: Plain HTML + Vanilla JS + CSS — kein Build-System, kein Framework, kein Backend.

**Live-URL:** https://siio-kunto.github.io/budget-app/financebird_v1.html  
**GitHub Repo:** https://github.com/siio-kunto/budget-app  
**Einzige relevante Datei:** `financebird_v1.html` (~4900 Zeilen)

---

## Architektur

### Datenspeicherung
Alle Daten leben in **Notion** (kein eigener Server). Zugriff via Cloudflare Worker Proxy:
```
https://notion-proxy.holy-forest-0174.workers.dev/v1
```

### Notion Datenbanken
| Variable | ID | Inhalt |
|---|---|---|
| `DB_BUCHUNGEN` | `9fcdf5fe3b9648ac8b19c66ecd33417a` | Alle Transaktionen (Einnahmen/Ausgaben) |
| `DB_RECHNUNGEN` | `966caa95a0334bb18a2cc9bac7de2ddf` | Ausgangsrechnungen |
| `DB_TRANSFERS` | `1dd17e6663d04fb9bcd873b8228e2ef9` | Interne Transfers + Kontobewegungen |
| `DB_PROJEKTE` | `90f9ea24161d4aff91898618a62913c4` | Schulden / Sparziele / Investitionen |
| `DB_KONTEN` | `bab0304784e34979aa40ed3ffa916da9` | Kontodefinitionen |

### Externe APIs
- **Clockify** (`api.clockify.me/api/v1`) — Zeiterfassung, sync via API Key
- **Claude AI** (`api.anthropic.com/v1/messages`) — Beleganalyse (Vision), Modell: `claude-opus-4-6`
- **Google Drive** (OAuth 2.0, Client ID: `525241680265-...`) — Beleg-Upload, Parent Folder: `1NCSz86nG3Q0QRNu7Ltw-ZTYqhin0yNSS`
- **Frankfurter API** — Währungsumrechnung (FX)

### localStorage Keys
Alle Keys die die App local speichert:
- `notionToken` — Notion Integration Secret
- `clockifyApiKey` — Clockify API Key
- `claudeApiKey` — Anthropic API Key
- `accountsDef` / `accountBalances` — Kontodefinitionen und -stände
- `projektCache` — Projekte (Schulden/Spar/Investitionen)
- `projekte` — Clockify-Projekte (lokale Definitionen)
- `clockifyProjects` / `clockifyHours` / `clockifyMonthly` — Clockify Sync Cache
- `recurrings` — Wiederkehrende Ausgaben
- `txCache_backup` / `invCache_backup` — Offline Fallback Cache
- `thumbs` — Beleg-Thumbnails (Base64, key = Notion Page ID)
- `taxMapping` — Steuer-Kategorie-Mapping (User-Override)
- `pendingQueue` — Offline Queue für fehlgeschlagene Notion-Writes
- `lastSyncTime` / `lastClockifySync` — Sync-Timestamps

---

## Tab-Struktur (Navigation)

| Tab ID | Funktion |
|---|---|
| `uebersicht` | Dashboard: Cashflow, KPIs, Charts |
| `erfassen` | Neue Buchung / Einnahme / Ausgabe / Interner Transfer |
| `rechnungen` | Ausgangsrechnungen verwalten |
| `projekte` | Clockify-Projekte, Stundensätze, Analyse |
| `leben` | Schulden/Sparziele, Kontostände, Recurring |
| `buchungen` | Alle Transaktionen (filterable Tabelle) |
| `einstellungen` | API Keys, Danger Zone |

---

## Wichtige Code-Konventionen

```js
// Notion API wrapper
notionFetch(path, method, body, token)
notionQueryAll(dbId, filter)        // paginiert automatisch

// State
txCache[]     // alle Buchungen (aus Notion geladen)
invCache[]    // alle Rechnungen
projektCache[] // Projekte aus DB_PROJEKTE
ACCOUNTS_DEF[] // Konten (aus DB_KONTEN oder Fallback)

// Entry form state
entryType     // 'income' | 'expense' | 'intern'
entryBereich  // 'business' | 'private'
entryCategory // aktuell gewählte Kategorie
entrySource   // aktuell gewählte Einnahmequelle
currentEditTxId // null = neu, string = edit-mode

// Kategorien
CATS_BIZ[]    // Geschäftliche Ausgaben-Kategorien
CATS_PRIV[]   // Private Ausgaben-Kategorien
INCOME_SOURCES[] // Einnahmequellen

// Formatting
fmt(v)        // 1234.50 → "1'234.50"
fmtS(v)       // → "CHF 1'234.50"
fmtDate(d)    // YYYY-MM-DD → "01.03.26"
toDay()       // → "2026-03-03"
```

### Offline Queue Pattern
Statt direkt zu Notion zu schreiben:
```js
const {success, result} = await notionSaveWithQueue(DB_BUCHUNGEN, props, meta)
// → queued lokal, sofort an Notion versucht
// → bei Fehler: in pendingQueue gespeichert, retry bei nächstem loadAll()
```

---

## Bisherige Entwicklungsgeschichte

### Sessions 1–7: Aufbau
- Deployment auf GitHub Pages
- 5-DB Notion Architektur designt und implementiert
- Clockify Integration (Zeiterfassung → echter Stundensatz)
- AI Beleganalyse (Claude Vision → Felder auto-ausfüllen)
- Jahresabschluss CSV Export
- Währungsumrechner (FX Bar)
- Offline Queue System

### Session 8–9: Extension-Verbindung troubleshooting
Claude in Chrome Extension für Browser-Automation verbunden

### Session 10: Stress-Test (16 Bugs identifiziert)
Vollständiger Test mit 10 Szenarien. Testdaten aus Notion archiviert.

### Session 11–12: Bug-Fix Konsolidierung
Extension handelte autonom und committete ältere Version auf GitHub.
**Aktueller Stand:** `financebird_v1.html` ist die konsolidierte Version mit allen Fixes.

---

## Bug Status

### ✅ Gefixt (in aktueller financebird_v1.html)
| Bug | Problem | Fix |
|---|---|---|
| BUG-01 | Filter-Bar nach Tab-Wechsel verschwunden | `window.scrollTo(0,0)` in `go()` |
| BUG-03 | Kein in-app Edit für Buchungen | `openTxEdit()` + Edit-Banner in Erfassen |
| BUG-05 | Mobile Nav Icons unsichtbar | `min-width:501px` CSS Regel entfernt |
| BUG-07 | Formular nach Speichern nicht resettet | `setType/setBereich` + `dupWarn` reset |
| BUG-09 | Komma statt Punkt im Betrag-Feld | `replace(',','.')` auf eAmt oninput |
| BUG-10 | Kein Offline-Banner | `window.addEventListener offline/online` |
| BUG-12 | Nav-Bar auf 390px nicht scrollbar | `-webkit-overflow-scrolling:touch` |
| BUG-15 | Kein maxlength auf Beschreibung | `maxlength="300"` auf eDesc |
| BUG-16 | CSS Media Query Tipp-Fehler | `prefers-contrast` + `prefers-reduced-motion` |

### 🔴 Offen (erfordern grössere Refactoring)
| Bug | Problem | Aufwand |
|---|---|---|
| BUG-02 | Spaltenbreiten Buchungstabelle inkonsistent | Mittel — CSS table-layout:fixed |
| BUG-04 | Cashflow Chart leer (keine Daten) | Gering — wahrscheinlich Datenproblem |
| BUG-06 | Double-active Nav bei bestimmten Flows | Gering — State-Tracking |
| BUG-11 | Tabelle auf Mobile scrollt nicht gut | Mittel — touch-action |
| BUG-13 | Emoji Icons in manchen Browsern hidden | Gering — font-family fallback |
| BUG-14 | Doppelte Fehlermeldung bei validierung | Gering — showFeedback dedup |

---

## Nächste mögliche Features (Backlog)

- [ ] BUG-04 klären: Cashflow Chart mit echten Testdaten prüfen
- [ ] Kontostand-History (Transfers DB als Audit Trail nutzen)
- [ ] PDF Beleg-Viewer inline (statt nur Drive-Link)
- [ ] Rechnungs-PDF Generator (Ausgabe als PDF für Kunden)
- [ ] Steuerformular CH Export (direkter Import in TreuhandSoftware)
- [ ] Push Notifications für fällige Recurring Payments

---

## Deployment

```bash
# Einziger Deploy-Schritt:
# financebird_v1.html direkt auf GitHub committen
# GitHub Pages deployed automatisch auf:
# https://siio-kunto.github.io/budget-app/financebird_v1.html
```

**Kein Build-Step. Kein npm. Kein Framework.**  
Datei bearbeiten → auf GitHub hochladen → fertig.
