// main.js
let imageWorker = null;
let canvas = null;
let ctx = null;
let originalImageData = null;
let selectedRegions = null;
let animationFrameId = null;
let workerActive = false;

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const htmlEditor = document.getElementById('htmlEditor');
    const cssEditor = document.getElementById('cssEditor');
    const jsEditor = document.getElementById('jsEditor');
    const htmlOutput = document.getElementById('htmlOutput');
    const cssOutput = document.getElementById('cssOutput');
    const jsOutput = document.getElementById('jsOutput');
    const runCodeBtn = document.getElementById('runCode');
    const refreshPreviewBtn = document.getElementById('refreshPreview');
    const imageUploadBtn = document.getElementById('imageUploadBtn');
    const imageUploadModal = document.getElementById('imageUploadModal');
    const closeImageModalBtn = document.getElementById('closeImageModal');
    const cancelImageUploadBtn = document.getElementById('cancelImageUpload');
    const imageUploadInput = document.getElementById('imageUploadInput');
    const uploadedImagePreview = document.getElementById('uploadedImagePreview');
    const confirmImageUploadBtn = document.getElementById('confirmImageUpload');
    const processedImagesContainer = document.getElementById('processedImagesContainer');
    const imageCountInput = document.getElementById('imageCountInput');
    const applyImageCountBtn = document.getElementById('applyImageCount');
    const promptInput = document.getElementById('promptInput');

    // Load saved code from localStorage
    if (localStorage.getItem('htmlCode')) {
        htmlEditor.value = localStorage.getItem('htmlCode');
    }
    if (localStorage.getItem('cssCode')) {
        cssEditor.value = localStorage.getItem('cssCode');
    }
    if (localStorage.getItem('jsCode')) {
        jsEditor.value = localStorage.getItem('jsCode');
    }

    // Save code to localStorage on input
    htmlEditor.addEventListener('input', () => {
        localStorage.setItem('htmlCode', htmlEditor.value);
    });
    cssEditor.addEventListener('input', () => {
        localStorage.setItem('cssCode', cssEditor.value);
    });
    jsEditor.addEventListener('input', () => {
        localStorage.setItem('jsCode', jsEditor.value);
    });

    // Initialize tabs
    setupTabs();

    // Run code button click handler
    runCodeBtn.addEventListener('click', runCode);
    refreshPreviewBtn.addEventListener('click', runCode);

    // Image upload modal handling
    imageUploadBtn.addEventListener('click', function() {
        imageUploadModal.style.display = 'flex';
    });

    closeImageModalBtn.addEventListener('click', function() {
        imageUploadModal.style.display = 'none';
    });

    cancelImageUploadBtn.addEventListener('click', function() {
        imageUploadModal.style.display = 'none';
    });

    // Image upload handling
    imageUploadInput.addEventListener('change', handleImageUpload);
    confirmImageUploadBtn.addEventListener('click', applyImageAnimation);
    applyImageCountBtn.addEventListener('click', updateProcessedImagesGrid);

    // Function to set up tab switching
    function setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('[data-tab-content]');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');

                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Show corresponding content
                tabContents.forEach(content => {
                    if (content.getAttribute('data-tab-content') === tabName) {
                        content.style.display = 'block';
                    } else {
                        content.style.display = 'none';
                    }
                });
            });
        });
    }

    function runCode() {
        // First, terminate any existing worker
        if (imageWorker) {
            imageWorker.terminate();
            imageWorker = null;
            workerActive = false;
        }

        // Clear any existing animation frame
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        // Get the code from each editor
        const htmlCode = htmlEditor.value;
        const cssCode = cssEditor.value;
        const jsCode = jsEditor.value;

        // Clear the output area
        htmlOutput.innerHTML = '';
        jsOutput.innerHTML = '';
        cssOutput.innerHTML = cssCode; // Display CSS in the CSS output

        try {
            // Create a container for our HTML content
            const htmlContainer = document.createElement('div');
            htmlContainer.innerHTML = htmlCode;
            
            // Apply CSS to the HTML output
            const styleElement = document.createElement('style');
            styleElement.textContent = cssCode;
            htmlOutput.appendChild(styleElement);
            htmlOutput.appendChild(htmlContainer);

            // Check if there's a saved image and create a canvas for it
            if (localStorage.getItem('uploadedImage')) {
                const img = new Image();
                img.onload = function() {
                    canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    canvas.style.maxWidth = '100%';
                    canvas.style.border = '1px solid #444';
                    canvas.style.borderRadius = '8px';
                    
                    // Find a suitable container in the HTML for the canvas
                    // If there's a div with id="canvas-container", use that, otherwise append to htmlOutput
                    const canvasContainer = htmlContainer.querySelector('#canvas-container') || htmlOutput;
                    canvasContainer.appendChild(canvas);
                    
                    ctx = canvas.getContext('2d');
                    
                    // Create a temporary canvas to get the image data
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = img.width;
                    tempCanvas.height = img.height;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.drawImage(img, 0, 0);
                    
                    originalImageData = tempCtx.getImageData(0, 0, img.width, img.height);
                    
                    // Create the proper selectedRegions array format
                    // This should be an array containing a single array of pixel indices
                    const pixelIndices = [];
                    // Add all non-transparent pixels to the region
                    const imgData = originalImageData.data;
                    const width = originalImageData.width;
                    const height = originalImageData.height;
                    
                    for (let y = 0; y < height; y++) {
                        for (let x = 0; x < width; x++) {
                            const idx = (y * width + x);
                            const alphaIdx = idx * 4 + 3; // Alpha channel index
                            
                            // Include pixel if it's not completely transparent
                            if (imgData[alphaIdx] > 0) {
                                pixelIndices.push(idx);
                            }
                        }
                    }
                    
                    // Set selectedRegions as an array containing our array of indices
                    selectedRegions = [pixelIndices];
                    console.log('Created selectedRegions:', selectedRegions);
                    
                    // Draw the original image first
                    ctx.putImageData(originalImageData, 0, 0);
                    
                    // Create worker and start animation
                    createWorker();
                };
                img.src = localStorage.getItem('uploadedImage');
            } else {
                // No image uploaded yet, create a placeholder canvas
                canvas = document.createElement('canvas');
                canvas.width = 360;
                canvas.height = 180;
                canvas.style.backgroundColor = '#252526';
                canvas.style.maxWidth = '100%';
                canvas.style.border = '1px solid #444';
                canvas.style.borderRadius = '8px';
                
                // Find a suitable container in the HTML for the canvas
                const canvasContainer = htmlContainer.querySelector('#canvas-container') || htmlOutput;
                canvasContainer.appendChild(canvas);
                
                ctx = canvas.getContext('2d');
                
                // Draw black background and white text
                ctx.fillStyle = '#252526';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ffffff';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Upload an image to apply animation', canvas.width / 2, canvas.height / 2);
                
                jsOutput.innerHTML = 'Please upload an image to start animation';
            }
        } catch (error) {
            jsOutput.innerHTML = `Error: ${error.message}`;
            console.error('Error:', error);
        }
    }

    // Handle image upload
    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            // Display the image preview
            uploadedImagePreview.src = e.target.result;
            uploadedImagePreview.style.display = 'block';
            localStorage.setItem('uploadedImage', e.target.result);

            // Store the image data for use with the worker
            const img = new Image();
            img.onload = function() {
                // Create a canvas element
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.width;
                tempCanvas.height = img.height;
                const tempCtx = tempCanvas.getContext('2d');

                // Draw the image on the canvas
                tempCtx.drawImage(img, 0, 0);

                // Get the image data
                originalImageData = tempCtx.getImageData(0, 0, img.width, img.height);

                // Create the proper selectedRegions array format
                // This should be an array containing a single array of pixel indices
                const pixelIndices = [];
                // Add all non-transparent pixels to the region
                const imgData = originalImageData.data;
                const width = originalImageData.width;
                const height = originalImageData.height;
                
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const idx = (y * width + x);
                        const alphaIdx = idx * 4 + 3; // Alpha channel index
                        
                        // Include pixel if it's not completely transparent
                        if (imgData[alphaIdx] > 0) {
                            pixelIndices.push(idx);
                        }
                    }
                }
                
                // Set selectedRegions as an array containing our array of indices
                selectedRegions = [pixelIndices];
                console.log('Created selectedRegions:', selectedRegions);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    // Apply the animation to the uploaded image
    function applyImageAnimation() {
        if (!originalImageData) {
            jsOutput.innerHTML = 'Error: No image uploaded';
            return;
        }

        // Close the modal
        document.getElementById('imageUploadModal').style.display = 'none';

        // Run the code to apply HTML and CSS
        runCode();
    }


    function createWorker() {
        // Terminate existing worker if it exists
        if (imageWorker) {
            imageWorker.terminate();
        }

        try {
            // Get the worker code from the editor
            const workerCode = jsEditor.value;

            // Create a blob URL from the worker code
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);

            // Create the worker
            imageWorker = new Worker(workerUrl);

            // Set up the message handler
            imageWorker.onmessage = function(e) {
                const { segmentedImages, error, progress } = e.data;

                if (error) {
                    jsOutput.innerHTML = `Worker Error: ${error}`;
                    console.error('Worker error:', error);
                    return;
                }

                if (segmentedImages && segmentedImages.length > 0) {
                    // Draw the segmented image to the canvas
                    ctx.putImageData(segmentedImages[0], 0, 0);

                    // Update progress if available
                    if (progress !== undefined) {
                        const progressPercent = Math.round(progress * 100);
                        jsOutput.innerHTML = `Processing: ${progressPercent}% complete`;
                    }
                }
            };

            workerActive = true;
            jsOutput.innerHTML = 'Worker created successfully. Starting animation...';

            // Start the animation
            startAnimation();
        } catch (error) {
            jsOutput.innerHTML = `Error creating worker: ${error.message}`;
            console.error('Worker creation error:', error);
        }
    }

    function startAnimation() {
        if (!imageWorker || !originalImageData || !workerActive) return;

        // Define the animation frame function
        const animate = () => {
            if (!workerActive) return;

            // Get the image count from the input
            const imageCount = parseInt(imageCountInput.value, 10) || 5;

            // Calculate how many iterations to use based on image count
            // This scales the animation duration with the number of images
            const iterations = imageCount * 24; // 24 frames per image

            // Ensure selectedRegions is properly formatted
            // Convert the selectedRegions into the format expected by the worker
            let formattedSelectedRegions;
            
            if (!selectedRegions || !selectedRegions.length) {
                // Create a default region that includes all pixels
                const totalPixels = originalImageData.width * originalImageData.height;
                const allPixelsRegion = [];
                for (let i = 0; i < totalPixels; i++) {
                    allPixelsRegion.push(i);
                }
                formattedSelectedRegions = [allPixelsRegion];
            } else {
                // Convert the existing selectedRegions to proper format if needed
                formattedSelectedRegions = selectedRegions;
                
                // If selectedRegions is already an array of pixel indices, wrap it in another array
                if (Array.isArray(selectedRegions) && !Array.isArray(selectedRegions[0])) {
                    formattedSelectedRegions = [selectedRegions];
                }
                
                // If selectedRegions is an array of 1s (boolean mask format), convert to pixel indices
                if (Array.isArray(selectedRegions[0]) && typeof selectedRegions[0][0] === 'number' && 
                    (selectedRegions[0][0] === 0 || selectedRegions[0][0] === 1)) {
                    const convertedRegions = [];
                    const region = [];
                    
                    for (let i = 0; i < selectedRegions[0].length; i++) {
                        if (selectedRegions[0][i] === 1) {
                            region.push(i);
                        }
                    }
                    
                    convertedRegions.push(region);
                    formattedSelectedRegions = convertedRegions;
                }
            }

            // Send data to the worker
            imageWorker.postMessage({
                imageData: originalImageData,
                selectedRegions: selectedRegions, // Now correctly formatted
                value: 1,
                value5: iterations,
                reset: false
            });

            // Request the next frame
            animationFrameId = requestAnimationFrame(animate);
        };

        // Start the animation
        animate();
    }

    // Update the processed images grid
    function updateProcessedImagesGrid() {
        if (!originalImageData) return;

        // Clear the container
        processedImagesContainer.innerHTML = '';

        // Get the number of images to generate
        const imageCount = parseInt(imageCountInput.value, 10) || 5;

        // Create header
        const header = document.createElement('h3');
        header.textContent = 'Processed Images';
        processedImagesContainer.appendChild(header);

        // Create grid container
        const grid = document.createElement('div');
        grid.className = 'processed-images-grid';
        processedImagesContainer.appendChild(grid);

        // Create canvas elements for each processed image
        for (let i = 0; i < imageCount; i++) {
            // Create container for the image
            const container = document.createElement('div');
            container.className = 'processed-image-container';

            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.width = originalImageData.width;
            canvas.height = originalImageData.height;

            // Create label
            const label = document.createElement('div');
            label.className = 'image-label';
            label.textContent = `Frame ${i + 1}`;

            // Append to container
            container.appendChild(canvas);
            container.appendChild(label);

            // Append to grid
            grid.appendChild(container);

            // Get canvas context
            const ctx = canvas.getContext('2d');

            // Create a temporary worker for each frame
            processImageWithWorker(ctx, i, imageCount);
        }
    }

    function processImageWithWorker(ctx, frameIndex, totalFrames) {
        if (!originalImageData) return;

        // Create a temporary worker
        try {
            const workerCode = jsEditor.value;
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);

            const tempWorker = new Worker(workerUrl);

            // Set up the message handler
            tempWorker.onmessage = function(e) {
                const { segmentedImages, error } = e.data;

                if (error) {
                    console.error('Worker error:', error);
                    return;
                }

                if (segmentedImages && segmentedImages.length > 0) {
                    // Draw the segmented image to the canvas
                    ctx.putImageData(segmentedImages[0], 0, 0);

                    // Terminate the worker
                    tempWorker.terminate();
                }
            };

            // Calculate the progress value for this frame
            const progress = frameIndex / (totalFrames - 1);

            // Calculate total iterations based on image count
            const iterations = totalFrames * 24; // 24 frames per image

            // Ensure selectedRegions is properly formatted
            let formattedSelectedRegions;
            
            if (!selectedRegions || !selectedRegions.length) {
                // Create a default region that includes all pixels
                const totalPixels = originalImageData.width * originalImageData.height;
                const allPixelsRegion = [];
                for (let i = 0; i < totalPixels; i++) {
                    allPixelsRegion.push(i);
                }
                formattedSelectedRegions = [allPixelsRegion];
            } else {
                // Convert the existing selectedRegions to proper format if needed
                formattedSelectedRegions = selectedRegions;
                
                // If selectedRegions is already an array of pixel indices, wrap it in another array
                if (Array.isArray(selectedRegions) && !Array.isArray(selectedRegions[0])) {
                    formattedSelectedRegions = [selectedRegions];
                }
                
                // If selectedRegions is an array of 1s (boolean mask format), convert to pixel indices
                if (Array.isArray(selectedRegions[0]) && typeof selectedRegions[0][0] === 'number' && 
                    (selectedRegions[0][0] === 0 || selectedRegions[0][0] === 1)) {
                    const convertedRegions = [];
                    const region = [];
                    
                    for (let i = 0; i < selectedRegions[0].length; i++) {
                        if (selectedRegions[0][i] === 1) {
                            region.push(i);
                        }
                    }
                    
                    convertedRegions.push(region);
                    formattedSelectedRegions = convertedRegions;
                }
            }

            // Send data to the worker
            tempWorker.postMessage({
                imageData: originalImageData,
                selectedRegions: selectedRegions, // Now correctly formatted
                value: 1,
                value5: iterations,
                currentIteration: Math.floor(progress * iterations),
                reset: true
            });
        } catch (error) {
            console.error('Worker creation error:', error);
        }
    }

    // Initialize by running the code once
    runCode();
});