# FinanceBird · vi_kontext.md
> Aktueller Stand: Chat "FB · Brand & Visual Identity"
> Stand: 2026-03-17 (Session 5 — VI-Fixes implementiert, URL-Migration)

---

## Zweck dieses Chats

Alle visuellen und gestalterischen Entscheide für FinanceBird — App, Brand, Squarespace.
Entscheide hier sind bindend für den App-Coding-Chat und den Strategie-Chat.
Keine Business- oder Architektur-Entscheide — die gehören in den Strategie-Chat.

---

## Was seit letzter VI-Session passiert ist (App-Coding Session 5)

Mehrere VI-Entscheide wurden in Session 5 direkt implementiert:

- ✅ **Gold Block Hover auf Beträge** — `.amt`, `.movement-amt`, `.liq-cell-val`, `.verm-bal` → Gold BG + weisser Text bei Hover, 0.12s Transition
- ✅ **Grain nicht auf `<img>`** — `isolation: isolate` + `z-index: 10000` auf `img`-Elementen
- ✅ **Desktop Sidebar Schriftgrösse** — 11px → 12px implementiert
- ✅ **Reverse Highlighting aktiver Tab** — implementiert (aus früheren Sessions)

**URL-Migration:** Repo von `siio-kunto/budget-app` → `financebird/app`.
GitHub Pages neu: `financebird.github.io/app/`

---

## Typographie (festgelegt ✅)

| Rolle | Font | Verwendung |
|---|---|---|
| Headlines / Titel | Cormorant Garamond | Grosse Titel, kursiv für Akzente |
| Fliesstext / UI | Plus Jakarta Sans | Labels, Beschreibungen, UI-Text |
| Zahlen / Beträge | Libre Baskerville | Alle monetären Werte |
| Meta / Datum / Nav | Courier Prime | Labels, Kategorien, Nav-Items (Uppercase) |

### Desktop Typographie-Skalierung (✅ entschieden, → App-Coding umsetzen)

| Klasse | Mobile | Desktop ≥ 701px |
|---|---|---|
| `.kpi-label`, `.card-title` | 9px | 11px |
| Kategorien, `.mbar-label` | 9px | 10px |
| `.nav-tab` | 10px | 11px |
| `.kpi-val` | 24px | 28px |
| Buchungsbeträge | 15px | 16px |
| `body` Base | 15px | 16px |
| `.sidebar-item` | — | 12px ✅ |

---

## Hover-Effekte (festgelegt ✅)

| Element | Effekt | Status |
|---|---|---|
| Headlines / Titel | Block Terrakotta — BG `#c4441a` · Text `#faf7f2` | → App-Coding |
| Navigation | Block Terrakotta | ✅ implementiert |
| Beträge / KPI | Block Gold — BG `#c8922a` · Text `#faf7f2` | ✅ implementiert Session 5 |
| Aktiver Tab | Reverse Highlighting | ✅ implementiert |

Transition: `.12s` — harter Cut. Referenz: schoolofcommons.org

---

## Farbpalette (festgelegt ✅)

```css
/* LIGHT MODE */
--bg: #f5f0e8;  --bg2: #ede8dc;  --paper: #faf7f2;
--ink: #2c1f0e;  --ink2: #4a3520;  --muted: #8a7a65;
--border: #d8ccb8;  --accent: #c4441a;  --gold: #c8922a;
--green: #4a7a52;  --sky: #4a7a98;

/* DARK MODE */
--bg: #141210;  --bg2: #1c1a14;  --paper: #1e1c16;
--ink: #f0e8d8;  --ink2: #c8b898;  --muted: #6a6050;
--border: #2e2820;
```

---

## App-Layout-Struktur (v2 — implementiert)

### Mobile
```
┌─────────────────────────────────────────┐
│ Header: Hamburger (links) · Status · Inbox-Icon+Badge (rechts) │
├─────────────────────────────────────────┤
│ HERO: Gradient Terrakotta → Seeblau     │
├─────────────────────────────────────────┤
│ TAB-INHALT                              │
└─────────────────────────────────────────┘
                              [Erfassen] FAB
```

### Desktop (≥ 701px)
```
┌──────────┬──────────────────────────────────────┐
│ SIDEBAR  │ Header: Status · Inbox-Icon+Badge     │
│          ├──────────────────────────────────────┤
│ 🦅 Cockpit │ TAB-INHALT                          │
│ 📚 Buchh. │                                      │
│ 🌱 Ziele  │                                      │
│ 🤹 Aktiv. │                                      │
│ 🔮 Kompass │                                     │
│ ⚙️ Einst. │                                      │
│          │                              [+] FAB  │
│ ✉️ Kontakt│                                      │
└──────────┴──────────────────────────────────────┘
```

---

## Tab-Icons (Kandidaten, zu finalisieren)

| Tab | Vogel | Funktion |
|---|---|---|
| Cockpit | 🦅 | 👀 |
| Buchhaltung | 🦩 | 📚 |
| Ziele | 🐣 | ⛳️ |
| Aktivitäten | 🦚 | 🤹‍♂️ |
| Kompass | 🦉 | 🔮 |
| Einstellungen | 🦤 | ⚙️ |

**Entscheid offen:** Emoji beibehalten oder eigene SVG-Icons designen?

---

## Icon (festgelegt ✅)

Finales App-Icon: Rotmilan-Kopf, DALL-E, Terrakotta BG `#c4441a`, Goldkette, Edelweiss, Teal Schnabel.
Master: `icon_brand.png`. 13 Grössen generiert. Transparente Versionen (`icon-192-transparent.png`, `icon-512-transparent.png`) ausstehend (Osi manuell).

---

## Risograph-Stil (✅ implementiert)

1. ✅ Grain `opacity: 0.07` (body::before)
2. ✅ Grain nicht auf `<img>` (`isolation: isolate`) — Session 5
3. ✅ Mis-registration auf "FinanceBird" Header (`text-shadow`)
4. Harte Farbkanten, keine Verläufe

**Offen:** Mis-registration Intensität — erst im Browser beurteilen (nach Push)

---

## UI Momente (konzipiert ✅, implementiert)

- ✅ **Splash Screen:** GIF, Terrakotta/Dark BG, Ladebalken smooth
- ✅ **Loading Overlay:** GIF, Spinner, Courier Prime Text
- ✅ **KI Beleganalyse:** GIF (Vogel schaut Uhr), Scan-Linie + Puls-Ring

---

## Konsolidiertes VI-Backlog (priorisiert)

### Prio 1 — nach Browser-Test (jetzt relevant)

| # | Task | Status |
|---|---|---|
| V1 | Mis-registration Intensität prüfen | 🔴 Nach Browser-Test |
| V2 | Gold-Hover Intensität im Browser prüfen | 🔴 Nach Browser-Test |
| V3 | Desktop Typographie-Skalierung vollständig umsetzen (KPI-Labels etc.) | 🔴 → App-Coding |
| V4 | Tab-Icons finalisieren — Emoji vs. SVG | 🔴 Offen |
| V5 | Tab-Name "Aktivitäten" — Brainstorming Alternativen | 🔴 Offen |

### Prio 2 — Landing Pages & Sichtbarkeit

| # | Task | Status |
|---|---|---|
| V6 | Landing Page Tätigkeiten (ohne Tool → einladend) | 🔴 Offen |
| V7 | Landing Page Ziele (kreativ, neugierig machend) | 🔴 Offen |
| V8 | Landing Page Kompass (erklärt was es kann) | 🔴 Offen |
| V9 | Entdeckungsbereich Design (Stufe 3 Sichtbarkeit) | 🔴 Offen |
| V10 | Illustrations-Stil für Empty States definieren | 🔴 Offen |

### Prio 3 — Setup & Onboarding

| # | Task | Status |
|---|---|---|
| V11 | Worker Setup Screen — visuelle Verfeinerung nach erstem Tester-Feedback | 🔴 Offen |
| V12 | Quiz-Screens Design (grosse klickbare Optionen) | 🔴 Offen |
| V13 | Übergangs-Moment "Dein FinanceBird ist bereit!" — Animation | 🔴 Offen |
| V14 | Feedback-Formular UI-Design | 🔴 Offen |

### Prio 4 — Naming & Brand Voice

| # | Task | Status |
|---|---|---|
| V15 | Tätigkeitskategorien-Naming (Lohnarbeit etc. → Birdonomics?) | 🔴 Offen |
| V16 | Vocabulary + Ton finalisieren | 🔴 Offen |
| V17 | Rechnungs-Default-Template Design | 🔴 Offen |
| V18 | Cashflow-KPI Benennung | 🔴 Offen |

### Prio 5 — Brand

| # | Task | Status |
|---|---|---|
| V19 | Brand Essence finalisieren | 🔴 Offen |
| V20 | Tagline finalisieren | 🔴 Offen |
| V21 | Birdonomics-Glossar weiter ausbauen | 🔴 Offen |
| V22 | Transparente Icons erstellen | ⏳ Osi manuell |

### Phase 2+

- Desktop Splash: Vogel-Hybrid Animation
- Papier-Textur Hintergrund-Overlay
- Squarespace-Design

---

## Referenz-Dateien im Projekt

- `financebird_brand_system.html` — lebende VI-Referenz inkl. Moodboard
- `vi_brand_concept.md` — Brand Concept (Essence, Metapher, Birdonomics)
- `financebird_mockup_final.html` — UI Mockups
- `financebird_cockpit.html` — Architektur-Cockpit

---

## URLs (nach Migration)

- GitHub: `github.com/financebird/app`
- GitHub Pages: `financebird.github.io/app/financebird_v2.html`
- Worker-Download: `financebird.github.io/app/notion-worker.js`

---

*FinanceBird · vi_kontext.md · 2026-03-17 · Session 5 · Oswald H. König + Claude*
