import { API_BASE_URL } from './config.js';

document.addEventListener('DOMContentLoaded', async function () {
    await loadStats();
});

async function loadStats() {
    try {
        const url = `${API_BASE_URL}/stats?users=true&guidesCount=true&diseaseCount=true`;
        const response = await fetch(url, { method: 'POST' });
        const data = await response.json();

        if (data && data.success && data.stats) {
            updateStatValue('statDiseases', data.stats.totalDiseases || 0);
            updateStatValue('statsGuides', data.stats.totalGuides || 0);
            updateStatValue('statsUsers', data.stats.totalUsers || 0);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function updateStatValue(elementId, value) {
    const container = document.getElementById(elementId);

    if (container) {
        const heading = container.querySelector('h3') || container;
        animateValue(heading, 0, Number(value) || 0, 1000);
        return;
    }

    // Fallback: find stat-item by its paragraph label
    const statItems = document.querySelectorAll('.stat-item');
    statItems.forEach(item => {
        const paragraph = item.querySelector('p');
        const heading = item.querySelector('h3');
        if (!paragraph || !heading) return;

        const label = paragraph.textContent.trim();

        if (label.includes('Plant Diseases') && elementId === 'statDiseases') {
            animateValue(heading, 0, Number(value) || 0, 1000);
        } else if (label.includes('Growing Guides') && elementId === 'statsGuides') {
            animateValue(heading, 0, Number(value) || 0, 1000);
        } else if (label.includes('Active Farmers') && elementId === 'statsUsers') {
            animateValue(heading, 0, Number(value) || 0, 1000);
        }
    });
}

function animateValue(element, start, end, duration) {
    const range = end - start;
    const steps = Math.max(1, Math.floor(duration / 16)); // 60fps
    const increment = range / steps;
    let current = start;
    let currentStep = 0;

    const timer = setInterval(() => {
        currentStep++;
        current += increment;
        if (currentStep >= steps) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current) /* + (end > 0 ? '+' : '') */;
    }, 16);
}

export default { loadStats };