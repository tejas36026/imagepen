// document.addEventListener('DOMContentLoaded', function() {
//   // Create and add resize handles
//   createResizeHandles();
  
//   // Initialize the resizers
//   initializeResizers();
// });

// function createResizeHandles() {
//   // 1. Add horizontal resize handle between viewers and editors
//   const viewersContainer = document.querySelector('.viewers-container');
//   const editorsContainer = document.querySelector('.editors-container');
  
//   if (viewersContainer && editorsContainer) {
//     const horizontalResizer = document.createElement('div');
//     horizontalResizer.className = 'resizer horizontal-resizer';
//     horizontalResizer.id = 'main-horizontal-resizer';
//     document.body.appendChild(horizontalResizer);
    
//     // Position the horizontal resizer
//     const viewersRect = viewersContainer.getBoundingClientRect();
//     horizontalResizer.style.left = viewersRect.right + 'px';
//     horizontalResizer.style.top = '50px'; // Below header
//     horizontalResizer.style.bottom = '0';
//   }
  
//   // 2. Add vertical resizers between editor columns
//   addVerticalResizer('.html-column', 'html-css-resizer');
//   addVerticalResizer('.css-column', 'css-js-resizer');
  
//   // 3. Add vertical resizer between viewer columns
//   addVerticalResizer('.html-viewer-column', 'viewer-resizer');
// }

// function addVerticalResizer(beforeSelector, id) {
//   const beforeElement = document.querySelector(beforeSelector);
//   if (beforeElement) {
//     const verticalResizer = document.createElement('div');
//     verticalResizer.className = 'resizer vertical-resizer';
//     verticalResizer.id = id;
    
//     const parentElement = beforeElement.parentElement;
    
//     // Insert the resizer after the specified element
//     if (beforeElement.nextElementSibling) {
//       parentElement.insertBefore(verticalResizer, beforeElement.nextElementSibling);
//     } else {
//       parentElement.appendChild(verticalResizer);
//     }
//   }
// }

// function initializeResizers() {
//   // Initialize horizontal resizer
//   const horizontalResizer = document.getElementById('main-horizontal-resizer');
//   if (horizontalResizer) {
//     horizontalResizer.addEventListener('mousedown', function(e) {
//       startResize(e, 'horizontal');
//     });
//   }
  
//   // Initialize vertical resizers
//   const verticalResizers = document.querySelectorAll('.vertical-resizer');
//   verticalResizers.forEach(resizer => {
//     resizer.addEventListener('mousedown', function(e) {
//       startResize(e, 'vertical', resizer.id);
//     });
//   });
// }

// function startResize(e, direction, resizerId) {
//   e.preventDefault();
  
//   const startPosition = direction === 'horizontal' ? e.clientX : e.clientY;
  
//   // Store the initial sizes
//   let leftElement, rightElement, topElement, bottomElement;
//   let initialLeftWidth, initialRightWidth, initialTopHeight, initialBottomHeight;
  
//   if (direction === 'horizontal') {
//     leftElement = document.querySelector('.viewers-container');
//     rightElement = document.querySelector('.editors-container');
    
//     initialLeftWidth = leftElement.offsetWidth;
//     initialRightWidth = rightElement.offsetWidth;
//   } else {
//     // For vertical resizing, determine which columns to resize based on resizer ID
//     if (resizerId === 'html-css-resizer') {
//       topElement = document.querySelector('.html-column');
//       bottomElement = document.querySelector('.css-column');
//     } else if (resizerId === 'css-js-resizer') {
//       topElement = document.querySelector('.css-column');
//       bottomElement = document.querySelector('.js-column');
//     } else if (resizerId === 'viewer-resizer') {
//       topElement = document.querySelector('.html-viewer-column');
//       bottomElement = document.querySelector('.css-js-viewer-column');
//     }
    
//     if (topElement && bottomElement) {
//       initialTopHeight = topElement.offsetHeight;
//       initialBottomHeight = bottomElement.offsetHeight;
//     }
//   }
  
//   // Handle mouse movement
//   function handleMouseMove(e) {
//     if (direction === 'horizontal') {
//       const dx = e.clientX - startPosition;
      
//       // Calculate new widths (ensure they don't go below minimum width)
//       const newLeftWidth = Math.max(100, initialLeftWidth + dx);
//       const newRightWidth = Math.max(100, initialRightWidth - dx);
      
//       // Apply the new widths
//       leftElement.style.width = newLeftWidth + 'px';
//       rightElement.style.width = newRightWidth + 'px';
      
//       // Update the resizer position
//       document.getElementById('main-horizontal-resizer').style.left = 
//         (leftElement.getBoundingClientRect().right) + 'px';
      
//     } else if (topElement && bottomElement) {
//       const dy = e.clientY - startPosition;
      
//       // Calculate new heights (ensure they don't go below minimum height)
//       const newTopHeight = Math.max(50, initialTopHeight + dy);
//       const newBottomHeight = Math.max(50, initialBottomHeight - dy);
      
//       // Apply the new heights
//       topElement.style.height = newTopHeight + 'px';
//       bottomElement.style.height = newBottomHeight + 'px';
//     }
//   }
  
//   // Handle mouse up
//   function handleMouseUp() {
//     document.removeEventListener('mousemove', handleMouseMove);
//     document.removeEventListener('mouseup', handleMouseUp);
//     document.body.classList.remove('resizing');
//   }
  
//   // Add the event listeners
//   document.addEventListener('mousemove', handleMouseMove);
//   document.addEventListener('mouseup', handleMouseUp);
//   document.body.classList.add('resizing');
// }

// // Add styles for resizers
// function addResizerStyles() {
//   const style = document.createElement('style');
//   style.textContent = `
//     .resizer {
//       position: absolute;
//       z-index: 100;
//       background-color: var(--border-color);
//       transition: background-color 0.2s;
//     }
    
//     .horizontal-resizer {
//       cursor: col-resize;
//       width: 5px;
//       top: 50px; /* Below header */
//       bottom: 0;
//     }
    
//     .vertical-resizer {
//       cursor: row-resize;
//       height: 5px;
//       left: 0;
//       right: 0;
//       margin: -2.5px 0;
//     }
    
//     .resizer:hover,
//     body.resizing .resizer {
//       background-color: var(--color-primary-01);
//     }
    
//     body.resizing {
//       cursor: grabbing;
//       user-select: none;
//     }
    
//     body.resizing * {
//       pointer-events: none;
//     }
//   `;
//   document.head.appendChild(style);
// }

// // Call this function to add the styles
// addResizerStyles();

// // Function to update resizer positions when container visibility changes
// window.updateResizers = function() {
//   // Horizontal resizer
//   const viewersContainer = document.querySelector('.viewers-container');
//   const horizontalResizer = document.getElementById('main-horizontal-resizer');
  
//   if (viewersContainer && horizontalResizer) {
//     horizontalResizer.style.left = viewersContainer.getBoundingClientRect().right + 'px';
//   }
  
//   // Vertical resizers positions would update automatically with the DOM flow
// };