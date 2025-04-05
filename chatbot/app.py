from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import random
import json
import re
import os
from fitness_chatbot import NeuralNet, bag_of_words, tokenize

app = Flask(__name__)
CORS(app)  # Enable CORS

# Get the current directory
current_dir = os.path.dirname(os.path.abspath(__file__))

try:
    # Load the model and data
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Load intents file
    intents_path = os.path.join(current_dir, "intents.json")
    with open(intents_path, "r") as f:
        intents = json.load(f)

    # Check if model exists, if not, train it
    model_path = os.path.join(current_dir, "fitness_bot_model.pth")
    if not os.path.exists(model_path):
        print("Model file not found. Training new model...")
        # Import and run the training code
        import fitness_chatbot
        print("Model training complete.")
    
    # Load the trained model
    data = torch.load(model_path)
    
    model = NeuralNet(data["input_size"], data["hidden_size"], data["output_size"]).to(device)
    model.load_state_dict(data["model_state"])
    model.eval()

    all_words = data["all_words"]
    tags = data["tags"]

except Exception as e:
    print(f"Error during initialization: {str(e)}")
    raise

def extract_weight_height(sentence):
    match = re.findall(r"(\d+)", sentence)
    if len(match) >= 2:
        weight = int(match[0])
        height = int(match[1])
        return weight, height
    return None, None

def bmi_advice(weight, height_cm):
    height_m = height_cm / 100
    bmi = weight / (height_m ** 2)
    if bmi < 18.5:
        return f"Your BMI is {bmi:.1f}. You're underweight. Focus on strength training with a calorie surplus and protein-rich diet."
    elif bmi < 25:
        return f"Your BMI is {bmi:.1f}. You're in the healthy range! A mix of cardio and strength training will keep you fit."
    elif bmi < 30:
        return f"Your BMI is {bmi:.1f}. You're overweight. Prioritize cardio like brisk walking, jogging, or cycling, combined with strength training."
    else:
        return f"Your BMI is {bmi:.1f}. You're in the obese category. Start with low-impact cardio like walking or swimming and slowly add strength work."

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        if not data or 'message' not in data:
            return jsonify({'error': 'No message provided'}), 400
            
        sentence = data['message']
        
        # Check for weight & height
        weight, height = extract_weight_height(sentence)
        if weight and height:
            return jsonify({'response': bmi_advice(weight, height)})
        
        # Intent prediction
        sentence_tokens = tokenize(sentence)
        X = bag_of_words(sentence_tokens, all_words).unsqueeze(0).to(device)
        
        output = model(X)
        _, predicted = torch.max(output, dim=1)
        tag = tags[predicted.item()]
        
        probs = torch.softmax(output, dim=1)
        if probs[0][predicted.item()] > 0.75:
            for intent in intents["intents"]:
                if tag == intent["tag"]:
                    return jsonify({'response': random.choice(intent['responses'])})
        else:
            return jsonify({'response': "I'm not sure I understand. Could you rephrase that?"})
            
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000) 