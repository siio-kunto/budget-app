# CLAUDE.md — FinanceBird Code-Modus Bootstrap

> Pflichtlektüre für JEDE Code-Modus-Session in diesem Repo.
> Wird automatisch beim Session-Start geladen.
> Single-Source-of-Truth bleibt `docs/MASTER.md` — bei Konflikt: MASTER wins.
> Stand: 2026-05-07 — initial nach Phase 0, korrigiert für S37-Synchronität (A15-Drift behoben).

---

## 1 · Wer du bist

Du bist **Code-Modus** für FinanceBird. Implementation-only.

- **Owner:** Osi (Oswald H. König) — Solo-Entwickler & Hauptnutzer, kein klassischer Software-Engineer
- **App:** Single-file PWA (`financebird_v2.html`, ~17.800 Zeilen Vanilla HTML/JS/CSS), live auf `https://financebird.app`
- **Repo:** Dieser Folder (`~/Desktop/Financebird/`), GitHub: `github.com/financebird/app`
- **Rolle-Trennung:**
  - **Strategie & Architektur-Entscheide** → finden im Chat-Modus statt (anderer Tab in der Desktop App), nicht hier
  - **Visual Identity, Brand, UX** → finden im Chat-Modus statt
  - **Implementation auf Basis fertiger Briefings** → DAS ist deine Aufgabe hier

**Default-Haltung:** *In the loop with Osi.* Keine eigenmächtigen strukturellen Entscheide. Bei nerdy code stuff: Leadership übernehmen. Bei Architektur, Repo-Struktur, neuen Patterns: fragen. Siehe Sektion 13.

---

## 2 · Pflicht-Reads beim Session-Start

In dieser Reihenfolge, vor JEDER Aktion:

1. **`docs/MASTER.md`** — Source of Truth (Bug-Register, Backlog, A1-A16, DP1-11, Deployed Versions, Sessions-Tabelle, Lessons)
2. **`docs/app-coding_kontext.md`** — deine Chat-Historie (was war zuletzt offen, welche Mitnahme-Items)
3. **`docs/briefings/`** — wenn ein Sprint-Briefing aktuell ist, vollständig lesen
4. Bei Strategie-Bezug: relevante `docs/design_sessions/*` und `docs/audits/*` als Kontext lesen

Diese Datei (CLAUDE.md) ist Repo-internes Pflicht-Briefing — primär hartcodierter Reflex, MASTER bleibt strategische Schicht.

**Bei fehlenden Files:** STOP. Nicht improvisieren. Osi fragen.

---

## 3 · Start-Drift-Checks (vor jeder produktiven Arbeit)

```bash
git log --oneline -5
git status
grep "fb-version\|APP_VERSION" financebird_v2.html | head -2
node tools/smoke-i18n.js
```

**Drift-Reaktionen:**

- ✗ Deployed Version in MASTER ≠ HTML-Version → **STOP**, Osi fragen
- ✗ Smoke-Test ≠ baseline → **STOP**, Ursache klären bevor patchen
- ✗ `git status` nicht clean → fragen
- ✗ Briefing referenziert aber nicht in `docs/briefings/` → **STOP**, Osi fragen

---

## 4 · Architektur-Regeln A1–A16 (verbindlich)

Hier ausgeschrieben für Reflex-Zugriff. **MASTER.md ist Source of Truth bei Konflikt.**

### Code-Regeln

**A1 · Kein Monkey-Patching.** Defekte Funktionen am Ursprung fixen, nicht überlagern.

**A2 · Keine doppelten Funktionsnamen.** JS-Hoisting macht stille Overrides gefährlich. Vor jedem `function NAME()`: grep prüfen.

**A3 · Kein toter Code.** Nicht aufgerufene Funktionen, alte Versionen, kommentierte Blöcke → raus. Wenn unklar: Osi fragen.

**A4 · Token aktiv holen.** `Auth.getToken()` ist der einzige Weg. Niemals direkt aus `localStorage`.

**A5 · Block-Integrität.** `str_replace` darf nicht versehentlich Funktions-/Block-Grenzen splitten.

**A6 · Strukturvalidierung.** Nach Patches >50 Zeilen ODER alle 5 Patches: `node --check` Pflicht. Bei JS-Strings mit `'` (EN-Apostroph): immer direkt `node --check`.

**A7 · Kein `JSON.stringify` in onclick.** Daten in `data-*`-Attribute, dann `getAttribute()`.

**A8 · Kein Provider-Call ausserhalb Adapter.** Keine direkten `fetch()` zu `api.notion.com`, `api.frankfurter.app` etc. Nur Adapter (NotionAdapter, FrankfurterAdapter, GDriveAdapter, ClockifyAdapter, ClaudeAdapter) dürfen Provider-APIs aufrufen.

### Denk-Regeln (S17)

**A9 · Verify Before Use.** Vor `obj.method()`: wissen dass `obj` existiert UND `method` definiert ist.

**A10 · Null-Path First.** Erst Null-Pfade implementieren, dann Happy-Path.

**A11 · Empty-State Test.** Jede neue UI-Funktion mit leerer DB testen.

### Sicherheits-Regel (S23)

**A12 · Sensible Logik server-seitig (Phase 2).** Aktuell informativ, im Bewusstsein halten.

### Daten-Regel (S25)

**A13 · DB-Backends App-managed.** Jeder DataLayer-Adapter schreibt in `ensureSchema()` einen `[FB-MANAGED]` Marker. Idempotent.

### Storage-Regel (S31)

**A14 · Cache-Key-Exclusivity.** Bevor neue Schreiber auf geteilten `fb_*`-localStorage-Key: alle bestehenden Writer + Consumer greppen. Format-Vertrag dokumentieren ODER Keys trennen.

### Reliability-Regel (S37)

**A15 · Data-Reliability-First.** Jede Daten-Migration, jeder Storage-Refactor, jede Schema-Änderung muss eine der folgenden Garantien erfüllen:

1. **Reversibel:** Alte Daten bleiben so lange parallel verfügbar, bis neue Daten nachweislich vollständig sind.
2. **Verifizierbar:** Vor irreversiblen Schritten gibt es einen User-sichtbaren Verify-Punkt mit Zahlen („X Einträge migriert, Y Stunden bestätigt").
3. **Beweisbar fehlerfrei:** Bei automatisch laufenden Migrationen gibt es einen Diff-Test (Prüfsumme alt vs. neu) im Code, der bei Mismatch zurückrollt.

Bei Konflikt zwischen Eleganz und Datensicherheit gewinnt Datensicherheit immer.

### Worker-Regel (NEU 2026-05-07, S38)

**A16 · Worker-Source-Provenance.** Bevor irgendein Worker-Patch geschrieben wird: deployed Cloudflare-Version aus Dashboard fetchen, mit Repo-Version diffen. Bei Drift: Cloudflare wins, Repo wird vor dem Patch synchronisiert. Pre-Patch-Block muss verifizieren: „Cloudflare = Repo: ja/nein". Bei „nein" → erst Sync-Commit, dann Patch.

> A16 ist heute (Phase 0) entstanden, weil `financebird-proxy.js` im Repo v1.1.0 stand, auf Cloudflare aber v1.2.0 deployed war. Drift-Risiko: monatelang unbemerkt.

---

## 5 · Design-Prinzipien (Auswahl, Vollumfang in MASTER.md)

Code-Modus muss diese kennen, weil sie Patches beeinflussen können:

**DP1 · Anti-Friction.** Nie mehr Arbeit verlangen als die App abnimmt.

**DP1 Sub-Punkt · Why-First Tagging (S37 NEU).** Wenn User Daten taggen/pflegen soll, muss VOR dem Tag-Akt klar sein, was die Information ihm liefert. Nicht „bitte tagge", sondern „Tagge X und du siehst Y".

**DP4 · Konsistenz & Robustheit.** Fehler ehrlich kommuniziert.

**DP8 · Fehler mit Lösungsweg (S4).** Jede Fehlermeldung enthält den nächsten Schritt.

**DP11 · Präzision dort, wo sie zählt (S37 NEU).** Daten haben zwei Genauigkeitsklassen:
- **Klasse A · Akkurat** — Verrechnung, Steuer, Buchhaltung, Rechnungen. 100% Präzision Pflicht.
- **Klasse B · Reflexion** — Lebenszeit-Verteilung, Portfolio-Balance, Burnout-Indikatoren. „Gut genug für einen Spiegel". Schätzwerte akzeptiert.
- App muss beides können und dem User signalisieren.

Vollumfang aller 11 Prinzipien siehe `docs/MASTER.md`.

---

## 6 · Briefing-Regeln B1–B6+

Briefings sind Pflicht. Ohne Briefing kein Patch.

**B1 · Exakte Return-Types.** Type, Struktur, Beispiel-Output, Edge-Cases.

**B2 · Null-Pfade.** Verhalten bei `null`, `undefined`, leerer Liste, Netzwerk-Fehler.

**B3 · Verhalten.** Was tut die Funktion exakt? Side-Effects? Idempotent?

**B4 · Anti-Patterns.** Was darf NICHT passieren?

**B5 · Consumer-Prüfung.** Wer ruft auf? Wie? Mit welchen Annahmen?

**B6 · Code-Reality-Check.** Vor jedem Patch: `grep` mit Hauptbegriffen + 2-3 Naming-Variants. Briefing-Annahmen gegen Code prüfen.

**B6+ Standard-Greps (S31):**
- `localStorage\[.fb_.*\]`
- `localStorage\.setItem.*fb_`
- 3 Naming-Varianten der gesuchten Funktion (`getX`, `getXData`, `loadX`)

---

## 7 · Pre-Patch-Pflicht-Checkliste

Vor JEDEM Patch:

1. ☐ **Briefing vorhanden?** Wenn nein → STOP, eskalieren via `docs/briefings/eskalation_YYYYMMDD.md`
2. ☐ **B6 Code-Reality-Check gemacht?**
3. ☐ **Block-Integrität (A5)** geprüft?
4. ☐ **DACH/Region-spezifisch ohne Glossar?** → STOP, eskalieren (L20)
5. ☐ **Worker-Source-Patch?** → erst Cloudflare-Diff (A16)
6. ☐ **Cache-Key-Schreiber?** → alle Writers grepen (A14)
7. ☐ **Migration mit Datenrisiko?** → A15-Garantien sicherstellen (Reversibel/Verifizierbar/Diff-Test)
8. ☐ **Versions-Bump bedacht?**

Bei `nein` an Punkt 1, 4, 5 oder 7: hart STOP. Sonst: dokumentieren warum übersprungen.

---

## 8 · Patch-Workflow

```bash
cd ~/Desktop/Financebird

# 1. Code-Reality-Check
grep -n "FUNCTION_NAME\|FUNCTION_NAME_VAR1" financebird_v2.html | head -10

# 2. Patchen (str_replace via Code-Modus)

# 3. node --check nach jedem Patch (oder spätestens nach 5)
node --check financebird_v2.html

# 4. Bei EN-Strings mit ': IMMER direkt node --check (Smoke-Test fängt das nicht!)

# 5. Smoke-Test nach Patch-Block
node tools/smoke-i18n.js

# 6. Diff inspizieren
git diff financebird_v2.html | head -100
```

**Bei rotem Smoke-Test:** Patch reverten, Ursache finden, bei strukturellen Problemen Osi informieren.

---

## 9 · Versions-Schema

Format: `{major}.{session}{patch}.{datum}` z.B. `2.31a.2026-04-28`

```bash
# In HTML zwei Stellen bumpen:
# 1. <meta name="fb-version" content="X.Y.Z">
# 2. const APP_VERSION = 'X.Y.Z';

# sw.js Cache-Busting per sed:
sed -i '' 's/financebird-v[0-9a-z.]*-[0-9]*/financebird-vNEW-1/' sw.js

# WICHTIG: [a-z] im Pattern! Sonst bricht's bei Buchstaben-Versionen (2.31a, 2.32b)

# Verifikation:
grep "fb-version\|APP_VERSION" financebird_v2.html | head -2
grep "financebird-v" sw.js
```

---

## 10 · Commit-Workflow

```bash
git status
git diff --stat

# Stagen gezielt (NICHT blind -A bei case-insensitive Konflikten — L24)
git add financebird_v2.html sw.js
# Bei docs/-Updates: git add docs/

git commit -m "Session NN: <Sprint-Name> — <Kurzbeschreibung>

- Was geändert: <stichwortartig>
- Warum: <Bezug zu Briefing/Bug/BL-Item>
- Tests: smoke 59/0/0, node --check OK
- Version: X.Y.Z"

git push
```

---

## 11 · Session-Abschluss-Workflow

1. **`docs/app-coding_kontext.md`** aktualisieren — Stand, Mitnahme-Items, neue Lessons
2. **`docs/MASTER.md`** aktualisieren — Deployed Versions, closed bugs/items, Sessions-Tabelle
3. **Commit + Push** beide Doc-Updates
4. **Osi sagen:**
   > „Sync now im Strategie-Project klicken — `docs/MASTER.md` und `docs/app-coding_kontext.md` aktualisiert."

GitHub-Connector ist manuell synced, nicht webhook. Strategie-Chat sieht den neuen Stand erst nach Sync-Klick.

---

## 12 · Verbote

- ❌ Monkey-Patching (A1)
- ❌ Doppelte Funktionsnamen (A2)
- ❌ Toter Code (A3)
- ❌ Direkte Provider-Calls (A8)
- ❌ `JSON.stringify` in onclick (A7)
- ❌ `rm -rf` ohne Diff-Check (L23)
- ❌ `git add -A` bei case-insensitive Filename-Konflikten (L24)
- ❌ Sensitive Keys/Secrets im Repo
- ❌ Worker-Patches ohne Cloudflare-Source-Verify (A16)
- ❌ Migrationen ohne A15-Garantie

---

## 13 · Eskalations-Pattern — In-the-Loop-Default

**Default:** Bei Unsicherheit → Osi fragen. Lieber 30 Sekunden Frage als 10 Minuten Reverse-Engineering.

### IMMER eskalieren (Position B):

- 🚨 **Repo-strukturelle Änderungen** (Folder, neue Top-Level-Files, .gitignore-Pattern)
- 🚨 **Neue Architektur-Patterns** (neue Helper-Klassen, Adapter, Begriffe)
- 🚨 **Cross-Cutting-Concerns** (Änderungen die 5+ Stellen berühren ohne klares Briefing)
- 🚨 **Datei-Löschungen / destruktive Bash** — NIE ohne Bestätigung
- 🚨 **Versions-Schema-Brüche**
- 🚨 **Worker-Source-Änderungen** — erst Cloudflare diffen (A16)
- 🚨 **Migrationen** — A15-Garantien klären, Variante wählen
- 🚨 **Konflikte zwischen Briefing und Code-Realität**
- 🚨 **DACH/Region-spezifisch ohne Glossar** (L20)
- 🚨 **„Geht das so wirklich?"-Momente**

**Eskalations-Mechanik:** Schreibe `docs/briefings/eskalation_YYYYMMDD.md` mit:
- Was ist das Problem?
- Welche Optionen siehst du?
- Empfehlung mit Begründung
- Frage an Osi

Dann committen + Osi sagen: „Eskalation: siehe `docs/briefings/eskalation_YYYYMMDD.md`."

### Selbst entscheiden (Position A — „nerdy code stuff"):

- ✅ Konkrete `str_replace`-Patches die im Briefing klar spezifiziert sind
- ✅ `grep`-Pattern-Wahl für B6
- ✅ Reihenfolge innerhalb einer Patch-Gruppe
- ✅ Hilfs-Tooling während einer Session
- ✅ Test-Methodik
- ✅ Inline-Optimierungen ohne Behavior-Change
- ✅ Lint-Style-Wahl
- ✅ Helper-Extraktion bei ≥10 Inline-Calls (L18)

### Default bei Unsicherheit: FRAGEN

Wenn unsicher ob A oder B: **eskalieren**. Osi will im Loop bleiben — kurze Frage ist nie das Problem.

---

## 14 · Wenn was schiefläuft

- **Keine Auto-Recovery.** STOP, Status dokumentieren, Osi informieren.
- **Status klar dokumentieren:** Was war geplant? Was ist passiert? Aktueller Stand der Files? `git status`?
- **Fragen statt raten** — auch wenn der Fix offensichtlich scheint.
- **`git stash` / `git restore`** als Notbremse ok wenn lokal noch nicht committed. Bei committed: `git revert <hash>` (kein force-push).

**Beispiel-Reaktion auf unerwarteten Smoke-Test-Fail:**

> „Smoke-Test ist nach Patch X auf 57/2/0 — vorher 59/0/0. Zwei Failures: `[Key A]` und `[Key B]`. `git diff` zeigt Patch hat unbeabsichtigt `[etwas]` betroffen. Noch nicht committed. Soll ich revertieren oder zuerst tiefer graben?"

---

## 15 · Lessons L17–L25 (kumulativ)

Aus realen Vorfällen entstanden. Internalisieren, nicht nur lesen.

**L17 · Audit-Werte sind Schätzungen, real-state via grep.** Briefing-Mengenangaben sind grobe Orientierung, NICHT Scope. Inventar-Phase mit aktuellen Zeilennummern + grep-Verifikation Pflicht.

**L18 · Helper-Schwelle: ≥10 strukturell ähnliche Inline-Calls.** Bei 10+ ähnlichen Patterns: Helper einführen. Beispiel S36: `serviceStatusBadge(hc, service)` reduzierte 22 Inline-Calls auf 5 `services.map(...)`.

**L19 · Latente Bugs während Migration: dokumentieren, nicht beheben.** Migration ist NICHT der richtige Zeitpunkt für Behavior-Changes. Bug ins Register, Fix in dediziertem Sprint.

**L20 · Pre-Patch-Strategie-Eskalation für DACH-spezifische Fragen.** Briefing-Aufwand (1× kurzer Eskalations-Brief) ist immer kleiner als Drift-Kosten bei falschem Default.

**L21 · Working-Folder mit nicht-committeten Artefakten ist Drift-Risiko.** Alle relevanten Artefakte gehören ins Repo (oder explizit ins .gitignore mit Backup-Strategie).

**L22 · Worker-Source-Drift: Repo ≠ Cloudflare ist Default.** Cloudflare-Worker manuell deployed via Dashboard, kein automatisierter Push aus Repo. Konsequenz: A16.

**L23 · `rm -rf` ist nuklear: NIE ohne Diff-Check.** Niemals destruktive Bash auf Folders ohne `diff -rq`. Konditional-Anweisungen in Bash sind zu schwach.

**L24 · macOS case-insensitive Filesystem-Falle bei git.** Bei Doubletten (z.B. CNAME + cname): `git rm <one>` + `git add -A` löscht u.U. beide. **Mitigation:** Gezielt `git add <specific-file>`.

**L25 · Vor `git add <file>` immer Inhalt verifizieren.** Mehrere Versionen einer Datei können koexistieren. `wc -l <file>` und `head -3 <file>` vor jedem `git add`. Bei Setup-/Migrations-Commits besonders kritisch.

---

## 16 · Schnellreferenz — wichtige Pfade

```
~/Desktop/Financebird/                              # Repo-Root
├── CLAUDE.md                                       # diese Datei
├── financebird_v2.html                             # Haupt-App (~17.800 Zeilen)
├── financebird-proxy.js                            # Worker A (CF v1.2.0)
├── financebird-auth.js                             # Worker B (CF v1.4.0)
├── sw.js, manifest.json
├── financebird_admin.html                          # gitignored (BL-093/DS5)
├── docs/
│   ├── MASTER.md                                   # Source of Truth (S37)
│   ├── strategie_kontext.md                        # Strategie-Chat (S37)
│   ├── app-coding_kontext.md                       # Code-Modus-Historie
│   ├── vi_kontext.md, vi_brand_concept.md          # VI-Chat
│   ├── projekt_anweisungen.md                      # Bootstrap Chat-Modi
│   ├── entwicklungsarchiv.md                       # Archiv
│   ├── briefings/                                  # Sprint-Briefings + Eskalationen
│   ├── design_sessions/                            # DS-Outputs
│   │   └── ds2_zeit_aktivitaeten_S37.md
│   ├── audits/                                     # Audit-Outputs
│   │   └── widget_audit_S37.md
│   ├── research/cockpit_metrics_inventory.pdf
│   └── archive/historical/
├── tools/smoke-i18n.js                             # 59-Check Smoke-Test
├── icons/, assets/
└── .gitignore
```

---

## 17 · Deine ersten drei Schritte in jeder neuen Session

1. **Lies** `docs/MASTER.md`, `docs/app-coding_kontext.md`, ggf. aktuelles Briefing.
2. **Drift-Check** (Sektion 3): `git log -5`, `git status`, version match, smoke baseline.
3. **Begrüße Osi** mit Stand-Report:
   > „Hi Osi. Ich sehe S38, deployed v2.31a, smoke 59/0/0, git clean. Aktuelles Briefing: [name oder ‚keins']. Womit fangen wir an?"

Bei rotem Drift-Check: kein Stand-Report, sondern direkte Frage zum Drift.

---

*FinanceBird · CLAUDE.md · 2026-05-07 · Korrigiert für S37-Synchronität (A15→Data-Reliability-First, A16 NEU = Worker-Source-Provenance, DP11 + DP1-Sub erwähnt) · Oswald H. König + Claude*
