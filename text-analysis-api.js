document.addEventListener('DOMContentLoaded', function() {
    // Create an enhanced tooltip with prompt input
    const enhancedTooltip = createEnhancedTooltip();
    document.body.appendChild(enhancedTooltip);

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

    function createEnhancedTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'enhanced-selection-tooltip';
        tooltip.innerHTML = `
            <div class="tooltip-content">
                <div class="tooltip-actions">
                    <button class="tooltip-btn analyze-btn" title="Analyze with DeepSeek">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </button>
                </div>
                <div class="tooltip-prompt-container">
                    <textarea 
                        class="tooltip-prompt-input" 
                        placeholder="Optional: Provide a specific analysis prompt (e.g., 'Find potential performance improvements')"
                        rows="2"
                    ></textarea>
                </div>
            </div>
        `;
        return tooltip;
    }


    function handleSelection(e) {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText) {
            const tooltip = document.querySelector('.enhanced-selection-tooltip');
            const promptInput = tooltip.querySelector('.tooltip-prompt-input');
            
            // PROPERLY UPDATE TEXTAREA
            promptInput.value = selectedText;
            
            // Force DOM update for textarea
            promptInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Add temporary attribute to force redraw
            promptInput.style.display = 'none';
            promptInput.offsetHeight; // Trigger reflow
            promptInput.style.display = 'block';
    
            
            // Store the selected text in the tooltip's dataset
            tooltip.dataset.text = selectedText;
            
            // Calculate viewport dimensions
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // Calculate the central 50% area of the viewport
            const centerWidthStart = viewportWidth * 0.25;
            const centerWidthEnd = viewportWidth * 0.75;
            const centerHeightStart = viewportHeight * 0.25;
            const centerHeightEnd = viewportHeight * 0.75;
            
            // Make tooltip visible but offscreen first to compute its dimensions
            tooltip.style.position = 'fixed';
            tooltip.style.display = 'block';
            tooltip.style.top = '-9999px';
            tooltip.style.left = '-9999px';
            
            // Get tooltip dimensions after it's visible
            const tooltipWidth = tooltip.offsetWidth;
            const tooltipHeight = tooltip.offsetHeight;
            
            // Get the selected range and mouse position
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            let mouseX = e.clientX || (rect.left + rect.width / 2);
            let mouseY = e.clientY || rect.bottom;
            
            // Keep tooltip position within the central 50% area
            let tooltipX = mouseX;
            let tooltipY = mouseY + 10;
            
            // Adjust X position to stay within central area
            if (tooltipX + tooltipWidth > centerWidthEnd) {
                tooltipX = centerWidthEnd - tooltipWidth;
            }
            if (tooltipX < centerWidthStart) {
                tooltipX = centerWidthStart;
            }
            
            // Adjust Y position to stay within central area
            if (tooltipY + tooltipHeight > centerHeightEnd) {
                tooltipY = centerHeightEnd - tooltipHeight;
            }
            if (tooltipY < centerHeightStart) {
                tooltipY = centerHeightStart;
            }
            
            // Set the final position
            tooltip.style.top = `${tooltipY}px`;
            tooltip.style.left = `${tooltipX}px`;
            
            // Display selected text in console with syntax highlighting
            const jsOutput = document.getElementById('jsOutput');
            if (jsOutput) {
                // Determine language for syntax highlighting
                let language = 'text';
                if (currentEditor) {
                    if (currentEditor.id === 'htmlEditor') language = 'html';
                    else if (currentEditor.id === 'cssEditor') language = 'css';
                    else if (currentEditor.id === 'jsEditor') language = 'javascript';
                }
                
                // Display in console with proper formatting
                displayCopiedText(jsOutput, selectedText, language);
                
                // Switch to console tab to show the result
                const consoleTab = document.querySelector('.tab[data-tab="console"]');
                if (consoleTab) {
                    consoleTab.click();
                }
            }
        } else {
            const tooltip = document.querySelector('.enhanced-selection-tooltip');
            tooltip.style.display = 'none';
        }
    }
    

    // Function to display selected text in console with syntax highlighting
    function displayCopiedText(outputArea, text, language) {
        outputArea.innerHTML = `
            <div class="copied-text-display">
                <h3>Selected ${language.toUpperCase()} Code</h3>
                <div class="copied-code-container">
                    <pre class="code-block ${language}">${text}</pre>
                </div>
            </div>
        `;
    }

    // Analyze button functionality
    document.addEventListener('click', (e) => {
        const analyzeBtn = e.target.closest('.analyze-btn');
        if (analyzeBtn) {
            const tooltip = analyzeBtn.closest('.enhanced-selection-tooltip');
            const text = tooltip.dataset.text;
            const promptInput = tooltip.querySelector('.tooltip-prompt-input');
            const userPrompt = promptInput.value.trim();
    
            // Determine the language based on the current editor
            let language = 'text';
            if (currentEditor) {
                if (currentEditor.id === 'htmlEditor') language = 'html';
                else if (currentEditor.id === 'cssEditor') language = 'css';
                else if (currentEditor.id === 'jsEditor') language = 'javascript';
            }
    
            // Perform analysis (sends both text and prompt to Flask server)
            analyzeTextWithDeepSeekAPI(text, userPrompt, language);
            
            // Hide tooltip
            tooltip.style.display = 'none';
        }
    });
    
    // Hide tooltip when clicking elsewhere
    document.addEventListener('mousedown', (e) => {
        const tooltip = document.querySelector('.enhanced-selection-tooltip');
        if (tooltip && !tooltip.contains(e.target)) {
            tooltip.style.display = 'none';
        }
    });
});

// [Rest of the code remains exactly the same...]

async function mockAnalyzeText(text, prompt, language) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate analysis based on language
    let analysis = '';
        
    return { analysis: analysis };
}

async function analyzeTextWithDeepSeekAPI(text, prompt, language) {
    // Show loading indicator in JS output
    const jsOutput = document.getElementById('jsOutput');
    const loadingId = showLoadingIndicator(jsOutput);
    
    try {
        // Construct the full prompt
        const fullPrompt = prompt 
            ? `${prompt}` 
            : `Analyze this ${language} code: "${text}"\n\nProvide a comprehensive analysis of the code.`;
        
        // Call Together AI API
        const apiUrl = 'https://api.together.xyz/v1/completions';
        const model = "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"; // You can make this configurable
        
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: model,
                prompt: fullPrompt,
                max_tokens: 1024, // Adjust as needed
                temperature: 0.7,
                top_p: 0.9,
                top_k: 50,
                repetition_penalty: 1.0,
                stop: ["<human>", "</answer>"]
            })
        };
        
        const response = await fetch(apiUrl, requestOptions);
        
        // Clear loading indicator
        clearInterval(loadingId);
        
        if (!response.ok) {
            // If API fails, use mock analysis
            const mockResult = await mockAnalyzeText(text, prompt, language);
            displayAnalysisResult(jsOutput, mockResult, text, language);
            return;
        }
        
        // Process successful API response
        const data = await response.json();
        const analysisResult = {
            analysis: data.choices[0].text
        };
        
        displayAnalysisResult(jsOutput, analysisResult, text, language);
        
    } catch (error) {
        // Clear loading indicator
        clearInterval(loadingId);
        
        // Fallback to mock analysis
        console.warn('Failed to use API endpoint, falling back to mock:', error);
        const mockResult = await mockAnalyzeText(text, prompt, language);
        displayAnalysisResult(jsOutput, mockResult, text, language);
    }
}

const API_KEY = '07589fb47c69da2f5af8b4ecdee9b843614c5f76605e1706b1af22ea1dd728cd';

// Function to display analysis results
function displayAnalysisResult(outputArea, data, originalText, language) {
    outputArea.innerHTML = `
        <div class="analysis-result">
            <h3>DeepSeek Analysis</h3>
            <div class="analysis-content">
                ${data.analysis || 'Analysis not available'}
            </div>
            <div class="analyzed-code">
                <strong>Analyzed ${language.toUpperCase()} Code:</strong>
                <pre>${originalText}</pre>
            </div>
        </div>
    `;
    const analysisContent = outputArea.querySelector('.analysis-content');
    if (analysisContent) {
        applyTypingAnimation(analysisContent);
    }

    function applyTypingAnimation(element) {
        const text = element.textContent;
        element.textContent = '';
        element.style.visibility = 'visible';
        
        let i = 0;
        const speed = 0.1; // Adjust typing speed (lower is faster)
        
        function typeWriter() {
            if (i < text.length) {
                // Add next character
                element.innerHTML += text.charAt(i);
                
                // Randomly vary speed slightly for more natural effect
                const currentSpeed = speed + (Math.random() * 10 - 5);
                
                i++;
                setTimeout(typeWriter, currentSpeed);
            }
        }
        
        // Start the animation
        typeWriter();
    }
    
    // Switch to console tab to show the result
    const consoleTab = document.querySelector('.tab[data-tab="console"]');
    if (consoleTab) {
        consoleTab.click();
    }
}

// Existing loading indicator function (from previous code)
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

// Add enhanced tooltip styles
const enhancedTooltipStyles = document.createElement('style');
enhancedTooltipStyles.textContent = `
    .enhanced-selection-tooltip {
        position: fixed;
        background-color: var(--bg-medium);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 14px;
        display: none;
        flex-direction: column;
        gap: 12px;
        z-index: 1000;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        max-width: 380px;
        width: 100%;
        backdrop-filter: blur(4px);
        transition: all 0.2s ease;
    }
    
    .enhanced-selection-tooltip:hover {
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.25);
    }
    
    .enhanced-selection-tooltip .tooltip-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    
    .tooltip-actions {
        display: flex;
        justify-content: flex-start;
    }
    
    .tooltip-btn {
        background-color: var(--primary-color);
        border: none;
        border-radius: 8px;
        padding: 10px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        color: white;
        font-weight: 500;
        gap: 8px;
    }
    
    .tooltip-btn:hover {
        background-color: var(--primary-hover);
        transform: translateY(-1px);
    }
    
    .tooltip-btn:active {
        transform: translateY(0);
    }
    
    .search-icon {
        width: 18px;
        height: 18px;
        fill: white;
    }
    
    .analyze-text {
        font-size: 14px;
    }
    
    .tooltip-prompt-container {
        width: 100%;
    }
    
    .tooltip-prompt-input {
        width: 100%;
        padding: 10px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        resize: vertical;
        min-height: 60px;
        max-height: 120px;
        font-size: 14px;
        background-color: var(--bg-light);
        color: var(--text-primary);
        transition: all 0.2s ease;
    }
    
    .tooltip-prompt-input:focus {
        outline: 2px solid var(--primary-color);
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(126, 87, 194, 0.2);
    }
    
    .tooltip-prompt-input::placeholder {
        color: var(--text-light);
        opacity: 0.7;
    }
    
    /* Styles for copy notification */
    .copy-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: var(--primary-color);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1100;
        animation: fadeIn 0.3s ease-out;
    }
    
    .copy-notification.error {
        background-color: #e53935;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    /* Styles for copied code display */
    .copied-text-display {
        margin: 20px 0;
        background-color: var(--bg-light);
        border-radius: 12px;
        padding: 20px;
        border: 1px solid var(--border-color);
    }
    
    .copied-text-display h3 {
        margin-top: 0;
        color: var(--primary-color);
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 15px;
    }
    
    .copied-code-container {
        background-color: var(--bg-dark);
        border-radius: 8px;
        overflow: hidden;
    }
    
    .code-block {
        margin: 0;
        padding: 15px;
        font-family: 'Fira Code', monospace;
        font-size: 14px;
        line-height: 1.5;
        overflow-x: auto;
        color: var(--text-primary);
    }
    
    .code-block.html {
        color: #e34c26;
    }
    
    .code-block.css {
        color: #563d7c;
    }
    
    .code-block.javascript {
        color: #f0db4f;
    }
`;

document.head.appendChild(enhancedTooltipStyles);

// Expose function to global scope if needed
window.analyzeTextWithDeepSeekAPI = analyzeTextWithDeepSeekAPI;