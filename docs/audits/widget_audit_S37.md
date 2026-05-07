# FinanceBird · widget_audit_S37.md

> Cockpit-Widget-Audit gegen Code-Reality + Deep-Research-Inventory
> Stand: 2026-04-29 (Session 37 · Strategie-Chat)
> Quelle Code: `financebird_v2.html` v2.31a · Quelle Soll: „The Complete FinanceBird Cockpit Metrics Inventory" (DS1 Research, 04-04-2026, 14 S., 80+ Metriken in 8 Domänen)

---

## Zweck

Dieses Dokument schliesst BL-108 (Cockpit-Widget Audit) ab. Es enthält:

1. Audit aller 24 Widgets gegen 8 Dimensionen
2. 45 identifizierte Issues, kategorisiert
3. 7 systemische Cross-Widget-Befunde
4. Empfehlungs-Priorisierung für Backlog

Audit-Methodologie: pro Widget Code-Formel-Analyse + Vergleich mit Deep-Research-Quelle + Identifikation von Drift, Bugs, Lücken, Erweiterungs-Potenzial.

---

## Widget-Inventar (24)

| Kategorie | # | Widgets |
|---|---|---|
| **Buchhaltung** | 9 | einnahmen · ausgaben · profit · vermoegen · cashflow-chart · offene-rechnungen · steuer-score · liquiditaet · puffer |
| **Geschäftsanalyse** | 7 | stundensatz · auslastung · deckungsbeitrag · runway · abo-kosten · kundenkonzentration · steuerreserve |
| **Kompass** | 8 | freiheit · lebensenergie · kosten-lebensstunde · portfolio-life · sabbatical · burnout-risk¹ · enough-point¹ · doughnut¹ |

¹ comingSoon — Konzept-Audit ohne Code-Analyse

---

## Audit-Dimensionen

| # | Dimension |
|---|---|
| 1 | Zweck-Frage — welche User-Frage beantwortet das Widget? |
| 2 | Datenquelle — welche Stores/Felder werden gelesen? |
| 3 | Formel-Reality — was rechnet der Code tatsächlich? |
| 4 | Research-Treue — Code-Formel vs. Deep-Research-Quelle |
| 5 | Inhaltliche Korrektheit — math/buchhalterisch sinnvoll? |
| 6 | Datenqualität / Empty-State (A11) |
| 7 | Schwellwerte vs. Research-Benchmarks |
| 8 | Drift / Issues |

---

## Phase 1 · Buchhaltung (9 Widgets)

### Widget 1 · `einnahmen` 💰

- **Frage:** Wie viel habe ich dieses Jahr eingenommen?
- **Code (Z.8191):** `Σ Buchungen.amount where type='Einnahme' && Jahr=CY` — kein `bereich`-Filter
- **Sub:** `confirmed_sub` zeigt `totalIncomeConfirmed` (paid=true) wenn < total
- **Research §1:** Total Revenue — Standard
- **Findings:**
  - ✅ Mathematisch korrekt
  - 🐛 Mischt Geschäftlich + Privat (siehe systemischer Befund S1)
  - ⚠️ Kein YoY-Vergleich
  - ⚠️ Kein MWST-Schwellen-Cue
- **Empfehlungen:**
  - 💡 Default `bereich='Geschäftlich'` filtern (S1-Fix)
  - 💡 YoY-Wachstum als Sub-Zeile (Research §1, Revenue Growth Rate)
  - 📚 MWST-Schwellen-Cue bei Income > CHF 80k (Research §2)

### Widget 2 · `ausgaben` 💸

- **Frage:** Wie viel habe ich dieses Jahr ausgegeben?
- **Code (Z.8201):** `Σ Buchungen.amount where type='Ausgabe' && Jahr=CY` — kein `bereich`-Filter
- **Research §1:** Total Operating Expenses
- **Findings:**
  - ✅ Mathematisch korrekt
  - 🐛 Geschäftlich/Privat-Drift (S1)
  - ⚠️ Kein `confirmed`-Indikator wie bei Einnahmen
  - ⚠️ Keine Fix/Variabel-Aufteilung
- **Empfehlungen:**
  - 💡 Bereich-Filter konsistent (S1-Fix)
  - 💡 `expenseConfirmed`-Sub-Zeile
  - 💡 Operating Expense Ratio im Detail (Research §1)
  - 📚 Fix vs. Variabel-Split im Detail-Wasserfall (Research §3)

### Widget 3 · `profit` 📊

- **Frage:** Was bleibt übrig?
- **Code (Z.12053):** `Computed.totalIncome() - Computed.totalExpense()`
- **Research §1:** Net Profit Margin = `(Revenue − All Expenses − Taxes − Social Contributions) / Revenue × 100`. Ziel **25-40%** für DACH freelancer.
- **Findings:**
  - 🐛 Erbt Geschäftlich/Privat-Drift (S1)
  - 🐛 Steuern + AHV nicht abgezogen — Wert systematisch ~30% zu hoch
  - ⚠️ Keine Margen-Anzeige
- **Empfehlungen:**
  - 🐛 **Profit-Definition schärfen** (siehe systemischer Befund S2): Hauptwert = Rohgewinn (Geschäftliche Einnahmen − Geschäftliche Ausgaben), Sub-Zeile „nach Steuern: CHF X" via `Computed.taxReserve()`
  - 💡 Profit-Marge als Sub mit Research-Schwellwerten (rot <0%, amber 0-25%, grün 25-40%)
  - ⚠️ Strategie-Frage: MWST-Bereinigung im Profit?

### Widget 4 · `vermoegen` 🏦

- **Frage:** Wie reich bin ich gerade?
- **Code (Z.8269):** Σ über `Store.konten`: `estimatedBalance × FX-Rate zur Hauptwährung`
- **Research §1:** Net Worth = Assets − Liabilities
- **Findings:**
  - ✅ Konzeptionell sauber: Saldo + Delta + Transfers + bestätigte Buchungen
  - ✅ FX-Konvertierung korrekt (BL-083)
  - 🐛 **Schulden fehlen**: `Store.projekte` Schulden werden nicht abgezogen — bei negative Net Worth zeigt Widget falschen positiven Wert
  - ⚠️ Empty-State zeigt CHF 0.00 statt „—"
- **Empfehlungen:**
  - 🐛 Schulden integrieren via `Computed.projekteSummary().totalDebtRemaining`
  - 💡 A11 Empty-State Fix: bei `Store.konten.length===0` → „—" + „Konto anlegen"

### Widget 5 · `cashflow-chart` 📈

- **Frage:** Wie war mein Cashflow über das Jahr?
- **Code (Z.12544):** Bar-Chart pro Monat aus `cashflowByMonth()` (Z.8227)
- **Research §1:** Cash Flow Metrics — DSO, AR Turnover, CCC, CEI
- **Findings:**
  - ✅ Visuell klar
  - 🐛 Default zeigt unbestätigte Buchungen mit — Cashflow-Definition wäre `confirmed`
  - 🐛 Geschäftlich/Privat-Mix (S1)
  - ⚠️ Keine Saldo-Linie (kumuliertes Netto)
  - ⚠️ Skalierung outlier-anfällig
- **Empfehlungen:**
  - 🐛 `confirmed` als Default
  - 💡 Saldo-Linie überlagern (kumuliertes Netto)
  - 📚 DSO + CEI ins Detail-Overlay (Research §1)

### Widget 6 · `offene-rechnungen` 📬

- **Frage:** Wer schuldet mir noch Geld?
- **Code (Z.8211):** Filter `Offen`/`Überfällig`/`Teilzahlung`. Hauptwert = Anzahl. Sub: Summe + Überfällig-Count.
- **Research §1:** DSO target <30 Tage, AR Turnover, **Collection Effectiveness Index**
- **Findings:**
  - ✅ Hauptzahl + Sub mit Betrag + roter Überfällig-Hinweis sauber
  - ⚠️ Keine DSO-Berechnung trotz vorhandener Daten
  - ⚠️ Kein Inkasso-Druck-Kontext (wie alt ist die älteste Überfällige?)
- **Empfehlungen:**
  - 💡 DSO als Sub-Zeile (Research §1, target <30 Tage)
  - 💡 Älteste überfällige Rechnung im Hauptwidget — actionable
  - 📚 CEI im Detail (Research §1)

### Widget 7 · `steuer-score` 📋

- **Frage:** Bin ich bereit für die Steuern?
- **Code (Z.11975):** 4-Komponenten-Score: `categorized` + `documented` + `mwstOk` + `flagsOk`
- **Research §2:** Research lobt explizit als App-Whitespace: „Kein Tool hat einen Steuerbereit-Score" — USP.
- **Findings:**
  - ✅ Logik sauber, BL-086 (MWST adaptiv) korrekt
  - ⚠️ Arithmetic Mean — Research §8 empfiehlt geometric mean (bestraft extreme Defizite stärker)
  - ⚠️ DACH-Spezifika fehlen (Pillar 3a, Gewerbesteuer, KSK, Gewinnfreibetrag)
- **Empfehlungen:**
  - 💡 Geometric Mean statt Arithmetic (Research §8)
  - 📚 Regional-Erweiterung im Detail-Overlay:
    - **CH**: Pillar 3a Auslastung + MWST-Schwelle
    - **DE**: Gewerbesteuer-Risiko + KSK-relevant
    - **AT**: Gewinnfreibetrag genutzt
  - 📚 Score-Komponenten transparent im Detail (Research §8 OECD)

### Widget 8 · `liquiditaet` 💧

- **Frage:** Wie sieht's mit dem Cash in den nächsten 60 Tagen aus?
- **Code (Z.12568):** `baseEst + totalInflow − totalOutflow` über `_liqHorizon` (default 60d)
- **Research §1, §5:** Current Ratio, Quick Ratio, Cash Buffer Days
- **Findings:**
  - ✅ Projektion-Logik clever
  - ⚠️ Konto-Auswahl willkürlich (erstes Konto, nicht alle aktiven)
  - ⚠️ Keine Schwellwerte (Research §5: <15d Gefahr, ≥90d ok)
- **Empfehlungen:**
  - 💡 Konto-Aggregation: Summe aller aktiven Konten in CHF
  - 💡 Cash Buffer Days alternative Sicht (Research §5)
  - 💡 Schwellwerte: <15d rot, <30 amber, ≥90 grün
  - 📚 Quick Ratio im Detail (Research §1)

### Widget 9 · `puffer` 🛟

- **Frage:** Wie voll ist mein Notgroschen?
- **Code (Z.8637):** `pct = balance / goal × 100`. Goal aus localStorage `fb_puffer_goal` (default CHF 5000)
- **Research §1, §5:** Emergency Fund Ratio = `Liquid Reserves / Avg Monthly Expenses`. Target **6-12 Monate**.
- **Findings:**
  - 🐛 **Hartcodierter `'buffer'`-Substring-Match** — fragil, sprach-abhängig
  - 🐛 **Fixes Goal CHF 5.000** — Research-Standard ist 6-12× Monatsausgaben
  - ⚠️ Schwellwerte irreführend wenn Goal falsch
- **Empfehlungen:**
  - 🐛 Konto-Erkennung verbessern (User markiert explizit)
  - 🐛 Dynamisches Goal: `goal = avgMonthlyExpense × targetMonths` (default 6)
  - 💡 Display in Monaten statt Prozent
  - 📚 **Konzept-Konsolidierung mit `sabbatical`** (siehe systemischer Befund S4)

---

## Phase 2 · Geschäftsanalyse (7 Widgets)

### Widget 10 · `stundensatz` ⏱️

- **Frage:** Was verdiene ich pro getrackte Stunde?
- **Code (Z.12151):** `effectiveRate = totalIncome / totalHours`
- **Research §3:** **6 Methoden** — Simple, Loaded, True (Robin), Per-client, Target backward, Trend
- **Findings:**
  - ✅ Loaded Rate korrekt
  - 🐛 Geschäftlich/Privat-Mix (S1)
  - ⚠️ Nur 1 von 6 Methoden — Research betont systemisch zu hoch ohne True Rate
  - ⚠️ Kein Target-Vergleich, kein Trend
- **Empfehlungen:**
  - 🐛 Bereich-Filter (S1)
  - 💡 Billable Rate als Sub (`z.billableRate` ist berechnet, wird aber nicht angezeigt)
  - 💡 Verknüpfung zu `lebensenergie` für True Rate
  - 📚 Target-Rate-Backward-Berechnung im Detail (Research §3)
  - 📚 Trend-Indikator (Research §5: declining hourlyRate = burnout proxy)

### Widget 11 · `auslastung` 📅

- **Frage:** Wie viel meiner Zeit ist verrechenbar?
- **Code (Z.12169):** `pct = billableHours / totalHours × 100`
- **Research §3:** Billable Utilization Rate = `Billable / Total Available`. Sustainable 65-75%, **>80% Burnout-Risiko**.
- **Findings:**
  - 🐛 **Nenner-Drift**: Code nutzt `totalHours` (getrackt), Research erfordert `availableHours` (Praktische Kapazität ~1.640-1.760h/Jahr)
  - ⚠️ Keine Schwellwerte (Farbcodierung)
  - ⚠️ Heart/Overhead-Aufschlüsselung fehlt im Detail
- **Empfehlungen:**
  - 🐛 Nenner-Korrektur über User-Settings „Wochen-Arbeitskapazität" (default 40h, siehe DS2 Block B)
  - 💡 Schwellwerte: <50% grau, 50-65% amber, 65-80% grün, >80% rot
  - 📚 Leerkosten-Erweiterung (Research §3)

### Widget 12 · `deckungsbeitrag` 🎯 — **BUG-075 Auflösung**

- **Frage:** Wie viele Stunden Lohnarbeit für Fixkosten?
- **Code (Z.8543):** `fixCosts/effectiveRate` — drei Fehler:
  - **F1:** `effectiveRate` statt `billableRate`
  - **F2:** Variable Kosten nicht abgezogen
  - **F3:** Nur Recurrings als Fixkosten — jährliche Einmal-Fixkosten fehlen
- **Research §3:** **Mehrstufige Deckungsbeitragsrechnung**: DB I = `Net Revenue − Variable Costs`. Break-even in Stunden = `Monthly Fixed Costs / DB per Billable Hour`.
- **Findings:** Konzeptioneller Bug — Code mischt Stundensatz mit Deckungsbeitrag
- **Empfehlungen — BUG-075 Auflösungs-Pfad** (siehe DS2 Block C):
  1. **Sofort-Fix:** `effectiveRate` → `billableRate`
  2. **Variable-Kosten-Approximation:** über Kategorie-Default-Mapping (DS2 Block C entschieden)
  3. **Voll-Implementation:** `kostenart`-Tag pro Buchung (DS2 Block C entschieden — Hybrid γ)
  - 💡 Widget-Name schärfen: „Break-even Stunden" oder „Fixkostendeckung"
  - 📚 Pro-Aktivität-DB im Detail-Overlay (Research §3, Engpassanalyse) — siehe DS2 Block C

### Widget 13 · `runway` 🛫

- **Frage:** Wie lange reicht mein Cash bei aktuellen Ausgaben?
- **Code (Z.8394):** `balance / avgMonthlyExp(letzte 3 Monate, Geschäftlich confirmed)`
- **Research §1:** Cash Runway. Standard 3-6 Min, **6-12 ideal** wegen Volatilität.
- **Findings:**
  - ✅ Filtert `bereich='Geschäftlich'` korrekt — eines der wenigen Widgets
  - ✅ Schwellwerte aligned
  - ⚠️ Privatentnahmen ignoriert — bei Sole Prop Cash-Outflow real
  - ⚠️ Hauptkonto-Logik kann irreführend sein
- **Empfehlungen:**
  - 💡 Privatentnahmen einbeziehen (konservativere Runway-Zahl)
  - 💡 Net Burn Toggle im Detail
  - 📚 Volatilitäts-adjustierte Schwellwerte wenn `incomeVolatility > 30%`

### Widget 14 · `abo-kosten` 🔄

- **Frage:** Wieviel zahle ich im Monat für Abos?
- **Code (Z.8487-8503):** Filter Cat oder Keyword-Match. Hauptwert: `subscriptions().reduce / 12`
- **Research §7:** Pain of Paying / Subscription Decoupling Score
- **Findings:**
  - 🐛 **Methodischer Bug**: `/12` von YTD-Buchungen verzerrt unterm Jahr (z.B. monatliches Abo seit März → /12 statt /4)
  - 🐛 Hardcoded englische Keyword-Liste — DACH-Tools nicht erkannt
  - ⚠️ Recurrings werden nicht genutzt trotz vorhandener Daten
- **Empfehlungen:**
  - 🐛 Komplette Neu-Verdrahtung über `Store.recurrings`
  - 🐛 Keyword-Liste in Config oder ganz weg (mit Recurrings)
  - 💡 Subscription Decoupling Score als Sub (Research §7): „X% deiner Ausgaben sind Abos"
  - 📚 Top-3 Abos im Detail-Overlay

### Widget 15 · `kundenkonzentration` 🎲

- **Frage:** Bin ich von wenigen Kunden abhängig?
- **Code (Z.12369):** HHI = `Σ(pct/100)² × 10.000`. Schwellwerte >5000 rot, >2500 amber.
- **Research §3:** HHI <1.500 well-diversified, **>2.500 dangerous**. Plus Effective Number of Clients, Client Dependency Ratio (CH 5/6-Regel), Shannon Entropy.
- **Findings:**
  - ✅ HHI-Berechnung mathematisch korrekt
  - 🐛 **Schwellwerte zu lasch**: Research §3 dangerous schon >2500
  - 🐛 Float-Rundung in HHI (Integer-pct)
  - 🐛 Year-Filter via `date` statt `paidDate` (inkonsistent zu `invoicesPaidYear`)
  - 🐛 Teilzahlungen ignoriert
  - ⚠️ Effective Number of Clients fehlt
  - ⚠️ Client Dependency Ratio fehlt — kritisch wegen CH 5/6-Regel Scheinselbstständig
- **Empfehlungen:**
  - 🐛 Schwellwerte korrigieren: rot >2500
  - 🐛 Float-HHI, Year-Filter konsistent, Teilzahlungen einbeziehen
  - 💡 **Client Dependency Ratio** als prominente Warnung (CH 5/6-Regel — strategisch wichtig für DACH-Zielgruppe)
  - 💡 Effective Number of Clients als Sub: „HHI 4.450 entspricht 2.25 echten Klienten"
  - 📚 Shannon Entropy normalisiert (Research §3)

### Widget 16 · `steuerreserve` 🏛️

- **Frage:** Wieviel zurücklegen für Steuern + Sozialabgaben?
- **Code (Z.12383):** `max(0, totalIncome - totalExpense) × region.taxReserve.rate`
- **Research §2:** CH 30-35%, DE ~30%, AT ~30% kombiniert. Plus Pillar 3a, KSK, Gewinnfreibetrag.
- **Findings:**
  - ✅ Region-Adaptive sauber
  - 🐛 Geschäftlich/Privat-Drift bei profit-Berechnung (S1)
  - 🐛 AHV-Mindestbeitrag CH (CHF 530) bei Verlust nicht berücksichtigt
  - ⚠️ Pauschalrate ohne Income-Progression (CH effektiv 13-25%)
- **Empfehlungen:**
  - 🐛 Profit-Definition fixen (S1 + S2)
  - 🐛 AHV-Mindestbeitrag CH bei Verlust
  - 💡 Income-Progression CH (Research §2)
  - 📚 Pillar-3a-Hinweis im Detail
  - 📚 DE/AT-Gegenstücke (Solidaritätszuschlag, Gewerbesteuer-Schwelle, Gewinnfreibetrag)

---

## Phase 3 · Kompass (5 aktive + 3 comingSoon)

### Widget 17 · `freiheit` 🕊️

- **Frage:** Wie viele Monate kann ich ohne Arbeit leben?
- **Code (Z.12393):** `months = totalWealth / avgMonthlyExpense`. Sentinel 999 bei avgExp=0.
- **Research §6:** FI Number = `Annual Expenses × 25` (4% Trinity). F-You Money: 2 × Annual Expenses.
- **Findings:**
  - ✅ Konzept solide
  - 🐛 Geschäftlich/Privat-Mix in `avgMonthlyExpense` (S1) — ambig, aber verzerrend
  - 🐛 Erbt `totalWealth`-Drift (Schulden fehlen — kann negativ Net Worth verstecken)
  - 🐛 Sentinel 999 vs. ∞ Inkonsistenz mit `runway`
  - ⚠️ Schwellwerte zu eng (Research §6: 24+ Monate = F-You Money)
- **Empfehlungen:**
  - 🐛 Privat-Filter als Default (Lebenshaltung-Definition) + Strategie-Eskalation
  - 🐛 Net Worth verwenden
  - 💡 Schwellwerte erweitern: <3 grau, 3-6 amber, 6-12 grün, 12-24 grün+, ≥24 grün++ (F-You)
  - 📚 FI Number / FI Percentage / Coast FI im Detail

### Widget 18 · `lebensenergie` ⚡

- **Frage:** Was bekomme ich wirklich pro Stunde Lebensenergie?
- **Code (Z.12402):** `(yearlyIncome - workCosts) / (totalHours × hiddenHoursMultiplier)`
- **Research §6:** **True Hourly Rate** (Robin & Dominguez): `(Annual Net Income - ALL work costs) / All work-related hours`. Original-Beispiel: $11/h → $4.68/h.
- **Findings:**
  - ✅ Konzept direkt aus Research, sogar Quellen-Link
  - 🐛 **Brutto-Income statt Net** (Research: explizit „Net Income"). Macht TrueRate systematisch zu hoch.
  - 🐛 `yearlyExpense × 15%` als workCosts ist Pauschale, mischt Geschäftlich+Privat
  - ⚠️ Default `hiddenHoursPct=25%` zu konservativ (Research-Range 33-100%)
- **Empfehlungen:**
  - 🐛 Net Income statt Brutto: `(yearlyIncome - taxReserve) - workCosts`
  - 🐛 `totalBizExpense` als workCosts-Basis
  - 💡 Default `hiddenHoursPct=50%` (Research-Median)
  - 💡 Nominal-vs-True-Diff prominenter (visueller Schock)
  - 📚 Buyback Rate (Research §6, Dan Martell)

### Widget 19 · `kosten-lebensstunde` ⏳

- **Frage:** Was kostet eine Stunde meines Lebens?
- **Code (Z.12302):** `monthExp / 480` (480 = ~16h × 30)
- **Research §6:** Cost of a Life Hour = `Total Monthly Expenses / Waking Hours per Month`
- **Findings:**
  - ✅ Direkt aus Research
  - 🐛 `totalExpense` mischt Geschäftlich+Privat (S1) — konzeptionell falsch (Lebenshaltung sollte privat sein)
  - 🐛 Einheit `/h` fehlt am Hauptwert
  - ⚠️ Keine Verknüpfung zu `lebensenergie.trueRate` — verschenkter aha-Moment
- **Empfehlungen:**
  - 🐛 Privat-Filter (Strategie-Eskalation)
  - 🐛 Einheit `/h` ergänzen
  - 💡 Verknüpfung zu `lebensenergie`: „1 Lebensstunde = 0.27 Arbeitsstunden bei trueRate"
  - 💡 Konkrete Beispiele im Detail (Monthly Tabulation, Research §6)

### Widget 20 · `portfolio-life` 🧩

- **Frage:** Wie verteilt sich meine Zeit?
- **Code (Z.12315):** Top-4 Clockify-Projekte nach Stunden
- **Research §4:** **Portfolio Life** (Charles Handy): paid / gift / study / home / leisure (5 Bereiche)
- **Findings:**
  - 🐛 **Konzept-Drift**: Code zeigt Projekt-Top4, nicht Portfolio Life Klassifikation. Name verspricht mehr als Inhalt.
  - 🐛 3-Kategorien-Modell (auftrag/heart/overhead) nicht aus Research
  - ⚠️ Anteile/Prozent fehlen
- **Empfehlungen:**
  - 🐛 **Aufgelöst durch DS2 Block B**: 5+1-Kategorien-Modell (paid/gift/study/home/overhead/leisure-Schätzwert) wird in DS2 architektonisch verankert. Widget rebuild auf neue Klassifikation.
  - 💡 Stacked-Bar mit Anteilen
  - 📚 Niko Paech Balance, Care-to-Market Ratio (Research §4)

### Widget 21 · `sabbatical` 🏖️

- **Frage:** Wie nahe bin ich einem Sabbatical?
- **Code (Z.12418):** `pct = freedomMonths / targetMonths × 100`. Default `targetMonths=10`.
- **Research §5:** Sabbatical Readiness Index. Research-Schwellwerte: <3 not ready, **6-12 good**, 12+ excellent.
- **Findings:**
  - ✅ Konzept aligned
  - 🐛 Erbt `freedomMonths`-Drift
  - ⚠️ Default 10 Monate vs. Research-Standard 12
- **Empfehlungen:**
  - 💡 Default 12 Monate
  - 💡 Research-konforme Schwellwerte (absolute Monate, nicht nur pct)
  - 💡 Toggle für Sabbatical-Länge (3/6/12/24)
  - 📚 **Konzept-Konsolidierung** (siehe systemischer Befund S4)

### Widget 22 · `burnout-risk` 🔥 (comingSoon)

- **Konzept-Audit:** sinnvolles comingSoon, `requires: ['clockify-timestamps']`
- **Research §5:** Consecutive workdays, Workday span, Overwork weeks, Declining hourlyRate, Maslach proxies
- **Empfehlungen:**
  - 📚 **DS2-Hebel**: Granulare Timestamps im TimeAdapter (DS2 Block A) entblockt diese Widget-Klasse
  - 📚 Plus Recovery-to-Work, Recovery Day Frequency, Workday Span (alle Research §5)

### Widget 23 · `enough-point` 🪷 (comingSoon)

- **Konzept-Audit:** Fulfillment Curve (Vicki Robin), `requires: ['checkin']`
- **Research §4:** Survival → Comfort → Luxury → **Enough** → Overconsumption
- **Empfehlungen:**
  - 📚 **Modulare Implementation**: Jevons Paradox Personal + Income-Plateau auto-derived (kein Check-in nötig). Fulfillment Curve check-in basiert.
  - 📚 Income Plateau: bei CH-User mit Income > CHF 120k „Du bist im Kahneman-Plateau" (Research §4)

### Widget 24 · `doughnut` 🍩 (comingSoon)

- **Konzept-Audit:** Personal Doughnut (Kate Raworth), `requires: ['checkin']`
- **Research §4:** **„This is genuine whitespace — no app has built individual-level Doughnut."**
- **Empfehlungen:**
  - 📚 **Strategischer USP-Kandidat** für FinanceBird-Differenzierung
  - 📚 Inner Ring zuerst (4 von 7 Dimensionen auto-derivable)
  - 📚 Outer Ring später via Spending-Kategorie-Mapping × CO₂-Faktoren

---

## 📊 Konsolidierte Issue-Liste

### Kategorisierung

| Typ | Anzahl |
|---|---|
| 🐛 Bug (math/konzeptionell falsch) | 17 |
| 💡 Erweiterung (Daten da, Mehrwert klar) | 16 |
| 📚 Research-Lücke (neue Metrik) | 12 |
| **Total** | **45** |

### Gesamt-Tabelle (45 Issues)

| ID | Widget | Typ | Beschreibung |
|---|---|---|---|
| AUDIT-001 | 4 Widgets | 🐛 systemisch | Geschäftlich/Privat-Mix (siehe S1) |
| AUDIT-002 | profit | 🐛 | Brutto vor Steuer/AHV statt Net Profit |
| AUDIT-003 | cashflow-chart | 🐛 | Default zeigt unbestätigte Buchungen |
| AUDIT-004 | puffer | 🐛 | Hartcodierter `'buffer'`-Match + fixes Goal CHF 5k statt 6×Monatsausgaben |
| AUDIT-005 | vermoegen | 🐛 | Schulden nicht abgezogen |
| AUDIT-006 | liquiditaet | 💡 | Konto-Auswahl willkürlich (erstes statt aggregiert) |
| AUDIT-007 | steuer-score | 💡 | Geometric Mean statt Arithmetic |
| AUDIT-008 | offene-rechnungen | 💡 | DSO + ältester Überfälliger fehlen |
| AUDIT-009 | einnahmen, ausgaben | 💡 | Kein YoY-Vergleich |
| AUDIT-010 | liquiditaet | 💡 | Schwellwerte fehlen |
| AUDIT-011 | steuer-score | 📚 | Regional-Spezifika (Pillar 3a, KSK, GFB) |
| AUDIT-012 | stundensatz | 💡 | Nur 1 von 6 Research-Methoden |
| AUDIT-013 | auslastung | 🐛 | Nenner-Drift (totalHours statt availableHours) |
| AUDIT-014 | auslastung | 💡 | Schwellwerte fehlen |
| AUDIT-015 | deckungsbeitrag | 🐛 BUG-075 | Konzeptioneller Bug — `fixCosts/effectiveRate` statt mit DB |
| AUDIT-016 | runway | 💡 | Privatentnahmen ignoriert |
| AUDIT-017 | runway | 💡 | Volatilitäts-adjustierte Schwellwerte |
| AUDIT-018 | abo-kosten | 🐛 | `/12` von YTD verzerrt unterm Jahr — Recurrings nutzen |
| AUDIT-019 | abo-kosten | 🐛 | Hardcoded englische Keyword-Liste |
| AUDIT-020 | kundenkonzentration | 🐛 | Schwellwerte zu lasch (rot erst >5000) |
| AUDIT-021 | kundenkonzentration | 🐛 | Float-Rundung + Year-Filter via `date` + Teilzahlungen ignoriert |
| AUDIT-022 | kundenkonzentration | 💡 | **Client Dependency Ratio fehlt** (CH 5/6-Regel) |
| AUDIT-023 | kundenkonzentration | 💡 | Effective Number of Clients (10.000/HHI) |
| AUDIT-024 | steuerreserve | 🐛 | Erbt Geschäft/Privat-Drift |
| AUDIT-025 | steuerreserve | 🐛 | AHV-Mindestbeitrag CHF 530 bei Verlust |
| AUDIT-026 | steuerreserve | 💡 | Pauschal 33% statt progressiv |
| AUDIT-027 | steuerreserve | 📚 | DACH-Spezifika (Pillar 3a / KSK / GFB) |
| AUDIT-028 | freiheit | 🐛 | Geschäftlich/Privat in `avgMonthlyExpense` |
| AUDIT-029 | freiheit | 🐛 | Erbt totalWealth-Drift (Schulden) |
| AUDIT-030 | freiheit | 🐛 | Sentinel 999 vs. ∞ Inkonsistenz |
| AUDIT-031 | freiheit | 💡 | Schwellwerte erweitern (24+ = F-You Money) |
| AUDIT-032 | freiheit | 📚 | FI Number / Coast FI fehlen |
| AUDIT-033 | lebensenergie | 🐛 | Brutto statt Net + Pauschale 15% workCosts |
| AUDIT-034 | lebensenergie | 💡 | Default `hiddenHoursPct` 25% zu konservativ |
| AUDIT-035 | lebensenergie | 💡 | Buyback Rate / Nominal-vs-True visueller Schock |
| AUDIT-036 | kosten-lebensstunde | 🐛 | Gemischte Expenses + fehlende Einheit |
| AUDIT-037 | kosten-lebensstunde | 💡 | Verknüpfung zu lebensenergie |
| AUDIT-038 | portfolio-life | 🐛 | **Konzept-Drift** — Top4 statt Handy-5-Bereiche (aufgelöst durch DS2 Block B) |
| AUDIT-039 | portfolio-life | 💡 | Anteile/Prozent fehlen |
| AUDIT-040 | sabbatical | 💡 | Default 10 → 12 Monate, Schwellwerte schärfen |
| AUDIT-041 | sabbatical | 📚 | Toggle für Sabbatical-Länge |
| AUDIT-042 | freiheit/sabbatical/runway/puffer | 📚 | **Konzept-Konsolidierung** (S4) |
| AUDIT-043 | burnout-risk | 📚 | DS2-TimeAdapter mit granularen Timestamps (entschieden) |
| AUDIT-044 | enough-point | 📚 | Modulare Implementation (Jevons + Plateau auto-derived) |
| AUDIT-045 | doughnut | 📚 | Strategischer USP-Kandidat |

---

## 🔬 Systemische Cross-Widget-Befunde (7)

### S1 · Geschäftlich/Privat-Drift (10 Widgets)

10 Widgets mischen alle Buchungen, ohne nach `bereich` zu filtern: `einnahmen`, `ausgaben`, `profit`, `cashflow-chart`, `stundensatz`, `lebensenergie`, `kosten-lebensstunde`, `freiheit`, `steuerreserve`, `abo-kosten`. `runway` und `steuer-score` filtern korrekt. **Inkonsistenz innerhalb des Cockpits.**

**Strategie-Beschluss S37:** Bereich-Filter-Toggle pro Widget mit sinnvollem Default. Sicht- und editierbar in Cockpit-Übersicht. Persistiert in `fb_cockpit_widget_config`.

### S2 · Profit-Definition

„Profit" ist Brutto vor Steuer/AHV. „Tax Reserve" rechnet auf falscher Basis. „Lebensenergie" nimmt Brutto-Income.

**Strategie-Beschluss S37:** Einheitliche `Computed.netProfit()` mit Wasserfall-Display (Erträge → Aufwand → Rohgewinn → Steuern/AHV → Nettogewinn). Buchhalterisch transparent.

### S3 · Schwellwerte unsystematisch

Widgets nutzen ad-hoc Thresholds, manche Research-konform, manche nicht. Kein zentrales Schwellwert-Schema.

**Empfehlung:** Schwellwert-Modul als zentrale Quelle, pro Widget Research-Anker dokumentieren. Sprint-9-Item.

### S4 · Konzept-Konkurrenz „Monate-Reserven" (4 Widgets)

`runway`, `freiheit`, `sabbatical`, `puffer` messen alle „Monate", mit verschiedenen Annahmen.

**Strategie-Beschluss S37:** Reserven-Achse:
- `runway` bleibt eigenständig (Geschäfts-Sicht)
- `puffer` → **`notgroschen`** umbenannt (Buchhaltung, 0–6M, dynamisches Goal `6× avgMonthlyExpense`)
- `sabbatical` (Kompass, 6–24M, konfigurierbares Goal)
- `freiheit` umgebaut auf FI Number (Kompass, 24+M / lebenslang)

### S5 · Research-Lücken mit strategischem Wert

Hochwertige Erweiterungen mit niedriger Implementations-Hürde:
- Client Dependency Ratio (CH 5/6-Regel) — AUDIT-022
- Effective Number of Clients — AUDIT-023
- DSO + ältester Überfälliger — AUDIT-008
- Subscription Decoupling Score — AUDIT-018-Sub
- Buyback Rate — AUDIT-035

### S6 · DS2-Hebel: TimeAdapter-Schema

Granulares Time-Entry-Schema entblockt: `burnout-risk`, Weekend Work, Evening Work, Deep Work Ratio, Workday Span — eine ganze Klasse Research-Metriken §5.

**Strategie-Beschluss S37:** Granulare Timestamps in TimeAdapter-Schema (DS2 Block A entschieden).

### S7 · `doughnut` als USP-Kandidat

Research nennt explizit „genuine whitespace". Strategischer Differenzierungs-Hebel.

**Strategie-Empfehlung:** DS3-Priorisierung als Differenzierungs-Hebel.

---

## 🎯 Empfohlene Backlog-Priorisierung

### Sofort (Bug-Fixes mit User-Sichtbarkeit, nach DS2)
1. **AUDIT-018** abo-kosten: `Store.recurrings`-basiert
2. **AUDIT-015 / BUG-075**: Deckungsbeitrag konzeptionell fixen (DS2 Block C-Pfad)
3. **AUDIT-020** kundenkonzentration: Schwellwerte
4. **AUDIT-029** freiheit: Schulden abziehen

### Strategie-Implementation (nach DS2 Beschlüsse)
5. Bereich-Filter-Toggle (S1) pro Widget
6. `Computed.netProfit()` einheitlich (S2)
7. Reserven-Achse-Umbau (S4): puffer→notgroschen, freiheit auf FI
8. TimeAdapter granular (S6) — DS2 Block A
9. `kostenart`-Hybrid + Default-Mapping — DS2 Block C

### Hochwertige Erweiterungen (S5)
10. **AUDIT-022 + AUDIT-023**: Client Dependency Ratio + Effective Clients
11. **AUDIT-008**: DSO + ältester Überfälliger
12. **AUDIT-035**: Buyback Rate / Nominal-vs-True-Diff

### Längerfristig (USP)
13. **AUDIT-045**: Doughnut Inner Ring als Differenzierung
14. **AUDIT-044**: enough-point modular (Jevons + Plateau auto-derived)

### Sprint-Verteilung (Vorschlag)
- **Sprint 7** = DS2-Implementation: Block A (TimeAdapter granular) + Block B (Klassifikation 5+1) + Block C-Phase-1 (Variable-Kosten Default-Mapping)
- **Sprint 8** = bestehende Architektur-Items (GSheets, A13-Nachrüstung, FXCache γ-Refactor) bleiben
- **Sprint 9** = Bug-Fixes + Quick Wins aus Audit (AUDIT-001/002/004/005/008/018/020/022/023/029/035)
- **Sprint 10** (NEU) = Reserven-Achse-Umbau (S4) + S2-Profit-Wasserfall

---

## Aus diesem Audit hervorgegangene Strategie-Beschlüsse (S37)

Volltext in `strategie_kontext.md` und `MASTER.md`.

1. **Bereich-Filter-Toggle pro Widget** — sicht- und editierbar im Cockpit, default je Widget passend
2. **Profit-Definition einheitlich + buchhalterisch transparent** — Wasserfall-Display
3. **Reserven-Achse**: `runway` separat, `puffer→notgroschen` (0-6M), `sabbatical` (6-24M), `freiheit` (FI / lebenslang)
4. **TimeAdapter mit granularen Timestamps** — entblockt Burnout-Widget-Klasse
5. **Architektur-Regel A15 · Data-Reliability-First** (NEU) — bindend für alle Migrationen
6. **Design-Prinzip 11 · Präzision dort, wo sie zählt** (NEU) — Klasse A vs B
7. **Design-Prinzip 1 Sub-Punkt: „Why-First Tagging"** — User-Pflege-Aufgaben mit Mehrwert-Kommunikation
8. **Tab-Naming**: „Aktivitäten" / „Activities" bleibt. „Projekte" als App-Begriff gestrichen.

---

*FinanceBird · widget_audit_S37.md · 2026-04-29 · Session 37 · Oswald H. König + Claude*
