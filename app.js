let pose;
let camera;
let currentExercise = null;
let count = 0;
let isTracking = false;

// Exercise demos and instructions
const exerciseDemos = {
    'pushup': {
        gif: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzJlMjk4MmZlZjQ4ZjM1ZjY4ZjY5ZjI5ZDM4ZjM5ZmM5ZmE4ZjFmYiZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/7YrnYstmGxYFa/giphy.gif',
        instructions: 'Start in a plank position. Lower your body until your chest nearly touches the ground. Keep your body straight and core tight. Push back up to complete one rep.'
    },
    'jumpingjack': {
        gif: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzJlMjk4MmZlZjQ4ZjM1ZjY4ZjY5ZjI5ZDM4ZjM5ZmM5ZmE4ZjFmYiZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/2bWUCr6OMwj0A/giphy.gif',
        instructions: 'Start standing with feet together and arms at sides. Jump feet apart while raising arms above head. Jump back to starting position. Repeat at a steady pace.'
    },
    'squat': {
        gif: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzJlMjk4MmZlZjQ4ZjM1ZjY4ZjY5ZjI5ZDM4ZjM5ZmM5ZmE4ZjFmYiZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/xT8qBff8cRRFmZIcPS/giphy.gif',
        instructions: 'Stand with feet shoulder-width apart. Lower your body as if sitting back into a chair. Keep your chest up and knees over toes. Return to standing.'
    },
    'lunge': {
        gif: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzJlMjk4MmZlZjQ4ZjM1ZjY4ZjY5ZjI5ZDM4ZjM5ZmM5ZmE4ZjFmYiZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/3oKIPvcdnW1dLdeU6I/giphy.gif',
        instructions: 'Step forward with one leg. Lower your body until both knees are bent at 90 degrees. Push back up and return to starting position. Alternate legs.'
    },
    'highknee': {
        gif: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzJlMjk4MmZlZjQ4ZjM1ZjY4ZjY5ZjI5ZDM4ZjM5ZmM5ZmE4ZjFmYiZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/3oKIPqZPlvUTNPwW7S/giphy.gif',
        instructions: 'Stand in place. Lift your knees up to hip level alternately, as if running in place. Keep a steady pace and maintain good posture.'
    }
};

// DOM Elements
const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const counterElement = document.getElementById('counter');
const startButton = document.getElementById('start-btn');
const stopButton = document.getElementById('stop-btn');
const exerciseButtons = document.querySelectorAll('.exercise-btn');
const demoGif = document.getElementById('demo-gif');
const exerciseInstructions = document.getElementById('exercise-instructions');

// MediaPipe pose connections
const POSE_CONNECTIONS = {
    POSE_LANDMARKS_LEFT: [
        [11, 13], [13, 15], // Left arm
        [23, 25], [25, 27], // Left leg
        [27, 31], [31, 29], // Left foot
    ],
    POSE_LANDMARKS_RIGHT: [
        [12, 14], [14, 16], // Right arm
        [24, 26], [26, 28], // Right leg
        [28, 32], [32, 30], // Right foot
    ],
    POSE_LANDMARKS_NEUTRAL: [
        [11, 12], // Shoulders
        [23, 24], // Hips
    ]
};

// Initialize MediaPipe Pose
async function initPoseDetection() {
    pose = new Pose({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
    });

    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    pose.onResults(onResults);

    // Setup the camera
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
}

// Process pose results
function onResults(results) {
    const canvasCtx = canvasElement.getContext('2d');
    canvasCtx.save();

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.poseLandmarks && currentExercise && isTracking) {
        // Draw pose landmarks
        Object.values(POSE_CONNECTIONS).forEach(connections => {
            connections.forEach(([start, end]) => {
                canvasCtx.beginPath();
                canvasCtx.moveTo(
                    results.poseLandmarks[start].x * canvasElement.width,
                    results.poseLandmarks[start].y * canvasElement.height
                );
                canvasCtx.lineTo(
                    results.poseLandmarks[end].x * canvasElement.width,
                    results.poseLandmarks[end].y * canvasElement.height
                );
                canvasCtx.strokeStyle = '#00FF00';
                canvasCtx.lineWidth = 2;
                canvasCtx.stroke();
            });
        });

        // Draw landmarks
        results.poseLandmarks.forEach((landmark) => {
            canvasCtx.beginPath();
            canvasCtx.arc(
                landmark.x * canvasElement.width,
                landmark.y * canvasElement.height,
                5, 0, 2 * Math.PI);
            canvasCtx.fillStyle = '#FF0000';
            canvasCtx.fill();
        });

        // Update counter and form score
        const counter = counters[currentExercise];
        if (counter) {
            counter.update(results.poseLandmarks);
            count = counter.count;
            counterElement.textContent = count;
            
            // Update form score
            const formScore = counter.formScore;
            const formScoreElement = document.getElementById('form-score');
            formScoreElement.textContent = `${formScore}%`;
            
            // Update form score color and add visual feedback
            if (formScore >= 90) {
                formScoreElement.style.color = '#22C55E'; // Green
                canvasCtx.strokeStyle = '#22C55E';
            } else if (formScore >= 70) {
                formScoreElement.style.color = '#EAB308'; // Yellow
                canvasCtx.strokeStyle = '#EAB308';
            } else {
                formScoreElement.style.color = '#EF4444'; // Red
                canvasCtx.strokeStyle = '#EF4444';
            }

            // Draw exercise status text
            canvasCtx.font = '24px Arial';
            canvasCtx.fillStyle = canvasCtx.strokeStyle;
            canvasCtx.fillText(`${currentExercise.toUpperCase()}: ${count} reps`, 10, 30);
            canvasCtx.fillText(`Form: ${formScore}%`, 10, 60);
        }
    }

    canvasCtx.restore();
}

// Calculate angle between three points
function calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) {
        angle = 360 - angle;
    }
    return angle;
}

// Exercise counter classes
class ExerciseCounter {
    constructor() {
        this.count = 0;
        this.position = null;
        this.counted = false;
        this.formScore = 100;
        this.lastFormScore = 100;
        this.goodFormThreshold = 70; // Minimum score needed for a valid rep
    }

    updateFormScore(score) {
        this.lastFormScore = score;
        this.formScore = Math.round((this.formScore * 0.7 + score * 0.3));
    }

    shouldCountRep() {
        return this.formScore >= this.goodFormThreshold;
    }
}

class PushUpCounter extends ExerciseCounter {
    update(landmarks) {
        const shoulder = landmarks[12];
        const elbow = landmarks[14];
        const wrist = landmarks[16];
        const hip = landmarks[24];
        const ankle = landmarks[28];
        
        const armAngle = calculateAngle(shoulder, elbow, wrist);
        const bodyAngle = calculateAngle(shoulder, hip, ankle);
        
        let formScore = 100;
        if (bodyAngle < 160 || bodyAngle > 200) {
            formScore -= 30;
        }
        
        if (armAngle > 160) { // Up position
            if (this.position === "down" && !this.counted && this.shouldCountRep()) {
                this.count++;
                this.counted = true;
            }
            this.position = "up";
            if (armAngle > 170) formScore -= 20;
        } else if (armAngle < 90) { // Down position
            this.position = "down";
            this.counted = false;
            if (armAngle < 80) formScore -= 20;
        }
        
        this.updateFormScore(formScore);
    }
}

class JumpingJackCounter extends ExerciseCounter {
    update(landmarks) {
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        const leftAnkle = landmarks[27];
        const rightAnkle = landmarks[28];
        
        const shoulderDistance = Math.abs(leftShoulder.x - rightShoulder.x);
        const hipDistance = Math.abs(leftHip.x - rightHip.x);
        const ankleDistance = Math.abs(leftAnkle.x - rightAnkle.x);
        
        let formScore = 100;
        
        if (Math.abs(shoulderDistance - ankleDistance) > 0.2) {
            formScore -= 30;
        }
        
        if (ankleDistance < 0.2) { // Feet together
            if (this.position === "apart" && !this.counted && this.shouldCountRep()) {
                this.count++;
                this.counted = true;
            }
            this.position = "together";
            if (shoulderDistance > 0.3) formScore -= 20;
        } else if (ankleDistance > 0.4) { // Feet apart
            this.position = "apart";
            this.counted = false;
            if (shoulderDistance < hipDistance * 1.5) formScore -= 20;
        }
        
        this.updateFormScore(formScore);
    }
}

class SquatCounter extends ExerciseCounter {
    update(landmarks) {
        const hip = landmarks[24];
        const knee = landmarks[26];
        const ankle = landmarks[28];
        const shoulder = landmarks[12];
        
        const kneeAngle = calculateAngle(hip, knee, ankle);
        const hipAngle = calculateAngle(shoulder, hip, knee);
        
        let formScore = 100;
        
        if (hipAngle < 45 || hipAngle > 100) {
            formScore -= 30;
        }
        
        if (kneeAngle > 150) { // Standing
            if (this.position === "down" && !this.counted && this.shouldCountRep()) {
                this.count++;
                this.counted = true;
            }
            this.position = "up";
            if (kneeAngle < 160) formScore -= 20;
        } else if (kneeAngle < 90) { // Squatting
            this.position = "down";
            this.counted = false;
            if (kneeAngle > 100) formScore -= 20;
        }
        
        this.updateFormScore(formScore);
    }
}

class LungeCounter extends ExerciseCounter {
    update(landmarks) {
        const hip = landmarks[24];
        const knee = landmarks[26];
        const ankle = landmarks[28];
        const otherKnee = landmarks[25];
        
        const frontKneeAngle = calculateAngle(hip, knee, ankle);
        const backKneeAngle = calculateAngle(hip, otherKnee, landmarks[27]);
        
        let formScore = 100;
        
        if (frontKneeAngle < 80 || frontKneeAngle > 100) {
            formScore -= 30;
        }
        
        if (frontKneeAngle > 150) { // Standing
            if (this.position === "down" && !this.counted && this.shouldCountRep()) {
                this.count++;
                this.counted = true;
            }
            this.position = "up";
            if (frontKneeAngle < 160) formScore -= 20;
        } else if (frontKneeAngle < 100) { // Lunging
            this.position = "down";
            this.counted = false;
            if (backKneeAngle < 80) formScore -= 20;
        }
        
        this.updateFormScore(formScore);
    }
}

class HighKneeCounter extends ExerciseCounter {
    update(landmarks) {
        const hip = landmarks[24];
        const knee = landmarks[26];
        const otherKnee = landmarks[25];
        
        const kneeHeight = hip.y - knee.y;
        const otherKneeHeight = hip.y - otherKnee.y;
        
        let formScore = 100;
        
        if (kneeHeight < 0.15) {
            formScore -= 30;
        }
        
        if (kneeHeight > 0.2) { // Knee raised
            if (this.position === "down" && !this.counted && this.shouldCountRep()) {
                this.count++;
                this.counted = true;
            }
            this.position = "up";
            if (otherKneeHeight > 0.1) formScore -= 20;
        } else { // Knee lowered
            this.position = "down";
            this.counted = false;
            if (otherKneeHeight < 0) formScore -= 20;
        }
        
        this.updateFormScore(formScore);
    }
}

// Initialize counters
const counters = {
    'pushup': new PushUpCounter(),
    'jumpingjack': new JumpingJackCounter(),
    'squat': new SquatCounter(),
    'lunge': new LungeCounter(),
    'highknee': new HighKneeCounter()
};

// Event Listeners
exerciseButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Reset tracking state
        isTracking = false;
        startButton.disabled = false;
        stopButton.disabled = true;
        
        // Remove active class from all buttons
        exerciseButtons.forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked button
        button.classList.add('active');
        
        // Get exercise type from data attribute
        currentExercise = button.getAttribute('data-exercise');
        
        // Reset counter for the selected exercise
        if (counters[currentExercise]) {
            counters[currentExercise] = new (counters[currentExercise].constructor)();
            count = 0;
            counterElement.textContent = '0';
            document.getElementById('form-score').textContent = '100%';
        }
        
        // Update demo GIF and instructions
        const demo = exerciseDemos[currentExercise];
        if (demo) {
            demoGif.src = demo.gif;
            exerciseInstructions.textContent = demo.instructions;
        }
    });
});

startButton.addEventListener('click', () => {
    if (!currentExercise) {
        alert('Please select an exercise first!');
        return;
    }
    
    // Reset counter for fresh start
    if (counters[currentExercise]) {
        counters[currentExercise] = new (counters[currentExercise].constructor)();
        count = 0;
        counterElement.textContent = '0';
        document.getElementById('form-score').textContent = '100%';
    }
    
    isTracking = true;
    startButton.disabled = true;
    stopButton.disabled = false;
});

stopButton.addEventListener('click', () => {
    isTracking = false;
    startButton.disabled = false;
    stopButton.disabled = true;
});

// Set up canvas size
function setupCanvas() {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
}

// Initialize the application
async function init() {
    videoElement.onloadedmetadata = setupCanvas;
    await initPoseDetection();
}

init(); 