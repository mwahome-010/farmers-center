import { API_BASE_URL } from './config.js';

console.log('disease-detection.js module loaded');

function initDiseaseDetection() {
    console.log('Initializing disease detection...');
    const uploadZone = document.getElementById('uploadZone');
    const imageInput = document.getElementById('imageInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const previewSection = document.getElementById('previewSection');
    const previewImage = document.getElementById('previewImage');
    const previewInfo = document.getElementById('previewInfo');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const detectionResult = document.getElementById('detectionResult');
    const resultContent = document.getElementById('resultContent');

    // Check if we're on the right page (elements exist)
    if (!uploadZone || !imageInput || !selectFileBtn || !analyzeBtn ||
        !previewSection || !previewImage || !previewInfo || !removeImageBtn ||
        !detectionResult || !resultContent) {
        console.log('Disease detection elements not found - skipping initialization');
        return;
    }

    console.log('All disease detection elements found - initializing...');

    let selectedFile = null;
    let isProcessing = false;

    previewSection.style.display = 'none';
    detectionResult.style.display = 'none';

    // Select file button
    selectFileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        imageInput.click();
    });

    // Upload zone click (only triggers if not clicking on nested elements)
    uploadZone.addEventListener('click', (e) => {
        if (e.target === uploadZone || e.target.closest('.upload-icon, h3, p')) {
            imageInput.click();
        }
    });

    // Handle file input change
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileSelect(file);
        }
    });

    // Drag and drop handlers
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'hsl(140, 62%, 40%)';
        uploadZone.style.background = 'hsl(140, 62%, 95%)';
    });

    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'hsla(140, 62%, 40%, 0.5)';
        uploadZone.style.background = 'hsl(140, 62%, 98%)';
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'hsla(140, 62%, 40%, 0.5)';
        uploadZone.style.background = 'hsl(140, 62%, 98%)';

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleFileSelect(file);
        } else {
            alert('Please upload a valid image file.');
        }
    });

    // Handle file selection
    function handleFileSelect(file) {
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB.');
            return;
        }

        if (!file.type.startsWith('image/')) {
            alert('Please upload a valid image file.');
            return;
        }

        selectedFile = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            previewInfo.textContent = `${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
            previewSection.style.display = 'block';
            analyzeBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    // Remove image
    removeImageBtn.addEventListener('click', (e) => {
        e.preventDefault();
        selectedFile = null;
        imageInput.value = '';
        previewSection.style.display = 'none';
        detectionResult.style.display = 'none';
        analyzeBtn.disabled = true;
    });


    analyzeBtn.addEventListener('click', async (e) => {
        //Stop ALL default behaviors and propagation FIRST
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Prevent any form submission
        const form = analyzeBtn.closest('form');
        if (form) {
            console.warn('Button is inside a form - this should not happen');
            return false;
        }

        console.log('=== ANALYZE BUTTON CLICKED ===');

        if (!selectedFile) {
            alert('Please select an image first.');
            return;
        }

        if (isProcessing) {
            console.log('Already processing, ignoring click');
            return;
        }

        isProcessing = true;
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Analyzing...';

        // Show waiting message
        detectionResult.style.display = 'block';
        resultContent.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 2em; margin-bottom: 20px;">⏳</div>
                <h3 style="color: hsl(140, 62%, 40%); margin-bottom: 10px;">Processing Your Image</h3>
                <p style="color: hsl(0, 0%, 40%); margin-bottom: 20px;">Please wait while we analyze your plant image...</p>
                <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid hsl(140, 62%, 90%); border-top: 4px solid hsl(140, 62%, 40%); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </div>
        `;

        setTimeout(() => {
            detectionResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);

        try {
            const formData = new FormData();
            formData.append('image', selectedFile);

            console.log('Sending request to:', `${API_BASE_URL}/analyze-disease`);

            const response = await fetch(`${API_BASE_URL}/analyze-disease`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) {
                let errorMessage = `Server error (${response.status})`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    errorMessage = response.statusText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const startResponse = await response.json();
            console.log('Analysis started, ID:', startResponse.analysisId);

            if (!startResponse.analysisId) {
                throw new Error('Failed to get analysis ID from server');
            }

            const analysisId = startResponse.analysisId;

            // Poll for results
            console.log('Polling for results...');
            analyzeBtn.textContent = 'Analyzing... (Waiting for results)';
            const maxAttempts = 120;
            let attempts = 0;
            let resultData = null;
            let lastUpdateTime = Date.now();

            const updateWaitingMessage = (elapsedSeconds) => {
                resultContent.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px;">
                        <div style="font-size: 2em; margin-bottom: 20px;">⏳</div>
                        <h3 style="color: hsl(140, 62%, 40%); margin-bottom: 10px;">Processing Your Image</h3>
                        <p style="color: hsl(0, 0%, 40%); margin-bottom: 10px;">Please wait while we analyze your plant image...</p>
                        <p style="color: hsl(0, 0%, 50%); font-size: 0.9em; margin-bottom: 20px;">Elapsed time: ${elapsedSeconds.toFixed(1)}s</p>
                        <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid hsl(140, 62%, 90%); border-top: 4px solid hsl(140, 62%, 40%); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    </div>
                `;
            };

            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;

                const elapsedSeconds = attempts * 0.5;

                if (Date.now() - lastUpdateTime >= 2000) {
                    updateWaitingMessage(elapsedSeconds);
                    lastUpdateTime = Date.now();
                }

                if (attempts % 4 === 0) {
                    analyzeBtn.textContent = `Analyzing... (${elapsedSeconds.toFixed(1)}s)`;
                }

                try {
                    const resultResponse = await fetch(`${API_BASE_URL}/analyze-disease/${analysisId}`, {
                        credentials: 'include'
                    });

                    if (!resultResponse.ok) {
                        throw new Error(`Failed to fetch results: ${resultResponse.status}`);
                    }

                    const result = await resultResponse.json();
                    console.log(`Poll attempt ${attempts}:`, result.status);

                    if (result.status === 'completed') {
                        const { status, ...data } = result;
                        resultData = data;
                        console.log('Results received:', resultData);
                        break;
                    } else if (result.status === 'error') {
                        throw new Error(result.error || 'Analysis failed');
                    }
                } catch (pollError) {
                    console.error('Error polling:', pollError);
                    if (pollError.message.includes('Analysis failed')) {
                        throw pollError;
                    }
                }
            }

            if (!resultData) {
                resultContent.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px; color: hsl(0, 62%, 50%);">
                        <div style="font-size: 2em; margin-bottom: 20px;">⏱️</div>
                        <h3 style="margin-bottom: 10px;">Analysis Taking Longer Than Expected</h3>
                        <p style="margin-bottom: 20px;">The analysis is still processing. Please try again.</p>
                    </div>
                `;
                throw new Error('Analysis timed out after 60 seconds.');
            }

            // Display results
            displayResults(resultData);

        } catch (error) {
            console.error('Analysis error:', error);

            let errorMessage = error.message;
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Cannot connect to server. Please make sure the backend is running.';
            }

            detectionResult.style.display = 'block';
            resultContent.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: hsl(0, 62%, 50%);">
                    <div style="font-size: 2em; margin-bottom: 20px;">❌</div>
                    <h3 style="margin-bottom: 10px;">Analysis Error</h3>
                    <p style="margin-bottom: 20px; color: hsl(0, 62%, 40%);">${errorMessage}</p>
                    <p style="font-size: 0.9em; color: hsl(0, 0%, 40%);">Please try again or check your connection.</p>
                </div>
            `;
        } finally {
            isProcessing = false;
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Analyze for Diseases';
        }
    });

    function displayResults(data) {
        console.log('Displaying results:', data);

        let html = '';

        if (data.plant_name) {
            html += `
                <div style="margin-bottom: 20px; padding: 15px; background: hsl(140, 62%, 95%); border-radius: 8px;">
                    <strong style="color: hsl(140, 62%, 40%); font-size: 1.1em;">Plant Detected:</strong>
                    <span style="font-size: 1.1em; margin-left: 10px;">${data.plant_name}</span>
                </div>
            `;
        }

        if (data.diseases && data.diseases.length > 0) {
            html += '<div style="margin-top: 20px;">';
            html += '<h4 style="color: hsl(0, 0%, 20%); margin-bottom: 15px;">Detection Results:</h4>';

            data.diseases.forEach((disease) => {
                const isHealthy = disease.name.toLowerCase() === 'healthy';
                const probabilityPercent = (disease.probability * 100).toFixed(1);

                html += `
                    <div style="
                        margin-bottom: 20px; 
                        padding: 20px; 
                        background: ${isHealthy ? 'hsl(140, 62%, 95%)' : 'hsl(48, 100%, 95%)'}; 
                        border-radius: 8px;
                        border-left: 4px solid ${isHealthy ? 'hsl(140, 62%, 40%)' : 'hsl(48, 100%, 50%)'};
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <h5 style="
                                color: ${isHealthy ? 'hsl(140, 62%, 40%)' : 'hsl(48, 100%, 30%)'}; 
                                font-size: 1.2em; 
                                margin: 0;
                            ">
                                ${disease.name}
                            </h5>
                            <span style="
                                background: ${isHealthy ? 'hsl(140, 62%, 40%)' : 'hsl(48, 100%, 50%)'}; 
                                color: white; 
                                padding: 5px 12px; 
                                border-radius: 20px; 
                                font-size: 0.9em; 
                                font-weight: 600;
                            ">
                                ${probabilityPercent}% confidence
                            </span>
                        </div>
                        ${disease.remedy ? `
                            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid ${isHealthy ? 'hsl(140, 62%, 80%)' : 'hsl(48, 100%, 80%)'};">
                                <strong style="color: hsl(0, 0%, 20%);">Remedy:</strong>
                                <p style="color: hsl(0, 0%, 30%); margin-top: 5px; line-height: 1.6;">${disease.remedy}</p>
                            </div>
                        ` : ''}
                    </div>
                `;
            });

            html += '</div>';
        } else {
            html += `
                <div style="padding: 20px; background: hsl(0, 0%, 95%); border-radius: 8px; margin-top: 20px; color: hsl(0, 0%, 30%);">
                    No diseases detected. The plant appears to be healthy.
                </div>
            `;
        }

        resultContent.innerHTML = html;
        detectionResult.style.display = 'block';

        setTimeout(() => {
            detectionResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }

    console.log('Disease detection initialization complete');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDiseaseDetection);
} else {
    initDiseaseDetection();
}

export default { init: initDiseaseDetection };