// This function is for loading movie data from the CSV file and dynamically generating genre checkboxes
function loadMovieData() {
    // Load data from the local CSV file using D3.js
    d3.csv("Data/processed_data.csv").then(data => {
        // Process movie data
        movieData = data.map(d => ({
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
            genres: JSON.parse(d.genres.replace(/'/g, '"')) // Parse genres from string to array
        }));

        // Extract unique genres, add them to a new set so repeats don't populate, and sort them alphabetically
        let uniqueGenres = [...new Set(movieData.flatMap(movie => movie.genres))].sort();

        // Grab the element
        const genreCheckboxContainer = document.getElementById("genre-checkboxes");

        // Clear existing checked boxes
        genreCheckboxContainer.innerHTML = "";

        // Create a checkbox for each genre by looping through unique genres and adding HTML elements needed for checkboxes 
        uniqueGenres.forEach(genre => {
            // Create div element for a checkbox
            let checkboxWrapper = document.createElement("div");

            // Add a class to div element for CSS styling
            checkboxWrapper.classList.add("checkbox-wrapper");

            // Create checkbox input element with id, value, and class for CSS styling and later JS parsing
            let checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = genre;
            checkbox.value = genre;
            checkbox.classList.add("genre-checkbox");

            // Create corresponding label for each unique genre
            let label = document.createElement("label");
            label.setAttribute("for", genre);

            // Add text content for the current genre
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
    })
    // Add a condition to catch data loading errors just in case
    .catch(error => {
        console.error("Error loading CSV file:", error);
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

// Build Top Movies treemap
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


// Build dynamic fun facts section
// loop through the entire dataset to find the fun facts
function updateFunFacts(filteredData) {

    // Select the correct chart class
    const chart2Element = document.querySelector('#chart2');

    // Remove existing content
    chart2Element.innerHTML = '';

    // Check if the dataset is empty. If it is, add a message to the HTML element
    if (!filteredData.length) {
        chart2Element.innerHTML = "<p>Oh no, Something broke!</p>";
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
    </div>
`;

    // Append the fun facts section to the element with the id of chart2
    chart2Element.innerHTML = funFactsHTML;
}


// Build Top Producction companies Bubble chart
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

function buildStackedBar(filteredData) {
    // Compute return multiplier
    filteredData.forEach(d => {
        d.returnMultiplier = d.gross_ww / d.budget;
    });

    // Get the top 10 movies by return multiplier
    const topMovies = [...filteredData]
        .sort((a, b) => b.returnMultiplier - a.returnMultiplier)
        .slice(0, 10);

    // Clear previous chart
    d3.select("#chart4").html("");

    // Set dimensions
    let margin = { top: 50, right: 250, bottom: 50, left: 150 };
    let width = 800 - margin.left - margin.right;
    let height = 600 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select("#chart4")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Define scales (Initial: Budget only)
    let x = d3.scaleLinear()
        .domain([0, d3.max(topMovies, d => d.budget)])
        .nice()
        .range([0, width]);

    let y = d3.scaleBand()
        .domain(topMovies.map(d => d.title))
        .range([0, height])
        .padding(0.4);

    // Append x-axis
    let xAxis = svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(".2s")));

    // Append y-axis
    let yAxis = svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y));

    // Append budget bars (Initial State)
    const budgetBars = svg.selectAll(".bar-budget")
        .data(topMovies)
        .enter()
        .append("rect")
        .attr("class", "bar-budget")
        .attr("y", d => y(d.title))
        .attr("height", y.bandwidth())
        .attr("x", 0)
        .attr("width", d => x(d.budget))
        .attr("fill", "purple");

    // Append return multiplier text
    const textLabels = svg.selectAll(".text-labels")
        .data(topMovies)
        .enter()
        .append("text")
        .attr("class", "text-labels")
        .attr("x", d => x(d.budget) + 10) // Initially aligned with budget bars
        .attr("y", d => y(d.title) + y.bandwidth() / 2)
        .attr("alignment-baseline", "middle")
        .text(d => `${d.returnMultiplier.toFixed(1)}x`)
        .style("font-size", "16px")
        .style("font-weight", "bold");

    // Add "Compare" button
    d3.select("#chart4")
        .append("button")
        .attr("id", "compareButton")
        .text("Compare")
        .style("display", "block")
        .style("margin", "20px auto")
        .style("font-size", "16px")
        .style("padding", "10px 20px")
        .style("cursor", "pointer")
        .on("click", function () {
            let isExpanded = x.domain()[1] > d3.max(topMovies, d => d.budget);

            if (!isExpanded) {
                // Expand x-axis to fit gross earnings
                x.domain([0, d3.max(topMovies, d => d.gross_ww)]).nice();

                // Transition x-axis
                svg.select(".x-axis")
                    .transition()
                    .duration(3000)
                    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(".2s")));

                // Transition bars to show gross earnings
                budgetBars.transition()
                    .duration(3000)
                    .attr("width", d => x(d.gross_ww))
                    .attr("fill", "green");

                // Adjust text label positioning
                textLabels.transition()
                    .duration(3000)
                    .attr("x", d => x(d.gross_ww) + 10);
            } else {
                // Collapse back to budget view
                x.domain([0, d3.max(topMovies, d => d.budget)]).nice();

                // Transition x-axis back
                svg.select(".x-axis")
                    .transition()
                    .duration(3000)
                    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(".2s")));

                // Shrink bars back to budget size
                budgetBars.transition()
                    .duration(3000)
                    .attr("width", d => x(d.budget))
                    .attr("fill", "purple");

                // Reset text label position
                textLabels.transition()
                    .duration(3000)
                    .attr("x", d => x(d.budget) + 10);
            }
        });
}


// Create a function to update all dynamic charts when called
function updateDashboard() {
    // Define a variable to hold the filtered values
    let filteredData = filterMovies();
    buildTreemap(filteredData);
    updateFunFacts(filteredData);
    buildBubbleChart(filteredData);
    buildStackedBar(filteredData);
}

// Load movie data and initialize dashboard
loadMovieData();