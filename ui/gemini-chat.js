// Gemini Chat UI Module
// Handles the chat interface and Gemini AI interactions

export class GeminiChatUI {
  static async askGemini(currentTicker) {
    const chatInput = document.getElementById('chatInput');
    const question = chatInput.value.trim();
    if (!question || !currentTicker) return;

    const chatContainer = document.getElementById('chatContainer');

    // Display user message
    this.addMessage(chatContainer, question, 'user-message');
    chatInput.value = '';

    // Scroll to bottom
    this.scrollToBottom(chatContainer);

    // Construct the Yahoo Finance financials URL based on the currentTicker
    const financialUrl = `https://finance.yahoo.com/quote/${currentTicker}/financials`;

    // Create a prompt for Gemini
    const prompt = `You are a helpful financial assistant. Analyze the stock with the ticker symbol ${currentTicker}. The user has the following question: "${question}". Provide a concise and easy-to-understand response.`;

    try {
      const response = await chrome.runtime.sendMessage({
        action: "analyzeContent",
        prompt: prompt,
        url: financialUrl,
      });

      console.log("🤖 Gemini Chat: Received response from background:", response);

      if (response && response.success) {
        // Display Gemini message
        this.addMessage(chatContainer, response.response, 'gemini-message');
      } else {
        console.error("❌ Gemini Chat: Error response from background:", response.error);
        throw new Error(response.error || 'Failed to get response from Gemini');
      }

      // Scroll to bottom
      this.scrollToBottom(chatContainer);

    } catch (error) {
      console.error('❌ Gemini Chat: Error asking Gemini:', error);
      this.displayError(chatContainer, 'Sorry, I had trouble getting an analysis. Please try again.');
    }
  }

  static addMessage(container, text, className) {
    const message = document.createElement('div');
    message.className = `chat-message ${className}`;
    message.textContent = text;
    container.appendChild(message);
  }

  static displayError(container, message) {
    this.addMessage(container, message, 'gemini-message');
    this.scrollToBottom(container);
  }

  static scrollToBottom(container) {
    container.scrollTop = container.scrollHeight;
  }

  static clearChat() {
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
      chatContainer.innerHTML = '';
    }
  }

  static setupChatEventListeners(currentTickerGetter) {
    // Send button
    const sendBtn = document.getElementById('sendChatBtn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        const currentTicker = currentTickerGetter();
        this.askGemini(currentTicker);
      });
    }

    // Enter key in input
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const currentTicker = currentTickerGetter();
          this.askGemini(currentTicker);
        }
      });
    }
  }
}
