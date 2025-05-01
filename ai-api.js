// ai-api.js
const htmlDeepseekBtn = document.getElementById('htmlDeepseekBtn');
const cssDeepseekBtn = document.getElementById('cssDeepseekBtn');
const jsDeepseekBtn = document.getElementById('jsDeepseekBtn');
const magicBtn = document.getElementById('magicBtn'); // Add this line to get the main Generate button

if (magicBtn) {
  magicBtn.addEventListener('click', function() {
      // Call the AI API with the currently active editor (default to JS)
      callAiApi('js', 'deepseek');
  });
}

htmlDeepseekBtn.addEventListener('click', function() {
    callAiApi('html', 'deepseek');
});

cssDeepseekBtn.addEventListener('click', function() {
    callAiApi('css', 'deepseek');
});

jsDeepseekBtn.addEventListener('click', function() {
    callAiApi('js', 'deepseek');
});

function updateApiStatus() {
  const apiStatus = document.getElementById('apiStatus');
  const apiStatusText = document.getElementById('apiStatusText');
  
  const deepseekApiKey = localStorage.getItem('deepseekApiKey');
  const useCreatorApiKey = localStorage.getItem('useCreatorApiKey') === 'true';
  
  // Always default to using creator API key which requires credits
  if (!deepseekApiKey) {
      localStorage.setItem('useCreatorApiKey', 'true');
  }
}

// Add fast typing effect function
function typeIntoEditor(editor, text, callback) {
  const lines = text.split('\n');
  editor.value = "";
  let lineIndex = 0;
  const typeSpeed = 3; // milliseconds per line, adjust as needed
  
  function typeNextLine() {
    if (lineIndex < lines.length) {
      if (lineIndex > 0) {
        editor.value += '\n';
      }
      editor.value += lines[lineIndex];
      lineIndex++;
      
      // Scroll to the bottom of the editor as new content is added
      editor.scrollTop = editor.scrollHeight;
      
      setTimeout(typeNextLine, typeSpeed);
    } else {
      if (callback) callback();
    }
  }
  
  typeNextLine();
}
// Create loading indicator
function showLoadingIndicator(outputArea) {
  let dots = 0;
  outputArea.innerHTML = `<div class="loading-indicator">
    <div class="loading-spinner"></div>
    <div class="loading-text">Processing request</div>
  </div>`;
  
  const loadingText = outputArea.querySelector('.loading-text');
  
  // Add CSS for loading animation
  const style = document.createElement('style');
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
      border: 4px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-top-color: var(--accent-color);
      animation: spin 1s ease-in-out infinite;
      margin-bottom: 15px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .loading-text {
      font-size: 16px;
      color: var(--text-primary);
    }
  `;
  document.head.appendChild(style);
  
  // Animate the dots
  const loadingInterval = setInterval(() => {
    dots = (dots + 1) % 4;
    loadingText.textContent = `Processing request${'.'.repeat(dots)}`;
  }, 300);
  
  return loadingInterval;
}

function callAiApi(language, provider) {
  // Check if API key is set
  const apiKey = localStorage.getItem('deepseekApiKey');
  console.log("API Key from localStorage:", apiKey);
  
  // Force using creator API key unless user has their own
  const useCreatorApiKey = apiKey ? (localStorage.getItem('useCreatorApiKey') === 'true') : true;
  localStorage.setItem('useCreatorApiKey', useCreatorApiKey ? 'true' : 'false');
  console.log("Using creator API key:", useCreatorApiKey);
  
  // Check credits - initialize to 0 if not set
  let credits = parseInt(localStorage.getItem('credits') || '0');
  console.log("Current credits:", credits);
  
  // Force credits to be 0 if they're negative or NaN
  if (isNaN(credits) || credits < 0) {
      credits = 0;
      localStorage.setItem('credits', '0');
  }
  
  // If using creator's API key and no credits, block and show purchase modal
  if (useCreatorApiKey && credits <= 0) {
      document.getElementById('jsOutput').innerHTML = `<div style="color: #ff5252; font-weight: bold;">You need to purchase credits to use this feature.</div>`;
      // Show credits purchase modal
      document.getElementById('creditsModal').style.display = 'flex';
      return; // Stop execution
  }
  
  // Get the current code from the editors
  const htmlCode = document.getElementById('htmlEditor').value;
  const cssCode = document.getElementById('cssEditor').value;
  const jsCode = document.getElementById('jsEditor').value;
  
  // Get the user prompt from the input field
  const userPrompt = document.getElementById('promptInput').value.trim();
  
  // Get editor for the selected language
  const editor = document.getElementById(`${language}Editor`);
  const outputArea = document.getElementById('jsOutput');
  
  // Show loading indicator with animation
  const loadingInterval = showLoadingIndicator(outputArea);

// --- IMPORTANT SECURITY WARNING ---
// Storing your API key directly in frontend code is VERY RISKY.
// Anyone can view it and potentially misuse it.
// Consider using a backend proxy instead.
// Replace 'YOUR_TOGETHER_API_KEY' with your actual key ONLY if you understand the risks.
const TOGETHER_API_KEY = "07589fb47c69da2f5af8b4ecdee9b843614c5f76605e1706b1af22ea1dd728cd"; // <--- VERY INSECURE IN PRODUCTION

// Assume these variables are defined elsewhere in your JS code:
// let language = 'js'; // or 'html', 'css'
// let htmlCode = editorHtml.getValue(); // Example: Get code from editors
// let cssCode = editorCss.getValue();
// let jsCode = editorJs.getValue();
// let userPrompt = document.getElementById('userPromptInput').value; // Example
// let loadingInterval; // Assume this is set when loading starts
// let editor = /* reference to your code editor instance */;
// let outputArea = document.getElementById('output'); // Example
// let useCreatorApiKey = true; // Assuming direct call means using the main key
// let credits = parseInt(localStorage.getItem('credits') || '0'); // Example
// let provider = 'Together AI';
// function typeIntoEditor(editorInstance, text, callback) { /* definition elsewhere */ }
// function mockAiResponse(lang, prov, ed, out, cred, interval) { /* definition elsewhere */ }


// --- Function to clean the AI-generated code (same as before) ---
function cleanGeneratedCode(code) {
    // First, check if we have actual code content
    if (!code || typeof code !== 'string') {
        return '';
    }

    let cleanedCode = code;

    // Step 1: Remove preamble text
    cleanedCode = cleanedCode.replace(/^\s*.*?```(?:javascript|js|html|css)?\s*/i, '```');
    cleanedCode = cleanedCode.replace(/^\s*.*?(?:here is|here's|the improved|enhanced|updated)\s+(?:the\s+)?(?:javascript|js|html|css)\s+code:?\s*/i, '');

    // Step 2: Extract code from markdown block or remove markers
    const codeBlockMatch = cleanedCode.match(/```(?:javascript|js|html|css)?([\s\S]*?)```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
        cleanedCode = codeBlockMatch[1].trim();
    } else {
        cleanedCode = cleanedCode.replace(/^```(?:javascript|js|html|css)?\s*/i, '');
        cleanedCode = cleanedCode.replace(/\s*```\s*$/i, '');
    }

    // Step 3: Trim whitespace
    cleanedCode = cleanedCode.trim();

    // Step 4: Fallback check for remaining text (optional)
    if (!cleanedCode.match(/^(?:function|const|let|var|\/\/|\/\*|import|export|class|if|for|while|<|@|\.|#)/i)) {
        const codeStartMatch = cleanedCode.match(/(?:function|const|let|var|\/\/|\/\*|import|export|class|if|for|while|<|@|\.|#)/i);
        if (codeStartMatch && codeStartMatch.index > 0) {
            cleanedCode = cleanedCode.substring(codeStartMatch.index);
        }
    }

    // Step 5: Final trim
    cleanedCode = cleanedCode.trim();

    return cleanedCode;
}
// --- End of cleanGeneratedCode function ---


// --- Direct Fetch Call to Together AI ---

// Construct the prompt for the API
const systemPrompt = "You are a helpful coding assistant that provides enhanced code.";
const promptContent = `Enhance this ${language.toUpperCase()} code. No external images and no external links.
Everything should be in one worker code. Create your own SVGs and provide the full code.

Current HTML:
\`\`\`html
${htmlCode || "<!-- No HTML provided -->"}
\`\`\`

Current CSS:
\`\`\`css
${cssCode || "/* No CSS provided */"}
\`\`\`

Current JS:
\`\`\`javascript
${jsCode || "// No JS provided"}
\`\`\`

User instructions: ${userPrompt || "Enhance this code with best practices and optimizations"}

Please improve the ${language.toUpperCase()} code specifically, based on the user instructions and the provided context.
Only return the improved ${language.toUpperCase()} code without explanations or markdown formatting like \`\`\`${language}.`;

// Together AI API endpoint
const apiUrl = 'https://api.together.xyz/v1/chat/completions';

fetch(apiUrl, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOGETHER_API_KEY}` // Pass the API key here
    },
    body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-V3", // Or your desired model
        messages: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: promptContent
            }
        ],
        max_tokens: 5576, // Adjust as needed
        temperature: 0.7,
        top_p: 0.7,
        top_k: 50,
        repetition_penalty: 1,
        // Note: 'stop' sequences might be specific to the model.
        // Check Together AI documentation for DeepSeek-V3 if needed.
        // stop: ["<｜end of sentence｜>"], // Keep if necessary for the model
        stream: false // Easier to handle non-streamed response directly in JS
    }),
})
.then(response => {
    console.log("Together AI Response Status:", response.status);
    if (!response.ok) {
        // Try to get more details from the error response body
        return response.json().then(errData => {
            // Throw an error with details from the API if available
            throw new Error(`Together AI API Error ${response.status}: ${errData.error?.message || JSON.stringify(errData)}`);
        }).catch(() => {
            // Fallback if the error body isn't JSON or parsing fails
            throw new Error(`Together AI API Error ${response.status}: ${response.statusText}`);
        });
    }
    return response.json(); // Parse the JSON body of the successful response
})
.then(data => {
    console.log("Together AI Data received:", data);

    // Stop any loading indicator
    if (loadingInterval) {
        clearInterval(loadingInterval);
    }

    // Extract the generated code from the response structure
    // Adjust this path based on the actual structure returned by Together AI's non-streamed chat completion
    let generatedText = '';
    if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
        generatedText = data.choices[0].message.content;
    } else {
        console.error("Could not find generated content in the expected place in API response:", data);
         throw new Error("API response format unexpected. Could not extract generated code.");
    }

    let cleanedCode = cleanGeneratedCode(generatedText);
    console.log('Cleaned Code:', cleanedCode);

    // Update the editor with the cleaned generated code using typing effect
    typeIntoEditor(editor, cleanedCode, () => {
        // Callback after typing
        if (editor && typeof editor.dispatchEvent === 'function') {
            editor.dispatchEvent(new Event('input'));
        } else if (editor && typeof editor.save === 'function') {
            editor.save();
        }
        const runButton = document.getElementById('runCode');
        if (runButton) {
            runButton.click();
        }
    });

    // Frontend credit management is generally insecure, but kept from original logic
    if (useCreatorApiKey) { // Assuming direct call always uses the main key
        let currentCredits = parseInt(localStorage.getItem('credits') || '0');
        const newCredits = Math.max(0, currentCredits - 1);
        localStorage.setItem('credits', newCredits);
        const creditCountElement = document.getElementById('creditCount');
        if (creditCountElement) {
            creditCountElement.textContent = `${newCredits} credits`;
        }
        if (newCredits === 0) {
            setTimeout(() => {
                const creditsModal = document.getElementById('creditsModal');
                if (creditsModal) {
                    creditsModal.style.display = 'flex';
                }
            }, 500);
        }
    }

    // Show success message
    if (outputArea) {
        outputArea.innerHTML = `<div style="color: var(--success-color, #4CAF50); padding: 10px; border-radius: 4px; background: rgba(76, 175, 80, 0.1)">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Successfully generated ${language.toUpperCase()} code with ${provider} (Direct Call)
        </div>`;
    }

})
.catch(error => {
    console.error('Error calling Together AI API:', error);

    // Clear loading indicator
    if (loadingInterval) {
        clearInterval(loadingInterval);
    }

    // Display error message
    if (outputArea) {
        outputArea.innerHTML = `<div style="color: var(--error-color, #f44336); padding: 10px; border-radius: 4px; background: rgba(244, 67, 54, 0.1)">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Error: ${error.message}
        </div>`;
    }

     // Credit check / Mock response logic on error (kept from original)
     // Note: Frontend credit check is insecure.
     let currentCredits = parseInt(localStorage.getItem('credits') || '0');
     if (!useCreatorApiKey || (useCreatorApiKey && currentCredits > 0)) {
         // Only call mock if you actually have a mock implementation
         // mockAiResponse(language, provider, editor, outputArea, currentCredits, loadingInterval);
         console.log("Attempting mock response (if configured).");
     } else if (useCreatorApiKey && currentCredits <= 0) {
         if (outputArea) {
             outputArea.innerHTML += `<div style="color: var(--error-color, #f44336); font-weight: bold; margin-top: 10px;">You need credits to use this feature.</div>`;
         }
         const creditsModal = document.getElementById('creditsModal');
         if (creditsModal) {
             creditsModal.style.display = 'flex';
         }
     }
});
}

window.addEventListener('DOMContentLoaded', () => {
  // Reset credits to 0 if not set or if set to a value we don't want
  const savedCredits = localStorage.getItem('credits');
  // Force credits to 0 on initialization
  localStorage.setItem('credits', '0');
  document.getElementById('creditCount').textContent = '0 credits';
  
  updateApiStatus();
});

function mockAiResponse(language, provider, editor, outputArea, credits) {
  // Create a mock loading interval to simulate waiting time
  const loadingInterval = showLoadingIndicator(outputArea);
  
  setTimeout(() => {
      // Clear loading indicator
      clearInterval(loadingInterval);
      
      let mockedCode = '';
      
      // Update the editor with the "AI-generated" code
      if (language === 'html') {
          mockedCode = `<div>
<h1>Dog Animation Showcase</h1>
<p>This is a sample dog animation demo</p>
<div id="canvas-container"></div>
</div>`;
      } else if (language === 'css') {
          mockedCode = `h1 {
color: #8B4513;
font-family: 'Comic Sans MS', cursive, sans-serif;
}
p {
margin: 20px;
font-size: 16px;
}
#canvas-container {
border: 2px dashed #8B4513;
border-radius: 10px;
padding: 10px;
}`;
      } else if (language === 'js') {
          mockedCode = `// Dog Animation Worker
self.onmessage = function(e) {
const { imageData, selectedRegions, value, value5, currentIteration, reset } = e.data;

// Create a copy of the image data
const newData = new ImageData(
  new Uint8ClampedArray(imageData.data),
  imageData.width,
  imageData.height
);

// Use the iteration value (if provided) or calculate a time-based value
const iteration = currentIteration !== undefined 
  ? currentIteration 
  : Math.floor(Date.now() / 40) % value5;

// Calculate the animation progress (0 to 1)
const progress = iteration / value5;

// If we have no image yet, draw some dogs!
if (!selectedRegions || selectedRegions.length === 0) {
  // Draw a simple dog silhouette
  drawDogs(newData, progress);
} else {
  // Process the selected regions with dog-like movements
  if (selectedRegions && selectedRegions.length > 0) {
    selectedRegions.forEach(region => {
      region.forEach(pixelIndex => {
        // Calculate the RGBA indices
        const i = pixelIndex * 4;
        
        // Create a wagging tail effect based on progress
        const wag = Math.sin(progress * Math.PI * 8 + pixelIndex * 0.001) * 20;
        
        // Apply dog-like colors (browns and tans)
        newData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + wag)); // R (more reddish)
        newData.data[i+1] = Math.max(0, Math.min(255, imageData.data[i+1] - wag/2)); // G (less green)
        newData.data[i+2] = Math.max(0, Math.min(255, imageData.data[i+2] - wag)); // B (less blue)
      });
    });
  }
}

// Send the processed image back to the main thread
self.postMessage({ 
  segmentedImages: [newData],
  progress: progress
});
};

// Function to draw dogs on the canvas when no image is provided
function drawDogs(imageData, progress) {
const width = imageData.width;
const height = imageData.height;

// Clear the canvas with a light blue background
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    imageData.data[i] = 200; // R
    imageData.data[i+1] = 230; // G
    imageData.data[i+2] = 255; // B
    imageData.data[i+3] = 255; // A
  }
}

// Draw a simple dog (or multiple dogs)
const numDogs = 3;
for (let d = 0; d < numDogs; d++) {
  // Dog position
  const dogX = width * (0.2 + d * 0.3);
  const dogY = height * 0.6;
  const dogSize = Math.min(width, height) * 0.15;
  
  // Dog body movement
  const bodyOffset = Math.sin(progress * Math.PI * 2 + d) * 5;
  
  // Draw dog body (brown ellipse)
  drawEllipse(
    imageData, 
    dogX + bodyOffset, 
    dogY, 
    dogSize * 1.5, 
    dogSize * 0.8, 
    139, 69, 19, 255
  );
  
  // Draw dog head (darker brown circle)
  drawCircle(
    imageData,
    dogX + dogSize * 1.2 + bodyOffset,
    dogY - dogSize * 0.3,
    dogSize * 0.7,
    101, 67, 33, 255
  );
  
  // Draw tail (wagging)
  const tailWag = Math.sin(progress * Math.PI * 8 + d * 2) * 0.5;
  drawTail(
    imageData,
    dogX - dogSize * 1.2 + bodyOffset,
    dogY - dogSize * 0.2,
    dogSize * 0.8,
    tailWag,
    139, 69, 19, 255
  );
  
  // Draw ears
  drawEllipse(
    imageData,
    dogX + dogSize * 1.4 + bodyOffset,
    dogY - dogSize * 0.8,
    dogSize * 0.4,
    dogSize * 0.6,
    101, 67, 33, 255
  );
  
  drawEllipse(
    imageData,
    dogX + dogSize * 1.0 + bodyOffset,
    dogY - dogSize * 0.8,
    dogSize * 0.4,
    dogSize * 0.6,
    101, 67, 33, 255
  );
  
  // Draw eyes
  const eyeBlink = Math.sin(progress * Math.PI * 0.5) > 0.9 ? 0.1 : 1;
  drawCircle(
    imageData,
    dogX + dogSize * 1.4 + bodyOffset,
    dogY - dogSize * 0.4,
    dogSize * 0.1,
    0, 0, 0, 255
  );
  
  drawEllipse(
    imageData,
    dogX + dogSize * 1.0 + bodyOffset,
    dogY - dogSize * 0.4,
    dogSize * 0.1,
    dogSize * 0.1 * eyeBlink,
    0, 0, 0, 255
  );
  
  // Draw snout
  drawEllipse(
    imageData,
    dogX + dogSize * 1.7 + bodyOffset,
    dogY - dogSize * 0.2,
    dogSize * 0.4,
    dogSize * 0.3,
    160, 82, 45, 255
  );
  
  // Draw nose
  drawCircle(
    imageData,
    dogX + dogSize * 1.9 + bodyOffset,
    dogY - dogSize * 0.25,
    dogSize * 0.1,
    0, 0, 0, 255
  );
  
  // Draw legs
  const legOffset = Math.sin(progress * Math.PI * 4 + d) * 3;
  
  // Front legs
  drawRect(
    imageData,
    dogX + dogSize * 0.7 + bodyOffset,
    dogY + dogSize * 0.6,
    dogSize * 0.2,
    dogSize * 0.8 + legOffset,
    139, 69, 19, 255
  );
  
  drawRect(
    imageData,
    dogX + dogSize * 1.1 + bodyOffset,
    dogY + dogSize * 0.6,
    dogSize * 0.2,
    dogSize * 0.8 - legOffset,
    139, 69, 19, 255
  );
  
  // Back legs
  drawRect(
    imageData,
    dogX - dogSize * 0.6 + bodyOffset,
    dogY + dogSize * 0.6,
    dogSize * 0.2,
    dogSize * 0.8 - legOffset,
    139, 69, 19, 255
  );
  
  drawRect(
    imageData,
    dogX - dogSize * 0.2 + bodyOffset,
    dogY + dogSize * 0.6,
    dogSize * 0.2,
    dogSize * 0.8 + legOffset,
    139, 69, 19, 255
  );
}
}

// Helper functions remain the same...
function drawCircle(imageData, centerX, centerY, radius, r, g, b, a) {
  const width = imageData.width;
  const radiusSquared = radius * radius;
  
  for (let y = Math.max(0, Math.floor(centerY - radius)); 
       y < Math.min(imageData.height, Math.ceil(centerY + radius)); 
       y++) {
    for (let x = Math.max(0, Math.floor(centerX - radius)); 
         x < Math.min(imageData.width, Math.ceil(centerX + radius)); 
         x++) {
      const distSquared = (x - centerX) * (x - centerX) + (y - centerY) * (y - centerY);
      if (distSquared <= radiusSquared) {
        const i = (y * width + x) * 4;
        imageData.data[i] = r;
        imageData.data[i+1] = g;
        imageData.data[i+2] = b;
        imageData.data[i+3] = a;
      }
    }
  }
}

function drawEllipse(imageData, centerX, centerY, radiusX, radiusY, r, g, b, a) {
  const width = imageData.width;
  
  for (let y = Math.max(0, Math.floor(centerY - radiusY)); 
       y < Math.min(imageData.height, Math.ceil(centerY + radiusY)); 
       y++) {
    for (let x = Math.max(0, Math.floor(centerX - radiusX)); 
         x < Math.min(imageData.width, Math.ceil(centerX + radiusX)); 
         x++) {
      const normalizedX = (x - centerX) / radiusX;
      const normalizedY = (y - centerY) / radiusY;
      const distSquared = normalizedX * normalizedX + normalizedY * normalizedY;
      
      if (distSquared <= 1) {
        const i = (y * width + x) * 4;
        imageData.data[i] = r;
        imageData.data[i+1] = g;
        imageData.data[i+2] = b;
        imageData.data[i+3] = a;
      }
    }
  }
}

function drawRect(imageData, x, y, width, height, r, g, b, a) {
  const imgWidth = imageData.width;
  
  for (let yy = Math.max(0, Math.floor(y)); 
       yy < Math.min(imageData.height, Math.ceil(y + height)); 
       yy++) {
    for (let xx = Math.max(0, Math.floor(x)); 
         xx < Math.min(imageData.width, Math.ceil(x + width)); 
         xx++) {
      const i = (yy * imgWidth + xx) * 4;
      imageData.data[i] = r;
      imageData.data[i+1] = g;
      imageData.data[i+2] = b;
      imageData.data[i+3] = a;
    }
  }
}

function drawTail(imageData, x, y, length, wag, r, g, b, a) {
  const width = imageData.width;
  const tailThickness = length * 0.3;
  
  // Calculate the tail curve
  const tailEndX = x - length * Math.cos(wag);
  const tailEndY = y - length * Math.sin(wag);
  
  // Draw a line from start to end
  const steps = Math.ceil(length * 2);
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const currentX = x + (tailEndX - x) * t;
    const currentY = y + (tailEndY - y) * t;
    
    // Draw a circle at this point
    const radius = tailThickness * (1 - t * 0.7); // Tail gets thinner
    drawCircle(imageData, currentX, currentY, radius, r, g, b, a);
  }
}`;
      }
      
      // Use the typing effect to add the code
      typeIntoEditor(editor, mockedCode, () => {
        // Trigger localStorage save after typing is complete
        editor.dispatchEvent(new Event('input'));
        
        // Run the code to see changes
        document.getElementById('runCode').click();
      });
      
      // Deduct credits if using creator's API - always deduct
      if (useCreatorApiKey) {
          const newCredits = credits - 1;
          localStorage.setItem('credits', newCredits);
          document.getElementById('creditCount').textContent = `${newCredits} credits`;
      }
      
      // Show success message with animation
      outputArea.innerHTML = `<div style="color: var(--success-color); padding: 10px; border-radius: 4px; background: rgba(0,255,0,0.1); transition: opacity 0.3s ease-in-out;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Successfully generated ${language.toUpperCase()} code with ${provider}
      </div>`;
  }, 1500);
}

updateApiStatus();

const savedCredits = localStorage.getItem('credits');
if (savedCredits) {
  document.getElementById('creditCount').textContent = `${savedCredits} credits`;
} else {
  // Initialize with 0 credits instead of 10
  localStorage.setItem('credits', '0');
  document.getElementById('creditCount').textContent = '0 credits';
}

updateApiStatus();

if (savedCredits) {
    document.getElementById('creditCount').textContent = `${savedCredits} credits`;
}