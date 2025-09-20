// Event Handlers Module
// Manages all event listeners for the popup interface

import { PopupUtils } from '../utils/popup-utils.js';
import { StockDisplayUI } from './stock-display.js';
import { GeminiChatUI } from './gemini-chat.js';

export class EventHandlers {
  constructor(fetchStockCallback, getCurrentTickerCallback, setCurrentTickerCallback) {
    this.fetchStock = fetchStockCallback;
    this.getCurrentTicker = getCurrentTickerCallback;
    this.setCurrentTicker = setCurrentTickerCallback;
    this.setupAllEventListeners();
  }

  setupAllEventListeners() {
    this.setupSearchEventListeners();
    this.setupPopularStockEventListeners();
    this.setupChartPeriodEventListeners();
    this.setupClearDataEventListener();
    this.setupGeminiChatEventListeners();
    this.setupCustomEventListeners();
  }

  setupSearchEventListeners() {
    // Search button
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        this.handleManualSearch();
      });
    }

    // Enter key in ticker input
    const tickerInput = document.getElementById('tickerInput');
    if (tickerInput) {
      tickerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleManualSearch();
        }
      });

      // Auto-detection button in auto-detection section
      const autoBtn = document.getElementById('autoBtn');
      if (autoBtn) {
        autoBtn.addEventListener('click', async () => {
          const detectedTicker = document.getElementById('detectedTicker').textContent;
          if (detectedTicker) {
            console.log(`🔍 Auto-detecting stock for: ${detectedTicker}`);
            await this.fetchStock(detectedTicker);
          }
        });
      }
    }
  }

  setupPopularStockEventListeners() {
    // Popular stock buttons
    document.querySelectorAll('.ticker-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ticker = btn.getAttribute('data-ticker');
        if (ticker) {
          console.log(`📊 Popular stock clicked: ${ticker}`);
          await this.fetchStock(ticker);
        }
      });
    });
  }

  setupChartPeriodEventListeners() {
    // Chart period buttons
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const currentTicker = this.getCurrentTicker();
        if (!currentTicker) {
          console.warn('❌ No current ticker for period change');
          return;
        }

        const period = btn.getAttribute('data-period');
        console.log(`📊 Period button clicked: ${period} for ${currentTicker}`);

        // Update active button
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Show loading state briefly
        StockDisplayUI.showLoadingState();

        try {
          // Fetch new data for the selected period
          console.log(`🔄 Fetching ${period} data for ${currentTicker}`);
          await this.fetchStock(currentTicker, period);
        } catch (error) {
          console.error(`❌ Error fetching ${period} data:`, error);
          StockDisplayUI.showError(`Failed to load ${period} data`);
        }
      });
    });
  }

  setupClearDataEventListener() {
    // Clear data button
    const clearBtn = document.getElementById('clearDataBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        console.log('🧹 User clicked clear button');
        
        try {
          // Clear stored data in background
          await PopupUtils.clearStoredData();
          
          // Reset current state
          this.setCurrentTicker(null);
          
          // Reset UI to manual input state
          StockDisplayUI.showManualInput();
          
          console.log('✅ Data cleared and UI reset');
        } catch (error) {
          console.error('❌ Error clearing data:', error);
          StockDisplayUI.showError('Failed to clear data');
        }
      });
    }
  }

  setupGeminiChatEventListeners() {
    // Set up Gemini chat events
    GeminiChatUI.setupChatEventListeners(this.getCurrentTicker);
  }

  setupCustomEventListeners() {
    // Custom event for ticker suggestions
    document.addEventListener('fetchStock', async (event) => {
      const { ticker } = event.detail;
      if (ticker) {
        console.log(`🔄 Custom fetchStock event for: ${ticker}`);
        await this.fetchStock(ticker);
      }
    });
  }

  async handleManualSearch() {
    const tickerInput = document.getElementById('tickerInput');
    const inputValue = tickerInput.value.trim();

    console.log(`🔍 Manual search initiated for: "${inputValue}"`);

    // Validate input
    const validation = PopupUtils.validateTickerInput(inputValue);
    if (!validation.valid) {
      console.error(`❌ Input validation failed: ${validation.error}`);
      StockDisplayUI.showError(validation.error);
      return;
    }

    const ticker = validation.ticker;
    console.log(`✅ Valid ticker entered: ${ticker}`);

    // Clear input and fetch data
    tickerInput.value = '';
    await this.fetchStock(ticker);
  }

  // Method to refresh event listeners after DOM changes
  refreshEventListeners() {
    console.log('🔄 Refreshing event listeners after DOM update');
    this.setupPopularStockEventListeners();
    // Note: Other listeners are typically on elements that don't change
  }
}
