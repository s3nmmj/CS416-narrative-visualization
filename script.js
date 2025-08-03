const width = 960;
const height = 500;
const svg = d3.select("#viz");

// Parameters
let currentScene = 1;
let selectedYear = 2022; // Updated to 2022
let selectedCountry = null; // For highlighting in Scene 3
let data2022, dataGlobal, dataScatter, dataWorld;

// Load data
Promise.all([
    d3.csv("data/co2_2022.csv"),
    d3.csv("data/co2_global_1990_2022.csv"),
    d3.csv("data/co2_scatter_2022.csv"),
    d3.json("data/world.topojson")
]).then(([co2_2022, co2_global, co2_scatter, world]) => {
    data2022 = co2_2022;
    dataGlobal = co2_global;
    dataScatter = co2_scatter;
    dataWorld = world;
    updateVisualization();
}).catch(error => console.error("Error loading data:", error));

// Triggers: Navigation buttons
d3.select("#prevButton").on("click", () => {
    if (currentScene > 1) {
        currentScene--;
        updateVisualization();
    }
});
d3.select("#nextButton").on("click", () => {
    if (currentScene < 3) {
        currentScene++;
        updateVisualization();
    }
});

// Update visualization based on current scene
function updateVisualization() {
    svg.html(""); // Clear SVG
    d3.select("#prevButton").property("disabled", currentScene === 1);
    d3.select("#nextButton").property("disabled", currentScene === 3);

    if (currentScene === 1) drawScene1();
    else if (currentScene === 2) drawScene2();
    else if (currentScene === 3) drawScene3();
}

// Scene 1: World Map
function drawScene1() {
    const projection = d3.geoMercator().scale(150).translate([width / 2, height / 1.5]);
    const path = d3.geoPath().projection(projection);
    const colorScale = d3.scaleSequentialLog(d3.interpolateReds)
        .domain([1, d3.max(data2022, d => +d.co2)]);

    // Render map
    svg.append("g")
        .selectAll("path")
        .data(topojson.feature(dataWorld, dataWorld.objects.countries).features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", d => {
            const country = data2022.find(c => c.iso_code === d.id);
            return country ? colorScale(+country.co2) : "#ccc";
        })
        .attr("stroke", "#333")
        .style("cursor", "pointer")
        .on("click", (event, d) => {
            selectedCountry = data2022.find(c => c.iso_code === d.id)?.country || null;
            if (currentScene === 3) updateVisualization();
        })
        .on("mouseover", (event, d) => {
            const country = data2022.find(c => c.iso_code === d.id);
            if (country) {
                d3.select("#tooltip")
                    .style("opacity", 1)
                    .html(`${country.country}<br>CO2: ${Math.round(country.co2)} Mt`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            }
        })
        .on("mouseout", () => d3.select("#tooltip").style("opacity", 0));

    // Legend
    const legendWidth = 200, legendHeight = 20;
    const legendSvg = svg.append("g")
        .attr("transform", `translate(${width - legendWidth - 20}, ${height - 50})`);
    const legendScale = d3.scaleLinear()
        .domain(colorScale.domain())
        .range([0, legendWidth]);
    const legendAxis = d3.axisBottom(legendScale).ticks(5).tickFormat(d3.format(".0s"));
    legendSvg.append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis);
    legendSvg.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legendGradient)");
    const gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "legendGradient");
    gradient.append("stop").attr("offset", "0%").attr("stop-color", colorScale(colorScale.domain()[0]));
    gradient.append("stop").attr("offset", "100%").attr("stop-color", colorScale(colorScale.domain()[1]));
    legendSvg.append("text")
        .attr("x", 0)
        .attr("y", -5)
        .text("CO2 Emissions (Mt)");

    // Annotations
    const annotations = [
        {
            note: { label: "China: Highest Emitter", title: `${Math.round(data2022.find(c => c.country === "China")?.co2 || 0)} Mt` },
            x: projection([105, 35])[0], y: projection([105, 35])[1],
            dy: -30, dx: 30
        },
        {
            note: { label: "USA: Second Highest", title: `${Math.round(data2022.find(c => c.country === "United States")?.co2 || 0)} Mt` },
            x: projection([-100, 40])[0], y: projection([-100, 40])[1],
            dy: -30, dx: -30
        }
    ];
    svg.append("g")
        .call(d3.annotation().type(d3.annotationLabel).annotations(annotations));
}

// Scene 2: Line Chart
function drawScene2() {
    const margin = { top: 20, right: 20, bottom: 50, left: 60 };
    const x = d3.scaleLinear().domain([1990, 2022]).range([margin.left, width - margin.right]); // Extended to 2022
    const y = d3.scaleLinear().domain([0, d3.max(dataGlobal, d => +d.co2)]).range([height - margin.bottom, margin.top]);

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")))
        .append("text")
        .attr("x", width / 2)
        .attr("y", 40)
        .attr("fill", "black")
        .text("Year");
    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .append("text")
        .attr("x", -margin.left)
        .attr("y", margin.top - 10)
        .attr("fill", "black")
        .text("CO2 Emissions (Mt)");

    svg.append("path")
        .datum(dataGlobal)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(d => x(+d.year))
            .y(d => y(+d.co2)));

    // Annotations
    const annotations = [
        {
            note: { label: "Kyoto Protocol (1997)" },
            x: x(1997), y: y(dataGlobal.find(d => d.year == 1997).co2),
            dy: -30, dx: 0
        },
        {
            note: { label: "Paris Agreement (2015)" },
            x: x(2015), y: y(dataGlobal.find(d => d.year == 2015).co2),
            dy: -30, dx: 0
        }
    ];
    svg.append("g")
        .call(d3.annotation().type(d3.annotationLabel).annotations(annotations));
}

// Scene 3: Scatterplot
function drawScene3() {
    const margin = { top: 20, right: 20, bottom: 50, left: 60 };
    const x = d3.scaleLog().domain([1000, d3.max(dataScatter, d => +d.gdp)]).range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain([0, d3.max(dataScatter, d => +d.co2_per_capita)]).range([height - margin.bottom, margin.top]);
    const r = d3.scaleSqrt().domain([0, d3.max(dataScatter, d => +d.population)]).range([2, 20]);

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(d3.format(".0s")))
        .append("text")
        .attr("x", width / 2)
        .attr("y", 40)
        .attr("fill", "black")
        .text("GDP per Capita ($)");
    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .append("text")
        .attr("x", -margin.left)
        .attr("y", margin.top - 10)
        .attr("fill", "black")
        .text("CO2 per Capita (t)");

    svg.append("g")
        .selectAll("circle")
        .data(dataScatter)
        .enter()
        .append("circle")
        .attr("cx", d => x(+d.gdp))
        .attr("cy", d => y(+d.co2_per_capita))
        .attr("r", d => r(+d.population))
        .attr("fill", d => d.country === selectedCountry ? "blue" : "red")
        .attr("opacity", 0.5)
        .on("mouseover", (event, d) => {
            d3.select("#tooltip")
                .style("opacity", 1)
                .html(`${d.country}<br>CO2 per Capita: ${d.co2_per_capita} t<br>GDP: $${Math.round(d.gdp)}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", () => d3.select("#tooltip").style("opacity", 0));

    // Annotations
    const annotations = [
        {
            note: { label: "High Emissions, High GDP" },
            x: x(dataScatter.find(d => d.country === "Qatar")?.gdp || 0),
            y: y(dataScatter.find(d => d.country === "Qatar")?.co2_per_capita || 0),
            dy: -30, dx: 30
        }
    ];
    svg.append("g")
        .call(d3.annotation().type(d3.annotationLabel).annotations(annotations));
}