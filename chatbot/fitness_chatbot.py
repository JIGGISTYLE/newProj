import random
import json
import torch
import torch.nn as nn
import torch.nn.functional as F
import nltk
from nltk.stem.porter import PorterStemmer

nltk.download('punkt')
stemmer = PorterStemmer()

def tokenize(sentence):
    return nltk.word_tokenize(sentence)

def stem(word):
    return stemmer.stem(word.lower())

def bag_of_words(tokenized_sentence, all_words):
    tokenized_sentence = [stem(w) for w in tokenized_sentence]
    bag = torch.zeros(len(all_words), dtype=torch.float32)
    for idx, word in enumerate(all_words):
        if word in tokenized_sentence:
            bag[idx] = 1.0
    return bag

with open("intents.json", "r") as f:
    intents = json.load(f)

all_words = []
tags = []
xy = []

for intent in intents["intents"]:
    tag = intent["tag"]
    tags.append(tag)
    for pattern in intent["patterns"]:
        w = tokenize(pattern)
        all_words.extend(w)
        xy.append((w, tag))

ignore_words = ["?", "!", ".", ","]
all_words = sorted(set(stem(w) for w in all_words if w not in ignore_words))
tags = sorted(set(tags))

X_train = []
y_train = []

for (pattern_sentence, tag) in xy:
    bag = bag_of_words(pattern_sentence, all_words)
    X_train.append(bag)
    y_train.append(tags.index(tag))

X_train = torch.stack(X_train)
y_train = torch.tensor(y_train)

class NeuralNet(nn.Module):
    def __init__(self, input_size, hidden_size, num_classes):
        super(NeuralNet, self).__init__()
        self.fc1 = nn.Linear(input_size, hidden_size)
        self.fc2 = nn.Linear(hidden_size, num_classes)
    
    def forward(self, x):
        x = F.relu(self.fc1(x))
        return self.fc2(x)

model = NeuralNet(len(all_words), 8, len(tags))
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

for epoch in range(1000):
    outputs = model(X_train)
    loss = criterion(outputs, y_train)

    optimizer.zero_grad()
    loss.backward()
    optimizer.step()

data = {
    "model_state": model.state_dict(),
    "input_size": len(all_words),
    "hidden_size": 8,
    "output_size": len(tags),
    "all_words": all_words,
    "tags": tags
}
torch.save(data, "fitness_bot_model.pth")

print("Training complete.")
