const width = 1200;
const height = 650;
const svg = d3.select("#viz");

let currentScene = 1;
let selectedStartYear = 1990;
let selectedEndYear = 2022;
let selectedCountry = null;
let data2022, dataGlobal, dataScatter, dataWorld;

const countryNameMap = {
    "United States of America": "United States",
    "Russian Federation": "Russia",
    "Korea, Rep.": "South Korea",
    "Korea, Democratic People's Republic of": "North Korea",
    "Viet Nam": "Vietnam",
    "Czechia": "Czech Republic",
    "Iran (Islamic Republic of)": "Iran",
    "Egypt, Arab Rep.": "Egypt",
};


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

d3.select("#prevButton").on("click", () => {
    if (currentScene > 1) currentScene--;
    updateVisualization();
});
d3.select("#nextButton").on("click", () => {
    if (currentScene < 3) currentScene++;
    updateVisualization();
});

document.addEventListener("keydown", e => {
    if (e.key === "ArrowRight" && currentScene < 3) currentScene++;
    if (e.key === "ArrowLeft" && currentScene > 1) currentScene--;
    updateVisualization();
});

function validateYearRangeAndUpdate() {
    svg.selectAll(".year-error-text").remove();

    if (selectedStartYear >= selectedEndYear) {
        svg.append("text")
            .attr("class", "year-error-text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "red")
            .attr("font-size", "24px")
            .attr("font-weight", "bold")
            .text("Error: Start year must be earlier than end year");
        return;
    }

    updateVisualization();
}

d3.select("#startYearInput").on("input", function () {
    selectedStartYear = +this.value;
    d3.select("#startYearValue").text(selectedStartYear);
    validateYearRangeAndUpdate();
});

d3.select("#endYearInput").on("input", function () {
    selectedEndYear = +this.value;
    d3.select("#endYearValue").text(selectedEndYear);
    validateYearRangeAndUpdate();
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
    updateProgressBar();
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

function updateProgressBar() {
    d3.selectAll(".step-circle")
        .classed("active", function () {
            return +this.dataset.step === currentScene;
        });
}


function drawScene1() {
    const projection = d3.geoMercator().scale(150).translate([width / 2, height / 1.5]);
    const path = d3.geoPath().projection(projection);

    const validCO2 = data2022.filter(d => !isNaN(d.co2) && d.co2 > 0 && d.country);
    // console.log("=============");
    // console.log(validCO2);
    // console.log("=============");
    const maxVal = d3.max(validCO2, d => d.co2);
    const colorScale = d3.scaleSequentialLog(d3.interpolateYlOrRd)
        .domain([1, maxVal])
        .clamp(true);

    svg.selectAll("path")
        .data(topojson.feature(dataWorld, dataWorld.objects.countries).features)
        .enter().append("path")
        .attr("d", path)
        .attr("fill", d => {
            let name = d.properties.name;
            if (countryNameMap[name]) {
                name = countryNameMap[name];
            }
            const countryData = validCO2.find(e => e.country.toLowerCase() === name.toLowerCase());
            return countryData ? colorScale(countryData.co2) : "#eee";
        })
        .attr("stroke", "#333")
        .on("click", (event, d) => {
            let name = d.properties.name;
            if (countryNameMap[name]) {
                name = countryNameMap[name];
            }
            selectedCountry = data2022.find(e => e.country.toLowerCase() === name.toLowerCase())?.country || null;
            if (currentScene === 3) updateVisualization();
        })
        .on("mouseover", (event, d) => {
            let name = d.properties.name;
            if (countryNameMap[name]) {
                name = countryNameMap[name];
            }
            const countryData = validCO2.find(e => e.country.toLowerCase() === name.toLowerCase());
            if (countryData && !isNaN(countryData.co2)) {
                formatTooltip(event, `${countryData.country}<br>CO2: ${Math.round(countryData.co2)} Mt`);
            }
        })
        .on("mouseout", hideTooltip);


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

    svg.selectAll(".annotation-group").remove();

    const x = d3.scaleLog()
        .domain([1000, d3.max(dataScatter, d => +d.gdp)])
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(dataScatter, d => +d.co2_per_capita)])
        .range([height - margin.bottom, margin.top]);

    const r = d3.scaleSqrt()
        .domain([0, d3.max(dataScatter, d => +d.population)])
        .range([2, 20]);

    const formatGDP = d => {
        const num = +d;
        if (num >= 1e12) return `$${(num / 1e12).toFixed(1)}T`;
        if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
        return `$${num.toLocaleString()}`;
    };

    const formatCO2 = d3.format(".1f");


    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("$.2s")));

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));


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
            formatTooltip(event,
                `${d.country}<br>CO₂/Capita: ${formatCO2(d.co2_per_capita)} t<br>GDP: ${formatGDP(d.gdp)}`
            );
        })
        .on("mouseout", hideTooltip);


    const qatar = dataScatter.find(d => d.country === "Qatar");
    if (qatar) {
        const xPos = x(+qatar.gdp);
        const yPos = y(+qatar.co2_per_capita);

        // Adjust dx/dy based on proximity to edges
        const padding = 50;
        const dx = xPos > width - padding ? -60 : 40;
        const dy = yPos < padding ? 50 : -40;

        svg.append("g")
            .call(d3.annotation().type(d3.annotationLabel).annotations([
                {
                    note: {
                        label: "High GDP, High Emissions",
                        title: "Qatar"
                    },
                    x: xPos,
                    y: yPos,
                    dx: dx,
                    dy: dy
                }
            ]));
    }

}

d3.selectAll(".step-circle").on("click", function () {
    const step = +this.dataset.step;
    if (step !== currentScene) {
        currentScene = step;
        updateVisualization();
    }
});
