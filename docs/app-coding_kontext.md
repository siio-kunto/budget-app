# FinanceBird · app-coding_kontext.md
> Chat "FB · App-Coding"
> Stand: 2026-04-28 (S36 abgeschlossen — Sprint 6.5d · v2.31a DEPLOYED)
> Bug-Register + Backlog + Regeln + S31-Lessons → MASTER.md (Quelle der Wahrheit)

---

## Zweck dieses Chats

Konkretes Coding: Bugs fixen, Features bauen, HTML/JS patchen, Workers updaten.
Keine Architektur-/Business-Entscheide → Strategie-Chat.
Keine visuellen/UX-Entscheide → VI & UX Chat.

---

## ⚡ ÜBERGABE AN NEUEN APP-CODING-CHAT (S37 ff.)

**Sprint 6.5d ist abgeschlossen UND deployed.** v2.31a läuft live auf https://financebird.app/financebird_v2.html.

**Sprint 6.5 (Cold-Zone-Sweep) ist nach 4 Teil-Sprints (a/b/c/d) komplett abgeschlossen.** Total Keys-Wachstum: +741 Keys × 2 in 6.5a-d. App ist in allen migrierten Bereichen vollständig zweisprachig.

**Nächste Schritte:**
- **Optional Sprint 6.5e** = letzte Reste falls im Live-Test v2.31a was auffällt:
  - Feedback-Modal-Detail (S35-Audit war Z.14084 falsch lokalisiert — eigentliche Position noch zu finden)
  - Repair-Screen Welcome-License-Submit (`onboardLicense`) — sollte komplett migriert sein, ggf. Restspuren prüfen
  - Edge-Cases die in EN-Test auffallen
- **Sprint 6.6** = BL-108 Widget-Audit (Cockpit hat 24 Widgets, Struktur muss von Strategie definiert werden)
- **BUG-080** (NEU S36): `overviewRow` ignoriert 5. Parameter — latenter Bug, Action-Button im Onboarding-Overview erscheint nie. Code-Parität bewahrt, Fix in Sprint 9 oder 6.6.
- **Archivierung Sprint 6.5a-d** empfohlen — würde ~35-40 abgeschlossene Items aus MASTER.md ins entwicklungsarchiv.md verschieben.

### Erstes was der neue Chat tun muss

1. **MASTER.md lesen** (S36-Stand) — Deployed Versions auf v2.31a, BUG-080 NEU, BL-109d ✅
2. **Diesen Kontext lesen** (S36)
3. **HTML im Repo prüfen:** `grep fb-version` sollte v2.31a.2026-04-28 zeigen
4. **Smoke-Test:** `node smoke-i18n.js` — 59/0/0 sollte grün sein, 1260 Keys
5. **Live-Test-Findings von Osi einholen:** EN-Mode-Test nach Deploy v2.31a (Onboarding-Provider-Selector EN, Overview EN, PWA-Install EN, Print-Rechnung EN, Cockpit-Recommendations EN, License/Pairing-Errors EN)

### Pending vor Start S37

**Keine offenen Pendenzen aus S36.** v2.31a ist deployed (HTML in repo, sw.js auf `financebird-v2.31a-1` zu bumpen).

**Mitnahme-Items für künftige Sprints:**
- **`serviceStatusBadge(hc, service)` Helper** — Pattern für Health-Check-Display etabliert. Wiederverwendbar in Repair-Screen-V3 (statt direktem hc-Rendering inline). Position: Z.~9483.
- **Strategie-S36 Tax-Anker-Header-Kommentare** in REGION_CONFIG.DE+AT (Z.~9286, ~9351) — bei künftigen Sweeps NICHT versehentlich übersetzen. Kommentar-Marker `Behörden-Anker (EÜR/E1a` greppbar.
- **EN-Apostroph-Vorsicht weiterhin:** Smoke-Test fängt Apostroph-Syntax-Errors nicht — `node --check` Pflicht bei jedem EN-String mit `'`.
- **„Abschlüsse" → „Closings"** Glossar-Entscheid könnte noch nachgeschärft werden. Nicht dringend.
- **`overviewRow` 4-Param-Limitation (BUG-080)** — wenn Repair-Screen-Refactor kommt: 5. Parameter `actionHtml` einbauen. Im Code mit `// BUG-080: actionHtml unused` markieren falls man drüber stolpert.

---

## ⚡ Was in S36 gemacht wurde (App-Coding) — Sprint 6.5d

### Ergebnis

**~50 Patches, +170 Keys (DE+EN), 6 Gruppen + Patch-0, Smoke 59/0/0**

| Gruppe | Inhalt | Keys | Pattern |
|---|---|---|---|
| Patch-0 | Strategie-S36 Tax-Anker Header-Kommentare in REGION_CONFIG.DE+AT taxMapping | 0 | dokumentarisch (2 Zeilen je Region) |
| 1 | Landing-Pages (Aktivitäten/Kompass/Settings-Loading) + Inbox-Modal-Title + Erfassen Screens 2-4 (Beleg-Scan/Transfer/Rechnung) | 19 | HTML-IDs + L11 (`applyStaticI18n`-Pattern) |
| 2 | Onboarding-JS Provider-Selector (3 categories × ~5 options) + obProviderSelected (Erweiterung/Speichern/Überspringen) + obRenderOverview (5 Services × ~5 Status-Strings) + obUpdateAccountsUI (Konto/Konten Plural) + obUpdateIntTiles (Tile-Subs) | 29 | Inline `t()` + neuer Helper `serviceStatusBadge(hc, service)` |
| 3 | PWA-Install (Android+iOS) + submitPairingCode + Done-Screen-JS (loadDonePairingCode, startPairingCountdown, copyDoneUrl) | 19 | Inline `t()` + Template-String mit Lang-Awareness |
| 4 | previewRechnung — komplettes lang-aware HTML-Print-Window (analog `printJahresabschluss` aus 6.5a) | 10 | `<html lang="${lang}">` + alle Strings via `t()` |
| 5 | License-Modal-Submit + onboardSaveManualToken + onboardLicense-Submit + v3RepairLicenseSubmit + v3SubmitPairingCode + v3RenderRepair (5 items + 5 actions) + claimPairingCode (Welcome) + showReAuthBanner + 4× triggerReAuth-Reasons + 5 UI-Throws (Token/PDF-Analyse/Datei-zu-gross/Auth) + 3× showLoading + KI-hat-gelesen | 51 | Inline `t()`, manche mit `{vars}` (z.B. `pairing.welcome.error_connection`) |
| 6 | Cockpit `'Übriges'` cat-fallback × 2 + healthSummary completeness (4 Strings) + localStorage warn/err (2) + Cockpit-Recommendations Banner (Title/Done-Count/Hide) + 4× Recommendation-Items (label/sub/actionLabel) | 22 | Inline `t()` |
| **Total** | | **170** | |

**I18N-Audit nach S36:** 1260 unique Keys (DE+EN matched). 0 Missing, 0 Orphan. Smoke-Test 59/0/0.

### Wichtigste Entdeckungen S36

- **PWA-Update-Banner war bereits migriert** (Z.70-100) — S35-Audit hatte „~3 Strings" gemeldet, aber alle 5 Keys (`toast.sw_update`, `toast.sw_update_sub`, `toast.sw_updating`, `toast.sw_updating_sub`, `action.update_now`) existierten schon mit defensiver `_t()`-Fallback. Aus 6.5d-Scope entfernt.
- **Erfassen-Screens 2-4 nie touchiert** (Audit hatte „~10" — real ~31 Strings über 3 Screens). Hauptscreen 1 war in S34 vollständig migriert via L11-Pattern, die Screens 2-4 mit eigenen Form-Labels/Placeholders/Buttons fielen durchs Raster.
- **Onboarding-JS dynamic-Templates größer als gedacht** — `obSelectProvider` configs hatten 14 Strings, `obRenderOverview` ~22 Strings (Helper `serviceStatusBadge` reduziert das auf 5 Service-Calls).
- **License/Pairing/Repair-Errors** waren weit verteilt: License-Modal-Submit (Z.~9165), onboardLicense-Submit (Z.~15760), v3RepairLicenseSubmit (Z.~15716), v3SubmitPairingCode (Z.~15743), claimPairingCode-Welcome (Z.~16770), showReAuthBanner (Z.~9120), triggerReAuth × 4 sites — alle mit teilweise überlappenden, teilweise leicht unterschiedlichen Error-Strings. Pragmatisch: getrennte Keys (z.B. `pairing.error_invalid` vs `pairing.error_invalid_short`) statt Vereinheitlichung.
- **BUG-080 entdeckt** — `overviewRow(icon, label, status, ok)` nimmt nur 4 Parameter, der 5. (`actionHtml`) wird seit jeher ignoriert. Action-Button im Onboarding-Overview-Repair-Branch erscheint nie. Code-Parität in S36 bewahrt, Fix außerhalb 6.5d-Scope.
- **`overviewRow` als isolierter Helper-Aufrufer** — Refactor mit `services.map(svc => serviceStatusBadge(hc, svc))` ist Anti-Drift-Pattern bei künftigen Service-Erweiterungen.

### Strategie-S36 Eskalation (Pre-Sweep)

Vor Sprint-Start hat App-Coding eine **DE+AT Tax-Mapping-Frage** an Strategie eskaliert (~30 Strings ungeklärt: bleiben DE oder EN-Tax-Codes erfinden?). Strategie-Resolution S36: **Variante A — Behörden-Anker bleiben atomic, 0 Keys, nur 2-Zeilen Header-Kommentar**. Begründung: ELSTER ist DE-only, Cross-Reference zum echten Formular hat Vorrang vor i18n. Patch-0 implementiert das in REGION_CONFIG.DE (Z.~9282) + REGION_CONFIG.AT (Z.~9343). CH unverändert (kein EÜR/E1a-Anker, andere Architektur).

**Pattern bestätigt:** Pre-Patch-Eskalation mit klarem Issue-Briefing → schnelle Resolution → Patch-0 in 5 Min. Replizieren für künftige Sweeps.

### S36-spezifische Helper-Wiederverwendung (Anti-Drift)

- `serviceStatusBadge(hc, service)` (Z.~9483) — Display-Layer für Onboarding-Overview, wiederverwendbar für künftigen Repair-Screen-Refactor
- Bestehende Helper aus S33 wurden weiter genutzt:
  - `regionLabel`, `mwstMethodLabel`, `categoryLabel`, `taxCategoryLabel`, `invoiceTypeLabel` (S35)
  - `recFreqLabel`, `invStatusLabel`, `kontoTypeLabel`, `trStatusLabel`, `catStatusLabel`, `buchTypeLabel` (S33)
  - `_slugifyDe` (S33)

### previewRechnung lang-aware Pattern (D1)

Standalone HTML-Print-Window analog `printJahresabschluss` aus 6.5a:
- `<html lang="${lang}">` mit `lang = AppState.lang === 'en' ? 'en' : 'de'`
- Alle Section-Heads, Total-Labels, Footer i18n via `t()`
- DB-Werte (r.client, r.nr, r.date, r.due) bleiben unverändert (Anker)
- CSS unverändert (universal)

Pattern wiederverwendbar für künftige Print-Funktionen (Quittung, Mahnung, etc.).

### Strukturchecks final S36

| Check | Erwartet | Real |
|---|---|---|
| Syntax (`node --check`) | OK | ✅ OK |
| `onclick.*JSON.stringify` (A7) | 0 | ✅ 0 |
| `const _orig*` (A1) | 1 (`_origConsoleError`) | ✅ 1 |
| Doppelte Funktionsnamen (A2) | 0 | ✅ 0 |
| Datei-Größe | ~18.3k Zeilen | ✅ 18322 Zeilen |
| Total i18n-Keys (DE+EN) | 1260 unique | ✅ 1260 |
| `S36 Sprint 6.5d`-Marker | 14 | ✅ 14 |
| `data-i18n*=`-Annotationen | 100 (von 99 in S35 +1) | ✅ 100 |
| Smoke-Test | 59 pass | ✅ 59/0/0 |
| Tax-Anker Header-Kommentare | 2 (DE+AT) | ✅ 2 |
| `taxCategoryLabel` Regex unverändert | 1 | ✅ 1 |

---

## Was in S35 gemacht wurde (App-Coding) — Sprint 6.5c

(Unverändert — siehe S35 Kontext-Archiv)

### Ergebnis (Kurz)

**+110 Keys × 2 Sprachen, 11 Display-Helper-Verkabelungen, 99 data-i18n-Annotationen, generischer `data-i18n`-Helper, Smoke 59/0/0, v2.30a deployed.**

(Detail siehe entwicklungsarchiv.md falls archiviert, sonst alter Kontext)

---

## Belege-Queue + Healing (Sprint 5.5 BL-107 + S28 BUG-076) ✅ GEHÄRTET
(Unverändert — siehe S28 Kontext)

---

## Widget-System · Schema-Management · REGION_CONFIG · Provider-System · Feedback-System · Security · healthSummary + Repair-Screen

(Alle unverändert — siehe S26/S27 Kontexte)

---

## Code-Blöcke

| Block | Key Functions |
|---|---|
| AUTH | `Auth.startOAuth()`, `Auth._applyToken()`, `Auth._startPolling()`, `Auth.registerDevice()`, `Auth.triggerReAuth()` (S36 reasons via t()) |
| CRYPTO | `fbDeriveKey()`, `fbEncrypt()`, `fbDecrypt()` |
| ERROR-BUFFER | `_errorLog[]`, `_origConsoleError`, `getErrorLog()` |
| GDRIVE | `.uploadReceipt()`, `.isConnected()`, `settingsConnectGDrive()`, `flushReceiptQueueAfterReauth()` |
| NOTION-ADAPTER | `.createBooking()`, `.syncDelta()`, `.flushQueue()`, `.ensureSchema()` |
| DATA-LAYER | `Store`, `fullSync()`, `deltaSync()`, `flushQueue()`, `clearQueue()`, `manualSync()` |
| REGION_CONFIG | `REGION_CONFIG`, `getRegion()`, `getCats*()`, `getDefaultTaxMapping()` · **S36: taxMapping in DE+AT mit Header-Kommentar als Behörden-Anker markiert** |
| PROVIDERS | `PROVIDER_REGISTRY`, `getActive*Adapter()` |
| CREDENTIAL-SYNC | `persistProviderKey()`, `saveSettingsToNotion()`, `loadSettingsFromNotion()` |
| I18N | `I18N`, `t(key, vars)`, `_t(k,f)`, `fbI18nAudit()`, `setLang()`, `SIDEBAR_ITEMS[]`, `renderSidebar()`, `applyStaticI18n()` (erweitert in S36 für A1-A5) |
| **DISPLAY-HELPERS** | `categoryLabel`, `taxCategoryLabel`, `invoiceTypeLabel`, `regionLabel`, `mwstMethodLabel`, `buchTypeLabel`, `recFreqLabel`, `invStatusLabel`, `kontoTypeLabel`, `trStatusLabel`, `catStatusLabel`, `_slugifyDe` (S33+S35), **`serviceStatusBadge(hc, service)` (NEU S36)** |
| ERFASSEN | `analyseBeleg()`, `erfUploadReceipt()`, `erfSaveBuchung()`, `erfSaveTransfer()` (S36 Screen 3 i18n), `erfSaveRechnung()` (S36 Screen 4 i18n), `_erfReceiptToFile()` |
| BELEG-ATTACH | `attachReceiptToBooking()`, `triggerAttachReceipt()`, `queueAddReceipt()`, `_fileToBase64()`, `getQueuedReceiptFor()`, `countQueuedReceipts()` |
| COCKPIT | `Computed.*`, `WIDGETS[]`, `renderCockpit()`, `widgetCardHTML()`, `canRenderWidget()`, `renderCockpitRecommendations()` (S36 i18n), `cockpitRecommendationChecks()` (S36 i18n) |
| SCHEMA | `ensureBuchungenSchema()`, `ensureRechnungenSchema()` |
| FEEDBACK | `showFeedbackForm()`, `submitFeedback()`, `validateKeyInline()`, `healIssue()` |
| HEALTH | `healthCheck()`, `healthSummary()` (S36: completeness-issues via t()), `v3RenderRepair()` (S36 i18n) |
| SYNC | `syncTimeTracker()` |
| CRUD-BUCHUNGEN | `confirmBuchung()`, `confirmBuchungCategory()`, `deleteBuchung()`, `restoreBuchung()`, `inboxRecurBook/Skip/Snooze()`, `inboxInvPaid/ConfirmShift()` |
| FX | `FxInterface`, `FrankfurterAdapter`, `getActiveFxAdapter()`, `refreshFxRates()`, `loadFXRates()`, `getFxRate()`, `getFXRate()` |
| **ONBOARDING (S36 i18n)** | `obUpdateAccountsUI()`, `obUpdateIntTiles()`, `obSelectProvider()`, `obProviderSelected()`, `obRenderOverview()` (nutzt serviceStatusBadge), `claimPairingCode()` (Welcome) |
| **PAIRING/PWA (S36 i18n)** | `showPWAInstallScreen()` (Android+iOS lang-aware), `submitPairingCode()`, `v3SubmitPairingCode()`, `loadDonePairingCode()`, `startPairingCountdown()`, `copyDoneUrl()` |
| **REPAIR (S36 i18n)** | `v3RenderRepair()`, `v3RepairLicenseSubmit()`, `showReAuthBanner()` |
| **PRINT (S36 i18n)** | `previewRechnung()` (lang-aware HTML), `printJahresabschluss()` (S33 lang-aware), `exportJahresabschluss()` (S33 lang-aware) |

---

## Notion DB-Schema Ist-Zustand (via MCP verifiziert 2026-04-09)
(Unverändert — siehe S26)

---

## ⚠️ Lessons (kumulativ)

### S29 / S30 / S33 Lessons (App-Coding, L1–L13)
(Unverändert — siehe S35 Kontext / MASTER S29/S30/S33)

### S31 Lessons (Strategie, L1–L3) — App-Coding muss kennen
(Unverändert — siehe S35 Kontext)

### S35 Lessons (App-Coding, L14–L16)
(Unverändert — siehe S35 Kontext: data-i18n-Helper-Pattern, REGION_CONFIG-Helper-Wiring, Onboarding-Statisches-HTML-Pattern)

### S36 Lessons (App-Coding, L17–L20)

#### L17 · Audit-Werte sind Schätzungen, real-state via aktuellem grep
S35-Audit hatte für 6.5d ~147 Strings geschätzt. Real:
- PWA-Update-Banner: schon migriert (0 statt 3)
- Erfassen-Screens 2-4: ~31 statt ~10 (Hauptscreen 1 war migriert, Screens 2-4 nie)
- Onboarding-JS: ~14+22+5=41 statt ~14
- License/Pairing/Repair: ~51 statt ~12
- Print/Recurring: 10 statt 13
- Cockpit-Recommendations: 13 (S35-Audit nicht gefunden)
- healthSummary completeness: 4 (S35-Audit nicht gefunden)
- Feedback-Modal: nicht gefunden (Z.14084 war falsch lokalisiert)

**Konsequenz:** Inventar-Phase mit aktuellen Zeilennummern + grep-Verification ist Pflicht vor Patch-Phase. Audit-Schätzungen aus Vor-Sessions als grobe Orientierung, nicht als Scope.

#### L18 · Helper-Schwelle: 22 inline-Calls = Helper-Pflicht
`serviceStatusBadge(hc, service)` reduziert 22 inline-Calls in `obRenderOverview` auf 5 `services.map(svc => serviceStatusBadge(hc, svc))`. Anti-Drift bei künftigen Service-Erweiterungen (OpenAI, Toggl, GSheets).

**Konsequenz:** Wenn ein Migration-Block ≥10 strukturell ähnliche `t()`-Calls hat, Helper einführen. Position bei den anderen Display-Helpern (Z.~9140-9500-Region).

#### L19 · Latente Bugs während Migration entdecken — nicht beheben, dokumentieren
`overviewRow(icon, label, status, ok)` nimmt nur 4 Parameter, der 5. (`actionHtml`) wird seit jeher ignoriert. In S36 entdeckt während Gruppe-2-Refactor.

**Konsequenz:** Migration ist nicht der richtige Zeitpunkt für Behavior-Changes. Code-Parität bewahren, Bug ins Register (BUG-080), Fix in dediziertem Sprint.

#### L20 · Strategie-Pre-Eskalation für DACH-spezifische i18n-Fragen
DE+AT Tax-Mapping war ein klassisches Strategie-Issue (Behörden-Anker vs i18n-Konsistenz). Pre-Patch-Eskalation kostete 1 Briefing + 1 Resolution. Drift-Kosten bei falschem Fix wären hoch (DE-User sehen unleserliche Cross-Reference).

**Konsequenz:** Bei DACH/Region-spezifischen Fragen ohne klaren Glossar-Eintrag → Strategie-Eskalation BEFORE Patch-Phase. Kosten-Risiko-Analyse: Briefing-Aufwand < Drift-Kosten bei falschem Default.

---

## Sessions

| Version | Session | Highlights |
|---|---|---|
| 2.14d–2.29a | S14–S34 | (siehe Archiv) |
| 2.30a (DEPLOYED) | S35 (04-27) | Sprint 6.5c: Settings + Onboarding + Datenschutz + REGION_CONFIG Display-Layer + CSV-Reste · `data-i18n`-Helper neu · 110 Keys × 2 (2193 unique) · BUG-079 ✅ pre-existing fixed · Smoke 59/0/0 |
| **2.31a (DEPLOYED)** | **S36 (04-28)** | **Sprint 6.5d Coverage-Closure abgeschlossen + LIVE: Patch-0 Strategie-S36 Tax-Anker (REGION_CONFIG.DE+AT) + 6 Gruppen (Landings/Inbox/Erfassen-Screens-2-4 + Onboarding-Provider+Overview+Tile-Subs + PWA/Pairing/Done + previewRechnung-lang-aware + License/Pairing/Repair-Errors+UI-Throws+showReAuthBanner+triggerReAuth-Reasons + Cockpit-Defaults+Recommendations+healthSummary) · ~50 Patches · +170 Keys × 2 (1260 unique total) · `serviceStatusBadge` Helper neu · Smoke 59/0/0 · L17-L20 · BUG-080 NEU (overviewRow latenter Bug) · Sprint 6.5 Cold-Zone-Sweep komplett (Total +741 Keys × 2 in 6.5a-d)** |

---

*FinanceBird · app-coding_kontext.md · 2026-04-28 · S36 abgeschlossen · Oswald H. König + Claude*
