console.log('🔍 disease-detection.js loaded!');

document.addEventListener('DOMContentLoaded', function () {
    console.log('🔍 DOMContentLoaded fired');

    const uploadZone = document.getElementById('uploadZone');
    const imageInput = document.getElementById('imageInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const previewSection = document.getElementById('previewSection');
    const previewImage = document.getElementById('previewImage');
    const previewInfo = document.getElementById('previewInfo');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');

    let selectedFile = null;

    console.log('Elements found:', {
        uploadZone: !!uploadZone,
        imageInput: !!imageInput,
        selectFileBtn: !!selectFileBtn,
        analyzeBtn: !!analyzeBtn
    });

    // Check if we're on a page that has these elements
    if (!uploadZone || !imageInput || !analyzeBtn) {
        console.log('Not on disease detection page, skipping initialization');
        return;
    }

    // Click to select file
    selectFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('Select file button clicked');
        imageInput.click();
    });

    // Drag and drop on entire upload zone
    uploadZone.addEventListener('click', () => {
        console.log('Upload zone clicked');
        imageInput.click();
    });

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    // File input change
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileSelect(file);
        }
    });

    // Remove image
    removeImageBtn.addEventListener('click', () => {
        clearSelection();
    });

    // Analyze button
    analyzeBtn.addEventListener('click', async () => {
        console.log('🔴 ANALYZE BUTTON CLICKED!');
        if (selectedFile) {
            await analyzeImage(selectedFile);
        }
    });

    function handleFileSelect(file) {
        console.log('📁 handleFileSelect called with:', file.name);

        // Validate file type
        if (!file.type.match('image.*')) {
            console.error('❌ Invalid file type:', file.type);
            showNotification('Please select an image file', 'error');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            console.error('❌ File too large:', file.size);
            showNotification('Image size must be less than 5MB', 'error');
            return;
        }

        console.log('✅ File validation passed');
        selectedFile = file;
        console.log('✅ selectedFile set to:', selectedFile.name);

        // Show preview
        const reader = new FileReader();

        reader.onerror = (error) => {
            console.error('❌ FileReader error:', error);
        };

        reader.onload = (e) => {
            console.log('📸 FileReader loaded, setting preview');
            previewImage.src = e.target.result;
            previewSection.classList.add('show');

            console.log('✅ Preview section classes:', previewSection.className);

            // Show file info
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            previewInfo.textContent = `${file.name} (${sizeMB} MB)`;

            console.log('✅ About to enable button...');
            console.log('Button before:', analyzeBtn.disabled);

            // Enable analyze button
            analyzeBtn.disabled = false;
            analyzeBtn.removeAttribute('disabled');

            console.log('Button after:', analyzeBtn.disabled);
            console.log('Button element:', analyzeBtn);

            showNotification('Image loaded! Click "Analyze for Diseases" to continue', 'success');
        };

        console.log('📸 Starting FileReader...');
        reader.readAsDataURL(file);
    }

    function clearSelection() {
        selectedFile = null;
        imageInput.value = '';
        previewSection.classList.remove('show');
        previewImage.src = '';
        previewInfo.textContent = '';
        analyzeBtn.disabled = true;
        showNotification('Image removed', 'info');
    }

    async function analyzeImage(file) {
        console.log('🚀 analyzeImage called with:', file.name);

        try {
            // Show loading state
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<span class="loading-spinner">🔄</span> Analyzing...';

            const formData = new FormData();
            formData.append('image', file);

            console.log('Sending request to API...');

            const response = await fetch('http://localhost:3000/api/analyze-disease', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            console.log('Response received! Status:', response.status);

            if (!response.ok) {
                console.error('Response not OK');
                const errorData = await response.json().catch(() => null);
                console.error('Error data:', errorData);
                throw new Error(errorData?.error || 'Failed to analyze image');
            }

            console.log('Response OK, parsing JSON...');
            const result = await response.json();
            console.log('✅ API Response:', result);
            console.log('✅ Result type:', typeof result);
            console.log('✅ Has diseases?', result && result.diseases);
            console.log('✅ Diseases length:', result?.diseases?.length);

            if (result && result.diseases && result.diseases.length > 0) {
                console.log('✅ Calling displayResults...');
                displayResults(result);
                console.log('✅ displayResults called');
            } else {
                console.warn('⚠️ No diseases in result');
                showNotification('No diseases detected in the image', 'info');
            }

        } catch (error) {
            console.error('❌ Analysis error:', error);
            console.error('❌ Error stack:', error.stack);
            showNotification(error.message || 'Failed to analyze image', 'error');
        } finally {
            console.log('🔄 Resetting button state');
            // Reset button
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = 'Analyze for Diseases';
        }
    }

    function displayResults(data) {
        console.log('📊 displayResults called');
        console.log('📊 Data received:', data);

        // Remove existing modal if any
        const existingModal = document.querySelector('.ai-results-modal');
        console.log('📊 Existing modal:', existingModal);
        if (existingModal) {
            console.log('📊 Removing existing modal');
            existingModal.remove();
        }

        console.log('📊 Creating modal...');
        const modal = createResultsModal(data);
        console.log('📊 Modal created:', modal);

        console.log('📊 Appending to body...');
        document.body.appendChild(modal);
        console.log('📊 Modal appended');

        console.log('📊 Modal in DOM?', document.body.contains(modal));
        console.log('📊 Modal classes:', modal.className);

        setTimeout(() => {
            console.log('📊 Adding "open" class');
            modal.classList.add('open');
            console.log('📊 Modal classes after:', modal.className);
            console.log('📊 Modal style:', {
                display: modal.style.display,
                opacity: window.getComputedStyle(modal).opacity,
                zIndex: window.getComputedStyle(modal).zIndex
            });
        }, 10);
    }

    function createResultsModal(data) {
        const modal = document.createElement('div');
        modal.className = 'ai-results-modal';

        const plantName = data.plant_name || 'Unknown Plant';
        const diseases = data.diseases || [];
        const topDisease = diseases.reduce((prev, current) =>
            (prev.probability > current.probability) ? prev : current
        );

        let html = `
            <div class="ai-results-content">
                <div class="ai-results-header">
                    <h2>🔬 AI Disease Detection Results</h2>
                    <button class="ai-results-close" aria-label="Close">×</button>
                </div>
                <div class="ai-results-body">
                    <h2 style="margin-bottom: 20px; color: hsl(140, 62%, 24%);">🌱 Plant: ${escapeHTML(plantName)}</h2>
                    
                    <div style="background-color: ${getProbabilityColor(topDisease.probability)}; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 2px solid ${getProbabilityBorderColor(topDisease.probability)};">
                        <h3 style="margin-bottom: 10px; color: hsl(140, 62%, 20%);">Primary Diagnosis: ${escapeHTML(topDisease.name)}</h3>
                        <p style="margin-bottom: 10px; font-size: 1.1em;"><strong>Confidence:</strong> ${(topDisease.probability * 100).toFixed(1)}%</p>
                    </div>
                    
                    <div style="background: hsl(140, 62%, 98%); padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid hsl(140, 62%, 40%);">
                        <h4 style="color: hsl(140, 62%, 24%); margin-bottom: 8px;">💊 Recommended Treatment:</h4>
                        <p style="line-height: 1.6; color: hsl(140, 10%, 20%);">${escapeHTML(topDisease.remedy)}</p>
                    </div>
        `;

        const otherDiseases = diseases.filter(d => d.name !== topDisease.name && d.probability > 0.01);

        if (otherDiseases.length > 0) {
            html += '<hr style="margin: 20px 0; border: none; border-top: 1px solid hsl(140, 62%, 90);"><h4 style="margin-bottom: 16px; color: hsl(140, 62%, 24%);">Other Possibilities:</h4>';

            otherDiseases.forEach(d => {
                html += `
                    <div style="border-left: 4px solid ${getProbabilityColor(d.probability)}; padding: 12px; margin-bottom: 10px; background: hsl(0, 0%, 98%); border-radius: 4px;">
                        <strong>${escapeHTML(d.name)}</strong> 
                        <span style="color: #666;">(${(d.probability * 100).toFixed(1)}%)</span>
                        ${d.remedy ? `<p style="margin-top: 8px; font-size: 0.9em; color: #555;">${escapeHTML(d.remedy)}</p>` : ''}
                    </div>
                `;
            });
        }

        html += '</div></div>';
        modal.innerHTML = html;

        const closeBtn = modal.querySelector('.ai-results-close');
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('open');
            setTimeout(() => modal.remove(), 300);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('open');
                setTimeout(() => modal.remove(), 300);
            }
        });

        return modal;
    }

    function getProbabilityColor(probability) {
        if (probability >= 0.7) return 'hsl(140, 62%, 85%)';
        if (probability >= 0.5) return 'hsl(48, 100%, 85%)';
        return 'hsl(0, 62%, 85%)';
    }

    function getProbabilityBorderColor(probability) {
        if (probability >= 0.7) return 'hsl(140, 62%, 40%)';
        if (probability >= 0.5) return 'hsl(48, 100%, 50%)';
        return 'hsl(0, 62%, 50%)';
    }

    function escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
});

export default {};