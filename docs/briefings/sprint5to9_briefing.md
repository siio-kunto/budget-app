# FinanceBird · Sprint 5–9 Briefing

> **Chat:** FB · Strategie & Architektur · Session 25
> **Adressat:** FB · App-Coding
> **Erstellt:** 2026-04-16
> **Status:** Sprint 5, 6, 8, 9 briefbar — Sprint 7 blockiert durch DS2 + DS3
> **Zusätzlich:** BUG-074 (Hotfix, hohe Prio) · Neue Architektur-Regel A13

---

## Executive Summary

Sprints 1–4 sind deployed (v2.24c + Worker B v1.4.0). Dieses Briefing enthält:

1. **BUG-074 (Hotfix)** — Healing-Overlay erscheint bei jedem App-Start, obwohl Verbindung funktioniert. Hohe Prio. Einschieben vor Sprint 5 oder parallel.
2. **Neue Architektur-Regel A13** — DB-Backends sind App-managed. Jeder DataLayer-Adapter schreibt "Do not edit"-Hinweis in alle DBs.
3. **Sprint 5** — GDrive + Belege (BL-072, BL-073, BL-074-Item, BUG-041, L5)
4. **Sprint 6** — i18n-Fundament + Variante B Migration (Navigation, Sidebar, Toasts, Fehlermeldungen, Onboarding)
5. **Sprint 7** — Blockiert. DS2 + DS3 müssen zuerst im Strategie- bzw. VI-Chat durchgeführt werden.
6. **Sprint 8** — GSheetsAdapter + A13-Nachrüstung NotionAdapter
7. **Sprint 9** — UX + Quick Fixes (ohne BL-090 separate Unterdiskussion)

**Reihenfolge:** Zuerst BUG-074, dann Sprints 5 → 6 → 8 → 9 sequenziell. Sprint 7 wird nachgeliefert sobald Design-Sessions abgeschlossen.

**i18n-Querschnitt:** Sprint 6 legt das Fundament. Sprints 5, 8, 9 migrieren ihre eigenen neuen Strings proaktiv, sobald das `t()`-System steht.

---

## ⚠️ A13 — Neue Architektur-Regel (bindend)

**A13: DB-Backends sind App-managed.**

Jeder `DataLayer`-Adapter schreibt beim `ensureSchema()`-Aufruf einen sichtbaren Hinweis in alle verwalteten DBs/Sheets, der User auffordert, Änderungen ausschliesslich über die App vorzunehmen. User interagiert mit Daten NUR über FinanceBird. Direkt-Edits werden beim nächsten Sync erkannt und gemerged, aber nicht aktiv unterstützt.

### Rationale

- Source-of-Truth-Integrität: App-Writes + User-Direkt-Writes konkurrieren, sonst stille Datenverluste
- Sync-Determinismus: App kann sich auf ihr eigenes Schreibverhalten verlassen
- Konsistenz über Backends: Notion heute, Google Sheets (Sprint 8) morgen, weitere später
- User-Erwartung managen: Die DBs SIND sichtbar, aber sie sind Speicher, nicht Editor

### Mechanismus pro Backend

**Notion (NotionAdapter):**
- Beim `ensureSchema()`: prüfe ob die Daten-Quelle (Data-Source / Collection) eine "Description" mit FB-Marker hat
- Falls nicht: setze Description mit Text
- Marker: `[FB-MANAGED]` am Anfang der Description — so erkennt die App ihren eigenen Text für Idempotenz

**Google Sheets (GSheetsAdapter, Sprint 8):**
- Jedes Sheet hat erste Zeile (frozen) als Hinweis-Banner, mergedCell über alle Spalten
- Farbe: auffällig (z.B. Hintergrund `#FEF3C7`, Text `#92400E`)
- Zweite Zeile: Spalten-Header (bereits frozen)
- Idempotent: App prüft ob Zeile 1 gemergt und mit FB-Marker versehen ist

### Hinweis-Text (i18n-Registry, Sprint 6)

```
[DE]
⚠️ Nicht direkt hier editieren.
Alle Änderungen über die FinanceBird-App vornehmen.
Direkte Änderungen können zu Synchronisations-Fehlern oder Datenverlust führen.

[EN]
⚠️ Do not edit directly here.
Make all changes via the FinanceBird app.
Direct changes may cause synchronization errors or data loss.
```

Diese Strings werden ab Sprint 6 über `t('db.warning.title')`, `t('db.warning.body')` geladen. Bis Sprint 6 steht, hardcoded DE akzeptabel.

### Migration-Strategie

- **NotionAdapter:** Nachrüsten in Sprint 8 (zusammen mit GSheetsAdapter-Implementation). Beim nächsten `ensureSchema()`-Aufruf werden Hinweise in alle 7 DBs geschrieben (Buchungen, Rechnungen, Transfers, Projekte, Konten, Recurrings, Einstellungen).
- **GSheetsAdapter:** Von Anfang an A13-konform (Sprint 8).
- **Zukünftige Adapter (Sprint 8+):** A13 gilt automatisch, ist Teil des Interface-Vertrags.

### Update MASTER.md nach Deployment

MASTER.md Architektur-Regeln Abschnitt ergänzen:

```markdown
**A13: DB-Backends sind App-managed.** Jeder DataLayer-Adapter schreibt beim ensureSchema()-Aufruf einen sichtbaren "Do not edit"-Hinweis in alle verwalteten DBs/Sheets. User interagiert mit Daten ausschliesslich über die App. Direkt-Edits werden beim nächsten Sync erkannt und gemerged, aber nicht aktiv unterstützt.
```

---

## 🔴 BUG-074 — Hotfix (hohe Prio)

### Symptom (User-Report, Osi 2026-04-16)

> "Beim Neustart der App erscheint wieder 'Verbindung wiederherstellen → Unbekanntes Problem → Notion verbinden'. Ich klicke, OAuth läuft durch, alles funktioniert. Aber beim NÄCHSTEN Start das Gleiche. Jedes Mal."

### Root-Cause-Analyse (im Code verifiziert)

**Entry-Point:** `financebird_v2.html`, Zeile ~14023 ff. (IIFE Start-Logik Pfad C "Returning user")

```js
// Zeile ~14023
const onboardComplete = loadLocal('fb_onboard_complete', false);
if (onboardComplete) {
  const hc = await healthCheck('instant');
  const summary = healthSummary(hc);

  if (summary.ok && Auth.isAuthenticated) {
    showApp(); restoreTab();
    // ... happy path
  } else {
    // Zeile ~14073 — REPAIR Pfad
    hideSplashOnce();
    document.getElementById('setupScreen').style.display = 'block';
    document.getElementById('mainApp').style.display     = 'none';
    onboardNext(null, 'repair');
    v3RenderRepair(hc);
  }
  return;
}
```

**Der Repair-Screen wird gezeigt wenn:** `!summary.ok || !Auth.isAuthenticated`

**v3RenderRepair (Zeile ~12227):**

```js
function v3RenderRepair(hc) {
  const items = [];
  if (!hc.license.key_present) items.push({ icon: '🗝', label: 'Lizenz-Key fehlt', ... });
  if (!hc.notion.token_present) items.push({ icon: '📊', label: 'Notion nicht verbunden', ... });
  if (items.length === 0) items.push({ icon: '⚠️', label: 'Unbekanntes Problem', action: '<button ... onclick="v3RepairNotion()">Notion verbinden</button>' });
  ...
}
```

**Der "Unbekanntes Problem"-Fall** (items.length === 0) tritt auf wenn:
- `hc.license.key_present === true` (Lizenz ist im localStorage)
- `hc.notion.token_present === true` (Notion-Token ist gesetzt)
- **Aber:** `summary.ok === false` ODER `Auth.isAuthenticated === false`

Das heisst: **Die äussere Abfrage findet einen Defekt, den `v3RenderRepair` aber nicht kennt.** Die Items "Lizenz fehlt" und "Notion nicht verbunden" decken nur zwei mögliche Ursachen ab, nicht alle.

### Verdächtige Ursachen (in Priorität)

1. **`Auth.isAuthenticated` wird async gesetzt, aber `healthCheck('instant')` wird synchron geprüft.**
   Race Condition: Beim App-Start ist `Auth.isAuthenticated` für einen Moment `false`, auch wenn Token vorhanden. Der Check wird zu früh ausgeführt.

2. **Device-Token fehlt initial** (Sprint 1 Auto-Healing kommt später — in Zeile ~14055: `if (!loadLocal('fb_device_token', null) && Auth.licenseKey) { await Auth.registerDevice(); }`). Dieser Code läuft NACH dem Repair-Check. Wenn der Check darauf läuft, dass das Device-Token noch nicht da ist, fällt er durch.

3. **`healthCheck('instant')` prüft etwas, das normal erst nach `ensureSettingsSchema()` + `loadSettingsFromNotion()` verfügbar ist.**

4. **Flag `fb_onboard_complete` ist true, aber AppState.providers noch nicht geladen** → `summary.ok` wird negativ.

### Investigation-Pfad für App-Coding

1. **`grep` + `view` auf `healthCheck` und `healthSummary`** — was prüfen diese Funktionen konkret? Welche Felder in `summary` können `false` werden wenn license+notion beide ok sind?
2. **Logging hinzufügen beim Repair-Entry:** Welche `summary.issues` sind aktiv? Welcher Wert hat `Auth.isAuthenticated`? Was ist in `hc`?
3. **Reproduktion:** App öffnen, Console → `localStorage` inspizieren, schauen was da ist. App starten, beobachten welcher Check schlägt fehl.

### Fix-Erwartung

Fix ist vermutlich eine der folgenden (je nach Root-Cause):

- **Variante A:** `Auth.isAuthenticated` wird korrekt geladen bevor der Check läuft. Token-Ladung sollte vor `healthCheck('instant')` passieren.
- **Variante B:** `v3RenderRepair` zeigt die echte Ursache aus `summary.issues` an, nicht den "Unbekanntes Problem"-Fallback. Der Fallback ist ein Smell — er zeigt Symptome eines kaputten Checks.
- **Variante C:** Device-Token-Check rauf vor den Repair-Check. Wenn Device-Token fehlt und Lizenz da: register, dann nochmal prüfen.

### Akzeptanzkriterien

- [ ] Nach `git pull` → App öffnen → "Verbindung wiederherstellen"-Screen erscheint NICHT (wenn User eingerichtet ist und Notion verbunden)
- [ ] Bei echtem Problem (z.B. Token widerrufen, Lizenz abgelaufen): Repair-Screen zeigt die RICHTIGE Ursache, nicht "Unbekanntes Problem"
- [ ] "Unbekanntes Problem"-Fallback wird entfernt ODER nur gezeigt wenn `summary.issues.length > 0` aber keiner matcht — mit Debug-Info im Screen (issue.key)

### i18n-Scope für diesen Fix (Sprint 6 Vorgriff)

Alle User-facing Strings in `v3RenderRepair` sollten vorbereitend in die i18n-Registry wandern:
- `t('repair.title')` = "Verbindung wiederherstellen"
- `t('repair.subtitle')` = "Etwas muss repariert werden — das geht schnell."
- `t('repair.license_missing')` = "Lizenz-Key fehlt"
- `t('repair.notion_missing')` = "Notion nicht verbunden"
- `t('repair.unknown')` = "Unbekanntes Problem" (sollte aber entfernt werden)
- `t('repair.action.enter_key')` = "Key eingeben"
- `t('repair.action.connect_notion')` = "Notion verbinden"

---

## Sprint 5 · GDrive + Belege

### Kontext

GDrive-OAuth ist seit S12 implementiert, aber heute in Einstellungen → "Belege-Ablage" versteckt. Nicht in Verbindungen-Card, nicht im Pairing-Flow. Das widerspricht Design-Prinzip 4 (Konsistenz) — Clockify, Claude und Notion sind alle in der Verbindungen-Card, GDrive nicht.

Provider-Selector aus Sprint 3 (BL-105) hat `AppState.providers.storage` eingeführt, aber nicht die UI-Konsolidierung vollzogen. Sprint 5 schliesst diese Lücke UND baut die beiden Kernfunktionen die Belege erst wirklich nutzbar machen: nachträgliches Anhängen + Retry-Queue.

Zusätzlich: L5 (GDrive OAuth nicht vollständig getestet) wird in diesem Sprint systematisch resolved.

### Items

| # | Titel | Scope |
|---|---|---|
| BUG-041 | GDrive in Verbindungen-Karte | GDrive als 4. Provider in der Verbindungen-Card von `renderEinstellungen()` |
| BL-072 | Beleg nachträglich anhängen | UI + Logik um einen Beleg an eine bestehende Buchung zu hängen |
| BL-073 | GDrive OAuth in Pairing-Flow | GDrive-Tile in Onboarding Phase C (Verbindungen) |
| BL-074-Item | Beleg-Upload Retry-Queue | Queue-Pattern analog Notion-Writes auf GDrive-Uploads anwenden |
| L5 | GDrive OAuth Testing | Systematische Tests: fresh setup, re-auth, revoked token, offline, etc. |

### Reihenfolge (bindend)

1. **BUG-041** zuerst — eigenständig, 20-30 min. Stellt sicher dass der State korrekt angezeigt wird bevor weitere Features gebaut werden.
2. **BL-073** — baut auf Provider-Selector (Sprint 3) auf, ist parallel zu BL-074-Item bearbeitbar.
3. **BL-072** — neues Feature-Territory, eigenständig.
4. **BL-074-Item** — erweitert Queue-System.
5. **L5** — systematisches Testing am Schluss.

### Item-Details

#### BUG-041: GDrive in Verbindungen-Karte

**Code-Referenz:** `renderEinstellungen()`, Zeile 10679 ff.

**Status heute (verifiziert):**
- Verbindungen-Card zeigt: Notion, Clockify, Claude AI
- GDrive ist in eigener Section "Belege-Ablage" (Zeile ~10837 `<!-- BL-029: Belege-Ablage -->`)

**Soll-Zustand:**
- Verbindungen-Card zeigt: Notion, Clockify/Toggl (abhängig von `AppState.providers.time`), Claude/OpenAI (abhängig von `AppState.providers.vision`), **GDrive**
- Status-Check: `GDriveAdapter.isConnected()` (Zeile ~3377, returned `!!loadLocal('fb_gdrive_parent', null)`)
- Action-Buttons: `[Verbinden]` wenn `!isConnected`, `[Öffnen]` + `[✕]` wenn connected

**Konsequenz für bestehende Belege-Ablage-Section:**
Entweder entfernen (verdoppelt Info) ODER umbauen zu "Ordner-Konfiguration"-Section (ohne Connect/Disconnect, nur Rename-Felder für Root/Business/Private/Income/Expenses). Empfehlung: umbauen. Connect-Logik ist in Verbindungen-Card, Konfiguration bleibt separat.

**i18n-Scope:**
- `t('settings.connections.gdrive.label')` = "Google Drive"
- `t('settings.connections.gdrive.status_connected')` = "Verbunden"
- `t('settings.connections.gdrive.status_disconnected')` = "Nicht verbunden"
- `t('settings.connections.gdrive.connect')` = "Verbinden"
- `t('settings.connections.gdrive.open')` = "Ordner öffnen"
- `t('settings.connections.gdrive.disconnect')` = "Trennen"
- `t('settings.folders.title')` = "Belege-Ordner" (neu für die umgebaute Section)

**A9-Hinweis:** Bevor du die Verbindungen-Card editierst, `view` auf Zeile 10679–10840 um die exakte Struktur zu verstehen. Bestehende Buttons (`changeClockifyKey`, `clearClockifyKey`, `syncClockify`) als Muster nutzen.

#### BL-073: GDrive im Pairing-Flow

**Code-Referenz:** Onboarding Phase C (Verbindungen), ab Zeile ~1574 `<!-- ── PHASE C: Verbindung ── -->`

**Status heute (verifiziert):**
- Onboarding hat Kacheln für Notion (Pflicht), Clockify/Toggl (optional via Provider-Selector), Claude/OpenAI (optional via Provider-Selector)
- GDrive ist NICHT in Onboarding → User findet Beleg-Funktion erst später, evtl. nie

**Soll-Zustand:**
- GDrive als 4. Kachel in Phase C, analog zu Claude/Clockify
- "Belege" ist im Provider-Selector (`PROVIDER_REGISTRY.storage`) bereits vorgesehen — es gibt heute NUR GDrive, aber das Muster ist offen für zukünftige Alternativen (Dropbox etc.)
- Tile-Titel: `t('onboarding.storage.title')` = "Belege"
- Tile-Label: `t('onboarding.storage.body')` = "KI liest Belege automatisch, deine Belege werden in deinem Google Drive abgelegt"
- Auswahl → `obSelectProvider('storage')` (bereits aus Sprint 3 da)
- Nach Auswahl: `settingsConnectGDrive()` ODER `Auth.startGDriveOAuth()` (den bestehenden OAuth-Flow triggern)

**Konsequenz:**
Wenn User GDrive im Onboarding verbindet, ist `AppState.providers.storage = 'gdrive'` gesetzt, Token im sessionStorage, Parent-Folder in localStorage. Beim ersten Beleg-Upload läuft alles direkt.

**i18n-Scope:**
- `t('onboarding.storage.title')` = "Belege"
- `t('onboarding.storage.body')` = "KI liest Belege, deine Belege in deinem Drive"
- `t('onboarding.storage.gdrive.name')` = "Google Drive"
- `t('onboarding.storage.gdrive.description')` = "Automatische Ablage in /FinanceBird"
- `t('onboarding.storage.skip')` = "Überspringen"

**Anti-Patterns (B4):**
- NICHT eigenen OAuth-Flow bauen — bestehenden `settingsConnectGDrive()` / `getGDriveToken()` nutzen (Zeile ~3491 ff.)
- NICHT Storage-Selektion hardcoden — `PROVIDER_REGISTRY.storage` iterieren

#### BL-072: Beleg nachträglich anhängen

**Code-Referenz:** `toggleBuchungDetail()` Zeile ~9498, Buchungsliste in `renderBuchSubtab()`, upload-Logik in `uploadToGDrive()` Zeile ~3629

**Status heute (verifiziert):**
- Buchungs-Detail-Overlay (expandierte Zeile) zeigt Details aber **kein Beleg-Feld** für Upload
- Bei Fehlschlag eines initialen Beleg-Uploads wird Toast "Buchung gespeichert, aber Beleg konnte nicht hochgeladen werden. Beleg später nachträglich anhängen." gezeigt (Zeile ~7214) — aber der "später nachträglich anhängen"-Workflow existiert nicht

**Soll-Zustand:**
Im Buchungs-Detail-Overlay (per `toggleBuchungDetail`) erscheint ein Block "Beleg":
- Falls bereits vorhanden (`booking.belegLink`): Link anzeigen + "Ersetzen"-Button
- Falls nicht: "📎 Beleg hinzufügen"-Button → öffnet Upload-Dialog (gleicher Mechanismus wie `erfTriggerUploadBeleg`)
- Nach Upload: GDrive-Upload + `updateBooking(id, { belegLink })` + Toast "Beleg angehängt"
- Fehler: Toast mit "Erneut versuchen" (→ BL-074-Item Queue)

**Data-Model:**
Buchung hat bereits `belegLink`-Feld (aus `bookingToProps` / `parseBuchung` — bitte `grep` verifizieren). Falls nicht vorhanden: `ensureBuchungenSchema()` ergänzen.

**Property in Notion:** `Beleg-Link` (URL oder Rich Text — je nach Ist-Zustand verifizieren).

**Neue Funktion:**
```js
async function attachReceiptToBooking(bookingId, file) {
  // 1. Upload to GDrive (uploadToGDrive + Kontext: Buchungs-Bereich/Typ)
  // 2. Update booking mit belegLink
  // 3. Bei Fehler: Queue-Eintrag (→ BL-074-Item)
}
```

**i18n-Scope:**
- `t('booking.detail.receipt.label')` = "Beleg"
- `t('booking.detail.receipt.add')` = "📎 Beleg hinzufügen"
- `t('booking.detail.receipt.replace')` = "Ersetzen"
- `t('booking.detail.receipt.view')` = "Ansehen"
- `t('booking.detail.receipt.attaching')` = "Beleg wird hochgeladen…"
- `t('booking.detail.receipt.attached')` = "Beleg angehängt"
- `t('booking.detail.receipt.error')` = "Hochladen fehlgeschlagen — erneut versuchen?"

**Abhängigkeit zu BL-074-Item:** BL-072 ohne Retry-Queue ist unvollständig (bei Fehler gibt's keinen Weg zurück). Daher: BL-072 implementieren, dann BL-074-Item direkt anschliessen.

#### BL-074-Item: Beleg-Upload Retry-Queue

**Code-Referenz:** Queue-System Zeile ~5096 (`queueAdd`, `queueRemove`, `queueSetStatus`, `flushQueue`). Heute nur für Notion-Writes.

**Status heute (verifiziert):**
- `NotionAdapter.flushQueue` Zeile ~4609 — iteriert Queue-Einträge, ruft `update`/`create`/`archive` auf
- Queue-Einträge haben `{ op, dbId/pageId, props, meta, status }` — keine GDrive-spezifischen Felder
- Fehlgeschlagene GDrive-Uploads landen heute nur im Toast, nicht in der Queue → dauerhaft verloren nach Tab-Close

**Soll-Zustand:**
- Queue erweitern um Typ `op: 'upload_receipt'`
- Entry: `{ op: 'upload_receipt', bookingId, fileBlob (als base64 oder IndexedDB-ref), filename, meta: { bereich, type }, status }`
- `flushQueue` erkennt `op === 'upload_receipt'` und ruft `GDriveAdapter.uploadReceipt` + `updateBooking(bookingId, { belegLink })`
- Bei Success: `queueRemove`
- Bei Error: `queueSetStatus(id, 'error', msg)` — Retry bei nächstem Flush

**Technische Entscheidung: Wo liegt das File-Blob?**

Option A: localStorage als base64 — funktioniert bei kleinen Belegen (<2MB), platzt bei PDFs >5MB
Option B: IndexedDB — skaliert, mehr Code
Option C: sessionStorage only — verloren nach Tab-Close

**Empfehlung: Option A mit Limit.** Ein typischer Beleg-Scan ist 200-800KB JPG oder 1-3MB PDF. Limit auf 3MB pro Queue-Entry, max 5 gleichzeitig offen, sonst alter Entry wird entfernt und User informiert. Das ist ein pragmatischer Kompromiss — der User verliert nicht still Daten, bekommt aber im Extremfall einen Hinweis.

Alternative: Wir entscheiden in einer 15-min-Strategie-Rückfrage, aber ich empfehle **Option A** für V1.

**Queue-Banner:**
`updateQueueBanner()` (Zeile ~5225) um Beleg-Uploads erweitern: "X Einträge warten, davon Y Belege".

**i18n-Scope:**
- `t('queue.banner.items_pending')` = "{count} Einträge warten"
- `t('queue.banner.receipts_pending')` = "{count} Belege warten"
- `t('queue.item.upload_receipt')` = "Beleg hochladen"
- `t('queue.error.retry')` = "Erneut versuchen"

#### L5: GDrive OAuth Testing

Keine Code-Änderung, aber Test-Runs dokumentieren:

**Test-Matrix:**

| Szenario | Erwartung | Ergebnis |
|---|---|---|
| Fresh Install, GDrive in Onboarding verbinden | Token + Parent-Folder + Unterordner erstellt | ☐ |
| Bereits verbunden, App-Neustart | Token aus sessionStorage geladen, wenn leer: popup | ☐ |
| Token expired (nach 1h Inaktivität) | Auto-refresh oder re-auth-Popup | ☐ |
| User widerruft Zugriff in Google-Konto-Einstellungen | 401 bei Upload → Toast + Reconnect-Option | ☐ |
| Offline → Beleg-Upload | Queue (→ BL-074-Item) → Flush bei Online | ☐ |
| Falsches Google-Konto ausgewählt | User kann zurück und neu verbinden | ☐ |
| Ordner manuell in Drive gelöscht | Auto-Recreate beim nächsten Upload | ☐ |
| Ordner manuell umbenannt in Drive | Parent-ID aus localStorage noch gültig → Upload funktioniert trotzdem | ☐ |

Jedes gefundene Issue = neuer BUG-Eintrag. Nach Test-Durchlauf: L5 in MASTER.md als ✅ markieren oder in offene Bugs überführen.

### Validierung Sprint 5

- [ ] `grep 'fb_gdrive_parent' financebird_v2.html` — alle Callsites verifiziert
- [ ] `grep 'belegLink' financebird_v2.html` — Konsistenz in Store, Adapter, UI
- [ ] Verbindungen-Card zeigt GDrive mit korrektem Status
- [ ] Onboarding Phase C hat 4. Kachel für Belege
- [ ] Buchungs-Detail hat Beleg-Block
- [ ] Queue-Banner zählt Belege separat
- [ ] node --check passt
- [ ] L5 Test-Matrix durchlaufen

### Deployed Version nach Sprint 5

Ziel: `v2.25a.2026-XX-XX`

---

## Sprint 6 · i18n Fundament + Migration Variante B

### Kontext

Heute existiert `AppState.lang` + `setLang()` (Zeile ~12942), aber alle UI-Strings sind hardcoded Deutsch. Kein Translation-Objekt, keine `t()`-Funktion. Der Sprach-Selector in Einstellungen macht faktisch nichts ausser Toast + AppState-Flag.

Ziel nach Sprint 6: User wechselt in Einstellungen von DE auf EN → Navigation, Sidebar, Toasts, Fehlermeldungen, Onboarding sind komplett übersetzt. Widget-Labels, tiefe Hilfe-Texte, Rechnungen-Details folgen in späteren Sprints.

**Variante B-Scope:** Fundament + kritische Hot-Zones. Tiefen-Strings bleiben DE, werden in Sprints 7–9 strukturiert migriert.

**Strukturierter Migrations-Plan (Querschnitt ab Sprint 6):**
- **Sprint 6 (dieser):** Navigation, Sidebar, Toasts, Fehlermeldungen, Onboarding, Pairing, Repair-Screen
- **Sprint 7:** Zeiterfassung, Projekte-Tab (alle Strings des DS2-Scope)
- **Sprint 8:** GSheetsAdapter Onboarding + Setup + A13-DB-Warnung
- **Sprint 9:** Rechnungen, Widgets-Labels, Einstellungen-Detail, Hilfe-Texte

Ende Sprint 9 = App vollständig zweisprachig.

### Items

| # | Titel | Scope |
|---|---|---|
| BL-010 | i18n-System | `t()`-Funktion, Registry, Re-Render-Mechanismus |
| BL-097 | Englisch-Übersetzung | Alle Strings der Variante B-Hot-Zones als DE + EN |

### Item-Details

#### BL-010: i18n-System

**Architektur:**

```js
/* ══════════════════════════════════════════════════════
   I18N SYSTEM (Sprint 6, BL-010)
   ══════════════════════════════════════════════════════ */

const STRINGS = {
  de: {
    'app.offline':          'Offline',
    'app.connected':        'Verbunden',
    'app.error':            'Verbindungsfehler',
    'nav.cockpit':          'Cockpit',
    'nav.erfassen':         'Erfassen',
    'nav.buchungen':        'Buchungen',
    // ...
  },
  en: {
    'app.offline':          'Offline',
    'app.connected':        'Connected',
    'app.error':            'Connection error',
    'nav.cockpit':          'Cockpit',
    'nav.erfassen':         'Add',
    'nav.buchungen':        'Transactions',
    // ...
  }
};

/**
 * Translate a key to the current language.
 * Supports variable interpolation: t('queue.items_pending', { count: 3 })
 * Fallback chain: current lang → de → key itself
 */
function t(key, vars) {
  const lang = AppState.lang || 'de';
  const str = (STRINGS[lang] && STRINGS[lang][key])
           || (STRINGS.de && STRINGS.de[key])
           || key;
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? vars[k] : m);
}
```

**Re-Render bei Sprachwechsel:**

```js
function setLang(lang) {
  if (lang === AppState.lang) return;
  AppState.lang = lang;
  saveAppState();
  // Re-render all visible views
  renderAll();
  showToast('success', '✅', t('settings.lang.changed'), t('settings.lang.' + lang));
}
```

**`renderAll()`** existiert bereits und rendert alle Tabs. Wichtig: dynamische Texte in z.B. `innerHTML`-Strings müssen ebenfalls `t()` nutzen, sonst bleiben sie beim Sprachwechsel alt. `grep innerHTML` und systematisch migrieren.

**Performance:**
`t()` ist ein Hash-Lookup — kein Perf-Problem bei <1000 Keys. Keine Caches nötig.

**Persistierung:**
`AppState.lang` ist bereits in `saveAppState()` enthalten → nichts zu tun.

**i18n-Coverage-Helper (Developer-Tool):**

```js
// In Debug-Block
window.fbI18nAudit = function() {
  const deKeys = Object.keys(STRINGS.de);
  const enKeys = Object.keys(STRINGS.en);
  const missing = deKeys.filter(k => !STRINGS.en[k]);
  const orphans = enKeys.filter(k => !STRINGS.de[k]);
  console.table({ 'DE keys': deKeys.length, 'EN keys': enKeys.length, 'Missing EN': missing.length, 'Orphan EN': orphans.length });
  if (missing.length) console.warn('Missing EN translations:', missing);
  if (orphans.length) console.warn('Orphan EN keys:', orphans);
};
```

Nützlich für Session-Ende-Check in Sprint 7/8/9.

#### BL-097: Englisch-Übersetzung (Variante B-Scope)

**Scope (hart abgegrenzt):**

| Bereich | Strings ca. | Beispiele |
|---|---|---|
| **Navigation** (Tabs, Subtabs) | ~15 | Cockpit, Erfassen, Buchungen, Rechnungen, Einstellungen |
| **Sidebar** | ~20 | Projekte, Buchhaltung, Hilfe, Feedback, Abmelden, Sync |
| **Toasts** (Success / Error / Info) | ~50 | "Gespeichert", "Fehler beim Sync", "Verbindung wiederhergestellt" |
| **Fehlermeldungen** (technisch) | ~30 | "Notion Rate Limit", "Lizenz abgelaufen", "Kein Puffer-Konto" |
| **Onboarding** (Screens Welcome → Overview) | ~80 | Welcome-Text, Screen-Titel, Button-Labels, Hilfe-Texte |
| **Pairing** (Phase B) | ~15 | "Code eingeben", "Verbinden", "Code läuft in X ab" |
| **Repair** (Phase C) | ~10 | "Verbindung wiederherstellen", "Notion verbinden" |
| **Healing** (Sprint 4 Healing-Pathways) | ~15 | "Key eingeben", "Notion-Daten neu laden" |
| **Feedback-Form** (Sprint 4) | ~15 | "Typ wählen", "Bug", "Feature", "Frage" |

**Ungefähr 250 Strings in DE + EN.**

**Aus dem Scope ausgeschlossen (Sprint 7–9):**
- Widget-Titel und Detail-Overlays → Sprint 9 (BL-088, BL-090)
- Einstellungen-Detail (Kategorien-Editor, Merchant-Rules-Editor, Profil) → Sprint 9
- Recurring-UX Strings → Sprint 7 (DS3)
- Zeiterfassung / Projekte-Tab → Sprint 7 (DS2)
- Rechnungen-Detail (Position-Editor, Versand-Flow) → Sprint 9
- Hilfe-Text-Overlays (`helpBtn` Popups) → Sprint 9
- GSheetsAdapter Strings → Sprint 8

### Workflow der Migration

1. **Registry-Gerüst:** `STRINGS.de` und `STRINGS.en` Objekte mit leerem Inhalt anlegen, `t()`-Funktion dazu.
2. **Bereich für Bereich durchgehen:** Navigation zuerst (kleinster), dann Sidebar, Toasts, Fehler, Onboarding, Pairing, Repair, Healing, Feedback.
3. **Pro Bereich:** `grep` auf Bereich-spezifische Funktion (z.B. Navigation = `renderNav` / `nav(`), alle hardcoded Strings → `t(key)` + Eintrag in beide Objekte.
4. **Nach jedem Bereich:** `fbI18nAudit()` ausführen, Missing-Translations fixen.
5. **Akzeptanztest:** Sprach-Selector in Einstellungen auf EN → Navigation bis Onboarding durchklicken → keine deutschen Strings mehr sichtbar. Zurück auf DE → alles DE.

**Bereits in Code verwendete `t()`-Aufrufe (verifiziert):**

```
Zeile 69:  t('app.offline')
Zeile 14069: t('app.error')
Zeile 14080: t('app.offline')
Zeile 14080: t('app.connected')
```

Das heisst: Eine **primitive Version** von `t()` existiert bereits, oder die Calls verweisen auf etwas das fehlschlägt (→ Key wird als Fallback angezeigt). **`grep 't('` ausführen, prüfen ob `t()` definiert ist.** Falls nein: jetzt sauber einführen, falls ja: erweitern ohne Signatur zu brechen.

### Anti-Patterns (B4)

- **NICHT** Strings in HTML hart lassen und "nachher übersetzen" — das führt zu Tote-Strings die nie jemand fängt. **Immer `t()` benutzen, auch wenn EN-Übersetzung leer ist**. Mindestens `STRINGS.en[key] = ''` → Audit findet Leere.
- **NICHT** grep-basierte "find and replace"-Orgien — Context-Check, nicht jeder Literal-String ist ein UI-String (Fehler-Logs, JSON-Keys etc. bleiben).
- **NICHT** Default-lang fest auf DE coden in `t()` — schon vorbereiten für Fall "wenn User lang=fr setzt, aber FR gibt's noch nicht → fallback DE".
- **NICHT** bestehende Keys ändern nach Einführung — konsistent halten von Anfang an.

### Validierung Sprint 6

- [ ] `t()`-Funktion definiert und funktioniert
- [ ] `STRINGS.de` und `STRINGS.en` haben alle Variante-B-Keys
- [ ] `fbI18nAudit()` zeigt 0 Missing
- [ ] Sprachwechsel in Einstellungen triggert sofortige Re-Render
- [ ] Keine hardcoded deutschen Strings in: Nav, Sidebar, Toast-Aufrufen, Fehlermeldungen, Onboarding (manuell verifiziert)
- [ ] Alle seit Sprint 5 eingeführten Strings (GDrive-Verbindung, Beleg-Attach, Queue-Erweiterung, A13) haben bereits `t()`-Aufrufe
- [ ] `grep 'showToast.*\"' financebird_v2.html | wc -l` — sollte 0 sein (alle Toasts nutzen `t()`)

### Deployed Version nach Sprint 6

Ziel: `v2.26a.2026-XX-XX`

---

## Sprint 7 · BLOCKIERT

Sprint 7 ist blockiert, weil die zugrundeliegenden Design-Sessions noch nicht durchgeführt wurden:

| DS | Thema | Chat | Erwartung |
|---|---|---|---|
| DS2 | Zeiterfassung + Projekte-Tab | Strategie | Architektur + Daten-Model für Zeit-Tracking UX |
| DS3 | Recurring-UX im Erfassen-Flow | VI & UX | Visuelle/interaktive Gestaltung Recurring-Dialog |

**Für App-Coding bedeutet das:** Sprint 7 in der aktuellen Sprint-Reihenfolge **überspringen**, direkt nach Sprint 6 mit Sprint 8 weitermachen. Sprint 7-Briefing folgt, sobald Strategie-Chat (DS2) und VI-Chat (DS3) ihre Sessions abgeschlossen haben.

**Was auf Strategie-Seite parallel passiert:**
- DS2-Session in diesem Chat (FB · Strategie & Architektur) wird als eigene Session geplant
- DS3-Session im VI & UX-Chat wird dort initiiert
- BL-101 Workspace-Mockup-Session läuft ebenfalls parallel (unabhängig)

**Nicht warten — weiter mit Sprint 8.**

---

## Sprint 8 · Google Sheets Adapter + A13-Nachrüstung

### Kontext

Heute ist Notion der einzige Daten-Backend. BL-098 fügt Google Sheets als Alternative hinzu — User ohne Notion-Account können mit ihrem eigenen Google Sheet als Datenbank arbeiten. Provider-Selector (Sprint 3) ist bereits vorbereitet (`AppState.providers.data`, `PROVIDER_REGISTRY.data`).

Parallel wird in Sprint 8 die neue Architektur-Regel **A13** umgesetzt:
- GSheetsAdapter ist von Anfang an A13-konform (Hinweis-Banner in jedem Sheet)
- NotionAdapter wird nachgerüstet (Hinweis in jeder DB-Description)

### Items

| # | Titel | Scope |
|---|---|---|
| BL-098 | Google Sheets als zweiter DB-Adapter | `GSheetsAdapter` implementiert `DataLayerInterface` vollständig |
| A13 Notion-Nachrüstung | NotionAdapter A13-Hinweis | Beim `ensureSchema()` wird Description mit Warning geschrieben |
| A13 Sheets | GSheetsAdapter A13-Hinweis | Frozen-Row-Banner in jedem Sheet |

### GSheetsAdapter Design

**Architektur:**

```
GSheetsAdapter (implements DataLayerInterface)
  ├── OAuth (Google Sheets API v4 + Drive API v3)
  ├── Spreadsheet-Setup (creates spreadsheet with 7 sheets)
  ├── Sheet-Tabs:
  │     Buchungen, Rechnungen, Transfers, Projekte, Konten, Recurrings, Einstellungen
  ├── ensureSchema (column creation per sheet + A13 banner)
  ├── CRUD (getBookings, createBooking, etc.)
  ├── Delta-Sync (via Drive file.modifiedTime)
  └── Queue-Integration (flushQueue with Sheets-API rate limits)
```

**OAuth-Scopes:**
- `https://www.googleapis.com/auth/spreadsheets` (read/write own sheets)
- `https://www.googleapis.com/auth/drive.metadata.readonly` (für file.modifiedTime)

**Analogie zu GDrive-OAuth:**
`GDRIVE_CLIENT_ID` existiert bereits (Zeile ~3465). Neues Scope hinzufügen oder zweiter Client? — Empfehlung: **gleicher Client**, Scopes erweitern. User autorisiert einmal.

**Setup-Flow beim ersten Verbinden:**
1. OAuth-Token holen
2. Neues Spreadsheet erstellen: `FinanceBird Daten [<User-Name>]`
3. 7 Sheets anlegen (Default-Sheet "Sheet1" umbenennen zu "Buchungen", andere `sheets.create`)
4. Pro Sheet:
   - Spalten-Header (frozen Row 2)
   - A13 Banner (frozen Row 1, merged, auffällige Farbe)
   - Formatierung: Datum-Spalten, Währungs-Spalten
5. Spreadsheet-ID in localStorage + Notion-Einstellungen (falls Notion parallel)

**Schema per Sheet (Spalten):**

```
Buchungen:
  [Datum, Beschreibung, Gegenpartei, Typ, Bereich, Kategorie,
   Steuerkategorie, Konto, Betrag, Bezahlt, Rechnungs-Ref,
   Projekt, Notiz, MwSt, Kategorie-Status, Teilabzug, Korrektur,
   Beleg-Link, Internal-ID, Created, Updated]

Rechnungen:
  [Rechnungs-Nr, Beschreibung, Betrag, Datum, Fällig, Bezahlt am,
   Kunde, MwSt, Status, Konto, Typ, Steuerkategorie, Projekt,
   Notiz, Bereits erhalten, Buchungs-Ref, Internal-ID, Created, Updated]

(... analog für andere 5 Sheets ...)

Settings-KV:
  [Key, Value, Updated]
```

**Interner Identifier:**
Spalte `Internal-ID` (UUID, vom App generiert) — anders als Notion, wo Page-IDs Backend-generiert sind. Vorteil: App kann Objekte referenzieren bevor sie geschrieben wurden (wichtig für Queue).

**CRUD-Operations:**

`getBookings()`:
- Lese ganzes Sheet: `sheets.values.get` → Range `Buchungen!A3:Z` (ab Zeile 3, da Row 1 = A13 Banner, Row 2 = Header)
- Parse-Funktion: Row-Array → Buchung-Objekt (Typ-Coercion: Datum, Number, Boolean)

`createBooking(data)`:
- Generiere Internal-ID (UUID)
- `sheets.values.append` → new Row
- Return Internal-ID

`updateBooking(id, data)`:
- Finde Row-Index per Internal-ID (Read, match, calc index) — **teuer** bei grossen Sheets
- Optimierung: Internal-ID → Row-Index Cache (localStorage), invalidiert bei Sync
- `sheets.values.update` auf Range `Buchungen!A<rowIndex>:Z<rowIndex>`

`deleteBooking(id)`:
- Soft-Delete: Row markieren mit `Archived` column (neue Spalte einführen oder Status-Cell auf "archived" setzen)
- Hard-Delete wäre `sheets.batchUpdate` mit `deleteDimension` — unterstützt nicht Idempotenz

### Delta-Sync via file.modifiedTime

**Mechanismus:**

```js
GSheetsAdapter.syncDelta = async function() {
  const spreadsheetId = loadLocal('fb_gsheets_id', null);
  if (!spreadsheetId) return;

  // 1. Check modifiedTime of the file
  const driveMeta = await gdriveApi(`/files/${spreadsheetId}?fields=modifiedTime`);
  const lastSync = loadLocal('fb_gsheets_last_sync', null);

  if (lastSync && driveMeta.modifiedTime <= lastSync) {
    // No changes since last sync → skip
    return { skipped: true };
  }

  // 2. Full re-read of all sheets
  const all = await fullReadAllSheets();
  Store.buchungen = all.buchungen;
  Store.rechnungen = all.rechnungen;
  // ...
  saveLocal('fb_gsheets_last_sync', driveMeta.modifiedTime);
  return { skipped: false, itemsRead: all._total };
};
```

**Vorteile:**
- Google pflegt `modifiedTime` automatisch, auch bei Direkt-Edits in Sheets UI
- Kein eigenes "LastModified"-Feld → keine Source-of-Truth-Konflikte
- In 80%+ der Sync-Triggers passiert nichts (skipped: true), kein Traffic

**Nachteil:**
- Wenn doch was geändert: Full-Re-Read. Bei <2000 Rows total (realistisch für Einzelfirma) unter 3 Sekunden.

### Monitoring (in die Sync-Logik einbauen)

Nach jedem vollen Re-Read:

```js
const syncStats = loadLocal('fb_sync_stats', []);
syncStats.push({
  backend: 'gsheets',
  timestamp: Date.now(),
  durationMs: Date.now() - startTime,
  rowCount: all._total,
  bookings: all.buchungen.length,
  invoices: all.rechnungen.length,
});
if (syncStats.length > 20) syncStats.shift(); // Rolling window
saveLocal('fb_sync_stats', syncStats);
```

**Health-Check Integration (Sprint 4-System erweitern):**
- Wenn median `durationMs > 10000` (>10s) → Health-Issue "sync_slow"
- Wenn letztes `rowCount > 2000` → Health-Issue "sync_large"
- Beide sind soft-Warnings, keine Blocker → User bekommt Hinweis, kann Feedback schicken

**Im Feedback-Report (Sprint 4):**
`submitFeedback()` → `getErrorLog()` erweitern um `loadLocal('fb_sync_stats')` anzuhängen. So sehen wir in Notion-Feedback-DB direkt, ob Tester Sync-Probleme haben.

### A13 Umsetzung

**GSheetsAdapter (von Anfang an):**

Beim ersten Setup UND bei jedem `ensureSchema()`-Aufruf:

```js
GSheetsAdapter.ensureSchema = async function() {
  const sheets = ['Buchungen','Rechnungen','Transfers','Projekte','Konten','Recurrings','Einstellungen'];
  for (const sheetName of sheets) {
    await ensureA13Banner(sheetName);
    await ensureColumns(sheetName);
  }
};

async function ensureA13Banner(sheetName) {
  // 1. Read A1 to check if banner is already set
  const a1 = await sheets.values.get({range: `${sheetName}!A1:Z1`});
  const firstCell = a1.values?.[0]?.[0] || '';
  if (firstCell.startsWith('[FB-MANAGED]')) return; // idempotent

  // 2. Write banner
  const bannerText = '[FB-MANAGED] ' + t('db.warning.title') + ' — ' + t('db.warning.body');
  await sheets.values.update({
    range: `${sheetName}!A1`,
    values: [[bannerText]]
  });

  // 3. Merge A1:Z1 + format (yellow bg, bold, centered)
  await sheets.batchUpdate({
    requests: [
      { mergeCells: { range: {sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 26}, mergeType: 'MERGE_ALL' } },
      { repeatCell: { range: {sheetId, startRowIndex: 0, endRowIndex: 1}, cell: { userEnteredFormat: { backgroundColor: {red:0.996, green:0.953, blue:0.780}, textFormat: {bold:true}, horizontalAlignment: 'CENTER' } }, fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)' } },
      { updateSheetProperties: { properties: {sheetId, gridProperties:{frozenRowCount:2}}, fields: 'gridProperties.frozenRowCount' } }
    ]
  });
}
```

**NotionAdapter-Nachrüstung:**

```js
NotionAdapter.ensureSchema = async function() {
  // bestehend
  await ensureBuchungenSchema();
  await ensureRechnungenSchema();
  // ... weitere existierende Schema-Funktionen

  // NEU (Sprint 8): A13
  await ensureA13Notices();
};

async function ensureA13Notices() {
  const dbs = [
    loadLocal('fb_db_buchungen_id', null),
    loadLocal('fb_db_rechnungen_id', null),
    loadLocal('fb_db_transfers_id', null),
    loadLocal('fb_db_projekte_id', null),
    loadLocal('fb_db_konten_id', null),
    loadLocal('fb_db_recurrings_id', null),
    loadLocal('fb_db_einstellungen_id', null),
  ].filter(Boolean);

  for (const dbId of dbs) {
    const db = await notionFetch(`/databases/${dbId}`);
    const currentDesc = db.description?.map(t => t.plain_text).join('') || '';
    if (currentDesc.startsWith('[FB-MANAGED]')) continue; // idempotent

    const newDesc = '[FB-MANAGED] ' + t('db.warning.title') + ' — ' + t('db.warning.body');
    await notionFetch(`/databases/${dbId}`, 'PATCH', {
      description: [{ type: 'text', text: { content: newDesc } }]
    });
  }
}
```

**Wichtig:** Prüfe die Notion API für Database.description — eventuell ist der korrekte Endpoint `/data_sources/` (Notion API 2022-06-28+). Siehe MASTER.md Schema-Management-Abschnitt und `app-coding_kontext.md` Data-Source-IDs.

### i18n-Scope Sprint 8

- `t('db.warning.title')` = "Nicht direkt editieren"
- `t('db.warning.body')` = "Alle Änderungen über FinanceBird. Direkte Änderungen können zu Fehlern oder Datenverlust führen."
- `t('onboarding.data.gsheets.title')` = "Google Sheets"
- `t('onboarding.data.gsheets.body')` = "Daten in deinem Google Sheet, mit deinen Zugriffsrechten"
- `t('onboarding.data.notion.title')` = "Notion"
- `t('onboarding.data.notion.body')` = "Alle Daten in deinem Notion Workspace"
- `t('settings.data.source')` = "Datenquelle"
- `t('settings.data.switch_warning')` = "Wechsel übernimmt keine Daten — beide Quellen bleiben separat."
- `t('sync.stats.slow')` = "Sync dauert ungewöhnlich lange"
- `t('sync.stats.large')` = "Grosse Datenmenge — überlege nach Jahresabschluss ein Archiv"
- `t('sync.skipped')` = "Keine Änderungen"

### Architektur-Entscheidungen Sprint 8

| Thema | Entscheid |
|---|---|
| Delta-Sync V1 | Full-Re-Read gated durch `file.modifiedTime` |
| Schema-Management | Auto-create, wie Notion (A13-konform) |
| Soft-Delete | Ja — neue Spalte `Archived: true/false` pro Sheet |
| Internal-ID | UUID, App-generiert |
| Monitoring | Sync-Duration + Row-Count in localStorage, im Feedback-Report |
| A13 | Frozen Row 1 Banner mit Marker `[FB-MANAGED]` |

### Bekannte Risiken Sprint 8

1. **Rate Limits:** Google Sheets API erlaubt 300 read/min, 60 write/min per user. Bei Bulk-Operationen (fullSync beim ersten Verbinden) gefährdet. **Mitigation:** Batch-Writes (`sheets.values.batchUpdate`), Exponential Backoff.
2. **CORS:** Google APIs haben CORS erlaubt für origins, aber Worker A könnte trotzdem proxyen für Uniformität und um Tokens nicht im Browser zu haben. **Entscheidung:** Worker A proxyed auch Sheets-Calls (analog zu Notion).
3. **User-Verwirrung beim Wechsel:** User verbindet Notion → später Google Sheets → Daten sind NICHT synchronisiert. **Mitigation:** Klare Einstellungen-UI: "Datenquelle wechseln: Deine bestehenden Daten bleiben in Notion. Neues Sheet ist leer." + `t('settings.data.switch_warning')`.
4. **Spreadsheet-Identity:** Wenn User das Spreadsheet in Drive löscht und neu macht, verliert App die ID. **Mitigation:** Beim Start `file.get` → 404 = Spreadsheet-verloren, Health-Issue "gsheets_missing" → Healing-Flow.

### Validierung Sprint 8

- [ ] `GSheetsAdapter` implementiert alle DataLayerInterface-Methoden
- [ ] Spreadsheet wird beim ersten Verbinden sauber erstellt (7 Sheets, Banner, Header, Freeze)
- [ ] CRUD-Roundtrip pro Entity funktioniert (Buchung anlegen → Sheet zeigt Row → getBookings liefert zurück)
- [ ] `syncDelta` skippt wenn `modifiedTime` unverändert
- [ ] `syncDelta` macht Full-Re-Read wenn `modifiedTime` neuer ist
- [ ] A13-Banner wird in jedem Sheet gesetzt, Idempotenz geprüft
- [ ] NotionAdapter A13-Nachrüstung funktioniert (Description gesetzt, Idempotenz geprüft)
- [ ] Anti-Pattern-Check: Keine direkten `fetch`-Calls an googleapis.com ausserhalb des Adapters (A8)
- [ ] Provider-Switch in Einstellungen: Notion ↔ GSheets, Daten-Stores werden korrekt resetted
- [ ] Sync-Stats werden geschrieben und im Feedback-Report mitgegeben
- [ ] `fbI18nAudit()` zeigt 0 Missing für Sprint 8-Strings

### Deployed Version nach Sprint 8

Ziel: `v2.28a.2026-XX-XX` (Sprint 7 übersprungen, Lücke 2.27 reserviert für DS2-DS3-Implementation)

---

## Sprint 9 · UX + Quick Fixes

### Kontext

Sammelsurium von 9 Items, alle klein und unabhängig. Abschluss der Phase 0.5 (Test + Improve). Nach Sprint 9 ist die App in einem Zustand, in dem sie zur Phase-1-Testing-Runde (5–10 externe Tester) freigegeben werden kann.

### Items

| # | Titel | Kategorie |
|---|---|---|
| BL-103 | Sync-Status ins Sidebar | UI-Refactor |
| BUG-040 | Erste Schritte Cards (Variante B) | Onboarding-UX |
| BL-090 | Widget-Links kuratieren | Content-Arbeit |
| BL-088 | Vermögens-Widget: Aktuell \| Verlauf Toggle | Feature |
| BUG-043 | "Code abgelaufen" sichtbarer | UI-Fix |
| BUG-044 | "Neuen Code generieren" prominenter | UI-Fix |
| BUG-048 | `doneQrCode` Element fehlt | Bug-Fix |
| BUG-069 | 3 direkte fetch-Aufrufe an api.frankfurter.app | Architektur-Regel A8 Fix |
| L1 | Collaborators nur in localStorage | Persistierung |
| L3 | Account-Duplikat-Check | Validierung |

### Reihenfolge-Vorschlag

1. Quick-Bugfixes zuerst: BUG-048, BUG-069, BUG-043, BUG-044
2. Persistierungs-Fixes: L1, L3
3. Refactor: BL-103
4. Feature: BL-088
5. Onboarding: BUG-040
6. Content: BL-090 (braucht Deep-Research-Dokument von Osi — siehe unten)

### Item-Details

#### BUG-048: `doneQrCode` Element fehlt

**Symptom:** JS referenziert `document.getElementById('doneQrCode')`, Element ist nicht im HTML. `null.src` oder ähnliche Fehler.

**Fix:** Entweder HTML-Element ergänzen (falls QR-Code auf Done-Screen gezeigt werden soll) ODER JS-Referenz entfernen (falls tot).

**Investigation:** `grep 'doneQrCode' financebird_v2.html` — wo wird es gesetzt, was ist die Intention?

#### BUG-069: 3 direkte fetch-Aufrufe an api.frankfurter.app (A8-Verletzung)

**Symptom:** FX-Konvertierung für Fremdwährungs-Belege ruft direkt `https://api.frankfurter.app/latest` auf. Verletzt A8 (Kein Provider-Call ausserhalb Adapter).

**Fix-Optionen:**

**Option A:** Neuen Adapter `FxAdapter` einführen, implementiert `FxInterface.getRates(base, symbols)`. Einzige konkrete Implementation: `FrankfurterAdapter`.

**Option B:** FX-Calls in Worker A proxyen. Vorteil: kein CORS-Problem auch für andere APIs zukünftig, einheitliche Error-Handling.

**Empfehlung:** Option A für jetzt (kleinster Eingriff), Option B wenn weitere FX-Provider (z.B. ECB, OANDA) hinzukommen.

```js
const FxInterface = {
  async getRates(base, symbols) { throw new Error('Not implemented'); }
};
const FrankfurterAdapter = Object.create(FxInterface);
FrankfurterAdapter.getRates = async function(base, symbols) {
  // existing fetch to api.frankfurter.app, aber zentralisiert
};
```

Alle 3 callsites ersetzen durch `FrankfurterAdapter.getRates(...)`.

#### BUG-043 + BUG-044: Code-Ablauf-Sichtbarkeit

**Symptom:** Im Pairing-Flow läuft der Code nach 10 Min ab. User merkt es zu spät. "Neuen Code generieren" ist dezent.

**Fix:**
- Countdown prominenter: grosse Zahl, Farbwechsel ab <2 Min (grün → orange → rot)
- Bei abgelaufenem Code: Screen wechselt visuell deutlich, Hauptbutton wird "Neuen Code generieren", nicht mehr "Verbinden"

**Code-Referenz:** `_pairingCountdownInterval` (Zeile ~12222), Pairing-Screen ab Zeile ~1810.

**i18n-Scope:**
- `t('pairing.code.expires_in')` = "Läuft in {time} ab"
- `t('pairing.code.expired')` = "⚠ Code abgelaufen"
- `t('pairing.code.regenerate')` = "Neuen Code generieren"

#### L1: Collaborators nur in localStorage

**Symptom:** Treuhänder/Buchhalter-Einträge sind nur auf einem Gerät verfügbar. Wechsel Laptop/Handy verliert alle Einträge.

**Fix:**
- Neue Settings-Key in Notion: `fb_collaborators` (JSON-encoded)
- `loadCollaborators()` / `saveCollaborators()` nutzen `saveSetting` / `loadSetting` (DataLayerInterface-Methoden)
- Bei jedem Save: sowohl localStorage (für Offline) als auch Notion
- Bei Start: Notion-Load → localStorage überschreiben

**Code-Referenz:** `loadCollaborators()` / `saveCollaborators()` Zeile ~13540.

#### L3: Account-Duplikat-Check

**Symptom:** User kann zwei Konten mit exakt gleichem Namen anlegen. Beim Zuordnen später unklar welches.

**Fix:**
- Vor `createKonto(data)`: Prüfe `Store.konten.find(k => k.name.toLowerCase() === data.name.toLowerCase())`
- Wenn Duplikat: Error mit `t('account.error.duplicate')` = "Ein Konto mit diesem Namen existiert bereits."

**Code-Referenz:** `createKonto`-Flow, Einstellungen → Konten-Editor.

#### BL-103: Sync-Status ins Sidebar

**Symptom heute:** Sync-Indicator ist in Header oben links (als kleines Icon/Status). Prominent, aber an einem Platz an dem er selten gebraucht wird.

**Soll:** In Sidebar verschieben, zwischen "Sync" und "Feedback" oder ganz unten. Im Header nur im Fehler-Fall (rot) sichtbar.

**Design-Entscheidung (kleine VI-Frage):** Dies ist eine Grenzfrage. Formal gehört es in den VI-Chat. Aber: Es ist primär funktional (Umplatzierung), nicht visuell. **Empfehlung:** App-Coding implementiert funktional, Fein-Styling später im VI-Chat (z.B. genaue Animation, Icons).

#### BL-088: Vermögens-Widget Toggle

**Aus Strategie-Session:** Heute hat das Widget nur Aktuell-Ansicht. Osi will:
- **Ansicht "Aktuell":** Balance aller Konten heute + Breakdown per Konto
- **Ansicht "Verlauf":** Trend der letzten 12 Monate, Line-Chart
- Toggle oben im Widget: "Aktuell | Verlauf"

**Technisch:**
- **Aktuell:** `totalWealth()` + `Store.konten` → bereits vorhanden
- **Verlauf:** Rückrechnung aus Buchungen + Transfers + monatlichem Snapshot (aus Notion-Setting `fb_wealth_snapshots`)
- Hybrid-Strategie: Wenn Snapshot für Monat X da ist → nimm Snapshot. Sonst: `estimatedBalance(konto, heute, tag)` per Konto rückwärts für 12 Monate.
- Computed-Funktion: `wealthOverTime(months=12)` → `[{month, label, total, byKonto: {name: balance}}]`

**UI:**
- Widget-Detail-Overlay zeigt Toggle + Chart (Recharts via Sprint 3 vorhanden oder inline SVG)
- Widget-Karte selbst bleibt "Aktuell"-Default, kein Toggle

**Wichtig:** Heute rein funktional. VI-Feinschliff (Farben, Animationen, Chart-Style) später im VI-Chat.

**i18n-Scope:**
- `t('widget.wealth.view.current')` = "Aktuell"
- `t('widget.wealth.view.history')` = "Verlauf"
- `t('widget.wealth.history.title')` = "Vermögen letzte 12 Monate"

#### BUG-040: Erste Schritte Cards (Variante B)

**Aus Strategie-Session S23:** "Erste Schritte" werden als Onboarding-Checkliste im Cockpit angezeigt (analog Inbox-Cards). Persistiert in Notion-Setting, localStorage als Fallback.

**Scope:**
- Neue Card-Component: "Erste Schritte" (4-6 Items)
- Items: "Notion verbinden ✓", "Erstes Konto anlegen", "Erste Buchung erfassen", "Beleg scannen", "Clockify verbinden", "Feedback geben"
- Jeder Item: Häkchen wenn erledigt, klickbar für Navigation
- Nach 100% erledigt: Card verschwindet (Notion-Setting `fb_erste_schritte_done = true`)
- Fallback localStorage: wenn kein Notion, `fb_erste_schritte_done` nur lokal

**Persistenz:**
- Je Item: `fb_es_<item_key>_done = true` in Notion + localStorage
- Sync bei Start + bei jeder Aktion

**Code-Referenz:** Cockpit-Widget-System, `WIDGETS[]`, `renderCockpit()`.

**i18n-Scope:**
- `t('erste_schritte.title')` = "Erste Schritte"
- `t('erste_schritte.items.connect_notion')` = "Notion verbinden"
- `t('erste_schritte.items.first_account')` = "Erstes Konto anlegen"
- `t('erste_schritte.items.first_booking')` = "Erste Buchung erfassen"
- `t('erste_schritte.items.first_receipt')` = "Beleg scannen"
- `t('erste_schritte.items.connect_time')` = "Zeit-Tracker verbinden"
- `t('erste_schritte.items.give_feedback')` = "Feedback geben"
- `t('erste_schritte.done')` = "Alle erledigt 🎉"

#### BL-090: Widget-Links kuratieren

**Aus Strategie-Session:** Aus einer früheren Deep-Research-Session gibt es für jedes Widget passende externe Ressourcen (Artikel, Rechner, Gesetzes-Texte). Diese sollen in den "Mehr erfahren"-Links der Widgets verlinkt werden.

**Blocker:** Das Deep-Research-Dokument muss App-Coding vorliegen.

**Aktion für Osi:**
- Deep-Research-Dokument lokalisieren (vermutlich in Desktop-Ordner, Google Drive, oder Notion)
- An das App-Coding-Projekt anhängen (neues File hochladen oder Link teilen)
- App-Coding kann dann Widget für Widget die `helpLink`-URL setzen

**Bis dahin:** BL-090 pausiert, blockt aber nichts anderes. App-Coding kann Sprint 9 ohne BL-090 abschliessen, BL-090 nachliefern wenn Dokument da ist.

**Code-Referenz:** `WIDGETS[]`-Array, jedes Widget-Object hat ein `helpLink`-Field (falls nicht, ergänzen).

**i18n-Scope:**
- `t('widget.learn_more')` = "Mehr erfahren"
- Einzelne Links: URL ist gleich DE/EN, nur Label-Text übersetzen falls nötig

### Validierung Sprint 9

- [ ] Alle Einzel-Items haben Unit-Validation (Node-Check + grep-Muster nach ihrem Scope)
- [ ] BUG-069 fix: `grep 'api.frankfurter.app' financebird_v2.html` — nur in `FrankfurterAdapter`, nirgends sonst
- [ ] Kollaboratoren überleben Browser-Wechsel (Notion-Persistenz verifiziert)
- [ ] Account-Duplikat blockt sauber
- [ ] Sync-Indicator nicht mehr im Header (ausser bei Error)
- [ ] Vermögens-Toggle funktional: Aktuell / Verlauf
- [ ] Erste-Schritte-Card im Cockpit zeigt Progress
- [ ] Pairing-Code-Sichtbarkeit merklich verbessert (Osi manuelles Review)
- [ ] `fbI18nAudit()` zeigt 0 Missing für Sprint 9-Strings

### Deployed Version nach Sprint 9

Ziel: `v2.29a.2026-XX-XX` (Phase 0.5 complete — bereit für Phase 1 Tester-Runde)

---

## Querschnitts-Themen (für alle Sprints)

### i18n-Querschnitt

Ab Sprint 6 gilt: **Neue Strings werden immer via `t()` eingeführt, mit Eintrag in DE + EN** (EN kann initial leer sein, `fbI18nAudit()` fängt das).

Für jeden Sprint ab 6 existiert in diesem Briefing ein Abschnitt "i18n-Scope" der die neuen Keys auflistet. App-Coding sollte bei Implementierung prüfen ob es darüber hinaus noch Strings gibt, die in den Hot-Zones liegen.

### A9 / A10 / A11 Hardening

Jede neue Funktion in Sprints 5–9 (neue Computed, neue Adapter-Methode, neue UI-Komponente):
- **A9** — Vorher `grep` + `view` auf abhängige Funktionen
- **A10** — Null-Cases zuerst implementieren
- **A11** — Empty-State-Test mental durchspielen

Speziell Sprint 8 (GSheetsAdapter) hat viele neue Funktionen → strikt einhalten.

### Bug-Register-Updates nach jedem Sprint

Nach jedem Sprint-Abschluss: MASTER.md updaten:
- Abgeschlossene Bugs/BLs von "Offen" nach "Abgeschlossen"
- "Nächster BUG/BL"-Pointer hochzählen
- Deployed Version aktualisieren
- Neue Bugs die während Implementierung gefunden wurden → als BUG-075, -076 etc. erfassen

### Archivierung (bei Sprint 9 Abschluss)

Nach Sprint 9 Deployment (Phase 0.5 complete):
- **Archivierung durchführen:** Abgeschlossene Bugs/BLs aus MASTER.md ins `entwicklungsarchiv.md` verschieben
- MASTER.md wird dadurch schlank, nur offene Themen bleiben
- Session-Index aktualisieren

---

## Validierungs-Checkliste (pro Sprint, bindend)

```bash
# Syntax
node --check /tmp/check.js

# Struktur
grep 'const _orig' financebird_v2.html
# → nur `_origConsoleError` ist legitim (Error-Buffer aus Sprint 4)

grep 'onclick.*JSON.stringify' financebird_v2.html
# → 0 Matches (A7)

# Adapter-Isolation (A8)
grep -E 'fetch\("https://api\.notion\.com|https://api\.openai\.com|https://www\.googleapis\.com/sheets|https://api\.frankfurter\.app|https://api\.clockify\.me|https://api\.track\.toggl\.com' financebird_v2.html
# → Resultate dürfen NUR innerhalb von *Adapter.*-Functions sein

# i18n-Coverage (ab Sprint 6)
# In Browser-Console: fbI18nAudit()
# → "Missing EN" sollte 0 sein für die jeweilige Sprint-Hot-Zone

# Pre-existing legitimate duplicates
# claimPairingCode, submitPairingCode, tick — NICHT anrühren
```

---

## Offene Strategie-Themen (für spätere Sessions)

Diese Themen sind während der Sprint-5–9-Planung aufgetaucht, sind aber **nicht Teil dieses Briefings**:

1. **DS2 — Zeiterfassung & Projekte-Tab** (Strategie-Chat, blockt Sprint 7)
2. **DS3 — Recurring-UX** (VI-Chat, blockt Sprint 7)
3. **BL-101 — Workspace-Mockup-Session** (Strategie-Chat, unabhängig)
4. **DS5 — Admin-Konsole + Buchhalter-Portal** (Strategie-Chat, nach Sprint 7)
5. **UX — "Unbekanntes Problem"-Fallback-Design** (VI-Chat, trivialer Fix nach BUG-074 Root-Cause)

---

## Abschliessend

Dieses Briefing deckt **4 von 5 offenen Sprints** (5, 6, 8, 9) plus **BUG-074 Hotfix** plus **A13 Architektur-Regel** ab. Sprint 7 folgt nach DS2+DS3.

App-Coding kann sequenziell arbeiten: BUG-074 → Sprint 5 → Sprint 6 → Sprint 8 → Sprint 9. Insgesamt sind das 4–6 App-Coding-Sessions (Sprint 8 ist gross und wird wahrscheinlich 2 Sessions brauchen).

Nach Sprint 9 ist FinanceBird in einem **Tester-Ready-Zustand** für Phase 1.

Bei Fragen zu Architektur-Entscheiden während Implementierung: → Strategie-Chat.
Bei Fragen zu Visual/UX: → VI & UX-Chat.

Viel Erfolg.

---

*FinanceBird · Sprint 5–9 Briefing · Session 25 · 2026-04-16 · Oswald H. König + Claude*
