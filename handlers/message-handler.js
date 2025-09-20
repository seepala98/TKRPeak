// Message Handler Module
// Handles all inter-script communication and message routing

import { YahooFinanceAPI } from '../api/yahoo-finance.js';
import { GeminiAPI } from '../api/gemini.js';

export class MessageHandler {
  constructor(contextMenuHandler) {
    this.contextMenuHandler = contextMenuHandler;
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
      console.log("📨 Background script received message:", request);
      
      try {
        const result = await this.handleMessage(request, sender);
        sendResponse(result);
      } catch (error) {
        console.error("❌ Error handling message:", error);
        sendResponse({ 
          success: false, 
          error: error.message || "Unknown error in message handler" 
        });
      }

      return true; // Will respond asynchronously for all cases
    });
  }

  async handleMessage(request, sender) {
    switch (request.action) {
      case "ping":
        console.log("🏓 Background script ping received:", request.message);
        return { 
          success: true, 
          message: "Background script is alive", 
          timestamp: Date.now() 
        };

      case "getStoredStockData":
        return this.handleGetStoredStockData();

      case "clearStoredData":
        return this.handleClearStoredData();

      case "fetchStockDataBackground":
        return await this.handleFetchStockData(request.ticker, request.period);

      case "analyzeContent":
        return await this.handleAnalyzeContent(request);

      default:
        console.log("❓ Background script: Unknown message action:", request.action);
        return { 
          success: false, 
          error: "Unknown action: " + request.action 
        };
    }
  }

  handleGetStoredStockData() {
    console.log("🎯 Popup requesting stored stock data");
    
    const storedData = this.contextMenuHandler.getStoredData();
    console.log("📦 Stored ticker:", storedData.ticker);
    console.log("📦 Stored data:", storedData.data);
    
    if (storedData.ticker && storedData.data) {
      console.log("✅ Sending stored stock data to popup");
      return { 
        success: true, 
        ticker: storedData.ticker,
        data: storedData.data 
      };
    } else {
      console.log("ℹ️ No stored stock data available");
      return { 
        success: false, 
        message: "No stock data available. Select a ticker first." 
      };
    }
  }

  handleClearStoredData() {
    this.contextMenuHandler.clearStoredData();
    return { success: true, message: "Data cleared" };
  }

  async handleFetchStockData(ticker, period = '1d') {
    console.log(`🎯 Background script received API request for: ${ticker} (${period})`);
    console.log("📊 Starting background API fetch process...");
    
    try {
      const stockData = await YahooFinanceAPI.fetchStockData(ticker, period);
      console.log("✅ Background script API call successful! Sending response:", stockData);
      console.log(`🚀 Background script successfully fetched ${ticker} data!`);
      
      // If it's ticker suggestions, return them
      if (stockData.suggestions) {
        const suggestions = await YahooFinanceAPI.getTickerSuggestions(ticker);
        if (suggestions.length > 0) {
          return { success: true, data: { suggestions: suggestions } };
        }
      }
      
      return { success: true, data: stockData };
    } catch (error) {
      console.error("❌ Background API fetch failed:", error);
      console.error("🔍 Background script error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Try to get ticker suggestions as fallback
      try {
        const suggestions = await YahooFinanceAPI.getTickerSuggestions(ticker);
        if (suggestions.length > 0) {
          return { success: true, data: { suggestions: suggestions } };
        }
      } catch (suggestionError) {
        console.error("❌ Ticker suggestions also failed:", suggestionError);
      }
      
      console.log("📤 Sending error response to content script...");
      return { 
        success: false, 
        error: error.message || "Unknown error in background script",
        errorType: error.name,
        timestamp: new Date().toISOString()
      };
    }
  }

  async handleAnalyzeContent(request) {
    const { prompt, url, webContent } = request;

    try {
      // Get API key from storage
      const result = await new Promise(resolve => {
        chrome.storage.sync.get(['geminiApiKey'], resolve);
      });
      const GEMINI_API_KEY = result.geminiApiKey;

      if (!GEMINI_API_KEY) {
        console.error("🔑 Gemini API Key not set. Please configure it in the extension options.");
        return { success: false, error: "Gemini API Key not set." };
      }

      console.log("🤖 Processing Gemini AI request...");
      const response = await GeminiAPI.analyzeContent(prompt, url, webContent, GEMINI_API_KEY);
      
      console.log("✅ Gemini API Response successful");
      return response;

    } catch (error) {
      console.error("❌ Error calling Gemini API:", error);
      return { success: false, error: error.message };
    }
  }
}
