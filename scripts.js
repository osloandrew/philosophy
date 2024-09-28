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

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// Debounce the filter inputs
[nationalityInput, genderInput].forEach(input => {
    input.addEventListener('input', debounce(async () => {
        showSpinner();
        await renderPhilosophers(sortedPhilosophers);
        hideSpinner();
    }, 300));  // 300ms delay
});

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
 * @returns {Promise<string>} Image URL or placeholder
 */
async function fetchPhilosopherImage(name) {
    const cachedImage = localStorage.getItem(name);

    if (cachedImage && cachedImage !== 'placeholder.jpg') {
        return cachedImage;
    }

    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages|images&piprop=thumbnail&pithumbsize=200&redirects=1&titles=${encodeURIComponent(name)}`;
    const response = await fetch(url);
    const data = await response.json();
    const page = Object.values(data.query.pages)[0];

    let imageUrl = 'placeholder.jpg';  // Default to placeholder

    if (page?.thumbnail?.source) {
        imageUrl = page.thumbnail.source;
    } else {
        const exactImageUrl = await fetchExactImageUrl(name);
        if (exactImageUrl) {
            imageUrl = exactImageUrl;
        }
    }

    if (imageUrl !== 'placeholder.jpg') {
        localStorage.setItem(name, imageUrl);
    }

    return imageUrl;
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
 * Create philosopher card without image
 * @param {Object} philosopher
 * @returns {HTMLElement} Philosopher card without the image
 */
function createPhilosopherCard(philosopher) {
    const birthYear = formatYear(philosopher.born);
    const deathYear = philosopher.died ? formatYear(philosopher.died) : "Present";

    const card = document.createElement('div');
    card.className = 'philosopher-card';
    card.innerHTML = `
        <img src="placeholder.jpg" alt="${philosopher.name}" loading="lazy">
        <h3 class="philosopher-name">${philosopher.name}</h3>
        <p class="philosopher-years">${birthYear} - ${deathYear}</p>
        <p class="philosopher-summary">${philosopher.summary}</p>
        <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(philosopher.name)}" target="_blank" class="button">Learn More</a>
    `;
    return card;
}

/**
 * Display philosopher images after rendering the cards
 * @param {HTMLElement} card
 * @param {string} name
 */
async function loadImageForCard(card, name) {
    const imgUrl = await fetchPhilosopherImage(name);
    const imgElement = card.querySelector('img');
    imgElement.src = imgUrl;
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

    filteredPhilosophers.forEach(philosopher => {
        const card = createPhilosopherCard(philosopher);
        philosopherList.appendChild(card);
        loadImageForCard(card, philosopher.name); // Load images asynchronously
    });
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

    showSpinner();
    nationalityInput.value = "";
    genderInput.value = "";
    await renderPhilosophers(sortedPhilosophers);
    hideSpinner();
});

// Fetch and display philosophers on page load
fetchPhilosophersFromCSV();
