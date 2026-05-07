# FinanceBird · strategie_kontext.md
> Chat "FB · Strategie & Architektur"
> Stand: 2026-04-29 (Session 37 — Widget-Audit + DS2 abgeschlossen, 8 Beschlüsse, A15+DP11+DP1-Sub, DS4+DS5 als Roadmap)
> Bug-Register + Backlog + Regeln → MASTER.md (Quelle der Wahrheit)

---

## Zweck dieses Chats

Übergeordnetes Denken: Business Case, Produktvision, Architektur-Entscheide, Design-Sessions.
Entscheide hier sind bindend für alle Unterchats.

**Systemisches Prinzip:** Jede Entscheidung wird auf zwei Ebenen geprüft:
1. Funktioniert es für Osi heute?
2. Wie skaliert es für 50–200 fremde Nutzer in Phase 2?

---

## ⚡ BRIEFING FÜR NÄCHSTE SESSION

**Wo stehen wir nach S37:**
- Widget-Audit (BL-108) ✅ vollständig abgeschlossen — 24 Widgets, 45 Issues, 7 systemische Befunde, Empfehlungs-Priorisierung. Output: `widget_audit_S37.md`.
- DS2 ✅ abgeschlossen — Blöcke A (Datenmodell), B (Klassifikation), C (Variable Kosten + BUG-075-Pfad), D (Provider-UX + Token-Sicherheit), E (Tab-Naming). Output: `ds2_zeit_aktivitaeten_S37.md`.
- 8 Strategie-Beschlüsse + A15 (NEU) + DP11 (NEU) + DP1-Sub (NEU) ratifiziert. Volltext in MASTER.md.
- Sprint 7 ist entblockt (DS2 done) — App-Coding kann Phase 1 starten sobald DS3 (VI) parallel läuft.

**Was als nächstes Strategie-relevant ist (priorisiert):**

1. **DS3 Recurring-UX** (VI-Chat) — blockt Sprint 7 visuell, parallel zu DS2-Implementation laufbar
2. **Sprint-7-Briefing schreiben** — basierend auf `ds2_zeit_aktivitaeten_S37.md` Skelett. Aufgabe: konkrete Implementation-Schritte für TimeEntry-Schema + Klassifikation + Variable-Kosten + BUG-075-Fix
3. **Standard-Kategorien-Default-Mapping** finalisieren — 15 Kategorien mit Osi durchgehen, einzelne Zuordnungen nicken oder ändern (Vorschlag in DS2-Doc Block C.2)
4. **Archivierung** — Sprint 6.5 (a-d) abschließen, ~35-40 Items aus MASTER.md ins Archiv (S37 oder S38)
5. **Sprint-8-Briefing erweitern** — Token-Sicherheit L1+L4+L5 ergänzen (BL-111 + BL-112)
6. **DS4 Backend-Strategie** vorbereiten — wenn Notion-Pain spürbar wird oder Multi-User-Bedarf auftritt (siehe Q&A unten)

**Geplante Design-Sessions (DS-Roadmap):**

| DS | Thema | Trigger |
|---|---|---|
| DS3 | Recurring-UX (visuell) | VI-Chat aktiv |
| **DS4 NEU** | **Backend-Strategie** (Firebase/Supabase/Notion-Bewertung) | Notion-Pain oder Multi-User-Vorbereitung |
| **DS5 NEU** | **Multi-Account-Architektur** (Vereins-Buchhaltung etc.) | Abhängig von DS4 |
| DS6 | Treuhänder-Portal-Konzept | Phase 3 |

---

## S37 Entscheide (bindend)

### Widget-Audit (BL-108) ✅ abgeschlossen

24 Widgets gegen Code-Reality + Deep-Research-Inventory (DS1-Output, jetzt im Projekt verfügbar) systematisch geprüft.

**45 Issues identifiziert:**
- 17 🐛 Bug (math/konzeptionell falsch)
- 16 💡 Erweiterung (Daten da, Mehrwert klar)
- 12 📚 Research-Lücke (neue Metrik aus Inventory)

**7 systemische Cross-Widget-Befunde:**
- **S1** Geschäftlich/Privat-Drift (10 Widgets)
- **S2** Profit-Definition uneinheitlich (3 Widgets)
- **S3** Schwellwerte unsystematisch
- **S4** Konzept-Konkurrenz „Monate-Reserven" (4 Widgets)
- **S5** Research-Lücken mit strategischem Wert (5 Quick-Win-Items)
- **S6** DS2-Hebel: TimeAdapter-Schema
- **S7** `doughnut` als USP-Kandidat

Volltext: `widget_audit_S37.md`. Empfehlungs-Priorisierung dort.

### DS2 (Zeit & Aktivitäten) ✅ abgeschlossen

Volltext: `ds2_zeit_aktivitaeten_S37.md`. Kern-Beschlüsse:

**Block A · Datenmodell**
- TimeEntry-Schema granular: `{ id, provider, projectId, date, start, end, durationSec, description, billable, tags }`
- Drei-Layer-Storage (Granular Y/Y-1 + Tages-Aggregate Y-2..Y-3 + Monats-Aggregate älter)
- Komprimierung lazy beim Jahres-Übergang
- Migration vereinfacht (Hard-Cut akzeptabel da Single-User-Phase)

**Block B · Klassifikation**
- 5+1 Kategorien (Charles Handy): paid / gift / study / home / overhead + leisure (Schätzwert)
- User-Tag in FinanceBird-UI (kein Präfix-System), `unklassifiziert` als legitime 6. Kategorie
- Banner für unklassifizierte mit Why-First-Kommunikation (DP1-Sub)
- Bulk-Tagging: Schnell-Tagger oder Liste, User wählt
- Leisure-Schätzwert + Wochen-Arbeitskapazität als Settings-Werte (DP11 Klasse-B)
- Pattern-Metriken zeigen Konfidenz-Indikator bei wenigen getrackten Tagen

**Block C · Variable Kosten + BUG-075**
- Hybrid γ: per-Buchung `kostenart` Override + Kategorie-Default + null
- 15 Standard-Kategorien Default-Mapping (Vorschlag in DS2-Doc, finalisiert mit Osi vor Sprint 7)
- BUG-075 in 3 Stufen: Sofort-Fix (`billableRate` statt `effectiveRate`) + Variable-Kosten-Approximation + Voll-Implementation
- Pro-Aktivität-DB-Spalte im Aktivitäten-Tab (Option I, kein eigenes Cockpit-Widget)
- ABC-Klassifikation Pareto-basiert

**Block D · Provider-UX + Token-Sicherheit**
- Multi-Provider-Architektur, UI-Default mono
- Provider-Switching A15-konform (parallel-fähig)
- API-Keys: heute localStorage, BL-Item Worker C für Phase 2 (vor Multi-User)
- **Geschäftsmodell A · BYOK** (revisionsoffen für Premium-Tier)
- Token-Sicherheit-Layer-Stack: L1+L4+L5 Sprint 8, L2+L6 mit Worker C, L3+L7 Phase 3
- Auto-Sync bei Cockpit-Render falls >24h
- Hygiene-Refactor jetzt: Adapter-URLs als Konfig-Konstanten

**Block E · Tab-Naming**
- Tab heißt **„Aktivitäten" (DE) / „Activities" (EN)** — kein UI-Refactoring nötig
- **„Projekte" als App-Begriff gestrichen** — zu mehrdeutig nach Historie
- Schuld/Spar/Investition: Begriff offen, später entschieden
- Notion-DB `FB · Projekte` bleibt technisch (intern)
- Code-Refactoring `Store.projekte → Store.aktivitaeten` als BL-Item (BL-114)

### Architektur-Regel A15 · Data-Reliability-First (NEU)

Volltext in MASTER.md. Kerngedanke: Jede Migration/Refactor muss reversibel ODER verifizierbar ODER beweisbar fehlerfrei sein. Datensicherheit > Eleganz.

### Design-Prinzip 11 · Präzision dort, wo sie zählt (NEU)

Volltext in MASTER.md. Kerngedanke: zwei Genauigkeitsklassen.
- **Klasse A** (Geld/Steuer/Rechnung) — strikt akkurat
- **Klasse B** (Reflexion/Pattern) — pragmatisch genug

App muss beides können und dem User signalisieren.

### Design-Prinzip 1 · Sub-Punkt „Why-First Tagging" (NEU)

User-Pflege-Aufgaben müssen den Mehrwert vor dem Tag-Akt zeigen. Nicht „bitte tagge", sondern „Tagge X und du siehst Y".

### Geschäftsmodell-Beschluss · Modell A · BYOK

User bringt eigene API-Keys (Anthropic, OpenAI, Clockify, Toggl). User behält eigene API-Rechnung.

**Revisionsoffen:** Späterer Premium-Tier mit „AI inklusive" möglich (Modell B als Add-on), ohne Bestand-User zu zwingen.

### Multi-Account-Architektur (DS5) · Weg 1 vermerkt

Wenn DS5 angegangen wird: **echte Multi-Tenant-Architektur** (account-scoped Stores, eigene Notion/Firebase pro Account, eigene Settings, etc.). Nicht Workaround mit zwei App-Instanzen, nicht Hack mit localStorage-Prefix.

DS5 abhängig von DS4 (Backend-Strategie) — Firebase macht Multi-Tenant native, Notion erschwert es.

---

## S31 Entscheide (weiter gültig)

### EN-Glossar (verbindlich)
(Unverändert — siehe S35 MASTER.md, plus S37-Eintrag „Aktivitäten = Activities")

### A14 · Cache-Key-Exclusivity
(Unverändert)

### B6 erweitert · localStorage-Greps
(Unverändert)

### BUG-077 · FX-Cache-Format-Konflikt → γ-Refactor Sprint 8
(Unverändert)

---

## S25 Entscheide (weiter gültig)

| Entscheid | Detail |
|---|---|
| **A13** | DB-Backends App-managed |
| **BL-098 GSheetsAdapter** | Implementiert DataLayerInterface vollständig |
| **Delta-Sync GSheets** | Full-Re-Read gated durch Google Drive `file.modifiedTime` |
| **Sync-Monitoring** | Duration + Row-Count in localStorage |
| **A13-Nachrüstung** | NotionAdapter `ensureA13Notices()` Sprint 8 |
| **BL-088 Vermögen Toggle** | Sprint 9 funktional |
| **BL-090 Widget-Links** | ✅ entblockt (Deep-Research jetzt im Projekt seit S37) |

---

## Q&A · Strategie-Fragen aus S37 (für späteren Bedarf)

### Q1 · Firebase als Backend-Alternative zu Notion?

**Status:** Strategisch valide Option, aber kein Sprint-Item — gehört in **DS4 Backend-Strategie**.

**Pro Firebase:**
- Free Tier reicht für Single-User tausendfach
- Schema-Kontrolle (kein Notion-Property-Drift)
- Multi-Tenant native (relevant für DS5)
- Mobile-Performance besser
- Auth integriert

**Contra:**
- Notion-UI als Backup-Editor fällt weg (User können nicht „in Notion schnell was tippen")
- Migrations-Aufwand (1-2 Sprints)
- Vendor-Lock auf Google

**Trigger DS4:** Notion-Pain spürbar (API-Limits, Latenz, Schema-Drift) ODER Multi-User auf Roadmap. Aktuell nicht akut. Geschätzt 6-12 Monate.

**Kostenersparnis Notion-Plus CHF 96/Jahr ist nicht der Hauptgrund** — Architektur-Kontrolle und Multi-User-Vorbereitung sind.

### Q2 · Vereins-Interface / Multi-Account-Switching?

**Status:** Eigene Design-Session **DS5**, abhängig von DS4.

**Beschluss S37:** Wenn DS5 kommt, dann **Weg 1 (echte Multi-Tenant-Architektur)**, nicht Workaround.

**Architektur-Implikationen:**
- Alle `Store.*` account-scoped
- localStorage-Keys mit account-Prefix
- Eigene Notion/Firebase pro Account
- Account-Switcher als Top-Nav-Element
- Vereins-spezifische Logik (Spendenbescheinigungen, Mitgliederbeiträge) als eigene App-Rechtsform

**Pragmatischer Workaround heute (wenn dringend):** Zweite PWA-Instanz unter eigener URL (`verein.financebird.app`) — komplett getrennt, kein Switch-Risiko, aber zweimal pflegen.

---

## Zweck-Split mit anderen Chats

(Unverändert — siehe S31)

---

## Offene Entscheide für nächste Strategie-Sessions

| # | Thema | Wann |
|---|---|---|
| **Sprint-7-Briefing** | Konkrete Implementation-Schritte aus DS2-Doc | Nächste Strategie-Session |
| **Standard-Kategorien-Mapping** | 15 Kategorien finalisieren mit Osi | Vor Sprint 7 |
| **Sprint-8-Briefing-Erweiterung** | Token-Sicherheit L1+L4+L5 ergänzen | Vor Sprint 8 |
| **Archivierung S37** | Sprint 6.5 (a-d) Items + S37-Beschlüsse ins Archiv | S38 oder so |
| DS4 Backend-Strategie | Firebase/Supabase/Notion-Bewertung | Bei Notion-Pain oder vor Multi-User |
| DS5 Multi-Account | Vereins-Buchhaltung etc. | Nach DS4 |
| DS3 Recurring-UX | VI-Chat | Parallel zu Sprint 7 |
| BL-101 Workspace-Mockup | Unabhängig | Zwischen Sprints |
| FXCache γ-Refactor | Sprint-8-Sub-Item | Sprint 8 |

---

## Sessions

| # | Datum | Highlights |
|---|---|---|
| S17 | — | Audit + DS1 Cockpit |
| S18-S22 | — | Cockpit-Rebuild, Hardening, Widget-Fixes, Schema-Management |
| S23 | 2026-04-11/13 | Sprint 1 deployed, ~20 Strategie-Entscheide |
| S24 | 2026-04-15 | Sprints 2+3+4 deployed |
| S25 | 2026-04-16 | Sprint 5-9 Briefings, A13 neu |
| S26-S30 | 2026-04-16/21 | App-Coding-Sessions (Sprint 5, 5.5, 6 Block 1+2) |
| S31 | 2026-04-26 | Sprint 6.5 NEU, BUG-077, A14, B6 erweitert, EN-Glossar verbindlich |
| S32-S36 | 2026-04-26/28 | Sprint 6.5 a-d Implementation (App-Coding-Sessions, deployed bis v2.31a) |
| **S37** | **2026-04-29** | **Widget-Audit komplett (BL-108 ✅) · 45 Issues · 7 systemische Befunde · DS2 abgeschlossen (5 Blöcke) · 8 Strategie-Beschlüsse · A15 NEU · DP11 NEU · DP1-Sub NEU · DS4+DS5 Roadmap-Items · `widget_audit_S37.md` + `ds2_zeit_aktivitaeten_S37.md` neu** |

---

*FinanceBird · strategie_kontext.md · 2026-04-29 · Session 37 · Oswald H. König + Claude*
