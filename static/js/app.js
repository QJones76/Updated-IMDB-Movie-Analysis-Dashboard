// This function is for loading movie data from the csv files and dynamically generating genre checkboxes
function loadMovieData() {
    // Fetch data from the Flask API endpoints
    Promise.all([
        fetch('http://127.0.0.1:5001/get-movies').then(response => response.json()),
        fetch('http://127.0.0.1:5001/get-heatmap').then(response => response.json())
    ])
    .then(([movieDataResponse, heatmapDataResponse]) => {
        // Process movie data
        movieData = movieDataResponse.map(d => ({
            id: d.id,
            title: d.title,
            year: +d.year,
            nominations: +d.nominations,
            production_companies: d.production_companies,
            votes: +d.votes,
            rating: +d.rating,
            budget: +d.budget,
            gross_ww: +d.gross_world_wide,
            gross_us_canada: +d.gross_us_canada,
            genres: JSON.parse(d.genres.replace(/'/g, '"'))
        }));

        // Extract unique genres, add them to a new set so repeats don't populate, and sort them alphabetically
        // IMPORTANT: Look into sorting them by their value_counts()
        let uniqueGenres = [...new Set(movieData.flatMap(movie => movie.genres))].sort();
        // Look at https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax#spread_in_array_literals
        // for more on the spread syntax (i.e. the '...')

        // grab the element
        const genreCheckboxContainer = document.getElementById("genre-checkboxes");

        // Clear existing checked boxes
        genreCheckboxContainer.innerHTML = "";

        // Create a checkbox for each genre by looping through unique genres and adding HTML elements needed
        // for checkboxes 
        uniqueGenres.forEach(genre => {

            // Create div element for a checkbox
            let checkboxWrapper = document.createElement("div");

            // Add a class to div element for css styling
            checkboxWrapper.classList.add("checkbox-wrapper");

            // Create checkbox input element with id, value, and class for css styling and later js parsing
            let checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = genre;
            checkbox.value = genre;
            checkbox.classList.add("genre-checkbox");

            // Create corresponding label for each unique genre
            let label = document.createElement("label");
            label.setAttribute("for", genre);

            // Add text content for current genre
            label.textContent = genre;

            // Append all created HTML elements to correct parent elements
            checkboxWrapper.appendChild(checkbox);
            checkboxWrapper.appendChild(label);
            genreCheckboxContainer.appendChild(checkboxWrapper);
        });

        // Create an event listener to update the dashboard upon checkbox changes
        const checkboxes = document.querySelectorAll(".genre-checkbox");
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener("change", updateDashboard);
        });

        // Create an event listener to update the dashboard upon slider changes
        slider.noUiSlider.on("update", function() {
            updateDashboard();
        });

        // Initialize the dashboard upon successfully getting data
        updateDashboard();

        // Assign global variable after data is loaded
        window.filteredData = filterMovies();

        // Process heatmap data
        const heatmapData = heatmapDataResponse;

        // Build heatmap
        // Because of its static nature, we will call the function here instead of in the update dashboard function
        buildHeatmap(heatmapData);
    })
    // Add a condition to catch data fetching errors jsut in case
    .catch(error => {
        console.error("Error fetching data:", error);
    });
}

// Add custom color scale for charts and their custom names (Some are not the  real names of the colors)
const colors = [
    "#D95F02", // orange
    "#7570B3", // purple
    "#E7298A", // pink
    "#66A51E", // green vibrant
    "#E6AB02", // Catheter-bag
    "#1B9E77", // teal green
    "#B07AA1", // muted lavender
    "#DC863B", // burnt orange
    "#6A3D9A", // deep purple
    "#BC80BD", // soft mauve
    "#8DD3C7", // mint green
    "#FDB462", // apricot orange
    "#80B1D3"  // sky blue
];

// Get selected genres from checkboxes
function getFilterValues() {
    // Get the year values from the noUiSlider
    // The .map(Number) converts the values in the array to numbers
    let yearRange = slider.noUiSlider.get().map(Number);

    // Get the selected checkboxes
    let selectedGenres = Array.from(document.querySelectorAll(".genre-checkbox:checked")).map(checkbox => checkbox.value);

    // Return needed values for chart and fact updates
    return { yearMin: yearRange[0], yearMax: yearRange[1], genres: selectedGenres };
}

// Filter movies based on selected genres and year range
function filterMovies() {
    // Retrieve the filter values to use on movie dataset
    const { yearMin, yearMax, genres } = getFilterValues();

    // Assign the filtered movie dataset to a variable
    let filtered = movieData.filter(movie =>
        movie.year >= yearMin && movie.year <= yearMax &&
        // Handle the case where no genres are selected
        (genres.length === 0 || genres.some(genre => movie.genres.includes(genre)))
    );
    // Return new filtered data
    return filtered;
}

// BUILD ALL CHARTS 

// Build Quinn's treemap
function buildTreemap(filteredData) {

    // Sort data by gross_ww in descending order for the top 50 movies
    const topMovies = filteredData.sort((a, b) => b.gross_ww - a.gross_ww).slice(0, 50);

    // Start by giving treemap a hierarchy
    const root = d3.hierarchy({ children: topMovies })
        .sum(d => d.gross_ww) 
        .sort((a, b) => b.value - a.value); 

    // Customize the layout
    const treemapLayout = d3.treemap()
        .size([1200, 600]) 
        .padding(2); 

    // Assign the root hierarchy to the customized layout
    treemapLayout(root);

    // Remove the previous chart to allow for the new cahrt populating
    d3.select("#chart1").selectAll("svg").remove();

    // Append new svg element in chart container with id of chart1
    const svg = d3.select("#chart1")
        .append("svg")
        .attr("width", 1500) 
        .attr("height", 600); 

    // Create a new group to hold all the elements
    const nodes = svg.selectAll("g")
        .data(root.leaves()) 
        .enter()
        .append("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`)
        // Add event listener for mouse hover tooltip functionality
        .on("mouseover", function(event, d) {
            d3.select("#tooltip")
                // Make sure visibility is set to visible for when the mouse is on element
                .style("visibility", "visible")
                .html(`<strong>Title:</strong> ${d.data.title}<br>
                    <strong>Year:</strong> ${d.data.year}<br>
                    <strong>Gross WW:</strong> $${d.data.gross_ww.toLocaleString()}<br>
                    <strong>Genres:</strong> ${d.data.genres}`);
        })
        .on("mousemove", function(event) {
            const tooltip = d3.select("#tooltip");
            const tooltipWidth = tooltip.node().offsetWidth;
            const tooltipHeight = tooltip.node().offsetHeight;

            tooltip.style("top", Math.min(window.innerHeight - tooltipHeight, event.pageY + 10) + "px")
                    .style("left", Math.min(window.innerWidth - tooltipWidth, event.pageX + 10) + "px");
        })
        // Add event listener for if the mouse isn't currently on an element
        .on("mouseout", function() {
            d3.select("#tooltip").style("visibility", "hidden");
        }); 

    // Make the node rectangular
    nodes.append("rect")
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0) 
        .attr("fill", (d, i) => colors[i % colors.length]); // Use the customized colors array to fill rectangles
        

    // Add the tooltip container
    d3.select("body").append("div")
        .attr("id", "tooltip")
        .style("position", "absolute")
        .style("background", "white") 
        .style("border", "1px solid black") 
        .style("padding", "5px") 
        // Make sure the default state is hidden
        .style("visibility", "hidden"); 

    // Append text element inside each group for displaying movie titles
    nodes.append("text")
        .attr("x", 5) 
        .attr("y", 15) 
        .text(d => d.data.title)
        .attr("font-size", "16px") 
        .attr("fill", "white") 
        // Use textwrap to handle long titles dynamically
        .each(function(d) {
            d3.select(this).call(
                // Define teh bounds to fit within the node
                textwrap().bounds({ width: d.x1 - d.x0 - 10, height: d.y1 - d.y0 - 10 })
            );
        });
}


// Build Holly's fun facts
// loop through the entire dataset to find the fun facts
function updateFunFacts(filteredData) {

    // Select the correct chart class
    const chart2Element = document.querySelector('#chart2');

    // Remove existing content
    chart2Element.innerHTML = '';

    // Check if the dataset is empty. If it is, add a message to the HTML element
    if (!filteredData.length) {
        chart2Element.innerHTML = "<p>YOUR DATA IS BROKEN AGAIN NERD!</p>";
        return;
    }

    // Calculate the wanted facts
    const highestRated = filteredData.reduce((prev, curr) => (curr.rating > prev.rating ? curr : prev), filteredData[0]);
    const lowestRated = filteredData.reduce((prev, curr) => (curr.rating < prev.rating ? curr : prev), filteredData[0]);
    const mostNominations = filteredData.reduce((prev, curr) => (curr.nominations > prev.nominations ? curr : prev), filteredData[0]);
    const highestUsAndCanada = filteredData.reduce((prev, curr) => (curr.gross_us_canada > prev.gross_us_canada ? curr : prev), filteredData[0]);
    const highestWW = filteredData.reduce((prev, curr) => (curr.gross_ww > prev.gross_ww ? curr : prev), filteredData[0]);
    const lowestBudget = filteredData.reduce((prev, curr) => (curr.budget < prev.budget ? curr : prev), filteredData[0]);

    // Create a fun facts section
    const funFactsHTML = `
    <div style="font-size:18px";>
        <div class="fact1">
            <p><strong>The Highest Rated</strong> movie of the selected fields is <strong>${highestRated.title}</strong> with an IMDB rating of <strong>${highestRated.rating}</strong>.</p>
            <br>
        </div>
        <div class="fact2">
            <p><strong>The Lowest Rated</strong> movie of the selected fields is <strong>${lowestRated.title}</strong> with an IMDB rating of <strong>${lowestRated.rating}</strong>.</p>
            <br>
        </div>
        <div class="fact3">
            <p><strong>The Most Nominated</strong> movie of the selected fields is <strong>${mostNominations.title}</strong>, receiving <strong>${mostNominations.nominations}</strong> nominations!</p>
            <br>
        </div>
        <div class="fact4">
            <p><strong>${highestUsAndCanada.title}</strong> earned the most in US and Canadian markets. They earned <strong>$${highestUsAndCanada.gross_us_canada}</strong> total!</p>
            <br>
        </div>
        <div class="fact5">
            <p><strong>${highestWW.title}</strong> earned the most in the world wide market. They earned <strong>$${highestWW.gross_ww}.</strong></p>
            <br>
        </div>
        <div class="fact6">
            <p><strong>${lowestBudget.title}</strong> had the lowest budget. They only had <strong>$${lowestBudget.budget}</strong> to work with</p>
            <br>
        </div>
        <div class="static-facts_divider">
            <p>________________________________________________________</p>
        </div>
        <div class="static_facts" "text-align:center";>
            <p><strong>Wonder Nuggets</strong></p>
            <br>
        <div class="fact7">
            <p>Disney turned down "Back to the Future" because they thought Marty had a bit of an Oedipus vibe with his mom.</p>
            <br>
        </div>
        <div class="fact8">
            <p> The tarantula from Home Alone was named Barry.</p>
            <br>
        </div>
        <div class="fact9">
            <p> The sound of the velociraptors communicating in Jurassic Park is actually the sound of tortoises mating.</p>
            <br>
        </div>
        <div class="fact10">
            <p> Katharine Hepburn holds the record for the most individual Oscar wins at 4 - all of them in the Best Actress category.</p>
            <br>
        </div>
        <div class="fact11">
            <p> Sylvester Stallone holds the record for the most Razzie awards with 12 wins and 40 nominations.</p>
            <br>
        </div>
        <div class="fact12">
            <p> There are 116 f-bombs in Deadpool & Wolverine.</p>
            <br>
        </div>
        <div class="fact13">
            <p><strong>Pulp Fiction</strong> had an $8 million budget and grossed over $200 million at the box office.</p>
            <br>
        </div>
    </div>
`;

    // Append the fun facts section to the element with the id of chart2
    chart2Element.innerHTML = funFactsHTML;
}


// Build Aditi's Bubble chart
function buildBubbleChart(filteredData) {

    // Create an object to store the sum of gross_ww for each production company
    const productionSums = {};

    // Iterate through each data entry and process the production companies
    filteredData.forEach(d => {
        let companies = [];
        try {
            // First attempt: Handle the case where production companies are enclosed in backticks
            let cleanedString = d.production_companies;

            // Check if the string is enclosed in backticks and remove them
            // Might need to remove this section later, Brandon showed me the datastructure is differnet
            // then what I thought
            if (cleanedString.startsWith('`') && cleanedString.endsWith('`')) {
                cleanedString = cleanedString.slice(1, -1); // Remove backticks
            }

            // Now handle the rest of the string by replacing quotes and parsing correctly, hopefully
            companies = JSON.parse(
                cleanedString
                    .replace(/'/g, '"')                       // Replace single quotes with double quotes
                    .replace(/\\"/g, "'")                     // Replace escaped double quotes with single quotes
                    .replace(/"(?=\w+['’]\w+)/g, match => match.replace('"', "'")) // Adjust double quotes for nested single quotes
            );
        } catch (e1) {
            try {
                // Second attempt: Replace backticks and other formatting issues
                let cleanedString = d.production_companies.replace(/`/g, '"');
                
                if (cleanedString.includes("'") && !cleanedString.includes('"')) {
                    cleanedString = cleanedString.replace(/'(?![^"]*")/g, '"'); // Replace single quotes outside double quotes
                }
    
                companies = JSON.parse(cleanedString);
            } catch (e2) {
                try {
                    // Third attempt: Try to handle mixed quotes
                    let adjustedString = d.production_companies
                        .replace(/'/g, '"') // Replace all single quotes with double quotes
                        .replace(/"\\"/g, "'") // Replace escaped double quotes inside quotes
                        .replace(/""/g, '"') // Fix double double quotes
                        .replace(/\\"/g, "'"); // Replace escaped double quotes with single quotes
    
                    companies = JSON.parse(adjustedString);
                } catch (e3) {
                    try {
                        // Fourth attempt: Try, yet again to hanlde mixed quotes with different approach
                        let mixedQuotesString = d.production_companies
                            .replace(/'/g, '"') // Replace all single quotes with double quotes
                            .replace(/"(?=\w+['’]\w+)/g, match => match.replace('"', "'")) // Adjust double quotes for nested single quotes
                            .replace(/""/g, '"'); // Fix double double quotes
                        
                        companies = JSON.parse(mixedQuotesString);
                    } catch (e4) {
                        // If all else fails, treat the entire string as a single company within the brackets
                        companies = [d.production_companies];
                    }
                }
            }
        }

        // Iterate through each company and add the gross_ww to the total sum of each production company
        companies.forEach(company => {
            
            // Ensure the company exists in productionSums, otherwise initialize it with 0
            // This is what the '!' is for at the beginning of the if parameter
            if (!productionSums[company]) {
                productionSums[company] = 0;
            }
            // Add to the existing sum
            productionSums[company] += d.gross_ww;  
        });
    });

    // Convert the productionSums object to an array of objects for D3 processing
    const companyData = Object.entries(productionSums).map(([key, value]) => ({
        key: key,  // Production company name
        value: value // Sum of gross_ww
    }));

    // Sort the production companies by sum of gross_ww value in descending order for the top 100
    const top100Companies = companyData.sort((a, b) => b.value - a.value).slice(0, 100);

    // Prepare the hierarchy for the bubble chart using d3.hierarchy
    const root = d3.hierarchy({children: top100Companies})
        // Make the bubble size dependent on the sum of each production company
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);

    // Set up the bubble chart layout
    const packLayout = d3.pack()
        .size([800, 800])  // Chart needs to be same size as HTML container
        .padding(5);
    packLayout(root);

    // Remove the previous chart
    d3.select("#chart3").selectAll("svg").remove();

    // Append a new SVG element to the chart container
    const svg = d3.select("#chart3")
        .append("svg")
        .attr("width", 800)
        .attr("height", 800)
        .attr("viewBox", "0 0 800 800")
        .attr("preserveAspectRatio", "xMidYMid meet");

    // Create a scale to adjust the size of the bubbles
    const sizeScale = d3.scaleSqrt()
        // Add the values of gross_ww
        .domain([0, d3.max(top100Companies, d => d.value)])
        // Define the range for the radius of the bubbles (10 to 100)
        // Change the range for bigger or smaller bubbles
        .range([10, 100]);

    // Create a group for each production company (bubble)
    const node = svg.selectAll("g")
        .data(root.leaves())
        .enter()
        .append("g")
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .on("mouseover", function(event, d) {
            // Add tooltip functionality
            d3.select("#tooltip")
                // Make sure it is set to visible for mouse hover functionality
                .style("visibility", "visible")
                .html(`<strong>Company:</strong> ${d.data.key}<br>
                     <strong>Gross:</strong> $${d.data.value.toLocaleString()}`);
        })
        // Add event listener for tooltips
        .on("mousemove", function(event) {
            d3.select("#tooltip")
              .style("top", (event.pageY + 10) + "px")
              .style("left", (event.pageX + 10) + "px");
        })
        // Remove tool tip from screen if not hovered on
        .on("mouseout", function() {
            d3.select("#tooltip").style("visibility", "hidden");
        });

    // Add the bubbles
    node.append("circle")
        .attr("r", d => sizeScale(d.value))
        .attr("fill", (d, i) => colors[i % colors.length])
        .attr("opacity", 0.6);
        

    // Add text labels inside each bubble
    node.append("text")
        .attr("dy", "0.3em")
        .attr("text-anchor", "middle")
        .style("fill", "black")
        // Use the production company name as label
        .text(d => d.data.key);  
}


// Build Nicholas' heatmap
function calculateCorrelationMatrix(data, columns) {
    function pearsonCorrelation(x, y) {
        const meanX = d3.mean(x);
        const meanY = d3.mean(y);
        const numerator = d3.sum(x.map((xi, i) => (xi - meanX) * (y[i] - meanY)));
        const denominator = Math.sqrt(
            d3.sum(x.map(xi => Math.pow(xi - meanX, 2))) *
            d3.sum(y.map(yi => Math.pow(yi - meanY, 2)))
        );
        return numerator / denominator;
    }

    const matrix = [];
    for (let i = 0; i < columns.length; i++) {
        for (let j = 0; j < columns.length; j++) {
            const x = data.map(d => d[columns[i]]);
            const y = data.map(d => d[columns[j]]);
            matrix.push({
                row: i,
                col: j,
                value: pearsonCorrelation(x, y)
            });
        }
    }
    return matrix;
}

// Function to build heatmap using D3
function buildHeatmap(data) {
    const margin = { top: 30, right: 30, bottom: 150, left: 125 };
    const width = 800 - margin.left - margin.right;
    const height = 800 - margin.top - margin.bottom;

    // Define the columns you want to visualize
    const columns = ["avg_rating_change", "budget_change", "gross_us_change", "gross_world_change", "nominations_change", "oscars_change", "votes_change"];
    
    // Calculate the correlation matrix
    const heatmapData = calculateCorrelationMatrix(data, columns);

    // Remove any existing heatmap
    d3.select("#chart4").selectAll("svg").remove();

    // Append new SVG element for heatmap
    const svg = d3.select("#chart4")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom + 50) // Extra space for the legend
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .range([0, width])
        .domain(columns)
        .padding(0.01);

    const y = d3.scaleBand()
        .range([height, 0])
        .domain(columns)
        .padding(0.01);

    // Define custom color interpolator for blue-white-red
    const interpolateBuWeRd = t => {
        if (t < 0.5) {
            return d3.interpolateBlues(2 * (t - 0.5));
        } else {
            return d3.interpolateReds(2 * (t - 0.5));
        }
    };

    const colorScale = d3.scaleSequential()
        .interpolator(interpolateBuWeRd)
        .domain([-1, 1]); // Correlation ranges from -1 to 1

    // Create the SVG tooltip (outside the loop)
    const tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "white")
        .style("border", "1px solid black")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("pointer-events", "none") // Prevent it from blocking mouse events
        .style("display", "none");

    // Draw heatmap cells
    svg.selectAll()
        .data(heatmapData)
        .enter()
        .append("rect")
        .attr("x", d => x(columns[d.col]))
        .attr("y", d => y(columns[d.row]))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", d => colorScale(d.value))
        .on("mouseover", (event, d) => {
          tooltip
            .style("display", "block")
            .html(`<strong>Value:</strong> ${d.value.toFixed(2)}`)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY + 10}px`);
        })
        .on("mousemove", (event) => {
          tooltip
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY + 10}px`);
        })
        .on("mouseout", () => {
          tooltip.style("display", "none");
        });

    // Add x-axis
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("transform", "rotate(-45)");

    // Add y-axis
    svg.append("g")
        .call(d3.axisLeft(y));

    // --- Add Legend ---
    const legendWidth = 300;
    const legendHeight = 20;

    // Append a group for the legend
    const legend = svg.append("g")
        .attr("transform", `translate(${(width - legendWidth) / 2}, ${height + 90})`);

    // Create a gradient for the legend
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "heatmap-gradient");

    linearGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#000435");

    linearGradient.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", "white");

    linearGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#610000");

    // Draw the rectangle for the legend
    legend.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#heatmap-gradient)");

    // Add legend axis
    const legendScale = d3.scaleLinear()
        .domain([-1, 1]) // Match the colorScale domain
        .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
        .ticks(5)
        .tickFormat(d3.format(".1f"));

    legend.append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis);
}

// Create a function to update all dynamic charts when called
function updateDashboard() {
    // Define a variable to hold the filtered values
    let filteredData = filterMovies();
    buildTreemap(filteredData);
    updateFunFacts(filteredData);
    buildBubbleChart(filteredData);
}

// Load movie data and initialize dashboard
loadMovieData();