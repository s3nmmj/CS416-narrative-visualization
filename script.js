// Global Variables
const width = 960;
const height = 500;
const svg = d3.select("#viz");

let currentScene = 1;
let selectedStartYear = 1990;
let selectedEndYear = 2022;
let selectedCountry = null;
let data2022, dataGlobal, dataScatter, dataWorld;

// Load data
Promise.all([
  d3.csv("data/co2_2022.csv"),
  d3.csv("data/co2_global_1990_2022.csv"),
  d3.csv("data/co2_scatter_2022.csv"),
  d3.json("data/world.topojson")
]).then(([co2_2022, co2_global, co2_scatter, world]) => {
  data2022 = co2_2022.map(d => ({ ...d, co2: +d.co2 }));
  dataGlobal = co2_global;
  dataScatter = co2_scatter;
  dataWorld = world;
  updateVisualization();
});

// Navigation Triggers
d3.select("#prevButton").on("click", () => {
  if (currentScene > 1) currentScene--;
  updateVisualization();
});
d3.select("#nextButton").on("click", () => {
  if (currentScene < 3) currentScene++;
  updateVisualization();
});

// Keyboard Support
document.addEventListener("keydown", e => {
  if (e.key === "ArrowRight" && currentScene < 3) currentScene++;
  if (e.key === "ArrowLeft" && currentScene > 1) currentScene--;
  updateVisualization();
});

d3.select("#startYearInput").on("input", function () {
  selectedStartYear = +this.value;
  d3.select("#startYearValue").text(selectedStartYear);
  updateVisualization();
});

d3.select("#endYearInput").on("input", function () {
  selectedEndYear = +this.value;
  d3.select("#endYearValue").text(selectedEndYear);
  updateVisualization();
});

function updateVisualization() {
  svg.transition().duration(200).style("opacity", 0).on("end", () => {
    svg.html("");
    d3.select("#prevButton").property("disabled", currentScene === 1);
    d3.select("#nextButton").property("disabled", currentScene === 3);
    d3.select("#stepIndicator").text(`Step ${currentScene} of 3`);

    if (currentScene === 1) drawScene1();
    else if (currentScene === 2) drawScene2();
    else if (currentScene === 3) drawScene3();

    svg.transition().duration(200).style("opacity", 1);
  });

  d3.select("#sceneTitle").text(
    currentScene === 1 ? "Scene 1: CO2 Emissions by Country (2022)" :
    currentScene === 2 ? "Scene 2: Global CO2 Emissions Over Time" :
    "Scene 3: CO2 vs GDP per Capita (2022)"
  );
  d3.select("#yearSlider").style("display", currentScene === 2 ? "flex" : "none");
}

function formatTooltip(event, html) {
  d3.select("#tooltip")
    .style("opacity", 1)
    .html(html)
    .style("left", `${event.pageX + 10}px`)
    .style("top", `${event.pageY - 10}px`);
}
function hideTooltip() {
  d3.select("#tooltip").style("opacity", 0);
}

function drawScene1() {
  const projection = d3.geoMercator().scale(150).translate([width / 2, height / 1.5]);
  const path = d3.geoPath().projection(projection);

  // Filter valid CO2 data and calculate max value
  const validCO2 = data2022.filter(d => !isNaN(d.co2) && d.co2 > 0 && d.iso_code);
  const maxVal = d3.max(validCO2, d => d.co2);
  const colorScale = d3.scaleSequentialLog(d3.interpolateYlOrRd)
    .domain([1, maxVal])
    .clamp(true); // Ensure values outside domain are clamped to min/max

  // Draw countries with color based on CO2 emissions
  svg.selectAll("path")
    .data(topojson.feature(dataWorld, dataWorld.objects.countries).features)
    .enter().append("path")
    .attr("d", path)
    .attr("fill", d => {
      const countryData = validCO2.find(e => e.iso_code === d.id);
      return countryData ? colorScale(countryData.co2) : "#eee"; // Default to light gray if no data
    })
    .attr("stroke", "#333")
    .on("click", (event, d) => {
      selectedCountry = data2022.find(c => c.iso_code === d.id)?.country || null;
      if (currentScene === 3) updateVisualization();
    })
    .on("mouseover", (event, d) => {
      const countryData = validCO2.find(c => c.iso_code === d.id);
      if (countryData && !isNaN(countryData.co2)) {
        formatTooltip(event, `${countryData.country}<br>CO2: ${Math.round(countryData.co2)} Mt`);
      }
    })
    .on("mouseout", hideTooltip);

  // Legend setup
  const legendWidth = 200, legendHeight = 10;
  const legendScale = d3.scaleLog().domain([1, maxVal]).range([0, legendWidth]);
  const legendAxis = d3.axisBottom(legendScale).ticks(5, ".0s");

  const defs = svg.append("defs");
  const linearGradient = defs.append("linearGradient").attr("id", "legendGradient");
  linearGradient.append("stop").attr("offset", "0%").attr("stop-color", colorScale(1));
  linearGradient.append("stop").attr("offset", "100%").attr("stop-color", colorScale(maxVal));

  const legend = svg.append("g").attr("transform", `translate(${width - legendWidth - 40}, ${height - 40})`);
  legend.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#legendGradient)");
  legend.append("g").attr("transform", `translate(0, ${legendHeight})`).call(legendAxis);
  legend.append("text").attr("x", 0).attr("y", -5).text("CO2 Emissions (Mt)");

  // Annotations
  svg.append("g").call(d3.annotation().type(d3.annotationLabel).annotations([
    {
      note: { label: "China: Highest Emitter", title: `${Math.round(data2022.find(c => c.country === "China")?.co2 || 0)} Mt` },
      x: projection([105, 35])[0], y: projection([105, 35])[1], dy: -30, dx: 30
    },
    {
      note: { label: "USA: Second Highest", title: `${Math.round(data2022.find(c => c.country === "United States")?.co2 || 0)} Mt` },
      x: projection([-100, 40])[0], y: projection([-100, 40])[1], dy: -30, dx: -30
    }
  ]));
}

function drawScene2() {
  const margin = { top: 20, right: 20, bottom: 50, left: 60 };
  const filtered = dataGlobal.filter(d => +d.year >= selectedStartYear && +d.year <= selectedEndYear);

  const x = d3.scaleLinear()
    .domain([selectedStartYear, selectedEndYear])
    .range([margin.left, width - margin.right])
    .nice();
  const y = d3.scaleLinear()
    .domain([20000, d3.max(filtered, d => +d.co2)])
    .range([height - margin.bottom, margin.top])
    .nice();

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(Math.max(2, selectedEndYear - selectedStartYear + 1)));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  svg.append("path")
    .datum(filtered)
    .attr("fill", "none")
    .attr("stroke", "red")
    .attr("stroke-width", 2)
    .attr("d", d3.line()
      .x(d => x(+d.year))
      .y(d => y(+d.co2)));

  const annotations = [];
  if (selectedStartYear <= 1997 && selectedEndYear >= 1997) {
    const kyoto = filtered.find(d => d.year == 1997);
    if (kyoto) annotations.push({ note: { label: "Kyoto Protocol (1997)" }, x: x(1997), y: y(kyoto.co2), dy: -30, dx: 0 });
  }
  if (selectedStartYear <= 2015 && selectedEndYear >= 2015) {
    const paris = filtered.find(d => d.year == 2015);
    if (paris) annotations.push({ note: { label: "Paris Agreement (2015)" }, x: x(2015), y: y(paris.co2), dy: -30, dx: 0 });
  }
  svg.append("g").call(d3.annotation().type(d3.annotationLabel).annotations(annotations));
}

function drawScene3() {
  const margin = { top: 40, right: 20, bottom: 50, left: 60 };
  const x = d3.scaleLog().domain([1000, d3.max(dataScatter, d => +d.gdp)]).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([0, d3.max(dataScatter, d => +d.co2_per_capita)]).range([height - margin.bottom, margin.top]);
  const r = d3.scaleSqrt().domain([0, d3.max(dataScatter, d => +d.population)]).range([2, 20]);

  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).tickFormat(d3.format(".0s")));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));

  svg.append("g")
    .selectAll("circle")
    .data(dataScatter)
    .enter().append("circle")
    .attr("cx", d => x(+d.gdp))
    .attr("cy", d => y(+d.co2_per_capita))
    .attr("r", d => r(+d.population))
    .attr("fill", d => d.country === selectedCountry ? "blue" : "red")
    .attr("opacity", 0.5)
    .on("mouseover", (event, d) => {
      formatTooltip(event, `${d.country}<br>CO2/capita: ${d.co2_per_capita} t<br>GDP: $${Math.round(d.gdp)}`);
    })
    .on("mouseout", hideTooltip);

  svg.append("g").call(d3.annotation().type(d3.annotationLabel).annotations([
    {
      note: { label: "High GDP, High Emissions", title: "Qatar" },
      x: x(dataScatter.find(d => d.country === "Qatar")?.gdp || 0),
      y: y(dataScatter.find(d => d.country === "Qatar")?.co2_per_capita || 0),
      dy: -40, dx: 40
    }
  ]));
}