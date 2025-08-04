const width = 1200;
const height = 650;
const svg = d3.select("#viz");

let currentScene = 0;
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
    if (currentScene > 0) currentScene--;
    updateVisualization();
});
d3.select("#nextButton").on("click", () => {
    if (currentScene < 3) currentScene++;
    updateVisualization();
});
document.addEventListener("keydown", e => {
    if (e.key === "ArrowRight" && currentScene < 3) currentScene++;
    if (e.key === "ArrowLeft" && currentScene > 0) currentScene--;
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
        d3.select("#prevButton").property("disabled", currentScene === 0);
        d3.select("#nextButton").property("disabled", currentScene === 3);
        d3.select("#stepIndicator").text(
            currentScene === 0 ? "Introduction" :
                `Step ${currentScene} of 3`
        );

        if (currentScene === 0) drawScene0();
        else if (currentScene === 1) drawScene1();
        else if (currentScene === 2) drawScene2();
        else if (currentScene === 3) drawScene3();

        svg.transition().duration(200).style("opacity", 1);
        const showReset = currentScene >= 1 && currentScene <= 3 && selectedCountry !== null;
        d3.select("#reset-container").style("display", showReset ? "block" : "none");

    });

    const sceneTitles = {
        1: "Scene 1: CO₂ Emissions by Country (2022)",
        2: "Scene 2: Global CO₂ Emissions Over Time",
        3: "Scene 3: CO₂ vs GDP per Capita (2022)"
    };

    d3.select("#sceneTitle").text(sceneTitles[currentScene] || "");

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

const annotationStyle = {
    type: d3.annotationLabel,
    connector: {
        end: "dot",
        type: "line",
        lineType: "horizontal"
    },
    note: {
        align: "middle",
        orientation: "topBottom",
        titleFontSize: "12px",
        labelFontSize: "11px",
        padding: 4
    }
};

function drawScene0() {
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 150)
        .attr("text-anchor", "middle")
        .attr("font-size", "32px")
        .attr("fill", "#333")
        .attr("font-weight", "bold")
        .text("Welcome to the Global CO₂ Emissions Visualization");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 200)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("fill", "#666")
        .text("Explore emissions by country, over time, and by GDP correlation.");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 260)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", "#444")
        .text("Use the Next button or → key to begin.");
}

function drawScene1() {
    const projection = d3.geoMercator().scale(150).translate([width / 2, height / 1.5]);
    const path = d3.geoPath().projection(projection);

    if (selectedCountry) {
        svg.append("text")
            .attr("x", width - 20)
            .attr("y", 30)
            .attr("text-anchor", "end")
            .attr("font-size", "18px")
            .attr("fill", "#333")
            .attr("font-weight", "bold")
            .text(`Selected Country: ${selectedCountry}`);
    }

    const validCO2 = data2022.filter(d => !isNaN(d.co2) && d.co2 > 0 && d.country);
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
            updateVisualization(); // This will re-render with the label
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

    // Draw legend
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

    // Annotations for China and USA
    const scene1Annotations = [
        {
            note: {
                title: "China: Highest Emitter",
                label: "China leads all countries in CO₂ emissions — a key global policy focus."
            },
            x: projection([105, 35])[0],
            y: projection([105, 35])[1],
            dx: 180,
            dy: 30
        },
        {
            note: {
                title: "USA: Second Highest",
                label: "Despite efforts, the U.S. remains one of the largest CO₂ contributors."
            },
            x: projection([-100, 40])[0],
            y: projection([-100, 40])[1],
            dx: -120,
            dy: 80
        }
    ];

    svg.append("g")
        .call(d3.annotation()
            .type(annotationStyle.type)
            .annotations(scene1Annotations)
            .accessors({ x: d => d.x, y: d => d.y })
            .accessorsInverse({ x: d => d.x, y: d => d.y }));
}

function drawScene2() {
    const margin = { top: 20, right: 20, bottom: 50, left: 60 };

    const filtered = dataGlobal.filter(d => {
        const year = +d.year;
        return year >= selectedStartYear && year <= selectedEndYear;
    });

    const worldData = filtered.filter(d => d.country.toLowerCase() === "world");
    const countryData = selectedCountry
        ? filtered.filter(d => d.country === selectedCountry)
        : [];

    const x = d3.scaleLinear()
        .domain([selectedStartYear, selectedEndYear])
        .range([margin.left, width - margin.right])
        .nice();

    const y = d3.scaleLinear()
        .domain([
            0,
            d3.max([...worldData, ...countryData], d => +d.co2)
        ])
        .range([height - margin.bottom, margin.top])
        .nice();

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    svg.append("path")
        .datum(worldData)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(d => x(+d.year))
            .y(d => y(0)))
        .transition()
        .duration(1000)
        .attr("d", d3.line()
            .x(d => x(+d.year))
            .y(d => y(+d.co2)));


    if (countryData.length > 0) {
        svg.append("path")
            .datum(countryData)
            .attr("fill", "none")
            .attr("stroke", "blue")
            .attr("stroke-width", 2)
            .attr("d", d3.line()
                .x(d => x(+d.year))
                .y(d => y(+d.co2)));

        // const lastPoint = countryData[countryData.length - 1];
        // svg.append("text")
        //     .attr("x", x(+lastPoint.year) + 6)
        //     .attr("y", y(+lastPoint.co2))
        //     .attr("fill", "blue")
        //     .style("font-size", "14px")
        //     .text(`Selected: ${selectedCountry}`);
        const midIndex = Math.floor(countryData.length / 2);
        const midYear = +countryData[midIndex].year;
        const midCO2 = +countryData[midIndex].co2;

        svg.append("text")
            .attr("x", x(midYear))
            .attr("y", y(midCO2) - 10)
            .attr("text-anchor", "middle")
            .attr("fill", "blue")
            .style("font-size", "14px")
            .text(`Selected: ${selectedCountry}`);
    }

    svg.append("text")
        .attr("x", width - 220)
        .attr("y", margin.top + 40)
        .attr("fill", "red")
        .style("font-size", "14px")
        .text("Global CO₂");

    // Annotations (Kyoto and Paris)
    const annotations = [];
    if (selectedStartYear <= 1997 && selectedEndYear >= 1997) {
        const kyoto = worldData.find(d => d.year == 1997);
        if (kyoto) annotations.push({
            note: {
                title: "Kyoto Protocol (1997)",
                label: "The first major international treaty to limit CO₂ emissions."
            },
            x: x(1997),
            y: y(+kyoto.co2),
            dx: -10,
            dy: 40
        });
    }
    if (selectedStartYear <= 2015 && selectedEndYear >= 2015) {
        const paris = worldData.find(d => d.year == 2015);
        if (paris) annotations.push({
            note: {
                title: "Paris Agreement (2015)",
                label: "A global pledge to curb climate\nchange and reduce emissions."
            },
            x: x(2015),
            y: y(+paris.co2),
            dx: 10,
            dy: 40
        });
    }


    svg.append("g")
        .call(d3.annotation()
            .type(annotationStyle.type)
            .annotations(annotations)
            .accessors({ x: d => d.x, y: d => d.y })
            .accessorsInverse({ x: d => d.x, y: d => d.y }));


    if (!selectedCountry) {
        svg.append("text")
            .attr("x", margin.left + 10)
            .attr("y", margin.top + 20)
            .attr("text-anchor", "start")
            .attr("font-size", "14px")
            .attr("fill", "#666")
            .text("Tip: Click a country in Scene 1 to compare it with global trends.");
    }
}


function drawScene3() {
    const margin = { top: 40, right: 20, bottom: 50, left: 60 };

    svg.append("text")
        .attr("x", margin.left + 10)
        .attr("y", margin.top + 20)
        .attr("text-anchor", "start")
        .attr("font-size", "14px")
        .attr("fill", "#666")
        .text(
            selectedCountry
                ? `Highlighted Country: ${selectedCountry}`
                : "Tip: Click a country in Scene 1 to explore it here."
        );


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


    // svg.append("g")
    //     .selectAll("circle")
    //     .data(dataScatter)
    //     .enter().append("circle")
    //     .attr("cx", d => x(+d.gdp))
    //     .attr("cy", d => y(+d.co2_per_capita))
    //     .attr("r", d => r(+d.population))
    //     .attr("fill", d => d.country === selectedCountry ? "blue" : "red")
    //     .attr("opacity", 0.5)
    //     .on("mouseover", (event, d) => {
    //         formatTooltip(event,
    //             `${d.country}<br>CO₂/Capita: ${formatCO2(d.co2_per_capita)} t<br>GDP: ${formatGDP(d.gdp)}`
    //         );
    //     })
    //     .on("mouseout", hideTooltip);

    svg.append("g")
        .selectAll("circle")
        .data(dataScatter)
        .enter()
        .append("circle")
        .attr("cx", d => x(+d.gdp))
        .attr("cy", d => y(+d.co2_per_capita))
        .attr("r", 0)
        .attr("fill", d => d.country === selectedCountry ? "blue" : "red")
        .attr("opacity", 0.5)
        .on("mouseover", (event, d) => {
            formatTooltip(event,
                `${d.country}<br>CO₂/Capita: ${formatCO2(d.co2_per_capita)} t<br>GDP: ${formatGDP(d.gdp)}`
            );
        })
        .on("mouseout", hideTooltip)
        .transition()
        .duration(800)
        .delay((d, i) => i * 3)
        .attr("r", d => r(+d.population));

    const qatar = dataScatter.find(d => d.country === "Qatar");
    if (qatar) {
        const xPos = x(+qatar.gdp);
        const yPos = y(+qatar.co2_per_capita);

        // Adjust dx/dy based on proximity to edges
        const padding = 50;
        const dx = xPos > width - padding ? -60 : 40;
        const dy = yPos < padding ? 50 : -40;

        svg.append("g")
            .call(d3.annotation()
                .type(annotationStyle.type)
                .annotations([
                    {
                        note: {
                            title: "Qatar",
                            label: "Wealthiest emitter per capita — an outlier in carbon intensity."
                        },
                        x: xPos,
                        y: yPos,
                        dx: dx,
                        dy: dy
                    }
                ])
                .accessors({ x: d => d.x, y: d => d.y })
                .accessorsInverse({ x: d => d.x, y: d => d.y }));

    }

}

d3.selectAll(".step-circle").on("click", function () {
    const step = +this.dataset.step;
    if (step !== currentScene) {
        currentScene = step;
        updateVisualization();
    }
});

d3.select("#resetButton").on("click", () => {
    selectedCountry = null;
    updateVisualization();
});

