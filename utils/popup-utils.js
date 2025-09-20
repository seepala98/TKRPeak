// Popup Utilities Module
// Shared utility functions for the popup interface

import { TickerUtils } from './ticker-utils.js';

export class PopupUtils {
  static async getActiveTabSelectedText() {
    try {
      console.log('🔍 Checking for selected text on active tab');

      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        console.log('❌ No active tab found');
        return null;
      }

      console.log(`📄 Active tab: ${tab.title} (${tab.url})`);

      // Try to get selected text from content script
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { 
          action: 'getSelectedText' 
        });
        
        if (response && response.success && response.selectedText) {
          const selectedText = response.selectedText.trim();
          console.log(`✅ Found selected text: "${selectedText}"`);
          
          const ticker = TickerUtils.extractTicker(selectedText);
          if (ticker) {
            console.log(`🎯 Valid ticker extracted: ${ticker}`);
            return ticker;
          } else {
            console.log(`❌ No valid ticker found in: "${selectedText}"`);
          }
        } else {
          console.log('ℹ️ No selected text found on page');
        }
      } catch (messageError) {
        console.log('❌ Could not get selected text from content script:', messageError.message);
      }

      return null;
    } catch (error) {
      console.error('❌ Error checking for selected text:', error);
      return null;
    }
  }

  static async fetchStockDataFromBackground(ticker, period = '1d') {
    console.log(`📊 Requesting stock data for ${ticker} (${period}) from background`);
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'fetchStockDataBackground',
        ticker: ticker,
        period: period
      });

      console.log('📨 Background response received:', response);

      if (response && response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to fetch stock data from background');
      }
    } catch (error) {
      console.error(`❌ Error fetching stock data for ${ticker}:`, error);
      throw error;
    }
  }

  static async getStoredStockData() {
    console.log('📦 Requesting stored stock data from background');
    
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'getStoredStockData' 
      });

      if (response && response.success) {
        console.log('✅ Stored data received:', response);
        return {
          ticker: response.ticker,
          data: response.data
        };
      } else {
        console.log('ℹ️ No stored data available');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting stored data:', error);
      return null;
    }
  }

  static async clearStoredData() {
    console.log('🧹 Clearing stored data via background script');
    
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'clearStoredData' 
      });

      if (response && response.success) {
        console.log('✅ Data cleared successfully');
        return true;
      } else {
        console.error('❌ Failed to clear data:', response.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error clearing data:', error);
      return false;
    }
  }

  static validateTickerInput(input) {
    if (!input || typeof input !== 'string') {
      return { valid: false, error: 'Please enter a ticker symbol' };
    }

    const cleanInput = input.trim().toUpperCase();
    
    if (cleanInput.length === 0) {
      return { valid: false, error: 'Please enter a ticker symbol' };
    }

    if (cleanInput.length > 6) {
      return { valid: false, error: 'Ticker symbol too long' };
    }

    if (!TickerUtils.isValidTicker(cleanInput)) {
      return { valid: false, error: 'Invalid ticker format' };
    }

    return { valid: true, ticker: cleanInput };
  }

  static formatPeriodLabel(period) {
    const labelMap = {
      '1d': '1-Day View',
      '5d': '5-Day View', 
      '1mo': '1-Month View',
      '6mo': '6-Month View',
      '1y': '1-Year View'
    };
    return labelMap[period] || 'Stock Overview';
  }

  static formatPrice(price) {
    if (typeof price !== 'number') return '$0.00';
    return `$${price.toFixed(2)}`;
  }

  static formatChange(change, changePercent) {
    if (typeof change !== 'number' || typeof changePercent !== 'number') {
      return '+$0.00 (+0.00%)';
    }

    const sign = change >= 0 ? '+' : '';
    return `${sign}${this.formatPrice(Math.abs(change))} (${sign}${changePercent.toFixed(2)}%)`;
  }

  static formatMarketCap(marketCap) {
    if (!marketCap || typeof marketCap !== 'number') {
      return 'N/A';
    }

    if (marketCap >= 1000000000000) { // Trillion
      return `$${(marketCap / 1000000000000).toFixed(1)}T`;
    } else if (marketCap >= 1000000000) { // Billion
      return `$${(marketCap / 1000000000).toFixed(1)}B`;
    } else if (marketCap >= 1000000) { // Million
      return `$${(marketCap / 1000000).toFixed(1)}M`;
    } else {
      return this.formatPrice(marketCap);
    }
  }

  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}
