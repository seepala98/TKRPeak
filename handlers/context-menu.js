// Context Menu Handler Module
// Handles all context menu related functionality

import { TickerUtils } from '../utils/ticker-utils.js';
import { YahooFinanceAPI } from '../api/yahoo-finance.js';

export class ContextMenuHandler {
  constructor() {
    this.selectedTicker = null;
    this.selectedStockData = null;
    this.createContextMenu();
    this.setupEventListeners();
  }

  createContextMenu() {
    // Create context menu item
    chrome.contextMenus.create({
      id: "stockInfo",
      title: "📊 Get Stock Information",
      contexts: ["selection"]
    });

    console.log("✅ Context menu created");
  }

  setupEventListeners() {
    // Handle context menu clicks
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      console.log("🖱️ Context menu clicked:", info);

      if (info.menuItemId === "stockInfo" && info.selectionText) {
        await this.handleStockInfoClick(info.selectionText, tab);
      }
    });
  }

  async handleStockInfoClick(selectedText, tab) {
    try {
      const ticker = TickerUtils.extractTicker(selectedText);
      console.log(`📝 Selected text: ${selectedText}`);
      console.log(`🎯 Extracted ticker: ${ticker}`);

      if (!ticker) {
        console.warn("❌ No valid ticker found in selected text");
        return;
      }

      // Store ticker and fetch data for extension popup
      this.selectedTicker = ticker;
      console.log(`💾 Stored ticker for extension popup: ${ticker}`);

      console.log("🔄 Fetching stock data for extension popup...");
      this.selectedStockData = await YahooFinanceAPI.fetchStockData(ticker, '1d');
      console.log(`✅ Stock data stored for extension popup:`, this.selectedStockData);

      // Update extension badge to show ticker
      chrome.action.setBadgeText({
        text: ticker,
        tabId: tab.id
      });
      chrome.action.setBadgeBackgroundColor({color: '#4285f4'});

      // Automatically open the extension popup after storing data
      try {
        await chrome.action.openPopup();
        console.log("✅ Extension popup opened automatically");
      } catch (popupError) {
        console.log("ℹ️ Could not open popup automatically:", popupError.message);
        
        // Show notification as fallback if popup can't be opened
        try {
          await chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Stock Data Ready!',
            message: `${ticker} data loaded. Click the extension icon to view.`
          });
          console.log("📢 Notification shown as fallback");
        } catch (notificationError) {
          console.log("Could not show notification either:", notificationError);
        }
      }

    } catch (error) {
      console.error("❌ Error fetching stock data:", error);
      this.selectedStockData = null;
    }
  }

  getStoredData() {
    return {
      ticker: this.selectedTicker,
      data: this.selectedStockData
    };
  }

  clearStoredData() {
    console.log("🧹 Clearing stored stock data");
    this.selectedTicker = null;
    this.selectedStockData = null;
    
    // Clear badge
    chrome.action.setBadgeText({text: ''});
    
    console.log("✅ Stored data cleared");
  }
}
