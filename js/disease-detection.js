import { API_BASE_URL } from './config.js';

function initDiseaseDetection() {
    const uploadZone = document.getElementById('uploadZone');
    const imageInput = document.getElementById('imageInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const previewSection = document.getElementById('previewSection');
    const previewImage = document.getElementById('previewImage');
    const previewInfo = document.getElementById('previewInfo');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const diseaseResultModal = document.getElementById('diseaseResultModal');
    const resultContent = document.getElementById('resultContent');
    const resultModalImage = document.getElementById('resultModalImage');
    const diseaseResultModalClose = document.getElementById('diseaseResultModalClose');
    const diseaseResultModalDownload = document.getElementById('diseaseResultModalDownload');

    if (!uploadZone || !imageInput || !selectFileBtn || !analyzeBtn ||
        !previewSection || !previewImage || !previewInfo || !removeImageBtn ||
        !diseaseResultModal || !resultContent || !resultModalImage || 
        !diseaseResultModalClose || !diseaseResultModalDownload) {
        return;
    }

    let selectedFile = null;
    let isProcessing = false;
    let currentResultData = null;

    previewSection.style.display = 'none';

    function closeModal() {
        diseaseResultModal.classList.remove('open');
        diseaseResultModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    function openModal() {
        diseaseResultModal.classList.add('open');
        diseaseResultModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    diseaseResultModalClose.addEventListener('click', closeModal);
    diseaseResultModal.addEventListener('click', (e) => {
        if (e.target === diseaseResultModal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && diseaseResultModal.classList.contains('open')) {
            closeModal();
        }
    });

    if (diseaseResultModalDownload) {
        diseaseResultModalDownload.addEventListener('click', function () {
            if (!diseaseResultModal || !diseaseResultModal.classList.contains('open')) return;
            if (!currentResultData) {
                alert('No result data available for export.');
                return;
            }

            const pdfContent = document.createElement('div');
            pdfContent.style.cssText = 'padding: 30px; font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;';

            const header = document.createElement('div');
            header.style.cssText = 'text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2e7d32; padding-bottom: 20px;';
            header.innerHTML = `
                <h1 style="color: #2e7d32; margin: 0 0 10px 0; font-size: 28px;">Plant Disease Detection Result</h1>
                <p style="color: #555; margin: 0; font-size: 14px;">Generated on ${new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })}</p>
            `;
            pdfContent.appendChild(header);

            if (resultModalImage && resultModalImage.src) {
                const imageSection = document.createElement('div');
                imageSection.style.cssText = 'margin: 20px 0; text-align: center;';
                
                const img = document.createElement('img');
                img.src = resultModalImage.src;
                img.style.cssText = 'max-width: 100%; max-height: 300px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);';
                imageSection.appendChild(img);
                pdfContent.appendChild(imageSection);
            }

            if (currentResultData.plant_name) {
                const plantSection = document.createElement('div');
                plantSection.style.cssText = 'background: linear-gradient(135deg, #e8f5e9, #f1f8f4); padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #2e7d32;';
                plantSection.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">🌱</span>
                        <div>
                            <p style="margin: 0; font-size: 12px; color: #666; font-weight: 600;">PLANT DETECTED</p>
                            <h2 style="margin: 5px 0 0 0; color: #2e7d32; font-size: 22px;">${escapeHTML(currentResultData.plant_name)}</h2>
                        </div>
                    </div>
                `;
                pdfContent.appendChild(plantSection);
            }

            if (currentResultData.diseases && currentResultData.diseases.length > 0) {
                const resultsHeader = document.createElement('h3');
                resultsHeader.style.cssText = 'color: #333; margin: 30px 0 15px 0; font-size: 20px; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px;';
                resultsHeader.textContent = 'Detection Results';
                pdfContent.appendChild(resultsHeader);

                currentResultData.diseases.forEach((disease, index) => {
                    const isHealthy = disease.name.toLowerCase() === 'healthy';
                    const probabilityPercent = (disease.probability * 100).toFixed(1);

                    const diseaseCard = document.createElement('div');
                    diseaseCard.style.cssText = `
                        margin-bottom: 20px; 
                        padding: 20px; 
                        background: ${isHealthy ? '#e8f5e9' : '#fff8e1'}; 
                        border-radius: 12px;
                        border-left: 5px solid ${isHealthy ? '#2e7d32' : '#f9a825'};
                        break-inside: avoid;
                    `;

                    const diseaseHeader = document.createElement('div');
                    diseaseHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;';
                    diseaseHeader.innerHTML = `
                        <h4 style="margin: 0; color: ${isHealthy ? '#2e7d32' : '#f57f17'}; font-size: 18px;">${escapeHTML(disease.name)}</h4>
                        <span style="background: ${isHealthy ? '#2e7d32' : '#f9a825'}; color: white; padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                            ${probabilityPercent}% confidence
                        </span>
                    `;
                    diseaseCard.appendChild(diseaseHeader);

                    if (disease.remedy) {
                        const remedySection = document.createElement('div');
                        remedySection.style.cssText = 'margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.1);';
                        remedySection.innerHTML = `
                            <p style="margin: 0 0 8px 0; font-weight: 600; color: #333; font-size: 14px;">💊 Remedy:</p>
                            <p style="margin: 0; color: #555; line-height: 1.6; font-size: 13px;">${escapeHTML(disease.remedy)}</p>
                        `;
                        diseaseCard.appendChild(remedySection);
                    }

                    pdfContent.appendChild(diseaseCard);
                });
            } else {
                const noDisease = document.createElement('div');
                noDisease.style.cssText = 'padding: 20px; background: #e8f5e9; border-radius: 12px; margin: 20px 0; text-align: center; border: 2px solid #2e7d32;';
                noDisease.innerHTML = `
                    <p style="margin: 0; color: #2e7d32; font-size: 16px; font-weight: 600;">✓ No diseases detected</p>
                    <p style="margin: 5px 0 0 0; color: #555; font-size: 14px;">The plant appears to be healthy.</p>
                `;
                pdfContent.appendChild(noDisease);
            }

            const footer = document.createElement('div');
            footer.style.cssText = 'margin-top: 40px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center;';
            footer.innerHTML = `
                <p style="margin: 0; color: #888; font-size: 12px;">© 2025 Farmer's Center - Empowering farmers with technology</p>
                <p style="margin: 5px 0 0 0; color: #888; font-size: 11px;">This report is for informational purposes only. Consult with agricultural experts for professional advice.</p>
            `;
            pdfContent.appendChild(footer);

            const opt = {
                margin: [15, 15, 15, 15],
                filename: `plant-disease-detection-${new Date().getTime()}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2, 
                    useCORS: true,
                    logging: false,
                    letterRendering: true
                },
                jsPDF: { 
                    unit: 'mm', 
                    format: 'a4', 
                    orientation: 'portrait',
                    compress: true
                },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            if (window.html2pdf) {
                window.html2pdf().set(opt).from(pdfContent).save();
            } else {
                alert('PDF library failed to load. Please refresh the page and try again.');
            }
        });
    }

    selectFileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        imageInput.click();
    });

    uploadZone.addEventListener('click', (e) => {
        if (!e.target.closest('.select-file-btn')) {
            imageInput.click();
        }
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileSelect(file);
        }
    });

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'hsl(140, 62%, 42%)';
        uploadZone.style.background = 'hsl(140, 62%, 95%)';
    });

    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'hsla(140, 62%, 42%, 0.5)';
        uploadZone.style.background = 'hsl(140, 62%, 98%)';
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'hsla(140, 62%, 42%, 0.5)';
        uploadZone.style.background = 'hsl(140, 62%, 98%)';

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleFileSelect(file);
        } else {
            alert('Please upload a valid image file.');
        }
    });

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
            uploadZone.style.display = 'none';
            analyzeBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    removeImageBtn.addEventListener('click', (e) => {
        e.preventDefault();
        selectedFile = null;
        currentResultData = null;
        imageInput.value = '';
        previewSection.style.display = 'none';
        uploadZone.style.display = 'block';
        closeModal();
        analyzeBtn.disabled = true;
    });

    analyzeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const form = analyzeBtn.closest('form');
        if (form) {
            return false;
        }

        if (!selectedFile) {
            alert('Please select an image first.');
            return;
        }

        if (isProcessing) {
            return;
        }

        isProcessing = true;
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Analyzing...';

        previewSection.style.display = 'none';
        uploadZone.style.display = 'block';

        resultModalImage.src = previewImage.src;
        resultModalImage.style.display = 'block';

        resultContent.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 2em; margin-bottom: 20px;">⏳</div>
                <h3 style="color: hsl(140, 62%, 42%); margin-bottom: 10px;">Processing Your Image</h3>
                <p style="color: hsl(0, 0%, 30%); margin-bottom: 20px;">Please wait while we analyze your plant image...</p>
                <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid hsl(140, 62%, 90%); border-top: 4px solid hsl(140, 62%, 42%); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </div>
        `;

        openModal();

        try {
            const formData = new FormData();
            formData.append('image', selectedFile);

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

            if (!startResponse.analysisId) {
                throw new Error('Failed to get analysis ID from server');
            }

            const analysisId = startResponse.analysisId;
            analyzeBtn.textContent = 'Analyzing... (Waiting for results)';
            
            const maxAttempts = 120;
            let attempts = 0;
            let resultData = null;
            let lastUpdateTime = Date.now();

            const updateWaitingMessage = (elapsedSeconds) => {
                resultContent.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px;">
                        <div style="font-size: 2em; margin-bottom: 20px;">⏳</div>
                        <h3 style="color: hsl(140, 62%, 42%); margin-bottom: 10px;">Processing Your Image</h3>
                        <p style="color: hsl(0, 0%, 40%); margin-bottom: 10px;">Please wait while we analyze your plant image...</p>
                        <p style="color: hsl(0, 0%, 50%); font-size: 0.9em; margin-bottom: 20px;">Elapsed time: ${elapsedSeconds.toFixed(1)}s</p>
                        <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid hsl(140, 62%, 90%); border-top: 4px solid hsl(140, 62%, 42%); border-radius: 50%; animation: spin 1s linear infinite;"></div>
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

                    if (result.status === 'completed') {
                        const { status, ...data } = result;
                        resultData = data;
                        break;
                    } else if (result.status === 'error') {
                        throw new Error(result.error || 'Analysis failed');
                    }
                } catch (pollError) {
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
                openModal();
                throw new Error('Analysis timed out after 60 seconds.');
            }

            currentResultData = resultData;
            displayResults(resultData);

        } catch (error) {
            currentResultData = null;
            let errorMessage = error.message;
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Cannot connect to server. Please make sure the backend is running.';
            }

            resultModalImage.src = previewImage.src;
            resultModalImage.style.display = 'block';
            resultContent.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: hsl(0, 62%, 50%);">
                    <div style="font-size: 2em; margin-bottom: 20px;">❌</div>
                    <h3 style="margin-bottom: 10px;">Analysis Error</h3>
                    <p style="margin-bottom: 20px; color: hsl(0, 62%, 40%);">${errorMessage}</p>
                    <p style="font-size: 0.9em; color: hsl(0, 0%, 40%);">Please try again or check your connection.</p>
                </div>
            `;
            openModal();
        } finally {
            isProcessing = false;
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Analyze for Diseases';
        }
    });

    function displayResults(data) {
        let html = '';

        if (data.plant_name) {
            html += `
                <div style="margin-bottom: 20px; padding: 15px; background: hsl(140, 62%, 95%); border-radius: 8px;">
                    <strong style="color: hsl(140, 62%, 42%); font-size: 1.1em;">Plant Detected:</strong>
                    <span style="font-size: 1.1em; margin-left: 10px;">${escapeHTML(data.plant_name)}</span>
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
                        border-left: 4px solid ${isHealthy ? 'hsl(140, 62%, 42%)' : 'hsl(48, 100%, 50%)'};
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <h5 style="
                                color: ${isHealthy ? 'hsl(140, 62%, 42%)' : 'hsl(48, 100%, 30%)'}; 
                                font-size: 1.2em; 
                                margin: 0;
                            ">
                                ${escapeHTML(disease.name)}
                            </h5>
                            <span style="
                                background: ${isHealthy ? 'hsl(140, 62%, 42%)' : 'hsl(48, 100%, 50%)'}; 
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
                                <p style="color: hsl(0, 0%, 30%); margin-top: 5px; line-height: 1.6;">${escapeHTML(disease.remedy)}</p>
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
        resultModalImage.src = previewImage.src;
        resultModalImage.style.display = 'block';
        openModal();
    }

    function escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDiseaseDetection);
} else {
    initDiseaseDetection();
}

export default { init: initDiseaseDetection };