let imageWorker = null;
let canvas = null;
let ctx = null;
let originalImageData = null;
let selectedRegions = null;
let animationFrameId = null;
let workerActive = false;
let currentMode = 'worker'; // Track current mode ('worker' or 'plot')
let autoPlotTimeout = null; // For debouncing auto-plot

let trackingData = {};
const TRACKING_STORAGE_KEY = 'userBehaviorTrackingData';

let plotInstance = null; // Keep track of the function-plot instance
let currentPlotOptions = {}; // Store base options for redraw/resize
let parsedEquationData = []; // Store the raw parsed structures from input
let isAnimatingK = false;   // Specifically for k-animation
let kValue = 0;
let kMin = 0;
let kMax = 10;
let kStep = 0.1;
let requiresK = false; // Does the current plot use 'k'?


function initializeTracking() {
    const savedData = localStorage.getItem(TRACKING_STORAGE_KEY);
    const now = Date.now();

    const defaultData = {
        sessionStartTime: now,
        lastUpdateTime: now,
        totalTime: 0, // Will be calculated dynamically by dashboard.js
        htmlKeystrokes: 0,
        cssKeystrokes: 0,
        jsKeystrokes: 0,
        totalEdits: 0, // Simplified: count input events
        avgEditSize: 0, // Placeholder - complex to track accurately
        htmlFocusTime: 0,
        cssFocusTime: 0,
        jsFocusTime: 0,
        mainAIAttempts: 0, // Placeholder
        htmlAIAttempts: 0, // Placeholder
        cssAIAttempts: 0, // Placeholder
        jsAIAttempts: 0, // Placeholder
        promptsUsedCount: 0, // Placeholder (increment when AI is called)
        apiKeyModalOpens: 0, // Placeholder
        apiKeySaves: 0, // Placeholder
        usedCreatorKey: 'No', // Placeholder
        modelPreference: 'N/A', // Placeholder
        previewRefreshes: 0,
        avgEditRefreshTime: 0, // Placeholder - complex
        consoleFocusRatio: 0, // Placeholder - needs tab focus tracking
        imageUploadClicks: 0,
        imageUploads: 0,
        libraryOpens: 0,
        librarySearches: 0,
        librariesLoaded: 0,
        fullscreenToggles: 0,
        fullscreenTime: 0,
        layoutToggles: 0,
        hamburgerOpens: 0,
        wikiModalOpens: 0,
        flashcardFlips: 0,
        quizInteractions: 0,
        quizChecks: 0,
        jsErrors: 0,
        workerErrors: 0,
        // For Charts
        activityEvents: [], // { timestamp: number, type: 'edit' | 'refresh' | 'ai' | 'image' | 'library' }
        errorEvents: [] // { timestamp: number, type: 'js' | 'worker', message: string }
    };

    if (savedData) {
        try {
            trackingData = JSON.parse(savedData);
            // Ensure all keys exist, merging defaults for keys added later
            trackingData = { ...defaultData, ...trackingData };
            // Optionally reset session start time if it's a new session
            // trackingData.sessionStartTime = now; // Uncomment if each page load is a new session
        } catch (e) {
            console.error("Error parsing tracking data from localStorage. Resetting.", e);
            trackingData = defaultData;
        }
    } else {
        trackingData = defaultData;
    }

    // Persist initial data immediately
    saveTrackingData();

    // Start tracking focus time
    trackFocusTime();

    // Periodically save data (e.g., every 10 seconds)
    setInterval(saveTrackingData, 10000);
    // Save data when the user leaves the page
    window.addEventListener('beforeunload', saveTrackingData);

     // Log initial state for debugging
    console.log("Tracking Initialized:", trackingData);
}

function saveTrackingData() {
    if (!trackingData || Object.keys(trackingData).length === 0) {
        console.warn("Attempted to save empty tracking data.");
        return; // Don't save if trackingData is not initialized
    }
    trackingData.lastUpdateTime = Date.now();
    try {
        localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(trackingData));
        // console.log("Tracking Data Saved:", trackingData); // Optional: for debugging
    } catch (e) {
        console.error("Error saving tracking data to localStorage:", e);
        // Handle potential storage limit errors
        if (e.name === 'QuotaExceededError') {
            console.warn("LocalStorage quota exceeded. Pruning old events.");
            pruneEventData(trackingData.activityEvents, 100); // Keep latest 100 activity events
            pruneEventData(trackingData.errorEvents, 50);   // Keep latest 50 error events
            try {
                 localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(trackingData));
            } catch (finalError) {
                console.error("Failed to save even after pruning:", finalError);
            }
        }
    }
}

// Helper to limit the size of event arrays
function pruneEventData(eventArray, maxSize) {
    if (eventArray && eventArray.length > maxSize) {
        eventArray.splice(0, eventArray.length - maxSize); // Remove oldest events
    }
}


function  trackevent(type, detail = null) {
    if (!trackingData.activityEvents) trackingData.activityEvents = [];
    trackingData.activityEvents.push({ timestamp: Date.now(), type, detail });
    pruneEventData(trackingData.activityEvents, 200); // Keep max 200 activity events
    // console.log(`Tracked Event: ${type}`, detail); // Optional debug log
}

function trackError(type, message) {
    if (!trackingData.errorEvents) trackingData.errorEvents = [];
    trackingData.errorEvents.push({ timestamp: Date.now(), type, message: message.substring(0, 100) }); // Limit message length
    pruneEventData(trackingData.errorEvents, 100); // Keep max 100 error events
    // console.log(`Tracked Error: ${type}`, message); // Optional debug log
}

let focusStartTime = null;
let currentFocusElementId = null;
let fullscreenStartTime = null;

function trackFocusTime() {
    const editors = {
        'htmlEditor': 'htmlFocusTime',
        'cssEditor': 'cssFocusTime',
        'jsEditor': 'jsFocusTime'
        // Add other focusable areas if needed, e.g., 'jsOutput' for console focus
    };

    const handleFocus = (event) => {
        const elementId = event.target.id;
        if (editors[elementId]) {
            // If switching focus from another tracked element, record time spent
            if (focusStartTime && currentFocusElementId && editors[currentFocusElementId]) {
                const duration = Date.now() - focusStartTime;
                trackingData[editors[currentFocusElementId]] += duration;
            }
            // Start timing the new element
            focusStartTime = Date.now();
            currentFocusElementId = elementId;
            // console.log(`Focus Gained: ${elementId}`); // Debug log
        } else {
             // If focus moved to something not tracked, finalize last tracked element's time
             finalizeFocusTime();
             currentFocusElementId = null;
             focusStartTime = null; // Reset start time
        }
    };

    const handleBlur = (event) => {
         // Use setTimeout to handle cases where focus briefly leaves then returns (e.g., clicking a button)
        setTimeout(() => {
            // Check if focus has moved to another tracked element or outside completely
            const activeElementId = document.activeElement ? document.activeElement.id : null;
            if (!activeElementId || !editors[activeElementId]) {
                 finalizeFocusTime();
                 currentFocusElementId = null;
                 focusStartTime = null; // Reset start time
                 // console.log(`Focus Lost from: ${event.target.id}`); // Debug log
             }
        }, 100); // Small delay
    };

    const finalizeFocusTime = () => {
        if (focusStartTime && currentFocusElementId && editors[currentFocusElementId]) {
             const duration = Date.now() - focusStartTime;
             trackingData[editors[currentFocusElementId]] += duration;
             // console.log(`Finalized Focus Time for ${currentFocusElementId}: ${duration}ms`); // Debug log
        }
         focusStartTime = null; // Reset start time after finalizing
    };

    Object.keys(editors).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('focus', handleFocus);
            element.addEventListener('blur', handleBlur);
        }
    });

    // Track time when window loses focus
     window.addEventListener('blur', finalizeFocusTime);
     // Optional: Restart timing when window regains focus (if needed)
     // window.addEventListener('focus', () => {
     //    // Check if an editor has focus again and restart timing
     //    const activeElementId = document.activeElement ? document.activeElement.id : null;
     //    if (activeElementId && editors[activeElementId]) {
     //       focusStartTime = Date.now();
     //       currentFocusElementId = activeElementId;
     //    }
     // });
}


document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    
    initializeTracking(); //
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
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const hamburgerDropdown = document.getElementById('hamburgerDropdown');
    const pasteNotification = document.getElementById('pasteNotification');
    const dropzone = document.getElementById('dropzone');
    const recordButton = document.getElementById('recordButton');
    createVideoModal(); // <-- Must be present
    const dashboardBtn = document.getElementById('dashboardBtn');
    const dashboardModal = document.getElementById('dashboardModal');
    const dashboardFrame = document.getElementById('dashboardFrame');
    const closeDashboardModalBtn = document.getElementById('closeDashboardModal');
    const animPlayPauseButton = document.getElementById('animPlayPauseButton');
    const animResetButton = document.getElementById('animResetButton');
    const kMinInput = document.getElementById('kMinInput');
    const kMaxInput = document.getElementById('kMaxInput');
    const kStepInput = document.getElementById('kStepInput');
    const kValueDisplay = document.getElementById('kValueDisplay');
    const kValueDisplayContainer = document.getElementById('kValueDisplayContainer');
    const animationControlsDiv = document.getElementById('animationControls');
    // --- END NEW ---

    // --- Dashboard Modal Logic ---

    if (dashboardBtn && dashboardModal && dashboardFrame && closeDashboardModalBtn) {
        // Event listener to OPEN the modal
        dashboardBtn.addEventListener('click', () => {
            console.log("Dashboard button clicked"); // Debug log
            // Set the iframe source to load dashboard.html
            // Use a cache-busting query parameter to ensure it reloads fresh data
            dashboardFrame.src = `dashboard.html?t=${Date.now()}`;
            // Display the modal
            dashboardModal.style.display = 'flex';
            // Optional: Close hamburger menu if it's open
            const hamburgerDropdown = document.getElementById('hamburgerDropdown');
            if (hamburgerDropdown) {
                hamburgerDropdown.classList.remove('show');
            }
        });

        // Event listener to CLOSE the modal (using the close button)
        closeDashboardModalBtn.addEventListener('click', () => {
            dashboardModal.style.display = 'none';
            // Reset iframe src to unload the page and free resources
            dashboardFrame.src = 'about:blank';
        });

        // Event listener to CLOSE the modal (clicking outside the modal content)
        dashboardModal.addEventListener('click', (event) => {
            // Check if the click is directly on the overlay (not its children)
            if (event.target === dashboardModal) {
                dashboardModal.style.display = 'none';
                 // Reset iframe src
                 dashboardFrame.src = 'about:blank';
            }
        });

    } else {
        console.warn("Dashboard modal elements not found. Button functionality disabled.");
        if (!dashboardBtn) console.warn("Missing element: #dashboardBtn");
        if (!dashboardModal) console.warn("Missing element: #dashboardModal");
        if (!dashboardFrame) console.warn("Missing element: #dashboardFrame");
        if (!closeDashboardModalBtn) console.warn("Missing element: #closeDashboardModal");
    }

    
    // Get the Advanced button
    const toggleAdvancedBtn = document.getElementById('toggleAdvancedBtn');

    // Function to toggle columns
    function toggleColumns() {
        const htmlColumn = document.querySelector('.html-column');
        const cssColumn = document.querySelector('.css-column');
        const cssJsViewerColumn = document.querySelector('.css-js-viewer-column');

        // Toggle HTML column
        if (htmlColumn.style.display === 'none' || getComputedStyle(htmlColumn).display === 'none') {
            htmlColumn.style.display = 'flex';
            document.body.classList.add('show-html');
        } else {
            htmlColumn.style.display = 'none';
            document.body.classList.remove('show-html');
        }

        // Toggle CSS column
        if (cssColumn.style.display === 'none' || getComputedStyle(cssColumn).display === 'none') {
            cssColumn.style.display = 'flex';
            document.body.classList.add('show-css');
        } else {
            cssColumn.style.display = 'none';
            document.body.classList.remove('show-css');
        }

        // Toggle CSS/JS Viewer column
        if (cssJsViewerColumn.style.display === 'none' || getComputedStyle(cssJsViewerColumn).display === 'none') {
            cssJsViewerColumn.style.display = 'flex';
            document.body.classList.add('show-output');
        } else {
            cssJsViewerColumn.style.display = 'none';
            document.body.classList.remove('show-output');
        }
        trackingData.layoutToggles++;

    }

    // Add click event listener to the Advanced button
    if (toggleAdvancedBtn) {
        toggleAdvancedBtn.addEventListener('click', toggleColumns);
    }

    // Add a separate toggle button dynamically
    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Toggle Columns';
    toggleButton.className = 'btn';
    toggleButton.style.display  = 'none'
    const actionsContainer = document.querySelector('.header .actions');
    if (actionsContainer) {
        // actionsContainer.appendChild(toggleButton);
        toggleButton.addEventListener('click', toggleColumns);
    }

    // Initialize button states based on initial class
    document.querySelectorAll('[data-column-id]').forEach(column => {
        const isMinified = column.classList.contains('minified');
        const minifyBtn = column.querySelector('.btn-minify');
        const expandBtn = column.querySelector('.btn-expand');
        if (minifyBtn) minifyBtn.style.display = isMinified ? 'none' : 'flex';
        if (expandBtn) expandBtn.style.display = isMinified ? 'flex' : 'none';
    });

    if (recordButton) {
        let isRecording = false;
        let mediaRecorder = null;
        let recordedChunks = [];
        let animationCanvas = null;

        recordButton.addEventListener('click', function() {
            if (!isRecording) {
                // Start recording
                startRecording();
            } else {
                // Stop recording
                stopRecording();
            }
        });

        function startRecording() {
            // Find the canvas to record
            animationCanvas = document.querySelector('.html-viewer canvas');

            if (!animationCanvas) {
                console.error('No canvas found to record');
                return;
            }

            // Update button appearance to show recording state
            recordButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="3" fill="#ff4444"></circle>
                </svg>
                Stop
            `;
            recordButton.style.color = '#ff4444';

            // Set up recording
            recordedChunks = [];
            const stream = animationCanvas.captureStream(30); // 30 FPS

            mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9'
            });

            mediaRecorder.ondataavailable = function(e) {
                if (e.data.size > 0) {
                    recordedChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = function() {
                // Create blob from recorded chunks
                const blob = new Blob(recordedChunks, {
                    type: 'video/webm'
                });

                // Create download link
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'canvas-animation.webm';
                document.body.appendChild(a);
                a.click();

                // Clean up
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);

                // Reset button appearance
                recordButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
                    </svg>
                    Record
                `;
                recordButton.style.color = '';
            };

            // Start recording
            mediaRecorder.start();
            isRecording = true;

            // Show recording indicator
            const jsOutput = document.getElementById('jsOutput');
            if (jsOutput) {
                jsOutput.innerHTML += `
                <div style="color: #ff4444; padding: 10px; border-radius: 4px; background: rgba(255,68,68,0.1); margin-top: 10px;">
                    <strong>Recording started.</strong> Click the Record button again to stop and download.
                </div>`;
            }
        }

        function stopRecording() {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
                isRecording = false;

                // Show recording completed indicator
                const jsOutput = document.getElementById('jsOutput');
                if (jsOutput) {
                    jsOutput.innerHTML += `
                    <div style="color: #4caf50; padding: 10px; border-radius: 4px; background: rgba(76,175,80,0.1); margin-top: 10px;">
                        <strong>Recording completed.</strong> Your file will download automatically.
                    </div>`;
                }
            }
        }
    }

    document.addEventListener('paste', handlePaste);

    document.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropzone.style.display = 'flex';
    });

    document.addEventListener('dragleave', function(e) {
        const rect = dropzone.getBoundingClientRect();
        if (
            e.clientX < rect.left ||
            e.clientX >= rect.right ||
            e.clientY < rect.top ||
            e.clientY >= rect.bottom
        ) {
            dropzone.style.display = 'none';
        }
    });

    document.addEventListener('drop', function(e) {
        e.preventDefault();
        dropzone.style.display = 'none';

        if (e.dataTransfer.files && e.dataTransfer.files.length) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                processImageFile(file);
                showPasteNotification();
                trackingData.imageUploads++; // Track drop
                trackevent('image', 'drop');
            }
        }
    });

    const wikiQuizButton = document.getElementById('wikiQuizIcon');
    const wikiModal = document.getElementById('wikipediaModal');
    const closeWikiModalBtn = document.getElementById('closeWikiModalBtn');
    // const promptInput = document.getElementById('promptInput');
    const wikipediaContent = document.getElementById('wikipediaContent');
    const flashcardsContent = document.getElementById('flashcardsContent');
    const quizContent = document.getElementById('quizContent');
    const wikiModalTitle = document.getElementById('wikiModalTitle');
    const checkQuizAnswersBtn = document.getElementById('checkQuizAnswers');
    
    // Tab switching functionality
    const tabs = document.querySelectorAll('#wikipediaModal .tab');
    const tabContents = document.querySelectorAll('#wikipediaModal .wiki-tab-content');
    
    // Track selected quiz answers
    let selectedAnswers = {};
    let correctAnswers = {};
    
    // Modal open/close
    wikiQuizButton.addEventListener('click', () => {
        const query = promptInput.value.trim();
        if (query) {
            openWikiModal(query);
        } else {
            alert('Please enter a topic in the prompt input first');
        }
    });
    
    closeWikiModalBtn.addEventListener('click', () => {
        wikiModal.style.display = 'none';
    });
    
    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show target content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTab) {
                    content.classList.add('active');
                }
            });
            
            // If switching to quiz tab, show check answers button
            if (targetTab === 'quizContent' && quizContent.querySelector('.quiz-container').children.length > 0) {
                checkQuizAnswersBtn.style.display = 'block';
            } else {
                checkQuizAnswersBtn.style.display = 'none';
            }
        });
    });
    
    // Check quiz answers
    checkQuizAnswersBtn.addEventListener('click', () => {
        checkAnswers();
    });
    
    // Main function to open wiki modal and load content
    function openWikiModal(query) {
        wikiModal.style.display = 'flex';
        wikiModalTitle.textContent = `Learning: ${query}`;
        
        // Reset previous content
        resetContent();
        
        // Show loading indicators
        wikipediaContent.querySelector('.loading-placeholder').style.display = 'block';
        
        // Fetch Wikipedia content
        fetchWikipedia(query).then(content => {
            if (content) {
                // Hide loading indicator and show content
                wikipediaContent.querySelector('.loading-placeholder').style.display = 'none';
                
                // Add content to the wikipediaContent div
                const contentDiv = document.createElement('div');
                contentDiv.innerHTML = content;
                wikipediaContent.insertBefore(contentDiv, wikipediaContent.querySelector('.loading-placeholder'));
                
                // Generate flashcards and quiz immediately without NLP
                generateBetterFlashcards(content);
                generateMoreQuizQuestions(content);
            } else {
                wikipediaContent.querySelector('.loading-placeholder').style.display = 'none';
                wikipediaContent.querySelector('.error-placeholder').style.display = 'block';
            }
        }).catch(err => {
            console.error('Error fetching Wikipedia content:', err);
            wikipediaContent.querySelector('.loading-placeholder').style.display = 'none';
            wikipediaContent.querySelector('.error-placeholder').style.display = 'block';
        });
        trackingData.wikiModalOpens++;
    }
    
    // Reset all modal content
    function resetContent() {
        // Store loading and error placeholders
        const wikiLoading = wikipediaContent.querySelector('.loading-placeholder');
        const wikiError = wikipediaContent.querySelector('.error-placeholder');
        const flashLoading = flashcardsContent.querySelector('.loading-placeholder');
        const flashError = flashcardsContent.querySelector('.error-placeholder');
        const quizLoading = quizContent.querySelector('.loading-placeholder');
        const quizError = quizContent.querySelector('.error-placeholder');
        
        // Clear content but preserve the placeholders
        wikipediaContent.innerHTML = '';
        wikipediaContent.appendChild(wikiLoading);
        wikipediaContent.appendChild(wikiError);
        
        // Reset flashcards container
        const flashcardContainer = flashcardsContent.querySelector('.flashcard-container');
        flashcardContainer.innerHTML = '';
        
        // Reset quiz container
        const quizContainer = quizContent.querySelector('.quiz-container');
        quizContainer.innerHTML = '';
        
        // Reset feedback
        const quizFeedback = document.getElementById('quizFeedback');
        quizFeedback.style.display = 'none';
        quizFeedback.textContent = '';
        
        // Hide any previous error messages
        wikiLoading.style.display = 'none';
        wikiError.style.display = 'none';
        flashLoading.style.display = 'none';
        flashError.style.display = 'none';
        quizLoading.style.display = 'none';
        quizError.style.display = 'none';
        
        // Reset quiz tracking
        selectedAnswers = {};
        correctAnswers = {};
        
        // Hide check answers button
        checkQuizAnswersBtn.style.display = 'none';
        checkQuizAnswersBtn.disabled = true;
    }
    
    // Fetch Wikipedia content
    async function fetchWikipedia(query) {
        try {
            // Encode the query for URL
            const encodedQuery = encodeURIComponent(query);
            
            // Fetch from Wikipedia API
            const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodedQuery}`);
            const data = await response.json();
            
            if (data.type === 'disambiguation') {
                return `<p>This is a disambiguation page. Please be more specific with your query.</p>`;
            }
            
            if (data.extract) {
                // Try to get more content if available
                try {
                    const moreResponse = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=0&explaintext=1&titles=${encodedQuery}&origin=*`);
                    const moreData = await moreResponse.json();
                    const pages = moreData.query.pages;
                    const pageId = Object.keys(pages)[0];
                    
                    if (pages[pageId].extract) {
                        return `<h1>${data.title}</h1><p>${pages[pageId].extract}</p>`;
                    }
                } catch (e) {
                    console.error("Error fetching extended content:", e);
                }
                
                // Fallback to basic extract
                return `<h1>${data.title}</h1><p>${data.extract}</p>`;
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error fetching Wikipedia content:', error);
            return null;
        }
    }
    
    // Generate better flashcards without regex issues
    function generateBetterFlashcards(content) {
        flashcardsContent.querySelector('.loading-placeholder').style.display = 'block';
        try {
            // Parse the HTML content
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            
            // Extract title and text
            const title = doc.querySelector('h1')?.textContent || "Topic";
            const paragraphs = Array.from(doc.querySelectorAll('p')).map(p => p.textContent);
            
            if (paragraphs.length === 0) {
                flashcardsContent.querySelector('.error-placeholder').style.display = 'block';
                flashcardsContent.querySelector('.loading-placeholder').style.display = 'none';
                return;
            }
            
            // Container for flashcards
            const flashcardContainer = flashcardsContent.querySelector('.flashcard-container');
            flashcardContainer.innerHTML = ''; // Clear container
            
            // 1. Create definition flashcard
            createFlashcard(
                `What is ${title}?`,
                paragraphs[0].substring(0, 150) + (paragraphs[0].length > 150 ? "..." : ""),
                flashcardContainer
            );
            
            // 2. Create blank-word flashcards from sentences
            // Extract sentences from paragraphs
            let allSentences = [];
            paragraphs.forEach(para => {
                // Split by periods, question marks, exclamation points
                const sentences = para.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 20);
                allSentences = [...allSentences, ...sentences];
            });
            
            // Select sentences for flashcards (up to 5 more)
            const selectedSentences = allSentences
                .filter(s => s.length > 30 && s.length < 200) // Not too short or long
                .slice(0, 5);
            
            selectedSentences.forEach(sentence => {
                // Find a substantive word to blank out
                const words = sentence.split(' ');
                
                // Skip very short sentences
                if (words.length < 5) return;
                
                // Choose a word to blank that's not at the beginning or end
                const startIndex = Math.floor(words.length * 0.3);
                const endIndex = Math.floor(words.length * 0.7);
                let wordIndex = Math.floor(Math.random() * (endIndex - startIndex)) + startIndex;
                
                // Make sure the word is substantive (4+ chars)
                let attempts = 0;
                while (words[wordIndex].length < 4 && attempts < 5) {
                    wordIndex = Math.floor(Math.random() * (endIndex - startIndex)) + startIndex;
                    attempts++;
                }
                
                const wordToBlank = words[wordIndex];
                
                // Only use if we found a decent word to blank
                if (wordToBlank.length >= 4) {
                    // Create a copy of the words array
                    const modifiedWords = [...words];
                    modifiedWords[wordIndex] = "_________";
                    
                    createFlashcard(
                        modifiedWords.join(' '),
                        sentence,
                        flashcardContainer
                    );
                }
            });
            
            // 3. Add topic-specific flashcards
            const topicFlashcards = [
                {
                    front: `When was ${title} first discovered or established?`,
                    back: `Check the Wikipedia article for specific dates related to ${title}.`
                },
                {
                    front: `What is the significance of ${title}?`,
                    back: `${title} is important because it relates to key concepts in its field. See the article for specific details.`
                },
                {
                    front: `Who are the key figures associated with ${title}?`,
                    back: `Various researchers, theorists, or historical figures may be associated with ${title}. Review the article for names.`
                }
            ];
            
            // Add these generic cards if we don't have enough
            if (flashcardContainer.children.length < 5) {
                topicFlashcards.forEach(card => {
                    createFlashcard(card.front, card.back, flashcardContainer);
                });
            }
            
            // Hide loading indicator
            flashcardsContent.querySelector('.loading-placeholder').style.display = 'none';
            
        } catch (error) {
            console.error('Error generating flashcards:', error);
            flashcardsContent.querySelector('.error-placeholder').style.display = 'block';
            flashcardsContent.querySelector('.loading-placeholder').style.display = 'none';
        }
    }
    
    // Helper function to create a flashcard
    function createFlashcard(front, back, container) {
        const flashcardElem = document.createElement('div');
        flashcardElem.className = 'flashcard';
        
        flashcardElem.innerHTML = `
            <div class="flashcard-inner">
                <div class="flashcard-front">${front}</div>
                <div class="flashcard-back">${back}</div>
            </div>
        `;
        
        // Add click handler for flipping
        flashcardElem.addEventListener('click', () => {
            flashcardElem.classList.toggle('is-flipped');
            trackingData.flashcardFlips++;

        });
        
        container.appendChild(flashcardElem);
        return flashcardElem;
    }
    
    // Generate more quiz questions
    function generateMoreQuizQuestions(content) {
        quizContent.querySelector('.loading-placeholder').style.display = 'block';
        
        try {
            // Parse the HTML content
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            
            // Extract title and text
            const title = doc.querySelector('h1')?.textContent || "Topic";
            const paragraphs = Array.from(doc.querySelectorAll('p')).map(p => p.textContent);
            
            if (paragraphs.length === 0) {
                quizContent.querySelector('.error-placeholder').style.display = 'block';
                quizContent.querySelector('.loading-placeholder').style.display = 'none';
                return;
            }
            
            // Container for quiz questions
            const quizContainer = quizContent.querySelector('.quiz-container');
            quizContainer.innerHTML = ''; // Clear container
            
            // Extract sentences from paragraphs for question material
            let allSentences = [];
            paragraphs.forEach(para => {
                // Split by periods, question marks, exclamation points
                const sentences = para.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 20);
                allSentences = [...allSentences, ...sentences];
            });
            
            // 1. Definition Question
            createDefinitionQuestion(0, title, paragraphs[0], quizContainer);
            
            // 2. Multiple Blank Word Questions (3-4 of these)
            const selectedSentences = allSentences
                .filter(s => s.length > 40 && s.length < 250) // Not too short or long
                .slice(0, 8); // Get more sentences than we need
            
            let questionCount = 1;
            for (let i = 0; i < selectedSentences.length && questionCount <= 6; i++) {
                const sentence = selectedSentences[i];
                
                // Skip if sentence is too short
                if (sentence.split(' ').length < 8) continue;
                
                createBlankWordQuestion(questionCount, sentence, quizContainer);
                questionCount++;
            }
            
            // 3. Add Topic-Specific Questions if we need more
            const topicQuestions = [
                {
                    question: `Which of the following best describes the historical context of ${title}?`,
                    correctAnswer: `${title} developed within a specific historical and intellectual framework that shaped its current understanding.`,
                    wrongAnswers: [
                        `${title} emerged without any connection to historical events or intellectual traditions.`,
                        `${title} was deliberately created to contradict established knowledge in its field.`,
                        `${title} has no historical basis and was only recently invented.`
                    ]
                },
                {
                    question: `What approach would help in better understanding ${title}?`,
                    correctAnswer: `Studying ${title} in relation to similar concepts and examining its practical applications.`,
                    wrongAnswers: [
                        `Memorizing facts about ${title} without understanding underlying principles.`,
                        `Focusing only on criticisms of ${title} without exploring its benefits.`,
                        `Studying ${title} in isolation without considering related fields.`
                    ]
                },
                {
                    question: `Which statement about the significance of ${title} is most accurate?`,
                    correctAnswer: `${title} contributes important insights to its field and continues to be relevant today.`,
                    wrongAnswers: [
                        `${title} was briefly significant but has no relevance in modern contexts.`,
                        `${title} is primarily studied for historical reasons but has no practical use.`,
                        `${title} is generally considered a mistaken concept that has been disproven.`
                    ]
                }
            ];
            
            // Add generic questions if we don't have enough
            while (questionCount <= 8) {
                const questionData = topicQuestions[questionCount % topicQuestions.length];
                createCustomQuestion(
                    questionCount,
                    questionData.question,
                    questionData.correctAnswer,
                    questionData.wrongAnswers,
                    quizContainer
                );
                questionCount++;
                trackingData.quizInteractions++;

            }
            
            // Show check answers button
            checkQuizAnswersBtn.style.display = 'block';
            quizContent.querySelector('.loading-placeholder').style.display = 'none';
            
        } catch (error) {
            console.error('Error generating quiz:', error);
            quizContent.querySelector('.error-placeholder').style.display = 'block';
            quizContent.querySelector('.loading-placeholder').style.display = 'none';
        }
    }
    
    // Create a definition question
    function createDefinitionQuestion(index, title, definition, container) {
        // Correct answer is the actual definition
        const correctAnswer = definition.substring(0, 120) + (definition.length > 120 ? "..." : "");
        
        // Wrong answers are made-up definitions
        const wrongAnswers = [
            `A common misconception about ${title} is that it refers to something entirely different from its actual meaning.`,
            `${title} is often confused with similar concepts, but has no established definition in academic literature.`,
            `Unlike popular belief, ${title} actually refers to an obscure historical event that occurred centuries ago.`
        ];
        
        // Store correct answer
        correctAnswers[index] = correctAnswer;
        
        // Create all options including correct one
        const allOptions = [correctAnswer, ...wrongAnswers];
        // Shuffle options
        shuffleArray(allOptions);
        
        const questionElem = document.createElement('div');
        questionElem.className = 'quiz-question';
        questionElem.innerHTML = `
            <p class="question-text">Question ${index + 1}: Which of the following best describes ${title}?</p>
            <ul class="quiz-options" data-question="${index}">
                ${allOptions.map((option, i) => `
                    <li>
                        <button class="quiz-option" data-option="${i}">${option}</button>
                    </li>
                `).join('')}
            </ul>
        `;
        
        container.appendChild(questionElem);
        
        // Add event listeners to quiz options
        questionElem.querySelectorAll('.quiz-option').forEach(option => {
            option.addEventListener('click', (e) => {
                handleQuizOptionClick(e, index);
            });
        });
    }
    
    // Create a fill-in-the-blank question based on a sentence
    function createBlankWordQuestion(index, sentence, container) {
        // Find a substantive word to blank out
        const words = sentence.split(' ');
        
        // Choose a word to blank that's not at the beginning or end
        const startIndex = Math.floor(words.length * 0.3);
        const endIndex = Math.floor(words.length * 0.7);
        let wordIndex = Math.floor(Math.random() * (endIndex - startIndex)) + startIndex;
        
        // Try to find a word that's at least 4 characters
        let attempts = 0;
        let wordToBlank = words[wordIndex];
        
        while ((wordToBlank.length < 4 || /^[^a-zA-Z]/.test(wordToBlank)) && attempts < 10) {
            wordIndex = Math.floor(Math.random() * (endIndex - startIndex)) + startIndex;
            wordToBlank = words[wordIndex];
            attempts++;
        }
        
        // If we couldn't find a good word, return without creating a question
        if (wordToBlank.length < 4 || /^[^a-zA-Z]/.test(wordToBlank)) {
            return false;
        }
        
        // Clean up the word (remove punctuation)
        wordToBlank = wordToBlank.replace(/[^\w\s]/gi, '');
        
        // Create a copy of the words array and replace the target word with blank
        const modifiedWords = [...words];
        modifiedWords[wordIndex] = "_______";
        const questionText = modifiedWords.join(' ');
        
        // Correct answer is the original word
        const correctAnswer = wordToBlank;
        
        // Wrong answers are other words from different parts of the content
        const wrongAnswers = [];
        
        // Get some random words from the sentence that are different from the correct one
        const potentialWrongWords = words.filter(word => 
            word.length >= 4 && 
            word.toLowerCase() !== correctAnswer.toLowerCase() &&
            /^[a-zA-Z]/.test(word) // Starts with letter
        );
        
        // Shuffle potential wrong words
        shuffleArray(potentialWrongWords);
        
        // Take up to 3 wrong words
        for (let i = 0; i < Math.min(3, potentialWrongWords.length); i++) {
            // Clean up the word (remove punctuation)
            let cleanWord = potentialWrongWords[i].replace(/[^\w\s]/gi, '');
            if (cleanWord.length >= 4 && !wrongAnswers.includes(cleanWord)) {
                wrongAnswers.push(cleanWord);
            }
        }
        
        // If we don't have enough wrong answers, add generic ones
        const genericWords = ["theory", "concept", "example", "method", "research", "analysis", "system", 
                             "process", "function", "structure", "element", "factor", "result"];
        
        while (wrongAnswers.length < 3) {
            const randomWord = genericWords[Math.floor(Math.random() * genericWords.length)];
            if (!wrongAnswers.includes(randomWord) && randomWord !== correctAnswer) {
                wrongAnswers.push(randomWord);
            }
        }
        
        // Store correct answer
        correctAnswers[index] = correctAnswer;
        
        // Create all options including correct one
        const allOptions = [correctAnswer, ...wrongAnswers];
        // Shuffle options
        shuffleArray(allOptions);
        
        const questionElem = document.createElement('div');
        questionElem.className = 'quiz-question';
        questionElem.innerHTML = `
            <p class="question-text">Question ${index + 1}: What word best fits in the blank?</p>
            <p style="font-style: italic; margin-bottom: 15px;">"${questionText}"</p>
            <ul class="quiz-options" data-question="${index}">
                ${allOptions.map((option, i) => `
                    <li>
                        <button class="quiz-option" data-option="${i}">${option}</button>
                    </li>
                `).join('')}
            </ul>
        `;
        
        container.appendChild(questionElem);
        
        // Add event listeners to quiz options
        questionElem.querySelectorAll('.quiz-option').forEach(option => {
            option.addEventListener('click', (e) => {
                handleQuizOptionClick(e, index);
            });
        });
        
        return true;
    }
    
    // Create a custom question with provided options
    function createCustomQuestion(index, question, correctAnswer, wrongAnswers, container) {
        // Store correct answer
        correctAnswers[index] = correctAnswer;
        
        // Create all options including correct one
        const allOptions = [correctAnswer, ...wrongAnswers];
        // Shuffle options
        shuffleArray(allOptions);
        
        const questionElem = document.createElement('div');
        questionElem.className = 'quiz-question';
        questionElem.innerHTML = `
            <p class="question-text">Question ${index + 1}: ${question}</p>
            <ul class="quiz-options" data-question="${index}">
                ${allOptions.map((option, i) => `
                    <li>
                        <button class="quiz-option" data-option="${i}">${option}</button>
                    </li>
                `).join('')}
            </ul>
        `;
        
        container.appendChild(questionElem);
        
        // Add event listeners to quiz options
        questionElem.querySelectorAll('.quiz-option').forEach(option => {
            option.addEventListener('click', (e) => {
                handleQuizOptionClick(e, index);
            });
        });
    }
    
    // Handle quiz option clicks
    function handleQuizOptionClick(e, questionIndex) {
        const optionText = e.target.textContent;
        
        // Remove previous selection for this question
        const allOptionsInQuestion = document.querySelectorAll(`.quiz-options[data-question="${questionIndex}"] .quiz-option`);
        allOptionsInQuestion.forEach(opt => opt.classList.remove('selected'));
        
        // Mark this option as selected
        e.target.classList.add('selected');
        
        // Save the selection
        selectedAnswers[questionIndex] = optionText;
        
        // Enable check answers button if all questions are answered
        if (Object.keys(selectedAnswers).length === Object.keys(correctAnswers).length) {
            checkQuizAnswersBtn.disabled = false;
        }
    }
    
    // Check quiz answers
    function checkAnswers() {
        let correctCount = 0;
        const totalQuestions = Object.keys(correctAnswers).length;
        
        // Check each answer
        for (const questionIndex in selectedAnswers) {
            const selectedOption = selectedAnswers[questionIndex];
            const correctOption = correctAnswers[questionIndex];
            
            // Find the selected option button
            const options = document.querySelectorAll(`.quiz-options[data-question="${questionIndex}"] .quiz-option`);
            
            options.forEach(option => {
                if (option.textContent === selectedOption) {
                    if (selectedOption === correctOption) {
                        option.classList.add('correct');
                        correctCount++;
                        trackingData.quizChecks++;
                    } else {
                        option.classList.add('incorrect');
                    }
                } else if (option.textContent === correctOption) {
                    // Highlight the correct answer that wasn't selected
                    option.classList.add('reveal-correct');
                }
            });
        }
        
        // Show score in feedback area
        const feedback = document.getElementById('quizFeedback');
        feedback.style.display = 'block';
        feedback.textContent = `You got ${correctCount} out of ${totalQuestions} correct!`;
        
        // Disable check button to prevent multiple checks
        checkQuizAnswersBtn.disabled = true;
    }
    
    // Utility function to shuffle array in place
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }



    function handlePaste(e) {
        const items = e.clipboardData.items;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                processImageFile(file);
                showPasteNotification();
                   trackingData.imageUploads++; // Track paste
                 trackevent('image', 'paste');
                break;
            }
        }
    }

    function processImageFile(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            // Store the image data
            uploadedImagePreview.src = e.target.result;
            uploadedImagePreview.style.display = 'block';
            localStorage.setItem('uploadedImage', e.target.result);

            // Process the image data
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

                // Create selectedRegions array
                const pixelIndices = [];
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

                // Run code to apply animation
                runCode();
            };
            img.onerror = function() {
                // If the image fails to load, use the default white.png
                runCode();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function showPasteNotification() {
        pasteNotification.classList.add('show');
        setTimeout(() => {
            pasteNotification.classList.remove('show');
        }, 3000);
    }

    if (promptInput) {
        promptInput.addEventListener('change', function(e) {
            console.log("111111111111");
            if (this.value === '9757283303') {
                // Get current credits
                const currentCredits = parseInt(localStorage.getItem('credits') || '0');

                // Add one credit
                const newCredits = currentCredits + 2;
                localStorage.setItem('credits', newCredits);
                console.log('newCredits :>> ', newCredits);
                // Update UI
                document.getElementById('creditCount').textContent = `${newCredits} credits`;

                // Show success notification
                const jsOutput = document.getElementById('jsOutput');
                jsOutput.innerHTML = `
                    <div style="color: var(--credit-color); padding: 10px; border-radius: 4px; background: rgba(255,167,38,0.1); margin-bottom: 10px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                            <line x1="9" y1="9" x2="9.01" y2="9"></line>
                            <line x1="15" y1="9" x2="15.01" y2="9"></line>
                        </svg>
                        <strong>Secret code activated!</strong> 1 credit has been added to your account. You can now use the API one time.
                    </div>`;

                // Clear the input field after a short delay
                setTimeout(() => {
                    this.value = '';
                }, 500);
            }
        });
    } else {
        console.error("Prompt input element not found");
    }

    // Toggle dropdown when hamburger button is clicked
    hamburgerBtn.addEventListener('click', function(e) {
        e.stopPropagation();
      
        const dropdown = document.getElementById('hamburgerDropdown');
        if (tutorialActive) {
            // If tutorial is active, prevent closing
            dropdown.classList.add('show');
            return;
        }
        hamburgerDropdown.classList.toggle('show');
        trackingData.hamburgerOpens++
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!hamburgerBtn.contains(e.target) && !hamburgerDropdown.contains(e.target)) {
            hamburgerDropdown.classList.remove('show');
        }
    });

    // Fix for event bubbling with buttons inside the dropdown
    document.getElementById('applyImageCount').addEventListener('click', function(e) {
        e.stopPropagation();
        // Your existing apply logic here
    });

    document.getElementById('buyCreditsBtn').addEventListener('click', function(e) {
        e.stopPropagation();
        // Your existing buy credits logic here

        // Optionally close the dropdown when buying credits
        hamburgerDropdown.classList.remove('show');
    });

    // JavaScript library dropdown functionality
    const jsLibraryBtn = document.getElementById('jsLibraryBtn');
    const jsLibraryMenu = document.getElementById('jsLibraryMenu');
    const jsFilesList = document.getElementById('jsFilesList');
    const jsSearchInput = document.getElementById('jsSearchInput');
    const repoOwner = 'tejas36026';
    const repoName = 'working-code-27th-jan';
    const jsFolder = 'js2';

    jsLibraryBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        jsLibraryMenu.classList.toggle('show');

        // Only load files if they haven't been loaded yet
        if (jsFilesList.querySelector('.dropdown-loading')) {
            loadJSFiles();
        }
        trackingData.libraryOpens++;

    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!jsLibraryBtn.contains(e.target) && !jsLibraryMenu.contains(e.target)) {
            jsLibraryMenu.classList.remove('show');
        }
    });

    function createPlaceholderCanvas(htmlContainer) {
        canvas = document.createElement('canvas');
        canvas.id = "222222222222222"

        canvas.width = 360;
        canvas.height = 180;
        canvas.style.backgroundColor = '#252526';
        canvas.style.maxWidth = '100%';
        canvas.style.border = '1px solid #444';
        canvas.style.borderRadius = '8px';

        const canvasContainer = htmlContainer.querySelector('#canvas-container') || htmlOutput;
        canvasContainer.appendChild(canvas);

        ctx = canvas.getContext('2d');

        // Draw black background and white text
        ctx.fillStyle = '#252526';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Default image (white.png) not found', canvas.width / 2, canvas.height / 2);
        ctx.fillText('Please upload an image', canvas.width / 2, canvas.height / 2 + 24);

        jsOutput.innerHTML = 'Default image not found. Please upload, paste or drag and drop an image to start animation';
    }

    // Filter files when typing in search
    jsSearchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const categories = jsFilesList.querySelectorAll('.file-category');
        trackingData.librarySearches++;

        categories.forEach(category => {
            const categoryName = category.querySelector('.dropdown-category').textContent;
            const fileItems = category.querySelectorAll('.dropdown-item');
            let hasVisibleItems = false;

            fileItems.forEach(item => {
                const fileName = item.querySelector('.file-name').textContent.toLowerCase();
                const filePath = item.querySelector('.file-path').textContent.toLowerCase();

                if (fileName.includes(searchTerm) || filePath.includes(searchTerm)) {
                    item.style.display = 'flex';
                    hasVisibleItems = true;
                } else {
                    item.style.display = 'none';
                }
            });

            // Show/hide category based on whether it has visible items
            category.style.display = hasVisibleItems ? 'block' : 'none';
        });
        trackingData.librariesLoaded++;

    });

    // Function to fetch and organize JS files
    async function loadJSFiles() {
        try {
            // Fetch repository contents
            const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${jsFolder}`);
            if (!response.ok) {
                throw new Error('Failed to fetch repository contents');
            }

            const data = await response.json();

            // Process files and directories
            const files = [];
            const directories = [];

            data.forEach(item => {
                if (item.type === 'file' && item.name.endsWith('.js')) {
                    files.push({
                        name: item.name,
                        path: item.path,
                        url: item.download_url
                    });
                } else if (item.type === 'dir') {
                    directories.push(item);
                }
            });

            // Clear loading message
            jsFilesList.innerHTML = '';

            // Add root level JS files
            if (files.length > 0) {
                addFileCategory('Root Level', files);
            }

            // Process subdirectories
            for (const dir of directories) {
                await processDirectory(dir);
            }

            // If no files were found
            if (jsFilesList.innerHTML === '') {
                jsFilesList.innerHTML = '<div class="dropdown-loading">No JavaScript files found</div>';
            }

        } catch (error) {
            console.error('Error loading JS files:', error);
            jsFilesList.innerHTML = `<div class="dropdown-loading">Error loading files: ${error.message}</div>`;
        }
    }

    // Process a directory to find JS files
    async function processDirectory(dir) {
        try {
            const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${dir.path}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch directory contents: ${dir.path}`);
            }

            const contents = await response.json();

            // Filter for JS files
            const jsFiles = contents.filter(item => item.type === 'file' && item.name.endsWith('.js'))
                .map(item => ({
                    name: item.name,
                    path: item.path,
                    url: item.download_url
                }));

            // Add directory if it contains JS files
            if (jsFiles.length > 0) {
                addFileCategory(dir.name, jsFiles);
            }

            // Process subdirectories (optional, remove if you don't want recursive)
            const subDirs = contents.filter(item => item.type === 'dir');
            for (const subDir of subDirs) {
                await processDirectory(subDir);
            }

        } catch (error) {
            console.error(`Error processing directory ${dir.path}:`, error);
        }
    }

    // Add a category of files to the dropdown
    function addFileCategory(categoryName, files) {
        const categoryElement = document.createElement('div');
        categoryElement.className = 'file-category';

        // Add category header
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'dropdown-category';
        categoryHeader.textContent = categoryName;
        categoryElement.appendChild(categoryHeader);

        // Add files to category
        files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'dropdown-item';
            fileItem.innerHTML = `
                <span class="file-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <path d="M14 2v6h6"></path>
                        <path d="M10 12v6"></path>
                        <path d="M14 12v6"></path>
                    </svg>
                </span>
                <div class="dropdown-item-content">
                <span class="file-name">${ file.name.toLowerCase().endsWith('worker.js') ? file.name.substring(0, file.name.length - 'worker.js'.length) : file.name }</span>
                </div>
            `;

            // Add click event to load file content
            fileItem.addEventListener('click', function() {
                loadJSFileContent(file.url, file.name);
                jsLibraryMenu.classList.remove('show');
            });

            categoryElement.appendChild(fileItem);
        });

        jsFilesList.appendChild(categoryElement);
    }

    // Function to load JS file content from URL
    async function loadJSFileContent(fileUrl, fileName) {
        try {
            jsEditor.value = `// Loading ${fileName}...`;

            const response = await fetch(fileUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch file: ${fileName}`);
            }

            const content = await response.text();
            jsEditor.value = content;

            // Trigger line numbers update if that function exists
            if (typeof updateLineNumbers === 'function') {
                updateLineNumbers('jsEditor', 'jsLineNumbers');
            }

            // Optional: Show success message
            console.log(`Successfully loaded: ${fileName}`);
            trackevent('library', fileName);
        } catch (error) {
            console.error('Error loading file content:', error);
            jsEditor.value = `// Error loading ${fileName}: ${error.message}`;
        }
    }

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
        trackingData.htmlKeystrokes++;
trackingData.totalEdits++;
trackevent('edit', 'html');

    });
    cssEditor.addEventListener('input', () => {
        localStorage.setItem('cssCode', cssEditor.value);
        trackingData.cssKeystrokes++;
        trackingData.totalEdits++;
         trackevent('edit', 'css');

    });
    jsEditor.addEventListener('input', () => {
        localStorage.setItem('jsCode', jsEditor.value); // Save whatever is in the editor

        // Tracking happens regardless of saving
        trackingData.jsKeystrokes++;
        trackingData.totalEdits++;
        trackevent('edit', 'js');
        
        // --- The rest of the debounced logic (auto-plotting check) follows ---
        clearTimeout(autoPlotTimeout);
        autoPlotTimeout = setTimeout(() => {
            // ... (the existing auto-plot detection logic remains here) ...
            const jsCode = jsEditor.value;
            let looksLikePlot = false;
            // ... (rest of the auto-plot check) ...
        }, 750);
        

    });

    // Initialize tabs
    setupTabs();
    if (jsEditor) {
        jsEditor.addEventListener('input', handleJsEditorInput);
    }

    if (refreshPreviewBtn) {
        // This button now decides what to run
        refreshPreviewBtn.addEventListener('click', executeCode);
    } else {
        console.error("Refresh Preview button not found.");
    }

    
    // --- Modified Execution Flow ---
    function executeCode() {
        console.log("--- Executing Code ---");
        terminateWorkerAndAnimation(); // Stop previous activity (worker AND k-anim)
        clearExistingPlot();           // Clear only the SVG plot initially

        const jsCode = jsEditor.value; // Get code *as it is* on load
        const consoleOutput = jsOutput;
        consoleOutput.innerHTML = ''; // Clear console

        // --- Mode Detection & Parsing ---
        let looksLikePlot = false;
        let plotParseErrors = [];
        parsedEquationData = []; // Reset global parsed data
        requiresK = false;       // Reset global k requirement flag

        console.log("[Initial Load/Refresh] JS Code to analyze:", JSON.stringify(jsCode)); // Log the code

        if (jsCode.trim() !== '') {
            // Heuristic: If it doesn't contain worker keywords, *try* parsing as plot
            if (!jsCode.includes('onmessage') && !jsCode.includes('postMessage(')) {
                const lines = jsCode.split(/[;\n]+/).filter(s => s.trim() !== '');
                let potentialPlotLines = 0;
                console.log("[Initial Load/Refresh] Lines to parse:", lines); // Log lines

                lines.forEach((line, index) => {
                    // Ensure the parser function is called correctly
                    const result = parseSingleEquationForPlot(line); // Use the plot equation parser
                    console.log(`[Initial Load/Refresh] Parsing Line ${index} ('${line}'):`, result); // Log parse result

                    if (result.data) {
                        // Check if the result structure is valid (has fn, or x/y, or r)
                        if (result.data.fn || (result.data.x && result.data.y) || result.data.r) {
                            parsedEquationData.push(result.data); // Store the original parsed structure
                            if (result.usesK) {
                                requiresK = true;
                            }
                            potentialPlotLines++;
                        } else {
                             console.warn(`[Initial Load/Refresh] Parsed data for line '${line}' seems incomplete. Skipping.`);
                             if (!result.error) { // Add an error if parsing didn't report one but data is bad
                                 plotParseErrors.push(`Eq #${index + 1}: Incomplete plot data structure for '${line}'.`);
                             }
                        }
                    } else if (result.error && line.trim()) {
                        plotParseErrors.push(`Eq #${index + 1}: ${result.error}`);
                    }
                });

                console.log("[Initial Load/Refresh] Potential Plot Lines:", potentialPlotLines);
                console.log("[Initial Load/Refresh] Parse Errors:", plotParseErrors);

                // Adjust the heuristic: prioritize plot if *any* line successfully parses
                // and there aren't an excessive number of errors compared to successes.
                // Allow more errors relative to successes if needed.
                if (potentialPlotLines > 0 && plotParseErrors.length <= potentialPlotLines * 3) { // Increased tolerance for errors
                     looksLikePlot = true;
                } else if (potentialPlotLines > 0 && plotParseErrors.length > 0) {
                    console.warn("[Initial Load/Refresh] Some lines parsed for plot, but many errors. Review input.");
                    // Optionally, still treat as plot if at least one line worked?
                    // looksLikePlot = true; // Uncomment this to force plot mode if *anything* parses
                } else if (potentialPlotLines === 0 && plotParseErrors.length > 0) {
                     console.log("[Initial Load/Refresh] No lines parsed successfully for plot, only errors found.");
                } else if (potentialPlotLines === 0 && plotParseErrors.length === 0 && jsCode.trim()) {
                     console.log("[Initial Load/Refresh] No lines parsed for plot, no errors. Treating as worker code (or unrecognized).");
                }

            } else {
                 console.log("[Initial Load/Refresh] Found 'onmessage' or 'postMessage'. Assuming Worker code.");
            }
        } else {
             console.log("[Initial Load/Refresh] JS Editor is empty.");
             // Default behavior for empty editor (e.g., load base image but don't run worker/plot)
        }

        console.log("[Initial Load/Refresh] Mode Detected:", looksLikePlot ? 'Plot' : 'Worker');
        console.log("[Initial Load/Refresh] Requires K:", requiresK);

        // --- Hide/Show Animation Controls ---
        // Logic remains the same: show controls only if plot mode AND requiresK
        if (looksLikePlot && requiresK) {
            animationControlsDiv.style.display = 'flex';
            kValueDisplayContainer.style.display = 'inline';
            animPlayPauseButton.disabled = false;
            animResetButton.disabled = true;
        } else {
            animationControlsDiv.style.display = 'none';
            kValueDisplayContainer.style.display = 'none';
             // Also ensure buttons are disabled if not plot+k mode
             animPlayPauseButton.disabled = true;
             animResetButton.disabled = true;
        }

        // --- Ensure Canvas Exists BEFORE deciding mode action ---
        ensureBaseCanvasExists().then(() => {
             console.log("[Initial Load/Refresh] Canvas ready, proceeding with mode:", looksLikePlot ? 'Plot' : 'Worker');
             // Now that canvas is guaranteed, run the appropriate mode
            if (looksLikePlot) {
                currentMode = 'plot';
                console.log("Running as: Plot", "| Requires K:", requiresK);
                consoleOutput.innerHTML = 'Plotting equations...';
                // Read initial K values from inputs
                kMin = parseFloat(kMinInput.value) || 0;
                kMax = parseFloat(kMaxInput.value) || 10;
                kStep = parseFloat(kStepInput.value) || 0.1;
                if (kMin >= kMax && kStep > 0) kStep = -Math.abs(kStep || 0.1);
                if (kMin <= kMax && kStep < 0) kStep = Math.abs(kStep || 0.1);
                if (kStep === 0) kStep = (kMax > kMin) ? 0.1 : -0.1;
                 kStepInput.value = kStep; // Update input if step changed
                kValue = kMin; // Start at kMin
                updateKDisplay();
                runPlotterCode(parsedEquationData, plotParseErrors); // Pass original parsed data
            }
            // Handle the case where the editor might be empty or code is unrecognized
            else if (jsCode.trim() === '') {
                 currentMode = 'idle'; // Or 'setup'
                 console.log("Running as: Idle (Empty Editor)");
                 // Don't run worker or plotter, just show the base canvas (which ensureBaseCanvasExists did)
                 consoleOutput.innerHTML = 'JS Editor is empty. Enter code to run.';
                 animationControlsDiv.style.display = 'none'; // Hide plot controls
                 kValueDisplayContainer.style.display = 'none';
            }
            // Only run worker if detection explicitly decided it's worker code
            else {
                currentMode = 'worker';
                console.log("Running as: Worker");
                consoleOutput.innerHTML = 'Running worker code...';
                animationControlsDiv.style.display = 'none'; // Hide plot controls
                kValueDisplayContainer.style.display = 'none';
                runWorkerCode(); // Run the animation worker
            }
            trackevent('refresh', currentMode); // Track the final mode executed
        }).catch(error => {
            console.error("Failed to prepare canvas for execution:", error);
            consoleOutput.innerHTML = `Error: Could not prepare canvas. ${error.message}`;
            trackError('canvas_ensure', error.message);
             // Hide plot controls on error
             animationControlsDiv.style.display = 'none';
             kValueDisplayContainer.style.display = 'none';
        });
    }


    const debouncedAutoExecute = debounce(() => {
        const jsCode = jsEditor.value;
        let looksLikePlot = false;
        let parsedPlotData = [];
        let parseErrors = [];

        // Perform quick check for plot mode (same heuristic as executeCode)
        if (jsCode.trim() !== '' && !jsCode.includes('onmessage') && !jsCode.includes('postMessage(')) {
            const lines = jsCode.split(/[;\n]+/).filter(s => s.trim() !== '');
            let potentialPlotLines = 0;
            lines.forEach(line => { const r = parseSingleEquationForPlot(line); if(r.data) { parsedPlotData.push(r.data); potentialPlotLines++; } else if(r.error && line.trim()){ parseErrors.push(r.error); } });
            if (potentialPlotLines > 0 && parseErrors.length <= potentialPlotLines * 2) { looksLikePlot = true; }
        }

        if (looksLikePlot) {
            console.log("Auto-plotting triggered...");
            terminateWorkerAndAnimation();
            clearExistingPlot();
            currentMode = 'plot';
            runPlotterCode(parsedPlotData, parseErrors); // Plot directly
        } else {
             console.log("Input doesn't look like plot equations, skipping auto-run.");
             currentMode = 'worker';
        }
    }, 750); // 750ms debounce

    function handleJsEditorInput() {
        console.log("handleJsEditorInput: Event triggered."); // Log event start
    
        const currentJsCode = jsEditor.value; // Get value immediately
        const codeLength = currentJsCode.length;
        console.log(`handleJsEditorInput: Code length = ${codeLength}`);
    
        // --- Save JS code to localStorage (with detailed logging and error handling) ---
        try {
            console.log("handleJsEditorInput: Attempting localStorage.setItem('jsCode')...");
            localStorage.setItem('jsCode', currentJsCode);
            console.log("handleJsEditorInput: localStorage.setItem completed.");
    
            // Verification step: Read back immediately to check
            const savedValue = localStorage.getItem('jsCode');
            const savedLength = savedValue ? savedValue.length : 'null';
            console.log(`handleJsEditorInput: Verified localStorage length = ${savedLength}`);
    
            if (savedLength !== codeLength) {
                console.error("!!! handleJsEditorInput: LENGTH MISMATCH after saving to localStorage! Original:", codeLength, "Saved:", savedLength);
            } else {
                console.log("handleJsEditorInput: localStorage length verification successful.");
            }
    
        } catch (e) {
            console.error("!!! handleJsEditorInput: Error during localStorage.setItem:", e);
            if (e.name === 'QuotaExceededError') {
                alert("Error: The JavaScript code is too large to save automatically in your browser's local storage (" + (codeLength / 1024 / 1024).toFixed(2) + " MB). Please shorten it or save it externally.");
                console.warn("LocalStorage quota exceeded trying to save JS code. Code might be too large.");
            }
            // Optionally stop further processing in this handler if saving failed
            // return;
        }
    
        // --- Tracking (runs even if verification failed, unless error stopped execution) ---
        try {
            trackingData.jsKeystrokes++;
            trackingData.totalEdits++;
            trackevent('edit', 'js');
            console.log("handleJsEditorInput: Tracking updated.");
        } catch (trackingError) {
            console.error("!!! handleJsEditorInput: Error during tracking update:", trackingError);
        }
    
    
        // --- Debounced Auto-Plot Logic (remains the same) ---
        clearTimeout(autoPlotTimeout);
        autoPlotTimeout = setTimeout(() => {
            console.log("handleJsEditorInput: Debounced auto-plot check starting...");
            const jsCodeForPlotCheck = jsEditor.value; // Use current value for check
            let looksLikePlot = false;
            let tempParsedData = [];
            let tempParseErrors = [];
            let tempRequiresK = false;
    
            // Parsing logic... (keep the parsing logic from previous correct version here)
            if (jsCodeForPlotCheck.trim() !== '' && !jsCodeForPlotCheck.includes('onmessage') && !jsCodeForPlotCheck.includes('postMessage(')) {
                const lines = jsCodeForPlotCheck.split(/[;\n]+/).filter(s => s.trim() !== '');
                let potentialPlotLines = 0;
                lines.forEach((line, index) => {
                    const result = parseSingleEquationForPlot(line);
                    if (result.data) {
                        if (result.data.fn || (result.data.x && result.data.y) || result.data.r) {
                            tempParsedData.push(result.data);
                            if (result.usesK) { tempRequiresK = true; }
                            potentialPlotLines++;
                        } else {
                            if (!result.error) tempParseErrors.push(`Eq #${index + 1}: Incomplete plot data for '${line}'.`);
                        }
                    } else if (result.error && line.trim()) {
                        tempParseErrors.push(`Eq #${index + 1}: ${result.error}`);
                    }
                });
                if (potentialPlotLines > 0 && tempParseErrors.length <= potentialPlotLines * 3) {
                     looksLikePlot = true;
                 }
            }
            // End parsing logic
    
            console.log(`handleJsEditorInput: Debounced auto-plot check finished. looksLikePlot = ${looksLikePlot}`);
    
            if (looksLikePlot) {
                console.log("handleJsEditorInput: Auto-plotting triggered...");
                // ... (rest of the auto-plotting execution logic, identical to the correct version) ...
                 terminateWorkerAndAnimation();
                 clearExistingPlot();
                 currentMode = 'plot';
                 parsedEquationData = tempParsedData;
                 requiresK = tempRequiresK;
                 if (requiresK) { /* Show controls */ animationControlsDiv.style.display = 'flex'; kValueDisplayContainer.style.display = 'inline'; animPlayPauseButton.disabled = false; animResetButton.disabled = true; } else { /* Hide controls */ animationControlsDiv.style.display = 'none'; kValueDisplayContainer.style.display = 'none'; animPlayPauseButton.disabled = true; animResetButton.disabled = true; }
                 kMin = parseFloat(kMinInput.value) || 0; kMax = parseFloat(kMaxInput.value) || 10; kStep = parseFloat(kStepInput.value) || 0.1;
                 if (kMin >= kMax && kStep > 0) kStep = -Math.abs(kStep || 0.1); if (kMin <= kMax && kStep < 0) kStep = Math.abs(kStep || 0.1); if (kStep === 0) kStep = (kMax > kMin) ? 0.1 : -0.1; kStepInput.value = kStep;
                 kValue = kMin; updateKDisplay();
                 runPlotterCode(parsedEquationData, tempParseErrors);
            } else {
                console.log("handleJsEditorInput: Input doesn't look like plot equations, skipping auto-plot.");
                // No automatic mode switch here, just skip auto-plotting
            }
        }, 750); // Debounce time
    }
 
    function updateKDisplay() {
        if(kValueDisplay) {
             kValueDisplay.textContent = kValue.toFixed(Math.max(2, (kStep.toString().split('.')[1] || '').length)); // Show decimal places based on step
        }
    }
    function runWorkerCode() {
        console.log("Running code as Worker/Animation...");
        animationControlsDiv.style.display = 'none';
        kValueDisplayContainer.style.display = 'none';

        const htmlCode = htmlEditor.value;
        const cssCode = cssEditor.value;

        // jsCode for worker is already available globally or fetched if needed

        // **Crucially, clear htmlOutput completely for worker mode**
        // to ensure a clean slate and avoid interference with previous plots/canvases
        htmlOutput.innerHTML = '';
        jsOutput.innerHTML = 'Initializing worker...';
        cssOutput.innerHTML = cssCode;


        try {
            // Setup HTML and CSS in the preview
            const htmlContainer = document.createElement('div');
            htmlContainer.innerHTML = htmlCode;
            const styleElement = document.createElement('style');
            styleElement.textContent = cssCode;
            htmlOutput.appendChild(styleElement);
            htmlOutput.appendChild(htmlContainer); // Add user's HTML structure

            // Load base image, which will create/reuse THE canvas and then start worker
            loadImageForWorker(htmlContainer);

        } catch (error) {
            jsOutput.innerHTML = `Error setting up preview: ${error.message}`;
            console.error('Preview Setup Error:', error);
            trackError('setup', error.message);
        }
    }


    function ensureBaseCanvasExists() {
        return new Promise((resolve, reject) => {
            console.log("Ensuring base canvas exists...");
            let existingCanvas = htmlOutput.querySelector(':scope > canvas');

            // If canvas exists and seems okay (has context, maybe check dimensions?), resolve.
            if (existingCanvas && existingCanvas.getContext('2d')) {
                console.log("Base canvas found and seems valid.");
                canvas = existingCanvas; // Update global reference
                ctx = canvas.getContext('2d');
                // We might still need to load/reload originalImageData if it's missing
                if (!originalImageData) {
                    console.warn("Canvas exists, but originalImageData missing. Will attempt to load.");
                } else {
                    resolve();
                    return;
                }
            } else if (existingCanvas) {
                // Canvas exists but is maybe broken (no context, zero size?) - remove it
                console.warn("Found existing canvas, but it seems invalid. Removing and recreating.");
                htmlOutput.removeChild(existingCanvas);
                canvas = null; // Clear global refs
                ctx = null;
                originalImageData = null;
            } else {
                 console.log("No existing canvas found in #htmlOutput.");
            }

            // --- Load image and create/prepare canvas ---
            const imageSrc = localStorage.getItem('uploadedImage') || 'white.png';
            const img = new Image();

            img.onload = function() {
                if (!canvas) { // Create canvas only if it wasn't found/reused
                    canvas = document.createElement('canvas');
                    canvas.id = "3333333333"
                    htmlOutput.appendChild(canvas);
                    canvas.style.display = "none";
                    console.log("Created NEW canvas inside #htmlOutput.");
                } else {
                     console.log("Reusing existing canvas element.");
                     // Clear it before drawing new image
                    //  const reuseCtx = canvas.getContext('2d');
                    //  if(reuseCtx) {
                    //      reuseCtx.clearRect(0, 0, canvas.width, canvas.height);
                    //  }
                }

                // Set attributes and get context
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.style.maxWidth = '100%'; // Responsive
                // CSS handles positioning (relative, z-index: 1)
                ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error("Failed to get 2D context.")); return; }


                // Get image data (using temp canvas is safer)
                const tempCanvas = document.createElement('canvas');
                tempCanvas.id = "444444444444"

                tempCanvas.width = img.width; tempCanvas.height = img.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(img, 0, 0);
                originalImageData = tempCtx.getImageData(0, 0, img.width, img.height);

                // Prepare selectedRegions (example: all non-transparent)
                const pixelIndices = [];
                const imgData = originalImageData.data;
                const width = originalImageData.width; const height = originalImageData.height;
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const idx = (y * width + x) * 4 + 3;
                        if (imgData[idx] > 0) pixelIndices.push((idx - 3) / 4);
                    }
                }

                selectedRegions = [pixelIndices];

                // Draw initial image onto the main canvas
                ctx.putImageData(originalImageData, 0, 0);
                console.log("Canvas ready, image loaded/drawn.");
                resolve(); // Canvas is ready
            };

            img.onerror = function() {
                console.error(`Failed to load base image: ${imageSrc}`);
                // Clear htmlOutput completely if image fails, show placeholder
                htmlOutput.innerHTML = ''; // Clear everything
                createPlaceholderCanvas(htmlOutput);

                // Use existing placeholder func
                reject(new Error(`Failed to load base image ${imageSrc}`));
                trackError('image_load', `Failed to load ${imageSrc}`);
            };

            img.src = imageSrc;
        });
    }


    function drawCurrentFrame() {
        if (parsedEquationData.length === 0 || !htmlOutput) {
            console.warn("Cannot draw frame - no parsed data or output element missing.");
            return;
        }

        // --- WORKAROUND: Substitute k value directly into function strings ---
        const frameSpecificData = parsedEquationData.map(eqData => {
            const newEqData = { ...eqData };
            const kString = `(${kValue})`; // Wrap k value in parentheses for safety

            try {
                 // Apply substitution based on function type
                 if (newEqData.fnType === 'implicit' && /\bk\b/.test(newEqData.fn)) {
                     newEqData.fn = newEqData.fn.replace(/\bk\b/g, kString);
                 } else if (newEqData.fnType === 'parametric') {
                     if (/\bk\b/.test(newEqData.x)) newEqData.x = newEqData.x.replace(/\bk\b/g, kString);
                     if (/\bk\b/.test(newEqData.y)) newEqData.y = newEqData.y.replace(/\bk\b/g, kString);
                 } else if (newEqData.fnType === 'polar' && /\bk\b/.test(newEqData.r)) {
                     newEqData.r = newEqData.r.replace(/\bk\b/g, kString);
                 } else if (!newEqData.fnType && newEqData.fn && /\bk\b/.test(newEqData.fn)) { // Explicit y=f(x,k)
                     newEqData.fn = newEqData.fn.replace(/\bk\b/g, kString);
                 }
            } catch (replaceError) {
                console.error("Error substituting k value:", replaceError, "Original:", eqData.fn || eqData.r || eqData.x);
                // Fallback or handle error - maybe skip this equation for the frame?
                return null; // Indicate failure to substitute
            }
            return newEqData;
        }).filter(data => data !== null); // Remove equations where substitution failed

        // --- End Workaround ---

        let plotOptions = {
            target: '#htmlOutput', // Target the main output div
            width: currentPlotOptions.width || htmlOutput.clientWidth || 600,
            height: currentPlotOptions.height || htmlOutput.clientHeight || 400,
            grid: true,
            data: frameSpecificData, // Use the data with 'k' substituted for THIS frame
            // Scope might still be needed for titles or annotations if functionPlot uses it
            scope: { k: kValue }
        };

        // Preserve zoom/pan from previous state if available
        if (currentPlotOptions.xAxis && currentPlotOptions.yAxis) {
            plotOptions.xAxis = { ...currentPlotOptions.xAxis };
            plotOptions.yAxis = { ...currentPlotOptions.yAxis };
        } else {
            // Default domain if no previous state
            plotOptions.xAxis = { domain: [-10, 10] };
            plotOptions.yAxis = { domain: [-10, 10] };
        }

        try {
            // Create/update the plot instance
            plotInstance = functionPlot(plotOptions); // Plot with substituted data

            // Store the base options for the *next* frame or resize
            // Crucially, store the ORIGINAL parsed data with 'k'
            currentPlotOptions = {
                 target: plotOptions.target,
                 width: plotOptions.width,
                 height: plotOptions.height,
                 grid: plotOptions.grid,
                 data: parsedEquationData, // Store original data
                 xAxis: plotOptions.xAxis, // Store current domain
                 yAxis: plotOptions.yAxis  // Store current domain
            };


             // Add listeners AFTER instance creation
             plotInstance.on('error', (err) => {
                 console.error(`functionPlot runtime error (k=${kValue.toFixed(2)}):`, err);
                 jsOutput.innerHTML += `<br><span style="color:red;">Runtime Plot Error (k=${kValue.toFixed(2)}): ${err.message || err}</span>`;
                 stopAnimationK();
                 trackError('plot_runtime', err.message || err);
             });

              // Listener to update stored domain on zoom/pan
             plotInstance.on('all', (eventName) => { // Listen to all events
                if (eventName === 'programmatic-zoom' || eventName === 'zoom' || eventName === 'pan') {
                    if (plotInstance && plotInstance.meta && plotInstance.meta.xScale && plotInstance.meta.yScale) {
                        const currentXDomain = plotInstance.meta.xScale.domain();
                        const currentYDomain = plotInstance.meta.yScale.domain();
                        // Update the stored options ONLY if the domain actually changed
                        if (currentPlotOptions.xAxis?.domain?.[0] !== currentXDomain[0] || currentPlotOptions.xAxis?.domain?.[1] !== currentXDomain[1]) {
                           currentPlotOptions.xAxis = { domain: currentXDomain };
                           // console.log("Updated stored xDomain:", currentXDomain);
                        }
                         if (currentPlotOptions.yAxis?.domain?.[0] !== currentYDomain[0] || currentPlotOptions.yAxis?.domain?.[1] !== currentYDomain[1]) {
                            currentPlotOptions.yAxis = { domain: currentYDomain };
                            // console.log("Updated stored yDomain:", currentYDomain);
                        }
                    }
                }
             });


            // Position the plot SVG over the canvas (if needed)
            positionPlotOverCanvas();

        } catch (plottingError) {
            console.error("FunctionPlot Instantiation Error:", plottingError);
            jsOutput.innerHTML += `<br><span style="color:red;">Plot Setup Error: ${plottingError.message}</span>`;
            plotInstance = null;
            stopAnimationK(); // Stop animation on error
            trackError('plot_call', plottingError.message);
             // Hide plot controls on error
             animationControlsDiv.style.display = 'none';
             kValueDisplayContainer.style.display = 'none';
        }
    }

    function runPlotterCode(originalParsedData, errors) {
        const consoleOutput = jsOutput;
        const htmlOutputTarget = htmlOutput;

        // 1. Ensure the base canvas exists for the plot to overlay
        ensureBaseCanvasExists().then(() => {
            // 2. Display parsing errors, if any
            if (errors && errors.length > 0) {
                console.error("Parsing errors occurred:", errors);
                consoleOutput.innerHTML = `Errors found during parsing:<br><pre>${errors.join('<br>')}</pre>`;
                // Don't necessarily stop plotting if some equations parsed ok
            } else if (originalParsedData.length > 0) {
                consoleOutput.innerHTML = 'Plotting equations...'; // Reset console if no errors and data exists
           
            }  
            else {
                consoleOutput.innerHTML = 'No valid equations to plot.'; // Handle case with no data and no errors
           }

            if (originalParsedData && originalParsedData.length > 0) {
                // Use the new function to draw the initial frame (at k=kMin)
                drawCurrentFrame(); // This now handles plotting internally
            } else {
                // No valid data to plot, clear any old plot
                clearExistingPlot();
                if (errors.length === 0) { // Only show this if no other errors were shown
                    consoleOutput.innerHTML += "<br>No valid equations found to plot.";
                }


                animationControlsDiv.style.display = 'none';
                 kValueDisplayContainer.style.display = 'none';
            }

            // 3. Plot if there's valid data
       
        }).catch(error => {
             console.error("Error ensuring base canvas:", error);
             consoleOutput.innerHTML = `Error preparing canvas for plot: ${error.message}`;
        });
    }

    
    function debounce(func, wait) { /* ... implementation ... */
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


    function terminateWorkerAndAnimation() {
        // Terminate existing worker
        if (imageWorker) {
            imageWorker.terminate();
            imageWorker = null;
            workerActive = false;
            console.log("Terminated existing worker.");
        }
        // Clear any existing animation frame
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            console.log("Cancelled existing animation frame.");
        }
    }

    function clearExistingPlot() {
        // Remove only SVG elements directly within htmlOutput (likely from functionPlot)
        const existingPlot = htmlOutput.querySelector(':scope > svg'); // More specific selector
        if (existingPlot) {
            htmlOutput.removeChild(existingPlot);
            console.log("Cleared existing plot SVG.");
        }
    }

     function positionPlotOverCanvas() {
        const plotSvg = htmlOutput.querySelector(':scope > svg');
        const baseCanvas = htmlOutput.querySelector(':scope > canvas'); // Find canvas directly in htmlOutput

        if (baseCanvas && plotSvg) {
            console.log("Positioning SVG over Canvas");
            // Ensure parent has relative positioning
            htmlOutput.style.position = 'relative';
            htmlOutput.style.overflow = 'hidden'; // Optional

            // Style the canvas
            baseCanvas.style.position = 'relative'; // Or 'absolute' if needed, but relative is safer
            baseCanvas.style.zIndex = '1';
            baseCanvas.style.display = 'block'; // Prevent extra space

            // Style the SVG
            plotSvg.style.position = 'absolute';
            plotSvg.style.top = '0';
            plotSvg.style.left = '0';
            plotSvg.style.width = '100%';
            plotSvg.style.height = '100%';
            plotSvg.style.zIndex = '10';
            plotSvg.style.pointerEvents = 'none'; // Allow interaction with canvas below
            // plotSvg.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; // Optional for debugging visibility
        } else {
             if (plotSvg) { // If only SVG exists, ensure it fills the container
                plotSvg.style.width = '100%';
                plotSvg.style.height = '100%';
             }
        }
    }


    function loadImageForWorker(htmlContainer) { // htmlContainer is user's HTML structure
        const imageSrc = localStorage.getItem('uploadedImage') || 'white.png';
        const img = new Image();

        img.onload = function() {
            // --- Query GLOBALLY within htmlOutput first ---
            canvas = htmlOutput.querySelector('canvas'); // Find ANY canvas inside

            if (!canvas) { // If no canvas exists anywhere inside htmlOutput
                canvas = document.createElement('canvas');
                canvas.id = "555555555555"

                // Decide where to append: User's specific container OR directly to htmlOutput
                const canvasParent = htmlContainer.querySelector('#canvas-container') || htmlOutput;
                canvasParent.appendChild(canvas);
                console.log("Created new canvas inside:", canvasParent === htmlOutput ? "#htmlOutput" : "#canvas-container");
            } else {
                console.log("Reusing existing canvas for worker animation.");
                 // Clear existing canvas content before drawing new image data
                 const existingCtx = canvas.getContext('2d');
                 if (existingCtx) {
                     existingCtx.clearRect(0, 0, canvas.width, canvas.height);
                 }
            }

            // Set dimensions and style (apply to the found or created canvas)
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.style.maxWidth = '100%';
            // CSS should handle positioning (relative/absolute)

            ctx = canvas.getContext('2d');
            // Get image data
            const tempCanvas = document.createElement('canvas');
            canvas.id = "666666666666666"

            tempCanvas.width = img.width; tempCanvas.height = img.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(img, 0, 0);
            originalImageData = tempCtx.getImageData(0, 0, img.width, img.height);

            // Prepare selectedRegions
            const pixelIndices = [];
            const imgData = originalImageData.data;
            const width = originalImageData.width; const height = originalImageData.height;
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4 + 3; // Alpha
                    if (imgData[idx] > 0) pixelIndices.push((idx - 3) / 4);
                }
            }
            selectedRegions = [pixelIndices];

            console.log('Image loaded for worker, Regions:', selectedRegions[0].length);


            // Draw initial image
            ctx.putImageData(originalImageData, 0, 0);

            // Now create worker and start animation
            createWorker();

        };
        img.onerror = function() {
            console.error(`Failed to load image: ${imageSrc} for worker.`);
            // If image fails, clear htmlOutput and show placeholder
            htmlOutput.innerHTML = ''; // Clear potential faulty canvas attempts
            createPlaceholderCanvas(htmlOutput); // Use existing placeholder func
            jsOutput.innerHTML = `Error: Could not load base image '${imageSrc}'.`;
            trackError('image_load_worker', `Failed to load ${imageSrc}`);
        };
        img.src = imageSrc;
    }

    executeCode(); // Run initial code check on load

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

            // Function to handle image loading
            const loadImage = (imageSrc) => {
                const img = new Image();
                img.onload = function() {
                    canvas = document.createElement('canvas');
                    canvas.id = "77777777777777"

                    canvas.width = img.width;
                    canvas.height = img.height;
                    canvas.style.maxWidth = '100%';
                    canvas.style.border = '1px solid #444';
                    canvas.style.borderRadius = '1px';

                    // Find a suitable container in the HTML for the canvas
                    const canvasContainer = htmlContainer.querySelector('#canvas-container') || htmlOutput;
                    // canvasContainer.appendChild(canvas);

                    ctx = canvas.getContext('2d');

                    // Create a temporary canvas to get the image data
                    const tempCanvas = document.createElement('canvas');
                    canvas.id = "888888888888888"

                    tempCanvas.width = img.width;
                    tempCanvas.height = img.height;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.drawImage(img, 0, 0);

                    originalImageData = tempCtx.getImageData(0, 0, img.width, img.height);

                    // Create the proper selectedRegions array format
                    const pixelIndices = [];
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
                img.onerror = function() {
                    // If the default image fails to load, create a placeholder canvas
                    createPlaceholderCanvas(htmlContainer);
                };
                img.src = imageSrc;
            };
            trackingData.previewRefreshes++;
            trackevent('refresh');
            // Check if there's a saved image, otherwise use the default white.png
            if (localStorage.getItem('uploadedImage')) {
                loadImage(localStorage.getItem('uploadedImage'));
            } else {
                // Try to load the default white.png from root folder
                loadImage('white.png');
            }
        } catch (error) {
            jsOutput.innerHTML = `Error: ${error.message}`;
            console.error('Error:', error);
        }
    }

    // Handle image upload
    function handleImageUpload(event) {
        if (tutorialActive && !validateWorkflowProgress('image-uploaded')) {
            return;
        }

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
                console.log("99999999999999");
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

    // function createWorker() {
    //     // Terminate existing worker if it exists
    //     if (imageWorker) {
    //         imageWorker.terminate();
    //     }

    //     try {
    //         // Get the worker code from the editor
    //         const workerCode = jsEditor.value;

    //         // Create a blob URL from the worker code
    //         const blob = new Blob([workerCode], { type: 'application/javascript' });
    //         const workerUrl = URL.createObjectURL(blob);

    //         // Create the worker
    //         imageWorker = new Worker(workerUrl);

    //         // Set up the message handler
    //         imageWorker.onmessage = function(e) {
    //             const { segmentedImages, error, progress } = e.data;

    //             if (error) {
    //                 jsOutput.innerHTML = `Worker Error: ${error}`;
    //                 console.error('Worker error:', error);
    //                 return;
    //             }

    //             if (segmentedImages && segmentedImages.length > 0) {
    //                 // Draw the segmented image to the canvas
    //                 ctx.putImageData(segmentedImages[0], 0, 0);

    //                 // Update progress if available
    //                 if (progress !== undefined) {
    //                     // const progressPercent = Math.round(progress * 100);
    //                     // jsOutput.innerHTML = `Processing: ${progressPercent}% complete`;
    //                 }
    //             }
    //         };

    //         workerActive = true;
    //         jsOutput.innerHTML = 'Worker created successfully. Starting animation...';

    //         // Start the animation
    //         startAnimation();
    //     } catch (error) {
    //         jsOutput.innerHTML = `Error creating worker: ${error.message}`;
    //         console.error('Worker creation error:', error);

    //         trackingData.workerErrors++;
    //         trackError('worker', errorEvent.message); // Potential variable name issue here
            
      
    //     }
    // }



    function createWorker() {
        // terminateWorkerAndAnimation(); // Ensure previous is stopped (already called by runWorkerCode)
        try {
            const workerCode = jsEditor.value;
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            imageWorker = new Worker(workerUrl);

            imageWorker.onmessage = function(e) {
                const { segmentedImages, error, progress } = e.data;
                 if (!workerActive) return; // Ignore messages from terminated workers

                if (error) {
                    jsOutput.innerHTML = `Worker Error: ${error}`;
                    console.error('Worker error:', error);
                     terminateWorkerAndAnimation(); // Stop on error
                    trackError('worker', error);
                    return;
                }

                if (segmentedImages && segmentedImages.length > 0 && ctx) {
                    ctx.putImageData(segmentedImages[0], 0, 0); // Draw result
                    if (progress !== undefined) {
                        // Optional: Update progress UI if needed
                    }
                }
            };

             imageWorker.onerror = function(errorEvent) {
                 console.error("Unhandled Worker Error:", errorEvent);
                 jsOutput.innerHTML = `Unhandled Worker Error: ${errorEvent.message}`;
                 terminateWorkerAndAnimation(); // Stop on error
                 trackingData.workerErrors++;
                 trackError('worker', errorEvent.message);

             };

            workerActive = true;
            jsOutput.innerHTML = 'Worker created. Starting animation...';
            startAnimation(); // Start the animation loop

        } catch (error) {
            jsOutput.innerHTML = `Error creating worker: ${error.message}`;
            console.error('Worker creation error:', error);
            trackError('worker_create', error.message);

        }
    }



    // function startAnimation() {
    //     if (!imageWorker || !originalImageData || !workerActive) return;

    //     // Define the animation frame function
    //     const animate = () => {
    //         if (!workerActive) return;

    //         // Get the image count from the input
    //         const imageCount = parseInt(imageCountInput.value, 10) || 5;

    //         // Calculate how many iterations to use based on image count
    //         // This scales the animation duration with the number of images
    //         const iterations = imageCount * 24; // 24 frames per image

    //         // Ensure selectedRegions is properly formatted
    //         // Convert the selectedRegions into the format expected by the worker
    //         let formattedSelectedRegions;

    //         if (!selectedRegions || !selectedRegions.length) {
    //             // Create a default region that includes all pixels
    //             const totalPixels = originalImageData.width * originalImageData.height;
    //             const allPixelsRegion = [];
    //             for (let i = 0; i < totalPixels; i++) {
    //                 allPixelsRegion.push(i);
    //             }
    //             formattedSelectedRegions = [allPixelsRegion];
    //         } else {
    //             // Convert the existing selectedRegions to proper format if needed
    //             formattedSelectedRegions = selectedRegions;

    //             // If selectedRegions is already an array of pixel indices, wrap it in another array
    //             if (Array.isArray(selectedRegions) && !Array.isArray(selectedRegions[0])) {
    //                 formattedSelectedRegions = [selectedRegions];
    //             }

    //             // If selectedRegions is an array of 1s (boolean mask format), convert to pixel indices
    //             if (Array.isArray(selectedRegions[0]) && typeof selectedRegions[0][0] === 'number' &&
    //                 (selectedRegions[0][0] === 0 || selectedRegions[0][0] === 1)) {
    //                 const convertedRegions = [];
    //                 const region = [];

    //                 for (let i = 0; i < selectedRegions[0].length; i++) {
    //                     if (selectedRegions[0][i] === 1) {
    //                         region.push(i);
    //                     }
    //                 }

    //                 convertedRegions.push(region);
    //                 formattedSelectedRegions = convertedRegions;
    //             }
    //         }

    //         // Send data to the worker
    //         imageWorker.postMessage({
    //             imageData: originalImageData,
    //             selectedRegions: selectedRegions, // Now correctly formatted
    //             value: 1,
    //             value5: iterations,
    //             reset: false
    //         });

    //         // Request the next frame
    //         animationFrameId = requestAnimationFrame(animate);
    //     };

    //     // Start the animation
    //     animate();
    // }

    // Update the processed images grid
  
  

    function startAnimation() {
        if (!imageWorker || !originalImageData || !workerActive || !selectedRegions) {
            console.log("Animation prerequisites not met. Worker:", !!imageWorker, "ImageData:", !!originalImageData, "Active:", workerActive, "Regions:", !!selectedRegions);
            // Optionally clear the animation frame if it was somehow set
            if (animationFrameId) {
               cancelAnimationFrame(animationFrameId);
               animationFrameId = null;
            }
            return;
        }

        // --- Get necessary parameters ---
        const imageCount = parseInt(imageCountInput.value, 10) || 5;
        const iterations = imageCount * 24; // Example: 24 frames per logical "image"

        // --- Prepare data for the worker ---
        // Ensure selectedRegions is correctly formatted (should be an array containing one array of indices)
         let formattedSelectedRegions = selectedRegions;
         if (!Array.isArray(formattedSelectedRegions?.[0])) {
             console.warn("SelectedRegions format invalid, creating default.", selectedRegions);
             // Create a default region if needed (e.g., all non-transparent pixels)
               const totalPixels = originalImageData.width * originalImageData.height;
               const allPixelsRegion = [];
               const imgData = originalImageData.data;
               for (let i = 0; i < totalPixels; i++) {
                   if (imgData[i*4+3] > 0) allPixelsRegion.push(i);
               }
               formattedSelectedRegions = [allPixelsRegion];
         }


        const messageData = {
            imageData: originalImageData,
            selectedRegions: formattedSelectedRegions,
            value: 1, // Or other parameters your worker expects
            value5: iterations, // Total iterations
            reset: false // Standard animation frame
        };

        // --- Animation loop function ---
        const animate = () => {
            if (!workerActive || !imageWorker) return; // Stop if worker terminated

            try {
                // Send data to the worker for the next frame
                imageWorker.postMessage(messageData);
            } catch (postError) {
                console.error("Error posting message to worker:", postError);
                jsOutput.innerHTML = `Error communicating with worker: ${postError.message}`;
                terminateWorkerAndAnimation(); // Stop if communication fails
                 trackError('worker_comm', postError.message);
                return; // Exit loop
            }

            // Request the next frame
            animationFrameId = requestAnimationFrame(animate);
        };

        // --- Start the animation loop ---
         console.log("Starting animation loop...");
         // Clear any previous frame ID before starting a new loop
         if (animationFrameId) {
             cancelAnimationFrame(animationFrameId);
         }
        animate(); // Start the first frame
    }

    if (jsEditor.value.trim() !== '') {
        // Decide whether to plot or run worker based on some initial state or default
        // For now, let's default to running the worker on initial load if JS code exists
         console.log("Initial JS code found, running as worker...");
         runWorkerCode();
     } else {
        // Or maybe just load the image without starting the worker if no JS code
        console.log("No initial JS code, loading base image only...");
         const htmlContainer = document.createElement('div');
        htmlContainer.innerHTML = htmlEditor.value;
        const styleElement = document.createElement('style');
        styleElement.textContent = cssEditor.value;
        htmlOutput.appendChild(styleElement);
        htmlOutput.appendChild(htmlContainer);
        loadImageForWorker(htmlContainer); // Just load image, don't start worker automatically
     }

  
     function preprocessEquation(str) {
        // Replace common representations of pi and theta
        str = str.replace(/π/g, 'pi')
                 .replace(/θ/g, 'theta');
       // Convert x2 -> x^2 etc. (handle potential lookbehind issues)
       try {
           str = str.replace(/(?<![a-zA-Z0-9\.])([xytr])(\d+)/g, '$1^$2'); // Removed 'k' for now
       } catch (e) {
            console.warn("Regex lookbehind might not be supported.");
            str = str.replace(/\b([xytr])(\d+)\b/g, '$1^$2'); // Removed 'k' for now
       }
       // Basic implicit multiplication (can be risky)
       // str = str.replace(/(\d|\))(\s*)([a-zA-Z\(])/g, '$1*$3');
       // str = str.replace(/([a-zA-Z])(\s+)([a-zA-Z\(])/g, '$1*$3');
   
       return str;
   }
   
   // --- Helper: Parses a SINGLE equation string for functionPlot ---
   // Returns an object { data: plotData | null, error: errorMessage | null }
   function parseSingleEquationForPlot(singleEqStr) {
       let rawEq = singleEqStr.trim();
       if (!rawEq) {
           return { data: null, error: null }; // Ignore empty lines/parts
       }
   
       let convertedInput = rawEq;
       let conversionError = null;
   
       // Try Nerdamer LaTeX conversion first
       try {
           // Basic check if it looks like LaTeX
           if (rawEq.includes('\\') || rawEq.includes('{') || rawEq.includes('^')) {
                convertedInput = nerdamer.fromLaTeX(rawEq).toString();
                // Nerdamer might wrap in unnecessary parens
                if (convertedInput.startsWith('(') && convertedInput.endsWith(')')) {
                    try {
                        // Check if inner part is valid mathjs expression
                        math.parse(convertedInput.substring(1, convertedInput.length - 1));
                        convertedInput = convertedInput.substring(1, convertedInput.length - 1);
                    } catch (e) { /* Keep outer parens if inner isn't valid */ }
                }
                console.log(`Raw: "${rawEq}", Nerdamer attempt: "${convertedInput}"`);
           } else {
               convertedInput = rawEq; // Assume not LaTeX if no common chars
           }
       } catch (latexError) {
           convertedInput = rawEq; // Fallback to raw input
           conversionError = `(Input "${rawEq}" possibly invalid LaTeX: ${latexError.message})`;
            console.warn(`Nerdamer failed for "${rawEq}": ${latexError.message}`);
       }
   
       let equationStr = preprocessEquation(convertedInput);
       let plotData = null;
       let parseError = null;
   
       try {
            // Check for keywords first (Parametric, Polar, Implicit)
            // Use explicit keywords to avoid ambiguity
           if (equationStr.toLowerCase().startsWith('parametric:')) {
               const definition = equationStr.substring('parametric:'.length).trim();
               const parts = definition.split(',');
               let xFn = null, yFn = null;
               parts.forEach(part => {
                   const eqParts = part.split('=');
                   if (eqParts.length === 2) {
                       const variable = eqParts[0].trim().toLowerCase();
                       const expression = eqParts[1].trim();
                       if (variable === 'x') xFn = expression;
                       else if (variable === 'y') yFn = expression;
                   }
               });
                if (!xFn || !yFn) throw new Error("Parametric format error. Use 'parametric: x=f(t), y=g(t)'.");
                // Test parse
                math.compile(xFn).evaluate({t: 1});
                math.compile(yFn).evaluate({t: 1});
                plotData = { fnType: 'parametric', x: xFn, y: yFn, graphType: 'polyline' };
   
           } 
           else if (equationStr.toLowerCase().startsWith('polar:')) {
                const definition = equationStr.substring('polar:'.length).trim();
                if (!definition.toLowerCase().startsWith('r=')) throw new Error("Polar format error. Use 'polar: r = f(theta)'.");
                const rFn = definition.substring(definition.indexOf('=') + 1).trim();
                // Test parse
                math.compile(rFn).evaluate({theta: 1});
                plotData = { fnType: 'polar', r: rFn, graphType: 'polyline' };
   
           }
            else if (equationStr.toLowerCase().startsWith('implicit:')) {
                const definition = equationStr.substring('implicit:'.length).trim();
                const parts = definition.split('=').map(p => p.trim());
                let implicitFn;
                if (parts.length === 2) {
                    implicitFn = `(${parts[0]}) - (${parts[1]})`; // f(x,y) = g(x,y) -> f-g=0
                } else if (parts.length === 1) {
                    implicitFn = parts[0]; // Assume f(x,y) = 0
                } else {
                     throw new Error("Implicit format error. Use 'implicit: f(x,y) = g(x,y)' or 'implicit: f(x,y)'.");
                }
                // Test parse
                math.compile(implicitFn).evaluate({x: 1, y: 1});
                plotData = { fnType: 'implicit', fn: implicitFn };
   
           }
            else if (equationStr.includes('=')) {
                const parts = equationStr.split('=').map(part => part.trim());
               if (parts.length === 2) {
                   let lhs = parts[0]; let rhs = parts[1];
                   // Basic y = f(x)
                   if (lhs.toLowerCase() === 'y' && !/\by\b/i.test(rhs)) { // Check rhs doesn't contain y
                        math.compile(rhs).evaluate({x: 1}); // Test parse
                        plotData = { fn: rhs, graphType: 'polyline' };
                   }
                   // Basic x = f(y) -> treat as implicit x - f(y) = 0
                   else if (lhs.toLowerCase() === 'x' && !/\bx\b/i.test(rhs)) { // Check rhs doesn't contain x
                        const implicitFn = `x - (${rhs})`;
                        math.compile(implicitFn).evaluate({x: 1, y: 1}); // Test parse
                        plotData = { fnType: 'implicit', fn: implicitFn };
                   }
                   // General implicit: f(x,y) = g(x,y) -> f - g = 0
                   else {
                        const implicitFn = `(${lhs}) - (${rhs})`;
                        math.compile(implicitFn).evaluate({x: 1, y: 1}); // Test parse
                        plotData = { fnType: 'implicit', fn: implicitFn };
                   }
               } else { throw new Error("Invalid equation format. Expected 'LHS = RHS'."); }
           } 
           else {
            const containsX = /\bx\b/i.test(equationStr);
            const containsY = /\by\b/i.test(equationStr);

            if (containsX && containsY) {
                // **** ASSUME IMPLICIT f(x,y) = 0 ****
                // Test parse syntax by compiling with dummy values
                math.compile(equationStr).evaluate({x: 1, y: 1});
                // If syntax is ok, set up for functionPlot
                console.log(`Interpreting "${rawEq}" as implicit function = 0`); // Optional log
                plotData = { fnType: 'implicit', fn: equationStr };

            } else if (containsX) {
                // Assume y = f(x) if only x is present
                math.compile(equationStr).evaluate({x: 1}); // Test parse syntax
                plotData = { fn: equationStr, graphType: 'polyline' };

            } else {
                // Contains only y, constants, or nothing understandable as a plot
                 throw new Error("Ambiguous input. Provide a function of x (e.g., 'sin(x)'), or an equation with '=' (e.g., 'y=x^2', 'x^2+y^2=1').");
            }

        
        
        }
   
       } catch(error) {
           console.error(`Parsing Error for "${rawEq}" (processed as "${equationStr}"):`, error);
           parseError = `Error processing "${rawEq}": ${error.message}`;
           if (conversionError) { parseError += ` ${conversionError}`; }
           plotData = null;
       }
   
       return { data: plotData, error: parseError };
   }
   

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
            canvas.id = "1010101001101010101010101001"

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

    runCode();

    const toggleFullscreenBtn = document.getElementById('toggleFullscreen');
    const body = document.body;
    let isFullscreen = false;

    toggleFullscreenBtn.addEventListener('click', function() {
        isFullscreen = !isFullscreen;

        if (isFullscreen) {
            // Change to fullscreen mode
            body.classList.add('fullscreen-mode');
            toggleFullscreenBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 14h6m0 0v6m0-6l-7 7m17-11h-6m0 0V4m0 6l7-7"></path>
                </svg>
                Exit
            `;

            // Find all canvas elements in the preview area and resize them
            const canvases = document.querySelectorAll('.html-viewer canvas');
            canvases.forEach(canvas => {
                // Save original dimensions as attributes if not already saved
                if (!canvas.hasAttribute('data-original-width')) {
                    canvas.setAttribute('data-original-width', canvas.width);
                    canvas.setAttribute('data-original-height', canvas.height);
                }

                canvas.style.maxWidth = 'none';
                const aspectRatio = canvas.width / canvas.height;
                canvas.style.display = 'block';
                canvas.style.margin = '0 auto';

                const resizeCanvas = () => {
                    const viewportHeight = window.innerHeight - 45; // Adjust for header height
                    const viewportWidth = window.innerWidth;

                    if (aspectRatio > viewportWidth / viewportHeight) {
                        // Width limited by viewport width
                        canvas.style.width = '100%';
                        canvas.style.height = 'auto';
                    } else {
                        // Height limited by viewport height
                        canvas.style.width = 'auto';
                        canvas.style.height = (viewportHeight) + 'px';
                    }
                };

                // Initial resize
                resizeCanvas();

                // Add resize event listener
                window.addEventListener('resize', resizeCanvas);
            });
        } else {
            // Restore normal mode
            body.classList.remove('fullscreen-mode');
            toggleFullscreenBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
                Fullscreen
            `;

            // Restore original dimensions for all canvases
            const canvases = document.querySelectorAll('.html-viewer canvas');
            canvases.forEach(canvas => {
                if (canvas.hasAttribute('data-original-width') && canvas.hasAttribute('data-original-height')) {
                    // Reset to original dimensions
                    canvas.style.width = '';
                    canvas.style.height = '';
                    canvas.style.maxWidth = '100%';
                }

                // Remove resize listener
                window.removeEventListener('resize', () => {});
            });
        }

        trackingData.fullscreenToggles++;

    });
});