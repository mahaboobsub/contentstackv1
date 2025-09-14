/**
 * ContentIQ SDK - Embeddable Chat Widget
 * Provides easy integration for any website
 */

class ContentIQSDK {
  constructor() {
    this.config = {
      apiUrl: 'http://localhost:8000',
      theme: 'auto',
      position: 'bottom-right',
      primaryColor: '#3B82F6',
      secondaryColor: '#8B5CF6',
      accentColor: '#A855F7'
    };
    this.isInitialized = false;
    this.widget = null;
    this.sessionId = `sdk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize the ContentIQ widget
   * @param {Object} options - Configuration options
   */
  init(options = {}) {
    if (this.isInitialized) {
      console.warn('ContentIQ SDK already initialized');
      return;
    }

    // Merge configuration
    this.config = { ...this.config, ...options };
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this._createWidget());
    } else {
      this._createWidget();
    }

    this.isInitialized = true;
  }

  /**
   * Create and inject the chat widget
   * @private
   */
  _createWidget() {
    // Create widget container
    this.widget = document.createElement('div');
    this.widget.id = 'contentiq-widget';
    this.widget.className = 'contentiq-widget';
    
    // Inject styles
    this._injectStyles();
    
    // Create widget HTML
    this.widget.innerHTML = this._getWidgetHTML();
    
    // Append to body
    document.body.appendChild(this.widget);
    
    // Bind events
    this._bindEvents();
    
    // Apply theme
    this._applyTheme();
  }

  /**
   * Inject required CSS styles
   * @private
   */
  _injectStyles() {
    if (document.getElementById('contentiq-styles')) return;

    const style = document.createElement('style');
    style.id = 'contentiq-styles';
    style.textContent = `
      .contentiq-widget {
        position: fixed;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .contentiq-widget.bottom-right {
        bottom: 24px;
        right: 24px;
      }
      
      .contentiq-widget.bottom-left {
        bottom: 24px;
        left: 24px;
      }
      
      .contentiq-fab {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        background: linear-gradient(135deg, var(--ciq-primary), var(--ciq-secondary));
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      }
      
      .contentiq-fab:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }
      
      .contentiq-chat-window {
        position: absolute;
        bottom: 70px;
        right: 0;
        width: 380px;
        height: 600px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        display: none;
        flex-direction: column;
        overflow: hidden;
        transform-origin: bottom right;
        animation: slideUpScale 0.3s ease-out;
      }
      
      .contentiq-chat-window.open {
        display: flex;
      }
      
      @keyframes slideUpScale {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      .contentiq-header {
        background: linear-gradient(135deg, var(--ciq-primary), var(--ciq-secondary));
        color: white;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .contentiq-header-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .contentiq-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }
      
      .contentiq-status {
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 12px;
        height: 12px;
        background: #10B981;
        border: 2px solid white;
        border-radius: 50%;
      }
      
      .contentiq-header-text h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      .contentiq-header-text p {
        margin: 0;
        font-size: 12px;
        opacity: 0.9;
      }
      
      .contentiq-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
        transition: background-color 0.2s ease;
      }
      
      .contentiq-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .contentiq-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: linear-gradient(to bottom, #f8fafc, white);
      }
      
      .contentiq-welcome {
        text-align: center;
        padding: 32px 16px;
      }
      
      .contentiq-welcome-icon {
        width: 48px;
        height: 48px;
        margin: 0 auto 16px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--ciq-primary), var(--ciq-secondary));
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 24px;
      }
      
      .contentiq-welcome h4 {
        margin: 0 0 8px;
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
      }
      
      .contentiq-welcome p {
        margin: 0 0 16px;
        color: #6b7280;
        font-size: 14px;
        line-height: 1.5;
      }
      
      .contentiq-suggestions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .contentiq-suggestion {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12px;
        color: #374151;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;
      }
      
      .contentiq-suggestion:hover {
        background: var(--ciq-primary);
        color: white;
        border-color: var(--ciq-primary);
      }
      
      .contentiq-message {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
      }
      
      .contentiq-message.user {
        flex-direction: row-reverse;
      }
      
      .contentiq-message-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 14px;
        color: white;
      }
      
      .contentiq-message.user .contentiq-message-avatar {
        background: var(--ciq-primary);
      }
      
      .contentiq-message.assistant .contentiq-message-avatar {
        background: linear-gradient(135deg, var(--ciq-secondary), var(--ciq-primary));
      }
      
      .contentiq-message-content {
        max-width: 70%;
      }
      
      .contentiq-message.user .contentiq-message-content {
        text-align: right;
      }
      
      .contentiq-message-bubble {
        padding: 12px 16px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.4;
      }
      
      .contentiq-message.user .contentiq-message-bubble {
        background: var(--ciq-primary);
        color: white;
      }
      
      .contentiq-message.assistant .contentiq-message-bubble {
        background: white;
        color: #1f2937;
        border: 1px solid #e5e7eb;
      }
      
      .contentiq-input-area {
        padding: 16px;
        border-top: 1px solid #e5e7eb;
        background: white;
      }
      
      .contentiq-input-form {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      
      .contentiq-input {
        flex: 1;
        padding: 12px 16px;
        border: 1px solid #e5e7eb;
        border-radius: 24px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s ease;
      }
      
      .contentiq-input:focus {
        border-color: var(--ciq-primary);
      }
      
      .contentiq-send {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: none;
        background: linear-gradient(135deg, var(--ciq-primary), var(--ciq-secondary));
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
      }
      
      .contentiq-send:hover {
        transform: scale(1.05);
      }
      
      .contentiq-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      
      .contentiq-typing {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #6b7280;
        font-size: 14px;
      }
      
      .contentiq-typing-dots {
        display: flex;
        gap: 4px;
      }
      
      .contentiq-typing-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #9ca3af;
        animation: typing 1.4s infinite ease-in-out;
      }
      
      .contentiq-typing-dot:nth-child(1) { animation-delay: -0.32s; }
      .contentiq-typing-dot:nth-child(2) { animation-delay: -0.16s; }
      
      @keyframes typing {
        0%, 80%, 100% {
          transform: scale(0.8);
          opacity: 0.5;
        }
        40% {
          transform: scale(1);
          opacity: 1;
        }
      }
      
      /* Dark theme */
      .contentiq-widget[data-theme="dark"] .contentiq-chat-window {
        background: #1f2937;
        color: white;
      }
      
      .contentiq-widget[data-theme="dark"] .contentiq-messages {
        background: linear-gradient(to bottom, #374151, #1f2937);
      }
      
      .contentiq-widget[data-theme="dark"] .contentiq-message.assistant .contentiq-message-bubble {
        background: #374151;
        color: white;
        border-color: #4b5563;
      }
      
      .contentiq-widget[data-theme="dark"] .contentiq-input {
        background: #374151;
        border-color: #4b5563;
        color: white;
      }
      
      .contentiq-widget[data-theme="dark"] .contentiq-input::placeholder {
        color: #9ca3af;
      }
      
      .contentiq-widget[data-theme="dark"] .contentiq-input-area {
        background: #1f2937;
        border-color: #4b5563;
      }
      
      /* CSS Variables */
      :root {
        --ciq-primary: #3B82F6;
        --ciq-secondary: #8B5CF6;
        --ciq-accent: #A855F7;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Get widget HTML structure
   * @private
   */
  _getWidgetHTML() {
    return `
      <button class="contentiq-fab" data-action="toggle">
        💬
      </button>
      
      <div class="contentiq-chat-window">
        <div class="contentiq-header">
          <div class="contentiq-header-content">
            <div class="contentiq-avatar">
              🤖
              <div class="contentiq-status"></div>
            </div>
            <div class="contentiq-header-text">
              <h3>ContentIQ Assistant</h3>
              <p>Powered by Contentstack MCP</p>
            </div>
          </div>
          <button class="contentiq-close" data-action="close">×</button>
        </div>
        
        <div class="contentiq-messages">
          <div class="contentiq-welcome">
            <div class="contentiq-welcome-icon">🤖</div>
            <h4>Welcome to ContentIQ!</h4>
            <p>Ask me anything about your content. I can help you find information, identify gaps, and suggest improvements.</p>
            <div class="contentiq-suggestions">
              <div class="contentiq-suggestion" data-suggestion="Show me available tours">Show me available tours</div>
              <div class="contentiq-suggestion" data-suggestion="What content is missing?">What content is missing?</div>
              <div class="contentiq-suggestion" data-suggestion="Analytics dashboard">Analytics dashboard</div>
            </div>
          </div>
        </div>
        
        <div class="contentiq-input-area">
          <form class="contentiq-input-form">
            <input type="text" class="contentiq-input" placeholder="Ask about your content..." />
            <button type="submit" class="contentiq-send">→</button>
          </form>
        </div>
      </div>
    `;
  }

  /**
   * Bind event listeners
   * @private
   */
  _bindEvents() {
    const fab = this.widget.querySelector('.contentiq-fab');
    const chatWindow = this.widget.querySelector('.contentiq-chat-window');
    const closeBtn = this.widget.querySelector('.contentiq-close');
    const form = this.widget.querySelector('.contentiq-input-form');
    const input = this.widget.querySelector('.contentiq-input');
    const suggestions = this.widget.querySelectorAll('.contentiq-suggestion');

    // Toggle chat window
    fab.addEventListener('click', () => {
      chatWindow.classList.toggle('open');
    });

    // Close chat window
    closeBtn.addEventListener('click', () => {
      chatWindow.classList.remove('open');
    });

    // Handle form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const message = input.value.trim();
      if (message) {
        this._sendMessage(message);
        input.value = '';
      }
    });

    // Handle suggestions
    suggestions.forEach(suggestion => {
      suggestion.addEventListener('click', () => {
        const message = suggestion.dataset.suggestion;
        this._sendMessage(message);
      });
    });

    // Listen for external events
    window.addEventListener('contentiq:open', () => {
      chatWindow.classList.add('open');
    });

    window.addEventListener('contentiq:close', () => {
      chatWindow.classList.remove('open');
    });

    window.addEventListener('contentiq:message', (event) => {
      const { message } = event.detail;
      if (message) {
        chatWindow.classList.add('open');
        this._sendMessage(message);
      }
    });
  }

  /**
   * Apply theme based on configuration
   * @private
   */
  _applyTheme() {
    // Set position
    this.widget.classList.add(this.config.position);

    // Set CSS variables for colors
    this.widget.style.setProperty('--ciq-primary', this.config.primaryColor);
    this.widget.style.setProperty('--ciq-secondary', this.config.secondaryColor);
    this.widget.style.setProperty('--ciq-accent', this.config.accentColor);

    // Set theme
    if (this.config.theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.widget.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      this.widget.setAttribute('data-theme', this.config.theme);
    }
  }

  /**
   * Send a message to the chat
   * @private
   */
  async _sendMessage(message) {
    const messagesContainer = this.widget.querySelector('.contentiq-messages');
    
    // Clear welcome message if present
    const welcome = messagesContainer.querySelector('.contentiq-welcome');
    if (welcome) {
      welcome.remove();
    }

    // Add user message
    this._addMessage('user', message);

    // Show typing indicator
    this._showTyping();

    try {
      // Send to API
      const response = await fetch(`${this.config.apiUrl}/api/chat?${new URLSearchParams({
        message,
        session_id: this.sessionId,
        stream: 'false'
      })}`);

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Hide typing indicator
      this._hideTyping();

      // Add assistant response
      this._addMessage('assistant', data.response || 'Sorry, I couldn\'t process your request.');

    } catch (error) {
      console.error('Error sending message:', error);
      this._hideTyping();
      this._addMessage('assistant', 'Sorry, I\'m experiencing technical difficulties. Please try again.');
    }
  }

  /**
   * Add a message to the chat
   * @private
   */
  _addMessage(role, content) {
    const messagesContainer = this.widget.querySelector('.contentiq-messages');
    
    const messageElement = document.createElement('div');
    messageElement.className = `contentiq-message ${role}`;
    messageElement.innerHTML = `
      <div class="contentiq-message-avatar">${role === 'user' ? '👤' : '🤖'}</div>
      <div class="contentiq-message-content">
        <div class="contentiq-message-bubble">${content}</div>
      </div>
    `;

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Show typing indicator
   * @private
   */
  _showTyping() {
    const messagesContainer = this.widget.querySelector('.contentiq-messages');
    
    const typingElement = document.createElement('div');
    typingElement.className = 'contentiq-typing';
    typingElement.innerHTML = `
      <div class="contentiq-message-avatar">🤖</div>
      <div class="contentiq-typing-dots">
        <div class="contentiq-typing-dot"></div>
        <div class="contentiq-typing-dot"></div>
        <div class="contentiq-typing-dot"></div>
      </div>
    `;

    messagesContainer.appendChild(typingElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Hide typing indicator
   * @private
   */
  _hideTyping() {
    const typing = this.widget.querySelector('.contentiq-typing');
    if (typing) {
      typing.remove();
    }
  }

  /**
   * Public API methods
   */
  
  open() {
    if (!this.isInitialized) return;
    const chatWindow = this.widget.querySelector('.contentiq-chat-window');
    chatWindow.classList.add('open');
  }

  close() {
    if (!this.isInitialized) return;
    const chatWindow = this.widget.querySelector('.contentiq-chat-window');
    chatWindow.classList.remove('open');
  }

  sendMessage(message) {
    if (!this.isInitialized) return;
    this._sendMessage(message);
  }

  setTheme(theme) {
    if (!this.isInitialized) return;
    this.config.theme = theme;
    this._applyTheme();
  }

  destroy() {
    if (!this.isInitialized) return;
    
    // Remove styles
    const styles = document.getElementById('contentiq-styles');
    if (styles) styles.remove();
    
    // Remove widget
    if (this.widget) {
      this.widget.remove();
      this.widget = null;
    }
    
    this.isInitialized = false;
  }
}

// Create global instance
window.ContentIQ = new ContentIQSDK();

// Auto-initialize if config is present
if (window.ContentIQConfig) {
  window.ContentIQ.init(window.ContentIQConfig);
}
