document.addEventListener('DOMContentLoaded', () => {
    const TRACKING_STORAGE_KEY = 'userBehaviorTrackingData';

    // --- Chart Instances (Global) ---
    let activityChartInstance = null;
    let errorChartInstance = null;

    // --- Element References ---
    const totalTimeEl = document.getElementById('totalTime');
    const sessionStartEl = document.getElementById('sessionStart');
    const htmlKeystrokesEl = document.getElementById('htmlKeystrokes');
    const cssKeystrokesEl = document.getElementById('cssKeystrokes');
    const jsKeystrokesEl = document.getElementById('jsKeystrokes');
    const totalEditsEl = document.getElementById('totalEdits');
    const avgEditSizeEl = document.getElementById('avgEditSize');
    const htmlFocusTimeEl = document.getElementById('htmlFocusTime');
    const cssFocusTimeEl = document.getElementById('cssFocusTime');
    const jsFocusTimeEl = document.getElementById('jsFocusTime');
    const mainAIAttemptsEl = document.getElementById('mainAIAttempts');
    const htmlAIAttemptsEl = document.getElementById('htmlAIAttempts');
    const cssAIAttemptsEl = document.getElementById('cssAIAttempts');
    const jsAIAttemptsEl = document.getElementById('jsAIAttempts');
    const promptsUsedCountEl = document.getElementById('promptsUsedCount');
    const apiKeyModalOpensEl = document.getElementById('apiKeyModalOpens');
    const apiKeySavesEl = document.getElementById('apiKeySaves');
    const usedCreatorKeyEl = document.getElementById('usedCreatorKey');
    const modelPreferenceEl = document.getElementById('modelPreference');
    const previewRefreshesEl = document.getElementById('previewRefreshes');
    const avgEditRefreshTimeEl = document.getElementById('avgEditRefreshTime');
    const consoleFocusRatioEl = document.getElementById('consoleFocusRatio');
    const imageUploadClicksEl = document.getElementById('imageUploadClicks');
    const imageUploadsEl = document.getElementById('imageUploads');
    const libraryOpensEl = document.getElementById('libraryOpens');
    const librarySearchesEl = document.getElementById('librarySearches');
    const librariesLoadedEl = document.getElementById('librariesLoaded');
    const fullscreenTogglesEl = document.getElementById('fullscreenToggles');
    const fullscreenTimeEl = document.getElementById('fullscreenTime');
    const layoutTogglesEl = document.getElementById('layoutToggles');
    const hamburgerOpensEl = document.getElementById('hamburgerOpens');
    const wikiModalOpensEl = document.getElementById('wikiModalOpens');
    const flashcardFlipsEl = document.getElementById('flashcardFlips');
    const quizInteractionsEl = document.getElementById('quizInteractions');
    const quizChecksEl = document.getElementById('quizChecks');
    const jsErrorsEl = document.getElementById('jsErrors');
    const workerErrorsEl = document.getElementById('workerErrors');
    const refreshButton = document.getElementById('refreshData');
    const activityChartCanvas = document.getElementById('activityChart').getContext('2d');
    const errorChartCanvas = document.getElementById('errorChart').getContext('2d');
    const downloadBtn = document.getElementById('downloadReport');

    downloadBtn.addEventListener('click', () => {
        console.log("Download button clicked"); // For debugging
        try {
            const reportData = gatherReportDataForDownload();
            const csvContent = formatDataAsCsv(reportData);
            downloadFile(csvContent, `user_behavior_report_${getTimestamp()}.csv`, 'text/csv;charset=utf-8;');
        } catch (error) {
            console.error("Error generating or downloading report:", error);
            alert("Could not generate the report. Please check the console for errors.");
        }
    });

    function getTimestamp() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}_${hours}${minutes}${seconds}`;
    }

    function gatherReportDataForDownload() {
        const reportData = {};
        // Define the metrics to capture: [key in reportData, elementId, CSV Label]
        const metricsToCapture = [
            ['reportGenerated', null, 'Report Generated At'], // Special case handled below
            ['totalTime', 'totalTime', 'Session Overview - Total Time Spent'],
            ['sessionStart', 'sessionStart', 'Session Overview - Session Start'],
            ['htmlKeystrokes', 'htmlKeystrokes', 'Editing Activity - HTML Keystrokes'],
            ['cssKeystrokes', 'cssKeystrokes', 'Editing Activity - CSS Keystrokes'],
            ['jsKeystrokes', 'jsKeystrokes', 'Editing Activity - JS Keystrokes'],
            ['totalEdits', 'totalEdits', 'Editing Activity - Total Edits'],
            ['avgEditSize', 'avgEditSize', 'Editing Activity - Avg. Edit Size'],
            ['htmlFocusTime', 'htmlFocusTime', 'Time Allocation - HTML Focus'],
            ['cssFocusTime', 'cssFocusTime', 'Time Allocation - CSS Focus'],
            ['jsFocusTime', 'jsFocusTime', 'Time Allocation - JS Focus'],
            ['mainAIAttempts', 'mainAIAttempts', 'AI Generation - Main Attempts'],
            ['htmlAIAttempts', 'htmlAIAttempts', 'AI Generation - HTML AI'],
            ['cssAIAttempts', 'cssAIAttempts', 'AI Generation - CSS AI'],
            ['jsAIAttempts', 'jsAIAttempts', 'AI Generation - JS AI'],
            ['promptsUsedCount', 'promptsUsedCount', 'AI Generation - Prompts Used'],
            ['apiKeyModalOpens', 'apiKeyModalOpens', 'API Configuration - Modal Opens'],
            ['apiKeySaves', 'apiKeySaves', 'API Configuration - Saves'],
            ['usedCreatorKey', 'usedCreatorKey', 'API Configuration - Used Creator Key'],
            ['modelPreference', 'modelPreference', 'API Configuration - Model Pref'],
            ['previewRefreshes', 'previewRefreshes', 'Preview & Debugging - Preview Refreshes'],
            ['avgEditRefreshTime', 'avgEditRefreshTime', 'Preview & Debugging - Avg. Time Edit-Refresh'],
            ['consoleFocusRatio', 'consoleFocusRatio', 'Preview & Debugging - Console Tab Focus'],
            ['imageUploadClicks', 'imageUploadClicks', 'Image Handling - Upload Button Clicks'],
            ['imageUploads', 'imageUploads', 'Image Handling - Successful Uploads'],
            ['libraryOpens', 'libraryOpens', 'JS Library Use - Dropdown Opens'],
            ['librarySearches', 'librarySearches', 'JS Library Use - Searches Performed'],
            ['librariesLoaded', 'librariesLoaded', 'JS Library Use - Libraries Loaded'],
            ['fullscreenToggles', 'fullscreenToggles', 'UI & Layout - Fullscreen Toggles'],
            ['fullscreenTime', 'fullscreenTime', 'UI & Layout - Time in Fullscreen'],
            ['layoutToggles', 'layoutToggles', 'UI & Layout - Advanced Layout Toggles'],
            ['hamburgerOpens', 'hamburgerOpens', 'UI & Layout - Hamburger Opens'],
            ['wikiModalOpens', 'wikiModalOpens', 'Learning Tools - Wiki/Quiz Opens'],
            ['flashcardFlips', 'flashcardFlips', 'Learning Tools - Flashcard Flips'],
            ['quizInteractions', 'quizInteractions', 'Learning Tools - Quiz Interactions'],
            ['quizChecks', 'quizChecks', 'Learning Tools - Quiz Checks'],
            ['jsErrors', 'jsErrors', 'Session Health - JS Errors'],
            ['workerErrors', 'workerErrors', 'Session Health - Worker Errors'],
        ];

        // Add generation timestamp
        reportData['reportGenerated'] = new Date().toLocaleString();

        metricsToCapture.forEach(([key, id, _label]) => {
            if (id) { // Skip null IDs like the timestamp placeholder
                const element = document.getElementById(id);
                reportData[key] = element ? element.textContent.trim() : 'N/A';
            }
        });

        // Note: This basic version doesn't capture chart data.
        // Exporting chart data would require accessing the Chart.js instances and their data.
        console.log("Gathered data:", reportData); // For debugging
        return reportData;
    }

    function formatDataAsCsv(data) {
         // Use the labels defined in metricsToCapture for the CSV rows, maintaining order
        const metricsOrder = [
            ['reportGenerated', null, 'Report Generated At'],
            ['totalTime', 'totalTime', 'Session Overview - Total Time Spent'],
            ['sessionStart', 'sessionStart', 'Session Overview - Session Start'],
            ['htmlKeystrokes', 'htmlKeystrokes', 'Editing Activity - HTML Keystrokes'],
            ['cssKeystrokes', 'cssKeystrokes', 'Editing Activity - CSS Keystrokes'],
            ['jsKeystrokes', 'jsKeystrokes', 'Editing Activity - JS Keystrokes'],
            ['totalEdits', 'totalEdits', 'Editing Activity - Total Edits'],
            ['avgEditSize', 'avgEditSize', 'Editing Activity - Avg. Edit Size'],
            ['htmlFocusTime', 'htmlFocusTime', 'Time Allocation - HTML Focus'],
            ['cssFocusTime', 'cssFocusTime', 'Time Allocation - CSS Focus'],
            ['jsFocusTime', 'jsFocusTime', 'Time Allocation - JS Focus'],
            ['mainAIAttempts', 'mainAIAttempts', 'AI Generation - Main Attempts'],
            ['htmlAIAttempts', 'htmlAIAttempts', 'AI Generation - HTML AI'],
            ['cssAIAttempts', 'cssAIAttempts', 'AI Generation - CSS AI'],
            ['jsAIAttempts', 'jsAIAttempts', 'AI Generation - JS AI'],
            ['promptsUsedCount', 'promptsUsedCount', 'AI Generation - Prompts Used'],
            ['apiKeyModalOpens', 'apiKeyModalOpens', 'API Configuration - Modal Opens'],
            ['apiKeySaves', 'apiKeySaves', 'API Configuration - Saves'],
            ['usedCreatorKey', 'usedCreatorKey', 'API Configuration - Used Creator Key'],
            ['modelPreference', 'modelPreference', 'API Configuration - Model Pref'],
            ['previewRefreshes', 'previewRefreshes', 'Preview & Debugging - Preview Refreshes'],
            ['avgEditRefreshTime', 'avgEditRefreshTime', 'Preview & Debugging - Avg. Time Edit-Refresh'],
            ['consoleFocusRatio', 'consoleFocusRatio', 'Preview & Debugging - Console Tab Focus'],
            ['imageUploadClicks', 'imageUploadClicks', 'Image Handling - Upload Button Clicks'],
            ['imageUploads', 'imageUploads', 'Image Handling - Successful Uploads'],
            ['libraryOpens', 'libraryOpens', 'JS Library Use - Dropdown Opens'],
            ['librarySearches', 'librarySearches', 'JS Library Use - Searches Performed'],
            ['librariesLoaded', 'librariesLoaded', 'JS Library Use - Libraries Loaded'],
            ['fullscreenToggles', 'fullscreenToggles', 'UI & Layout - Fullscreen Toggles'],
            ['fullscreenTime', 'fullscreenTime', 'UI & Layout - Time in Fullscreen'],
            ['layoutToggles', 'layoutToggles', 'UI & Layout - Advanced Layout Toggles'],
            ['hamburgerOpens', 'hamburgerOpens', 'UI & Layout - Hamburger Opens'],
            ['wikiModalOpens', 'wikiModalOpens', 'Learning Tools - Wiki/Quiz Opens'],
            ['flashcardFlips', 'flashcardFlips', 'Learning Tools - Flashcard Flips'],
            ['quizInteractions', 'quizInteractions', 'Learning Tools - Quiz Interactions'],
            ['quizChecks', 'quizChecks', 'Learning Tools - Quiz Checks'],
            ['jsErrors', 'jsErrors', 'Session Health - JS Errors'],
            ['workerErrors', 'workerErrors', 'Session Health - Worker Errors'],
         ];

        // Function to safely quote CSV fields if they contain commas, quotes, or newlines
        const escapeCsvField = (field) => {
            const stringField = String(field === null || field === undefined ? '' : field);
            if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
                // Enclose in double quotes and escape existing double quotes by doubling them
                return `"${stringField.replace(/"/g, '""')}"`;
            }
            return stringField;
        };

        // Header row
        let csvString = `"Metric","Value"\n`;

        // Add data rows based on the defined order
        metricsOrder.forEach(([key, _id, label]) => {
             if (data.hasOwnProperty(key)) {
                 csvString += `${escapeCsvField(label)},${escapeCsvField(data[key])}\n`;
             } else {
                 // Handle cases where data might be missing for some reason
                  csvString += `${escapeCsvField(label)},"N/A"\n`;
             }
        });


        console.log("Generated CSV:\n", csvString); // For debugging
        return csvString;
    }

    function downloadFile(content, fileName, mimeType) {
        // Use Blob and Object URL for better performance and compatibility
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        // Create a temporary link element
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;

        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Release the Object URL
        URL.revokeObjectURL(url);
        console.log(`Download initiated for ${fileName}`); // For debugging
    }

    // --- Helper Functions ---

    /**
     * Formats milliseconds into HH:MM:SS format.
     * @param {number} ms - Milliseconds to format.
     * @returns {string} Formatted time string or '--:--:--'.
     */
    function formatMilliseconds(ms) {
        if (typeof ms !== 'number' || isNaN(ms) || ms <= 0) {
            return '--:--:--';
        }
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (num) => String(num).padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

     /**
     * Formats a timestamp into a locale-specific date and time string.
     * @param {number} timestamp - The timestamp (in milliseconds).
     * @returns {string} Formatted date/time string or '--'.
     */
    function formatTimestamp(timestamp) {
        if (!timestamp) return '--';
        try {
            return new Date(timestamp).toLocaleString();
        } catch (e) {
            return '--';
        }
    }

    /**
     * Safely updates the text content of an element.
     * @param {HTMLElement} element - The DOM element.
     * @param {string|number} value - The value to display.
     * @param {string} [defaultValue='--'] - Default value if input is null/undefined.
     */
    function updateElementText(element, value, defaultValue = '--') {
        if (element) {
            element.textContent = (value !== null && value !== undefined) ? value : defaultValue;
        }
    }

    /**
     * Processes event data for charting, grouping by time interval.
     * @param {Array} events - Array of event objects { timestamp: number, type: string, ... }.
     * @param {number} intervalMinutes - Grouping interval in minutes.
     * @param {Array<string>} eventTypes - List of event types to create datasets for.
     * @returns {object} { labels: Array<string>, datasets: Array<object> }
     */
    function processEventsForChart(events, intervalMinutes = 1, eventTypes = []) {
        if (!events || events.length === 0) {
            return { labels: [], datasets: [] };
        }

        const intervalMillis = intervalMinutes * 60 * 1000;
        const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
        const startTime = sortedEvents[0].timestamp;
        const endTime = sortedEvents[sortedEvents.length - 1].timestamp;

        // Create time bins (labels)
        const labels = [];
        const binData = {}; // { binTimestamp: { type1: count, type2: count } }
        const typeCounts = {}; // { type1: [], type2: [] }

        eventTypes.forEach(type => {
             typeCounts[type] = [];
        });

        let currentBinStart = Math.floor(startTime / intervalMillis) * intervalMillis;

        while (currentBinStart <= endTime) {
            const binLabel = new Date(currentBinStart + intervalMillis / 2).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'}); // Label with midpoint time
            labels.push(binLabel);
            binData[currentBinStart] = {};
             eventTypes.forEach(type => {
                binData[currentBinStart][type] = 0;
             });
             currentBinStart += intervalMillis;
        }

        // Assign events to bins
        sortedEvents.forEach(event => {
            const binTimestamp = Math.floor(event.timestamp / intervalMillis) * intervalMillis;
            if (binData[binTimestamp] && eventTypes.includes(event.type)) {
                binData[binTimestamp][event.type] = (binData[binTimestamp][event.type] || 0) + 1;
            } else if (binData[binTimestamp] && event.type === 'edit' && eventTypes.includes('edit')) { // Special handling for 'edit' with detail
                 binData[binTimestamp]['edit'] = (binData[binTimestamp]['edit'] || 0) + 1;
            } else if (binData[binTimestamp] && event.type === 'ai' && eventTypes.includes('ai')){ // Combine different AI events if needed
                 binData[binTimestamp]['ai'] = (binData[binTimestamp]['ai'] || 0) + 1;
            }
        });


         // Populate dataset arrays
        const binTimestamps = Object.keys(binData).map(Number).sort((a, b) => a - b);

        eventTypes.forEach(type => {
             typeCounts[type] = binTimestamps.map(ts => binData[ts][type] || 0);
        });

        // Define colors for different activity types
        const activityColors = {
            'edit': 'rgba(75, 192, 192, 0.6)', // Teal
            'refresh': 'rgba(255, 159, 64, 0.6)', // Orange
            'ai': 'rgba(153, 102, 255, 0.6)', // Purple
            'image': 'rgba(255, 99, 132, 0.6)', // Red
            'library': 'rgba(54, 162, 235, 0.6)', // Blue
            'default': 'rgba(201, 203, 207, 0.6)' // Grey
        };
        // Define colors for error types
         const errorColors = {
            'js': 'rgba(255, 99, 132, 0.8)', // Red
            'worker': 'rgba(255, 205, 86, 0.8)', // Yellow
            'default': 'rgba(255, 0, 0, 0.8)' // Bright Red fallback
        };

        const datasets = eventTypes.map(type => ({
            label: type.charAt(0).toUpperCase() + type.slice(1), // Capitalize label
            data: typeCounts[type],
            borderColor: (eventTypes.includes('js') || eventTypes.includes('worker')) ? (errorColors[type] || errorColors.default) : (activityColors[type] || activityColors.default),
            backgroundColor: (eventTypes.includes('js') || eventTypes.includes('worker')) ? (errorColors[type] || errorColors.default) : (activityColors[type] || activityColors.default),
            tension: 0.1, // Makes lines slightly curved
            fill: false
        }));


        return { labels, datasets };
    }

     /**
     * Updates or creates a Chart.js chart.
     * @param {Chart} chartInstance - The existing chart instance (or null).
     * @param {CanvasRenderingContext2D} context - The canvas context.
     * @param {Array<string>} labels - Chart labels.
     * @param {Array<object>} datasets - Chart datasets.
     * @param {string} title - Chart title for tooltips.
     * @returns {Chart} The new or updated chart instance.
     */
    function updateChart(chartInstance, context, labels, datasets, title) {
        if (chartInstance) {
            chartInstance.destroy(); // Destroy the old chart before creating a new one
        }

        return new Chart(context, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                         position: 'top',
                         labels: { color: 'var(--text-primary)'}
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        titleFont: { weight: 'bold' },
                        bodyFont: { size: 12 },
                         callbacks: {
                            title: (tooltipItems) => `${title} - ${tooltipItems[0].label}` // Combine title and time label
                         }
                    }
                },
                scales: {
                    x: {
                         display: true,
                         title: {
                            display: true,
                            text: 'Time',
                            color: 'var(--text-secondary)'
                         },
                         ticks: { color: 'var(--text-secondary)' },
                         grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    y: {
                         display: true,
                         title: {
                            display: true,
                            text: 'Count',
                            color: 'var(--text-secondary)'
                         },
                         ticks: { color: 'var(--text-secondary)', beginAtZero: true, stepSize: 1 }, // Ensure y-axis starts at 0 and shows integers
                         grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                }
            }
        });
    }

    // --- Main Load Function ---
    function loadAndDisplayData() {
        console.log("Attempting to load data from localStorage...");
        const savedData = localStorage.getItem(TRACKING_STORAGE_KEY);

        if (!savedData) {
            console.warn("No tracking data found in localStorage.");
            // Optionally display a message on the dashboard
            // document.getElementById('dashboardContainer').innerHTML = '<p>No session data available yet.</p>';
            return;
        }

        let data;
        try {
            data = JSON.parse(savedData);
            console.log("Tracking data loaded:", data);
        } catch (e) {
            console.error("Failed to parse tracking data:", e);
            // Optionally display an error message
            return;
        }

        // Populate Metric Cards
        updateElementText(totalTimeEl, formatMilliseconds(Date.now() - data.sessionStartTime)); // Calculate dynamically
        updateElementText(sessionStartEl, formatTimestamp(data.sessionStartTime));
        updateElementText(htmlKeystrokesEl, data.htmlKeystrokes || 0);
        updateElementText(cssKeystrokesEl, data.cssKeystrokes || 0);
        updateElementText(jsKeystrokesEl, data.jsKeystrokes || 0);
        updateElementText(totalEditsEl, data.totalEdits || 0);
        updateElementText(avgEditSizeEl, data.avgEditSize || 0); // Placeholder value
        updateElementText(htmlFocusTimeEl, formatMilliseconds(data.htmlFocusTime || 0));
        updateElementText(cssFocusTimeEl, formatMilliseconds(data.cssFocusTime || 0));
        updateElementText(jsFocusTimeEl, formatMilliseconds(data.jsFocusTime || 0));
        updateElementText(mainAIAttemptsEl, data.mainAIAttempts || 0);
        updateElementText(htmlAIAttemptsEl, data.htmlAIAttempts || 0);
        updateElementText(cssAIAttemptsEl, data.cssAIAttempts || 0);
        updateElementText(jsAIAttemptsEl, data.jsAIAttempts || 0);
        updateElementText(promptsUsedCountEl, data.promptsUsedCount || 0);
        updateElementText(apiKeyModalOpensEl, data.apiKeyModalOpens || 0);
        updateElementText(apiKeySavesEl, data.apiKeySaves || 0);
        updateElementText(usedCreatorKeyEl, data.usedCreatorKey || 'No');
        updateElementText(modelPreferenceEl, data.modelPreference || '--');
        updateElementText(previewRefreshesEl, data.previewRefreshes || 0);
        updateElementText(avgEditRefreshTimeEl, data.avgEditRefreshTime || '--'); // Placeholder
        updateElementText(consoleFocusRatioEl, data.consoleFocusRatio || '--'); // Placeholder
        updateElementText(imageUploadClicksEl, data.imageUploadClicks || 0);
        updateElementText(imageUploadsEl, data.imageUploads || 0);
        updateElementText(libraryOpensEl, data.libraryOpens || 0);
        updateElementText(librarySearchesEl, data.librarySearches || 0);
        updateElementText(librariesLoadedEl, data.librariesLoaded || 0);
        updateElementText(fullscreenTogglesEl, data.fullscreenToggles || 0);
        updateElementText(fullscreenTimeEl, formatMilliseconds(data.fullscreenTime || 0));
        updateElementText(layoutTogglesEl, data.layoutToggles || 0);
        updateElementText(hamburgerOpensEl, data.hamburgerOpens || 0);
        updateElementText(wikiModalOpensEl, data.wikiModalOpens || 0);
        updateElementText(flashcardFlipsEl, data.flashcardFlips || 0);
        updateElementText(quizInteractionsEl, data.quizInteractions || 0);
        updateElementText(quizChecksEl, data.quizChecks || 0);
        updateElementText(jsErrorsEl, data.jsErrors || 0);
        updateElementText(workerErrorsEl, data.workerErrors || 0);

        // --- Process and Update Charts ---

        // Activity Chart
        const activityEventTypes = ['edit', 'refresh', 'ai', 'image', 'library'];
        const activityChartData = processEventsForChart(data.activityEvents || [], 1, activityEventTypes); // Group by 1 minute
        activityChartInstance = updateChart(
            activityChartInstance,
            activityChartCanvas,
            activityChartData.labels,
            activityChartData.datasets,
            'Activity Events'
        );

        // Error Chart
         const errorEventTypes = ['js', 'worker'];
        const errorChartData = processEventsForChart(data.errorEvents || [], 1, errorEventTypes); // Group by 1 minute
        errorChartInstance = updateChart(
            errorChartInstance,
            errorChartCanvas,
            errorChartData.labels,
            errorChartData.datasets,
            'Errors'
        );

    }

    // --- Event Listeners ---
    if (refreshButton) {
        refreshButton.addEventListener('click', loadAndDisplayData);
    } else {
        console.warn("Refresh button not found.");
    }

    // --- Initial Load ---
    loadAndDisplayData();

}); // End DOMContentLoaded