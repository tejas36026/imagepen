// record.js - Screen Recording Functionality

let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

// Get the record button from the DOM
const recordButton = document.getElementById('recordButton');

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                mediaSource: 'screen',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: true
        });

        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm; codecs=vp9',
            bitsPerSecond: 2500000 // 2.5 Mbps
        });

        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            
            // Create download link
            const a = document.createElement('a');
            a.href = url;
            a.download = `recording-${new Date().toISOString()}.webm`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Reset recording state
            recordedChunks = [];
            isRecording = false;
            updateButtonState();
        };

        mediaRecorder.start(1000); // Collect data every 1 second
        isRecording = true;
        updateButtonState();

    } catch (err) {
        console.error('Error starting recording:', err);
        alert('Screen recording failed. Please try again.');
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
}

function updateButtonState() {
    if (isRecording) {
        recordButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <path d="M12 8v4l2 2"/>
            </svg>
            Stop Recording
        `;
        recordButton.classList.add('recording-active');
    } else {
        recordButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
            </svg>
            Record Screen
        `;
        recordButton.classList.remove('recording-active');
    }
}

// Add click handler for record button
recordButton.addEventListener('click', () => {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
});

// Add style for recording state
const style = document.createElement('style');
style.textContent = `
    .recording-active {
        background-color: #ff4444 !important;
        border-color: #cc0000 !important;
        animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);