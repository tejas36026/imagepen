// container-resize.js - Add this as a new file

document.addEventListener('DOMContentLoaded', function() {
    // Elements to make resizable
    const editorsContainer = document.querySelector('.editors-container');
    const viewersContainer = document.querySelector('.viewers-container');
    const editorColumns = document.querySelectorAll('.editor-column');
    const htmlViewerColumn = document.querySelector('.html-viewer-column');
    const cssJsViewerColumn = document.querySelector('.css-js-viewer-column');
    
    // Add resize handles to editor columns
    editorColumns.forEach((column, index) => {
        if (index < editorColumns.length - 1) { // Don't add to the last column
            addVerticalResizeHandle(column);
        }
    });
    
    // Add horizontal resize handle between editors and viewers
    addHorizontalResizeHandle(editorsContainer);
    
    // Add vertical resize handle between HTML viewer and Console/CSS viewer
    addVerticalResizeHandle(htmlViewerColumn);
    
    // Function to add vertical resize handle (for columns)
    function addVerticalResizeHandle(element) {
        const handle = document.createElement('div');
        handle.className = 'resize-handle vertical-resize-handle';
        handle.innerHTML = `
            <div class="resize-handle-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </div>
        `;
        element.appendChild(handle);
        
        let startX, startWidth, nextStartWidth;
        
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startX = e.clientX;
            startWidth = element.offsetWidth;
            const nextElement = element.nextElementSibling;
            nextStartWidth = nextElement ? nextElement.offsetWidth : 0;
            
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
            
            // Add active class for styling
            handle.classList.add('active');
            document.body.style.cursor = 'col-resize';
        });
        
        function resize(e) {
            const dx = e.clientX - startX;
            const newWidth = startWidth + dx;
            const nextElement = element.nextElementSibling;
            
            // Ensure minimum width
            if (newWidth > 100 && (!nextElement || (nextStartWidth - dx) > 100)) {
                element.style.width = `${newWidth}px`;
                element.style.flex = 'none';
                
                if (nextElement) {
                    nextElement.style.width = `${nextStartWidth - dx}px`;
                    nextElement.style.flex = 'none';
                }
            }
        }
        
        function stopResize() {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
            handle.classList.remove('active');
            document.body.style.cursor = '';
        }
    }
    
    // Function to add horizontal resize handle (between editor and viewer)
    function addHorizontalResizeHandle(element) {
        const handle = document.createElement('div');
        handle.className = 'resize-handle horizontal-resize-handle';
        handle.innerHTML = `
            <div class="resize-handle-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
        `;
        element.appendChild(handle);
        
        let startY, startHeight, viewerStartHeight;
        
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startY = e.clientY;
            startHeight = editorsContainer.offsetHeight;
            viewerStartHeight = viewersContainer.offsetHeight;
            
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
            
            // Add active class for styling
            handle.classList.add('active');
            document.body.style.cursor = 'row-resize';
        });
        
        function resize(e) {
            const dy = e.clientY - startY;
            const newEditorsHeight = startHeight + dy;
            const newViewersHeight = viewerStartHeight - dy;
            
            // Ensure minimum height
            if (newEditorsHeight > 100 && newViewersHeight > 100) {
                editorsContainer.style.height = `${newEditorsHeight}px`;
                editorsContainer.style.flex = 'none';
                viewersContainer.style.height = `${newViewersHeight}px`;
                viewersContainer.style.flex = 'none';
            }
        }
        
        function stopResize() {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
            handle.classList.remove('active');
            document.body.style.cursor = '';
        }
    }
    
    // Add selection tooltip functionality
    addSelectionTooltip();
});

// Function to add selection tooltip
function addSelectionTooltip() {
    const tooltip = document.createElement('div');
    tooltip.className = 'selection-tooltip';
    tooltip.innerHTML = `
        <button class="tooltip-btn copy-btn" title="Copy">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
        </button>
        <button class="tooltip-btn analyze-btn" title="Analyze with DeepSeek">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
        </button>
    `;
    document.body.appendChild(tooltip);
    
    // Track which editor is being used
    let currentEditor = null;
    
    // Add event listeners to all code editors
    const editors = [
        document.getElementById('htmlEditor'),
        document.getElementById('cssEditor'),
        document.getElementById('jsEditor')
    ];
    
    editors.forEach(editor => {
        editor.addEventListener('mouseup', handleSelection);
        editor.addEventListener('keyup', handleSelection);
        
        // Track current editor
        editor.addEventListener('focus', () => {
            currentEditor = editor;
        });
    });
    


    function handleSelection(e) {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText) {
            const tooltip = document.querySelector('.enhanced-selection-tooltip');
            
            // Get the selected range
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Use the mouse event coordinates if available
            const mouseX = e.clientX || (rect.left + rect.width / 2);
            const mouseY = e.clientY || rect.bottom;
            
            // Adjust tooltip position
            tooltip.style.position = 'fixed';
            tooltip.style.top = `${mouseY + 10}px`;
            tooltip.style.left = `${mouseX - (tooltip.offsetWidth / 2)}px`;
            
            // Ensure tooltip stays within viewport
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const tooltipRect = tooltip.getBoundingClientRect();
            
            // Adjust horizontal position if tooltip goes out of bounds
            if (tooltipRect.right > viewportWidth) {
                tooltip.style.left = `${viewportWidth - tooltipRect.width - 10}px`;
            }
            if (tooltipRect.left < 0) {
                tooltip.style.left = '10px';
            }
            
            // Adjust vertical position if tooltip goes below viewport
            if (tooltipRect.bottom > viewportHeight) {
                tooltip.style.top = `${mouseY - tooltipRect.height - 10}px`;
            }
            
            tooltip.style.display = 'block';
            
            // Update data attribute with the selected text
            tooltip.setAttribute('data-text', selectedText);
        } else {
            const tooltip = document.querySelector('.enhanced-selection-tooltip');
            tooltip.style.display = 'none';
        }
    }
    
    editors.forEach(editor => {
        editor.addEventListener('mouseup', (e) => handleSelection(e));
        editor.addEventListener('keyup', (e) => handleSelection(e));
    });
    

    document.addEventListener('selectionchange', () => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText) {
            const tooltip = document.querySelector('.enhanced-selection-tooltip');
            tooltip.style.display = 'block';
        }
    });
    
    // Hide tooltip when clicking elsewhere
    document.addEventListener('mousedown', (e) => {
        if (!tooltip.contains(e.target)) {
            tooltip.style.display = 'none';
        }
    });
    
    // Copy button functionality
    const copyBtn = tooltip.querySelector('.copy-btn');
    copyBtn.addEventListener('click', () => {
        const text = tooltip.getAttribute('data-text');
        navigator.clipboard.writeText(text).then(() => {
            // Show success indicator
            copyBtn.classList.add('success');
            setTimeout(() => {
                copyBtn.classList.remove('success');
                tooltip.style.display = 'none';
            }, 1000);
        });
    });
    
    // Analyze button functionality
    const analyzeBtn = tooltip.querySelector('.analyze-btn');
    analyzeBtn.addEventListener('click', () => {
        const text = tooltip.getAttribute('data-text');
        analyzeTextWithDeepSeek(text, currentEditor);
        tooltip.style.display = 'none';
    });
}

// Function to analyze text with DeepSeek API
function analyzeTextWithDeepSeek(text, editor) {
    // Show loading indicator in console output
    const jsOutput = document.getElementById('jsOutput');
    const loadingId = showLoadingIndicator(jsOutput);
    
    // Get user prompt if any
    const promptInput = document.getElementById('promptInput');
    const userPrompt = promptInput.value.trim();
    
    // Determine the language based on the editor
    let language = 'text';
    if (editor) {
        if (editor.id === 'htmlEditor') language = 'html';
        else if (editor.id === 'cssEditor') language = 'css';
        else if (editor.id === 'jsEditor') language = 'javascript';
    }
    
    // Create analysis prompt
    const prompt = userPrompt 
        ? `Analyze this ${language} code: "${text}"\n\nUser's specific request: ${userPrompt}`
        : `Analyze this ${language} code: "${text}"\n\nProvide a brief explanation of what this code does, 
           suggest improvements, and identify any potential bugs or issues. Be concise but thorough.`;
    
    // Call DeepSeek API
    fetch('https://tejas56789ce1.pythonanywhere.com/analyze-text', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text: text,
            prompt: prompt,
            language: language
        }),
    })
    .then(response => response.json())
    .then(data => {
        // Clear loading indicator
        clearInterval(loadingId);
        
        // Display the analysis result
        jsOutput.innerHTML = `
            <div class="analysis-result">
                <h3>DeepSeek Analysis</h3>
                <div class="analysis-content">
                    ${data.analysis || 'Analysis not available'}
                </div>
                <div class="analyzed-code">
                    <strong>Analyzed ${language.toUpperCase()} Code:</strong>
                    <pre>${text}</pre>
                </div>
            </div>
        `;
        
        // Switch to console tab to show the result
        const consoleTab = document.querySelector('.tab[data-tab="console"]');
        if (consoleTab) {
            consoleTab.click();
        }
    })
    .catch(error => {
        // Clear loading indicator
        clearInterval(loadingId);
        
        // Show error message
        jsOutput.innerHTML = `
            <div class="error-message">
                <h3>Analysis Failed</h3>
                <p>Error: ${error.message}</p>
                <p>Failed to analyze: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"</p>
            </div>
        `;
        
        // Switch to console tab to show the error
        const consoleTab = document.querySelector('.tab[data-tab="console"]');
        if (consoleTab) {
            consoleTab.click();
        }
    });
}

// Loading indicator function
function showLoadingIndicator(outputArea) {
    let dots = 0;
    outputArea.innerHTML = `<div class="loading-indicator">
        <div class="loading-spinner"></div>
        <div class="loading-text">Analyzing code</div>
    </div>`;
    
    const loadingText = outputArea.querySelector('.loading-text');
    
    // Add CSS for loading animation if not already added
    if (!document.querySelector('#loading-styles')) {
        const style = document.createElement('style');
        style.id = 'loading-styles';
        style.textContent = `
            .loading-indicator {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid rgba(126, 87, 194, 0.1);
                border-radius: 50%;
                border-top-color: var(--primary-color);
                animation: spin 1s ease-in-out infinite;
                margin-bottom: 15px;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            .loading-text {
                font-size: 16px;
                color: var(--text-light);
            }
        `;
        document.head.appendChild(style);
    }
    
    // Animate the dots
    const loadingInterval = setInterval(() => {
        dots = (dots + 1) % 4;
        loadingText.textContent = `Analyzing code${'.'.repeat(dots)}`;
    }, 300);
    
    return loadingInterval;
}

// Add CSS styles for resize handles and tooltip
const resizeStyles = document.createElement('style');
resizeStyles.textContent = `
    .resize-handle {
        position: absolute;
        z-index: 10;
    }
    
    .vertical-resize-handle {
        top: 0;
        right: -6px;
        width: 12px;
        height: 100%;
        cursor: col-resize;
    }
    
    .horizontal-resize-handle {
        bottom: -6px;
        left: 0;
        width: 100%;
        height: 12px;
        cursor: row-resize;
    }
    
    .resize-handle-inner {
        position: absolute;
        background-color: var(--border-color);
        opacity: 0;
        transition: opacity 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .vertical-resize-handle .resize-handle-inner {
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 4px;
        height: 40px;
        border-radius: 2px;
    }
    
    .horizontal-resize-handle .resize-handle-inner {
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 40px;
        height: 4px;
        border-radius: 2px;
    }
    
    .resize-handle:hover .resize-handle-inner,
    .resize-handle.active .resize-handle-inner {
        opacity: 1;
        background-color: var(--primary-color);
    }
    
    .selection-tooltip {
        position: fixed;
        background-color: var(--bg-medium);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        padding: 8px;
        display: none;
        flex-direction: row;
        gap: 8px;
        z-index: 1000;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }
    
    .tooltip-btn {
        background-color: var(--bg-light);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        padding: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
    }
    
    .tooltip-btn:hover {
        background-color: var(--primary-hover);
    }
    
    .tooltip-btn.copy-btn.success {
        background-color: #4caf50;
    }
    
    .tooltip-btn.analyze-btn {
        background-color: var(--deepseek-color);
    }
    
    .tooltip-btn.analyze-btn:hover {
        background-color: var(--deepseek-hover);
    }
    
    .analysis-result {
        padding: 12px;
        background-color: rgba(126, 87, 194, 0.1);
        border-radius: 6px;
        margin: 10px 0;
    }
    
    .analysis-result h3 {
        margin: 0 0 10px 0;
        color: var(--primary-color);
        font-size: 16px;
    }
    
    .analysis-content {
        white-space: pre-wrap;
        line-height: 1.5;
        margin-bottom: 10px;
    }
    
    .analyzed-code {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid var(--border-color);
    }
    
    .analyzed-code pre {
        background-color: var(--bg-dark);
        padding: 10px;
        border-radius: 4px;
        margin-top: 5px;
        max-height: 150px;
        overflow: auto;
    }
    
    .error-message {
        padding: 12px;
        background-color: rgba(255, 82, 82, 0.1);
        border-radius: 6px;
        margin: 10px 0;
    }
    
    .error-message h3 {
        margin: 0 0 10px 0;
        color: #ff5252;
        font-size: 16px;
    }
`;

document.head.appendChild(resizeStyles);