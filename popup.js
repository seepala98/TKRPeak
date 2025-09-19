// Enhanced popup script for Stock Information Extension

let currentStockData = null;
let currentTicker = null;
let currentChart = null;

document.addEventListener('DOMContentLoaded', async function() {
  console.log('📊 Stock Extension popup loaded');
  
  // Initialize UI elements
  await initializePopup();
  
  // Set up event listeners
  setupEventListeners();
  
  // Set up popup close detection
  setupPopupCloseHandling();
});

function setupPopupCloseHandling() {
  // Clear stored data when popup is closed
  // window.addEventListener('beforeunload', () => {
  //   console.log('🚪 Popup closing - clearing stored data');
  //   try {
  //     chrome.runtime.sendMessage({ action: 'clearStoredData' });
  //   } catch (error) {
  //     console.log('Could not clear data on popup close:', error);
  //   }
  // });
  
  // Also listen for when popup loses focus (clicked outside)
  // window.addEventListener('blur', () => {
  //   console.log('👆 Popup lost focus - clearing stored data');
  //   try {
  //     chrome.runtime.sendMessage({ action: 'clearStoredData' });
  //   } catch (error) {
  //     console.log('Could not clear data on blur:', error);
  //   }
  // });
}

async function initializePopup() {
  try {
    // First priority: Check for stored stock data from right-click
    const hasStoredData = await loadStoredData();
    
    if (hasStoredData) {
      console.log('📊 Displaying stored data from right-click');
      return; // Already showing stored data, no need to check for selected text
    }
    
    // Second priority: Check for selected text on the current page
    await checkForSelectedText();
    
  } catch (error) {
    console.error('❌ Error initializing popup:', error);
    showManualInput();
  }
}

async function checkForSelectedText() {
  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      console.log('No active tab found');
      showManualInput();
      return;
    }
    
    // Send message to content script to get selected text
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' });
    
    if (response && response.hasSelection && response.selectedText) {
      console.log('📍 Found selected text:', response.selectedText);
      
      // Extract potential ticker
      const ticker = extractTicker(response.selectedText);
      
      if (ticker) {
        showAutoDetection(response.selectedText, ticker);
      } else {
        showManualInput();
      }
    } else {
      showManualInput();
    }
    
  } catch (error) {
    console.log('Content script not available or no selection:', error);
    showManualInput();
  }
}

async function loadStoredData() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStoredStockData' });
    
    if (response && response.success && response.data) {
      console.log('✅ Found stored stock data:', response.ticker);
      
      // Automatically show the stored data (from right-click)
      showStockData(response.data, response.ticker);
      return true; // Found and displayed stored data
    }
    
  } catch (error) {
    console.log('No stored data available:', error);
  }
  
  return false; // No stored data found
}

function showAutoDetection(selectedText, ticker) {
  document.getElementById('autoDetection').classList.remove('hidden');
  document.getElementById('manualInput').classList.add('hidden');
  document.getElementById('instructions').classList.add('hidden');
  document.getElementById('stockData').classList.add('hidden');
  
  document.getElementById('selectedText').textContent = `"${selectedText}" → ${ticker}`;
  
  // Store the detected ticker for use
  document.getElementById('useSelectedBtn').onclick = () => fetchStockData(ticker);
  document.getElementById('ignoreSelectedBtn').onclick = showManualInput;
}

function showManualInput() {
  document.getElementById('autoDetection').classList.add('hidden');
  document.getElementById('manualInput').classList.remove('hidden');
  document.getElementById('instructions').classList.remove('hidden');
  document.getElementById('stockData').classList.add('hidden');
  document.getElementById('geminiAiAnalysis').classList.add('hidden');
  document.getElementById('tickerSuggestions').classList.add('hidden');
}

function showStockData(stockData, ticker) {
  document.getElementById('autoDetection').classList.add('hidden');
  document.getElementById('manualInput').classList.add('hidden');
  document.getElementById('instructions').classList.add('hidden');
  document.getElementById('stockData').classList.remove('hidden');
  document.getElementById('geminiAiAnalysis').classList.remove('hidden');
  document.getElementById('tickerSuggestions').classList.add('hidden');
  
  // Store current data
  currentStockData = stockData;
  currentTicker = ticker;
  
  // Populate stock information
  populateStockData(stockData, ticker);
  
  // Draw initial chart
  drawChart('1d');
}

function showTickerSuggestions(suggestions) {
    const suggestionsDiv = document.getElementById('tickerSuggestions');
    const suggestionButtons = document.getElementById('suggestionButtons');
    suggestionButtons.innerHTML = ''; // Clear previous suggestions

    if (suggestions && suggestions.length > 0) {
        suggestions.forEach(suggestion => {
            const btn = document.createElement('button');
            btn.className = 'ticker-btn';
            btn.textContent = `${suggestion.symbol} (${suggestion.name})`;
            btn.onclick = () => fetchStockData(suggestion.symbol);
            suggestionButtons.appendChild(btn);
        });
        suggestionsDiv.classList.remove('hidden');
    } else {
        suggestionsDiv.classList.add('hidden');
    }
}

function populateStockData(data, ticker) {
  document.getElementById('stockSymbol').textContent = ticker;
  document.getElementById('stockPrice').textContent = `${data.currency || 'USD'} ${formatPrice(data.currentPrice)}`;
  
  // Format change with color
  const changeElement = document.getElementById('stockChange');
  const changeSymbol = data.dayChange >= 0 ? '+' : '';
  const changeText = `${changeSymbol}${formatPrice(data.dayChange)} (${changeSymbol}${formatPercent(data.dayChangePercent)}%)`;
  changeElement.textContent = changeText;
  changeElement.className = `stock-change ${data.dayChange >= 0 ? 'positive' : 'negative'}`;
  
  // Update labels and values based on period
  const period = data.period || '1d';
  const isOneDay = period === '1d';
  
  // Update the detail row labels based on period
  const detailRows = document.querySelectorAll('.detail-row');
  if (detailRows.length >= 2) {
    // High label and value
    const highLabel = detailRows[0].querySelector('.label') || detailRows[0].querySelector('span:first-child');
    const highValue = detailRows[0].querySelector('.value') || detailRows[0].querySelector('span:last-child');
    if (highLabel && highValue) {
      highLabel.textContent = isOneDay ? 'Day High:' : 'Period High:';
      highValue.textContent = formatPrice(data.dayHigh);
    }
    
    // Low label and value  
    const lowLabel = detailRows[1].querySelector('.label') || detailRows[1].querySelector('span:first-child');
    const lowValue = detailRows[1].querySelector('.value') || detailRows[1].querySelector('span:last-child');
    if (lowLabel && lowValue) {
      lowLabel.textContent = isOneDay ? 'Day Low:' : 'Period Low:';
      lowValue.textContent = formatPrice(data.dayLow);
    }
  }
  
  // Populate market cap (always the same)
  document.getElementById('marketCap').textContent = formatMarketCap(data.marketCap);
  
  // Set external links
  document.getElementById('yahooLink').href = `https://finance.yahoo.com/quote/${ticker}`;
  document.getElementById('googleLink').href = `https://www.google.com/finance/quote/${ticker}`;
  
  // Update subtitle with period information
  const periodLabels = {
    '1d': 'Live Data',
    '5d': '5-Day View',
    '1mo': '1-Month View', 
    '6mo': '6-Month View',
    '1y': '1-Year View'
  };
  
  document.getElementById('subtitle').textContent = `${ticker} • ${periodLabels[period] || 'Live Data'}`;
  
  console.log(`📊 Updated display for ${ticker} (${period}) - Change: ${formatPrice(data.dayChange)} (${formatPercent(data.dayChangePercent)}%)`);
}

async function fetchStockData(ticker, period = '1d') {
  if (!ticker) return;
  
  ticker = ticker.toUpperCase().trim();
  console.log(`🔍 Fetching stock data for: ${ticker}, period: ${period}`);
  
  try {
    // Show loading state
    showLoadingState();
    
    // Fetch data from background script
    const response = await chrome.runtime.sendMessage({
      action: 'fetchStockDataBackground',
      ticker: ticker,
      period: period
    });
    
    if (response && response.success && response.data) {
        if (response.data.suggestions) {
            showTickerSuggestions(response.data.suggestions);
        } else {
            showStockData(response.data, ticker);
        }
    } else {
      throw new Error(response.error || 'Failed to fetch stock data');
    }
    
  } catch (error) {
    console.error('❌ Error fetching stock data:', error);
    showError(`Failed to fetch data for ${ticker}: ${error.message}`);
  }
}

function showLoadingState() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('autoDetection').classList.add('hidden');
  document.getElementById('manualInput').classList.add('hidden');
  document.getElementById('instructions').classList.add('hidden');
  document.getElementById('stockData').classList.add('hidden');
  document.getElementById('tickerSuggestions').classList.add('hidden');
}

function showError(message) {
  // For now, go back to manual input with error message
  showManualInput();
  
  // Could add error display here
  console.error('Error:', message);
}

function drawChart(period) {
  if (!currentStockData || !currentStockData.chartData) {
    console.log('No chart data available');
    return;
  }
  
  const canvas = document.getElementById('stockChart');
  const ctx = canvas.getContext('2d');
  
  // Clear previous chart
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const chartData = currentStockData.chartData;
  if (!chartData.prices || chartData.prices.length === 0) {
    ctx.font = '12px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('No chart data available', canvas.width / 2, canvas.height / 2);
    return;
  }
  
  // Chart dimensions
  const padding = 25;
  const chartWidth = canvas.width - padding * 2;
  const chartHeight = canvas.height - padding * 2 - 15; // Leave space for period label
  
  // Get price data
  const prices = chartData.prices.filter(p => p !== null && p !== undefined);
  if (prices.length === 0) {
    ctx.font = '12px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('No valid price data', canvas.width / 2, canvas.height / 2);
    return;
  }
  
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;
  
  // Draw chart background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fillRect(padding, padding, chartWidth, chartHeight);
  
  // Draw grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  
  // Horizontal grid lines (price levels)
  for (let i = 0; i <= 4; i++) {
    const y = padding + (i / 4) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(padding + chartWidth, y);
    ctx.stroke();
  }
  
  // Draw price line
  const priceChange = prices[prices.length - 1] - prices[0];
  ctx.strokeStyle = priceChange >= 0 ? '#22c55e' : '#ef4444';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  
  prices.forEach((price, index) => {
    const x = padding + (index / (prices.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  
  ctx.stroke();
  
  // Add gradient fill under the line
  ctx.fillStyle = priceChange >= 0 
    ? 'rgba(34, 197, 94, 0.1)' 
    : 'rgba(239, 68, 68, 0.1)';
  ctx.beginPath();
  ctx.moveTo(padding, padding + chartHeight);
  prices.forEach((price, index) => {
    const x = padding + (index / (prices.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    ctx.lineTo(x, y);
  });
  ctx.lineTo(padding + chartWidth, padding + chartHeight);
  ctx.closePath();
  ctx.fill();
  
  // Draw price labels
  ctx.font = '10px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  
  // High price (top)
  ctx.fillText(`$${maxPrice.toFixed(2)}`, padding + 2, padding + 12);
  
  // Low price (bottom)
  ctx.fillText(`$${minPrice.toFixed(2)}`, padding + 2, padding + chartHeight - 2);
  
  // Current price (right side, middle)
  ctx.textAlign = 'right';
  const currentPrice = prices[prices.length - 1];
  const currentY = padding + chartHeight - ((currentPrice - minPrice) / priceRange) * chartHeight;
  ctx.fillText(`$${currentPrice.toFixed(2)}`, canvas.width - padding - 2, currentY + 4);
  
  // Draw period label
  ctx.font = '11px Arial';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.textAlign = 'center';
  const periodLabel = {
    '1d': '1 Day',
    '5d': '5 Days', 
    '1mo': '1 Month',
    '6mo': '6 Months',
    '1y': '1 Year'
  }[period] || period;
  
  ctx.fillText(`${periodLabel} • ${prices.length} data points`, canvas.width / 2, canvas.height - 5);
  
  console.log(`📊 Chart drawn for ${period}: ${prices.length} points, range $${minPrice.toFixed(2)}-$${maxPrice.toFixed(2)}`);
}

async function askGemini() {
    const chatInput = document.getElementById('chatInput');
    const question = chatInput.value.trim();
    if (!question || !currentTicker) return;

    const chatContainer = document.getElementById('chatContainer');

    // Display user message
    const userMessage = document.createElement('div');
    userMessage.className = 'chat-message user-message';
    userMessage.textContent = question;
    chatContainer.appendChild(userMessage);
    chatInput.value = '';

    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Construct the Yahoo Finance financials URL based on the currentTicker
    const financialUrl = `https://finance.yahoo.com/quote/${currentTicker}/financials`;

    // Create a prompt for Gemini
    const prompt = `You are a helpful financial assistant. Analyze the stock with the ticker symbol ${currentTicker}. The user has the following question: "${question}". Provide a concise and easy-to-understand response.`;

    try {
        const response = await chrome.runtime.sendMessage({
            action: "analyzeContent",
            prompt: prompt,
            url: financialUrl,
            // webContent is no longer sent from popup.js
        });

        console.log("Popup received response from background:", response);

        if (response && response.success) {
            // Display Gemini message
            const geminiMessage = document.createElement('div');
            geminiMessage.className = 'chat-message gemini-message';
            geminiMessage.textContent = response.response;
            chatContainer.appendChild(geminiMessage);
        } else {
            console.error("Error response from background:", response.error);
            throw new Error(response.error || 'Failed to get response from Gemini');
        }

        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;

    } catch (error) {
        console.error('Error asking Gemini:', error);
        displayGeminiError('Sorry, I had trouble getting an analysis. Please try again.');
    }
}

function displayGeminiError(message) {
    const chatContainer = document.getElementById('chatContainer');
    const errorMessage = document.createElement('div');
    errorMessage.className = 'chat-message gemini-message';
    errorMessage.textContent = message;
    chatContainer.appendChild(errorMessage);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function setupEventListeners() {
  // Manual search
  document.getElementById('searchBtn').addEventListener('click', () => {
    const ticker = document.getElementById('tickerInput').value.trim();
    if (ticker) {
      fetchStockData(ticker);
    }
  });
  
  // Enter key in input
  document.getElementById('tickerInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const ticker = e.target.value.trim();
      if (ticker) {
        fetchStockData(ticker);
      }
    }
  });
  
  // Popular stock buttons
  document.querySelectorAll('.ticker-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ticker = btn.getAttribute('data-ticker');
      fetchStockData(ticker);
    });
  });
  
  // Clear data button
  const clearBtn = document.getElementById('clearDataBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      console.log('🧹 User clicked clear button');
      
      try {
        // Clear stored data
        await chrome.runtime.sendMessage({ action: 'clearStoredData' });
        
        // Reset UI to initial state
        currentStockData = null;
        currentTicker = null;
        showManualInput();
        
        console.log('✅ Data cleared and UI reset');
      } catch (error) {
        console.error('❌ Error clearing data:', error);
      }
    });
  }
  
  // Chart period buttons
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!currentTicker) {
        console.log('No ticker available for period change');
        return;
      }
      
      // Update active state
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Fetch new data for the selected period
      const period = btn.getAttribute('data-period');
      console.log(`📊 Fetching ${period} data for ${currentTicker}`);
      
      try {
        // Show mini loading indicator on chart
        const canvas = document.getElementById('stockChart');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '12px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`Loading ${period} data...`, canvas.width / 2, canvas.height / 2);
        
        // Fetch new data with selected period
        const response = await chrome.runtime.sendMessage({
          action: 'fetchStockDataBackground',
          ticker: currentTicker,
          period: period
        });
        
        if (response && response.success && response.data) {
          // Update current data and refresh entire display
          currentStockData = response.data;
          populateStockData(response.data, currentTicker); // Update the info display
          drawChart(period); // Update the chart
        } else {
          throw new Error('Failed to fetch period data');
        }
        
      } catch (error) {
        console.error('❌ Error fetching period data:', error);
        
        // Show error on chart
        const canvas = document.getElementById('stockChart');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '12px Arial';
        ctx.fillStyle = '#ff6b6b';
        ctx.textAlign = 'center';
        ctx.fillText(`Error loading ${period} data`, canvas.width / 2, canvas.height / 2);
      }
    });
  });

  // Gemini chat
  document.getElementById('sendChatBtn').addEventListener('click', askGemini);
  document.getElementById('chatInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
          askGemini();
      }
  });
}

// Utility functions
function extractTicker(text) {
  text = text.trim().toUpperCase();
  
  // Allow for tickers with suffixes like .TO
  const tickerMatch = text.match(/\b([A-Z]{1,6}(\.[A-Z]{2})?)\b/);
  if (tickerMatch) {
    return tickerMatch[0];
  }
  
  // Company name to ticker mapping
  const companyMap = {
    'APPLE': 'AAPL',
    'MICROSOFT': 'MSFT',
    'GOOGLE': 'GOOGL',
    'TESLA': 'TSLA',
    'NVIDIA': 'NVDA',
    'AMAZON': 'AMZN',
    'META': 'META',
    'FACEBOOK': 'META',
    'NETFLIX': 'NFLX',
    'ORACLE': 'ORCL',
    'PALANTIR': 'PLTR'
  };
  
  for (const [company, ticker] of Object.entries(companyMap)) {
    if (text.includes(company)) {
      return ticker;
    }
  }
  
  return null;
}

function formatPrice(price) {
  return price ? price.toFixed(2) : 'N/A';
}

function formatPercent(percent) {
  return percent ? percent.toFixed(2) : 'N/A';
}

function formatMarketCap(cap) {
  if (!cap) return 'N/A';
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
  return `$${cap.toFixed(0)}`;
}

console.log('📊 Stock Extension popup script loaded successfully');