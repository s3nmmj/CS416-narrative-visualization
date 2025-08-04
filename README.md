# Global CO₂ Emissions: A Narrative Visualization  
**URL:** <https://s3nmmj.github.io/CS416-narrative-visualization/>  

---

## Abstract  

This essay presents a narrative visualization of global CO₂ emissions, designed as an **interactive slideshow** that moves through geographical, historical, and economic perspectives. Built with D3.js and hosted on GitHub Pages, the project shows how emissions remain uneven—despite decades of climate agreements—by spotlighting major contributors such as China and the United States. Four scenes (introduction, country-level map, timeline, and economic scatterplot) are tied together with uniform annotations, state parameters, and user-triggered interactions (map clicks, year sliders, etc.). The following sections explain how each component—messaging, narrative and visual structure, scenes, annotations, parameters, and triggers—works together to highlight the policy implications of global emissions trends.  

---

## 1 · Messaging  

The visualization makes one urgent point: **carbon dioxide emissions are still highly uneven and closely linked to wealth.** It guides the viewer through three lenses:  

1. **Geography** — Where emissions come from.  
2. **History** — How they’ve changed over time.  
3. **Economics** — How they relate to national income.  

Even after the Kyoto Protocol and Paris Agreement, emissions remain concentrated in a handful of countries—chiefly China and the United States—and GDP per capita is still strongly associated with per-capita emissions. Interactivity lets viewers choose any country, narrow the timeline, and see the patterns for themselves across all three views.

**Data source.** All CO₂-emission and GDP values come from *Our World in Data*’s “CO₂ and Greenhouse Gas Emissions” dataset (July 2025 snapshot) — <https://github.com/owid/co2-data>. The dataset merges UNFCCC inventories with World Bank GDP series, ensuring every country is measured on a single, consistent methodology.  

---

## 2 · Narrative Structure  

The site works like a guided tour with three stops, plus a short orientation: the classic **interactive slideshow** pattern. The order is fixed, but every slide offers hands-on exploration.

### Orientation (Scene 0)  
A welcome screen explains why CO₂ matters and shows the controls: **Next**, **Prev**, arrow keys, and clickable step dots.  
*Figure 1— Introduction showing the welcome text and navigation prompt*

### Scene 1 · Where emissions happen  
Choropleth world map (pale yellow → dark red). Hover reveals exact numbers; a click locks a country for the rest of the tour.  
*Figure 2— Scene 1 showing the world map with China and USA annotations *

### Scene 2 · How emissions have changed  
Dual-line chart: global curve in red, your chosen country in blue (1990-2022). A dual-handle slider zooms any period; vertical rules flag Kyoto (1997) and Paris (2015).  
*Figure 3— Scene 2 with global and United States emission lines*

### Scene 3 · Economic context  
Scatterplot of **CO₂ per capita (y)** vs **GDP per capita (x)**, 2022. Bubble size = population; the selected country stays blue. Outliers like Qatar are annotated.  
*Figure 4— Scene 3 with Qatar annotation and United States highlight*

**Why not martini-glass or drill-down?**  
A martini-glass defers interaction until the end; a drill-down branches too early. The slideshow keeps newcomers oriented while letting data-savvy users poke around mid-story. Each slide still offers hover tooltips, satisfying the “free-form exploration” requirement.

Scene changes fade smoothly; headers, legends, and nav buttons stay put so orientation is never lost.

---

## 3 · Visual Structure  

Every slide shares the same frame:  

* **Header** – centered title + one-line description  
* **Main canvas** – a single SVG for the chart  
* **Footer** – Prev/Next buttons, step dots, slim progress bar  

The SVG rests on a white card with rounded corners and a soft shadow; only the chart inside swaps out.  

* **Scene 0** – Intro text only (Figure 1).  
* **Scene 1** – Map with color legend, China/USA call-outs (Figure 2).  
* **Scene 2** – Dual-line chart + two-handle slider + policy markers (Figure 3).  
* **Scene 3** – Scatterplot (log-x, linear-y) with population bubbles; Qatar annotated (Figure 4).  

ColorBrewer **YlOrRd** is used for the map to remain CVD-safe, and a logarithmic x-axis in Scene 3 prevents high-income outliers from flattening lower-income points. Hover tooltips supply extra detail without clutter.

---

## 4 · Scenes (Why this order?)  

1. **Intro** – Sets expectations and explains controls.  
2. **Map** – Establishes *who* and *where* emissions come from.  
3. **Timeline** – Adds the time dimension so viewers can tell whether a hotspot is new or long-standing.  
4. **Scatterplot** – Pairs emissions with wealth, closing the loop on policy trade-offs.  

Starting wide, then moving to history, then economics, gradually digs into *why* the patterns exist and reinforces the message that emissions are uneven and wealth-linked.

---

## 5 · Annotations  

Uniform template (via *d3-annotation*):  

* small headline + one-line note  
* straight connector ending in a dot  
* 4 px padding top & bottom (wraps at 120 px for mobile)

Where they appear:  

* **Scene 1** – Labels for China & USA.  
* **Scene 2** – Lines for Kyoto (1997) and Paris (2015).  
* **Scene 3** – Label for Qatar as the extreme wealth-emitter outlier.

Annotations draw attention on load—no hover required.

---

## 6 · Parameters  

* `currentScene` – 0 … 3 (driven by buttons, keys, step dots)  
* `selectedStartYear` – left handle of the timeline slider (default 1990)  
* `selectedEndYear` – right handle (default 2022)  
* `selectedCountry` – set by clicking the map; cleared by **Reset**

`updateVisualization()` listens for any change and rebuilds the active chart so scenes stay in sync with the user’s last action.

---

## 7 · Triggers  

* **Prev/Next buttons** – increment / decrement `currentScene`; disabled at edges.  
* **Arrow keys** – mirror the buttons.  
* **Step dots** – jump straight to a scene; active dot turns blue.  
* **Country click** – sets `selectedCountry`; tooltip confirms the value.  
* **Year slider** – adjusts `selectedStartYear` or `selectedEndYear`; inline warning if handles cross.  
* **Reset** – clears `selectedCountry`.  
* **Touch devices** – taps replace clicks; horizontal swipe flips slides, mirroring arrow-key behavior.

Controls are color-coded and respond instantly, making the interaction model obvious.

---

## 8 · Conclusion  

The visualization uses an interactive slideshow—supported by consistent visuals, annotations, parameters, and triggers—to show where emissions are concentrated, how they’ve evolved, and how they tie to wealth. Explore it live at  
<https://s3nmmj.github.io/CS416-narrative-visualization/>  

Source code: <https://github.com/s3nmmj/CS416-narrative-visualization>
