// Main Popup Script - Module Coordinator
// Imports and coordinates all popup functionality

import { StockDisplayUI } from './ui/stock-display.js';
import { ChartRenderer } from './ui/chart.js';
import { GeminiChatUI } from './ui/gemini-chat.js';
import { EventHandlers } from './ui/event-handlers.js';
import { PopupUtils } from './utils/popup-utils.js';

class PopupScript {
  constructor() {
    this.currentStockData = null;
    this.currentTicker = null;
    this.eventHandlers = null;
    this.initialize();
  }

  async initialize() {
    console.log('📊 Stock Extension popup loaded');
    
    try {
      // Initialize popup UI
      await this.initializePopup();
      
      // Set up event handlers
      this.setupEventHandlers();
      
      console.log('✅ Popup initialization complete');
    } catch (error) {
      console.error('❌ Error initializing popup:', error);
      StockDisplayUI.showError('Failed to initialize popup');
    }
  }

  async initializePopup() {
    try {
      // First priority: Check for stored stock data from right-click
      const hasStoredData = await this.loadStoredData();
      
      if (!hasStoredData) {
        // Second priority: Check for selected text on current page
        const selectedTicker = await PopupUtils.getActiveTabSelectedText();
        
        if (selectedTicker) {
          console.log(`🎯 Auto-detected ticker: ${selectedTicker}`);
          StockDisplayUI.showAutoDetection(selectedTicker);
        } else {
          // Show manual input as default
          StockDisplayUI.showManualInput();
        }
      }
    } catch (error) {
      console.error('❌ Error during popup initialization:', error);
      StockDisplayUI.showManualInput();
    }
  }

  async loadStoredData() {
    try {
      const storedData = await PopupUtils.getStoredStockData();
      
      if (storedData && storedData.ticker && storedData.data) {
        console.log(`📦 Loading stored data for ${storedData.ticker}`);
        
        this.currentTicker = storedData.ticker;
        this.currentStockData = storedData.data;
        
        // Show stock data immediately
        this.showStockData(storedData.data, storedData.ticker);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error loading stored data:', error);
      return false;
    }
  }

  setupEventHandlers() {
    // Create event handlers with callbacks
    this.eventHandlers = new EventHandlers(
      // Fetch stock callback
      (ticker, period) => this.fetchStockData(ticker, period),
      // Get current ticker callback
      () => this.currentTicker,
      // Set current ticker callback
      (ticker) => { this.currentTicker = ticker; }
    );
    
    console.log('🎯 Event handlers initialized');
  }

  async fetchStockData(ticker, period = '1d') {
    console.log(`📊 Fetching stock data for ${ticker} (${period})`);
    
    // Show loading state
    StockDisplayUI.showLoadingState();
    
    try {
      // Fetch data from background script
      const stockData = await PopupUtils.fetchStockDataFromBackground(ticker, period);
      
      // Handle ticker suggestions
      if (stockData.suggestions) {
        console.log('💡 Received ticker suggestions:', stockData.suggestions);
        StockDisplayUI.showTickerSuggestions(stockData.suggestions);
        return;
      }
      
      // Store current data
      this.currentStockData = stockData;
      this.currentTicker = ticker;
      
      // Display data
      this.showStockData(stockData, ticker);
      
      console.log(`✅ Successfully loaded data for ${ticker}`);
    } catch (error) {
      console.error(`❌ Error fetching stock data for ${ticker}:`, error);
      StockDisplayUI.showError(`Failed to load data for ${ticker}`);
    }
  }

  showStockData(data, ticker) {
    // Update UI
    StockDisplayUI.showStockData(data, ticker);
    
    // Draw chart
    this.drawChart(data.period || '1d');
    
    // Set active period button
    this.setActivePeriodButton(data.period || '1d');
    
    // Clear Gemini chat
    GeminiChatUI.clearChat();
    
    console.log(`📊 Stock data displayed for ${ticker}`);
  }

  drawChart(period) {
    if (this.currentStockData) {
      ChartRenderer.drawChart(this.currentStockData, period);
      console.log(`📈 Chart drawn for period: ${period}`);
    }
  }

  setActivePeriodButton(period) {
    // Remove active class from all buttons
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Add active class to current period button
    const activeButton = document.querySelector(`[data-period="${period}"]`);
    if (activeButton) {
      activeButton.classList.add('active');
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupScript();
});
