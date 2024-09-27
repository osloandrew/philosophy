// DOM Elements
const philosopherList = document.getElementById('philosopher-list');  // Container for philosophers
const nationalityInput = document.getElementById('nationality-input');  // Nationality filter input
const genderInput = document.getElementById('gender-input');  // Gender filter input

// Global array to hold the parsed and sorted philosopher data
let sortedPhilosophers = [];

/**
 * Show the loading spinner
 */
function showSpinner() {
    const spinner = document.getElementById('loading-spinner');
    spinner.classList.add('show');  // Show the spinner
}

/**
 * Hide the loading spinner
 */
function hideSpinner() {
    const spinner = document.getElementById('loading-spinner');
    spinner.classList.remove('show');  // Hide the spinner
}

/**
 * Fetch philosopher data from Google Sheets CSV and process it
 */
async function fetchPhilosophersFromCSV() {
    showSpinner();  // Show the spinner while loading data
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSTexYY-ShRiKDVucP5CY5sNWmDkPxlpKxWPV4FSwwDmeixRaay4a69sKNSYi0o6d-LafNkuTg1JlH7/pub?output=csv";
    const response = await fetch(url);
    const text = await response.text();

    // Parse and sort the CSV data
    const data = parseCSV(text);
    sortedPhilosophers = sortPhilosophers(data);

    // Render the sorted philosopher data to the page
    await renderPhilosophers(sortedPhilosophers);

    hideSpinner();  // Hide the spinner when loading is done
}

/**
 * CSV parsing function to handle quoted fields and commas
 * @param {string} text - CSV content
 * @returns {Array} Parsed philosopher objects
 */
function parseCSV(text) {
    const lines = text.split('\n').slice(1); // Skip the CSV header row

    return lines.map(line => {
        let columns = [];
        let current = '';
        let insideQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"' && insideQuotes) {
                if (line[i + 1] === '"') {
                    current += '"'; // Add escaped quote
                    i++;  // Skip the next quote
                } else {
                    insideQuotes = false; // End of quoted field
                }
            } else if (char === '"' && !insideQuotes) {
                insideQuotes = true;  // Start of quoted field
            } else if (char === ',' && !insideQuotes) {
                columns.push(current.trim());  // Add the trimmed column value
                current = '';  // Reset the current column
            } else {
                current += char;  // Add regular characters
            }
        }
        columns.push(current.trim());  // Add the last column

        // Parse the birth year, or set to -Infinity if invalid
        let born = parseInt(columns[0], 10);
        if (isNaN(born)) born = -Infinity;

        return {
            born,  // Birth year
            died: columns[1].trim(),  // Death year
            nationality: columns[2].trim(),  // Nationality
            gender: columns[3].trim(),  // Gender
            name: columns[4].trim(),  // Name
            summary: columns[5].trim()  // Summary
        };
    });
}

/**
 * Sort philosophers by birth year, falling back to name for identical years
 * @param {Array} philosophers - Array of philosopher objects
 * @returns {Array} Sorted philosophers array
 */
function sortPhilosophers(philosophers) {
    return philosophers.sort((a, b) => {
        if (a.born === b.born) {
            return a.name.localeCompare(b.name);  // Sort alphabetically by name if birth years are the same
        }
        return a.born - b.born;  // Sort by birth year (BC years as negative values)
    });
}

/**
 * Fetch philosopher images from the Wikipedia API
 * @param {string} name - Philosopher's name
 * @returns {string} Image URL or placeholder
 */
async function fetchPhilosopherImage(name) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&piprop=thumbnail&pithumbsize=200&titles=${encodeURIComponent(name)}`;
    const response = await fetch(url);
    const data = await response.json();
    const page = Object.values(data.query.pages)[0];
    return page?.thumbnail?.source || 'placeholder.jpg';  // Return the image URL or a placeholder
}

/**
 * Format the philosopher's birth/death year to display BC/AD correctly
 * @param {string|number} year - Birth or death year
 * @returns {string} Formatted year
 */
function formatYear(year) {
    if (!year) return "Present";  // Handle philosophers who are still alive
    const yearNum = parseInt(year, 10);
    return yearNum < 0 ? `${Math.abs(yearNum)} BC` : `${yearNum}`;  // Convert BC years to positive numbers
}

/**
 * Build and return a philosopher card element
 * @param {Object} philosopher - Philosopher object
 * @returns {HTMLElement} Philosopher card element
 */
async function displayPhilosopher(philosopher) {
    const imgUrl = await fetchPhilosopherImage(philosopher.name);  // Fetch philosopher image
    const birthYear = formatYear(philosopher.born);  // Format birth year
    const deathYear = philosopher.died ? formatYear(philosopher.died) : "Present";  // Format death year

    // Create a philosopher card element
    const card = document.createElement('div');
    card.className = 'philosopher-card';
    card.innerHTML = `
        <img src="${imgUrl}" alt="${philosopher.name}" onerror="this.src='placeholder.jpg';">
        <h3 class="philosopher-name">${philosopher.name}</h3>
        <p>${birthYear} - ${deathYear}</p>
        <p class="philosopher-summary">${philosopher.summary}</p>
        <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(philosopher.name)}" target="_blank" class="button">Learn More</a>
    `;
    return card;  // Return the completed philosopher card element
}

/**
 * Render the sorted and filtered philosophers to the page
 * @param {Array} philosophers - Array of philosopher objects
 */
async function renderPhilosophers(philosophers) {
    philosopherList.innerHTML = '';  // Clear the philosopher list

    // Filter philosophers based on selected nationality and gender
    const nationality = nationalityInput.value;
    const gender = genderInput.value;
    const filteredPhilosophers = philosophers.filter(philosopher => {
        return (
            (!nationality || philosopher.nationality === nationality) &&
            (!gender || philosopher.gender.toLowerCase() === gender.toLowerCase())
        );
    });

    // Check if no philosophers match the filter criteria
    if (filteredPhilosophers.length === 0) {
        philosopherList.innerHTML = '<p class="no-results-message">No philosophers found matching the selected criteria.</p>';
        return;
    }

    // Sort and display filtered philosophers
    const sortedFilteredPhilosophers = sortPhilosophers(filteredPhilosophers);
    const philosopherCards = await Promise.all(sortedFilteredPhilosophers.map(displayPhilosopher));

    // Append each philosopher card to the philosopher list
    philosopherCards.forEach(card => {
        philosopherList.appendChild(card);
    });
}

// Event listeners for filter inputs
[nationalityInput, genderInput].forEach(input => {
    input.addEventListener('input', async () => {
        showSpinner();  // Show spinner when filters are changed
        await renderPhilosophers(sortedPhilosophers);  // Re-render philosophers with updated filters
        hideSpinner();  // Hide spinner after re-rendering is complete
    });
});

// Event listener for Reset Filters button
document.getElementById('reset-filters').addEventListener('click', function (e) {
    e.preventDefault();  // Prevent default anchor behavior

    // Reset the filter inputs
    nationalityInput.value = "";
    genderInput.value = "";

    // Re-render all philosophers
    renderPhilosophers(sortedPhilosophers);
});

// Fetch and display philosophers on page load
fetchPhilosophersFromCSV();
