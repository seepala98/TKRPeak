// Background script for Stock Information Chrome Extension

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
  if (info.menuItemId === "stockInfo") {
    const selectedText = info.selectionText;
    const ticker = extractTicker(selectedText);
    
    if (ticker) {
      try {
        const stockData = await fetchStockData(ticker);
        // Send data to content script to show popup
        chrome.tabs.sendMessage(tab.id, {
          action: "showStockPopup",
          data: stockData,
          ticker: ticker
        });
      } catch (error) {
        console.error("Error fetching stock data:", error);
        chrome.tabs.sendMessage(tab.id, {
          action: "showError",
          message: "Failed to fetch stock data for " + ticker
        });
      }
    } else {
      chrome.tabs.sendMessage(tab.id, {
        action: "showError",
        message: "Could not extract ticker symbol from selection"
      });
    }
  }
});

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

// Fetch stock data using Yahoo Finance API (unofficial)
async function fetchStockData(ticker) {
  try {
    // Use Yahoo Finance unofficial API
    const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
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
    console.error('Error fetching from Yahoo Finance:', error);
    
    // Fallback: Try alternative approach with basic quote
    try {
      const fallbackUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`;
      const response = await fetch(fallbackUrl);
      const data = await response.json();
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
      console.error('Fallback API also failed:', fallbackError);
    }
    
    throw error;
  }
}
