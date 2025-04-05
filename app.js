let pose;
let camera;
let count = 0;
let isTracking = false;

// Exercise demo and instructions
const exerciseDemo = {
    gif: 'https://media.giphy.com/media/5t9IcXiBCyw60XPpGu/giphy.gif', // Professional pushup demonstration
    instructions: [
        'Start in plank position',
        'Keep your body straight',
        'Lower chest to ground',
        'Push back up',
        'Keep core tight throughout'
    ]
};

// DOM Elements
const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const counterElement = document.getElementById('counter');
const startButton = document.getElementById('start-btn');
const stopButton = document.getElementById('stop-btn');
const demoGif = document.getElementById('demo-gif');
const exerciseInstructions = document.getElementById('exercise-instructions');

// MediaPipe pose connections for full body visualization
const POSE_CONNECTIONS = {
    // Face Connections
    FACE_OVAL: [
        [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389],
        [389, 356], [356, 454], [454, 323], [323, 361], [361, 288], [288, 397],
        [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152],
        [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172],
        [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162],
        [162, 21], [21, 54], [54, 103], [103, 67], [67, 109], [109, 10]
    ],
    
    // Body Connections
    TORSO: [
        [11, 12], // Shoulders
        [12, 24], // Right shoulder to hip
        [24, 23], // Hips
        [23, 11], // Left hip to shoulder
    ],
    
    ARMS: [
        [11, 13], [13, 15], // Left arm
        [12, 14], [14, 16], // Right arm
    ],
    
    LEGS: [
        [23, 25], [25, 27], [27, 29], [29, 31], // Left leg
        [24, 26], [26, 28], [28, 30], [30, 32], // Right leg
    ]
};

// Colors for different body parts
const LANDMARK_COLORS = {
    FACE: '#FF0000',
    TORSO: '#00FF00',
    ARMS: '#FFFF00',
    LEGS: '#00FFFF'
};

// Initialize MediaPipe Pose with enhanced settings
async function initPoseDetection() {
    try {
        // Initialize MediaPipe Pose
        pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }
        });

        pose.setOptions({
            modelComplexity: 2,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        pose.onResults(onResults);

        // Initialize camera
        const videoElement = document.getElementById('video');
        const canvasElement = document.getElementById('canvas');
        
        if (!videoElement || !canvasElement) {
            console.error('Video or canvas element not found');
            return;
        }

        // Set canvas size
        canvasElement.width = 640;
        canvasElement.height = 480;

        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 640,
                height: 480,
                facingMode: "user"
            }
        });

        if (!stream) {
            console.error('Could not access camera');
            return;
        }

        videoElement.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                videoElement.play();
                resolve();
            };
        });

        // Start pose detection
        camera = new Camera(videoElement, {
            onFrame: async () => {
                if (isTracking) {
                    await pose.send({image: videoElement});
                }
            },
            width: 640,
            height: 480
        });

        await camera.start();
        console.log('Camera and pose detection initialized successfully');
    } catch (error) {
        console.error('Error initializing camera or pose detection:', error);
        alert('Error accessing camera. Please make sure you have granted camera permissions and try again.');
    }
}

// Exercise counter class
class PushUpCounter {
    constructor() {
        this.count = 0;
        this.position = "up";
        this.counted = false;
        this.formScore = 100;
        this.consecutiveGoodFormFrames = 0;
        this.requiredGoodFormFrames = 3;
        this.goodFormThreshold = 70;
        this.lastElbowAngles = [];
        this.angleBufferSize = 5;
        this.minDepth = 70;  // Minimum elbow angle for a valid pushup
        this.maxDepth = 160; // Maximum elbow angle for starting position
        this.lastValidPushup = Date.now();
        this.minTimeBetweenPushups = 500; // Minimum time between pushups in milliseconds
        this.formHistory = [];
        this.formHistorySize = 10;
    }

    reset() {
        this.count = 0;
        this.formScore = 100;
        this.consecutiveGoodFormFrames = 0;
        this.position = "up";
        this.counted = false;
        this.lastElbowAngles = [];
        this.formHistory = [];
        document.getElementById('counter').textContent = '0';
        document.getElementById('form-score').textContent = '100%';
        document.getElementById('form-score').style.color = '#4CAF50';
    }

    updateFormScore(score) {
        // Add new score to history
        this.formHistory.push(score);
        if (this.formHistory.length > this.formHistorySize) {
            this.formHistory.shift();
        }

        // Calculate weighted average
        const weights = [0.4, 0.3, 0.2, 0.1]; // More weight to recent scores
        let weightedSum = 0;
        let weightSum = 0;
        
        for (let i = 0; i < Math.min(this.formHistory.length, weights.length); i++) {
            weightedSum += this.formHistory[this.formHistory.length - 1 - i] * weights[i];
            weightSum += weights[i];
        }

        this.formScore = Math.round(weightedSum / weightSum);
        
        if (this.formScore >= this.goodFormThreshold) {
            this.consecutiveGoodFormFrames++;
        } else {
            this.consecutiveGoodFormFrames = 0;
        }

        const formScoreElement = document.getElementById('form-score');
        formScoreElement.textContent = `${this.formScore}%`;
        
        if (this.formScore >= 90) {
            formScoreElement.style.color = '#4CAF50';
        } else if (this.formScore >= 70) {
            formScoreElement.style.color = '#FFC107';
        } else {
            formScoreElement.style.color = '#F44336';
        }
    }

    hasGoodForm() {
        return this.consecutiveGoodFormFrames >= this.requiredGoodFormFrames;
    }

    calculateAngle(a, b, c) {
        const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        let angle = Math.abs(radians * 180.0 / Math.PI);
        if (angle > 180.0) {
            angle = 360 - angle;
        }
        return angle;
    }

    getSmoothedElbowAngle(currentAngle) {
        this.lastElbowAngles.push(currentAngle);
        if (this.lastElbowAngles.length > this.angleBufferSize) {
            this.lastElbowAngles.shift();
        }
        return this.lastElbowAngles.reduce((a, b) => a + b, 0) / this.lastElbowAngles.length;
    }

    checkWristPosition(shoulder, elbow, wrist) {
        // Check if wrists are roughly shoulder-width apart
        const wristToShoulderX = Math.abs(wrist.x - shoulder.x);
        return wristToShoulderX < 0.3; // Threshold for wrist position
    }

    checkHipSag(shoulder, hip, ankle) {
        // Check if hips are sagging or raised
        const hipHeight = hip.y;
        const expectedHipHeight = shoulder.y + (ankle.y - shoulder.y) * 0.6;
        return Math.abs(hipHeight - expectedHipHeight) < 0.1;
    }

    update(landmarks) {
        if (!landmarks || landmarks.length < 33) return;

        // Get key landmarks for both sides
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftElbow = landmarks[13];
        const rightElbow = landmarks[14];
        const leftWrist = landmarks[15];
        const rightWrist = landmarks[16];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        const leftAnkle = landmarks[27];
        const rightAnkle = landmarks[28];

        // Calculate angles for both arms
        const leftElbowAngle = this.calculateAngle(leftShoulder, leftElbow, leftWrist);
        const rightElbowAngle = this.calculateAngle(rightShoulder, rightElbow, rightWrist);
        
        // Use the average of both arms for more stability
        const currentElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;
        const smoothedElbowAngle = this.getSmoothedElbowAngle(currentElbowAngle);

        // Calculate body alignment
        const leftBodyAngle = Math.abs(90 - this.calculateAngle(leftShoulder, leftHip, leftAnkle));
        const rightBodyAngle = Math.abs(90 - this.calculateAngle(rightShoulder, rightHip, rightAnkle));
        const bodyAngle = (leftBodyAngle + rightBodyAngle) / 2;

        let formScore = 100;

        // Check elbow angle and range of motion
        if (smoothedElbowAngle < this.minDepth || smoothedElbowAngle > this.maxDepth) {
            formScore -= 30;
        }

        // Check body alignment
        if (bodyAngle > 15) {
            formScore -= 25;
        }

        // Check wrist position
        if (!this.checkWristPosition(rightShoulder, rightElbow, rightWrist) ||
            !this.checkWristPosition(leftShoulder, leftElbow, leftWrist)) {
            formScore -= 20;
        }

        // Check hip sag
        if (!this.checkHipSag(rightShoulder, rightHip, rightAnkle) ||
            !this.checkHipSag(leftShoulder, leftHip, leftAnkle)) {
            formScore -= 25;
        }

        // Track pushup movement with time-based debouncing
        const now = Date.now();
        if (smoothedElbowAngle < 90) { // Down position
            if (this.position === "up" && !this.counted && 
                this.hasGoodForm() && 
                now - this.lastValidPushup > this.minTimeBetweenPushups) {
                this.count++;
                document.getElementById('counter').textContent = this.count;
                this.counted = true;
                this.lastValidPushup = now;
            }
            this.position = "down";
        } else if (smoothedElbowAngle > 150) { // Up position
            this.position = "up";
            this.counted = false;
        }

        this.updateFormScore(formScore);
    }
}

// Initialize counter
const pushupCounter = new PushUpCounter();

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('start-btn');
    const stopButton = document.getElementById('stop-btn');
    const counterElement = document.getElementById('counter');
    const formScoreElement = document.getElementById('form-score');

    if (startButton && stopButton && counterElement && formScoreElement) {
        startButton.addEventListener('click', () => {
            isTracking = true;
            startButton.disabled = true;
            stopButton.disabled = false;
            pushupCounter.reset();
        });

        stopButton.addEventListener('click', () => {
            isTracking = false;
            startButton.disabled = false;
            stopButton.disabled = true;
        });
    } else {
        console.error('Required elements not found');
    }
});

// Set up canvas size
function setupCanvas() {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
}

// Draw pose landmarks and connections
function onResults(results) {
    if (!results.poseLandmarks) {
        return;
    }

    const canvasElement = document.getElementById('canvas');
    const canvasCtx = canvasElement.getContext('2d');

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    // Draw all landmarks
    results.poseLandmarks.forEach((landmark, index) => {
        const x = landmark.x * canvasElement.width;
        const y = landmark.y * canvasElement.height;
        
        canvasCtx.beginPath();
        canvasCtx.arc(x, y, 3, 0, 2 * Math.PI);
        canvasCtx.fillStyle = '#FF0000';
        canvasCtx.fill();
    });

    // Draw connections with different colors
    canvasCtx.lineWidth = 2;

    // Draw face connections
    canvasCtx.strokeStyle = '#FF0000';
    POSE_CONNECTIONS.FACE_OVAL.forEach(([start, end]) => {
        if (results.poseLandmarks[start] && results.poseLandmarks[end] &&
            results.poseLandmarks[start].visibility > 0.5 &&
            results.poseLandmarks[end].visibility > 0.5) {
            canvasCtx.beginPath();
            canvasCtx.moveTo(
                results.poseLandmarks[start].x * canvasElement.width,
                results.poseLandmarks[start].y * canvasElement.height
            );
            canvasCtx.lineTo(
                results.poseLandmarks[end].x * canvasElement.width,
                results.poseLandmarks[end].y * canvasElement.height
            );
            canvasCtx.stroke();
        }
    });

    // Draw torso connections
    canvasCtx.strokeStyle = '#00FF00';
    POSE_CONNECTIONS.TORSO.forEach(([start, end]) => {
        if (results.poseLandmarks[start] && results.poseLandmarks[end] &&
            results.poseLandmarks[start].visibility > 0.5 &&
            results.poseLandmarks[end].visibility > 0.5) {
            canvasCtx.beginPath();
            canvasCtx.moveTo(
                results.poseLandmarks[start].x * canvasElement.width,
                results.poseLandmarks[start].y * canvasElement.height
            );
            canvasCtx.lineTo(
                results.poseLandmarks[end].x * canvasElement.width,
                results.poseLandmarks[end].y * canvasElement.height
            );
            canvasCtx.stroke();
        }
    });

    // Draw arm connections
    canvasCtx.strokeStyle = '#FFFF00';
    POSE_CONNECTIONS.ARMS.forEach(([start, end]) => {
        if (results.poseLandmarks[start] && results.poseLandmarks[end] &&
            results.poseLandmarks[start].visibility > 0.5 &&
            results.poseLandmarks[end].visibility > 0.5) {
            canvasCtx.beginPath();
            canvasCtx.moveTo(
                results.poseLandmarks[start].x * canvasElement.width,
                results.poseLandmarks[start].y * canvasElement.height
            );
            canvasCtx.lineTo(
                results.poseLandmarks[end].x * canvasElement.width,
                results.poseLandmarks[end].y * canvasElement.height
            );
            canvasCtx.stroke();
        }
    });

    // Draw leg connections
    canvasCtx.strokeStyle = '#00FFFF';
    POSE_CONNECTIONS.LEGS.forEach(([start, end]) => {
        if (results.poseLandmarks[start] && results.poseLandmarks[end] &&
            results.poseLandmarks[start].visibility > 0.5 &&
            results.poseLandmarks[end].visibility > 0.5) {
            canvasCtx.beginPath();
            canvasCtx.moveTo(
                results.poseLandmarks[start].x * canvasElement.width,
                results.poseLandmarks[start].y * canvasElement.height
            );
            canvasCtx.lineTo(
                results.poseLandmarks[end].x * canvasElement.width,
                results.poseLandmarks[end].y * canvasElement.height
            );
            canvasCtx.stroke();
        }
    });

    canvasCtx.restore();

    // Update pushup counter
    if (isTracking) {
        pushupCounter.update(results.poseLandmarks);
    }
}

// Initialize the application
async function init() {
    videoElement.onloadedmetadata = setupCanvas;
    await initPoseDetection();

    // Set up demo GIF and instructions
    const demoGif = document.getElementById('demo-gif');
    const instructionsList = document.getElementById('exercise-instructions');
    
    if (demoGif && instructionsList) {
        demoGif.src = exerciseDemo.gif;
        exerciseDemo.instructions.forEach(instruction => {
            const li = document.createElement('li');
            li.textContent = instruction;
            instructionsList.appendChild(li);
        });
    }

    // Add reset button to the stats container
    const statsContainer = document.querySelector('.stats-container');
    const resetButton = document.createElement('button');
    resetButton.id = 'reset-btn';
    resetButton.className = 'control-btn reset';
    resetButton.innerHTML = '<i class="fas fa-redo"></i> Reset Counter';
    statsContainer.appendChild(resetButton);

    // Add reset button click handler
    document.getElementById('reset-btn').addEventListener('click', () => {
        pushupCounter.reset();
    });
}

init(); 