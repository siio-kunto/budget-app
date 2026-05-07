# FinanceBird · MASTER.md
> Pflichtlektüre für JEDEN Chat im Projekt FinanceBird.
> Quelle der Wahrheit für: Bug-Register, Backlog, Architektur-Regeln, Design-Prinzipien, Deployed Versions.
> Stand: 2026-04-29 (Session 37 — Strategie: Widget-Audit komplett (BL-108 ✅), DS2 abgeschlossen, A15 NEU, DP11 NEU, DP1-Sub NEU, 8 Strategie-Beschlüsse, DS4+DS5 als Roadmap-Items)

---

## Was ist FinanceBird?

Single-File PWA für Schweizer Einzelfirma-Buchhaltung (DACH-Expansion geplant).
Gebaut von Oswald H. König (Coach/Facilitator/Social Innovator, Zürich) mit KI-Unterstützung.
Technologie: Plain HTML + Vanilla JS + CSS. Kein Framework, kein eigener Server, kein Build-System.

**Vision:** Das persönliche Finanzinstrument, primär für Selbständige die mehrere Rollen und Kontexte navigieren — robust für die Buchhaltung, und weise genug um die grössere Frage zu beantworten: Komme ich mit dem was ich tue dahin wo ich hinwill?

**GitHub:** https://github.com/financebird/app (private, geschützt via Triple-Auth + Copyright) · **Live:** https://financebird.app/financebird_v2.html

**Aktuelle Phase: Test + Improve (Phase 0.5)**

**Personas:** Osi · Handwerker · Die Wachsende

---

## Deployed Versions

| File | Version | Zuletzt geändert |
|---|---|---|
| `financebird_v2.html` | `2.31a.2026-04-28` | 2026-04-28 (S36, deployed) |
| `sw.js` | `financebird-v2.31a-1` | 2026-04-28 |
| `financebird-auth.js` | `1.4.0` | 2026-04-15 |
| `financebird-proxy.js` | `1.2.0` | 2026-04-12 |

> ℹ️ S37 ist Strategie-Session ohne Deploy — App-Coding setzt Beschlüsse in Sprint 7 + folgenden Sprints um.

---

## Kernarchitektur

```
UI → Interfaces → Adapter → Provider APIs
     DataLayer    NotionAdapter      Notion
                  GSheetsAdapter     Google Sheets  (Sprint 8)
                  FirebaseAdapter    Firebase       (DS4 / Backend-Strategie)
     Storage      GDriveAdapter      Google Drive
     Vision       ClaudeAdapter      Anthropic
                  OpenAIAdapter      OpenAI
     TimeAdapter  ClockifyAdapter    Clockify
                  TogglAdapter       Toggl Track    (S37: granulare Timestamps geplant)
     Fx           FrankfurterAdapter Frankfurter   (S30: A8-konform)
```

### REGION_CONFIG · Provider-Selector · Cockpit · Schema-Management · Triple-Auth · AES-256 · Feedback-System · Service Worker Update · healthSummary
(Alle unverändert — siehe S27/S28 MASTER.md)

### Beleg-Attach + Retry-Queue (S26, Sprint 5, gehärtet S27 BL-107 + S28 BUG-076) ✅ deployed
(Unverändert — siehe S28 MASTER.md)

### REGION_CONFIG.{DE,AT}.taxMapping = Behörden-Anker (S36, Strategie-Resolution)
```
DE: 'EÜR Z.14 Betriebseinnahmen' / 'EÜR Z.27 Fremdleistungen' / etc.
AT: 'E1a KZ 9040' / 'E1a KZ 9120' / etc.
→ Atomic — keine Teil-Übersetzung. Filter via taxCategoryLabel-Regex (Z.~9402).
→ ELSTER ist DE-only; Cross-Reference zum echten Formular hat Vorrang vor i18n.
→ 2-Zeilen Header-Kommentar oberhalb taxMapping in DE+AT (CH unverändert).
```

### i18n-System (Sprint 6 Block 1+2 + Sprint 6.5a/b/c/d, S27-S36) ✅ deployed v2.31a
(Unverändert — siehe S36 MASTER.md)

### Begriffsklärung (S37, revidiert)
- **Aktivitäten** = Wo fließt meine Zeit hin (Time-Tracker: Clockify/Toggl)
- **„Projekte"** als App-Begriff aufgegeben — Notion-DB `FB · Projekte` bleibt technisch (intern), kein User-Touchpoint
- **Schuld/Spar/Investition** — Begriff offen, später entschieden wenn die App-Domäne klarer ist

> S16-Glossar revidiert in S37: Begriffe „Projekte" und „Ziele" haben sich als zu mehrdeutig erwiesen. „Aktivitäten" ist der App-Begriff für Time-Tracker-Daten. Für Schuld/Spar/Investition wird später ein Begriff gefunden — kein Quick-Fix.

### EN-Glossar (S31, bindend)
| DE | EN | Anker? |
|---|---|---|
| Buchung | **Transaction** | nein |
| Beleg | Receipt | nein |
| Bereich | Domain | nein |
| Kategorie | Category | nein |
| Konto | Account | nein |
| Cockpit | **Cockpit** | ✅ identisch DE/EN |
| Vermögen | Assets | nein |
| Rechnung | Invoice | nein |
| Aktivitäten *(S37)* | **Activities** | nein |

**Anker (bleiben unübersetzt):** FinanceBird · Cockpit · Einzelfirma (CH-Rechtsform) · Währungscodes (CHF/EUR/USD) · **EÜR Z.x / E1a KZ xxxx (DE+AT Behörden-Anker, S36)**

> Detail-Mapping + Tonalität → `sprint6_5_briefing.md`. VI-Style-Guide V1 hat „Booking" für Buchung gelistet — überschrieben durch Osis Glossar-Entscheid S31. VI-Chat zieht das nach.

---

## Chats & Rollen

| Chat | Rolle | Liest beim Start |
|---|---|---|
| Strategie & Architektur | Business, Vision, Architektur, Design-Sessions | MASTER.md + strategie_kontext.md |
| App-Coding | Code, Bugs, Features | MASTER.md + app-coding_kontext.md |
| Brand & Visual Identity & UX | Farben, Fonts, Layout, Usability | MASTER.md + vi_kontext.md + vi_brand_concept.md |

**Chat-Naming-Konvention:** `FB:S{Nr}_{Chat} — {Kurzbeschreibung}`

---

## ⚠️ SPRINT-STRUKTUR (S37 updated)

### Sprint 1–6.5 ✅ deployed (Sprint 6.5 4-teilig durch S36 abgeschlossen)
(Details siehe Sessions-Tabelle unten + entwicklungsarchiv.md)

### Sprint 6.6: Widget-Audit (BL-108) ✅ S37 abgeschlossen
| # | Item | Status |
|---|---|---|
| BL-108 | Cockpit-Widget Audit (alle 24 Widgets systematisch) | ✅ S37 — `widget_audit_S37.md` · 45 Issues · 7 systemische Befunde · 8 Strategie-Beschlüsse |

### Sprint 7: DS2 + DS3 Implementation
| # | Item | Status |
|---|---|---|
| DS2 | Zeit & Aktivitäten Architektur | ✅ S37 — `ds2_zeit_aktivitaeten_S37.md` |
| DS3 | Recurring-UX (VI) | offen — VI-Chat |

**Sprint-7-Scope (post-DS2):** TimeEntry-Schema granular + Aktivitäten-Klassifikation 5+1 + Variable-Kosten-Erfassung + BUG-075 Sofort-Fix + Pro-Aktivität-DB-Spalte. Skelett in `ds2_zeit_aktivitaeten_S37.md`.

### Sprint 8: GSheets + A13-Nachrüstung + FXCache-γ + Token-Sicherheit L1+L4+L5 (NEU)
Briefing erweitert (S25 + S31 + S37). Token-Sicherheit-Layer aus DS2 Block D ergänzt.

### Sprint 9: UX + Quick Fixes + Audit-Bug-Fixes
Audit-Items hochpriorisiert: AUDIT-001/002/004/005/008/018/020/022/023/029/035 (siehe `widget_audit_S37.md` Empfehlungs-Priorisierung).

### Sprint 10 (NEU): Reserven-Achse + Profit-Wasserfall + Bereich-Filter
- S1: Bereich-Filter-Toggle pro Widget
- S2: `Computed.netProfit()` einheitlich + Wasserfall-Display
- S4: Reserven-Achse-Umbau (`puffer→notgroschen`, `freiheit` auf FI Number)

### Geplante Design-Sessions (DS-Roadmap)

| DS | Thema | Trigger |
|---|---|---|
| DS3 | Recurring-UX (visuell) | VI-Chat, blockt Sprint 7 |
| **DS4** *(NEU)* | **Backend-Strategie** | Firebase/Supabase/Notion-Bewertung, Multi-Tenant-Vorbereitung. Trigger: Notion-Pain spürbar oder Multi-User-Bedarf. Geschäftsmodell **A · BYOK** (revisionsoffen). |
| **DS5** *(NEU)* | **Multi-Account-Architektur** | Account-Switching (Vereins-Buchhaltung, mehrere Workspaces). Abhängig von DS4. Beschluss: **Weg 1** (echte Multi-Tenant). |
| DS6 | Treuhänder-Portal-Konzept | (S25, später) |

**Archivierung:** Empfohlen nach S37 — Sprint 6.5 (a-d) abgeschlossen, ~35-40 Items für Archiv. Würde MASTER.md ~30% kürzer machen.

---

## Design-Prinzipien (11, bindend)

1. **Anti-Friction** — Nie mehr Arbeit als sie abnimmt. Max. 3 Taps / 10 Sek.
   - **Sub (S37): Why-First Tagging** — Wenn User Daten taggen / pflegen soll, muss vor dem Tag-Akt klar sein, was die Information ihm liefert. Nicht „bitte tagge", sondern „Tagge X und du siehst Y".
2. **Schönheit mit Zweck** — Lust machen die App zu benutzen.
3. **Signal, nicht Rauschen** — Nur Relevantes zeigen.
4. **Konsistenz & Robustheit** — Kohärentes Nutzererlebnis. Fehler ehrlich kommuniziert.
5. **Kontext nie voraussetzen** — App weiss nicht woher Nutzer kommt.
6. **Die App wächst mit** — Modular durch Konfiguration.
7. **Daten zuerst** — Erst Datenpunkte, dann Visualisierung.
8. **Fehler mit Lösungsweg** (S4) — Jede Fehlermeldung enthält den nächsten Schritt.
9. **Vorgabe + Edit** (S16) — Sinnvolle Defaults + "Eigene..." → Einstellungen.
10. **Sinnvolle Defaults + Edit im Detail** (S17) — Berechnete Defaults, User kann im Detail-Overlay anpassen.
11. **Präzision dort, wo sie zählt** (S37 NEU) — Daten haben zwei Genauigkeitsklassen:
    - **Klasse A · Akkurat** — Verrechnung, Steuer, Buchhaltung, Rechnungen, Zahlungseingänge. 100% Präzision Pflicht. Strenge Validierung.
    - **Klasse B · Reflexion** — Lebenszeit-Verteilung, Portfolio-Balance, Burnout-Indikatoren, Muße-Schätzung. Reicht „gut genug für einen Spiegel". Schätzwerte, Defaults, optionale Eingaben akzeptiert.
    - App muss beides können und dem User signalisieren in welcher Klasse er sich gerade befindet.

---

## Architektur-Regeln (A1–A15, bindend für alle Chats)

**Code-Regeln:** A1 Kein Monkey-Patch · A2 Keine doppelten Funktionsnamen · A3 Kein toter Code · A4 Token aktiv holen · A5 Block-Integrität · A6 Strukturvalidierung · A7 Kein `JSON.stringify` in onclick · A8 Kein Provider-Call ausserhalb Adapter
**Denk-Regeln (S17):** A9 Verify Before Use · A10 Null-Path First · A11 Empty-State Test
**Sicherheits-Regel (S23):** A12 Sensible Logik server-seitig (Phase 2)
**Daten-Regel (S25):** A13 DB-Backends App-managed
**Storage-Regel (S31):** A14 Cache-Key-Exclusivity
**Reliability-Regel (S37 NEU):** A15 Data-Reliability-First

### A14 · Cache-Key-Exclusivity (NEU S31)
(Unverändert — siehe S35 MASTER.md)

### A15 · Data-Reliability-First (NEU S37)

> Jede Daten-Migration, jeder Storage-Refactor, jede Schema-Änderung muss eine der folgenden Garantien erfüllen:
>
> 1. **Reversibel:** Alte Daten bleiben so lange parallel verfügbar, bis neue Daten nachweislich vollständig sind.
> 2. **Verifizierbar:** Vor irreversiblen Schritten gibt es einen User-sichtbaren Verify-Punkt mit Zahlen ("X Einträge migriert, Y Stunden bestätigt").
> 3. **Beweisbar fehlerfrei:** Bei automatisch laufenden Migrationen gibt es einen Diff-Test (Prüfsumme alt vs. neu) im Code, der bei Mismatch die Migration zurückrollt.
>
> Bei Konflikt zwischen Eleganz und Datensicherheit gewinnt Datensicherheit immer. Lieber technische Schuld in Form von Legacy-Storage-Keys, als Datenverlust.

**Implikation für aktuelle Backlog-Items:**
- AUDIT-018 (`abo-kosten` Recurrings-Refactor) — alter Buchungs-Pfad als Fallback bis verifiziert
- DS2 TimeAdapter-Migration — vereinfacht heute (Single-User), strikt für Multi-User-Phase
- Notion-zu-Firebase-Migration (DS4) — Parallel-Phase mit beiden Quellen + Diff-Verify

**Briefing-Regeln:** B1 Exakte Return-Types · B2 Null-Pfade · B3 Verhalten · B4 Anti-Patterns · B5 Consumer-Prüfung · B6 Code-Reality-Check (S26, S31 erweitert)

### B6+ · Code-Reality-Check (Erweiterung S31)
(Unverändert — siehe S35 MASTER.md)

---

## 🐛 Bug-Register (zentral)

### Offen
| # | Beschreibung | Schwere | Sprint |
|---|---|---|---|
| BUG-040 | Erste Schritte: Variante B | 🟡 | Sprint 9 |
| BUG-043 | "Code abgelaufen" zu wenig sichtbar | 🟡 | Sprint 9 |
| BUG-044 | "Neuen Code generieren" zu wenig prominent | 🟡 | Sprint 9 |
| BUG-048 | `doneQrCode` Element fehlt | 🟡 | Sprint 9 |
| BUG-075 | Deckungsbeitrag-Widget rechnet falsch | 🟠 | Sprint 7 (Auflösungs-Pfad in DS2 Block C) |
| BUG-080 | `overviewRow` ignoriert 5. Parameter (action_html) | 🟡 | Sprint 9 |

### Abgeschlossen (seit Archivierung S17)
BUG-039–073 ✅, BUG-074 ✅ S26, BUG-041 ✅ S26, BUG-076 ✅ S28, BUG-069 ✅ S30, BUG-077 ✅ S30, BUG-078 ✅ S33, BUG-079 ✅ S35

> Nächster: **BUG-081** · Archivierung Sprint 6.5 + S37-Beschlüsse empfohlen.

---

## 📋 Backlog (zentral)

### Offene Items
| # | Titel | Sprint |
|---|---|---|
| BL-087 | Clockify granularer Sync (in DS2 Block A architektonisch geklärt) | Sprint 7 |
| BL-090 | Widget-Links kuratieren | Sprint 9 (✅ Deep-Research jetzt im Projekt seit S37) |
| **BL-110** *(NEU)* | DS2-Implementation Phase 1: TimeEntry-Schema granular + 5+1 Klassifikation + Variable-Kosten Hybrid γ + BUG-075 Sofort-Fix + Pro-Aktivität-DB | Sprint 7 |
| **BL-111** *(NEU)* | Token-Sicherheit Layer 1 (90-Tage TTL + Refresh) + Layer 4 (Revocation-Endpoint) | Sprint 8 |
| **BL-112** *(NEU)* | Token-Sicherheit Layer 5 (CSP-Header) | Sprint 8 |
| **BL-113** *(NEU)* | Worker C · API-Key-Proxy (BYOK Variante II) + Layer 2 + Layer 6 | vor Multi-User-Rollout (DS5) |
| **BL-114** *(NEU)* | Code-Naming-Closure: `Store.projekte` → `Store.aktivitaeten` (Time-Cache) + localStorage-Migration | Sprint 9 oder eigener Mini-Sprint |
| **BL-115** *(NEU)* | Bereich-Filter-Toggle pro Widget (S37 Befund S1) | Sprint 10 |
| **BL-116** *(NEU)* | `Computed.netProfit()` einheitlich + Wasserfall-Display (S37 Befund S2) | Sprint 10 |
| **BL-117** *(NEU)* | Reserven-Achse-Umbau: `puffer→notgroschen` (dynamisches Goal), `freiheit` auf FI Number (S37 Befund S4) | Sprint 10 |
| **BL-118** *(NEU)* | Audit-Bug-Fixes Sprint-9-Set: AUDIT-001/002/004/005/008/018/020/022/023/029/035 | Sprint 9 |

### Abgeschlossen (S33–S37)
- **BL-109a** ✅ S33 — i18n Cold-Zone-Sweep Teil A · 32 Patches · +215 Keys
- **BL-109b** ✅ S34 — i18n Cold-Zone-Sweep Teil B · +246 Keys
- **BL-109c** ✅ S35 — i18n Cold-Zone-Sweep Teil C · +110 Keys
- **BL-109d** ✅ S36 — i18n Coverage-Closure · +170 Keys · Patch-0 Strategie-S36 Tax-Anker
- **BL-108** ✅ S37 — Cockpit-Widget Audit · 45 Issues · 7 systemische Befunde · 8 Strategie-Beschlüsse · `widget_audit_S37.md`

> Nächster: **BL-119**

---

## Bekannte Limitationen

(Unverändert gegenüber S27 — L1, L3, L5, L9, L10)

---

## Workflow-Regeln

(Unverändert — siehe S25 MASTER.md)

### S31 Process-Note · Eskalation bei Architektur-Drift
(Unverändert — siehe S35 MASTER.md)

### S36 Process-Note · Strategie-Eskalation für DACH-Tax-Anker
(Unverändert — siehe S36 MASTER.md)

### S37 Process-Note · Audit-First vor Sprint-Implementation
S37 hat zuerst den vollständigen Widget-Audit gemacht (45 Issues identifiziert), dann DS2 architektur-fundiert. **Beobachtung:** Audit-First entblockt parallele Threads — Sprint 7 hat klare Implementation-Liste, Sprint 8/9/10 haben Backlog-Items mit Begründung. Pre-Implementation-Audit + Strategie-Beschlüsse zusammen = sauberer Sprint-Stack. Pattern für künftige Major-Refactors replizieren.

---

## ⚠️ S37 Strategie-Beschlüsse (zusammengefasst)

8 bindende Beschlüsse aus S37 (Volltext: `strategie_kontext.md`, `widget_audit_S37.md`, `ds2_zeit_aktivitaeten_S37.md`):

1. **Bereich-Filter-Toggle pro Widget** — sicht-/editierbar in Cockpit-Übersicht (S1-Auflösung)
2. **Profit-Definition einheitlich + buchhalterisch transparent** — `Computed.netProfit()` mit Wasserfall (S2-Auflösung)
3. **Reserven-Achse strukturiert** — `runway` separat, `puffer→notgroschen` (0-6M), `sabbatical` (6-24M), `freiheit` auf FI Number (S4-Auflösung)
4. **TimeAdapter mit granularen Timestamps** — entblockt Burnout-Widget-Klasse (S6-Auflösung)
5. **A15 · Data-Reliability-First** — neue Architektur-Regel
6. **DP11 · Präzision dort, wo sie zählt** — neues Design-Prinzip
7. **DP1 Sub-Punkt: „Why-First Tagging"** — Pflege-Aufgaben mit Mehrwert-Kommunikation
8. **Tab-Naming**: „Aktivitäten" (DE) / „Activities" (EN). „Projekte" als App-Begriff gestrichen.

Plus DS2-Detail-Beschlüsse:
- Klassifikation 5+1 (paid/gift/study/home/overhead + leisure-Schätzwert)
- User-Tag in FinanceBird-UI (kein Präfix-System), `unklassifiziert` als legitime Kategorie
- Variable-Kosten Hybrid γ (Kategorie-Default + per-Buchung-Override)
- 15 Standard-Kategorien Default-Mapping
- Multi-Provider-Architektur (default mono, technisch parallel möglich)
- Geschäftsmodell **A · BYOK** (revisionsoffen)
- Token-Sicherheit-Layer-Stack (L1+L4+L5 Sprint 8, L2+L6 mit Worker C)

---

## Sessions

| Version | Session | Highlights |
|---|---|---|
| 2.14d–2.30a | S14–S35 | (siehe Archiv + Vorgänger-MASTER) |
| 2.31a (DEPLOYED) | S36 (04-28) | Sprint 6.5d Coverage-Closure abgeschlossen + LIVE: Patch-0 + 6 Gruppen · +170 Keys × 2 · `serviceStatusBadge` Helper · Smoke 59/0/0 · Sprint 6.5 Cold-Zone-Sweep komplett (Total +741 Keys × 2 in 6.5a-d) |
| **— (Strategie)** | **S37 (04-29)** | **Widget-Audit komplett (BL-108 ✅) · 24 Widgets durch · 45 Issues · 7 systemische Befunde · DS2 abgeschlossen (Blöcke A-E) · 8 Strategie-Beschlüsse · A15 NEU · DP11 NEU · DP1-Sub NEU · DS4+DS5 als Roadmap-Items · `widget_audit_S37.md` + `ds2_zeit_aktivitaeten_S37.md` neu** |

---

*FinanceBird · MASTER.md · 2026-04-29 · Session 37 · Oswald H. König + Claude*
