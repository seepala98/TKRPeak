// Background script for Stock Information Chrome Extension

// Store selected ticker for extension popup
let selectedTicker = null;
let selectedStockData = null;

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "stockInfo",
    title: "Get Stock Information for '%s'",
    contexts: ["selection"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log("Context menu clicked:", info);
  
  if (info.menuItemId === "stockInfo") {
    const selectedText = info.selectionText;
    console.log("Selected text:", selectedText);
    
    const ticker = extractTicker(selectedText);
    console.log("Extracted ticker:", ticker);
    
    if (ticker) {
      // Store ticker for extension popup
      selectedTicker = ticker;
      console.log("💾 Stored ticker for extension popup:", selectedTicker);
      
      // Fetch data in background and store it
      try {
        console.log("🔄 Fetching stock data for extension popup...");
        selectedStockData = await fetchStockDataInBackground(ticker);
        console.log("✅ Stock data stored for extension popup:", selectedStockData);
        
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
        
      // Right-click stores data and opens popup automatically
        
      } catch (error) {
        console.error("Error fetching stock data:", error);
        selectedStockData = null;
      }
    } else {
      console.log("Could not extract ticker from:", selectedText);
      await sendMessageToTab(tab.id, {
        action: "showError",
        message: "Could not extract ticker symbol from selection: " + selectedText
      }, info.frameId);
    }
  }
});

// Handle messages from content script (for CSP bypass)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background script received message:", request);
  
  if (request.action === "ping") {
    console.log("Background script ping received:", request.message);
    sendResponse({ success: true, message: "Background script is alive", timestamp: Date.now() });
    return false; // Synchronous response
  }
  
  if (request.action === "getStoredStockData") {
    console.log("🎯 Popup requesting stored stock data");
    console.log("📦 Stored ticker:", selectedTicker);
    console.log("📦 Stored data:", selectedStockData);
    
    if (selectedTicker && selectedStockData) {
      console.log("✅ Sending stored stock data to popup");
      sendResponse({ 
        success: true, 
        ticker: selectedTicker,
        data: selectedStockData 
      });
    } else {
      console.log("ℹ️ No stored stock data available");
      sendResponse({ 
        success: false, 
        message: "No stock data available. Select a ticker first." 
      });
    }
    return false; // Synchronous response
  }
  
  if (request.action === "clearStoredData") {
    console.log("🧹 Clearing stored stock data");
    selectedTicker = null;
    selectedStockData = null;
    
    // Clear badge
    chrome.action.setBadgeText({text: ''});
    
    console.log("✅ Stored data cleared");
    sendResponse({ success: true, message: "Data cleared" });
    return false; // Synchronous response
  }
  
  if (request.action === "fetchStockDataBackground") {
    console.log("🎯 Background script received API request for:", request.ticker);
    console.log("📊 Starting background API fetch process...");
    
    // Handle async operation properly
    fetchStockDataInBackground(request.ticker, request.period)
      .then(stockData => {
        console.log("✅ Background script API call successful! Sending response:", stockData);
        console.log(`🚀 Background script successfully fetched ${request.ticker} data!`);
        sendResponse({ success: true, data: stockData });
      })
      .catch(error => {
        console.error("❌ Background API fetch failed:", error);
        console.error("🔍 Background script error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        console.log("📤 Sending error response to content script...");
        sendResponse({ 
          success: false, 
          error: error.message || "Unknown error in background script",
          errorType: error.name,
          timestamp: new Date().toISOString()
        });
      });
    
    console.log("⏳ Background script will respond asynchronously...");
    return true; // Will respond asynchronously
  }
  
  // Handle other message types
  console.log("Background script: Unknown message action:", request.action);
  sendResponse({ success: false, error: "Unknown action: " + request.action });
  return false;
});

// Helper function to get appropriate interval for period
function getIntervalForPeriod(period) {
  const intervalMap = {
    '1d': '5m',    // 1 day: 5-minute intervals
    '5d': '15m',   // 5 days: 15-minute intervals
    '1mo': '1d',   // 1 month: daily intervals
    '6mo': '1d',   // 6 months: daily intervals
    '1y': '1wk'    // 1 year: weekly intervals
  };
  return intervalMap[period] || '1d';
}

// Fetch stock data in background script (bypasses CSP)
async function fetchStockDataInBackground(ticker, period = '1d') {
  console.log("🔄 Background script starting fetch for:", ticker, "period:", period);
  
  // Method 1: Try Yahoo Finance v8 API
  try {
    const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${period}&interval=${getIntervalForPeriod(period)}`;
    console.log("🌐 Background script trying Yahoo v8 API:", apiUrl);
    console.log("⏰ Setting up 10-second timeout...");
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("Background script: API call timeout, aborting...");
      controller.abort();
    }, 10000); // 10 second timeout
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    console.log("✅ Background script: API call completed successfully!");
    
    console.log("📊 Background Yahoo v8 API status:", response.status);
    console.log("🔍 Background Yahoo v8 API headers:", Object.fromEntries(response.headers));
    
    if (!response.ok) {
      console.error(`❌ Background Yahoo v8 API HTTP error! status: ${response.status}`);
      throw new Error(`Background Yahoo v8 API HTTP error! status: ${response.status}`);
    }
    
    console.log("📥 Parsing JSON response...");
    
    const data = await response.json();
    console.log("✅ JSON parsed successfully!");
    
    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators.quote[0];
    
    console.log(`💰 Current price for ${ticker}: ${meta.regularMarketPrice}`);
    
    // Calculate period-specific metrics
    const prices = quote.close.filter(p => p !== null && p !== undefined);
    const highs = quote.high.filter(h => h !== null && h !== undefined);
    const lows = quote.low.filter(l => l !== null && l !== undefined);
    
    const currentPrice = meta.regularMarketPrice || prices[prices.length - 1];
    const periodStart = prices[0];
    const periodHigh = Math.max(...highs);
    const periodLow = Math.min(...lows);
    const periodChange = currentPrice - periodStart;
    const periodChangePercent = periodStart ? ((currentPrice - periodStart) / periodStart) * 100 : 0;
    
    // For 1d, use daily metrics from meta, otherwise use period calculations
    const finalChange = period === '1d' ? (currentPrice - meta.previousClose) : periodChange;
    const finalChangePercent = period === '1d' ? ((currentPrice - meta.previousClose) / meta.previousClose * 100) : periodChangePercent;
    const finalHigh = period === '1d' ? meta.regularMarketDayHigh : periodHigh;
    const finalLow = period === '1d' ? meta.regularMarketDayLow : periodLow;
    
    console.log(`📈 Background script processed ${ticker} (${period}) - Price: ${currentPrice}, Change: ${finalChange.toFixed(2)} (${finalChangePercent.toFixed(2)}%)`);
    
    return {
      symbol: ticker,
      currentPrice: currentPrice,
      previousClose: meta.previousClose,
      dayChange: finalChange,
      dayChangePercent: finalChangePercent,
      dayHigh: finalHigh,
      dayLow: finalLow,
      marketCap: meta.marketCap,
      currency: meta.currency,
      regularMarketTime: meta.regularMarketTime,
      period: period,
      periodStart: periodStart,
      chartData: {
        timestamps: result.timestamp,
        prices: quote.close,
        highs: quote.high,
        lows: quote.low,
        opens: quote.open,
        volumes: quote.volume
      }
    };
  } catch (error) {
    console.error('Background Yahoo v8 API failed:', error);
    
    // Method 2: Try Yahoo Finance v7 API
    try {
      const fallbackUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`;
      console.log("Background script trying Yahoo v7 API:", fallbackUrl);
      
      // Add timeout for fallback API too
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log("Background script: v7 API call timeout, aborting...");
        controller.abort();
      }, 10000); // 10 second timeout
      
      const response = await fetch(fallbackUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log("Background Yahoo v7 API status:", response.status);
      
      if (!response.ok) {
        throw new Error(`Background Yahoo v7 API HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Background Yahoo v7 API data:", data);
      const quote = data.quoteResponse.result[0];
      
      if (quote) {
        const currentPrice = quote.regularMarketPrice;
        const previousClose = quote.regularMarketPreviousClose;
        const dayChange = quote.regularMarketChange;
        const dayChangePercent = quote.regularMarketChangePercent;
        
        return {
          symbol: ticker,
          currentPrice: currentPrice,
          previousClose: previousClose,
          dayChange: dayChange,
          dayChangePercent: dayChangePercent,
          dayHigh: quote.regularMarketDayHigh,
          dayLow: quote.regularMarketDayLow,
          marketCap: quote.marketCap,
          currency: quote.currency || 'USD',
          chartData: null
        };
      }
    } catch (fallbackError) {
      console.error('Background Yahoo v7 API also failed:', fallbackError);
    }
    
    // Return mock data as last resort
    console.warn('Background script: All APIs failed, returning mock data');
    return {
      symbol: ticker,
      currentPrice: 100.00,
      previousClose: 98.50,
      dayChange: 1.50,
      dayChangePercent: 1.52,
      dayHigh: 101.25,
      dayLow: 97.80,
      marketCap: null,
      currency: 'USD',
      chartData: null,
      isMockData: true
    };
  }
}

// Helper function to send messages with proper error handling
async function sendMessageToTab(tabId, message, frameId = undefined) {
  try {
    console.log("Sending message to tab:", tabId, "frame:", frameId, "message:", message);
    
    // First, ensure the content script is injected
    await ensureContentScriptInjected(tabId, frameId);
    
    // Try to send the message with frameId if specified
    const sendOptions = frameId !== undefined ? { frameId: frameId } : {};
    const response = await chrome.tabs.sendMessage(tabId, message, sendOptions);
    console.log("Message sent successfully, response:", response);
    return response;
  } catch (error) {
    console.error("Failed to send message to content script:", error);
    
    if (error.message.includes("Cannot access contents")) {
      console.error("❌ Permission denied - cannot access frame content");
      console.log("🔍 This usually means the iframe is on a different domain");
      console.log("💡 Trying to send to main frame instead...");
      
      try {
        // Fallback: send to main frame (frameId = 0)
        const response = await chrome.tabs.sendMessage(tabId, message, { frameId: 0 });
        console.log("✅ Message sent to main frame successfully:", response);
        return response;
      } catch (mainFrameError) {
        console.error("❌ Main frame also failed:", mainFrameError);
        // Show notification as last resort
        try {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Stock Information',
            message: message.action === 'fetchAndShowStock' 
              ? `Stock info for ${message.ticker} - check extension popup`
              : message.message || 'Extension notification'
          });
        } catch (notificationError) {
          console.error("Failed to show notification:", notificationError);
        }
      }
    } else if (error.message.includes("Could not establish connection")) {
      console.log("Content script not ready, trying to inject and retry...");
      
      try {
        // Try to inject content script and retry
        const target = frameId !== undefined 
          ? { tabId: tabId, frameIds: [frameId] }
          : { tabId: tabId, allFrames: true };
          
        await chrome.scripting.executeScript({
          target: target,
          files: ['content.js']
        });
        
        // Wait a bit for the script to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Retry the message
        const sendOptions = frameId !== undefined ? { frameId: frameId } : {};
        const response = await chrome.tabs.sendMessage(tabId, message, sendOptions);
        console.log("Message sent successfully after retry:", response);
        return response;
      } catch (retryError) {
        console.error("Failed to inject content script or send message on retry:", retryError);
        
        // Show notification instead of popup if content script fails
        try {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Stock Information',
            message: message.action === 'showStockPopup' 
              ? `${message.ticker}: $${message.data?.currentPrice || 'N/A'} (${(message.data?.dayChange >= 0 ? '+' : '') + (message.data?.dayChange?.toFixed(2) || 'N/A')})`
              : message.message || 'Extension notification'
          });
        } catch (notificationError) {
          console.error("Failed to show notification:", notificationError);
        }
      }
    }
    
    throw error;
  }
}

// Ensure content script is injected
async function ensureContentScriptInjected(tabId, frameId = undefined) {
  try {
    // Try to ping the content script in the specific frame
    const pingOptions = frameId !== undefined ? { frameId: frameId } : {};
    await chrome.tabs.sendMessage(tabId, { action: "ping" }, pingOptions);
    console.log("✅ Content script already injected in tab:", tabId, "frame:", frameId);
  } catch (error) {
    // Content script not available, inject it
    console.log("📽️ Injecting content script into tab:", tabId, "frame:", frameId);
    
    const target = frameId !== undefined 
      ? { tabId: tabId, frameIds: [frameId] }
      : { tabId: tabId, allFrames: true };
    
    await chrome.scripting.executeScript({
      target: target,
      files: ['content.js']
    });
    
    // Also inject CSS
    await chrome.scripting.insertCSS({
      target: target,
      files: ['popup.css']
    });
    
    console.log("✅ Content script injected successfully");
  }
}

// Extract ticker symbol from text
function extractTicker(text) {
  // Clean the text
  const cleanText = text.trim().replace(/[^\w\s]/g, '').toUpperCase();
  
  // Common ticker patterns
  const tickerPatterns = [
    /\b([A-Z]{1,5})\b/g,  // Standard tickers (1-5 letters)
    /\$([A-Z]{1,5})\b/g,  // Tickers with $ prefix
  ];
  
  // Try to find ticker patterns
  for (const pattern of tickerPatterns) {
    const matches = cleanText.match(pattern);
    if (matches) {
      return matches[0].replace('$', '');
    }
  }
  
  // Check if it's a company name and convert to ticker
  const companyToTicker = getCompanyTickerMap();
  const lowerText = text.toLowerCase();
  
  for (const [company, ticker] of Object.entries(companyToTicker)) {
    if (lowerText.includes(company.toLowerCase())) {
      return ticker;
    }
  }
  
  return null;
}

// Company name to ticker mapping (common ones)
function getCompanyTickerMap() {
  return {
    'Apple': 'AAPL',
    'Apple Inc': 'AAPL',
    'Microsoft': 'MSFT',
    'Microsoft Corporation': 'MSFT',
    'Google': 'GOOGL',
    'Alphabet': 'GOOGL',
    'Amazon': 'AMZN',
    'Amazon.com': 'AMZN',
    'Tesla': 'TSLA',
    'Tesla Inc': 'TSLA',
    'Meta': 'META',
    'Facebook': 'META',
    'Netflix': 'NFLX',
    'Nvidia': 'NVDA',
    'Intel': 'INTC',
    'IBM': 'IBM',
    'Oracle': 'ORCL',
    'Salesforce': 'CRM',
    'Adobe': 'ADBE',
    'Cisco': 'CSCO',
    'PayPal': 'PYPL',
    'Zoom': 'ZM',
    'Twitter': 'TWTR',
    'Snap': 'SNAP',
    'Snapchat': 'SNAP',
    'Uber': 'UBER',
    'Lyft': 'LYFT',
    'Spotify': 'SPOT',
    'Shopify': 'SHOP',
    'Square': 'SQ',
    'Palantir': 'PLTR',
    'Coinbase': 'COIN'
  };
}

// Fetch stock data using multiple sources (with fallbacks)
async function fetchStockData(ticker) {
  console.log("Fetching stock data for ticker:", ticker);
  
  // Method 1: Try Yahoo Finance v8 API (most detailed)
  try {
    const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
    console.log("Trying Yahoo Finance v8 API:", apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    console.log("Yahoo v8 API response status:", response.status);
    console.log("Yahoo v8 API response headers:", Object.fromEntries(response.headers));
    
    if (!response.ok) {
      throw new Error(`Yahoo v8 API HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators.quote[0];
    
    // Get the latest values
    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.previousClose;
    const dayChange = currentPrice - previousClose;
    const dayChangePercent = (dayChange / previousClose) * 100;
    
    return {
      symbol: ticker,
      currentPrice: currentPrice,
      previousClose: previousClose,
      dayChange: dayChange,
      dayChangePercent: dayChangePercent,
      dayHigh: meta.regularMarketDayHigh,
      dayLow: meta.regularMarketDayLow,
      marketCap: meta.marketCap,
      currency: meta.currency,
      regularMarketTime: meta.regularMarketTime,
      chartData: {
        timestamps: result.timestamp,
        prices: quote.close,
        highs: quote.high,
        lows: quote.low,
        opens: quote.open,
        volumes: quote.volume
      }
    };
  } catch (error) {
    console.error('Yahoo Finance v8 API failed:', error);
    
    // Method 2: Try Yahoo Finance v7 API (simpler quote data)
    try {
      const fallbackUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`;
      console.log("Trying Yahoo Finance v7 API:", fallbackUrl);
      
      const response = await fetch(fallbackUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      
      console.log("Yahoo v7 API response status:", response.status);
      console.log("Yahoo v7 API response headers:", Object.fromEntries(response.headers));
      
      if (!response.ok) {
        throw new Error(`Yahoo v7 API HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Yahoo v7 API response data:", data);
      const quote = data.quoteResponse.result[0];
      
      if (quote) {
        const currentPrice = quote.regularMarketPrice;
        const previousClose = quote.regularMarketPreviousClose;
        const dayChange = quote.regularMarketChange;
        const dayChangePercent = quote.regularMarketChangePercent;
        
        return {
          symbol: ticker,
          currentPrice: currentPrice,
          previousClose: previousClose,
          dayChange: dayChange,
          dayChangePercent: dayChangePercent,
          dayHigh: quote.regularMarketDayHigh,
          dayLow: quote.regularMarketDayLow,
          marketCap: quote.marketCap,
          currency: quote.currency || 'USD',
          chartData: null // No chart data in fallback
        };
      }
    } catch (fallbackError) {
      console.error('Yahoo Finance v7 API also failed:', fallbackError);
    }
    
    // Method 3: Create mock data as last resort (for debugging)
    console.warn('All APIs failed, creating mock data for testing...');
    return {
      symbol: ticker,
      currentPrice: 100.00,
      previousClose: 98.50,
      dayChange: 1.50,
      dayChangePercent: 1.52,
      dayHigh: 101.25,
      dayLow: 97.80,
      marketCap: null,
      currency: 'USD',
      chartData: null,
      isMockData: true
    };
  }
}

// Test function for debugging - you can call this from the browser console
// In the extension's service worker console: testStockAPI('AAPL')
async function testStockAPI(ticker = 'AAPL') {
  console.log('Testing stock API for:', ticker);
  try {
    const data = await fetchStockData(ticker);
    console.log('Test successful! Data:', data);
    return data;
  } catch (error) {
    console.error('Test failed:', error);
    return null;
  }
}

// Make test function available globally
self.testStockAPI = testStockAPI;

// Test permissions function
self.checkPermissions = async function() {
  console.log("🔍 Checking extension permissions...");
  
  try {
    const permissions = await chrome.permissions.getAll();
    console.log("✅ Current permissions:", permissions);
    return permissions;
  } catch (error) {
    console.error("❌ Failed to get permissions:", error);
    return null;
  }
};
