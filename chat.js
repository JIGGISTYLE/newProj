document.addEventListener('DOMContentLoaded', () => {
    const chatWidget = document.querySelector('.chat-widget');
    const chatToggle = document.querySelector('.chat-toggle');
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-btn');

    // Toggle chat widget
    chatToggle.addEventListener('click', () => {
        chatWidget.classList.toggle('collapsed');
    });

    // Handle sending messages
    function sendMessage() {
        const message = userInput.value.trim();
        if (message) {
            // Add user message to chat
            addMessage(message, 'user');
            userInput.value = '';

            // Send message to backend
            fetch('http://localhost:5000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message }),
            })
            .then(response => response.json())
            .then(data => {
                // Add bot response to chat
                addMessage(data.response, 'bot');
            })
            .catch(error => {
                console.error('Error:', error);
                addMessage('Sorry, I encountered an error. Please try again.', 'bot');
            });
        }
    }

    // Add message to chat
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.innerHTML = `<p>${text}</p>`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Event listeners for sending messages
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}); 