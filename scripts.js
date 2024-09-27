// DOM Elements
const philosopherList = document.getElementById('philosopher-list');
const nationalityInput = document.getElementById('nationality-input');
const genderInput = document.getElementById('gender-input');

// Global array to hold the parsed philosopher data
let sortedPhilosophers = [];

/**
 * Show and hide the loading spinner
 */
function showSpinner() {
    document.getElementById('loading-spinner').classList.add('show');
}

function hideSpinner() {
    document.getElementById('loading-spinner').classList.remove('show');
}

/**
 * Fetch philosopher data from Google Sheets CSV
 */
async function fetchPhilosophersFromCSV() {
    showSpinner();
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSTexYY-ShRiKDVucP5CY5sNWmDkPxlpKxWPV4FSwwDmeixRaay4a69sKNSYi0o6d-LafNkuTg1JlH7/pub?output=csv";
    const response = await fetch(url);
    const text = await response.text();

    sortedPhilosophers = sortPhilosophers(parseCSV(text));
    await renderPhilosophers(sortedPhilosophers);
    hideSpinner();
}

/**
 * Parse CSV data
 * @param {string} text - CSV content
 * @returns {Array} Parsed philosopher objects
 */
function parseCSV(text) {
    return text.split('\n').slice(1).map(line => {
        let columns = [];
        let current = '';
        let insideQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' && insideQuotes) {
                if (line[i + 1] === '"') {
                    current += '"'; 
                    i++;
                } else {
                    insideQuotes = false;
                }
            } else if (char === '"' && !insideQuotes) {
                insideQuotes = true;
            } else if (char === ',' && !insideQuotes) {
                columns.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        columns.push(current.trim());

        const born = parseInt(columns[0], 10);
        return {
            born: isNaN(born) ? -Infinity : born,
            died: columns[1].trim(),
            nationality: columns[2].trim(),
            gender: columns[3].trim(),
            name: columns[4].trim(),
            summary: columns[5].trim(),
        };
    });
}

/**
 * Sort philosophers by birth year or name
 * @param {Array} philosophers
 * @returns {Array} Sorted philosophers
 */
function sortPhilosophers(philosophers) {
    return philosophers.sort((a, b) => a.born === b.born ? a.name.localeCompare(b.name) : a.born - b.born);
}

/**
 * Fetch philosopher image from Wikipedia API
 * @param {string} name
 * @returns {string} Image URL or placeholder
 */
async function fetchPhilosopherImage(name) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages|images&piprop=thumbnail&pithumbsize=200&redirects=1&titles=${encodeURIComponent(name)}`;
    const response = await fetch(url);
    const data = await response.json();
    const page = Object.values(data.query.pages)[0];

    // Handle redirects
    if (data.query?.redirects) {
        const resolvedTitle = data.query.redirects[0].to;
        return fetchPhilosopherImage(resolvedTitle);
    }

    // Prioritize thumbnail from the infobox
    if (page?.thumbnail?.source) {
        return page.thumbnail.source;
    }

    // Fallback to any valid image
    if (page?.images) {
        for (const image of page.images) {
            if (isValidImage(image.title, name)) {
                const imageUrl = await fetchImageUrl(image.title);
                if (imageUrl) return imageUrl;
            }
        }
    }

    // Fallback to exact image search
    const exactImageUrl = await fetchExactImageUrl(name);
    return exactImageUrl || 'placeholder.jpg';
}

/**
 * Check if an image is valid based on its title
 * @param {string} imageTitle
 * @param {string} name
 * @returns {boolean}
 */
function isValidImage(imageTitle, name) {
    return imageTitle.toLowerCase().includes(name.toLowerCase()) &&
           !imageTitle.toLowerCase().includes('portal') &&
           !imageTitle.toLowerCase().includes('logo') &&
           !imageTitle.toLowerCase().includes('icon') &&
           !imageTitle.toLowerCase().endsWith('.svg');
}

/**
 * Fetch image URL for a specific image title
 * @param {string} imageTitle
 * @returns {string|null} Image URL or null
 */
async function fetchImageUrl(imageTitle) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&titles=${encodeURIComponent(imageTitle)}&prop=imageinfo&iiprop=url`;
    const response = await fetch(url);
    const data = await response.json();
    const imagePage = Object.values(data.query.pages)[0];
    return imagePage?.imageinfo ? imagePage.imageinfo[0].url : null;
}

/**
 * Fetch exact image URL based on philosopher name
 * @param {string} name
 * @returns {string|null} Image URL or null
 */
async function fetchExactImageUrl(name) {
    const exactFileName = `File:${name.replace(/\s/g, '')}.jpg`;
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&titles=${encodeURIComponent(exactFileName)}&prop=imageinfo&iiprop=url`;
    const response = await fetch(url);
    const data = await response.json();
    const imagePage = Object.values(data.query.pages)[0];
    return imagePage?.imageinfo ? imagePage.imageinfo[0].url : null;
}

/**
 * Format year for display (BC/AD)
 * @param {string|number} year
 * @returns {string} Formatted year
 */
function formatYear(year) {
    const yearNum = parseInt(year, 10);
    return isNaN(yearNum) ? 'Present' : (yearNum < 0 ? `${Math.abs(yearNum)} BC` : yearNum.toString());
}

/**
 * Display philosopher card
 * @param {Object} philosopher
 * @returns {HTMLElement} Philosopher card
 */
async function displayPhilosopher(philosopher) {
    const imgUrl = await fetchPhilosopherImage(philosopher.name);
    const birthYear = formatYear(philosopher.born);
    const deathYear = philosopher.died ? formatYear(philosopher.died) : "Present";

    const card = document.createElement('div');
    card.className = 'philosopher-card';
    card.innerHTML = `
        <img src="${imgUrl}" alt="${philosopher.name}" onerror="this.src='placeholder.jpg';">
        <h3 class="philosopher-name">${philosopher.name}</h3>
        <p class="philosopher-years">${birthYear} - ${deathYear}</p>
        <p class="philosopher-summary">${philosopher.summary}</p>
        <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(philosopher.name)}" target="_blank" class="button">Learn More</a>
    `;
    return card;
}

/**
 * Render philosophers based on filters
 * @param {Array} philosophers
 */
async function renderPhilosophers(philosophers) {
    philosopherList.innerHTML = '';  // Clear the philosopher list

    const nationality = nationalityInput.value;
    const gender = genderInput.value;

    const filteredPhilosophers = philosophers.filter(philosopher =>
        (!nationality || philosopher.nationality === nationality) &&
        (!gender || philosopher.gender.toLowerCase() === gender.toLowerCase())
    );

    if (filteredPhilosophers.length === 0) {
        philosopherList.innerHTML = '<p class="no-results-message">No philosophers found matching the selected criteria.</p>';
        philosopherList.style.minHeight = '300px'; // Ensure min-height when empty
        return;
    }

    const philosopherCards = await Promise.all(filteredPhilosophers.map(displayPhilosopher));
    philosopherCards.forEach(card => philosopherList.appendChild(card));

    // Reset min-height when cards are displayed
    philosopherList.style.minHeight = '';
}


/**
 * Event listeners for filter inputs and reset button
 */
[nationalityInput, genderInput].forEach(input => {
    input.addEventListener('input', async () => {
        showSpinner();
        await renderPhilosophers(sortedPhilosophers);
        hideSpinner();
    });
});

document.getElementById('reset-filters').addEventListener('click', async (e) => {
    e.preventDefault();

    // Show the spinner when reset is clicked
    showSpinner();

    // Reset the filter inputs
    nationalityInput.value = "";
    genderInput.value = "";

    // Re-render all philosophers with the spinner shown
    await renderPhilosophers(sortedPhilosophers);

    // Hide the spinner after the rendering is done
    hideSpinner();
});


// Fetch and display philosophers on page load
fetchPhilosophersFromCSV();
