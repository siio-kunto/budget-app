# FinanceBird · Entwicklungsarchiv
> Zentrales Archiv aller Sessions — vollständige Dokumentation, keine Nuance geht verloren.
> Stand: 2026-04-08 (Session 20)

---

## Index — Schnellzugriff nach Thema

| Thema | Sessions | Suchbegriffe |
|---|---|---|
| Onboarding (Screens, Flow, Step-Saving) | S3-Block2, S4a-Bugs, S4b-Patch, **S9** | `onboardNext`, `showQuizAfterAuth`, `healthCheck`, `fb_onboard_step`, Welcome/License/Country/Accounts/Integrations/Overview |
| Onboarding v3 Redesign | **S9** | `healthCheck`, `healthSummary`, `3-Path Router`, `Pfad A/B/C`, `obRenderOverview`, `v3SubmitPairingCode`, `v3RenderRepair` |
| Settings-Sync (Notion ↔ localStorage) | **S9** | `saveSettingsToNotion`, `loadSettingsFromNotion`, `ensureSettingsSchema`, `FB · Einstellungen` |
| OAuth Race Condition (BUG-032) | **S9** | `fb_db_create_lock`, Mutex, `callbackPage`, Zwei-Tab, Polling |
| Pairing-Flow Mobile (BUG-036, BUG-037, BUG-042) | **S10**, **S11**, **S12**, **S13** | `v3SubmitPairingCode`, `claimPairingCode`, `fb_pairing_active`, `_startPolling`, `window.open`, `visibilitychange`, `window.location.href`, Strategie B, `isMobile`, Auto-Redirect, `oauthBridgePage`, meta-refresh, iOS Universal Links |
| GDrive Bugs (BUG-033, 034, 035) | **S11**, **S12** | `getGDriveToken`, `getGDriveParent`, `erfShowReceiptUI`, `sessionStorage`, GSI, `waitForGoogle`, `gdriveConfigured` |
| KI-Beleg-Erkennung (BUG-039) | **S13** | `analyseBeleg`, `applyAiBelegResult`, `erfApplyAiFields`, `window._lastKiResult`, JSON-in-onclick, HTML-Attribut-Escaping |
| Code-Audit + Security Review | **S11** | Monkey-Patch, Hoisting, doppelte Funktionen, Rate-Limiting, CORS, Shared Secret |
| Architektur-Regeln (A1–A7) | **S11**, **S12**, **S13** | Kein Monkey-Patch, keine Duplikate, Token aktiv holen, Block-Integrität, kein JSON in onclick |
| Abstraktionsschicht (A8, Interfaces, Adapter) | **S14** | VisionInterface, StorageInterface, DataLayerInterface, ClaudeAdapter, GDriveAdapter, NotionAdapter CRUD, Queue/Sync delegiert, `getActiveXAdapter()` |
| PWA-Install-Flow | **S14** | `isPWAInstalled()`, `showPWAInstallScreen()`, `skipPWAInstall()`, `beforeinstallprompt`, `triggerPwaInstall()` |
| E2E-Test + App-Logik-Bugs | **S15** | Cashflow-Chart width:0, manifest start_url, transferToProps empty select, Queue sanitization, BUG-050–060 |
| **App-Logik-Audit (BL-065)** | **S16** | 13 Bereiche, Rechnung→Buchung, Recurring-Typ, Projekte/Ziele-Klärung, Teilzahlungen, DS1/DS2/DS3 |
| **DS1 Cockpit Grundsatz-Session** | **S17** | Widget-Bibliothek, Library First, 3 Kategorien, 22 Widgets, HHI, Lebensenergie, Doughnut, Checkin-System, Score-Revision, Multi-Währung, SortableJS |
| Monkey-Patch Bereinigung + BL-052 | **S12** | `_origErfShowReceiptUI`, `_origNav`, `_origDeleteBuchung`, `_origPreviewRechnung`, `renderKompass` Duplikat, `showPairingFallback` Duplikat |
| Rate-Limiting + CORS (BL-053, BL-054) | **S12** | `checkRateLimit`, `corsHeaders(request)`, Origin-Whitelist, Worker v1.2.2/v1.1.1 |
| MerchantRules Fix (BUG-038) | **S12** | `loadMerchantRules`, `saveMerchantRules`, Object vs Array, Upsert |
| Kategorien & MWST | S3-Block1 | `CATEGORIES_20`, `MWST_DEFAULTS`, `TAX_MAPPING`, `ensureBuchungenSchema` |
| Erfassen-Workflow | S3-Block3 | FAB, Segmented Control, Transfer inline, `openErfassenScan`, Merchant-Suggestion |
| Lernmechanismus & Kategorie-Status | S3-Block4 | `merchantRules`, `suggestCategory`, `mergeKiWithRules`, `categoryStatus` |
| Steuerbereit-Score & Review-Queue | S3-Block5, **S17** | `calculateTaxReadiness`, Progress-Ring, `BuchFilter.review`, Quick-Action ✓, Gewichtung 40/30/10/20 |
| Einstellungen (Land, MWST, Zusammenarbeit) | S3-Block6 | `setCountry`, `addCollaborator`, `renderCollabList` |
| Portal-Dashboard (Treuhänder) | S3-Block7 | `financebird_portal.html`, Validieren, Korrigieren, CSV-Export |
| Buchungs-Detailansicht | S3-Block8 | `toggleBuchungDetail`, Detail-Row |
| Worker-Architektur | S2, S3, **S9**, **S12**, **S13** | Worker A/B, KV, Rate-Limiting, OAuth, `callbackPage`, `corsHeaders`, Origin-Whitelist, `oauthBridgePage` |
| Domain & Deployment | S4a | `financebird.app`, GitHub Pages, DNS, CNAME |
| renderEinstellungen Infinite Loop | S4b-B3 | Hoisting, `_baseRenderEinstellungen`, Function Expression |
| DB-Erstellung & Retry | S4b-B4, **S9** | `createMissingDatabases`, 3 Attempts, Backoff, Mutex |
| Fehler-mit-Lösungsweg-Prinzip | S4a (Entscheid), S4b (Umsetzung) | Action-Buttons, Toast, `showToast` |
| Bug-Escalation-Protokoll | **S13** | Chat-übergreifend, BRIEFING/FIX-BRIEFING Prefix |
| **Widget-System Volltest + Bug-Audit** | **S19** | BUG-062–070, cashflowByMonth label, null-guards, requires-Mechanismus, Frankfurter CORS, POST 400 |
| **Widget-Fixes aus Strategie-Audit** | **S20** | canRenderWidget, zeitKPIs Aliases, Puffer/Deckungsbeitrag/Runway/Liquidität/Rechnungen Feld-Fixes, Cashflow px, SortableJS |

---

## Session 1 — Fundament (2026-03, Strategie-Chat)

Fundament-Satz, Personas, Constraints, Core Loop, Design-Prinzipien.
Vollständig dokumentiert in `strategie_kontext.md` Abschnitte 1–3.

---

## Sessions 2–8 — Build-Phase (2026-03)

Buchungen-System, Erfassen-Workflow, Steuerbereit-Score, Portal, Workers, Domain-Setup.
Detailliert dokumentiert in früheren Versionen dieses Archivs.

---

## Session 9 — Onboarding v3 Redesign (2026-03-18)

Vollständiger Neuaufbau des Onboarding-Flows mit 3-Path-Router (A: Fresh, B: Wiederkehrend, C: Reparatur).
Health-Check-System, Settings-Sync, OAuth Race Condition Fix.
Version: 2.9d.2026-03-18

---

## Session 10–11 — Pairing-Flow + Security Audit (2026-03-19/20)

Mobile Pairing mit QR, OAuth Bridge Page, Security Review.
Architektur-Regeln A1–A5 etabliert.
Version: 2.10a–2.11c

---

## Session 12 — Monkey-Patch Bereinigung + Workers (2026-03-24)

BL-052 Dead Code Cleanup, Rate-Limiting, CORS, MerchantRules Fix.
Worker v1.2.2/v1.1.1, A6 etabliert.
Version: 2.12a.2026-03-24

---

## Session 13 — KI-Beleg + Pairing-Bugs (2026-03-25)

BUG-039 JSON-in-onclick, BUG-042 Mobile Pairing, Worker v1.2.3.
A7 etabliert, Bug-Escalation-Protokoll.
Version: 2.13a.2026-03-25

---

## Session 14 — Abstraktionsschicht (2026-03-26)

VisionInterface/ClaudeAdapter, StorageInterface/GDriveAdapter, NotionAdapter CRUD.
A8 etabliert, PWA-Install-Flow.
Worker v1.2.4.
Version: 2.14d.2026-03-26

---

## Session 15 — E2E-Test (2026-03-28)

Erster vollständiger Durchlauf: Onboarding → Erfassen → Buchungen → Rechnungen → Cockpit.
BUG-050–058 gefunden und gefixt, BUG-059 → Strategie.
Version: 2.15c.2026-03-28

---

## Session 16 — App-Logik-Audit (2026-04-01, Strategie-Chat)

13 Bereiche systematisch geprüft. 15 Entscheide (E1–E15), 20 konkrete Implementierungen.
Design-Sessions DS1–DS6 definiert.
Kein HTML — reine Strategie + Entscheide.

---

## Session 17 — DS1 Cockpit Grundsatz-Session (2026-04-02, Strategie-Chat)

Widget-Bibliothek-Architektur. 22 Widgets in 3 Kategorien (Buchhaltung, Geschäftsanalyse, Kompass).
Metric-Inventory: 80+ Metriken. Library First Design.
Design-Prinzip #10 (Sinnvolle Defaults + Edit im Detail).
SortableJS vorgeschlagen, Multi-Währung-Architektur.

---

## Session 18 — Cockpit-Rebuild + Feature-Sprint (2026-04-03)

Massive Session: 20 Backlog-Items + 5 Bug-Fixes + 10 Audit-Implementierungen + Dead Code Cleanup.
BL-085 Cockpit-Rebuild mit 22 Widgets, Widget-Library, Detail-Overlay.
Multi-Währung (BL-083), Teilzahlungen (BL-078), Recurring Edit/Delete.
Version: 2.18a.2026-04-03

---

## Session 19 — Widget-System Volltest + Bug-Audit (2026-04-07)

### Kontext
Erste vollständige Test-Runde aller 22 Cockpit-Widgets nach dem S18-Rebuild.

### Was gemacht wurde
- **BUG-062 gefixt:** `cashflowByMonth()` gab kein `label`-Feld zurück → "undefined" Labels. Fix: `MONTH_SHORT[i]`-Array.
- **SW-Cache-Bump auf 2.18b** — macOS `sed`-Befehl-Problem (fehlende `''`).
- **Vollständiger Bug-Report erstellt:** `financebird_bug_report_2026-04-07.md` mit Confidence-Ratings.
- **Admin-Konsole CORS identifiziert:** `file://` Origin → Worker blockiert. Lösung: GitHub Pages oder lokaler Server.

### Bug-Report (BUG-063–070)

| Bug | Symptom | RC Conf. | Fix Conf. | Ergebnis |
|-----|---------|----------|-----------|----------|
| BUG-063 | Cashflow keine Balken | 95% | 90% | ✅ Gefixt S20 |
| BUG-064 | Puffer "Fehler" | 99% | 85% | ✅ Gefixt S20 |
| BUG-065 | Deckungsbeitrag "Fehler" | 99% | 80% | ✅ Gefixt S20 |
| BUG-066 | Runway "Fehler" | 99% | 95% | ✅ Gefixt S20 |
| BUG-067 | Liquidität NaN | 85% | 97% | ✅ Gefixt S20 |
| BUG-068 | POST 400 Konto-Saldo | 50% | 20% | 🔴 Offen |
| BUG-069 | Frankfurter CORS | 100% | 90% | 🟡 Worker-Session |
| BUG-070 | requires nicht funktional | 70% | — | ✅ Gefixt S20 |

### Systemische Fragen für Opus-Audit

1. **Widget-Robustheit:** Alle `render()`-Funktionen ohne null-guards. Konvention: generischer Guard in `widgetCardHTML()` oder jedes Widget selbst?
2. **`requires`-Mechanismus:** Render-Guard oder nur Metadaten?
3. **Computed-Null-Konvention:** Einheitliches Rückgabe-Format (z.B. immer Objekt mit `ok`-Flag)?
4. **FX-Rates via direktem API-Call:** Verletzt A8. Frankfurter-Call gehört in `FXAdapter` via Proxy.
5. **BUG-068 + BUG-051:** Möglicherweise verwandt (DB-Schema-Drift). Gemeinsam untersuchen.

### Workflow-Regel etabliert (S19)
**"Testen & Bugs sammeln" = analysieren + dokumentieren, KEIN neues HTML.**
Neue HTML-Dateien nur am Session-Ende, auf Osi-Anweisung, oder nach proaktivem Vorschlag + Zustimmung.
In Memory gespeichert + in MASTER.md dokumentiert.

---

## Session 20 — 9 Widget-Fixes aus Strategie-Audit (2026-04-08)

### Kontext
Strategie-Chat S17 hat ein vollständiges Audit gegen die Briefing-Spezifikation durchgeführt und 10 Fixes priorisiert. App-Coding S20 hat 9 davon implementiert (FIX 10 = Worker-Deploy, separat).

### Implementierte Fixes

| Fix | Bug | Beschreibung |
|-----|-----|--------------|
| FIX 1 | BUG-070 | **`canRenderWidget(w)`** — neuer Guard vor `w.render()` in `widgetCardHTML()`. Prüft `comingSoon`, dann `requires` (clockify, konten, buchungen, rechnungen, recurrings). Zeigt kontextuelle Hinweise ("Clockify verbinden → Einstellungen" etc.) |
| FIX 2 | — | **`zeitKPIs()` nie mehr null** — bei leerem Clockify: Objekt mit `hasClockify: false`, alle Felder auf 0/null. Normale Returns: Aliases `totalHours`, `billableHours`, `hasClockify: true` hinzugefügt |
| FIX 3 | BUG-064 | **Puffer-Widget** — komplett umgeschrieben von `p.months/p.buffer/p.avgExpense` (existierten nie) auf `p.pct/p.balance/p.goal` (tatsächliche `Computed.puffer()` Felder). null-Guard + sinnvoller Fallback |
| FIX 4 | BUG-065 | **Deckungsbeitrag-Widget** — komplett umgeschrieben von `d.db/d.margin/d.revenue` auf `d.minBillableHours/d.fixCosts/d.surplusHours`. Semantik geändert: zeigt jetzt Minimum-Stunden für Fixkosten statt DB-Marge |
| FIX 5 | BUG-066 | **Runway-Widget** — null-Guard mit Fallback "Saldo + Geschäftsausgaben nötig" |
| FIX 6 | BUG-067 | **Liquidität-Widget** — `proj.expectedIn/Out` → `proj.totalInflow/totalOutflow` (3 Stellen) |
| FIX 7 | — | **Offene Rechnungen** — `Computed.openInvoices()` gibt Array zurück, Widget nutzte es als Zahl. Fix: `.length` + `.length` auch für overdueInvoices |
| FIX 8 | BUG-063 | **Cashflow-Balken** — `height:${incH}%` → `height:${incH}px`, Balken-Container von `flex:1` auf `height:100px` fixiert |
| FIX 9 | — | **SortableJS v1.15.6** — `<script src="...cdnjs..." defer>` im Head. CSP erlaubt cdnjs.cloudflare.com. Code prüfte bereits `typeof Sortable !== 'undefined'` |

### Nicht implementiert
- **FIX 10:** FX-Rates via Proxy — braucht Worker-Deploy (financebird-proxy.js), eigene Mini-Session

### Validierung
- `node --check` ✅ bestanden
- `grep 'const _orig'` = 0 (kein Monkey-Patch)
- `grep 'onclick.*JSON.stringify'` = 0
- Alle Funktionen genau 1× definiert
- Version: `2.19a.2026-04-08`

### Architektur-Konsequenzen
- Systemische Fragen 1–3 aus S19 sind gelöst: `canRenderWidget()` als generischer Guard + `zeitKPIs()` nie null + Widget-eigene Guards als zweite Linie
- Frage 4 (FX-Rates) und 5 (POST 400) bleiben offen

---

*FinanceBird · Entwicklungsarchiv · 2026-04-08 · Session 20 · Oswald H. König + Claude*
