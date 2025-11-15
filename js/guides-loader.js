const API_BASE_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', async function() {
    const container = document.querySelector('.guide-container');
    if (!container) {
        return;
    }
    
    await loadGuides();
    setupSearch();
});

async function loadGuides() {
    try {
        const response = await fetch(`${API_BASE_URL}/guides`);
        const data = await response.json();
        
        if (data.success) {
            renderGuideCards(data.guides);
        }
    } catch (error) {
        console.error('Error loading guides:', error);
        showError('Failed to load guides. Please try again later.');
    }
}

function renderGuideCards(guides) {
    const container = document.querySelector('.guide-container');
    
    if (!container) {
        console.error('Guide container not found');
        return;
    }
    
    // Clear existing content
    container.innerHTML = '';
    
    if (guides.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px;">No guides found.</p>';
        return;
    }
    
    guides.forEach(guide => {
        const card = createGuideCard(guide);
        container.appendChild(card);
    });
}

function createGuideCard(guide) {
    const card = document.createElement('div');
    card.className = 'disease-guide-card';
    card.setAttribute('data-guide-id', guide.id);
    
    // Build the card content
    let content = `
        <h3>${escapeHTML(guide.name)}</h3>
        ${guide.image_path ? 
            `<img src="${guide.image_path}" alt="${escapeHTML(guide.name)}">` :
            `<img src="images/ui-cards/placeholder.jpg" alt="No image available">`
        }
    `;
    
    // Add hidden content for the modal
    if (guide.planting_suggestions) {
        content += `<h2>Planting Suggestions</h2><p>${escapeHTML(guide.planting_suggestions)}</p>`;
    }
    
    if (guide.care_instructions) {
        content += `<h2>Care Instructions</h2><p>${escapeHTML(guide.care_instructions)}</p>`;
    }
    
    card.innerHTML = content;
    
    return card;
}

function setupSearch() {
    const searchInput = document.querySelector('#search-guide input');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function(e) {
            filterGuides(e.target.value);
        }, 300));
    }
}

function filterGuides(searchTerm) {
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

export default {};