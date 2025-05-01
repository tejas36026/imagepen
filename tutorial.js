let tutorialActive = false;
let currentTutorialStep = 0;
let tutorialSteps = [];
let highlightedElement = null;
let highlightOverlay = null;
let tutorialTooltip = null;
let tutorialControls = null;
let videoElement = null;
let videoModal = null;
let selectionListenerActive = false; // Flag to track if the selection listener is active
let currentSelectionListener = null; // Store the listener function for removal

document.addEventListener('DOMContentLoaded', function() {
    // Create tutorial UI elements
    createTutorialUI();

    // Create video modal
    createVideoModal();

    // Add tutorial button to the hamburger menu
    addTutorialButton();

    // Setup mouse event handlers (can be simplified if interactive steps are reduced)
    // setupMouseInteractivity(); // Consider if complex interactivity is needed now
});

function createTutorialUI() {
    // Create overlay element for highlighting effect (covers everything except highlight)
    highlightOverlay = document.createElement('div');
    highlightOverlay.className = 'tutorial-highlight-overlay'; // Use a distinct class
    highlightOverlay.style.display = 'none';
    document.body.appendChild(highlightOverlay);

    // Tooltip element remains the same
    tutorialTooltip = document.createElement('div');
    tutorialTooltip.className = 'tutorial-tooltip';
    tutorialTooltip.style.display = 'none';
    document.body.appendChild(tutorialTooltip);

    // Controls element remains the same
    tutorialControls = document.createElement('div');
    tutorialControls.className = 'tutorial-controls';
    tutorialControls.innerHTML = `
        <button id="tutorialPrev" class="tutorial-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Previous
        </button>
        <div class="tutorial-progress">
            <span id="tutorialCurrentStep">0</span>/<span id="tutorialTotalSteps">0</span>
        </div>
        <button id="tutorialNext" class="tutorial-btn">
            Next
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
        </button>
        <button id="tutorialClose" class="tutorial-btn tutorial-close-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;
    tutorialControls.style.display = 'none';
    document.body.appendChild(tutorialControls);

    // Add CSS for tutorial components
    const style = document.createElement('style');
    style.textContent = `
        /* Style for the overlay that dims the background */
        .tutorial-highlight-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.7); /* Dimming effect */
            z-index: 1000;
            pointer-events: none; /* Allows clicks to pass through initially */
        }

        /* Style for the highlighted area (cutout effect) */
        .tutorial-highlight {
            position: absolute;
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7); /* Creates the cutout */
            border-radius: 4px;
            z-index: 1001; /* Above the overlay */
            pointer-events: auto; /* Allow interaction if needed */
            transition: all 0.3s ease-in-out;
            /* border: 2px solid #7e57c2; Optional: add a border */
        }

        /* --- Tooltip, Controls, Video Modal CSS (Keep existing styles, ensure they work) --- */
         .tutorial-tooltip {
            position: absolute;
            background: #2a2a2a;
            color: #fff;
            padding: 15px;
            border-radius: 6px;
            max-width: 300px; /* Adjusted from original min-width */
            min-width: 250px; /* Added minimum */
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 1002;
            transition: all 0.3s ease-in-out;
            animation: tooltipEntry 0.3s ease-out;
            font-size: 14px; /* Base font size */
        }

        .tutorial-tooltip:after {
            content: '';
            position: absolute;
            width: 0;
            height: 0;
            border: 8px solid transparent;
        }

        .tutorial-tooltip.top:after {
            border-top-color: #2a2a2a;
            top: 100%; left: 50%; margin-left: -8px;
        }
        .tutorial-tooltip.bottom:after {
            border-bottom-color: #2a2a2a;
            bottom: 100%; left: 50%; margin-left: -8px;
        }
        .tutorial-tooltip.left:after {
            border-left-color: #2a2a2a;
            left: 100%; top: 50%; margin-top: -8px;
        }
        .tutorial-tooltip.right:after {
            border-right-color: #2a2a2a;
            right: 100%; top: 50%; margin-top: -8px;
        }
        /* Specific Positions */
         .tutorial-tooltip.bottom.left-align { transform: translateX(-15%); }
         .tutorial-tooltip.bottom.left-align:after { left: 15%; }
         .tutorial-tooltip.bottom.right-align { transform: translateX(-85%); }
         .tutorial-tooltip.bottom.right-align:after { left: 85%; }

         .tutorial-tooltip.top.left-align { transform: translateX(-15%); }
         .tutorial-tooltip.top.left-align:after { left: 15%; }
         .tutorial-tooltip.top.right-align { transform: translateX(-85%); }
         .tutorial-tooltip.top.right-align:after { left: 85%; }

         .tutorial-tooltip.right.top-align { transform: translateY(-15%); }
         .tutorial-tooltip.right.top-align:after { top: 15%; }
         .tutorial-tooltip.right.bottom-align { transform: translateY(-85%); }
         .tutorial-tooltip.right.bottom-align:after { top: 85%; }

         .tutorial-tooltip.left.top-align { transform: translateY(-15%); }
         .tutorial-tooltip.left.top-align:after { top: 15%; }
         .tutorial-tooltip.left.bottom-align { transform: translateY(-85%); }
         .tutorial-tooltip.left.bottom-align:after { top: 85%; }


        .tutorial-tooltip h3 {
            margin-top: 0; margin-bottom: 10px; font-size: 16px; color: #7e57c2;
        }
        .tutorial-tooltip p {
            margin: 0; font-size: 14px; line-height: 1.5;
        }

        .tutorial-controls {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            background: #2a2a2a;
            border-radius: 8px;
            padding: 10px 15px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 1003;
            min-width: 300px; /* Adjusted minimum */
            flex-wrap: nowrap; /* Prevent wrapping by default */
        }
        @media (max-width: 450px) {
             .tutorial-controls { flex-wrap: wrap; justify-content: center; }
             .tutorial-progress { width: 100%; text-align: center; margin: 5px 0; }
        }


        .tutorial-btn {
            display: flex; align-items: center; background: #7e57c2; color: white;
            border: none; border-radius: 4px; padding: 8px 12px; font-size: 14px;
            cursor: pointer; transition: background 0.2s; margin: 0 5px; white-space: nowrap;
        }
        .tutorial-btn:hover { background: #6a3fba; }
        .tutorial-btn:disabled { background: #555; cursor: not-allowed; }
        .tutorial-btn svg { margin: 0 5px; }

        .tutorial-progress { margin: 0 15px; font-size: 14px; color: #ccc; }

        .tutorial-close-btn { background: #444; margin-left: 15px; }
        .tutorial-close-btn:hover { background: #666; }

        .tutorial-video-btn {
            display: inline-flex; align-items: center; background: #e44d26; color: white;
            border: none; border-radius: 4px; padding: 6px 10px; font-size: 13px;
            cursor: pointer; margin-top: 10px; transition: background 0.2s;
        }
        .tutorial-video-btn:hover { background: #f05a34; }
        .tutorial-video-btn svg { margin-right: 5px; }

        /* Hamburger Menu Tutorial Button Style */
        .tutorial-menu-btn { /* Copied from index.html styles */
            width: 100%; text-align: left; padding: 10px 15px; border-radius: 4px;
            background: transparent; border: none; display: flex; align-items: center;
            gap: 10px; font-size: 14px; transition: all 0.2s ease;
            color: var(--text-primary, #f6f6f6); cursor: pointer;
        }
        .tutorial-menu-btn:hover { background-color: var(--border-bg, #253351); }
        .tutorial-menu-btn svg { flex-shrink: 0; fill: var(--text-primary, #f6f6f6); }


        /* Video Modal Styles */
        .video-modal {
            display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.8); z-index: 2000; justify-content: center; align-items: center;
        }
        .video-modal-content {
            position: relative; width: 80%; max-width: 800px; background: #232323;
            border-radius: 8px; overflow: hidden;
        }
        .video-container { position: relative; width: 100%; padding-top: 56.25%; /* 16:9 */ }
        .video-container video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
        .video-modal-header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 10px 15px; background: #1a1a1a;
        }
        .video-modal-title { color: white; font-size: 16px; margin: 0; }
        .video-modal-close { background: none; border: none; color: white; font-size: 20px; cursor: pointer; }

        /* Animations */
        @keyframes tooltipEntry { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes highlightPulse {
            margin-top: -50px
            
            
            0%, 100% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7); } 50% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6); } }
        .tutorial-highlight.pulse { 
            margin-top: -50px
            
            animation: highlightPulse 2s infinite; }

        /* Interactive element highlight on hover (Optional, can simplify) */
        .tutorial-interactive-target {
             /* Add a subtle effect to the target element itself if needed */
             /* Example: outline: 2px dashed #7e57c2; */
             cursor: pointer; /* Indicate clickability */
        }
        /* Style for JS editor when in editable step */
        .tutorial-code-edit-mode {
            outline: 2px solid #7e57c2 !important;
            box-shadow: 0 0 8px rgba(126, 87, 194, 0.5) !important;
            background: rgba(126, 87, 194, 0.1) !important;
            cursor: text !important;
        }

    `;
    document.head.appendChild(style);

    // Event listeners for tutorial controls
    document.getElementById('tutorialPrev').addEventListener('click', showPreviousTutorialStep);
    document.getElementById('tutorialNext').addEventListener('click', showNextTutorialStep);
    document.getElementById('tutorialClose').addEventListener('click', endTutorial);
}

function createVideoModal() {
    // Create video modal (Mostly unchanged, ensure IDs match)
    videoModal = document.createElement('div');
    videoModal.className = 'video-modal';
    videoModal.innerHTML = `
        <div class="video-modal-content">
            <div class="video-modal-header">
                <h3 class="video-modal-title">Tutorial Video</h3>
                <button class="video-modal-close" id="closeVideoBtn">×</button>
            </div>
            <div class="video-container">
                <video controls id="tutorialVideo" style="background-color: black;">
                    <source src="https://cdn.glitch.global/bed4b085-2a8a-4e39-93c7-8f065ab89cc2/abc.mp4?v=1743223795052" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>
        </div>
    `;
    document.body.appendChild(videoModal);

    videoElement = document.getElementById('tutorialVideo');

    document.getElementById('closeVideoBtn').addEventListener('click', closeVideoModal);
    videoModal.addEventListener('click', (e) => {
        if (e.target === videoModal) {
            closeVideoModal();
        }
    });
}

function closeVideoModal() {
     videoModal.style.display = 'none';
     if (videoElement) {
         videoElement.pause();
         videoElement.src = ''; // Clear source to stop potential background loading
     }
}


function addTutorialButton() {
    // Remove existing button just in case
    const existingBtn = document.getElementById('tutorialMenuButton');
    if (existingBtn) existingBtn.remove();

    const tutorialButton = document.createElement('button');
    tutorialButton.id = 'tutorialMenuButton';
    tutorialButton.className = 'tutorial-menu-btn'; // Use the class from index.html CSS
    tutorialButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        Start Tutorial
    `;

    const hamburgerDropdown = document.getElementById('hamburgerDropdown');
    if (hamburgerDropdown) {
        // Insert it after the credits container for better ordering, or as first child if preferred
        const creditsDiv = hamburgerDropdown.querySelector('.credit-container');
        if (creditsDiv && creditsDiv.nextSibling) {
             hamburgerDropdown.insertBefore(tutorialButton, creditsDiv.nextSibling);
        } else {
             hamburgerDropdown.appendChild(tutorialButton); // Fallback if structure changes
        }
       
        tutorialButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent dropdown from closing immediately
            // Close the hamburger dropdown first
            if (hamburgerDropdown.classList.contains('show')) {
                hamburgerDropdown.classList.remove('show');
            }
            startTutorial();
        });
    } else {
        console.error("Hamburger dropdown not found. Cannot add tutorial button.");
        // Fallback: Add to header actions if dropdown fails?
         const headerActions = document.querySelector('.header .actions');
         if (headerActions) {
             headerActions.appendChild(tutorialButton);
             tutorialButton.addEventListener('click', startTutorial);
         }
    }
}

// Simplified interactivity setup - only handles clicks on specific elements if needed
// function setupMouseInteractivity() {
//     document.addEventListener('click', function(e) {
//         if (!tutorialActive) return;

//         const currentStepData = tutorialSteps[currentTutorialStep];
//         if (!currentStepData || !currentStepData.interactive) return;

//         const targetElement = document.querySelector(currentStepData.element);
//         if (targetElement && targetElement.contains(e.target)) {
//             // Check if a specific action is required by this click
//             if (currentStepData.actionRequired) {
//                 // Potentially add custom logic here based on step index or a custom action property
//                 console.log(`Interactive element clicked for step ${currentTutorialStep}`);
//                 // Example: if (currentStepData.customAction === 'openDropdown') { ... }

//                 // Automatically advance to the next step after interaction
//                 showNextTutorialStep();
//             }
//         }
//     }, true); // Use capture phase to potentially intercept clicks
// }

// Removed handleTutorialAction as we simplify interactivity for now.
// Removed workflow validation functions.

function startTutorial() {
    // Ensure hamburger is closed if open
    tutorialActive = true;
    currentTutorialStep = 0;

    const hamburgerDropdown = document.getElementById('hamburgerDropdown');
    if (hamburgerDropdown && hamburgerDropdown.classList.contains('show')) {
        hamburgerDropdown.classList.remove('show');
    }

    tutorialActive = true;
    currentTutorialStep = 0;

    // Define tutorial steps based on the NEW HTML structure
    tutorialSteps = [

        {
            element: '#jsLibraryBtn', // Target the JS library button
            title: 'JavaScript Libraries',
            content: 'Click this button to open the library selection dropdown. This is where you can add pre-built libraries to your project.',
            position: 'bottom left-align',
            pulse: true,
        },
  
        {
            element: '#jsEditor', // Highlight the editor where selection happens
            title: 'Quick Code Analysis',
            content: 'Try selecting some code (e.g., `function setup()`) in this JS editor. A tooltip will appear near your mouse, allowing you to quickly analyze the selected snippet with AI.',
            position: 'top', // Position tooltip relative to editor
            actionRequired: true,    // User needs to perform an action
            requiresSelection: true, // Custom flag for this specific type of action
            pulse: true              // Pulse the editor highlight
        },

        {
            element: '#refreshPreview', // Target the refresh button in viewer header
            title: 'Refresh Preview',
            content: 'Click this button to update the preview panel with your latest code changes.',
            position: 'bottom right-align',
            pulse: true
        },
    
 

         {
            element: '#imageUploadBtn', // Target the upload button in the header
            title: 'Upload Image',
            content: 'Click to upload an image for animation. You can also drag & drop or paste images onto the page.',
            position: 'bottom right-align'
        },

   
         {
            element: '#recordButton', // Target the record button
            title: 'Record Animation',
            content: 'Use this to capture your animation as a video or GIF sequence.',
            position: 'bottom'
        },
        {
            element: '#toggleFullscreen', // Target the fullscreen button
            title: 'Fullscreen Preview',
            content: 'Click to view the preview panel in fullscreen mode.',
            position: 'bottom'
        },

        // --- Optional Steps for Advanced Mode Elements ---

 
    ];

    // Update total steps counter
    document.getElementById('tutorialTotalSteps').textContent = tutorialSteps.length;

    // Show the first step
    showTutorialStep(currentTutorialStep);

    // Show tutorial UI
    highlightOverlay.style.display = 'block'; // Show the dimming overlay
    tutorialControls.style.display = 'flex';
    tutorialTooltip.style.display = 'block'; // Ensure tooltip is visible
}

function removeTutorialSelectionListener() {
    if (selectionListenerActive && currentSelectionListener) {
        const editor = document.getElementById('jsEditor');
        if (editor) {
            editor.removeEventListener('mouseup', currentSelectionListener);
        }
        selectionListenerActive = false;
        currentSelectionListener = null;
        console.log("Tutorial selection listener removed.");
    }
}

function showTutorialStep(stepIndex) {
    removeTutorialSelectionListener(); // IMPORTANT: Call this at the start

    if (!tutorialActive || stepIndex < 0 || stepIndex >= tutorialSteps.length) {
        if (tutorialActive) endTutorial(); // End only if it was active
        return;
    }

    const step = tutorialSteps[stepIndex];

    // Execute pre-action if defined (e.g., open dropdown)
    if (step.preAction && typeof step.preAction === 'function') {
       try {
            step.preAction();
       } catch (e) {
           console.error("Error executing preAction for step:", stepIndex, e);
       }
    }

    // Update step counter
    document.getElementById('tutorialCurrentStep').textContent = stepIndex + 1;

    // Clear previous highlight and interactive classes
    if (highlightedElement) {
        highlightedElement.remove();
        highlightedElement = null;
    }
    document.querySelectorAll('.tutorial-interactive-target').forEach(el => {
        el.classList.remove('tutorial-interactive-target');
        // Optionally remove specific event listeners added for interactivity if any
    });
     document.querySelectorAll('.tutorial-code-edit-mode').forEach(el => {
        el.classList.remove('tutorial-code-edit-mode');
        el.removeAttribute('contenteditable');
    });


    const targetElement = step.element === 'body' ? document.body : document.querySelector(step.element);

    if (!targetElement) {
        console.warn(`Tutorial step ${stepIndex}: Element "${step.element}" not found. Skipping highlight.`);
        // Position tooltip centrally or skip step?
         tutorialTooltip.style.top = '50%';
         tutorialTooltip.style.left = '50%';
         tutorialTooltip.style.transform = 'translate(-50%, -50%)';
         tutorialTooltip.className = 'tutorial-tooltip'; // Reset position class
    } else {
        // Ensure target element is visible (basic check)
        // This might need refinement for complex cases (e.g., inside scrolled containers)
        if (targetElement !== document.body && targetElement.offsetParent === null) {
            console.warn(`Tutorial step ${stepIndex}: Element "${step.element}" is not visible (maybe hidden by CSS or parent). Trying to show anyway.`);
            // Attempt to make it visible - this is risky and depends on how it's hidden
            // Example: targetElement.style.display = 'block'; // Or flex, etc.
        }


        const rect = targetElement.getBoundingClientRect();

        // Create highlight element (the cutout)
        highlightedElement = document.createElement('div');
        highlightedElement.className = 'tutorial-highlight';
        if (step.pulse) {
            highlightedElement.classList.add('pulse');
        }
        // highlightedElement.style.cssText = "margin-top: 0px !important; position: fixed;";

        // Position the highlight cutout
        highlightedElement.style.position = 'fixed'; // Use fixed position relative to viewport
        highlightedElement.style.left = `${rect.left}px`;
        highlightedElement.style.top = `${rect.top}px`;
        highlightedElement.style.width = `${rect.width}px`;
        highlightedElement.style.height = `${rect.height}px`;

        // Add highlight element to the body (it will sit above the overlay)
        document.body.appendChild(highlightedElement);
        if (step.requiresSelection) {
            highlightedElement.style.pointerEvents = 'none';
        } else {
            // Keep the default ('auto') for steps where the highlight might be the interactive part,
            // or if you need hover effects on the highlight border (though you don't seem to have those).
            // If no steps need the highlight itself to be interactive, you could potentially
            // set pointer-events: none in the main CSS for .tutorial-highlight.
            highlightedElement.style.pointerEvents = 'auto'; // Explicitly set default
        }

        document.body.appendChild(highlightedElement);

        // Add interactive class to the *actual* target element if needed
        if (step.interactive) {
            targetElement.classList.add('tutorial-interactive-target');
             // Add specific event listeners here if simple class hover isn't enough
        }
         // Special handling for code editor step
        if (step.codeEditable && targetElement.tagName === 'TEXTAREA') {
            targetElement.classList.add('tutorial-code-edit-mode');
            targetElement.setAttribute('contenteditable', 'true'); // Make textarea visually editable if needed
             // Consider focusing the editor: targetElement.focus();
        }


        // Position the tooltip based on element and specified position
        positionTooltip(targetElement, step.position);
    }

    // Update tooltip content
    let tooltipContent = `<h3>${step.title}</h3><p>${step.content}</p>`;
    if (step.showVideo && step.video) {
        tooltipContent += `
            <button class="tutorial-video-btn" data-video-section="${step.video}">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
                Watch Video
            </button>
        `;
    }
    tutorialTooltip.innerHTML = tooltipContent;

     // Add click listener for video buttons inside the tooltip AFTER innerHTML is set
     tutorialTooltip.querySelectorAll('.tutorial-video-btn').forEach(button => {
         button.removeEventListener('click', handleVideoBtnClick); // Remove previous listener
         button.addEventListener('click', handleVideoBtnClick);
     });


    // Update button states
    document.getElementById('tutorialPrev').disabled = stepIndex === 0;
    document.getElementById('tutorialNext').disabled = false; // Re-enable next button
    document.getElementById('tutorialNext').innerHTML = stepIndex === tutorialSteps.length - 1
        ? 'Finish <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        : 'Next <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';


    // If action required, disable 'Next' until interaction occurs (simplified approach)
    // This needs more robust implementation if interaction isn't just clicking the element
     // --- Specific logic for `actionRequired` steps ---
     if (step.actionRequired) {
        const nextButton = document.getElementById('tutorialNext');
        nextButton.disabled = true; // Ensure it's disabled

        if (step.requiresSelection && targetElement && targetElement.id === 'jsEditor') {
            console.log(`Tutorial Step ${stepIndex}: Setting up listener for text selection in #jsEditor.`);
             // Define the listener function *within this scope* to capture stepIndex correctly
             currentSelectionListener = (event) => {
                 // Double check we are still on the correct step and tutorial is active
                 if (!tutorialActive || currentTutorialStep !== stepIndex) {
                    console.log("Selection event fired, but tutorial state changed. Ignoring.");
                    removeTutorialSelectionListener(); // Clean up listener if state is wrong
                    return;
                }

                 const selection = window.getSelection();
                 const selectedText = selection.toString().trim();
                const tooltip = document.querySelector('.enhanced-selection-tooltip'); // Correct selector?

                if (selectedText && tooltip && tooltip.style.display === 'block') {
                    console.log(`Tutorial Step ${stepIndex}: Text selected ("${selectedText.substring(0, 20)}...") and tooltip visible. Enabling Next.`);
                    nextButton.disabled = false;
                    // IMPORTANT: Remove the listener *after* it has successfully triggered
                    removeTutorialSelectionListener();
                } else {
                     // Log why it didn't trigger (e.g., no text, tooltip not visible)
                     console.log(`Tutorial Step ${stepIndex}: Mouseup detected, but conditions not met (Selected: "${selectedText.substring(0, 10)}...", Tooltip found: ${!!tooltip}, Tooltip visible: ${tooltip && tooltip.style.display === 'block'})`);
                }
             };

             targetElement.addEventListener('mouseup', currentSelectionListener);             selectionListenerActive = true; // Set the flag
             selectionListenerActive = true; // Set the flag

        } 
        else if (targetElement) { // Handle standard clickable actions
            // Add a listener to the target element or document to re-enable 'Next'
             const enableNextOnClick = (event) => {
                 // Check if the click was on or inside the target element
                 if (targetElement.contains(event.target)) {
                    if(tutorialActive && currentTutorialStep === stepIndex) {
                       nextButton.disabled = false;
                       targetElement.removeEventListener('click', enableNextOnClick, true); // Clean up THIS listener
                       console.log(`Tutorial Step ${stepIndex}: Click detected on target. Enabling Next.`);
                    }
                 }
             };
             // Use capture phase to potentially catch clicks even if prevented by other scripts
             targetElement.addEventListener('click', enableNextOnClick, { capture: true, once: true });
             console.log(`Tutorial Step ${stepIndex}: Set up click listener for target element.`);

             // If it's an input field, maybe listen for input event as well/instead
             if (targetElement?.tagName === 'INPUT' || targetElement?.tagName === 'TEXTAREA') {
                  const enableNextOnInput = () => {
                       if(tutorialActive && currentTutorialStep === stepIndex) {
                           nextButton.disabled = false;
                           targetElement.removeEventListener('input', enableNextOnInput, true); // Clean up THIS listener
                           console.log(`Tutorial Step ${stepIndex}: Input detected on target. Enabling Next.`);
                       }
                  };
                  targetElement.addEventListener('input', enableNextOnInput, { capture: true, once: true });
                  console.log(`Tutorial Step ${stepIndex}: Set up input listener for target element.`);
             }
        }
    }
    if (step.postAction && typeof step.postAction === 'function') {
        try {
            step.postAction();
        } catch (e) {
            console.error("Error executing postAction for step:", stepIndex, e);
        }
    }
}

function handleVideoBtnClick(event) {
    const videoSection = event.currentTarget.getAttribute('data-video-section');
    if (videoSection) {
        playTutorialVideo(videoSection);
    }
}

function positionTooltip(targetElement, position = 'bottom') {
    if (!targetElement || targetElement === document.body || position === 'center') {
        top += 50; // Compensate for the -50px margin

      
        tutorialTooltip.style.top = '50%';
        tutorialTooltip.style.left = '50%';
        tutorialTooltip.style.transform = 'translate(-50%, -50%)';
        tutorialTooltip.className = 'tutorial-tooltip'; // Reset class
        return;
    }

    const rect = targetElement.getBoundingClientRect();
    const tooltipRect = tutorialTooltip.getBoundingClientRect(); // Get tooltip size
    const margin = 15; // Space between element and tooltip

    let top, left;
    let transform = '';
    let positionClass = position.split(' ')[0]; // e.g., 'top', 'bottom'
    let alignmentClass = position.split(' ')[1] || ''; // e.g., 'left-align'

    switch (positionClass) {
        case 'top':
            top = rect.top - tooltipRect.height - margin;
            left = rect.left + rect.width / 2;
            transform = 'translateX(-50%)';
             if(alignmentClass === 'left-align') { transform = 'translateX(-15%)'; }
             if(alignmentClass === 'right-align') { transform = 'translateX(-85%)'; }
            break;
        case 'bottom':
            top = rect.bottom + margin;
            left = rect.left + rect.width / 2;
            transform = 'translateX(-50%)';
             if(alignmentClass === 'left-align') { transform = 'translateX(-15%)'; }
             if(alignmentClass === 'right-align') { transform = 'translateX(-85%)'; }
            break;
        case 'left':
            left = rect.left - tooltipRect.width - margin;
            top = rect.top + rect.height / 2;
            transform = 'translateY(-50%)';
             if(alignmentClass === 'top-align') { transform = 'translateY(-15%)'; }
             if(alignmentClass === 'bottom-align') { transform = 'translateY(-85%)'; }
            break;
        case 'right':
            left = rect.right + margin;
            top = rect.top + rect.height / 2;
            transform = 'translateY(-50%)';
             if(alignmentClass === 'top-align') { transform = 'translateY(-15%)'; }
             if(alignmentClass === 'bottom-align') { transform = 'translateY(-85%)'; }
            break;
        default: // Fallback to bottom center
            positionClass = 'bottom';
            top = rect.bottom + margin;
            left = rect.left + rect.width / 2;
            transform = 'translateX(-50%)';
    }

     // Adjust if tooltip goes off-screen
     const vw = window.innerWidth;
     const vh = window.innerHeight;

     // Check right boundary
     if (left + tooltipRect.width > vw - margin) {
         left = vw - tooltipRect.width - margin;
          if (positionClass === 'top' || positionClass === 'bottom') transform = ''; // Reset transform if adjusted horizontally
     }
     // Check left boundary
     if (left < margin) {
         left = margin;
         if (positionClass === 'top' || positionClass === 'bottom') transform = ''; // Reset transform
     }
     // Check bottom boundary
      if (top + tooltipRect.height > vh - margin) {
         top = vh - tooltipRect.height - margin;
          if (positionClass === 'left' || positionClass === 'right') transform = ''; // Reset transform if adjusted vertically
          // If adjusting vertical pushes it off top, maybe switch side? Complex.
      }
     // Check top boundary
     if (top < margin) {
         top = margin;
         if (positionClass === 'left' || positionClass === 'right') transform = ''; // Reset transform
     }


    tutorialTooltip.style.top = `${top}px`;
    tutorialTooltip.style.left = `${left}px`;
    tutorialTooltip.style.transform = transform;
    tutorialTooltip.style.right = 'auto'; // Ensure these are reset
    tutorialTooltip.style.bottom = 'auto';
    tutorialTooltip.className = `tutorial-tooltip ${positionClass} ${alignmentClass}`.trim(); // Add classes for arrow direction
}

function showNextTutorialStep() {
    if (!tutorialActive) return;
    // Clean up listener *before* incrementing step
    removeTutorialSelectionListener();
    currentTutorialStep++;
    if (currentTutorialStep >= tutorialSteps.length) {
        endTutorial(); // endTutorial also calls remove listener
    } else {
        showTutorialStep(currentTutorialStep);
    }
}

function showPreviousTutorialStep() {
     if (!tutorialActive) return;
     removeTutorialSelectionListener();

    currentTutorialStep--;
    if (currentTutorialStep < 0) {
        currentTutorialStep = 0; // Stay on first step
    }
    showTutorialStep(currentTutorialStep);
}

function endTutorial() {
    if (!tutorialActive) return; // Prevent multiple calls
    tutorialActive = false;
    removeTutorialSelectionListener();

    // Hide tutorial elements
    highlightOverlay.style.display = 'none';
    tutorialTooltip.style.display = 'none';
    tutorialControls.style.display = 'none';

    // Remove highlight and interactive classes
    if (highlightedElement) {
        highlightedElement.remove();
        highlightedElement = null;
    }
    document.querySelectorAll('.tutorial-interactive-target').forEach(el => {
        el.classList.remove('tutorial-interactive-target');
     });

     document.querySelectorAll('.tutorial-code-edit-mode').forEach(el => {
        el.classList.remove('tutorial-code-edit-mode');
        el.removeAttribute('contenteditable');
    });


    // Optional: Show completion message (e.g., in console or a small notification)
    console.log("Tutorial finished!");
   }

function playTutorialVideo(section) {
    // Map sections to actual video URLs (ensure these URLs are correct)
    let videoUrl = 'https://cdn.glitch.global/bed4b085-2a8a-4e39-93c7-8f065ab89cc2/abc.mp4?v=1743223795052'; // Default/Placeholder

    switch (section) {
        case 'intro':
            videoUrl = 'https://cdn.glitch.global/bed4b085-2a8a-4e39-93c7-8f065ab89cc2/intro_placeholder.mp4?v=...'; // Replace with actual URL
            break;
        case 'complete':
             videoUrl = 'https://cdn.glitch.global/bed4b085-2a8a-4e39-93c7-8f065ab89cc2/outro_placeholder.mp4?v=...'; // Replace with actual URL
            break;
        case 'full': // Example for a full tutorial video link
             videoUrl = 'https://cdn.glitch.global/bed4b085-2a8a-4e39-93c7-8f065ab89cc2/full_tutorial_placeholder.mp4?v=...'; // Replace with actual URL
            break;
        // Add cases for specific feature videos if needed
        // case 'ai-generate': videoUrl = '...'; break;
    }
    // Use placeholder if actual URL isn't set for the section
     const placeholderUrl = 'https://cdn.glitch.global/bed4b085-2a8a-4e39-93c7-8f065ab89cc2/abc.mp4?v=1743223795052';
     if (!videoUrl || videoUrl.includes('placeholder')) {
         console.warn(`Video section "${section}" not found or using placeholder. Playing default video.`);
         videoUrl = placeholderUrl;
     }


    if (videoElement) {
        videoElement.src = videoUrl;
        videoModal.style.display = 'flex';
        videoElement.load(); // Ensure the new source is loaded
        videoElement.play().catch(e => console.error("Video play failed:", e));
    } else {
        console.error("Video element not found.");
    }
}

// --- Event Handlers ---

// Keyboard navigation
function handleTutorialKeydown(e) {
    if (!tutorialActive) return;

    if (e.key === 'Escape') {
        endTutorial();
    } else if (e.key === 'ArrowRight') {
        // Check if next button is disabled (e.g., action required)
        if (!document.getElementById('tutorialNext').disabled) {
             showNextTutorialStep();
        }
    } else if (e.key === 'ArrowLeft') {
         // Check if prev button is disabled
         if (!document.getElementById('tutorialPrev').disabled) {
            showPreviousTutorialStep();
         }
    }
     // Prevent arrow keys from scrolling the page during tutorial
     if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
     }
}

// Resize handler
function handleTutorialResize() {
    if (!tutorialActive) return;
    // Just re-show the current step to reposition highlight and tooltip
    showTutorialStep(currentTutorialStep);
}

// Add global listeners when tutorial starts
function addGlobalListeners() {
    document.addEventListener('keydown', handleTutorialKeydown);
    window.addEventListener('resize', handleTutorialResize);
}

// --- Utility Functions ---

// Console output helper (modified slightly)
function logToConsole(message, type = 'info') {
    const jsOutput = document.getElementById('jsOutput');
    // Check if the console container is visible (part of the advanced view)
    const consoleVisible = jsOutput && window.getComputedStyle(jsOutput.parentElement).display !== 'none';

    if (!jsOutput) return;

    const typeClasses = {
        'info': { color: '#4f94ef', icon: 'info-circle' },
        'success': { color: '#4CAF50', icon: 'check-circle' },
        'warning': { color: '#ff9800', icon: 'alert-triangle' },
        'error': { color: '#f44336', icon: 'alert-circle' }
    };
    const style = typeClasses[type] || typeClasses.info;
    const iconSvg = { /* ... keep existing SVG paths ... */
        'info-circle': '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>',
        'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>', // Corrected check
        'alert-triangle': '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
        'alert-circle': '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'
    };

    const logEntry = document.createElement('div');
    logEntry.style.cssText = `margin-bottom: 8px; padding: 8px; border-radius: 4px; background: rgba(0,0,0,0.1); border-left: 4px solid ${style.color}; display: flex; align-items: flex-start;`;
    logEntry.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${style.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; margin-top: 2px; flex-shrink: 0;">
            ${iconSvg[style.icon]}
        </svg>
        <div>${message}</div>
    `;
    jsOutput.appendChild(logEntry);

    // Auto-scroll to bottom only if the console is likely visible
    if (consoleVisible) {
       jsOutput.scrollTop = jsOutput.scrollHeight;
    }

    // If console is hidden, maybe show a small notification?
    // Example: if (!consoleVisible && type === 'error') { showSmallNotification('Error logged in console'); }
}

// --- Auto-Start Logic (Optional) ---
function checkFirstTimeUser() {
    if (!localStorage.getItem('tutorialShown')) {
        setTimeout(() => {
            startTutorial();
            localStorage.setItem('tutorialShown', 'true');
        }, 1500); // Increased delay slightly
    }
}
// Uncomment to enable auto-start for first visit:
// checkFirstTimeUser();


// --- Export functions needed globally ---
window.startTutorial = startTutorial;
window.endTutorial = endTutorial;
// Ensure playTutorialVideo is accessible if called from outside (e.g., completion message button)
// window.playTutorialVideo = playTutorialVideo;
// Expose logToConsole if other scripts need it
// window.logToConsole = logToConsole;

// Add the global listeners when the script loads, but they only act when tutorialActive is true
addGlobalListeners();