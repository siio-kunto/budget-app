# Sprint 6.5 Briefing · i18n Cold-Zone-Sweep
> Auftraggeber: Strategie (S31, 2026-04-26)
> Empfänger: App-Coding (eigene Session, ~S33)
> Voraussetzung: v2.27a deployed (S30 Teil 3 + BUG-069 + BUG-077 Quick-Fix)
> Backlog-Item: **BL-109**
> Bug eingebettet: **BUG-078** (Tabs-Gap)
> Quelle der Wahrheit: MASTER.md

---

## 1 · Wo stehen wir, warum ist das jetzt wichtig?

Sprint 6 Block 2 ist abgeschlossen — die App ist in den **Hot-Zonen** (Nav, Sidebar, Toasts, Onboarding, Pairing, Repair, Healing, Feedback) zweisprachig. 142/142 Calls migriert in S30, FrankfurterAdapter eingeführt (BUG-069 ✅), FX-Cache-Format-Konflikt (BUG-077) per Quick-Fix α stabilisiert.

**Aber:** Die **Cold-Zonen** sind noch DE — Filter-Dropdowns, Tabellen-Header, Buttons in Listen, Einstellungen-Detail, Widget-Titel/Untertitel, Rechnungen-Detail, Hilfe-Texte. Wer auf EN umstellt, sieht ein gemischtes UI: Toast „Saved" + Tabelle „Datum / Typ / Konto / Betrag". Inkohärent.

Strategie-Entscheid S31: **Statt Cold-Zonen verteilt über Sprints 7-9 mitzuschleppen**, machen wir einen kompletten Sweep *jetzt*. Damit hat Sprint 7+ keine i18n-Mitschlepp-Pflicht mehr — Feature-Sprints können sich auf Features konzentrieren.

**Ziel S33:** App ist **vollständig zweisprachig**. Lang-Toggle DE↔EN flippt jedes sichtbare Wort.

---

## 2 · Scope · Was zu migrieren ist

### 2.1 Cold-Zone-Inventar

Die folgenden Bereiche enthalten DE-Strings, die noch nicht durch `t()` laufen. **Alle migrieren:**

| Bereich | Beispiele | Ungefähr |
|---|---|---|
| **Tabs (BUG-078)** | Buchungen / Rechnungen / Konten / Transfers — bleiben DE trotz EN-Mode | 4 Strings + Root-Cause-Fix |
| **Filter-Dropdowns** | „Ein- & Ausgaben" / „Alle Monate" / „Alle Kategorien" / „Alle Konten" | ~15-25 |
| **Tabellen-Header** | DATUM / TYP / KONTO / BETRAG / KATEGORIE / BEREICH / BELEG / AKTIONEN | ~20-30 |
| **Tabellen-Inline-Labels** | „Ausgabe" / „Einnahme" / „Transfer" (Type-Spalte) | ~5-10 |
| **Buttons in Listen/Toolbars** | „CSV importieren" / „Belege ZIP" / „CSV exportieren" / „+ Buchung" | ~10-15 |
| **Einstellungen-Detail** | Integration / Profil & Region / Sprache / Währung / Dark Mode + alle Sub-Labels | ~40-60 |
| **Widget-Titel + Untertitel** | „Cashflow", „Deckungsbeitrag", „Vermögen", „Top Kategorien", … (alle 22 Cockpit-Widgets) + Tooltip-Texte | ~50-70 |
| **Rechnungen-Detail** | Rechnungs-Erstellungs-Form, Status-Labels („Offen/Bezahlt/Mahnung"), Aktions-Buttons | ~20-30 |
| **Hilfe-Texte / Tooltips** | Help-Icon-Tooltips, Hint-Texte unter Inputs, Empty-State-Beschreibungen | ~30-40 |

**Schätzung Total:** ~200-280 neue Strings → ~200-280 neue Keys (DE + EN je).

⚠️ **Vor dem Sweep:** Inventar-Pass mit `fbI18nAudit()` + `grep -E "innerHTML|textContent|>[A-ZÄÖÜ][a-zäöüß]+ ?[a-zäöüß]*<"` über die HTML-Datei. Liste die Cold-Zone-Strings auf, gruppiere sie thematisch (wie S29 Gruppen 1-7), dann Patch-Plan.

### 2.2 Tabs-Gap (BUG-078) — Teilaufgabe in der Sweep-Diagnose

**Symptom:** Tabs „Buchungen / Rechnungen / Konten / Transfers" bleiben DE auch im EN-Mode.

**Verdacht:** Tabs sind statisch im HTML hardcoded statt via `SIDEBAR_ITEMS[]` + `renderSidebar()` (Weg-A-Renderer aus S28).

**Aufgabe:**
1. Root-Cause greppen — wo werden die Tab-Labels gerendert?
2. Wenn statisch: in `SIDEBAR_ITEMS` (oder analoge Datenstruktur für Tabs) verschieben + Renderer.
3. Wenn schon dynamisch: warum schlägt Übersetzung fehl? Key fehlt? `t()` nicht aufgerufen?
4. Fix in den Sweep-Patch-Plan integrieren.

> ❓ Falls Tabs-Renderer ein größerer Refactor ist als gedacht (>30 min): kurz eskalieren via Strategie-Briefing, bevor du gross umbaust. Variante B: Quick-Fix via Inline-`t()` ohne Renderer-Umbau.

### 2.3 Was NICHT in Scope ist

- **Widget-Datenlogik** (BL-108 Widget-Audit) → Sprint 6.6
- **DS2 Zeiterfassung-UI** (Projekte-Tab Architektur noch offen) → Sprint 7
- **DS3 Recurring-UX** (VI-Chat-Entscheid offen) → Sprint 7
- **GSheets-Onboarding-Texte** → Sprint 8 (mit GSheetsAdapter)
- **VI-Polish der Tonalität** (Wording-Schliff) → VI-Chat nach diesem Sprint

---

## 3 · Verbindliches DE→EN Glossar

**Diese Mappings sind Pflicht. Keine Variation.**

| DE | EN | Notiz |
|---|---|---|
| Buchung | **Transaction** | überschreibt VI-Style-Guide V1 („Booking") |
| Beleg | Receipt | |
| Bereich | Domain | |
| Kategorie | Category | |
| Konto | Account | |
| Cockpit | **Cockpit** | bleibt identisch DE/EN (Anker) |
| Vermögen | Assets | |
| Rechnung | Invoice | |

### Anker (bleiben unübersetzt — auch im EN-Mode)
- **FinanceBird** — Produktname
- **Cockpit** — bewusster FB-Begriff, identisch DE/EN
- **Einzelfirma** — Schweizer Rechtsform (falls im UI sichtbar)
- **Währungscodes** — CHF / EUR / USD

### Style-Defaults (bis VI-Chat einen Style-Guide-Mini schreibt)
- Tonalität: warm, direkt
- Pronomen: „you" (direkt anreden)
- Rechtschreibung: US-Englisch („organize" nicht „organise"; „check" nicht „cheque")
- Auth-Sprache: „Sign in" / „Sign out" (nicht „Log in / Log out")

> ⚠️ Wenn beim Migrieren ein Begriff auftaucht, der nicht im Glossar steht und nicht trivial ist (z.B. „Mahnung", „Saldo", „Offen", „Buchungssatz"), **NICHT improvisieren** — eskalieren via Frage an Strategie. Glossar wächst dann verbindlich.

---

## 4 · Vorgehen (analog S29 Gruppen-Pattern)

### Phase 1 · Inventar
1. `fbI18nAudit()` ausführen → Snapshot der Keys.
2. Cold-Zone-Strings systematisch greppen (HTML, JS-String-Literale).
3. In thematische Gruppen sortieren (Tabs / Filter / Header / Buttons / Settings / Widgets / Rechnungen / Help).
4. Inventar als Markdown-Tabelle präsentieren bevor du anfängst zu patchen — Strategie kann Scope final freigeben.

### Phase 2 · Migration in Gruppen
Pro Gruppe:
1. Neue Keys in `I18N.de` + `I18N.en` einfügen mit Kommentar `/* S33 Sprint 6.5 Gruppe {N} */` (L4-Lesson S28).
2. Call-Sites auf `t('key', vars?)` umstellen.
3. Bei statisch gerenderten HTML-Stellen: in `applyStaticI18n()` ergänzen oder Renderer einführen (BUG-078 Pattern).
4. **Nach max. 5 Patches:** Syntax-Check (A6+ S29 Verschärfung).
5. Lang-Toggle DE↔EN testen → alle Strings flippen.

### Phase 3 · BUG-078 Tabs-Gap
Eigene Mini-Phase, weil potenziell Renderer-Umbau. Nach Diagnose entscheiden: integriert in Phase 2 oder eigener Block.

### Phase 4 · Audit + Tests
1. `fbI18nAudit()` → 0 Missing, 0 Empty.
2. Lang-Toggle-Roundtrip-Test (DE → EN → DE) auf allen Cold-Zone-Screens.
3. Empty-State-Test (A11): leere Datenbank, leere Filter, kein verbundener Provider — alle Texte EN.
4. Regression: Hot-Zonen aus Sprint 6 Block 2 funktionieren weiterhin.

---

## 5 · Architektur-Regeln (relevant für diesen Sprint)

**A1–A11 unverändert.** Hier besonders:
- **A6+ S29:** Bei ≥5 Batch-Patches Syntax-Check zwischendurch.
- **A11 Empty-State:** Jede neu migrierte Komponente in leerem Zustand testen.
- **B1 (Briefing-Regel):** Wenn ein Renderer eingeführt wird (BUG-078), Return-Type explizit (Array von `{key, label_key}` oder ähnlich).
- **B5 Consumer-Prüfung:** Wer liest die migrierten Strings? Tests mitziehen.

**Nicht relevant für diesen Sprint, aber wissen:**
- **A14 Cache-Key-Exclusivity** (NEU S31) → für Sprint 8 (FXCache γ).
- **B6 erweitert** um localStorage-Greps → für Sprint 8.

---

## 6 · Versionierung & Deploy

- **Arbeitskopie startet bei v2.27a** (S30 Endstand). Nach S33 Abschluss: bumpe auf `v2.28a` (Major-S-Patch-Schema).
- `<meta name="fb-version">` + `APP_VERSION` Konstante updaten.
- `sw.js` Cache-Name updaten via `sed` im GitHub-Push-Block (siehe Projekt-Anweisungen).
- Live-Verify nach Push: `curl -s https://financebird.app/financebird_v2.html | grep fb-version`.

---

## 7 · Lieferung (was App-Coding zurückgibt)

Am Session-Ende:
1. **Inventar-Tabelle** (vor Migration präsentiert) — wieviele Strings je Gruppe.
2. **Migrationsbericht** — wieviele Calls migriert, wieviele neue Keys, wieviele Orphan-Reuses.
3. **BUG-078 Status** — diagnostiziert + gefixt, oder Quick-Fix + Refactor-Followup-Ticket.
4. **`fbI18nAudit()` clean** — 0 Missing / 0 Empty / dokumentierte Orphans.
5. **MASTER.md update** — Versions-Zeile auf v2.28a, BL-109 ✅, BUG-078 ✅, Sessions-Eintrag S33.
6. **app-coding_kontext.md update** — S30+S31+S33 nachgezogen.
7. **GitHub-Push-Block** ausgeführt + live-verifiziert.

### Eskalations-Pfade an Strategie (kurz pingen, nicht groß warten)
- Tabs-Gap-Renderer-Umbau wird größer als 30 min.
- Begriff im Sweep ohne Glossar-Eintrag, der nicht trivial übersetzbar ist.
- Mehr als ~350 neue Keys (Scope explodiert) → wir schneiden den Sweep evtl. zweiteilig.
- Architektur-Konflikt entdeckt (z.B. doppelte Renderer für gleiche Komponente).

---

## 8 · Done-Definition

- [ ] Lang-Toggle DE→EN→DE flippt **jedes sichtbare Wort** in Cold-Zonen.
- [ ] BUG-078 Tabs-Gap behoben (Tabs flippen).
- [ ] `fbI18nAudit()` clean.
- [ ] Hot-Zonen-Regression negativ (alles weiterhin OK).
- [ ] Empty-State-Tests durchlaufen auf allen migrierten Screens.
- [ ] Glossar-Mappings konsistent (Pflicht-Greps: `Buchung`/`Booking` keine Treffer mehr außer in Code-Kommentaren).
- [ ] `v2.28a` deployed + live-verifiziert.
- [ ] MASTER.md + app-coding_kontext.md aktualisiert.

---

## 9 · Kontext-Dokumente

| Datei | Wofür |
|---|---|
| `MASTER.md` | Sprint-Struktur, Bug-Register, Backlog, Architektur-Regeln, Glossar |
| `strategie_kontext.md` | Hintergrund S31-Entscheid, Briefing-Pfad |
| `app-coding_kontext.md` | Eigener Arbeits-Stand, S30-Abschluss-Notiz |
| **`sprint6_5_briefing.md`** | **Dieses Dokument** |
| `sprint5to9_briefing.md` | Briefings für Sprint 5/6/8/9 (S25) — Sprint 6.5 ist hier NICHT, sondern in eigenem File |
| `vi_kontext.md` + `vi_brand_concept.md` | VI-Vorgaben (V1 hat Glossar-Drift bei „Buchung" — Strategie überschreibt) |

---

*FinanceBird · sprint6_5_briefing.md · 2026-04-26 · Session 31 · Oswald H. König + Claude*
