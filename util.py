import numpy as np

def calculate_angle(a, b, c):
    """Calculate the angle between three points."""
    a = np.array([a.x, a.y])
    b = np.array([b.x, b.y])
    c = np.array([c.x, c.y])
    
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    
    if angle > 180.0:
        angle = 360 - angle
    
    return angle

class ExerciseCounter:
    def __init__(self):
        self.count = 0
        self.position = None
        self.counted = False

class PushUpCounter(ExerciseCounter):
    def update(self, landmarks):
        shoulder = landmarks[12]
        elbow = landmarks[14]
        wrist = landmarks[16]
        
        angle = calculate_angle(shoulder, elbow, wrist)
        
        if angle > 160:  # Up position
            if self.position == "down" and not self.counted:
                self.count += 1
                self.counted = True
            self.position = "up"
        elif angle < 90:  # Down position
            self.position = "down"
            self.counted = False

class JumpingJackCounter(ExerciseCounter):
    def update(self, landmarks):
        left_shoulder = landmarks[11]
        right_shoulder = landmarks[12]
        left_ankle = landmarks[27]
        right_ankle = landmarks[28]
        
        shoulder_distance = abs(left_shoulder.x - right_shoulder.x)
        ankle_distance = abs(left_ankle.x - right_ankle.x)
        
        if ankle_distance < 0.1:  # Feet together
            if self.position == "apart" and not self.counted:
                self.count += 1
                self.counted = True
            self.position = "together"
        elif ankle_distance > 0.4:  # Feet apart
            self.position = "apart"
            self.counted = False

class SquatCounter(ExerciseCounter):
    def update(self, landmarks):
        hip = landmarks[24]
        knee = landmarks[26]
        ankle = landmarks[28]
        
        angle = calculate_angle(hip, knee, ankle)
        
        if angle > 160:  # Standing
            if self.position == "down" and not self.counted:
                self.count += 1
                self.counted = True
            self.position = "up"
        elif angle < 120:  # Squatting
            self.position = "down"
            self.counted = False

class LungeCounter(ExerciseCounter):
    def update(self, landmarks):
        hip = landmarks[24]
        knee = landmarks[26]
        ankle = landmarks[28]
        
        angle = calculate_angle(hip, knee, ankle)
        
        if angle > 160:  # Standing
            if self.position == "down" and not self.counted:
                self.count += 1
                self.counted = True
            self.position = "up"
        elif angle < 120:  # Lunging
            self.position = "down"
            self.counted = False

class HighKneeCounter(ExerciseCounter):
    def update(self, landmarks):
        hip = landmarks[24]
        knee = landmarks[26]
        
        knee_height = hip.y - knee.y
        
        if knee_height > 0.15:  # Knee raised
            if self.position == "down" and not self.counted:
                self.count += 1
                self.counted = True
            self.position = "up"
        else:  # Knee lowered
            self.position = "down"
            self.counted = False 