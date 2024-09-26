
// DOM elements
const philosopherList = document.getElementById('philosopher-list');
const searchInput = document.getElementById('search-input');
const nationalityInput = document.getElementById('nationality-input');
const genderInput = document.getElementById('gender-input');

// Array to hold philosopher data
let sortedPhilosophers = [];

// Fetch philosopher data from Google Sheets
async function fetchPhilosophersFromCSV() {
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSTexYY-ShRiKDVucP5CY5sNWmDkPxlpKxWPV4FSwwDmeixRaay4a69sKNSYi0o6d-LafNkuTg1JlH7/pub?output=csv";
    const response = await fetch(url);
    const text = await response.text();

    // Use a CSV parsing function to handle quoted fields
    const data = parseCSV(text);

    // Sort philosophers by birth year
    sortedPhilosophers = sortPhilosophers(data);
    renderPhilosophers(sortedPhilosophers);
}

// CSV parsing function that handles quotes and commas inside fields
function parseCSV(text) {
    const lines = text.split('\n').slice(1); // Skip the header
    return lines.map(line => {
        const columns = [];
        let current = '';
        let insideQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"' && insideQuotes) {
                // Check for escaped quote
                if (line[i + 1] === '"') {
                    current += '"'; // Add escaped quote
                    i++; // Skip the next quote
                } else {
                    insideQuotes = false; // End of quoted field
                }
            } else if (char === '"' && !insideQuotes) {
                insideQuotes = true; // Start of quoted field
            } else if (char === ',' && !insideQuotes) {
                columns.push(current.trim());
                current = ''; // Start new column
            } else {
                current += char; // Add normal character
            }
        }
        columns.push(current.trim()); // Add the last column

        // Return an object representing a philosopher
        const [born, died, nationality, gender, name, summary] = columns;
        return { born, died, nationality, gender, name, summary };
    });
}

// Function to sort philosophers by birth year
function sortPhilosophers(philosophers) {
    return philosophers.sort((a, b) => (parseInt(a.born, 10) || -Infinity) - (parseInt(b.born, 10) || -Infinity));
}

// Function to fetch philosopher images from Wikipedia API
async function fetchPhilosopherImage(name) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&piprop=thumbnail&pithumbsize=200&titles=${encodeURIComponent(name)}`;
    const response = await fetch(url);
    const data = await response.json();
    const page = Object.values(data.query.pages)[0];
    return page?.thumbnail?.source || 'placeholder.jpg';
}

// Function to format year (BC/AD)
function formatYear(year) {
    if (!year) return "Present"; // Handle present cases
    const yearNum = parseInt(year, 10);
    return yearNum < 0 ? `${Math.abs(yearNum)} BC` : `${yearNum}`;
}

// Function to display a philosopher's card
async function displayPhilosopher(philosopher) {
    const imgUrl = await fetchPhilosopherImage(philosopher.name);
    const birthYear = formatYear(philosopher.born);
    const deathYear = philosopher.died ? formatYear(philosopher.died) : "Present";

    const card = document.createElement('div');
    card.className = 'philosopher-card';
    card.innerHTML = `
        <img src="${imgUrl}" alt="${philosopher.name}" onerror="this.src='placeholder.jpg';">
        <h3 class="philosopher-name">${philosopher.name}</h3>
        <p>${birthYear} - ${deathYear}</p>
        <p>${philosopher.summary}</p>
        <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(philosopher.name)}" target="_blank" class="button">Learn More</a>
    `;
    philosopherList.appendChild(card);
}


// Function to render philosophers based on filters
function renderPhilosophers(philosophers) {
    philosopherList.innerHTML = ''; // Clear the list

    const searchText = searchInput.value.toLowerCase();
    const nationality = nationalityInput.value;
    const gender = genderInput.value;

    const filteredPhilosophers = philosophers.filter(philosopher => {
        return (
            (philosopher.name.toLowerCase().includes(searchText)) &&
            (!nationality || philosopher.nationality === nationality) &&
            (!gender || philosopher.gender.toLowerCase() === gender.toLowerCase())
        );
    });

    filteredPhilosophers.forEach(displayPhilosopher);
}

// Clear filters and re-render the list
document.getElementById('clear-filters').addEventListener('click', () => {
    searchInput.value = '';
    nationalityInput.value = '';
    genderInput.value = '';
    renderPhilosophers(sortedPhilosophers);
});

// Add event listeners to filter inputs
[searchInput, nationalityInput, genderInput].forEach(input => {
    input.addEventListener('input', () => renderPhilosophers(sortedPhilosophers));
});

// Fetch philosophers on page load
fetchPhilosophersFromCSV();
