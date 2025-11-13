document.addEventListener('DOMContentLoaded', function () {
    var modal = document.getElementById('guideModal');
    var modalTitle = document.getElementById('guideModalTitle');
    var modalImage = document.getElementById('guideModalImage');
    var modalDetails = document.getElementById('guideModalDetails');
    var closeBtn = document.getElementById('guideModalClose');
    var downloadBtn = document.getElementById('guideModalDownload');

    function openModalFromCard(card) {
        var titleEl = card.querySelector('h3');
        var imgEl = card.querySelector('img');
        var detailEls = card.querySelectorAll('h2, p');

        modalTitle.textContent = titleEl ? titleEl.textContent : '';
        if (imgEl) {
            modalImage.src = imgEl.getAttribute('src');
            modalImage.alt = imgEl.getAttribute('alt') || (titleEl ? titleEl.textContent : '');
        } else {
            modalImage.removeAttribute('src');
            modalImage.alt = '';
        }

        // Build structured content from card data
        modalDetails.innerHTML = buildStructuredContent(detailEls);

        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        setupTabs();
    }

    function buildStructuredContent(detailEls) {
        let data = {
            causedBy: '',
            affects: '',
            symptoms: '',
            causes: '',
            treatment: '',
            prevention: ''
        };

        let currentSection = '';
        detailEls.forEach(function (el) {
            if (el.tagName === 'H2') {
                currentSection = el.textContent.toLowerCase().trim();
            } else if (el.tagName === 'P') {
                const text = el.textContent.trim();
                if (currentSection.includes('cause')) {
                    data.causes += `<p>${text}</p>`;
                    // Try to extract pathogen name for "Caused By"
                    if (text.toLowerCase().includes('caused by') && !data.causedBy) {
                        const match = text.match(/caused by\s+(?:a\s+)?(?:fungus|bacteria|virus)?\s*(?:called\s+)?([^.]+)/i);
                        if (match) {
                            data.causedBy = match[1].trim();
                        }
                    }
                } else if (currentSection.includes('symptom')) {
                    data.symptoms += `<p>${text}</p>`;
                } else if (currentSection.includes('treatment')) {
                    data.treatment += `<p>${text}</p>`;
                } else if (currentSection.includes('prevention')) {
                    data.prevention += `<p>${text}</p>`;
                } else if (currentSection.includes('planting')) {
                    data.planting = (data.planting || '') + `<p>${text}</p>`;
                } else if (currentSection.includes('care')) {
                    data.care = (data.care || '') + `<p>${text}</p>`;
                }
            }
        });

        const isDisease = data.symptoms || data.treatment;
        const isGuide = data.planting || data.care;

        if (isDisease) {
            return buildDiseaseContent(data);
        } else if (isGuide) {
            return buildGuideContent(data);
        } else {
            return buildFallbackContent(detailEls);
        }
    }

    function buildDiseaseContent(data) {
        return `
            <div class="quick-facts-section">
                <div class="quick-facts-grid">
                    ${data.causedBy ? `
                    <div class="fact-item">
                        <div class="fact-icon">🦠</div>
                        <div class="fact-content">
                            <div class="fact-label">Caused By</div>
                            <div class="fact-value">${data.causedBy}</div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>

            <div class="info-tabs">
                <button class="tab-btn active" data-tab="symptoms">Symptoms</button>
                <button class="tab-btn" data-tab="causes">Causes</button>
                <button class="tab-btn" data-tab="treatment">Treatment</button>
                <button class="tab-btn" data-tab="prevention">Prevention</button>
            </div>

            <div class="tab-contents">
                <div id="symptomsTab" class="tab-content active">
                    <div class="info-section">
                        <h3>🔍 What to Look For</h3>
                        ${data.symptoms || '<p>No symptom information available.</p>'}
                    </div>
                </div>

                <div id="causesTab" class="tab-content">
                    <div class="info-section">
                        <h3>🦠 Disease Origin</h3>
                        ${data.causes || '<p>No cause information available.</p>'}
                    </div>
                </div>

                <div id="treatmentTab" class="tab-content">
                    <div class="info-section">
                        <h3>💊 Treatment Methods</h3>
                        ${data.treatment || '<p>No treatment information available.</p>'}
                    </div>
                </div>

                <div id="preventionTab" class="tab-content">
                    <div class="info-section">
                        <h3>🛡️ Prevention Strategies</h3>
                        ${data.prevention || '<p>No prevention information available.</p>'}
                    </div>
                </div>
            </div>
        `;
    }

    function buildGuideContent(data) {
        return `
            <div class="info-tabs">
                <button class="tab-btn active" data-tab="planting">Planting</button>
                <button class="tab-btn" data-tab="care">Care</button>
            </div>

            <div class="tab-contents">
                <div id="plantingTab" class="tab-content active">
                    <div class="info-section">
                        <h3>🌱 Planting Suggestions</h3>
                        ${data.planting || '<p>No planting information available.</p>'}
                    </div>
                </div>

                <div id="careTab" class="tab-content">
                    <div class="info-section">
                        <h3>🌿 Care Instructions</h3>
                        ${data.care || '<p>No care information available.</p>'}
                    </div>
                </div>
            </div>
        `;
    }

    function buildFallbackContent(detailEls) {
        let content = '<div class="info-section">';
        detailEls.forEach(function (el) {
            var clone = el.cloneNode(true);
            clone.classList.add('modal-detail-item');
            content += clone.outerHTML;
        });
        content += '</div>';
        return content;
    }

    function setupTabs() {
        var tabs = modal.querySelectorAll('.tab-btn');
        tabs.forEach(function (tab) {
            var newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);
        });

        modal.querySelectorAll('.tab-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                switchTab(this.getAttribute('data-tab'));
            });
        });
    }

    function switchTab(tabName) {
        // Remove active class from all tabs and contents
        modal.querySelectorAll('.tab-btn').forEach(function (btn) {
            btn.classList.remove('active');
        });
        modal.querySelectorAll('.tab-content').forEach(function (content) {
            content.classList.remove('active');
        });

        // Add active class to selected tab and content
        var selectedTab = modal.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        var selectedContent = modal.querySelector(`#${tabName}Tab`);

        if (selectedTab) selectedTab.classList.add('active');
        if (selectedContent) selectedContent.classList.add('active');
    }

    function closeModal() {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    document.addEventListener('click', function (event) {
        var card = event.target.closest('.disease-guide-card');
        if (!card) return;

        var isDownloadButton = event.target.closest('.card-action');
        if (isDownloadButton) return;

        openModalFromCard(card);
    }, true);

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal) {
        modal.addEventListener('click', function (e) { 
            if (e.target === modal) closeModal(); 
        });
        document.addEventListener('keydown', function (e) { 
            if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); 
        });
    }

    /* PDF download */
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function () {
            if (!modal) return;
            var content = document.createElement('div');
            var title = modalTitle ? modalTitle.textContent.trim() : 'Guide';
            content.style.padding = '16px';
            content.style.maxWidth = '800px';
            var heading = document.createElement('h2');
            heading.textContent = title;
            var imgClone = modalImage && modalImage.src ? modalImage.cloneNode(true) : null;
            if (imgClone) {
                imgClone.style.maxWidth = '100%';
                imgClone.style.borderRadius = '8px';
                imgClone.style.margin = '8px 0';
            }
            
            // Clone all tab contents for PDF
            var allContent = document.createElement('div');
            modal.querySelectorAll('.tab-content').forEach(function(tab) {
                var tabClone = tab.cloneNode(true);
                tabClone.style.display = 'block';
                allContent.appendChild(tabClone);
            });
            
            allContent.querySelectorAll('button').forEach(function (b) { b.remove(); });
            content.appendChild(heading);
            if (imgClone) content.appendChild(imgClone);
            content.appendChild(allContent);

            var opt = {
                margin: 10,
                filename: (title || 'guide') + '.pdf',
                image: { type: 'jpeg', quality: 0.95 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            if (window.html2pdf) {
                window.html2pdf().set(opt).from(content).save();
            } else {
                alert('PDF library failed to load. Please try again.');
            }
        });
    }
});
export default {};