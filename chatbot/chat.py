import torch
import random
import json
import re
from fitness_chatbot import NeuralNet, bag_of_words, tokenize

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

with open("intents.json", "r") as f:
    intents = json.load(f)

FILE = "fitness_bot_model.pth"
data = torch.load(FILE)

model = NeuralNet(data["input_size"], data["hidden_size"], data["output_size"]).to(device)
model.load_state_dict(data["model_state"])
model.eval()

all_words = data["all_words"]
tags = data["tags"]

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
        return f"Your BMI is {bmi:.1f}. You’re overweight. Prioritize cardio like brisk walking, jogging, or cycling, combined with strength training."
    else:
        return f"Your BMI is {bmi:.1f}. You're in the obese category. Start with low-impact cardio like walking or swimming and slowly add strength work."

print("Fitness Bot 🤖: Type 'quit' to stop")

while True:
    sentence = input("You: ")
    if sentence.lower() == "quit":
        break

    # Check for weight & height in any sentence
    weight, height = extract_weight_height(sentence)
    if weight and height:
        print(f"Fitness Bot 🤖: {bmi_advice(weight, height)}")
        continue  # skip intent prediction if it's a weight/height input

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
                print(f"Fitness Bot 🤖: {random.choice(intent['responses'])}")
    else:
        print("Fitness Bot 🤖: Sorry, I didn’t get that. Can you try again?")

print("Fitness Bot 🤖: See you next time! Stay strong!")