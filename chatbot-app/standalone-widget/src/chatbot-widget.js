/**
 * Standalone Chatbot Widget - Web Component
 * Compatible with: Angular 9+, React, Vue, Vanilla JS, or any framework
 * No dependencies required
 */

class ChatbotWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // State
    this.isOpen = false;
    this.messages = [];
    this.isLoading = false;
    this.isRecording = false;
    this.conversationId = null;
    this.lastInputMethod = 'text';
    this.isSidebarOpen = false;
    this.conversations = [];

    // Config defaults — overridden by connectedCallback()
    this.apiBaseUrl = 'http://localhost:5112';
    this.streamEndpoint = `${this.apiBaseUrl}/api/chat/stream-sdk`;
    this.conversationsEndpoint = `${this.apiBaseUrl}/api/conversations`;
    this.widgetTitle = 'AI Assistant';
    this.floating = true;
    this.enableVoice = true;
    this.recognition = null;

    // Speech synthesis (safe — no DOM attributes involved)
    this.synthesis = window.speechSynthesis;
    this.currentUtterance = null;
    this.speakingMessageId = null;
    this.isSpeakingPaused = false;
  }
  
  connectedCallback() {
    // Read all attributes here — element is connected, attributes are available
    this.apiBaseUrl = this.getAttribute('api-url') || 'http://localhost:5112';
    this.streamEndpoint = `${this.apiBaseUrl}/api/chat/stream-sdk`;
    this.conversationsEndpoint = `${this.apiBaseUrl}/api/conversations`;
    this.widgetTitle = this.getAttribute('title') || 'AI Assistant';
    this.floating = this.getAttribute('floating') !== 'false';
    this.enableVoice = this.getAttribute('enable-voice') !== 'false';

    // Speech recognition setup (depends on enableVoice — must come after)
    this.recognition = null;
    if (this.enableVoice && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    }

    this.render();
    this.attachEventListeners();
  }
  
  disconnectedCallback() {
    this.stopSpeaking();
    if (this.recognition) {
      this.recognition.stop();
    }
  }
  
  render() {
    const styles = this.getStyles();
    const html = this.getHTML();
    
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      ${html}
    `;
  }
  
  getStyles() {
    return `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      :host {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 14px;
      }
      
      /* Floating Button */
      .chatbot-fab {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        transition: all 0.2s ease;
        font-size: 28px;
      }
      
      .chatbot-fab:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
      }
      
      .chatbot-fab.hidden {
        display: none;
      }
      
      /* Chat Panel */
      .chatbot-panel {
        position: fixed;
        bottom: ${this.floating ? '96px' : '0'};
        right: ${this.floating ? '24px' : '0'};
        width: ${this.floating ? '360px' : '100%'};
        height: ${this.floating ? '520px' : '100vh'};
        background: white;
        border-radius: ${this.floating ? '12px' : '0'};
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 9999;
        transform: translateY(${this.floating ? '600px' : '100vh'});
        opacity: 0;
        transition: all 0.3s ease;
      }
      
      .chatbot-panel.open {
        transform: translateY(0);
        opacity: 1;
      }
      
      /* Header */
      .chatbot-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      
      .chatbot-title {
        font-size: 18px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .chatbot-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        transition: background 0.2s;
        font-size: 20px;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .chatbot-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      /* Messages Container */
      .chatbot-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        background: #fafbfc;
        scroll-behavior: smooth;
      }
      
      .chatbot-messages::-webkit-scrollbar {
        width: 6px;
      }
      
      .chatbot-messages::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .chatbot-messages::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
      }
      
      .chatbot-messages::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
      
      /* Welcome Message */
      .welcome-message {
        text-align: center;
        padding: 80px 20px;
        color: #6b7280;
      }
      
      .welcome-icon {
        font-size: 64px;
        margin-bottom: 20px;
      }
      
      .welcome-message h2 {
        font-size: 24px;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 12px;
      }
      
      .welcome-message p {
        font-size: 15px;
        color: #6b7280;
      }
      
      /* Message Item */
      .message {
        display: flex;
        gap: 10px;
        margin-bottom: 16px;
        animation: slideIn 0.3s ease-out;
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .message.user {
        flex-direction: row-reverse;
      }
      
      .message-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      
      .message-content {
        display: flex;
        flex-direction: column;
        max-width: 75%;
      }
      
      .message.user .message-content {
        align-items: flex-end;
      }
      
      .message-bubble {
        padding: 12px 16px;
        border-radius: 16px;
        word-break: break-word;
        line-height: 1.6;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        transition: transform 0.2s ease;
      }
      
      .message-bubble:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      }
      
      .message.user .message-bubble {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-bottom-right-radius: 4px;
      }
      
      .message.bot .message-bubble {
        background: #f7f7f8;
        color: #2d3748;
        border-bottom-left-radius: 4px;
        border: 1px solid #e8e8ea;
      }
      
      .message-time {
        font-size: 11px;
        color: #9ca3af;
        margin-top: 4px;
        padding: 0 4px;
        font-weight: 500;
      }
      
      .message-actions {
        display: flex;
        gap: 6px;
        margin-top: 8px;
      }
      
      .message-action-btn {
        background: white;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        padding: 6px 10px;
        cursor: pointer;
        color: #4b5563;
        font-size: 12px;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      .message-action-btn:hover:not(:disabled) {
        background: #f3f4f6;
        border-color: #9ca3af;
        transform: translateY(-1px);
      }
      
      .message-action-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      
      /* Typing Indicator */
      .typing-indicator {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        margin-bottom: 16px;
      }
      
      .typing-bubble {
        background: #f7f7f8;
        border: 1px solid #e8e8ea;
        border-radius: 16px;
        border-bottom-left-radius: 4px;
        padding: 12px 16px;
        display: flex;
        gap: 4px;
      }
      
      .typing-dot {
        width: 8px;
        height: 8px;
        background: #9ca3af;
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out;
      }
      
      .typing-dot:nth-child(1) { animation-delay: 0s; }
      .typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .typing-dot:nth-child(3) { animation-delay: 0.4s; }
      
      @keyframes bounce {
        0%, 80%, 100% {
          transform: scale(0.8);
          opacity: 0.5;
        }
        40% {
          transform: scale(1.2);
          opacity: 1;
        }
      }
      
      /* Input Area */
      .chatbot-input {
        padding: 16px;
        border-top: 1px solid #e5e7eb;
        background: white;
      }
      
      .input-row {
        display: flex;
        align-items: flex-end;
        gap: 8px;
      }
      
      .input-textarea {
        flex: 1;
        resize: none;
        border: 2px solid #e5e7eb;
        border-radius: 24px;
        padding: 12px 16px;
        font-size: 14px;
        font-family: inherit;
        outline: none;
        transition: all 0.2s ease;
        max-height: 120px;
        line-height: 1.5;
      }
      
      .input-textarea:focus {
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }
      
      .input-textarea::placeholder {
        color: #9ca3af;
      }
      
      .input-btn {
        width: 44px;
        height: 44px;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        font-size: 20px;
        flex-shrink: 0;
      }
      
      .mic-btn {
        background: none;
        color: #6b7280;
      }
      
      .mic-btn:hover:not(:disabled) {
        background: rgba(102, 126, 234, 0.1);
        color: #667eea;
      }
      
      .mic-btn.recording {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
        animation: pulse-mic 1.5s ease-in-out infinite;
      }
      
      @keyframes pulse-mic {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      
      .send-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      
      .send-btn:hover:not(:disabled) {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
      
      .send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      
      .recording-indicator {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #ef4444;
        font-weight: 600;
        margin-top: 8px;
      }
      
      .recording-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ef4444;
        animation: pulse 1.2s ease-in-out infinite;
      }
      
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.3;
          transform: scale(0.7);
        }
      }

      /* Markdown inside bot bubbles */
      .message-bubble pre {
        background: #1e1e1e;
        color: #d4d4d4;
        border-radius: 8px;
        padding: 12px;
        overflow-x: auto;
        margin: 8px 0;
        font-size: 13px;
      }

      .message-bubble pre code {
        background: none;
        padding: 0;
        color: inherit;
      }

      .message-bubble code {
        background: rgba(0, 0, 0, 0.06);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 13px;
        font-family: 'Consolas', 'Monaco', monospace;
      }

      .message-bubble h1, .message-bubble h2, .message-bubble h3,
      .message-bubble h4, .message-bubble h5, .message-bubble h6 {
        margin: 8px 0 4px;
        line-height: 1.3;
      }

      .message-bubble ul, .message-bubble ol {
        margin: 4px 0;
        padding-left: 20px;
      }

      .message-bubble li {
        margin: 2px 0;
      }

      .message-bubble p {
        margin: 4px 0;
      }

      .streaming .cursor {
        display: inline-block;
        animation: blink 1s step-start infinite;
      }

      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }

      /* Body: sidebar + messages side-by-side */
      .chatbot-body {
        flex: 1;
        display: flex;
        flex-direction: row;
        overflow: hidden;
        min-height: 0;
      }

      .chatbot-messages {
        min-width: 0;
      }

      /* Header left group */
      .chatbot-header-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .sidebar-toggle {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 6px;
        border-radius: 6px;
        font-size: 18px;
        line-height: 1;
        transition: background 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .sidebar-toggle:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      /* Sidebar */
      .chatbot-sidebar {
        width: 160px;
        flex-shrink: 0;
        border-right: 1px solid #e5e7eb;
        background: #f9fafb;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .chatbot-sidebar-header {
        padding: 10px 12px;
        font-size: 11px;
        font-weight: 700;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        border-bottom: 1px solid #e5e7eb;
        flex-shrink: 0;
      }

      .sidebar-new-btn {
        padding: 9px 12px;
        background: none;
        border: none;
        border-bottom: 1px solid #e5e7eb;
        cursor: pointer;
        width: 100%;
        text-align: left;
        font-size: 12px;
        color: #667eea;
        font-weight: 600;
        transition: background 0.15s;
        flex-shrink: 0;
      }

      .sidebar-new-btn:hover {
        background: #ede9fe;
      }

      .sidebar-items {
        flex: 1;
        overflow-y: auto;
      }

      .sidebar-items::-webkit-scrollbar { width: 4px; }
      .sidebar-items::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

      .sidebar-item {
        padding: 9px 12px;
        cursor: pointer;
        border-bottom: 1px solid #f3f4f6;
        transition: background 0.15s;
        border-left: 3px solid transparent;
      }

      .sidebar-item:hover {
        background: #f3f4f6;
      }

      .sidebar-item.active {
        background: #ede9fe;
        border-left-color: #667eea;
      }

      .sidebar-item-title {
        font-size: 12px;
        font-weight: 500;
        color: #374151;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
      }

      .sidebar-item-date {
        font-size: 10px;
        color: #9ca3af;
        display: block;
        margin-top: 2px;
      }

      .sidebar-empty {
        padding: 16px 12px;
        font-size: 12px;
        color: #9ca3af;
        text-align: center;
      }
    `;
  }
  
  getHTML() {
    if (this.floating) {
      return `
        <button class="chatbot-fab ${this.isOpen ? 'hidden' : ''}" id="chatbot-fab">
          💬
        </button>
        <div class="chatbot-panel ${this.isOpen ? 'open' : ''}" id="chatbot-panel">
          ${this.getPanelContent()}
        </div>
      `;
    } else {
      return `
        <div class="chatbot-panel open" id="chatbot-panel">
          ${this.getPanelContent()}
        </div>
      `;
    }
  }
  
  getPanelContent() {
    return `
      <div class="chatbot-header">
        <div class="chatbot-header-left">
          <button class="sidebar-toggle" id="sidebar-toggle" title="Chat History">☰</button>
          <div class="chatbot-title">
            <span>💬</span>
            <span>${this.widgetTitle}</span>
          </div>
        </div>
        ${this.floating ? '<button class="chatbot-close" id="chatbot-close">✕</button>' : ''}
      </div>
      <div class="chatbot-body">
        ${this.isSidebarOpen ? `
          <div class="chatbot-sidebar" id="chatbot-sidebar">
            <div class="chatbot-sidebar-header">History</div>
            <button class="sidebar-new-btn" id="sidebar-new-btn">+ New Chat</button>
            <div class="sidebar-items" id="sidebar-list">
              ${this.getSidebarItemsHTML()}
            </div>
          </div>
        ` : ''}
        <div class="chatbot-messages" id="chatbot-messages">
          ${this.getMessagesHTML()}
        </div>
      </div>
      <div class="chatbot-input">
        <div class="input-row">
          ${this.enableVoice && this.recognition ? `
            <button class="input-btn mic-btn ${this.isRecording ? 'recording' : ''}"
                    id="mic-btn"
                    title="${this.isRecording ? 'Stop recording' : 'Start voice input'}">
              🎤
            </button>
          ` : ''}
          <textarea
            class="input-textarea"
            id="input-textarea"
            placeholder="Type your message..."
            rows="1"
            ${this.isLoading ? 'disabled' : ''}
          ></textarea>
          <button class="input-btn send-btn"
                  id="send-btn"
                  title="Send message"
                  ${this.isLoading ? 'disabled' : ''}>
            ${this.isLoading ? '⏳' : '📤'}
          </button>
        </div>
        ${this.isRecording ? `
          <div class="recording-indicator">
            <span class="recording-dot"></span>
            <span>Recording...</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  getSidebarItemsHTML() {
    if (this.conversations.length === 0) {
      return '<div class="sidebar-empty">No history yet</div>';
    }
    return this.conversations.map(conv => {
      const isActive = conv.id === this.conversationId;
      const date = new Date(conv.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
      const title = this.escapeHtml(conv.title || 'Untitled');
      return `
        <div class="sidebar-item ${isActive ? 'active' : ''}" data-id="${conv.id}">
          <span class="sidebar-item-title">${title}</span>
          <span class="sidebar-item-date">${date}</span>
        </div>
      `;
    }).join('');
  }
  
  getMessagesHTML() {
    if (this.messages.length === 0) {
      return `
        <div class="welcome-message">
          <div class="welcome-icon">🤖</div>
          <h2>Hello! How can I help you today?</h2>
          <p>Type a message below to start chatting.</p>
        </div>
      `;
    }
    
    let html = '';
    for (const msg of this.messages) {
      const time = new Date(msg.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const bubbleContent = msg.role === 'bot' ? this.renderMarkdown(msg.content) : this.escapeHtml(msg.content);

      let ttsButtons = '';
      if (msg.role === 'bot' && this.synthesis && !msg.error && !msg.isStreaming) {
        if (this.speakingMessageId === msg.id && !this.isSpeakingPaused) {
          ttsButtons = `
            <div class="message-actions">
              <button class="message-action-btn" onclick="this.getRootNode().host.pauseSpeaking()">⏸ Pause</button>
              <button class="message-action-btn" onclick="this.getRootNode().host.stopSpeaking()">⏹ Stop</button>
            </div>`;
        } else if (this.speakingMessageId === msg.id && this.isSpeakingPaused) {
          ttsButtons = `
            <div class="message-actions">
              <button class="message-action-btn" onclick="this.getRootNode().host.resumeSpeaking()">▶ Resume</button>
              <button class="message-action-btn" onclick="this.getRootNode().host.stopSpeaking()">⏹ Stop</button>
            </div>`;
        } else {
          ttsButtons = `
            <div class="message-actions">
              <button class="message-action-btn" onclick="this.getRootNode().host.speakMessage('${msg.id}', this.getRootNode().host.messages.find(m=>m.id==='${msg.id}').content)">🔊 Play</button>
            </div>`;
        }
      }

      html += `
        <div class="message ${msg.role}">
          <div class="message-avatar">${msg.role === 'user' ? '🧑' : '🤖'}</div>
          <div class="message-content">
            <div class="message-bubble${msg.isStreaming ? ' streaming' : ''}">
              ${bubbleContent}${msg.isStreaming ? '<span class="cursor">▍</span>' : ''}
            </div>
            ${ttsButtons}
            <span class="message-time">${time}</span>
          </div>
        </div>
      `;
    }
    
    // Only show the typing dots when loading but no streaming placeholder exists yet
    // (the placeholder itself shows a streaming cursor, so showing dots too = duplicate)
    const hasStreamingMsg = this.messages.some(m => m.isStreaming);
    if (this.isLoading && !hasStreamingMsg) {
      html += `
        <div class="typing-indicator">
          <div class="message-avatar">🤖</div>
          <div class="typing-bubble">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
          </div>
        </div>
      `;
    }
    
    return html;
  }
  
  attachEventListeners() {
    const fab = this.shadowRoot.getElementById('chatbot-fab');
    const closeBtn = this.shadowRoot.getElementById('chatbot-close');
    const sendBtn = this.shadowRoot.getElementById('send-btn');
    const micBtn = this.shadowRoot.getElementById('mic-btn');
    const textarea = this.shadowRoot.getElementById('input-textarea');
    
    if (fab) {
      fab.addEventListener('click', () => this.togglePanel());
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.togglePanel());
    }

    const sidebarToggle = this.shadowRoot.getElementById('sidebar-toggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => this.toggleSidebar());
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendMessage());
    }

    if (micBtn) {
      micBtn.addEventListener('click', () => this.toggleRecording());
    }

    if (textarea) {
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      textarea.addEventListener('input', () => this.autoResize(textarea));
    }

    this.attachSidebarListeners();
  }
  
  togglePanel() {
    this.isOpen = !this.isOpen;
    this.render();
    this.attachEventListeners();
    
    if (this.isOpen) {
      setTimeout(() => {
        const textarea = this.shadowRoot.getElementById('input-textarea');
        if (textarea) textarea.focus();
      }, 300);
    }
  }
  
  async sendMessage() {
    const textarea = this.shadowRoot.getElementById('input-textarea');
    const content = textarea.value.trim();

    if (!content || this.isLoading) return;

    const inputMethod = this.lastInputMethod || 'text';
    this.lastInputMethod = 'text';

    this.messages.push({
      id: Date.now().toString(),
      role: 'user',
      content: content,
      timestamp: new Date().toISOString()
    });

    textarea.value = '';
    this.autoResize(textarea);
    this.isLoading = true;

    // Add streaming placeholder for bot message
    const botMsgId = Date.now().toString() + '_bot';
    this.messages.push({
      id: botMsgId,
      role: 'bot',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true
    });
    this.updateMessages();

    try {
      const conversationId = await this.ensureConversation();

      const response = await fetch(this.streamEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, content, inputMethod })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') break;
          if (raw.startsWith('[STREAM_ERROR]:')) {
            throw new Error(raw.slice(15));
          }
          try {
            const parsed = JSON.parse(raw);
            accumulated += parsed;
          } catch {
            accumulated += raw;
          }
          this.updateBotMessage(botMsgId, accumulated);
        }
      }

      // Strip [SOURCES]:... appended by the backend
      const sourcesIdx = accumulated.indexOf('[SOURCES]:');
      if (sourcesIdx !== -1) accumulated = accumulated.slice(0, sourcesIdx).trimEnd();
      this.finalizeBotMessage(botMsgId, accumulated);
    } catch (error) {
      console.error('Chat error:', error);
      this.finalizeBotMessage(botMsgId, 'Sorry, I encountered an error. Please try again.', true);
    }

    this.isLoading = false;
    this.updateMessages();
  }
  
  toggleRecording() {
    if (!this.recognition) return;
    
    if (this.isRecording) {
      this.recognition.stop();
      this.isRecording = false;
    } else {
      this.isRecording = true;
      const textarea = this.shadowRoot.getElementById('input-textarea');
      textarea.value = '';
      
      this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript = event.results[i][0].transcript;
        }
        textarea.value = transcript;
        this.autoResize(textarea);
        this.lastInputMethod = 'voice';
      };

      this.recognition.onend = () => {
        this.isRecording = false;
        this.updateMessages();
      };
      
      this.recognition.onerror = () => {
        this.isRecording = false;
        this.updateMessages();
      };
      
      this.recognition.start();
    }
    
    this.updateMessages();
  }
  
  speakMessage(messageId, text) {
    if (!this.synthesis) return;

    if (this.currentUtterance) {
      this.stopSpeaking();
      return;
    }

    this.speakingMessageId = messageId;
    this.isSpeakingPaused = false;
    this.currentUtterance = new SpeechSynthesisUtterance(this.sanitizeForTts(text));
    this.currentUtterance.onend = () => {
      this.currentUtterance = null;
      this.speakingMessageId = null;
      this.isSpeakingPaused = false;
      this.updateMessagesDisplay();
    };
    this.currentUtterance.onerror = () => {
      this.currentUtterance = null;
      this.speakingMessageId = null;
      this.isSpeakingPaused = false;
      this.updateMessagesDisplay();
    };
    this.synthesis.speak(this.currentUtterance);
    this.updateMessagesDisplay();
  }

  pauseSpeaking() {
    if (window.speechSynthesis && this.currentUtterance) {
      window.speechSynthesis.pause();
      this.isSpeakingPaused = true;
      this.updateMessagesDisplay();
    }
  }

  resumeSpeaking() {
    if (window.speechSynthesis && this.isSpeakingPaused) {
      window.speechSynthesis.resume();
      this.isSpeakingPaused = false;
      this.updateMessagesDisplay();
    }
  }

  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.currentUtterance = null;
      this.speakingMessageId = null;
      this.isSpeakingPaused = false;
      this.updateMessagesDisplay();
    }
  }
  
  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    this.render();
    this.attachEventListeners();
    if (this.isSidebarOpen) {
      this.loadConversations();
    }
  }

  async loadConversations() {
    try {
      const resp = await fetch(this.conversationsEndpoint);
      if (!resp.ok) return;
      this.conversations = await resp.json();
      const sidebarList = this.shadowRoot.getElementById('sidebar-list');
      if (sidebarList) {
        sidebarList.innerHTML = this.getSidebarItemsHTML();
        this.attachSidebarListeners();
      }
    } catch (e) { /* silent — backend may not be running */ }
  }

  async selectConversation(id) {
    if (this.isLoading) return;
    try {
      const resp = await fetch(`${this.conversationsEndpoint}/${id}`);
      if (!resp.ok) return;
      const conv = await resp.json();
      this.conversationId = conv.id;
      this.messages = (conv.messages || []).map(m => ({
        id: m.id.toString(),
        role: m.role === 'assistant' ? 'bot' : 'user',
        content: m.content,
        timestamp: m.timestamp
      }));
      // Highlight active item in sidebar
      this.shadowRoot.querySelectorAll('.sidebar-item').forEach(el => {
        el.classList.toggle('active', parseInt(el.getAttribute('data-id'), 10) === id);
      });
      this.updateMessages();
    } catch (e) { /* silent */ }
  }

  startNewChat() {
    this.conversationId = null;
    this.messages = [];
    this.updateMessages();
  }

  attachSidebarListeners() {
    const newBtn = this.shadowRoot.getElementById('sidebar-new-btn');
    if (newBtn) {
      newBtn.addEventListener('click', () => this.startNewChat());
    }
    this.shadowRoot.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.getAttribute('data-id'), 10);
        this.selectConversation(id);
      });
    });
  }

  async ensureConversation() {
    if (this.conversationId !== null) return this.conversationId;
    const resp = await fetch(this.conversationsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!resp.ok) throw new Error(`Failed to create conversation: HTTP ${resp.status}`);
    const data = await resp.json();
    this.conversationId = data.id;
    return this.conversationId;
  }

  updateBotMessage(id, content) {
    const msg = this.messages.find(m => m.id === id);
    if (msg) { msg.content = content; msg.isStreaming = true; }
    this.updateMessages();
  }

  finalizeBotMessage(id, content, isError = false) {
    const msg = this.messages.find(m => m.id === id);
    if (msg) { msg.content = content; msg.isStreaming = false; msg.error = isError; }
  }

  sanitizeForTts(text) {
    return text
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[_~>|]/g, '')
      .replace(/^[\s]*[-*•]\s+/gm, '')
      .replace(/^[\s]*\d+\.\s+/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  updateMessagesDisplay() {
    const messagesContainer = this.shadowRoot.getElementById('chatbot-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = this.getMessagesHTML();
    }
  }

  updateMessages() {
    const messagesContainer = this.shadowRoot.getElementById('chatbot-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = this.getMessagesHTML();
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Update input area
    const inputArea = this.shadowRoot.querySelector('.chatbot-input');
    if (inputArea) {
      const inputRow = inputArea.querySelector('.input-row');
      const newInputHTML = this.getPanelContent().match(/<div class="input-row">[\s\S]*?<\/div>/)[0];
      inputRow.outerHTML = newInputHTML;
      
      // Re-attach event listeners
      const sendBtn = this.shadowRoot.getElementById('send-btn');
      const micBtn = this.shadowRoot.getElementById('mic-btn');
      const textarea = this.shadowRoot.getElementById('input-textarea');
      
      if (sendBtn) {
        sendBtn.addEventListener('click', () => this.sendMessage());
      }
      if (micBtn) {
        micBtn.addEventListener('click', () => this.toggleRecording());
      }
      if (textarea) {
        textarea.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
          }
        });
        textarea.addEventListener('input', () => this.autoResize(textarea));
        textarea.focus();
      }
    }
  }
  
  autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  renderMarkdown(text) {
    let html = this.escapeHtml(text);

    // Fenced code blocks
    html = html.replace(/```[\w]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic (not inside bold)
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Headers h1-h6
    html = html.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, content) => {
      const level = hashes.length;
      return `<h${level}>${content}</h${level}>`;
    });

    // Unordered list items
    html = html.replace(/((?:^[\t ]*[-*]\s+.+\n?)+)/gm, (block) => {
      const items = block.trim().split('\n').map(line =>
        '<li>' + line.replace(/^[\t ]*[-*]\s+/, '') + '</li>'
      ).join('');
      return '<ul>' + items + '</ul>';
    });

    // Ordered list items
    html = html.replace(/((?:^[\t ]*\d+\.\s+.+\n?)+)/gm, (block) => {
      const items = block.trim().split('\n').map(line =>
        '<li>' + line.replace(/^[\t ]*\d+\.\s+/, '') + '</li>'
      ).join('');
      return '<ol>' + items + '</ol>';
    });

    // Double newlines → paragraph breaks
    html = html.replace(/\n\n+/g, '</p><p>');

    // Single newlines → <br>
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraph
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');

    return html;
  }
}

// Register the custom element
if (!customElements.get('chatbot-widget')) {
  customElements.define('chatbot-widget', ChatbotWidget);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatbotWidget;
}
