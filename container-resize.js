document.addEventListener('DOMContentLoaded', function() {
    initializeContainerResizers();
});

function initializeContainerResizers() {
    // Initialize resizers for the editor columns
    createContainerResizer('.editor-column:not(:last-child)', 'horizontal');
    
    // Initialize resizer between editors and viewers
    createResizer('.editors-container', '.viewers-container', 'vertical');
    
    // Initialize resizer between HTML viewer and CSS/JS viewer
    createContainerResizer('.html-viewer-column', 'horizontal');
}

/**
 * Creates a resizer for containers that share a common parent
 * @param {string} selectorStr - CSS selector for the containers that need resizers
 * @param {string} direction - 'horizontal' or 'vertical'
 */
function createContainerResizer(selectorStr, direction) {
    const containers = document.querySelectorAll(selectorStr);
    
    containers.forEach(container => {
        const resizer = document.createElement('div');
        resizer.className = `resizer ${direction}-resizer`;
        
        // Create arrow controls for the resizer
        const leftArrow = document.createElement('div');
        leftArrow.className = 'resizer-arrow left-arrow';
        leftArrow.innerHTML = '◀';
        
        const rightArrow = document.createElement('div');
        rightArrow.className = 'resizer-arrow right-arrow';
        rightArrow.innerHTML = '▶';
        
        resizer.appendChild(leftArrow);
        resizer.appendChild(rightArrow);
        
        // Apply styles to resizer and arrows
        applyResizerStyles(resizer, direction, container);
        applyArrowStyles(leftArrow, rightArrow);
        
        container.appendChild(resizer);
        
        // Set up the resizer event handlers
        setupResizerEvents(resizer, container, direction);
        
        // Set up arrow controls event handlers
        setupArrowControls(leftArrow, rightArrow, container, direction);
    });
}

/**
 * Creates a resizer between two specific containers
 * @param {string} firstSelector - CSS selector for the first container
 * @param {string} secondSelector - CSS selector for the second container
 * @param {string} direction - 'horizontal' or 'vertical'
 */
function createResizer(firstSelector, secondSelector, direction) {
    const firstContainer = document.querySelector(firstSelector);
    const secondContainer = document.querySelector(secondSelector);
    
    if (!firstContainer || !secondContainer) return;
    
    const resizer = document.createElement('div');
    resizer.className = `resizer ${direction}-resizer between-containers`;
    
    // Create arrow controls for the resizer
    const upArrow = document.createElement('div');
    upArrow.className = 'resizer-arrow up-arrow';
    upArrow.innerHTML = '▲';
    
    const downArrow = document.createElement('div');
    downArrow.className = 'resizer-arrow down-arrow';
    downArrow.innerHTML = '▼';
    
    resizer.appendChild(upArrow);
    resizer.appendChild(downArrow);
    
    // Apply styles to resizer and arrows
    applyResizerStyles(resizer, direction);
    applyArrowStyles(upArrow, downArrow);
    
    // Position the resizer between the two containers
    firstContainer.after(resizer);
    
    // Set up the resizer event handlers
    setupBetweenContainersResizerEvents(resizer, firstContainer, secondContainer, direction);
    
    // Set up arrow controls event handlers
    setupBetweenContainersArrowControls(upArrow, downArrow, firstContainer, secondContainer, direction);
}

/**
 * Apply styles to the resizer element
 * @param {HTMLElement} resizer - The resizer element
 * @param {string} direction - 'horizontal' or 'vertical'
 * @param {HTMLElement} container - The container (optional)
 */
function applyResizerStyles(resizer, direction, container) {
    // Common styles
    resizer.style.position = 'absolute';
    resizer.style.zIndex = '100';
    resizer.style.backgroundColor = 'var(--border-color)';
    resizer.style.display = 'flex';
    resizer.style.justifyContent = 'center';
    resizer.style.alignItems = 'center';
    
    if (direction === 'horizontal') {
        resizer.style.width = '1.6px'; // Reduced to 1/5th of 8px
        resizer.style.top = '0';
        resizer.style.bottom = '0';
        resizer.style.cursor = 'col-resize';
        resizer.style.flexDirection = 'column';
        
        // Check if this is a viewer column to position in the middle
        if (container && (container.classList.contains('html-viewer-column') || 
                          container.classList.contains('css-viewer-column'))) {
            // Position in the middle (at the right edge of the container)
            resizer.style.right = '0';
            resizer.style.transform = 'translateX(50%)';
        } else {
            // Default position at the right edge
            resizer.style.right = '0';
        }
    } else { // vertical
        resizer.style.height = '1.6px'; // Reduced to 1/5th of 8px
        resizer.style.left = '0';
        resizer.style.right = '0';
        resizer.style.bottom = '0';
        resizer.style.cursor = 'row-resize';
        resizer.style.flexDirection = 'row';
    }
    
    // Special style for between-containers
    if (resizer.classList.contains('between-containers')) {
        if (direction === 'vertical') {
            resizer.style.position = 'relative';
            resizer.style.bottom = 'auto';
            resizer.style.margin = '0';
        }
    }
}

/**
 * Apply styles to the arrow controls
 * @param {HTMLElement} firstArrow - First arrow element
 * @param {HTMLElement} secondArrow - Second arrow element
 */
function applyArrowStyles(firstArrow, secondArrow) {
    // Common styles for both arrows
    const arrows = [firstArrow, secondArrow];
    arrows.forEach(arrow => {
        arrow.style.width = '3.6px'; // Reduced to 1/5th of 18px
        arrow.style.height = '3.6px'; // Reduced to 1/5th of 18px
        arrow.style.display = 'flex';
        arrow.style.justifyContent = 'center';
        arrow.style.alignItems = 'center';
        arrow.style.backgroundColor = 'var(--bg-medium)';
        arrow.style.borderRadius = '50%';
        arrow.style.margin = '0.4px'; // Reduced to 1/5th of 2px
        arrow.style.cursor = 'pointer';
        arrow.style.fontSize = '2px'; // Reduced to 1/5th of 10px
        arrow.style.userSelect = 'none';
        
        // Hover effect
        arrow.onmouseover = function() {
            this.style.backgroundColor = 'var(--primary-color)';
        };
        arrow.onmouseout = function() {
            this.style.backgroundColor = 'var(--bg-medium)';
        };
    });
}

/**
 * Set up the resizer events for containers in the same parent
 * @param {HTMLElement} resizer - The resizer element
 * @param {HTMLElement} container - The container to resize
 * @param {string} direction - 'horizontal' or 'vertical'
 */
function setupResizerEvents(resizer, container, direction) {
    let startPos, startSize, nextSibling;
    
    resizer.addEventListener('mousedown', function(e) {
        e.preventDefault();
        startPos = direction === 'horizontal' ? e.clientX : e.clientY;
        
        // Get the initial size and the next sibling
        nextSibling = container.nextElementSibling;
        
        // Get the flex basis value or compute the size
        if (direction === 'horizontal') {
            startSize = container.offsetWidth;
            const nextSize = nextSibling ? nextSibling.offsetWidth : 0;
            const parentSize = container.parentElement.offsetWidth;
            const totalSize = startSize + nextSize;
            
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
            
            function resize(e) {
                const delta = e.clientX - startPos;
                
                // Calculate new sizes while maintaining total
                const newSize = Math.max(50, Math.min(parentSize - 50, startSize + delta));
                
                if (nextSibling) {
                    const newNextSize = totalSize - newSize;
                    if (newNextSize < 50) return;
                    
                    container.style.flex = `0 0 ${newSize}px`;
                    nextSibling.style.flex = `0 0 ${newNextSize}px`;
                } else {
                    container.style.flex = `0 0 ${newSize}px`;
                }
            }
        } else { // vertical
            // Handle vertical resizing if needed
        }
        
        function stopResize() {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
        }
    });
}

/**
 * Set up the resizer events between two specific containers
 * @param {HTMLElement} resizer - The resizer element
 * @param {HTMLElement} firstContainer - The first container
 * @param {HTMLElement} secondContainer - The second container
 * @param {string} direction - 'horizontal' or 'vertical'
 */
function setupBetweenContainersResizerEvents(resizer, firstContainer, secondContainer, direction) {
    let startPos, firstStartHeight, secondStartHeight;
    
    resizer.addEventListener('mousedown', function(e) {
        e.preventDefault();
        startPos = e.clientY;
        firstStartHeight = firstContainer.offsetHeight;
        secondStartHeight = secondContainer.offsetHeight;
        
        // Total available height (minus any other elements)
        const totalHeight = firstStartHeight + secondStartHeight;
        
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
        
        function resize(e) {
            const delta = e.clientY - startPos;
            
            // Calculate new heights (enforce minimum height)
            const newFirstHeight = Math.max(50, Math.min(totalHeight - 50, firstStartHeight + delta));
            const newSecondHeight = totalHeight - newFirstHeight;
            
            // Apply the new heights
            firstContainer.style.height = `${newFirstHeight}px`;
            secondContainer.style.height = `${newSecondHeight}px`;
        }
        
        function stopResize() {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
        }
    });
}

/**
 * Set up the arrow control events for containers in the same parent
 * @param {HTMLElement} leftArrow - The left/up arrow element
 * @param {HTMLElement} rightArrow - The right/down arrow element
 * @param {HTMLElement} container - The container to resize
 * @param {string} direction - 'horizontal' or 'vertical'
 */
function setupArrowControls(leftArrow, rightArrow, container, direction) {
    const nextSibling = container.nextElementSibling;
    if (!nextSibling) return;
    
    // Resize amount per click
    const resizeStep = 50;
    
    // Left/up arrow decreases container size
    leftArrow.addEventListener('click', function(e) {
        e.stopPropagation();
        
        if (direction === 'horizontal') {
            const currentWidth = container.offsetWidth;
            const nextWidth = nextSibling.offsetWidth;
            
            if (currentWidth <= 50) return;
            
            const newWidth = currentWidth - resizeStep;
            const newNextWidth = nextWidth + resizeStep;
            
            container.style.flex = `0 0 ${newWidth}px`;
            nextSibling.style.flex = `0 0 ${newNextWidth}px`;
        } else {
            // Handle vertical resizing if needed
        }
    });
    
    // Right/down arrow increases container size
    rightArrow.addEventListener('click', function(e) {
        e.stopPropagation();
        
        if (direction === 'horizontal') {
            const currentWidth = container.offsetWidth;
            const nextWidth = nextSibling.offsetWidth;
            
            if (nextWidth <= 50) return;
            
            const newWidth = currentWidth + resizeStep;
            const newNextWidth = nextWidth - resizeStep;
            
            container.style.flex = `0 0 ${newWidth}px`;
            nextSibling.style.flex = `0 0 ${newNextWidth}px`;
        } else {
            // Handle vertical resizing if needed
        }
    });
}

/**
 * Set up the arrow control events between two specific containers
 * @param {HTMLElement} upArrow - The up arrow element
 * @param {HTMLElement} downArrow - The down arrow element
 * @param {HTMLElement} firstContainer - The first container
 * @param {HTMLElement} secondContainer - The second container
 * @param {string} direction - 'horizontal' or 'vertical'
 */
function setupBetweenContainersArrowControls(upArrow, downArrow, firstContainer, secondContainer, direction) {
    // Resize amount per click
    const resizeStep = 50;
    
    // Up arrow decreases first container height
    upArrow.addEventListener('click', function(e) {
        e.stopPropagation();
        
        const firstHeight = firstContainer.offsetHeight;
        const secondHeight = secondContainer.offsetHeight;
        
        if (firstHeight <= 50) return;
        
        const newFirstHeight = firstHeight - resizeStep;
        const newSecondHeight = secondHeight + resizeStep;
        
        firstContainer.style.height = `${newFirstHeight}px`;
        secondContainer.style.height = `${newSecondHeight}px`;
    });
    
    // Down arrow increases first container height
    downArrow.addEventListener('click', function(e) {
        e.stopPropagation();
        
        const firstHeight = firstContainer.offsetHeight;
        const secondHeight = secondContainer.offsetHeight;
        
        if (secondHeight <= 50) return;
        
        const newFirstHeight = firstHeight + resizeStep;
        const newSecondHeight = secondHeight - resizeStep;
        
        firstContainer.style.height = `${newFirstHeight}px`;
        secondContainer.style.height = `${newSecondHeight}px`;
    });
}

// CSS injection for the resizers
(function injectResizerCSS() {
    const style = document.createElement('style');
    style.textContent = `
        /* Resizer styles */
        .resizer {
            transition: background-color 0.2s;
        }
        
        .resizer:hover {
            background-color: var(--primary-color) !important;
        }
        
        .horizontal-resizer {
            box-shadow: 0.2px 0 0.6px rgba(0, 0, 0, 0.2); /* Reduced shadow */
        }
        
        .vertical-resizer {
            box-shadow: 0 0.2px 0.6px rgba(0, 0, 0, 0.2); /* Reduced shadow */
        }
        
        .resizer-arrow {
            transition: background-color 0.2s, color 0.2s;
        }
        
        .resizer-arrow:hover {
            color: white;
        }
        
        /* Responsive behavior */
        @media (max-width: 768px) {
            .horizontal-resizer {
                display: none !important;
            }
            
            .vertical-resizer.between-containers {
                height: 3.2px !important; /* Reduced to 1/5th of 16px */
            }
        }
    `;
    document.head.appendChild(style);
})();