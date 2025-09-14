/**
 * ContentIQ Widget Loader
 * This script loads and initializes the ContentIQ chat widget
 */

(function() {
  'use strict';

  // Configuration defaults
  const defaultConfig = {
    apiUrl: 'https://api.contentiq.io',
    theme: 'auto',
    position: 'bottom-right',
    primaryColor: '#3B82F6',
    secondaryColor: '#8B5CF6',
    accentColor: '#A855F7',
    autoOpen: false,
    enableVoice: true,
    enableTTS: false,
    welcomeMessage: 'Welcome to ContentIQ! How can I help you today?',
    suggestions: [
      'Show me available tours',
      'What content is missing?',
      'Analytics dashboard'
    ]
  };

  // Global ContentIQ object
  window.ContentIQ = window.ContentIQ || {};

  /**
   * Initialize the ContentIQ widget
   * @param {Object} config - Configuration options
   */
  window.ContentIQ.init = function(config) {
    const finalConfig = Object.assign({}, defaultConfig, config);
    
    // Validate required config
    if (!finalConfig.apiKey) {
      console.error('ContentIQ: API key is required');
      return;
    }

    // Load the widget module
    loadWidget(finalConfig);
  };

  /**
   * Load the widget module dynamically
   * @param {Object} config - Configuration options
   */
  function loadWidget(config) {
    // Check if widget is already loaded
    if (window.ContentIQWidget) {
      window.ContentIQWidget.init(config);
      return;
    }

    // Create script element for the main widget
    const script = document.createElement('script');
    script.src = config.widgetUrl || `${config.apiUrl}/static/contentiq-widget.js`;
    script.async = true;
    
    script.onload = function() {
      if (window.ContentIQWidget) {
        window.ContentIQWidget.init(config);
      } else {
        console.error('ContentIQ: Failed to load widget module');
      }
    };

    script.onerror = function() {
      console.error('ContentIQ: Failed to load widget script');
      // Fallback to embedded widget
      loadEmbeddedWidget(config);
    };

    document.head.appendChild(script);
  }

  /**
   * Load embedded widget as fallback
   * @param {Object} config - Configuration options
   */
  function loadEmbeddedWidget(config) {
    // Create the embedded widget
    const widget = new EmbeddedWidget(config);
    widget.init();
    
    // Expose widget instance
    window.ContentIQWidget = widget;
  }

  /**
   * Embedded Widget Class
   * Fallback implementation when external script fails to load
   */
  class EmbeddedWidget {
    constructor(config) {
      this.config = config;
      this.isOpen = false;
      this.messages = [];
      this.sessionId = `embedded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    init() {
      this.injectStyles();
      this.createWidget();
      this.bindEvents();
    }

    injectStyles() {
      if (document.getElementById('contentiq-embedded-styles')) return;

      const style = document.createElement('style');
      style.id = 'contentiq-embedded-styles';
      style.textContent = `
        .contentiq-embedded {
          position: fixed;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ${this.config.position.includes('right') ? 'right: 24px;' : 'left: 24px;'}
          ${this.config.position.includes('bottom') ? 'bottom: 24px;' : 'top: 24px;'}
        }

        .contentiq-fab {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
          background: linear-gradient(135deg, ${this.config.primaryColor}, ${this.config.secondaryColor});
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          position: relative;
        }

        .contentiq-fab:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }

        .contentiq-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }

        .contentiq-chat {
          position: absolute;
          ${this.config.position.includes('right') ? 'right: 0;' : 'left: 0;'}
          ${this.config.position.includes('bottom') ? 'bottom: 80px;' : 'top: 80px;'}
          width: 380px;
          height: 600px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          display: none;
          flex-direction: column;
          overflow: hidden;
          animation: slideIn 0.3s ease;
        }

        .contentiq-chat.open {
          display: flex;
        }

        @keyframes slideIn {
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
          background: linear-gradient(135deg, ${this.config.primaryColor}, ${this.config.secondaryColor});
          color: white;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .contentiq-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: linear-gradient(to bottom, #f8fafc, white);
        }

        .contentiq-input-area {
          padding: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .contentiq-input-form {
          display: flex;
          gap: 8px;
        }

        .contentiq-input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 24px;
          font-size: 14px;
          outline: none;
        }

        .contentiq-send {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, ${this.config.primaryColor}, ${this.config.secondaryColor});
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .contentiq-message {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .contentiq-message.user {
          flex-direction: row-reverse;
        }

        .contentiq-message-bubble {
          max-width: 70%;
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.4;
        }

        .contentiq-message.user .contentiq-message-bubble {
          background: ${this.config.primaryColor};
          color: white;
        }

        .contentiq-message.assistant .contentiq-message-bubble {
          background: #f3f4f6;
          color: #111827;
        }
      `;

      document.head.appendChild(style);
    }

    createWidget() {
      this.container = document.createElement('div');
      this.container.className = 'contentiq-embedded';
      this.container.innerHTML = `
        <button class="contentiq-fab">
          💬
          <div class="contentiq-badge" style="display: none;">0</div>
        </button>
        <div class="contentiq-chat">
          <div class="contentiq-header">
            <div>
              <h3 style="margin: 0; font-size: 16px;">ContentIQ Assistant</h3>
              <p style="margin: 0; font-size: 12px; opacity: 0.9;">Powered by Contentstack MCP</p>
            </div>
            <button class="contentiq-close" style="background: none; border: none; color: white; cursor: pointer; font-size: 20px;">×</button>
          </div>
          <div class="contentiq-messages">
            <div class="contentiq-welcome" style="text-align: center; padding: 32px 16px;">
              <div style="font-size: 48px; margin-bottom: 16px;">🤖</div>
              <h4 style="margin: 0 0 8px; font-size: 18px;">${this.config.welcomeMessage}</h4>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Ask me anything about your content.</p>
            </div>
          </div>
          <div class="contentiq-input-area">
            <form class="contentiq-input-form">
              <input type="text" class="contentiq-input" placeholder="Type your message..." />
              <button type="submit" class="contentiq-send">→</button>
            </form>
          </div>
        </div>
      `;

      document.body.appendChild(this.container);

      // Auto-open if configured
      if (this.config.autoOpen) {
        setTimeout(() => this.open(), 1000);
      }
    }

    bindEvents() {
      const fab = this.container.querySelector('.contentiq-fab');
      const chat = this.container.querySelector('.contentiq-chat');
      const close = this.container.querySelector('.contentiq-close');
      const form = this.container.querySelector('.contentiq-input-form');
      const input = this.container.querySelector('.contentiq-input');

      fab.addEventListener('click', () => this.toggle());
      close.addEventListener('click', () => this.close());
      
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = input.value.trim();
        if (message) {
          this.sendMessage(message);
          input.value = '';
        }
      });
    }

    open() {
      this.isOpen = true;
      this.container.querySelector('.contentiq-chat').classList.add('open');
    }

    close() {
      this.isOpen = false;
      this.container.querySelector('.contentiq-chat').classList.remove('open');
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    async sendMessage(message) {
      this.addMessage('user', message);
      this.showTyping();

      try {
        const response = await fetch(`${this.config.apiUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify({
            message,
            session_id: this.sessionId
          })
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        this.hideTyping();
        this.addMessage('assistant', data.response || 'Sorry, I couldn\'t understand that.');

      } catch (error) {
        console.error('ContentIQ: Error sending message', error);
        this.hideTyping();
        this.addMessage('assistant', 'Sorry, I\'m having trouble connecting. Please try again.');
      }
    }

    addMessage(role, content) {
      const messagesContainer = this.container.querySelector('.contentiq-messages');
      
      // Remove welcome message if present
      const welcome = messagesContainer.querySelector('.contentiq-welcome');
      if (welcome) {
        welcome.remove();
      }

      const messageEl = document.createElement('div');
      messageEl.className = `contentiq-message ${role}`;
      messageEl.innerHTML = `
        <div class="contentiq-message-bubble">${content}</div>
      `;

      messagesContainer.appendChild(messageEl);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      this.messages.push({ role, content, timestamp: Date.now() });
      this.updateBadge();
    }

    showTyping() {
      const messagesContainer = this.container.querySelector('.contentiq-messages');
      const typingEl = document.createElement('div');
      typingEl.className = 'contentiq-typing';
      typingEl.innerHTML = '<div class="contentiq-message-bubble">Typing...</div>';
      messagesContainer.appendChild(typingEl);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTyping() {
      const typing = this.container.querySelector('.contentiq-typing');
      if (typing) {
        typing.remove();
      }
    }

    updateBadge() {
      const badge = this.container.querySelector('.contentiq-badge');
      const userMessages = this.messages.filter(m => m.role === 'user').length;
      
      if (userMessages > 0 && !this.isOpen) {
        badge.textContent = userMessages;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  // Auto-initialize if global config is present
  if (window.ContentIQConfig) {
    window.ContentIQ.init(window.ContentIQConfig);
  }

  // Expose public API
  window.ContentIQ.open = function() {
    if (window.ContentIQWidget) {
      window.ContentIQWidget.open();
    }
  };

  window.ContentIQ.close = function() {
    if (window.ContentIQWidget) {
      window.ContentIQWidget.close();
    }
  };

  window.ContentIQ.sendMessage = function(message) {
    if (window.ContentIQWidget) {
      window.ContentIQWidget.sendMessage(message);
    }
  };

})();
