import streamlit as st
import cv2
import mediapipe as mp
import numpy as np
import time
from util import (
    PushUpCounter,
    JumpingJackCounter,
    SquatCounter,
    LungeCounter,
    HighKneeCounter
)

# App Configuration
st.set_page_config(page_title="🏋️ Exercise Counter", layout="wide")
st.title("🏋️ Real-time Exercise Counter")

# Sidebar Selection
with st.sidebar:
    st.header("⚙️ Settings")
    exercise = st.selectbox(
        "Choose an Exercise",
        ["None", "Push-Up", "Jumping Jack", "Squat", "Lunge", "High Knee"]
    )

    run = st.checkbox("▶️ Start Tracking")

if exercise == "None":
    st.info("👈 Select an exercise to begin tracking.")
else:
    st.success(f"✅ Selected: {exercise}")

    # Initialize Counters
    counters = {
        "Push-Up": PushUpCounter(),
        "Jumping Jack": JumpingJackCounter(),
        "Squat": SquatCounter(),
        "Lunge": LungeCounter(),
        "High Knee": HighKneeCounter()
    }

    # MediaPipe Setup
    mp_drawing = mp.solutions.drawing_utils
    mp_pose = mp.solutions.pose

    # Camera & Placeholder
    cap = cv2.VideoCapture(0)
    image_placeholder = st.empty()

    # Tracking Loop
    if run:
        with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
            while run:
                ret, frame = cap.read()
                if not ret:
                    st.warning("🚫 Unable to access webcam.")
                    break

                frame = cv2.flip(frame, 1)
                image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = pose.process(image)
                image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

                count = 0
                label = exercise + "s"

                if results.pose_landmarks:
                    lm = results.pose_landmarks.landmark
                    mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

                    counter = counters[exercise]
                    counter.update(lm)
                    count = counter.count

                    cv2.putText(image, f"{label}: {count}", (10, 40),
                                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 255), 2)

                image_placeholder.image(image, channels="BGR", use_column_width=True)
                time.sleep(0.03)

        cap.release()
        cv2.destroyAllWindows() 