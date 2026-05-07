# FinanceBird · ds2_zeit_aktivitaeten_S37.md

> Design Session 2 — Zeit & Aktivitäten · Architektur-Beschlüsse
> Stand: 2026-04-29 (Session 37 · Strategie-Chat)
> Bindend für: TimeAdapter-Implementation, Aktivitäten-Tab-Rebuild, BUG-075-Fix, Variable-Kosten-Erfassung

---

## Zweck

DS2 schließt die strategische Architektur für **Zeit-Tracking, Aktivitäten-Klassifikation und projektbezogene Wirtschaftlichkeit** ab. Output: bindende Beschlüsse für Sprint 7 + spätere Sprints.

DS2 baut auf:
- DS1 (Cockpit-Grundsatz, 04-04-2026) und Deep-Research-Inventory
- Widget-Audit S37 (siehe `widget_audit_S37.md`)
- S16 Begriffsklärung (revidiert in S37)

---

## Übersicht der Beschlüsse

| Block | Thema | Status |
|---|---|---|
| **A** | Datenmodell `TimeEntry` + Storage-Strategie | ✅ |
| **B** | Klassifikations-Modell + Pflege-UX | ✅ |
| **C** | Variable Kosten + BUG-075 + Aktivitäts-Wirtschaft | ✅ |
| **D** | Provider-UX + Token-Sicherheit | ✅ |
| **E** | Tab-Naming | ✅ |

---

## Block A · Datenmodell + Storage

### A.1 · TimeEntry-Schema (Single Source of Truth, granular)

```javascript
TimeEntry = {
  id:          string,    // Adapter-eigene ID (Clockify uuid / Toggl numeric)
  provider:    'clockify' | 'toggl',
  projectId:   string | null,    // null = "no project" Eintrag
  date:        'YYYY-MM-DD',     // lokales Datum von start
  start:       ISO-8601,         // "2026-04-29T09:15:00Z"
  end:         ISO-8601,
  durationSec: number,           // (end - start) in Sekunden, derived but stored
  description: string,
  billable:    boolean,
  tags:        string[]
}
```

**Begründung:**
- `provider` Pflicht — bei Provider-Switch koexistieren beide Datenmengen
- `date` derived from `start`, aber gespeichert (90% der Queries nach Tag/Monat)
- `durationSec` derived but stored — Konsistenz zwischen Adaptern (Clockify rechnet aus interval, Toggl liefert direkt)
- `billable` + `tags` — beide Adapter haben das, wird heute weggeworfen, ist Voraussetzung für Block B

### A.2 · Drei-Layer-Storage-Architektur

```
Layer 1 · Granular (heißer Bereich)
  fb_time_entries_2026  = TimeEntry[]   ← laufendes Jahr
  fb_time_entries_2025  = TimeEntry[]   ← Vorjahr

Layer 2 · Tages-Aggregate (warmer Bereich, älter als rolling 24M)
  fb_time_daily_2024 = {
    'YYYY-MM-DD': {
      projectId: {
        hours, billableHours, sessionCount,
        firstStart, lastEnd, hasWeekendFlag, hasEveningFlag
      }
    }
  }

Layer 3 · Monats-Aggregate (kalter Bereich, falls je gebraucht)
  fb_time_monthly_pre2023 = { 'YYYY-MM': { projectId: hours } }

Performance-Cache (derived, jederzeit re-computable):
  fb_time_kpi_cache = { totalHours, billableHours, ... }
```

**Komprimierungs-Trigger:** Lazy beim Jahres-Übergang, beim ersten Cockpit-Render im neuen Jahr (PWA hat kein Background-Sync).

**Storage-Realismus:** Power-User mit 5 Jahren × 20 Entries/Tag:
- Ohne Komprimierung: ~5.5 MB (localStorage-Limit bedrohlich)
- Mit Komprimierung: ~2.3 MB (sicher) — Layer 2 ist ~25× kleiner als Layer 1

### A.3 · Migrations-Strategie (A15-konform)

**Vereinfacht für aktuellen Stand:** Da Osi der einzige User ist und die App noch nicht produktiv genutzt wird, **Hard-Cut akzeptiert**:
1. Alte Aggregate-Caches `fb_clockify_*` werden beim ersten Sync mit neuem Schema überschrieben
2. Re-Sync ist trivial (Adapter zieht alle Entries des Jahres)
3. Kein Backup-Pfad nötig in dieser Phase

**Für Multi-User-Phase (DS5 / Phase 2):** A15-strikt mit Parallel-Phase + Diff-Verify + 30-Tage-Backup + Export-Hatch.

### A.4 · Computed-Funktionen-Roadmap

Mit granularen Entries direkt machbar:

| Funktion | Liefert | Research-Anker |
|---|---|---|
| `Computed.timeEntriesYear()` | gefilterte Entries laufendes Jahr | basis |
| `Computed.workdaySpan()` | Ø + max der first→last Activity pro Tag | §5 (>11h flag) |
| `Computed.weekendWorkPct()` | Sa+So Stunden / Wochen-Stunden | §5 (>20% concerning) |
| `Computed.eveningWorkPct()` | Sessions ab 19h / total Sessions | §5 (>20% concerning) |
| `Computed.consecutiveWorkdays()` | längste Serie ohne work-free Tag | §5 (>12 flag, >21 critical) |
| `Computed.deepWorkRatio()` | Sessions ≥60min / total Sessions | §5 (target ≥50%) |
| `Computed.fragmentationIndex()` | Ø Sessions pro Tag | §5 (>10 high fragmentation) |
| `Computed.recoveryDayCount()` | Tage mit 0 Stunden / Wochen | §5 (min 2/Woche) |

---

## Block B · Klassifikations-Modell + Pflege-UX

### B.1 · 5+1 Kategorien (Charles Handy Portfolio Life)

| Kategorie | Übersetzung | Beschreibung | Quelle |
|---|---|---|---|
| **paid** | Auftrag | Bezahlte Arbeit | Clockify/Toggl |
| **gift** | Herzensarbeit | Unbezahlte Arbeit aus Sinn/Beziehung | Clockify/Toggl |
| **study** | Lernen | Weiterbildung, Skill-Aufbau | Clockify/Toggl |
| **home** | Care/Selbstversorgung | Haushalt, Pflege, Alltag | Clockify/Toggl |
| **overhead** | Geschäfts-Admin | Buchhaltung, Sync, Geschäfts-Selbstorganisation | Clockify/Toggl |
| **leisure** *(optional)* | Muße | Erholung, Spiel, Spazieren | **Wochen-Schätzwert in Settings** |

**Begründung getrennte `overhead`-Kategorie** (nicht in `home` gemappt): Geschäfts-Admin ist semantisch eigenständig, Sole Prop hat klar separierte Pflicht. Pragmatischer Mehrwert > Handy-Pure-Mapping.

### B.2 · Klassifikations-Methode

**User-Tag in FinanceBird-UI** (Option β, kein Präfix-System).

- `kategorie` als Pflicht-Property pro Aktivität
- Bei Sync neuer Aktivität: Default `kategorie = 'unklassifiziert'`
- Computed-Funktionen rechnen `unklassifiziert` als legitime 6. Kategorie mit
- Banner im Aktivitäten-Tab: *„X Aktivitäten warten auf Einordnung"*
- **Why-First-Banner**: zeigt Mehrwert vor Tag-Akt (DP1 Sub-Punkt)

```javascript
Activity = {
  id, providerId, name, client, billable, archived, ...
  kategorie: 'paid' | 'gift' | 'study' | 'home' | 'overhead' | 'unklassifiziert'
}
```

**Architektur-Regel:** Jede Computed-Funktion über `Aktivitäten` muss `unklassifiziert` explizit behandeln. Kein silent skip.

### B.3 · Leisure-Schätzwert

Separates Settings-Feld, kein Activity-Datensatz:

```javascript
localStorage 'fb_leisure_estimate' = {
  hoursPerWeek: 14,
  enabled: true,
  setAt: '2026-04-29'
}
```

Plus zweites Settings-Feld für Auslastungs-Korrektur:

```javascript
localStorage 'fb_workload_capacity' = {
  hoursPerWeek: 40,
  enabled: true
}
```

**Begründung beider Felder als „Klasse-B-Schätzwerte" (DP11):** Reflexion-zwecks reicht „gut genug". 1 Settings-Feld pro Wert, nicht Wochentag-Splitting.

### B.4 · Bulk-Tagging-UX (zwei Wege)

**Banner-Einstieg** im Aktivitäten-Tab: *„X Aktivitäten warten auf Einordnung"*. Zwei Aktions-Buttons:

**Weg A · Schnell-Tagger** (Erst-Klassifikation)
- Ein Item pro Bildschirm, swipe-artig
- Fortschritts-Balken
- 5 Tag-Buttons (paid/gift/study/home/overhead) in einer Reihe
- Optional: Bulk-Hint *„Auch für N ähnliche Aktivitäten"*

**Weg B · Listen-Tagging** (Power-User)
- Alle unklassifizierten in Liste
- Pro Zeile: Name, Stunden, Tag-Dropdown
- Sortierbar nach Stunden (große zuerst)

User wählt selbst. Banner verschwindet automatisch wenn alle klassifiziert. Erscheint wieder bei neuen Sync-Aktivitäten.

### B.5 · Burnout-Metriken-Konfidenz

Pattern-Metriken zeigen Konfidenz-Indikator:
> *„Workday-Span basiert auf 12 von 30 Tagen — unscharfes Signal"*

Bei <X% getrackten Tagen → Warning-Sub. Klasse-B-Ehrlichkeit (DP11 + DP4).

---

## Block C · Variable Kosten + BUG-075 + Aktivitäts-Wirtschaft

### C.1 · Variable-Kosten-Erfassung (Hybrid γ)

**Drei-Schicht-Auflösung:**

```javascript
Buchung = {
  ... existing fields ...
  kostenart: 'fix' | 'variabel' | null  // null = use category default
}

Settings.categoryClassification = {
  'Versicherung': 'fix',
  'Reisekosten': 'variabel',
  ...
}

Computed.buchungKostenart(b) = b.kostenart 
  ?? Settings.categoryClassification[b.kategorie] 
  ?? null
```

**Hierarchie:** per-Buchung-Override gewinnt → Kategorie-Default → null (unklassifiziert)

**Begründung:** Default-Mapping = Zero-Friction. Per-Buchung-Override für Power-User wenn Edge-Case. Klasse-B-konform für Reflexion, Klasse-A genau wenn nötig.

### C.2 · Standard-Kategorien Default-Mapping (15 Kategorien)

**Vorschlag — finalisiert mit Osi vor Sprint-Implementation:**

| Kategorie | Default | Begründung |
|---|---|---|
| Versicherung | **fix** | Monatlich/jährlich konstant |
| Software-Abo | **fix** | Recurring |
| Coworking | **fix** | Monatliche Miete |
| Telefon/Internet | **fix** | Monatlich konstant |
| Buchhaltungs-Tool | **fix** | Recurring (Lexware, sevDesk, etc.) |
| Marketing | **fix** | Typisch konstant |
| Steuerberatung | **fix** | Periodisch |
| Bank/Gebühren | **fix** | Monatlich konstant |
| Subcontractor | **variabel** | Pro Projekt |
| Reisekosten | **variabel** | Pro Projekt |
| Material/Stock | **variabel** | Projektbezogen |
| Geschenke Klient | **variabel** | Pro Klient |
| Weiterbildung | **variabel** | Diskretionär |
| Bürobedarf | **variabel** | Diskretionär |
| Verpflegung | **variabel** | Diskretionär |

**Settings-UI:** User sieht Mapping-Tabelle, kann pro Kategorie ändern. Bei User-eigenen Kategorien Hinweis: *„X Kategorien noch nicht klassifiziert — fix oder variabel?"*.

### C.3 · BUG-075 Auflösung

**Drei Stufen:**

**Stufe 1 · Sofort-Fix** (App-Coding Sprint, isoliert lieferbar)
```javascript
// Vorher: Z.8543
const minBillableHours = ceil(fixCosts / effectiveRate)

// Nachher:
const minBillableHours = ceil(fixCosts / billableRate)
```

**Stufe 2 · Variable-Kosten-Approximation** (mit C.1 + C.2)
```javascript
const variableCostsYTD = Store.buchungen
  .filter(b => b.type === 'Ausgabe' 
            && b.bereich === 'Geschäftlich'
            && Computed.buchungKostenart(b) === 'variabel')
  .reduce((s, b) => s + b.amount, 0)

const variableCostsPerHour = z.billableHours > 0 
  ? variableCostsYTD / z.billableHours 
  : 0

const dbPerHour = billableRate - variableCostsPerHour
const minBillableHours = dbPerHour > 0 
  ? ceil(fixCostsMonthly / dbPerHour) 
  : null
```

**Stufe 3 · Erweiterte Fixkosten** (BL-Item, später)
- Nicht-Recurring jährliche Geschäfts-Fixkosten erfassen
- `Computed.fixCostsTotal()` rechnet Recurrings + jährliche Buchungen

### C.4 · Pro-Aktivität-DB

```javascript
Computed.aktivitaetWirtschaft(activityId) = {
  einnahmen:        Σ Buchungen (type='Einnahme', projekt=name, Geschäftlich),
  variableKosten:   Σ Buchungen (type='Ausgabe', projekt=name, kostenart='variabel'),
  stunden:          Σ TimeEntries (projectId=activityId, billable),
  
  db1:              einnahmen - variableKosten,    // Research §3 DB I
  dbProStunde:      db1 / stunden,                 // Engpass-Metrik
  margin:           db1 / einnahmen × 100
}
```

**ABC-Klassifikation:** Top 20% der Aktivitäten generieren ~80% des DB → A-Klient.

### C.5 · DB-Ranking-Sicht

**Beschluss:** Spalte im Aktivitäten-Tab (Option I), kein eigenes Cockpit-Widget.

```
Aktivität                  Stunden   Einnahmen   DB/h
─────────────────────────────────────────────────────
Coaching Müller GmbH         42 h     CHF 4.200    98 ⭐ A
Workshop Stiftung Y          28 h     CHF 2.100    72   B
Webdesign Z                  15 h     CHF 1.200    65   B
                                  (− CHF 250 Subcontractor)
                                  (− CHF 130 Reisen)
```

**Sortier-Toggle:** Nach Stunden / nach DB/h.

**Schwellwerte für Rang-Badge:** Pareto-basiert. Top-20% = ⭐A, mittleres 50% = B, untere 30% = C.

---

## Block D · Provider-UX + Token-Sicherheit

### D.1 · Multi-Provider-Architektur

**Beschluss:** Architektur erlaubt parallel, UI-Default ist mono.

```
fb_time_entries_2026  = TimeEntry[]   ← jedes Entry hat .provider
fb_time_providers     = {
  clockify: { configured: true,  lastSync: '2026-04-29T14:32', entries: 1247 },
  toggl:    { configured: false, lastSync: null,                entries: 0 }
}
```

**Settings-Seite zeigt beide gleichberechtigt:**
```
Time-Tracker
─────────────────────────────────────────
🎯 Clockify         configured ✓     [verwalten]
🐸 Toggl Track      not connected    [verbinden]
```

### D.2 · Provider-Switch-Logik (A15-konform)

**Szenario 1 · User wechselt Provider**
1. Toggl konfigurieren während Clockify configured bleibt
2. Erster Toggl-Sync — Entries parallel in `fb_time_entries`
3. UI-Hinweis „Mixed-Setup"
4. User entscheidet Clockify deaktivieren → Backup → Verify → Aktivieren

**Szenario 2 · Mixed-Setup (Edge Case)**
Beide aktiv, Pattern-Metriken werden unscharf, App zeigt Hinweis im Cockpit-Header.

**Szenario 3 · Provider-Wegfall**
Adapter setzt `isConfigured()=false` mit Fehler-Memo. Bestehende Entries bleiben unangetastet. Toast „Sync fehlgeschlagen, letzte erfolgreiche Daten: …".

### D.3 · API-Key-Storage

**Heute (Phase 1):** localStorage wie bisher. Aufwand minimal, Risiko single-user akzeptabel.

**BL-Item Phase 2 · Worker C** (vor Multi-User-Rollout, 3-4 Tage Aufwand):
- Worker C als API-Proxy für Clockify, Toggl, Anthropic, OpenAI
- BYOK-Variante II: User-Keys in Cloudflare-KV, encrypted-at-rest, pro User-Token
- Geschäftsmodell: **Modell A · BYOK** (User behält eigenen API-Account, eigene Rechnung)
  - Revisionsoffen: später Premium-Tier mit „AI inklusive" möglich
- Logische Konsistenz: Worker A (Notion-Proxy) + B (Auth) existieren — C ist Erweiterung

**Hygiene-Refactor jetzt schon:** Adapter-URLs als Konfig-Konstanten, nicht hardcoded. Macht Phase-2-Migration zu Worker C trivial.

### D.4 · Token-Sicherheit · Layer-Stack

| Layer | Wann | Aufwand | Wirkung |
|---|---|---|---|
| **L1 · Token-Lifetime** (90 Tage TTL + Refresh) | jetzt (Sprint 8) | 0.5 Tag | hoch |
| **L4 · Revocation-Endpoint** | jetzt (Sprint 8) | 0.5 Tag | hoch |
| **L5 · CSP-Header** | jetzt (Sprint 8) | 0.2 Tag | mittel |
| **L2 · Rate-Limiting per Token** | mit Worker C (Phase 2) | 0.5 Tag | hoch |
| **L6 · HTTPOnly-Cookie statt localStorage** | mit Worker C (Phase 2) | 1-2 Tag | hoch |
| **L3 · Anomalie-Detection** | Phase 3 (Multi-User Skala) | 2 Tag | hoch |
| **L7 · MFA-Sensitive-Ops** | Phase 3 | 1 Tag | medium |

**BL-Items:**
- BL-NEU-1: Token-Lifetime + Revocation-Endpoint (L1+L4) — Sprint 8 (~1 Tag)
- BL-NEU-2: CSP-Header (L5) — Sprint 8 (~0.2 Tag)
- BL-NEU-3: Worker C + L2 + L6 — vor Multi-User-Rollout (~5 Tage)

### D.5 · Auto-Sync

Manueller Sync bleibt Default. **Auto-Sync bei Cockpit-Render** falls letzter Sync >24h zurück. Nicht aggressiv, nicht hintergrund-getrieben.

---

## Block E · Tab-Naming

### E.1 · Beschluss

**Tab heißt „Aktivitäten" (DE) / „Activities" (EN).** Kein Refactoring im UI nötig.

### E.2 · „Projekte" als App-Begriff gestrichen

**Begründung:** Begriff ist mehrdeutig, hat in der Historie sowohl für Time-Tracker-Daten als auch für Schuld/Spar/Investition gedient. Wir geben ihn auf, statt ihn zu klären.

- Notion-DB bleibt technisch `FB · Projekte` (interne Sache, kein User-Touchpoint)
- App-Glossar nutzt „Projekte" nicht mehr
- Schuld/Spar/Investition: **Begriff bleibt offen** — wird später entschieden, wenn klarer ist, was die App in dieser Domäne wirklich abbildet

### E.3 · Glossar-Update S37

```diff
S16-Glossar (alt):
- Projekte = Arbeitsprojekte (Clockify/Toggl)
- Ziele    = Finanzielle Vorhaben (Schuld/Spar/Investition)

S37-Update:
+ Aktivitäten = Wo fließt meine Zeit hin (Time-Tracker)
+ "Projekte" als App-Begriff aufgegeben
+ Schuld/Spar/Investition: Begriff offen, später entschieden
+ Notion-DB "FB · Projekte" bleibt technisch, kein User-Touchpoint
```

### E.4 · Code-Refactoring (Backlog-Item)

| Heute | Nachher |
|---|---|
| `Store.projekte` (Time-Cache) | `Store.aktivitaeten` |
| localStorage `projekte` | `fb_aktivitaeten` (mit Migration) |
| `Computed.projekteSummary()` | bleibt mit Hinweis-Kommentar (rechnet Schuld/Spar/Investition, Name folgt) |
| Tab-Heading | bleibt „Aktivitäten" |

→ BL-NEU-4: Code-Naming-Closure-Refactor — Sprint 9 oder eigener kleiner Sprint (~1 Tag).

---

## Sprint-Planung post-DS2

| Sprint | Inhalt | Voraussetzung |
|---|---|---|
| **Sprint 7** | DS2-Implementation Phase 1: Block A (TimeAdapter granular) + Block B (Klassifikation 5+1) + Block C-Phase-1 (Default-Kategorien-Mapping + Sofort-Fix BUG-075) | DS3 (VI für Aktivitäten-Tab) parallel |
| **Sprint 8** | bestehende Architektur-Items: GSheets, A13-Nachrüstung, FXCache γ-Refactor + **Token-Sicherheit L1+L4+L5** | — |
| **Sprint 9** | Audit-Bug-Fixes + Quick Wins (siehe Audit-Doc Empfehlungs-Priorisierung) | Sprint 7 + 8 |
| **Sprint 10** *(NEU)* | Reserven-Achse-Umbau (S4) + S2-Profit-Wasserfall + S1-Bereich-Filter | DS3 |

---

## Sprint-7-Briefing-Skelett (für später)

**Sprint 7 Scope (post-DS2):**

1. **TimeEntry-Schema-Migration**
   - `fb_time_entries`-Storage neu (Layer 1 + 2 vorbereitet)
   - Adapter-Mapping erweitern (`billable`, `tags` mitspeichern)
   - `syncTimeTracker()` schreibt granular, derived Aggregate-Cache

2. **Aktivitäten-Klassifikation**
   - `kategorie`-Property pro Aktivität (5+1)
   - Banner für unklassifizierte
   - Bulk-Tagger (Schnell + Liste)
   - Settings: Leisure-Schätzwert + Wochen-Arbeitskapazität

3. **Variable-Kosten-Erfassung (C.1 + C.2)**
   - `kostenart`-Property pro Buchung (Override-Schicht)
   - Default-Mapping in Settings
   - `Computed.buchungKostenart(b)` Helper

4. **BUG-075 Sofort-Fix (Stufe 1+2)**
   - `effectiveRate` → `billableRate`
   - Variable-Kosten-Approximation in `Computed.deckungsbeitrag()`

5. **Pro-Aktivität-DB-Spalte im Aktivitäten-Tab**
   - `Computed.aktivitaetWirtschaft(id)` Helper
   - Sortier-Toggle Stunden / DB-pro-Stunde
   - ABC-Rang-Badge

**Voraussetzungen Sprint 7:**
- DS3 hat Aktivitäten-Tab visuell entworfen (parallel)
- Audit-Doc als Referenz für betroffene Widgets

---

## Cross-References

- **MASTER.md** — Bug-Register, Backlog, Architektur-Regeln (A15 NEU), Design-Prinzipien (DP11 NEU + DP1-Sub)
- **widget_audit_S37.md** — 45 Issues, 7 systemische Befunde
- **strategie_kontext.md** — Strategie-Beschlüsse S37 + DS-Roadmap (DS3, DS4, DS5)
- **vi_kontext.md** — DS3 (Aktivitäten-Tab visuell) hat DS2-Beschlüsse als Voraussetzung

---

*FinanceBird · ds2_zeit_aktivitaeten_S37.md · 2026-04-29 · Session 37 · Oswald H. König + Claude*
