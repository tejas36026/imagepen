// tutorial.js - Interactive Tutorial System for AI Code Editor

// Global variables for tutorial state
let tutorialActive = false;
let currentTutorialStep = 0;
let tutorialSteps = [];
let highlightedElement = null;
let tutorialOverlay = null;
let tutorialTooltip = null;
let tutorialControls = null;
let videoElement = null;
let videoModal = null;

// Initialize the tutorial system
document.addEventListener('DOMContentLoaded', function() {
    // Create tutorial UI elements
    createTutorialUI();
    
    // Create video modal
    createVideoModal();
    
    // Add tutorial button to the header
    addTutorialButton();
    
    // Setup mouse event handlers
    setupMouseInteractivity();
});

function createTutorialUI() {
    // Create overlay element for highlighting
    tutorialOverlay = document.createElement('div');
    tutorialOverlay.className = 'tutorial-overlay';
    tutorialOverlay.style.display = 'none';
    document.body.appendChild(tutorialOverlay);
    
    // Create tooltip element
    tutorialTooltip = document.createElement('div');
    tutorialTooltip.className = 'tutorial-tooltip';
    tutorialTooltip.style.display = 'none';
    document.body.appendChild(tutorialTooltip);
    
    // Create controls for navigation
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
        .tutorial-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            pointer-events: none;
        }
        

        /* JavaScript Editor Width */
.editor-column:nth-child(3) {
    flex: 1 0 35%; /* Minimum 35% width for JS editor */
    min-width: 400px;
}

/* Image Upload Container Height */
.image-upload-container {
    min-height: 150px;
    height: 25vh;
}

/* Preview Container Height */
.html-viewer-column {
    min-height: 300px;
    min-height: 50vh;
}

/* Full Screen Mode Adjustments */
body.fullscreen-mode .html-viewer {
    height: 100vh !important;
}

/* Console Output Container */
.js-viewer {
    min-height: 200px;
    height: 30vh;
    min-width: 300px;
}

/* Additional Settings Width */
.hamburger-dropdown {
    width: 350px !important;
    min-width: 300px;
}

/* Tutorial Containers */
.tutorial-tooltip {
    min-width: 320px;
    min-height: 120px;
}

.tutorial-controls {
    min-width: 500px;
}

/* Record Animation Container */
#processedImagesContainer {
    min-height: 180px;
    height: 25vh;
}

/* JS Libraries Dropdown */
.dropdown-menu {
    width: 400px;
    min-height: 300px;
}

/* Responsive Adjustments */
@media (max-width: 1200px) {
    .editor-column:nth-child(3) {
        min-width: 300px;
    }
    
    .tutorial-controls {
        min-width: 300px;
        flex-wrap: wrap;
    }
}

@media (max-width: 768px) {
    .editor-column {
        min-width: 100% !important;
        height: 40vh;
    }
    
    .viewers-container {
        height: 60vh;
    }
}

        .tutorial-highlight {
            position: absolute;
            box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.7);
            border-radius: 4px;
            z-index: 1001;
            pointer-events: none;
            transition: all 0.3s ease-in-out;
        }
        
        .tutorial-tooltip {
            position: absolute;
            background: #2a2a2a;
            color: #fff;
            padding: 15px;
            border-radius: 6px;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 1002;
            transition: all 0.3s ease-in-out;
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
            top: 100%;
            left: 50%;
            margin-left: -8px;
        }
        
        .tutorial-tooltip.bottom:after {
            border-bottom-color: #2a2a2a;
            bottom: 100%;
            left: 50%;
            margin-left: -8px;
        }
        
        .tutorial-tooltip.left:after {
            border-left-color: #2a2a2a;
            left: 100%;
            top: 50%;
            margin-top: -8px;
        }
        
        .tutorial-tooltip.right:after {
            border-right-color: #2a2a2a;
            right: 100%;
            top: 50%;
            margin-top: -8px;
        }
        
        .tutorial-tooltip h3 {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 16px;
            color: #7e57c2;
        }
        
        .tutorial-tooltip p {
            margin: 0;
            font-size: 14px;
            line-height: 1.5;
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
        }
        
        .tutorial-btn {
            display: flex;
            align-items: center;
            background: #7e57c2;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.2s;
            margin: 0 5px;
        }
        
        .tutorial-btn:hover {
            background: #6a3fba;
        }
        
        .tutorial-btn svg {
            margin: 0 5px;
        }
        
        .tutorial-progress {
            margin: 0 15px;
            font-size: 14px;
            color: #ccc;
        }
        
        .tutorial-close-btn {
            background: #444;
            margin-left: 15px;
        }
        
        .tutorial-close-btn:hover {
            background: #666;
        }
        
        .tutorial-video-btn {
            display: flex;
            align-items: center;
            background: #e44d26;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 6px 10px;
            font-size: 13px;
            cursor: pointer;
            margin-top: 10px;
            transition: background 0.2s;
        }
        
        .tutorial-video-btn:hover {
            background: #f05a34;
        }
        
        .tutorial-video-btn svg {
            margin-right: 5px;
        }
        
        .tutorial-button {
            display: flex;
            align-items: center;
            background: #7e57c2;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.2s;
            margin-right: 10px;
        }
        
        .tutorial-button:hover {
            background: #6a3fba;
        }
        
        .tutorial-button svg {
            margin-right: 5px;
        }
        
        .video-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            z-index: 2000;
            justify-content: center;
            align-items: center;
        }
        
        .video-modal-content {
            position: relative;
            width: 80%;
            max-width: 800px;
            background: #232323;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .video-container {
            position: relative;
            width: 100%;
            padding-top: 56.25%; /* 16:9 Aspect Ratio */
        }
        
        .video-container video {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        }
        
        .video-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            background: #1a1a1a;
        }
        
        .video-modal-title {
            color: white;
            font-size: 16px;
            margin: 0;
        }
        
        .video-modal-close {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
        }
        
        /* Animation for tooltip entry */
        @keyframes tooltipEntry {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        .tutorial-code-edit-mode {
            box-shadow: 0 0 0 2px #7e57c2 !important;
            background: rgba(126, 87, 194, 0.1) !important;
            cursor: text !important;
        }
        .tutorial-tooltip {
            animation: tooltipEntry 0.3s ease-out;
        }
        
        /* Pulse animation for highlight */
        @keyframes highlightPulse {
            0% {
                box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.7);
            }
            50% {
                box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.6);
            }
            100% {
                box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.7);
            }
        }
        
        .tutorial-highlight.pulse {
            animation: highlightPulse 2s infinite;
        }

        /* Interactive element highlight on hover */
        .tutorial-interactive {
            transition: all 0.2s;
            cursor: pointer;
        }
        
        .tutorial-interactive:hover {
            box-shadow: 0 0 0 2px #7e57c2;
        }
    `;
    document.head.appendChild(style);
    
    // Event listeners for tutorial controls
    document.getElementById('tutorialPrev').addEventListener('click', showPreviousTutorialStep);
    document.getElementById('tutorialNext').addEventListener('click', showNextTutorialStep);
    document.getElementById('tutorialClose').addEventListener('click', endTutorial);
}
let workflowState = {
    librarySelected: false,
    previewRefreshed: false,
    imageUploaded: false
};

function validateWorkflowProgress(action) {
    switch(action) {
        case 'library-selected':
            workflowState.librarySelected = true;
            break;
        case 'preview-refreshed':
            if (!workflowState.librarySelected) {
                alert('Please select a JS library first!');
                return false;
            }
            workflowState.previewRefreshed = true;
            break;
        case 'image-uploaded':
            if (!workflowState.previewRefreshed) {
                alert('Please refresh the preview after library selection first!');
                return false;
            }
            workflowState.imageUploaded = true;
            break;
    }
    return true;
}
function createVideoModal() {
    // Create video modal
    videoModal = document.createElement('div');
    videoModal.className = 'video-modal';
    videoModal.innerHTML = `
        <div class="video-modal-content">
            <div class="video-modal-header">
                <h3 class="video-modal-title">Tutorial Video</h3>
                <button class="video-modal-close" id="closeVideoBtn">×</button>
                <source src="https://cdn.glitch.global/bed4b085-2a8a-4e39-93c7-8f065ab89cc2/abc.mp4?v=1743223795052" type="video/mp4">

            </div>
            <div class="video-container">
                <video controls id="tutorialVideo">
                    <source src="https://cdn.glitch.global/bed4b085-2a8a-4e39-93c7-8f065ab89cc2/abc.mp4?v=1743223795052" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>
        </div>
    `;
    document.body.appendChild(videoModal);
    
    // Get video element for later use
    videoElement = document.getElementById('tutorialVideo');
    
    // Close button event
    document.getElementById('closeVideoBtn').addEventListener('click', function() {
        videoModal.style.display = 'none';
        if (videoElement) {
            videoElement.pause();
        }
    });
    
    // Close when clicking outside the video container
    videoModal.addEventListener('click', function(e) {
        if (e.target === videoModal) {
            videoModal.style.display = 'none';
            if (videoElement) {
                videoElement.pause();
            }
        }
    });
}

function addTutorialButton() {
    // Remove the existing tutorial button if present
    const existingBtn = document.getElementById('tutorialMenuButton');
    if (existingBtn) existingBtn.remove();

    // Create tutorial button
    const tutorialButton = document.createElement('button');
    tutorialButton.id = 'tutorialMenuButton';
    tutorialButton.className = 'tutorial-menu-btn';
    tutorialButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        Start Tutorial
    `;
    
    // Insert as first item in hamburger dropdown
    const hamburgerDropdown = document.getElementById('hamburgerDropdown');
    if (hamburgerDropdown) {
        hamburgerDropdown.insertBefore(tutorialButton, hamburgerDropdown.firstChild);
        tutorialButton.addEventListener('click', startTutorial);
    }
}

function setupMouseInteractivity() {
    // Add event delegators for interactive elements
    document.addEventListener('mouseover', function(e) {
        if (!tutorialActive) return;
        
        const target = e.target;
        if (target.classList.contains('tutorial-interactive')) {
            // Add visual feedback for hovering
            target.classList.add('tutorial-interactive-hover');
        }
    });
    
    document.addEventListener('mouseout', function(e) {
        const target = e.target;
        if (target.classList.contains('tutorial-interactive')) {
            // Remove hover effect
            target.classList.remove('tutorial-interactive-hover');
        }
    });
    
    document.addEventListener('click', function(e) {
        if (!tutorialActive) return;
        
        const target = e.target;
        if (target.classList.contains('tutorial-interactive')) {
            const action = target.getAttribute('data-tutorial-action');
            if (action) {
                handleTutorialAction(action, target);
            }
        }
    });
}

function handleTutorialAction(action, element) {
    switch (action) {
        case 'next-step':
            showNextTutorialStep();
            break;
        case 'prev-step':
            showPreviousTutorialStep();
            break;
        case 'play-video':
            const videoSection = element.getAttribute('data-video-section');
            playTutorialVideo(videoSection);
            break;
        case 'run-code':
            document.getElementById('refreshPreview').click();
            break;
        case 'close-tutorial':
            endTutorial();
            break;
        default:
            console.log('Unknown tutorial action:', action);
    }
}

function startTutorial() {
    tutorialActive = true;
    currentTutorialStep = 0;
    
    // Define tutorial steps - this is the main content of the tutorial
    tutorialSteps = [
    {
        element: '#jsLibraryBtn',
        title: 'Select JavaScript Library',
        content: 'First, choose a JavaScript library from the dropdown to enable animation capabilities.',
        position: 'bottom',
        interactive: true,
        actionRequired: true
    },
    {
        element: '#refreshPreview',
        title: 'Refresh Preview',
        content: 'After selecting a library, click here to initialize the animation system.',
        position: 'right',
        pulse: true,
        actionRequired: true
    },
  
    {
        element: '#jsEditor',
        title: 'Modify Animation Code',
        content: 'Edit the generated JavaScript code here. The animation will update automatically on save.',
        position: 'left',
        interactive: true,
        codeEditable: true
    },
    {
        element: '#jsOutput',
        title: 'Debugging Console',
        content: 'View errors and logs here if your animation isn\'t working as expected.',
        position: 'top',
        interactive: true
    },
        {
            element: '.logo',
            title: 'Welcome to AI Code Editor',
            content: 'This tutorial will guide you through the main features of our AI-powered code editor. Click Next to continue.',
            position: 'bottom right',
            video: 'intro',
            showVideo: true
        },
        {
            element: '.editor-column:nth-child(1)',
            title: 'HTML Editor',
            content: 'This is where you edit your HTML code. The editor provides real-time syntax checking and error highlighting.',
            position: 'right',
            interactive: true
        },
        {
            element: '.editor-column:nth-child(2)',
            title: 'CSS Editor',
            content: 'Style your HTML using CSS in this editor. Changes will be reflected in the preview immediately.',
            position: 'right',
            interactive: true
        },
        {
            element: '.editor-column:nth-child(3)',
            title: 'JavaScript Editor',
            content: 'Add interactivity to your page with JavaScript. This is where you\'ll create animation code for images.',
            position: 'bottom',
            interactive: true
        },
        {
            element: '#jsDeepseekBtn',
            title: 'AI Code Generation',
            content: 'Click this button to use AI to generate or improve your JavaScript code based on your current code and prompts.',
            position: 'bottom',
            pulse: true
        },
        {
            element: '#promptInput',
            title: 'AI Prompt',
            content: 'Enter a description of what you want the AI to do with your code. Be specific about the functionality you need.',
            position: 'bottom',
            interactive: true
        },
        {
            element: '#magicBtn',
            title: 'Generate Button',
            content: 'After entering your prompt, click this button to generate code based on your requirements.',
            position: 'bottom',
            pulse: true
        },
        {
            element: '#imageUploadBtn',
            title: 'Image Upload',
            content: 'Upload images to animate. You can also paste images directly or drag and drop them into the editor.',
            position: 'bottom'
        },
        {
            element: '.html-viewer',
            title: 'Preview Panel',
            content: 'See the result of your code in real-time. Your animations will appear here.',
            position: 'top',
            interactive: true
        },
        {
            element: '#refreshPreview',
            title: 'Refresh Preview',
            content: 'Click this button to manually refresh the preview with your latest code changes.',
            position: 'right',
            pulse: true
        },
        {
            element: '#recordButton',
            title: 'Record Animation',
            content: 'Capture your animations as video files that you can download and share.',
            position: 'right'
        },
        {
            element: '#toggleFullscreen',
            title: 'Fullscreen Mode',
            content: 'Toggle fullscreen mode to focus on your animation preview.',
            position: 'right'
        },
        {
            element: '#jsLibraryBtn',
            title: 'JavaScript Libraries',
            content: 'Access pre-built JavaScript libraries and example code to help you get started quickly.',
            position: 'right'
        },
        {
            element: '.js-viewer',
            title: 'Console Output',
            content: 'View your JavaScript console output, errors, and logs here for debugging.',
            position: 'top',
            interactive: true
        },
        {
            element: '#hamburgerBtn',
            title: 'Additional Settings',
            content: 'Access more settings and options, such as adjusting the number of animation frames.',
            position: 'bottom'
        },
        {
            element: 'body',
            title: 'Tutorial Complete!',
            content: 'You now know the basics of using the AI Code Editor. Start creating your own animations or use the AI to help you. Happy coding!',
            position: 'center',
            showVideo: true,
            video: 'complete'
        }
    ];
    
    // Update total steps counter
    document.getElementById('tutorialTotalSteps').textContent = tutorialSteps.length;
    
    // Show the first step
    showTutorialStep(currentTutorialStep);
    
    // Show tutorial controls
    tutorialOverlay.style.display = 'block';
    tutorialControls.style.display = 'flex';
}
function handleLibrarySelection() {
    if (currentTutorialStep === 0) {
        showNextTutorialStep();
    }
}

function handleRefreshAfterLibrary() {
    if (currentTutorialStep === 1) {
        showNextTutorialStep();
    }
}

// Add to setupMouseInteractivity()
document.getElementById('jsLibraryBtn').addEventListener('click', handleLibrarySelection);
document.getElementById('refreshPreview').addEventListener('click', handleRefreshAfterLibrary);

function enableCodeSelection() {
    const jsEditor = document.getElementById('jsEditor');
    if (jsEditor && currentTutorialStep === 3) {
        jsEditor.select();
        jsEditor.setAttribute('contenteditable', 'true');
        jsEditor.classList.add('tutorial-code-edit-mode');
    }
}

function showTutorialStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= tutorialSteps.length) {
        endTutorial();
        return;
    }
    
    const step = tutorialSteps[stepIndex];
    
    // Update step counter
    document.getElementById('tutorialCurrentStep').textContent = stepIndex + 1;
    
    // Remove highlight from previous element
    if (highlightedElement) {
        highlightedElement.remove();
    }
    
    // Create a new highlight if there's an element to highlight
    if (step.element && step.element !== 'body') {
        const targetElement = document.querySelector(step.element);
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            
            highlightedElement = document.createElement('div');
            highlightedElement.className = 'tutorial-highlight';
            if (step.pulse) {
                highlightedElement.classList.add('pulse');
            }
            
            // Position the highlight over the target element
            highlightedElement.style.left = `${rect.left}px`;
            highlightedElement.style.top = `${rect.top}px`;
            highlightedElement.style.width = `${rect.width}px`;
            highlightedElement.style.height = `${rect.height}px`;
            
            document.body.appendChild(highlightedElement);
            
            // Make element interactive if specified
            if (step.interactive) {
                targetElement.classList.add('tutorial-interactive');
                targetElement.setAttribute('data-tutorial-action', 'next-step');
            }
        }
    }
    
    // Update tooltip content
    let tooltipContent = `<h3>${step.title}</h3><p>${step.content}</p>`;
    
    // Add video button if available
    if (step.showVideo) {
        tooltipContent += `
            <button class="tutorial-video-btn" data-tutorial-action="play-video" data-video-section="${step.video}">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polygon points="10 8 16 12 10 16 10 8"></polygon>
                </svg>
                Watch Video
            </button>
        `;
    }
    
    tutorialTooltip.innerHTML = tooltipContent;
    
    // Position the tooltip
    if (step.element === 'body' || step.position === 'center') {
        // Center in the viewport
        tutorialTooltip.style.top = '50%';
        tutorialTooltip.style.left = '50%';
        tutorialTooltip.style.transform = 'translate(-50%, -50%)';
        tutorialTooltip.className = 'tutorial-tooltip';
    } else {
        const targetElement = document.querySelector(step.element);
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            
            tutorialTooltip.className = `tutorial-tooltip ${step.position}`;
            
            // Position based on specified position
            switch (step.position) {
                case 'top':
                    tutorialTooltip.style.bottom = `${window.innerHeight - rect.top + 15}px`;
                    tutorialTooltip.style.left = `${rect.left + rect.width / 2}px`;
                    tutorialTooltip.style.transform = 'translateX(-50%)';
                    break;
                case 'bottom':
                    tutorialTooltip.style.top = `${rect.bottom + 15}px`;
                    tutorialTooltip.style.left = `${rect.left + rect.width / 2}px`;
                    tutorialTooltip.style.transform = 'translateX(-50%)';
                    break;
                case 'left':
                    tutorialTooltip.style.right = `${window.innerWidth - rect.left + 15}px`;
                    tutorialTooltip.style.top = `${rect.top + rect.height / 2}px`;
                    tutorialTooltip.style.transform = 'translateY(-50%)';
                    break;
                case 'right':
                    tutorialTooltip.style.left = `${rect.right + 15}px`;
                    tutorialTooltip.style.top = `${rect.top + rect.height / 2}px`;
                    tutorialTooltip.style.transform = 'translateY(-50%)';
                    break;
            }
        }
    }
    
    // Show tooltip
    tutorialTooltip.style.display = 'block';
    
    // Update button states
    document.getElementById('tutorialPrev').disabled = stepIndex === 0;
    document.getElementById('tutorialNext').textContent = stepIndex === tutorialSteps.length - 1 ? 'Finish' : 'Next';
    
    // Add click handlers to video buttons
    const videoButtons = tutorialTooltip.querySelectorAll('[data-tutorial-action="play-video"]');
    videoButtons.forEach(button => {
        button.addEventListener('click', function() {
            const videoSection = button.getAttribute('data-video-section');
            playTutorialVideo(videoSection);
        });
    });
}

function showNextTutorialStep() {
    // Remove interactive class from current element if it exists
    if (currentTutorialStep < tutorialSteps.length) {
        const currentStep = tutorialSteps[currentTutorialStep];
        if (currentStep.element && currentStep.interactive) {
            const element = document.querySelector(currentStep.element);
            if (element) {
                element.classList.remove('tutorial-interactive');
                element.removeAttribute('data-tutorial-action');
            }
        }
    }
    
    currentTutorialStep++;
    if (currentTutorialStep >= tutorialSteps.length) {
        endTutorial();
    } else {
        showTutorialStep(currentTutorialStep);
    }
}

function showPreviousTutorialStep() {
    // Remove interactive class from current element if it exists
    if (currentTutorialStep < tutorialSteps.length) {
        const currentStep = tutorialSteps[currentTutorialStep];
        if (currentStep.element && currentStep.interactive) {
            const element = document.querySelector(currentStep.element);
            if (element) {
                element.classList.remove('tutorial-interactive');
                element.removeAttribute('data-tutorial-action');
            }
        }
    }
    
    currentTutorialStep--;
    if (currentTutorialStep < 0) {
        currentTutorialStep = 0;
    }
    showTutorialStep(currentTutorialStep);
}

function endTutorial() {
    tutorialActive = false;
    
    // Hide tutorial elements
    tutorialOverlay.style.display = 'none';
    tutorialTooltip.style.display = 'none';
    tutorialControls.style.display = 'none';
    
    // Remove any remaining highlight
    if (highlightedElement) {
        highlightedElement.remove();
        highlightedElement = null;
    }
    
    // Remove interactive classes from all elements
    document.querySelectorAll('.tutorial-interactive').forEach(element => {
        element.classList.remove('tutorial-interactive');
        element.removeAttribute('data-tutorial-action');
    });
    
    // Show completion message
    const jsOutput = document.getElementById('jsOutput');
    if (jsOutput) {
        jsOutput.innerHTML = `
            <div style="color: #7e57c2; padding: 15px; border-radius: 4px; background: rgba(126, 87, 194, 0.1); margin-bottom: 15px;">
                <h3 style="margin-top: 0;">Tutorial Completed! 🎉</h3>
                <p>You've successfully completed the AI Code Editor tutorial. You can restart the tutorial anytime by clicking the Tutorial button.</p>
                <button class="tutorial-video-btn" id="watchTutorialVideoBtn" style="margin-top: 10px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polygon points="10 8 16 12 10 16 10 8"></polygon>
                    </svg>
                    Watch Full Tutorial Video
                </button>
            </div>
        `;
        
        // Add event listener to the full tutorial video button
        const watchVideoBtn = document.getElementById('watchTutorialVideoBtn');
        if (watchVideoBtn) {
            watchVideoBtn.addEventListener('click', function() {
                playTutorialVideo('full');
            });
        }
    }

    document.getElementById('hamburgerBtn').addEventListener('click', function(e) {
        const dropdown = document.getElementById('hamburgerDropdown');
        if (tutorialActive) {
            // If tutorial is active, prevent closing
            dropdown.classList.add('show');
            return;
        }
        dropdown.classList.toggle('show');
    });
}

function playTutorialVideo(section) {
    // Get the video URL based on the section
    let videoUrl = '';
    
    switch(section) {
        case 'intro':
            videoUrl = 'https://cdn.glitch.global/bed4b085-2a8a-4e39-93c7-8f065ab89cc2/abc.mp4?v=1743223795052';
            break;
        case 'complete':
            videoUrl = 'https://cdn.glitch.global/bed4b085-2a8a-4e39-93c7-8f065ab89cc2/abc.mp4?v=1743223795052';
            break;
        case 'full':
            videoUrl = 'https://cdn.glitch.global/bed4b085-2a8a-4e39-93c7-8f065ab89cc2/abc.mp4?v=1743223795052';
            break;
        default:
            videoUrl = 'https://cdn.glitch.global/bed4b085-2a8a-4e39-93c7-8f065ab89cc2/abc.mp4?v=1743223795052';
    }
    
    // Use a placeholder video if real videos aren't available yet
    videoUrl = 'https://cdn.glitch.global/bed4b085-2a8a-4e39-93c7-8f065ab89cc2/abc.mp4?v=1743223795052';
    
    // Set the video source
    videoElement.src = videoUrl;
    
    // Show the modal
    videoModal.style.display = 'flex';
    
    // Play the video
    videoElement.play();
}

// Additional interactivity features for the editor

// Add drag functionality to tutorial tooltip
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

// tutorialTooltip.addEventListener('mousedown', function(e) {
//     // Only enable dragging from the title area
//     if (e.target.tagName === 'H3') {
//         isDragging = true;
//         dragStartX = e.clientX;
//         dragStartY = e.clientY;
        
//         // Get current position
//         const tooltipRect = tutorialTooltip.getBoundingClientRect();
//         tutorialTooltip.setAttribute('data-x', tooltipRect.left);
//         tutorialTooltip.setAttribute('data-y', tooltipRect.top);
        
//         // Change cursor
//         tutorialTooltip.style.cursor = 'grabbing';
//         e.preventDefault();
//     }
// });

document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    
    const startX = parseFloat(tutorialTooltip.getAttribute('data-x'));
    const startY = parseFloat(tutorialTooltip.getAttribute('data-y'));
    
    // Update position
    tutorialTooltip.style.left = `${startX + deltaX}px`;
    tutorialTooltip.style.top = `${startY + deltaY}px`;
    tutorialTooltip.style.right = 'auto';
    tutorialTooltip.style.bottom = 'auto';
    tutorialTooltip.style.transform = 'none';
});

document.addEventListener('mouseup', function() {
    if (isDragging) {
        isDragging = false;
        tutorialTooltip.style.cursor = 'default';
    }
});

// Keyboard navigation support
document.addEventListener('keydown', function(e) {
    if (!tutorialActive) return;
    
    if (e.key === 'Escape') {
        endTutorial();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        showNextTutorialStep();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        showPreviousTutorialStep();
    }
});

// Resize handler to reposition tutorial elements
window.addEventListener('resize', function() {
    if (!tutorialActive) return;
    
    // Reposition the current step to handle window resizing
    showTutorialStep(currentTutorialStep);
});

// Handle clicks on the animation canvas
document.addEventListener('click', function(e) {
    // Check if we're in an active tutorial and the canvas is clicked
    if (tutorialActive && e.target.tagName === 'CANVAS') {
        // If we're on the step that focuses on the canvas
        const currentStep = tutorialSteps[currentTutorialStep];
        if (currentStep && (currentStep.element === '.html-viewer' || currentStep.element === '.html-viewer canvas')) {
            showNextTutorialStep();
        }
    }
});

// Auto-start the tutorial for first-time users (optional)
function checkFirstTimeUser() {
    if (!localStorage.getItem('tutorialShown')) {
        // Delay startup to let the page fully load
        setTimeout(function() {
            startTutorial();
            localStorage.setItem('tutorialShown', 'true');
        }, 1000);
    }
}

// You can uncomment the line below to auto-start the tutorial for first-time users
// checkFirstTimeUser();

// Console output helper - works with the tutorial
function logToConsole(message, type = 'info') {
    const jsOutput = document.getElementById('jsOutput');
    if (!jsOutput) return;
    
    const typeClasses = {
        'info': { color: '#4f94ef', icon: 'info-circle' },
        'success': { color: '#4CAF50', icon: 'check-circle' },
        'warning': { color: '#ff9800', icon: 'alert-triangle' },
        'error': { color: '#f44336', icon: 'alert-circle' }
    };
    
    const style = typeClasses[type] || typeClasses.info;
    
    const iconSvg = {
        'info-circle': '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>',
        'check-circle': '<circle cx="12" cy="12" r="10"></circle><polyline points="9 12 11 14 15 10"></polyline>',
        'alert-triangle': '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
        'alert-circle': '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'
    };
    
    jsOutput.innerHTML += `
        <div style="margin-bottom: 8px; padding: 8px; border-radius: 4px; background: rgba(0,0,0,0.1); border-left: 4px solid ${style.color}; display: flex; align-items: flex-start;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${style.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; margin-top: 2px; flex-shrink: 0;">
                ${iconSvg[style.icon]}
            </svg>
            <div>${message}</div>
        </div>
    `;
    
    // Auto-scroll to bottom
    jsOutput.scrollTop = jsOutput.scrollHeight;
}

// Export functions for global access
window.startTutorial = startTutorial;
window.endTutorial = endTutorial;
window.playTutorialVideo = playTutorialVideo;
window.logToConsole = logToConsole;