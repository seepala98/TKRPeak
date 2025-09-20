// Main Background Script - Module Coordinator
// Imports and coordinates all background functionality

import { ContextMenuHandler } from './handlers/context-menu.js';
import { MessageHandler } from './handlers/message-handler.js';

class BackgroundScript {
  constructor() {
    this.contextMenuHandler = null;
    this.messageHandler = null;
    this.initialize();
  }

  async initialize() {
    console.log('🚀 Background script initializing...');
    
    try {
      // Initialize context menu handler
      this.contextMenuHandler = new ContextMenuHandler();
      
      // Initialize message handler with context menu reference
      this.messageHandler = new MessageHandler(this.contextMenuHandler);
      
      console.log('✅ Background script initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing background script:', error);
    }
  }
}

// Initialize the background script
const backgroundScript = new BackgroundScript();
