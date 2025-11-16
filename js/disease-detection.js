const API_BASE_URL = 'http://localhost:3000/api';

console.log('disease-detection.js module loaded');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired in disease-detection.js');
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

    // Check if all elements exist
    console.log('Elements found:', {
        uploadZone: !!uploadZone,
        imageInput: !!imageInput,
        selectFileBtn: !!selectFileBtn,
        analyzeBtn: !!analyzeBtn,
        previewSection: !!previewSection,
        previewImage: !!previewImage,
        previewInfo: !!previewInfo,
        removeImageBtn: !!removeImageBtn,
        detectionResult: !!detectionResult,
        resultContent: !!resultContent
    });

    if (!analyzeBtn) {
        console.error('analyzeBtn not found!');
        return;
    }

    let selectedFile = null;

    previewSection.style.display = 'none';
    detectionResult.style.display = 'none';

    selectFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        imageInput.click();
    });

    uploadZone.addEventListener('click', (e) => {
        // Don't trigger if clicking on the analyze button or its container
        if (e.target.closest('.analyze-section') || e.target.closest('#analyzeBtn')) {
            return;
        }
        imageInput.click();
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
        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB.');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please upload a valid image file.');
            return;
        }

        selectedFile = file;

        // Show preview
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
    removeImageBtn.addEventListener('click', () => {
        selectedFile = null;
        imageInput.value = '';
        previewSection.style.display = 'none';
        detectionResult.style.display = 'none';
        analyzeBtn.disabled = true;
    });

    // Analyze button click
    console.log('Attaching click listener to analyzeBtn');
    console.log('analyzeBtn element:', analyzeBtn);
    
    if (!analyzeBtn) {
        console.error('CRITICAL: analyzeBtn is null!');
        return;
    }
    
    // Track if we're processing
    let isProcessing = false;
    let isPolling = false; // Track if we're actively polling for results
    
    // Prevent page unload while actively polling
    // This is necessary to prevent page refresh during analysis
    const beforeunloadHandler = (e) => {
        if (isPolling) {
            console.warn('Page unload detected while polling for analysis results!');
            // Modern browsers ignore custom messages, but we still need returnValue
            e.preventDefault();
            e.returnValue = ''; // Empty string triggers default browser message
            return e.returnValue;
        }
    };
    
    // Add the handler once
    window.addEventListener('beforeunload', beforeunloadHandler);
    console.log('beforeunload handler added to prevent page refresh during analysis');
    
    // Use capture phase to ensure our handler runs first and prevents all navigation
    analyzeBtn.addEventListener('click', async (e) => {
        // CRITICAL: Prevent any default behavior FIRST, before anything else
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Also prevent any form submission if button is somehow in a form
        if (e.target.form) {
            e.target.form.addEventListener('submit', (submitEvent) => {
                submitEvent.preventDefault();
                submitEvent.stopPropagation();
            }, { once: true });
        }
        
        console.log('=== ANALYZE BUTTON CLICKED ===');
        console.log('Event:', e);
        console.log('selectedFile:', selectedFile);
        console.log('Event defaultPrevented:', e.defaultPrevented);
        console.log('Event type:', e.type);
        console.log('Event target:', e.target);
        console.log('Event currentTarget:', e.currentTarget);
        console.log('Button form:', e.target.form);
        
        // Double-check we're not in a form
        const form = analyzeBtn.closest('form');
        if (form) {
            console.error('WARNING: Button is inside a form!', form);
            // Prevent form submission
            form.addEventListener('submit', (submitEvent) => {
                submitEvent.preventDefault();
                submitEvent.stopPropagation();
                console.log('Form submission prevented');
            }, { once: true });
        }
        
        if (!selectedFile) {
            console.log('No file selected');
            alert('Please select an image first.');
            return;
        }
        console.log('File selected, proceeding with analysis');
        
        // Mark as processing
        isProcessing = true;
        
        // Prevent any possible navigation
        if (e.cancelable) {
            e.preventDefault();
        }

        // Disable button and show loading state
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Analyzing...';
        
        // Show waiting message immediately
        console.log('Showing waiting message...');
        console.log('detectionResult before:', detectionResult);
        console.log('detectionResult display before:', window.getComputedStyle(detectionResult).display);
        
        detectionResult.style.display = 'block';
        detectionResult.setAttribute('data-processing', 'true'); // Mark as processing
        
        const waitingHTML = `
            <div style="text-align: center; padding: 40px 20px;" id="waitingMessage">
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
        
        resultContent.innerHTML = waitingHTML;
        
        console.log('Waiting message set');
        console.log('detectionResult display after:', window.getComputedStyle(detectionResult).display);
        console.log('detectionResult offsetHeight:', detectionResult.offsetHeight);
        
        // Force visibility
        detectionResult.style.visibility = 'visible';
        detectionResult.style.opacity = '1';
        
        // Scroll to results area
        setTimeout(() => {
            detectionResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            console.log('Scrolled to detectionResult');
        }, 100);

        try {
            // Create FormData to send file
            const formData = new FormData();
            formData.append('image', selectedFile);

            // Send to backend API to start analysis
            console.log('Sending request to:', `${API_BASE_URL}/analyze-disease`);
            console.log('Selected file:', selectedFile.name, selectedFile.size, 'bytes');
            
            let response;
            try {
                console.log('About to fetch...');
                response = await fetch(`${API_BASE_URL}/analyze-disease`, {
                    method: 'POST',
                    body: formData,
                    credentials: 'include',
                    redirect: 'manual' // Prevent automatic redirects
                });
                console.log('Response received:', response.status, response.statusText);
                console.log('Response type:', response.type);
                console.log('Response URL:', response.url);
                
                // Check for redirects
                if (response.type === 'opaqueredirect' || response.status === 0) {
                    console.error('WARNING: Response indicates redirect or CORS issue');
                    throw new Error('Unexpected redirect detected. Check server configuration.');
                }
            } catch (fetchError) {
                console.error('Fetch error caught:', fetchError);
                console.error('Fetch error name:', fetchError.name);
                console.error('Fetch error message:', fetchError.message);
                throw fetchError;
            }

            if (!response.ok) {
                let errorMessage = `Server error (${response.status})`;
                try {
                    const errorText = await response.text();
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorMessage;
                } catch (jsonError) {
                    errorMessage = response.statusText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            // Get analysis ID from response
            let startResponse;
            try {
                const responseText = await response.text();
                startResponse = JSON.parse(responseText);
            } catch (jsonError) {
                console.error('Error parsing start response:', jsonError);
                throw new Error('Invalid response from server');
            }
            
            console.log('Analysis started, ID:', startResponse.analysisId);
            
            if (!startResponse.analysisId) {
                throw new Error('Failed to get analysis ID from server');
            }

            const analysisId = startResponse.analysisId;

            // Poll for results
            console.log('Polling for results...');
            isPolling = true; // Start polling - this will trigger beforeunload warnings
            analyzeBtn.textContent = 'Analyzing... (Waiting for results)';
            const maxAttempts = 120; // 120 attempts = 60 seconds max (500ms intervals)
            let attempts = 0;
            let resultData = null;
            let lastUpdateTime = Date.now();

            // Function to update waiting message
            const updateWaitingMessage = (elapsedSeconds) => {
                resultContent.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px;">
                        <div style="font-size: 2em; margin-bottom: 20px;">⏳</div>
                        <h3 style="color: hsl(140, 62%, 40%); margin-bottom: 10px;">Processing Your Image</h3>
                        <p style="color: hsl(0, 0%, 40%); margin-bottom: 10px;">Please wait while we analyze your plant image...</p>
                        <p style="color: hsl(0, 0%, 50%); font-size: 0.9em; margin-bottom: 20px;">Elapsed time: ${elapsedSeconds.toFixed(1)}s</p>
                        <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid hsl(140, 62%, 90%); border-top: 4px solid hsl(140, 62%, 40%); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <style>
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        </style>
                    </div>
                `;
            };

            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between polls
                attempts++;
                
                const elapsedSeconds = attempts * 0.5;
                
                // Update waiting message every 2 seconds
                if (Date.now() - lastUpdateTime >= 2000) {
                    updateWaitingMessage(elapsedSeconds);
                    lastUpdateTime = Date.now();
                }
                
                // Update button text to show progress
                if (attempts % 4 === 0) { // Update every 2 seconds
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
                    console.log(`Poll attempt ${attempts}:`, result);
                    console.log(`Status: ${result.status}`);

                    if (result.status === 'completed') {
                        // Stop polling - results received
                        isPolling = false;
                        // Remove status field and use the rest as data
                        const { status, ...data } = result;
                        resultData = data;
                        console.log('Results received - full data:', JSON.stringify(resultData, null, 2));
                        console.log('Result data keys:', Object.keys(resultData));
                        console.log('Plant name:', resultData.plant_name);
                        console.log('Diseases:', resultData.diseases);
                        break;
                    } else if (result.status === 'error') {
                        console.error('Analysis error:', result.error);
                        throw new Error(result.error || 'Analysis failed');
                    } else if (result.status === 'processing') {
                        console.log(`Still processing... (attempt ${attempts}/${maxAttempts})`);
                    }
                    // Continue polling
                } catch (pollError) {
                    console.error('Error polling for results:', pollError);
                    if (pollError.message.includes('Analysis failed') || pollError.message.includes('error')) {
                        throw pollError;
                    }
                    // Continue polling on network errors
                }
            }

            // Stop polling when done (either success or timeout)
            isPolling = false;
            
            if (!resultData) {
                // Show timeout message
                resultContent.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px; color: hsl(0, 62%, 50%);">
                        <div style="font-size: 2em; margin-bottom: 20px;">⏱️</div>
                        <h3 style="margin-bottom: 10px;">Analysis Taking Longer Than Expected</h3>
                        <p style="margin-bottom: 20px;">The analysis is still processing. This may take a bit longer for complex images.</p>
                        <p style="font-size: 0.9em; color: hsl(0, 0%, 40%);">You can refresh the page and try again, or wait a bit longer.</p>
                    </div>
                `;
                throw new Error('Analysis timed out after 60 seconds. The image may still be processing. Please try again.');
            }

            // Display results
            console.log('About to call displayResults with:', resultData);
            try {
                detectionResult.style.display = 'block';
                displayResults(resultData);
                console.log('displayResults completed successfully');

                isProcessing = false;
                isPolling = false;
                detectionResult.removeAttribute('data-processing');
                analyzeBtn.disabled = false;
                analyzeBtn.textContent = 'Analyze for Diseases';
            } catch (displayError) {
                console.error('Error in displayResults:', displayError);
                throw displayError;
            }

        } catch (error) {
            console.error('=== ERROR CAUGHT IN ANALYZE HANDLER ===');
            console.error('Error type:', error.constructor.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Full error object:', error);
            console.error('========================================');
            
            let errorMessage = error.message;
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMessage = 'Cannot connect to server. Please make sure the backend server is running on port 3000.';
            }
            
            try {
                isProcessing = false;
                isPolling = false;
                detectionResult.removeAttribute('data-processing');
                detectionResult.style.display = 'block';
                resultContent.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px; color: hsl(0, 62%, 50%);">
                        <div style="font-size: 2em; margin-bottom: 20px;">❌</div>
                        <h3 style="margin-bottom: 10px;">Analysis Error</h3>
                        <p style="margin-bottom: 20px; color: hsl(0, 62%, 40%);">${errorMessage}</p>
                        <p style="font-size: 0.9em; color: hsl(0, 0%, 40%);">Please try again or check your connection.</p>
                    </div>
                `;
                console.log('Error message displayed in UI');
            } catch (displayError) {
                console.error('Error displaying error message:', displayError);
            }
        } finally {
            console.log('=== FINALLY BLOCK EXECUTING ===');

            const stillProcessing = detectionResult && detectionResult.getAttribute('data-processing') === 'true';
            const hasWaitingMessage = resultContent && resultContent.innerHTML && 
                                     (resultContent.innerHTML.includes('Processing Your Image') ||
                                      resultContent.innerHTML.includes('Elapsed time'));
            
            console.log('Finally block - stillProcessing:', stillProcessing, 'hasWaitingMessage:', hasWaitingMessage, 'isProcessing flag:', isProcessing);
            

            if (!stillProcessing && !hasWaitingMessage) {
                isProcessing = false;
                isPolling = false;

                console.log('Resetting button in finally block');
                if (analyzeBtn) {
                    analyzeBtn.disabled = false;
                    analyzeBtn.textContent = 'Analyze for Diseases';
                }
            } else {
                console.log('Keeping button disabled - still processing');
            }
            console.log('=== FINALLY BLOCK COMPLETE ===');
        }
    });
    
    console.log('Click listener attached successfully');

    function displayResults(data) {
        console.log('displayResults called with:', data);
        console.log('detectionResult element:', detectionResult);
        console.log('detectionResult display:', window.getComputedStyle(detectionResult).display);
        
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
            
            data.diseases.forEach((disease, index) => {
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

        console.log('Setting innerHTML, HTML length:', html.length);
        console.log('resultContent element:', resultContent);
        console.log('detectionResult element before:', detectionResult);
        console.log('detectionResult display before:', window.getComputedStyle(detectionResult).display);
        
        resultContent.innerHTML = html;
        console.log('HTML set to resultContent');
        
        detectionResult.style.display = 'block';
        console.log('detectionResult display set to block');
        
        const computedDisplay = window.getComputedStyle(detectionResult).display;
        console.log('detectionResult display after:', computedDisplay);
        console.log('detectionResult visible:', detectionResult.offsetParent !== null);
        console.log('detectionResult offsetHeight:', detectionResult.offsetHeight);
        console.log('detectionResult offsetWidth:', detectionResult.offsetWidth);
        
        void detectionResult.offsetHeight;
        
        setTimeout(() => {
            detectionResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            console.log('Scrolled to results');
        }, 100);
    }
});

export default {}