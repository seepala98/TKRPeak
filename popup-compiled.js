// Compiled Popup Script - All modules combined for compatibility
console.log('📊 Stock Extension popup loaded');

let currentStockData = null;
let currentTicker = null;
let isLoading = false; // Prevent multiple simultaneous calls

// ===== UTILITY FUNCTIONS =====
function validateTickerInput(input) {
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

  return { valid: true, ticker: cleanInput };
}

async function fetchStockDataFromBackground(ticker, period = '1d') {
  console.log(`📊 Requesting stock data for ${ticker} (${period}) from background`);
  
  try {
    console.log(`🔄 Sending message to background...`);
    const response = await chrome.runtime.sendMessage({
      action: 'fetchStockDataBackground',
      ticker: ticker,
      period: period
    });

    console.log(`📨 Raw background response for ${ticker}:`, response);
    console.log(`📨 Response type:`, typeof response);
    console.log(`📨 Response success:`, response?.success);
    console.log(`📨 Response data:`, response?.data);
    console.log(`📨 Response error:`, response?.error);

    if (response && response.success && response.data) {
      console.log(`✅ Valid response received for ${ticker} (${period})`);
      console.log(`📊 Data keys:`, Object.keys(response.data));
      console.log(`📊 Symbol:`, response.data.symbol);
      console.log(`📊 Period:`, response.data.period);
      console.log(`📊 Chart data length:`, response.data.chartData?.length);
      return response.data;
    } else {
      const errorMsg = response?.error || 'Failed to fetch stock data from background';
      console.error(`❌ Background error for ${ticker}:`, errorMsg);
      console.error(`❌ Full response object:`, response);
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error(`❌ Error communicating with background for ${ticker}:`, error);
    console.error(`❌ Error name:`, error.name);
    console.error(`❌ Error message:`, error.message);
    console.error(`❌ Error stack:`, error.stack);
    throw error;
  }
}

// ===== UI STATE MANAGEMENT =====
function hideAllSections() {
  const sections = ['loading', 'stockData', 'autoDetection', 'manualInput', 'instructions', 'geminiAiAnalysis', 'tickerSuggestions'];
  sections.forEach(sectionId => {
    const element = document.getElementById(sectionId);
    if (element) element.classList.add('hidden');
  });
}

function showLoadingState() {
  hideAllSections();
  document.getElementById('loading').classList.remove('hidden');
}

function showManualInput() {
  hideAllSections();
  document.getElementById('manualInput').classList.remove('hidden');
  document.getElementById('instructions').classList.remove('hidden');
}

function showStockData(data, ticker) {
  try {
    console.log(`📊 Displaying stock data for ${ticker} - Period: ${data.period || '1d'}`);
    console.log(`📊 Stock data object:`, data);
    
    hideAllSections();
    console.log(`✅ Sections hidden`);
    
    document.getElementById('stockData').classList.remove('hidden');
    document.getElementById('geminiAiAnalysis').classList.remove('hidden');
    console.log(`✅ Stock data sections shown`);
    
    console.log(`🔄 About to populate stock data...`);
    populateStockData(data, ticker);
    console.log(`✅ Stock data populated`);
    
    console.log(`🔄 About to draw chart for period: ${data.period || '1d'}`);
    drawChart(data, data.period || '1d');
    console.log(`✅ Chart drawn`);
    
    console.log(`🔄 Setting active period button: ${data.period || '1d'}`);
    setActivePeriodButton(data.period || '1d');
    console.log(`✅ Active period button set`);
    
    console.log(`✅ showStockData completed successfully for ${ticker}`);
  } catch (error) {
    console.error(`❌ Error in showStockData for ${ticker}:`, error);
    console.error(`❌ showStockData error details:`, { name: error.name, message: error.message, stack: error.stack });
    throw error; // Re-throw to be caught by fetchStockData
  }
}

function populateStockData(data, ticker) {
  try {
    console.log(`🔄 Populating stock data for ${ticker}...`);
    console.log(`📊 Data to populate:`, { 
      symbol: data.symbol, 
      currentPrice: data.currentPrice, 
      period: data.period,
      periodChange: data.periodChange,
      dayChange: data.dayChange
    });
    
    document.getElementById('stockSymbol').textContent = data.symbol || ticker;
    document.getElementById('stockPrice').textContent = `$${(data.currentPrice || 0).toFixed(2)}`;
    
    const period = data.period || '1d';
    const subtitleMap = {
      '1d': '1-Day View', '5d': '5-Day View', '1mo': '1-Month View',
      '6mo': '6-Month View', '1y': '1-Year View'
    };
    document.getElementById('subtitle').textContent = subtitleMap[period] || 'Stock Overview';
    console.log(`✅ Basic info populated for ${period}`);

    const changeValue = data.periodChange !== undefined ? data.periodChange : data.dayChange;
    const changePercent = data.periodChangePercent !== undefined ? data.periodChangePercent : data.dayChangePercent;
    const highValue = data.periodHigh !== undefined ? data.periodHigh : data.dayHigh;
    const lowValue = data.periodLow !== undefined ? data.periodLow : data.dayLow;

    console.log(`📊 Change data:`, { changeValue, changePercent, highValue, lowValue });

    const changeElement = document.getElementById('stockChange');
    const changeColor = changeValue >= 0 ? '#4caf50' : '#f44336';
    const changeSign = changeValue >= 0 ? '+' : '';
    changeElement.textContent = `${changeSign}$${(changeValue || 0).toFixed(2)} (${changeSign}${(changePercent || 0).toFixed(2)}%)`;
    changeElement.style.color = changeColor;
    console.log(`✅ Change element updated`);

    const isIntraday = period === '1d';
    const detailRows = document.querySelectorAll('.detail-row');
    console.log(`📊 Found ${detailRows.length} detail rows`);
    
    if (detailRows.length >= 3) {
      detailRows[0].querySelector('.label').textContent = isIntraday ? 'Day High:' : 'Period High:';
      detailRows[0].querySelector('.value').textContent = `$${(highValue || 0).toFixed(2)}`;
      detailRows[1].querySelector('.label').textContent = isIntraday ? 'Day Low:' : 'Period Low:';
      detailRows[1].querySelector('.value').textContent = `$${(lowValue || 0).toFixed(2)}`;
      
      if (data.marketCap) {
        const marketCapInB = data.marketCap / 1000000000;
        detailRows[2].querySelector('.value').textContent = `$${marketCapInB.toFixed(1)}B`;
      } else {
        detailRows[2].querySelector('.value').textContent = 'N/A';
      }
      console.log(`✅ Detail rows updated`);
    }

    document.getElementById('yahooLink').href = `https://finance.yahoo.com/quote/${ticker}`;
    document.getElementById('googleLink').href = `https://www.google.com/finance/quote/${ticker}`;
    console.log(`✅ Links updated`);
    
  } catch (error) {
    console.error(`❌ Error in populateStockData for ${ticker}:`, error);
    console.error(`❌ populateStockData error details:`, { name: error.name, message: error.message, stack: error.stack });
    throw error; // Re-throw to be caught by showStockData
  }
}

// ===== CHART RENDERING =====
function drawChart(stockData, period = '1d') {
  try {
    console.log(`🔄 Drawing chart for ${stockData.symbol || 'unknown'} (${period})`);
    console.log(`📊 Chart data length:`, stockData.chartData?.length || 0);
    
    const canvas = document.getElementById('stockChart');
    if (!canvas) {
      console.error('❌ Canvas element not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    console.log(`✅ Canvas cleared`);

    const chartData = stockData.chartData;
    if (!chartData || chartData.length === 0) {
      console.log(`ℹ️ No chart data available, showing placeholder`);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('📊 Chart will appear here', width / 2, height / 2);
      return;
    }

    const prices = chartData.map(d => d.price).filter(p => p !== null && p !== undefined);
    console.log(`📊 Processing ${prices.length} valid price points`);
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    console.log(`📊 Price range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`);

    const margin = { top: 20, right: 40, bottom: 30, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const xScale = (index) => margin.left + (index / (chartData.length - 1)) * chartWidth;
    const yScale = (price) => {
      if (priceRange === 0) return margin.top + chartHeight / 2;
      return margin.top + (1 - (price - minPrice) / priceRange) * chartHeight;
    };

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = margin.top + (i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartWidth, y);
      ctx.stroke();
    }
    console.log(`✅ Grid drawn`);

    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, margin.top, 0, margin.top + chartHeight);
    gradient.addColorStop(0, 'rgba(66, 133, 244, 0.3)');
    gradient.addColorStop(1, 'rgba(66, 133, 244, 0.05)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(xScale(0), yScale(chartData[0].price));
    
    for (let i = 0; i < chartData.length; i++) {
      const price = chartData[i].price;
      if (price !== null && price !== undefined) {
        ctx.lineTo(xScale(i), yScale(price));
      }
    }
    
    ctx.lineTo(xScale(chartData.length - 1), margin.top + chartHeight);
    ctx.lineTo(xScale(0), margin.top + chartHeight);
    ctx.closePath();
    ctx.fill();
    console.log(`✅ Gradient fill drawn`);

    // Draw price line
    ctx.strokeStyle = '#4285f4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    let firstValidPoint = true;
    for (let i = 0; i < chartData.length; i++) {
      const price = chartData[i].price;
      if (price !== null && price !== undefined) {
        if (firstValidPoint) {
          ctx.moveTo(xScale(i), yScale(price));
          firstValidPoint = false;
        } else {
          ctx.lineTo(xScale(i), yScale(price));
        }
      }
    }
    ctx.stroke();
    console.log(`✅ Price line drawn`);

    // Price labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    for (let i = 0; i <= 5; i++) {
      const price = maxPrice - (i / 5) * (maxPrice - minPrice);
      const y = margin.top + (i / 5) * chartHeight;
      ctx.fillText(`$${price.toFixed(2)}`, margin.left + chartWidth + 5, y + 3);
    }
    
    console.log(`✅ Chart drawn successfully for ${period}`);
    
  } catch (error) {
    console.error(`❌ Error in drawChart for ${period}:`, error);
    console.error(`❌ drawChart error details:`, { name: error.name, message: error.message, stack: error.stack });
    throw error; // Re-throw to be caught by showStockData
  }
}

function setActivePeriodButton(period) {
  document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
  const activeButton = document.querySelector(`[data-period="${period}"]`);
  if (activeButton) activeButton.classList.add('active');
}

// ===== STOCK DATA FETCHING =====
async function fetchStockData(ticker, period = '1d', isNewTicker = true) {
  console.log(`📊 Fetching stock data for ${ticker} (${period}) - isNewTicker: ${isNewTicker}`);
  
  // Prevent multiple simultaneous calls
  if (isLoading) {
    console.log(`⚠️ Already loading data, skipping request for ${ticker} (${period})`);
    return;
  }
  
  isLoading = true;
  console.log(`🔒 Loading flag set to true`);
  showLoadingState();
  
  try {
    const stockData = await fetchStockDataFromBackground(ticker, period);
    console.log(`✅ Stock data received for ${ticker} (${period}):`, stockData);
    
    if (stockData.suggestions) {
      console.log(`💡 Received ${stockData.suggestions.length} ticker suggestions for: ${ticker}`);
      showTickerSuggestions(stockData.suggestions);
      isLoading = false;
      console.log(`🔓 Loading flag cleared (suggestions shown)`);
      return;
    }
    
    // Validate stockData before proceeding
    if (!stockData.symbol) {
      throw new Error('Invalid stock data: missing symbol');
    }
    
    currentStockData = stockData;
    currentTicker = ticker;
    
    console.log(`🎯 About to show stock data for ${ticker} (${period})`);
    showStockData(stockData, ticker);
    console.log(`✅ Successfully displayed ${ticker} data for ${period}`);
    
  } catch (error) {
    console.error(`❌ Error in fetchStockData for ${ticker} (${period}):`, error);
    console.error(`❌ Error details:`, { name: error.name, message: error.message, stack: error.stack });
    
    // If this is a period change (not a new ticker), try to show the previous data
    if (!isNewTicker && currentStockData) {
      console.log(`⚠️ Period change failed for ${period}, reverting to previous data (${currentStockData.period || '1d'})`);
      showStockData(currentStockData, currentTicker);
      // Reset the active period button to the current data's period
      setActivePeriodButton(currentStockData.period || '1d');
    } else {
      // For new ticker searches, show manual input
      console.log(`❌ New ticker search failed, showing manual input`);
      showManualInput();
    }
  } finally {
    isLoading = false;
    console.log(`🔓 Loading flag cleared`);
  }
}

function showTickerSuggestions(suggestions) {
  console.log(`🤔 Showing ${suggestions.length} ticker suggestions`);
  hideAllSections();
  const suggestionsDiv = document.getElementById('tickerSuggestions');
  const suggestionButtons = document.getElementById('suggestionButtons');
  
  // Clear previous suggestions
  suggestionButtons.innerHTML = '';

  if (suggestions && suggestions.length > 0) {
    suggestions.forEach(suggestion => {
      const btn = document.createElement('button');
      btn.className = 'ticker-btn';
      btn.textContent = `${suggestion.symbol}`;
      if (suggestion.name && suggestion.name !== suggestion.symbol) {
        btn.textContent += ` (${suggestion.name})`;
      }
      btn.onclick = () => {
        console.log(`🎯 Suggestion clicked: ${suggestion.symbol}`);
        fetchStockData(suggestion.symbol, '1d', true);
      };
      suggestionButtons.appendChild(btn);
    });
    suggestionsDiv.classList.remove('hidden');
    console.log(`✅ Suggestions displayed for: ${suggestions.map(s => s.symbol).join(', ')}`);
  } else {
    console.log('❌ No suggestions to display');
    showManualInput();
  }
}

// ===== EVENT HANDLERS =====
function setupEventListeners() {
  // Search button
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', handleManualSearch);
  }

  // Enter key in ticker input
  const tickerInput = document.getElementById('tickerInput');
  if (tickerInput) {
    tickerInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleManualSearch();
    });
  }

  // Auto-detection button
  const autoBtn = document.getElementById('autoBtn');
  if (autoBtn) {
    autoBtn.addEventListener('click', async () => {
      const detectedTicker = document.getElementById('detectedTicker').textContent;
      if (detectedTicker) await fetchStockData(detectedTicker);
    });
  }

  // Popular stock buttons
  document.querySelectorAll('.ticker-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ticker = btn.getAttribute('data-ticker');
      if (ticker) await fetchStockData(ticker);
    });
  });

  // Chart period buttons
  const periodButtons = document.querySelectorAll('.period-btn');
  console.log(`🔘 Found ${periodButtons.length} period buttons`);
  
  periodButtons.forEach((btn, index) => {
    const period = btn.getAttribute('data-period');
    console.log(`🔘 Setting up period button ${index}: ${period}`);
    
    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      console.log(`📊 Period button clicked: ${period} for ${currentTicker || 'no ticker'}`);
      console.log(`📊 Button element:`, btn);
      console.log(`📊 Current loading state:`, isLoading);
      
      if (!currentTicker) {
        console.log(`❌ No current ticker, ignoring period button click`);
        return;
      }
      
      if (isLoading) {
        console.log(`⚠️ Already loading, ignoring period button click`);
        return;
      }
      
      // Update active button immediately for better UX
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      console.log(`✅ Active button updated to ${period}`);
      
      // Pass isNewTicker = false to prevent redirect on error
      console.log(`🔄 About to call fetchStockData for ${currentTicker} (${period})`);
      await fetchStockData(currentTicker, period, false);
    });
  });

  // Clear data button
  const clearBtn = document.getElementById('clearDataBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      try {
        await chrome.runtime.sendMessage({ action: 'clearStoredData' });
        currentStockData = null;
        currentTicker = null;
        showManualInput();
      } catch (error) {
        console.error('❌ Error clearing data:', error);
      }
    });
  }
}

async function handleManualSearch() {
  const tickerInput = document.getElementById('tickerInput');
  const inputValue = tickerInput.value.trim();

  if (!inputValue) {
    console.error('❌ Please enter a ticker symbol');
    return;
  }

  const ticker = inputValue.toUpperCase();
  console.log(`🔍 Manual search initiated for: "${ticker}"`);
  
  tickerInput.value = '';
  await fetchStockData(ticker, '1d', true);
}

// ===== INITIALIZATION =====
async function initializePopup() {
  try {
    // Check for stored data first
    const response = await chrome.runtime.sendMessage({ action: 'getStoredStockData' });
    
    if (response && response.success) {
      console.log(`📦 Loading stored data for ${response.ticker}`);
      currentTicker = response.ticker;
      currentStockData = response.data;
      showStockData(response.data, response.ticker);
      return;
    }
    
    // Show manual input as default
    showManualInput();
    
  } catch (error) {
    console.error('❌ Error during popup initialization:', error);
    showManualInput();
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  await initializePopup();
  setupEventListeners();
  console.log('✅ Popup initialization complete');
});
