document.addEventListener('DOMContentLoaded', function() {
    // Constants and element references
    const SERVER_URL = 'https://brook-cliff-honeysuckle.glitch.me';
    const galleryContainer = document.getElementById('gallery-container');
    const refreshGalleryBtn = document.getElementById('refresh-gallery');
    const tabButtons = document.querySelectorAll('.tab-button');
    const sections = document.querySelectorAll('.section');
    const galleryLoading = document.getElementById('gallery-loading');
    const shareBtn = document.getElementById('shareBtn');
    const jsDeepseekBtn = document.getElementById('jsDeepseekBtn');

    document.getElementById('closeGallery').addEventListener('click', () => {
        // document.getElementById('gallery-section').classList.remove('active');
        // document.querySelector('[data-tab="creator"]').click();
    });

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Deactivate all tabs and sections
            tabButtons.forEach(btn => btn.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            
            // Activate selected tab and section
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`${tabId}-section`).classList.add('active');
            
            // Load gallery if needed
            if (tabId === 'gallery') loadGallery();
        });
    });

    async function loadGallery() {
        // Show loading indicator
        galleryLoading.style.display = 'block';
        galleryContainer.innerHTML = '';
        
        try {
            // Fetch gallery data from server
            const response = await fetch(`${SERVER_URL}/api/gallery`);
            if (!response.ok) throw new Error('Failed to load gallery');
            
            const animations = await response.json();
            
            // Hide loading indicator if we got data
            galleryLoading.style.display = 'none';
            
            if (animations.length === 0) {
                galleryContainer.innerHTML = '<div class="empty-gallery">No animations have been shared yet. Be the first to share one!</div>';
                return;
            }
            
            // Track workers and animation frames for cleanup
            const galleryWorkers = [];
            const galleryAnimationFrames = [];
            
            // Process and display each animation
            animations.forEach(animation => {
                const galleryItem = document.createElement('div');
                galleryItem.className = 'gallery-item';
                
                // Create preview container
                const previewContainer = document.createElement('div');
                previewContainer.className = 'preview-container';
                
                // Determine if this is a JS-only animation
                const isJsOnly = (!animation.html || animation.html.trim() === '') && 
                                 (!animation.css || animation.css.trim() === '') && 
                                 (animation.js && animation.js.trim() !== '');
                
                if (isJsOnly) {
                    // For JS-only animations, create a canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = 240;
                    canvas.height = 180;
                    canvas.style.background = '#252526';
                    canvas.style.borderRadius = '6px';
                    
                    previewContainer.appendChild(canvas);
                    
                    // Create a worker to run the JS code
                    setTimeout(() => {
                        try {
                            const blob = new Blob([animation.js], { type: 'application/javascript' });
                            const workerUrl = URL.createObjectURL(blob);
                            const worker = new Worker(workerUrl);
                            
                            // Add to tracking array for cleanup
                            galleryWorkers.push(worker);
                            
                            // Set up canvas and context
                            const ctx = canvas.getContext('2d');
                            
                            // Create a default image data
                            const imageData = ctx.createImageData(canvas.width, canvas.height);
                            
                            // Fill with a light color so it's visible
                            const data = imageData.data;
                            for (let i = 0; i < data.length; i += 4) {
                                data[i] = 240;     // red
                                data[i + 1] = 240; // green
                                data[i + 2] = 240; // blue
                                data[i + 3] = 255; // alpha
                            }
                            
                            // Create pixel indices for all pixels
                            const pixelIndices = [];
                            for (let i = 0; i < canvas.width * canvas.height; i++) {
                                pixelIndices.push(i);
                            }
                            
                            // Handle worker messages
                            worker.onmessage = function(e) {
                                if (e.data.segmentedImages && e.data.segmentedImages.length > 0) {
                                    ctx.putImageData(e.data.segmentedImages[0], 0, 0);
                                }
                            };
                            
                            // Create an animation loop
                            const animate = () => {
                                // Send data to the worker (less iterations for gallery)
                                worker.postMessage({
                                    imageData: imageData,
                                    selectedRegions: [pixelIndices],
                                    value: 1,
                                    value5: 50, // Reduced iterations for gallery preview
                                    reset: false // Important: Don't reset each frame
                                });
                                
                                // Request next frame
                                const animationFrame = requestAnimationFrame(animate);
                                galleryAnimationFrames.push(animationFrame);
                            };
                            
                            // Start the animation
                            animate();
                            
                        } catch (error) {
                            console.error('Error initializing worker for gallery item:', error);
                        }
                    }, 100);
                } else {
                    // For regular HTML/CSS/JS animations, create an iframe
                    const iframe = document.createElement('iframe');
                    iframe.className = 'gallery-preview';
                    iframe.srcdoc = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>${animation.css || ''}</style>
                        </head>
                        <body>${animation.html || ''}
                        <script>${animation.js || ''}</script>
                        </body>
                        </html>
                    `;
                    iframe.sandbox = 'allow-scripts';
                    
                    previewContainer.appendChild(iframe);
                }
                
                // Create gallery item metadata
                const metadata = document.createElement('div');
                metadata.className = 'gallery-item-metadata';
                
                const idLabel = document.createElement('div');
                idLabel.className = 'gallery-item-id';
                idLabel.textContent = `Animation #${animation.id}`;
                
                const date = new Date(animation.created_at);
                const dateLabel = document.createElement('div');
                dateLabel.className = 'gallery-item-date';
                dateLabel.textContent = date.toLocaleDateString();
                
                const votes = document.createElement('div');
                votes.className = 'gallery-item-votes';
                
                const upvoteBtn = document.createElement('button');
                upvoteBtn.className = 'vote-btn upvote';
                upvoteBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 19V5M5 12l7-7 7 7"/>
                    </svg>
                    <span>${animation.upvotes || 0}</span>
                `;
                upvoteBtn.addEventListener('click', () => voteAnimation(animation.id, 'up'));
                
                const downvoteBtn = document.createElement('button');
                downvoteBtn.className = 'vote-btn downvote';
                downvoteBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 5v14M5 12l7 7 7-7"/>
                    </svg>
                    <span>${animation.downvotes || 0}</span>
                `;
                downvoteBtn.addEventListener('click', () => voteAnimation(animation.id, 'down'));
                
                votes.appendChild(upvoteBtn);
                votes.appendChild(downvoteBtn);
                
                const loadBtn = document.createElement('button');
                loadBtn.className = 'btn load-animation';
                loadBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                    Load
                `;
                loadBtn.addEventListener('click', () => loadAnimation(animation.id));
                
                // Assemble metadata
                metadata.appendChild(idLabel);
                metadata.appendChild(dateLabel);
                metadata.appendChild(votes);
                metadata.appendChild(loadBtn);
                
                // Add type indicator for JS-only animations
                if (isJsOnly) {
                    const typeLabel = document.createElement('div');
                    typeLabel.className = 'gallery-item-type js-only';
                    typeLabel.textContent = 'JS Only';
                    metadata.appendChild(typeLabel);
                }
                
                // Assemble gallery item
                galleryItem.appendChild(previewContainer);
                galleryItem.appendChild(metadata);
                
                // Add to gallery container
                galleryContainer.appendChild(galleryItem);
            });
            
            // Add cleanup function when leaving gallery
            document.getElementById('closeGallery').addEventListener('click', () => {
                // Terminate all workers
                galleryWorkers.forEach(worker => {
                    try {
                        worker.terminate();
                    } catch (e) {
                        console.error('Error terminating worker:', e);
                    }
                });
                
                // Cancel all animation frames
                galleryAnimationFrames.forEach(frameId => {
                    cancelAnimationFrame(frameId);
                });
            });
            
        } catch (error) {
            galleryLoading.style.display = 'none';
            galleryContainer.innerHTML = `<div class="error-message">Error loading gallery: ${error.message}</div>`;
            console.error('Gallery loading error:', error);
        }
    }

    async function voteAnimation(id, type) {
        try {
            await fetch(`${SERVER_URL}/api/vote/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type })
            });
            loadGallery();
        } catch (error) {
            console.error('Voting error:', error);
        }
    }
     
    async function loadAnimation(id) {
        try {
            const response = await fetch(`${SERVER_URL}/api/animation/${id}`);
            const animation = await response.json();
            
            htmlEditor.value = animation.html;
            cssEditor.value = animation.css;
            jsEditor.value = animation.js;
            
            tabButtons.forEach(btn => {
                if (btn.getAttribute('data-tab') === 'creator') btn.click();
            });
            
            updatePreview();
        } catch (error) {
            console.error('Loading animation error:', error);
        }
    }

    function updatePreview() {
        const frameContent = `
            <!DOCTYPE html>
            <html>
            <head><style>${cssEditor.value}</style></head>
            <body>${htmlEditor.value}<script>${jsEditor.value}<\/script></body>
            </html>
        `;
        
        const blob = new Blob([frameContent], { type: 'text/html' });
        document.getElementById('htmlOutput').srcdoc = URL.createObjectURL(blob);
    }

    async function shareAnimation() {
        sendAnimationToServer();
    }
 
    function sendAnimationToServer() {

        const htmlCode = document.getElementById('htmlEditor').value;
        const cssCode = document.getElementById('cssEditor').value;
        const jsCode = document.getElementById('jsEditor').value;
        
        const shareBtn = document.getElementById('shareBtn');
        const originalText = shareBtn.innerHTML;
        shareBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Sharing...';
        shareBtn.disabled = true;
        
        fetch(`${SERVER_URL}/api/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html: htmlCode,
            css: cssCode,
            js: jsCode
          })
        })
        .then(response => response.json())
        .then(data => {
          if (data.id) {
            // Success notification
            alert(`Animation shared successfully! ID: ${data.id}`);
            // Refresh gallery data
            loadGallery();
          } else {
            alert('Error sharing animation: ' + (data.error || 'Unknown error'));
          }
        })
        .catch(error => {
          console.error('Sharing error:', error);
          alert('Error sharing animation: ' + error.message);
        })
        .finally(() => {
          // Restore button
          shareBtn.innerHTML = originalText;
          shareBtn.disabled = false;
        });
        }

        refreshGalleryBtn.addEventListener('click', loadGallery);
        shareBtn.addEventListener('click', sendAnimationToServer); // Single event listener

        if (jsDeepseekBtn) {
            jsDeepseekBtn.addEventListener('click', function() {
                // Optional: Add code generation logic here before sharing
                sendAnimationToServer();
            });
        }

});