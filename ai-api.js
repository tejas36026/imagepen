// ai-api.js
const htmlDeepseekBtn = document.getElementById('htmlDeepseekBtn');
const cssDeepseekBtn = document.getElementById('cssDeepseekBtn');
const jsDeepseekBtn = document.getElementById('jsDeepseekBtn');

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
  
  // Show loading state
  outputArea.innerHTML = `Calling ${provider} API for ${language.toUpperCase()} code...`;

  // Make API call...
  fetch('http://127.0.0.1:5000/generate-code', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          language: language,
          htmlCode: htmlCode,
          cssCode: cssCode,
          jsCode: jsCode,
          prompt: userPrompt || "Enhance this code with best practices and optimizations"
      }),
  })
  .then(response => {
      console.log("Response received:", response.status);
      return response.json();
  })
  .then(data => {
      console.log("Data received:", data);
      
      let cleanedCode = data.generatedCode;
      
      // Remove markdown code block syntax if present
      cleanedCode = cleanedCode.replace(/^```(javascript|js|html|css)\n/i, '');
      cleanedCode = cleanedCode.replace(/\n```$/i, '');
      
      // Update the editor with the cleaned generated code
      editor.value = cleanedCode;
      
      // Trigger localStorage save
      editor.dispatchEvent(new Event('input'));
      
      // Always deduct credits when using the creator's API
      if (useCreatorApiKey) {
          const newCredits = Math.max(0, credits - 1);
          localStorage.setItem('credits', newCredits);
          document.getElementById('creditCount').textContent = `${newCredits} credits`;
          
          // If credits reach 0, show purchase modal
          if (newCredits === 0) {
              setTimeout(() => {
                  document.getElementById('creditsModal').style.display = 'flex';
              }, 500);
          }
      }
      
      // Show success message
      outputArea.innerHTML = `Successfully generated ${language.toUpperCase()} code with ${provider}`;
      
      // Run the code to see changes
      document.getElementById('runCode').click();
  })
  .catch(error => {
      console.error('Error calling API:', error);
      outputArea.innerHTML = `Error: ${error.message}`;
      
      // Only use mock response if we have credits when using creator API
      if (!useCreatorApiKey || (useCreatorApiKey && credits > 0)) {
          mockAiResponse(language, provider, editor, outputArea, credits);
      } else {
          outputArea.innerHTML = `<div style="color: #ff5252; font-weight: bold;">You need to purchase credits to use this feature.</div>`;
          document.getElementById('creditsModal').style.display = 'flex';
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
  setTimeout(() => {
      // Update the editor with the "AI-generated" code
      if (language === 'html') {
          editor.value = `<div>
<h1>Dog Animation Showcase</h1>
<p>This is a sample dog animation demo</p>
<div id="canvas-container"></div>
</div>`;
      } else if (language === 'css') {
          editor.value = `h1 {
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
          editor.value = `// Dog Animation Worker
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
      
      // Trigger localStorage save
      editor.dispatchEvent(new Event('input'));
      
      // Deduct credits if using creator's API - always deduct
      if (useCreatorApiKey) {
          const newCredits = credits - 1;
          localStorage.setItem('credits', newCredits);
          document.getElementById('creditCount').textContent = `${newCredits} credits`;
      }
      
      // Show success message
      outputArea.innerHTML = `Successfully generated ${language.toUpperCase()} code with ${provider} (mock response)`;
      
      // Run the code to see changes
      document.getElementById('runCode').click();
  }, 1500);
}

// Initialize API status on page load
updateApiStatus();

// Initialize credit count - start with 0 instead of 10
const savedCredits = localStorage.getItem('credits');
if (savedCredits) {
  document.getElementById('creditCount').textContent = `${savedCredits} credits`;
} else {
  // Initialize with 0 credits instead of 10
  localStorage.setItem('credits', '0');
  document.getElementById('creditCount').textContent = '0 credits';
}

// Initialize API status on page load
updateApiStatus();

// Initialize credit count
// const savedCredits = localStorage.getItem('credits');
if (savedCredits) {
    document.getElementById('creditCount').textContent = `${savedCredits} credits`;
}