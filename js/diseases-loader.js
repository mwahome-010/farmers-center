import { API_BASE_URL } from './config.js';

document.addEventListener('DOMContentLoaded', async function () {
    const container = document.querySelector('.guide-container');
    if (!container) {
        return;
    }

    await loadDiseases();
    setupSearch();
});

async function loadDiseases() {
    try {
        const response = await fetch(`${API_BASE_URL}/diseases`);
        const data = await response.json();

        if (data.success) {
            renderDiseaseCards(data.diseases);
        }
    } catch (error) {
        console.error('Error loading diseases:', error);
        showError('Failed to load diseases. Please try again later.');
    }
}

function renderDiseaseCards(diseases) {
    const container = document.querySelector('.guide-container');

    if (!container) {
        console.error('Disease container not found');
        return;
    }

    // Clear existing content
    container.innerHTML = '';

    if (diseases.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px;">No diseases found.</p>';
        return;
    }

    diseases.forEach(disease => {
        const card = createDiseaseCard(disease);
        container.appendChild(card);
    });
}

function createDiseaseCard(disease) {
    const card = document.createElement('div');
    card.className = 'disease-guide-card';
    card.setAttribute('data-disease-id', disease.id);

    // Card content
    let content = `
        <h3>${escapeHTML(disease.name)}</h3>
        ${disease.image_path ?
            `<img src="${disease.image_path}" alt="${escapeHTML(disease.name)}">` :
            `<img src="images/ui-icons/placeholder.jpeg" alt="No image available">`
        }
    `;

    // Modal content
    if (disease.causes) {
        content += `<h2>Causes</h2><p>${escapeHTML(disease.causes)}</p>`;
    }

    if (disease.symptoms) {
        content += `<h2>Symptoms</h2><p>${escapeHTML(disease.symptoms)}</p>`;
    }

    if (disease.treatment) {
        content += `<h2>Treatment Methods</h2><p>${escapeHTML(disease.treatment)}</p>`;
    }

    if (disease.prevention) {
        content += `<h2>Prevention Methods</h2><p>${escapeHTML(disease.prevention)}</p>`;
    }

    card.innerHTML = content;

    return card;
}

function setupSearch() {
    const searchInput = document.querySelector('#search-disease input');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(function (e) {
            filterDiseases(e.target.value);
        }, 300));
    }
}

function filterDiseases(searchTerm) {
    const cards = document.querySelectorAll('.disease-guide-card');
    const term = searchTerm.toLowerCase().trim();

    cards.forEach(card => {
        const name = card.querySelector('h3').textContent.toLowerCase();
        const content = card.textContent.toLowerCase();
        
        if (name.includes(term) || content.includes(term)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

function showError(message) {
    const container = document.querySelector('.guide-container');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #d32f2f;">
                <p style="font-size: 1.2em; margin-bottom: 10px;">⚠️ ${escapeHTML(message)}</p>
                <button onclick="location.reload()" style="padding: 10px 20px; background: hsl(140, 62%, 39%); color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Retry
                </button>
            </div>
        `;
    }
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}