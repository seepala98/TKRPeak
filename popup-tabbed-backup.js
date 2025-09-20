// Tabbed Popup Script - All modules combined with tab functionality
console.log('📊 Tabbed Stock Extension popup loaded');

let currentStockData = null;
let currentTicker = null;
let isLoading = false; // Prevent multiple simultaneous calls
let tabManager = null;

// ===== UTILITY FUNCTIONS =====
function validateTickerInput(input) {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Please enter a ticker symbol' };
  }

  const cleanInput = input.trim().toUpperCase();
  
  if (cleanInput.length === 0) {
    return { valid: false, error: 'Please enter a ticker symbol' };
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

    console.log(`📨 Background response for ${ticker}:`, response);

    if (response && response.success && response.data) {
      console.log(`✅ Valid response received for ${ticker} (${period})`);
      return response.data;
    } else {
      const errorMsg = response?.error || 'Failed to fetch stock data from background';
      console.error(`❌ Background error for ${ticker}:`, errorMsg);
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error(`❌ Error communicating with background for ${ticker}:`, error);
    throw error;
  }
}

// ===== UI STATE MANAGEMENT =====
function hideAllSections() {
  const sections = ['loading', 'stockData', 'autoDetection', 'manualInput', 'instructions', 'tickerSuggestions'];
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
    
    hideAllSections();
    console.log(`✅ Sections hidden`);
    
    document.getElementById('stockData').classList.remove('hidden');
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
    throw error;
  }
}

function populateStockData(data, ticker) {
  try {
    console.log(`🔄 Populating stock data for ${ticker}...`);
    
    document.getElementById('stockSymbol').textContent = data.symbol || ticker;
    document.getElementById('stockPrice').textContent = `$${(data.currentPrice || 0).toFixed(2)}`;
    
    const period = data.period || '1d';
    const subtitleMap = {
      '1d': '1-Day View', '5d': '5-Day View', '1mo': '1-Month View',
      '6mo': '6-Month View', '1y': '1-Year View'
    };
    document.getElementById('subtitle').textContent = subtitleMap[period] || 'Stock Overview';

    const changeValue = data.periodChange !== undefined ? data.periodChange : data.dayChange;
    const changePercent = data.periodChangePercent !== undefined ? data.periodChangePercent : data.dayChangePercent;
    const highValue = data.periodHigh !== undefined ? data.periodHigh : data.dayHigh;
    const lowValue = data.periodLow !== undefined ? data.periodLow : data.dayLow;

    const changeElement = document.getElementById('stockChange');
    const changeColor = changeValue >= 0 ? '#4caf50' : '#f44336';
    const changeSign = changeValue >= 0 ? '+' : '';
    changeElement.textContent = `${changeSign}$${(changeValue || 0).toFixed(2)} (${changeSign}${(changePercent || 0).toFixed(2)}%)`;
    changeElement.style.color = changeColor;

    const isIntraday = period === '1d';
    const detailRows = document.querySelectorAll('.detail-row');
    
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
    }

    document.getElementById('yahooLink').href = `https://finance.yahoo.com/quote/${ticker}`;
    document.getElementById('googleLink').href = `https://www.google.com/finance/quote/${ticker}`;
    
  } catch (error) {
    console.error(`❌ Error in populateStockData for ${ticker}:`, error);
    throw error;
  }
}

// ===== CHART RENDERING =====
function drawChart(stockData, period = '1d') {
  try {
    console.log(`🔄 Drawing chart for ${stockData.symbol || 'unknown'} (${period})`);
    
    const canvas = document.getElementById('stockChart');
    if (!canvas) {
      console.error('❌ Canvas element not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

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
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

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
    throw error;
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
  
  if (isLoading) {
    console.log(`⚠️ Already loading data, skipping request for ${ticker} (${period})`);
    return;
  }
  
  isLoading = true;
  showLoadingState();
  
  try {
    const stockData = await fetchStockDataFromBackground(ticker, period);
    console.log(`✅ Stock data received for ${ticker} (${period}):`, stockData);
    
    if (stockData.suggestions) {
      console.log(`💡 Received ${stockData.suggestions.length} ticker suggestions for: ${ticker}`);
      showTickerSuggestions(stockData.suggestions);
      return;
    }
    
    if (!stockData.symbol) {
      throw new Error('Invalid stock data: missing symbol');
    }
    
    currentStockData = stockData;
    currentTicker = ticker;
    
    console.log(`🎯 About to show stock data for ${ticker} (${period})`);
    showStockData(stockData, ticker);
    
    // Refresh advanced tab if it's active
    if (tabManager && tabManager.isTabActive('advanced')) {
      tabManager.refreshCurrentTab(ticker);
    }
    
    console.log(`✅ Successfully displayed ${ticker} data for ${period}`);
    
  } catch (error) {
    console.error(`❌ Error in fetchStockData for ${ticker} (${period}):`, error);
    
    if (!isNewTicker && currentStockData) {
      console.log(`⚠️ Period change failed for ${period}, reverting to previous data (${currentStockData.period || '1d'})`);
      showStockData(currentStockData, currentTicker);
      setActivePeriodButton(currentStockData.period || '1d');
    } else {
      console.log(`❌ New ticker search failed, showing manual input`);
      showManualInput();
    }
  } finally {
    isLoading = false;
  }
}

function showTickerSuggestions(suggestions) {
  console.log(`🤔 Showing ${suggestions.length} ticker suggestions`);
  hideAllSections();
  const suggestionsDiv = document.getElementById('tickerSuggestions');
  const suggestionButtons = document.getElementById('suggestionButtons');
  
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
  } else {
    showManualInput();
  }
}

// ===== ADVANCED FINANCIAL DISPLAY =====
class AdvancedDisplayUI {
  static showAdvancedLoadingState() {
    console.log('⏳ Showing advanced loading state');
    document.getElementById('advancedLoading').classList.remove('hidden');
    document.getElementById('financialData').classList.add('hidden');
    document.getElementById('advancedInstructions').classList.add('hidden');
  }

  static showAdvancedData(data, ticker) {
    console.log(`📊 Displaying advanced financial data for ${ticker}`);
    
    document.getElementById('advancedLoading').classList.add('hidden');
    document.getElementById('financialData').classList.remove('hidden');
    document.getElementById('advancedInstructions').classList.add('hidden');
    
    this.populateAdvancedData(data, ticker);
  }

  static showAdvancedInstructions() {
    console.log('ℹ️ Showing advanced instructions');
    
    document.getElementById('advancedLoading').classList.add('hidden');
    document.getElementById('financialData').classList.add('hidden');
    document.getElementById('advancedInstructions').classList.remove('hidden');
  }

  static populateAdvancedData(data, ticker) {
    try {
      console.log(`🔄 Populating advanced data for ${ticker}:`, data);
      
      // Debug: log what data is actually available
      if (data._debug) {
        console.log(`🐛 Debug info for ${ticker}:`, data._debug);
        console.log(`🔍 Basic data keys available:`, data._debug.basicDataKeys);
        console.log(`🔍 Extended data keys available:`, data._debug.extendedDataKeys);
        console.log(`🔍 V8 meta fields available:`, data._debug.v8MetaFields);
      }

      // Check data availability and show appropriate view
      if (data.apiStatus && data.apiStatus.dataSource === 'fastapi') {
        console.log(`🐍 FastAPI data received for ${ticker} - checking data completeness`);
        
        // Check if we actually have meaningful financial data
        const hasRichFinancialData = data.performance?.totalRevenue || 
                                   data.performance?.netIncome || 
                                   data.ratios?.peRatio || 
                                   data.ratios?.pbRatio;
        
        if (hasRichFinancialData) {
          console.log(`✅ Comprehensive financial data available for ${ticker}`);
          this.showComprehensiveDataView(data, ticker);
        } else {
          console.log(`⚠️ Limited FastAPI data for ${ticker} - showing available market data`);
          this.showMarketDataView(data, ticker);
        }
        return;
      } else if (data.apiStatus && data.apiStatus.availableDataLevel === 'limited') {
        console.log(`ℹ️ Limited financial data available for ${ticker} - showing price analysis instead`);
        this.showLimitedDataView(data, ticker);
        return;
      }

      // Company Overview (only if we have extended financial data)
      this.setFinancialValue('sharesOutstanding', data.overview?.sharesOutstanding, 'number');
      this.setFinancialValue('marketCapAdvanced', data.overview?.marketCap, 'currency');
      this.setFinancialValue('enterpriseValue', data.overview?.enterpriseValue, 'currency');
      this.setFinancialValue('ytdReturn', data.overview?.ytdReturn, 'percentage');

      // Financial Performance (TTM)
      this.setFinancialValue('totalRevenue', data.performance?.totalRevenue, 'currency');
      this.setFinancialValue('ebitda', data.performance?.ebitda, 'currency');
      this.setFinancialValue('netIncome', data.performance?.netIncome, 'currency');
      this.setFinancialValue('freeCashFlow', data.performance?.freeCashFlow, 'currency');
      this.setFinancialValue('eps', data.performance?.eps, 'ratio');
      this.setFinancialValue('operatingExpenses', data.performance?.operatingExpenses, 'currency');

      // Balance Sheet
      this.setFinancialValue('totalCash', data.balanceSheet?.totalCash, 'currency');
      this.setFinancialValue('totalDebt', data.balanceSheet?.totalDebt, 'currency');
      this.setFinancialValue('netDebt', data.balanceSheet?.netDebt, 'currency');
      this.setFinancialValue('bookValue', data.balanceSheet?.bookValue, 'currency');

      // Valuation Ratios
      this.setFinancialValue('peRatio', data.ratios?.peRatio, 'ratio');
      this.setFinancialValue('pbRatio', data.ratios?.pbRatio, 'ratio');
      this.setFinancialValue('evRevenue', data.ratios?.evRevenue, 'ratio');
      this.setFinancialValue('evEbitda', data.ratios?.evEbitda, 'ratio');
      this.setFinancialValue('roe', data.ratios?.roe, 'percentage');
      this.setFinancialValue('roa', data.ratios?.roa, 'percentage');

      // Populate quarterly data
      this.populateQuarterlyData(data.quarterly || []);

      console.log(`✅ Advanced data populated successfully for ${ticker}`);

    } catch (error) {
      console.error(`❌ Error populating advanced data for ${ticker}:`, error);
      this.showAdvancedError(`Failed to display financial data for ${ticker}`);
    }
  }

  static setFinancialValue(elementId, value, type = 'currency') {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Debug logging for troubleshooting
    if (value !== null && value !== undefined) {
      console.log(`✅ Setting ${elementId}: ${value} (type: ${type})`);
    } else {
      console.log(`⚠️ Missing data for ${elementId}: ${value} (type: ${type})`);
    }

    const formattedValue = this.formatFinancialValue(value, type);
    element.textContent = formattedValue;

    if (type === 'currency' || type === 'percentage') {
      element.classList.remove('positive', 'negative');
      if (value !== null && value !== undefined) {
        if (value > 0) {
          element.classList.add('positive');
        } else if (value < 0) {
          element.classList.add('negative');
        }
      }
    }
  }

  static populateQuarterlyData(quarterlyData) {
    const container = document.getElementById('quarterlyData');
    if (!container) return;

    container.innerHTML = '';

    if (!quarterlyData || quarterlyData.length === 0) {
      container.innerHTML = '<p style="color: rgba(255,255,255,0.6); text-align: center; font-size: 12px;">Quarterly data not available</p>';
      return;
    }

    // Check if all quarterly data is null/empty
    const hasAnyData = quarterlyData.some(quarter => 
      quarter.revenue !== null || 
      quarter.netIncome !== null || 
      quarter.eps !== null || 
      quarter.freeCashFlow !== null
    );

    if (!hasAnyData) {
      container.innerHTML = `
        <div style="text-align: center; color: rgba(255,255,255,0.6); padding: 20px;">
          <p style="font-size: 12px; margin-bottom: 8px;">📊 Quarterly Financial Data</p>
          <p style="font-size: 11px;">Detailed quarterly data is not available through the current API.</p>
          <p style="font-size: 11px;">Basic financial metrics are shown above.</p>
        </div>
      `;
      return;
    }

    quarterlyData.forEach((quarter, index) => {
      const quarterElement = document.createElement('div');
      quarterElement.className = 'quarterly-item';
      quarterElement.innerHTML = `
        <div class="quarterly-period">${quarter.period || `Q${index + 1}`}</div>
        
        <div class="quarterly-metric">
          <span class="quarterly-metric-label">Revenue</span>
          <span class="quarterly-metric-value">${this.formatFinancialValue(quarter.revenue, 'currency')}</span>
        </div>
        
        <div class="quarterly-metric">
          <span class="quarterly-metric-label">Net Income</span>
          <span class="quarterly-metric-value">${this.formatFinancialValue(quarter.netIncome, 'currency')}</span>
        </div>
        
        <div class="quarterly-metric">
          <span class="quarterly-metric-label">EPS</span>
          <span class="quarterly-metric-value">${this.formatFinancialValue(quarter.eps, 'ratio')}</span>
        </div>
        
        <div class="quarterly-metric">
          <span class="quarterly-metric-label">Free Cash Flow</span>
          <span class="quarterly-metric-value">${this.formatFinancialValue(quarter.freeCashFlow, 'currency')}</span>
        </div>
      `;

      const netIncomeElement = quarterElement.querySelector('.quarterly-metric:nth-child(3) .quarterly-metric-value');
      if (quarter.netIncome !== null && quarter.netIncome !== undefined) {
        if (quarter.netIncome > 0) {
          netIncomeElement.style.color = '#4caf50';
        } else if (quarter.netIncome < 0) {
          netIncomeElement.style.color = '#f44336';
        }
      }

      container.appendChild(quarterElement);
    });
  }

  static showComprehensiveDataView(data, ticker) {
    console.log(`🐍 Showing comprehensive FastAPI data for ${ticker}`);
    
    document.getElementById('advancedLoading').classList.add('hidden');
    document.getElementById('financialData').classList.remove('hidden');
    document.getElementById('advancedInstructions').classList.add('hidden');
    
    // Populate comprehensive data using FastAPI response
    this.populateComprehensiveFinancialData(data, ticker);
  }

  static populateComprehensiveFinancialData(data, ticker) {
    try {
      console.log(`🔄 Populating comprehensive FastAPI data for ${ticker}`);
      
      // Company Overview
      this.setFinancialValue('sharesOutstanding', data.overview?.sharesOutstanding, 'number');
      this.setFinancialValue('marketCapAdvanced', data.overview?.marketCap, 'currency');
      this.setFinancialValue('enterpriseValue', data.overview?.enterpriseValue, 'currency');
      this.setFinancialValue('ytdReturn', data.overview?.ytdReturn, 'percentage');

      // Financial Performance (TTM)
      this.setFinancialValue('totalRevenue', data.performance?.totalRevenue, 'currency');
      this.setFinancialValue('ebitda', data.performance?.ebitda, 'currency');
      this.setFinancialValue('netIncome', data.performance?.netIncome, 'currency');
      this.setFinancialValue('freeCashFlow', data.performance?.freeCashFlow, 'currency');
      this.setFinancialValue('eps', data.performance?.eps, 'ratio');
      this.setFinancialValue('operatingExpenses', data.performance?.operatingExpenses, 'currency');

      // Balance Sheet
      this.setFinancialValue('totalCash', data.balanceSheet?.totalCash, 'currency');
      this.setFinancialValue('totalDebt', data.balanceSheet?.totalDebt, 'currency');
      this.setFinancialValue('netDebt', data.balanceSheet?.netDebt, 'currency');
      this.setFinancialValue('bookValue', data.balanceSheet?.bookValue, 'currency');

      // Valuation Ratios
      this.setFinancialValue('peRatio', data.ratios?.peRatio, 'ratio');
      this.setFinancialValue('pbRatio', data.ratios?.pbRatio, 'ratio');
      this.setFinancialValue('evRevenue', data.ratios?.evRevenue, 'ratio');
      this.setFinancialValue('evEbitda', data.ratios?.evEbitda, 'ratio');
      this.setFinancialValue('roe', data.ratios?.roe, 'percentage');
      this.setFinancialValue('roa', data.ratios?.roa, 'percentage');

      // Populate quarterly data (with real data from FastAPI)
      this.populateQuarterlyData(data.quarterly || []);
      
      console.log(`✅ Comprehensive FastAPI data populated successfully for ${ticker}`);
      
      // Add a success indicator
      const instructionsElement = document.getElementById('advancedInstructions');
      if (instructionsElement) {
        instructionsElement.innerHTML = `
          <div style="background: rgba(76, 175, 80, 0.1); border-radius: 8px; padding: 12px; border-left: 4px solid #4caf50; margin-top: 16px;">
            <h4 style="margin: 0 0 6px 0; color: #4caf50;">✅ Comprehensive Financial Data</h4>
            <p style="font-size: 11px; margin: 0; color: rgba(255,255,255,0.8);">
              Data provided by FastAPI service using yfinance package - Full financial statements and ratios available.
            </p>
            <p style="font-size: 10px; margin: 4px 0 0 0; color: rgba(255,255,255,0.6);">
              API Status: FastAPI ✅ | yfinance ✅ | Data Level: Comprehensive
            </p>
          </div>
        `;
      }

    } catch (error) {
      console.error(`❌ Error populating comprehensive data for ${ticker}:`, error);
      this.showAdvancedError(`Failed to display comprehensive data for ${ticker}: ${error.message}`);
    }
  }

  static showMarketDataView(data, ticker) {
    console.log(`📊 Showing available market data for ${ticker}`);
    
    document.getElementById('advancedLoading').classList.add('hidden');
    document.getElementById('financialData').classList.add('hidden');
    
    const instructionsElement = document.getElementById('advancedInstructions');
    instructionsElement.classList.remove('hidden');
    
    // Extract available market data from FastAPI response
    const marketCap = data.overview?.marketCap || data.market_cap;
    const enterpriseValue = data.overview?.enterpriseValue || data.enterprise_value;
    const sharesOutstanding = data.overview?.sharesOutstanding || data.shares_outstanding;
    const companyName = data.companyInfo?.name || data.company_name;
    const exchange = data.companyInfo?.exchange || data.exchange;
    const currency = data.companyInfo?.currency || data.currency;
    const ebitda = data.performance?.ebitda || data.ebitda;
    const freeCashFlow = data.performance?.freeCashFlow || data.free_cash_flow;
    
    instructionsElement.innerHTML = `
      <div style="background: rgba(54, 162, 235, 0.1); border-radius: 8px; padding: 16px; border-left: 4px solid #36a2eb;">
        <h4 style="margin: 0 0 12px 0; color: #36a2eb;">📊 Available Market Data for ${ticker}</h4>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0;">
          ${companyName ? `
            <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px;">
              <div style="font-size: 10px; color: rgba(255,255,255,0.6); margin-bottom: 4px;">Company</div>
              <div style="font-size: 12px; font-weight: 500;">${companyName}</div>
            </div>
          ` : ''}
          
          ${exchange && currency ? `
            <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px;">
              <div style="font-size: 10px; color: rgba(255,255,255,0.6); margin-bottom: 4px;">Exchange</div>
              <div style="font-size: 12px; font-weight: 500;">${exchange} (${currency})</div>
            </div>
          ` : ''}
          
          ${marketCap ? `
            <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px;">
              <div style="font-size: 10px; color: rgba(255,255,255,0.6); margin-bottom: 4px;">Market Cap</div>
              <div style="font-size: 12px; font-weight: 500; color: #4caf50;">${this.formatCurrency(marketCap)}</div>
            </div>
          ` : ''}
          
          ${enterpriseValue ? `
            <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px;">
              <div style="font-size: 10px; color: rgba(255,255,255,0.6); margin-bottom: 4px;">Enterprise Value</div>
              <div style="font-size: 12px; font-weight: 500; color: #4caf50;">${this.formatCurrency(enterpriseValue)}</div>
            </div>
          ` : ''}
          
          ${sharesOutstanding ? `
            <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px;">
              <div style="font-size: 10px; color: rgba(255,255,255,0.6); margin-bottom: 4px;">Shares Outstanding</div>
              <div style="font-size: 12px; font-weight: 500;">${this.formatNumber(sharesOutstanding)}</div>
            </div>
          ` : ''}
          
          ${ebitda ? `
            <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px;">
              <div style="font-size: 10px; color: rgba(255,255,255,0.6); margin-bottom: 4px;">EBITDA</div>
              <div style="font-size: 12px; font-weight: 500; color: #4caf50;">${this.formatCurrency(ebitda)}</div>
            </div>
          ` : ''}
          
          ${freeCashFlow ? `
            <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px;">
              <div style="font-size: 10px; color: rgba(255,255,255,0.6); margin-bottom: 4px;">Free Cash Flow</div>
              <div style="font-size: 12px; font-weight: 500; color: #4caf50;">${this.formatCurrency(freeCashFlow)}</div>
            </div>
          ` : ''}
        </div>
      </div>
      
      <div style="background: rgba(255, 152, 0, 0.1); border-radius: 8px; padding: 12px; border-left: 4px solid #ff9800; margin-top: 12px;">
        <h4 style="margin: 0 0 6px 0; color: #ff9800;">⚠️ Limited Financial Data</h4>
        <p style="font-size: 11px; margin: 0; color: rgba(255,255,255,0.8);">
          Yahoo Finance has restricted access to detailed financial statements (income statement, balance sheet, cash flow). 
          Only basic market data is available through the API.
        </p>
        <p style="font-size: 10px; margin: 6px 0 0 0; color: rgba(255,255,255,0.6);">
          API Status: FastAPI ✅ | yfinance ⚠️ (Limited) | Data Level: Market Data Only
        </p>
        <p style="font-size: 10px; margin: 4px 0 0 0; color: rgba(255,255,255,0.5);">
          For complete financial analysis, please visit Yahoo Finance or other financial data providers directly.
        </p>
      </div>
    `;
  }

  static showLimitedDataView(data, ticker) {
    document.getElementById('advancedLoading').classList.add('hidden');
    document.getElementById('financialData').classList.add('hidden');
    
    const instructionsElement = document.getElementById('advancedInstructions');
    instructionsElement.classList.remove('hidden');
    
    const priceAnalysis = data.priceAnalysis || {};
    const ytdReturn = data.overview?.ytdReturn;
    
    instructionsElement.innerHTML = `
      <div style="text-align: left;">
        <h3>📊 Price Analysis for ${ticker}</h3>
        
        <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h4 style="margin: 0 0 12px 0; color: #e0e7ff;">📈 Price Metrics</h4>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div>
              <span style="font-size: 11px; color: rgba(255,255,255,0.7);">Current Price:</span><br>
              <span style="font-size: 14px; font-weight: 600; color: white;">${this.formatFinancialValue(priceAnalysis.currentPrice, 'currency')}</span>
            </div>
            <div>
              <span style="font-size: 11px; color: rgba(255,255,255,0.7);">Currency:</span><br>
              <span style="font-size: 14px; font-weight: 600; color: white;">${priceAnalysis.currency || '-'}</span>
            </div>
            <div>
              <span style="font-size: 11px; color: rgba(255,255,255,0.7);">52W High:</span><br>
              <span style="font-size: 14px; font-weight: 600; color: white;">${this.formatFinancialValue(priceAnalysis.fiftyTwoWeekHigh, 'currency')}</span>
            </div>
            <div>
              <span style="font-size: 11px; color: rgba(255,255,255,0.7);">52W Low:</span><br>
              <span style="font-size: 14px; font-weight: 600; color: white;">${this.formatFinancialValue(priceAnalysis.fiftyTwoWeekLow, 'currency')}</span>
            </div>
            <div>
              <span style="font-size: 11px; color: rgba(255,255,255,0.7);">YTD Return:</span><br>
              <span style="font-size: 14px; font-weight: 600; color: ${ytdReturn >= 0 ? '#4caf50' : '#f44336'};">${this.formatFinancialValue(ytdReturn, 'percentage')}</span>
            </div>
            <div>
              <span style="font-size: 11px; color: rgba(255,255,255,0.7);">Volatility:</span><br>
              <span style="font-size: 14px; font-weight: 600; color: white;">${this.formatFinancialValue(priceAnalysis.volatility, 'percentage')}</span>
            </div>
          </div>
          
          ${priceAnalysis.priceNear52WeekHigh ? `
          <div style="margin-bottom: 12px;">
            <span style="font-size: 11px; color: rgba(255,255,255,0.7);">Distance from 52W High:</span><br>
            <span style="font-size: 12px; color: ${priceAnalysis.priceNear52WeekHigh >= 90 ? '#f44336' : '#4caf50'};">
              ${this.formatFinancialValue(priceAnalysis.priceNear52WeekHigh, 'percentage')} of 52W high
            </span>
          </div>
          ` : ''}
          
          <div style="margin-top: 16px; font-size: 11px; color: rgba(255,255,255,0.6);">
            <p><strong>Exchange:</strong> ${priceAnalysis.exchangeName || '-'}</p>
            <p><strong>Company:</strong> ${priceAnalysis.longName || priceAnalysis.shortName || ticker}</p>
          </div>
        </div>
        
        <div style="background: rgba(255,196,0,0.1); border-radius: 8px; padding: 16px; border-left: 4px solid #ffc400;">
          <h4 style="margin: 0 0 8px 0; color: #ffc400;">⚠️ Limited Financial Data</h4>
          <p style="font-size: 12px; margin: 0; color: rgba(255,255,255,0.8);">
            Advanced financial metrics (revenue, earnings, ratios) are not available due to Yahoo Finance API restrictions. 
            Only price and trading data can be displayed.
          </p>
          <p style="font-size: 11px; margin: 8px 0 0 0; color: rgba(255,255,255,0.6);">
            API Status: Chart data ✅ | Financial data ❌ (401/404 errors)
          </p>
        </div>
      </div>
    `;
  }

  static showAdvancedError(message) {
    console.error(`❌ Advanced display error: ${message}`);
    
    document.getElementById('advancedLoading').classList.add('hidden');
    document.getElementById('financialData').classList.add('hidden');
    
    const instructionsElement = document.getElementById('advancedInstructions');
    instructionsElement.classList.remove('hidden');
    instructionsElement.innerHTML = `
      <h3>❌ Error Loading Financial Data</h3>
      <p>${message}</p>
      <p>Please try again or select a different stock.</p>
    `;
  }

  static onAdvancedTabActivated(currentTicker) {
    console.log(`📊 Advanced tab activated for ${currentTicker || 'no ticker'}`);
    
    if (!currentTicker) {
      this.showAdvancedInstructions();
      return;
    }

    this.showAdvancedLoadingState();
    this.fetchAndDisplayAdvancedData(currentTicker);
  }

  static async fetchAndDisplayAdvancedData(ticker) {
    try {
      console.log(`🔄 Fetching advanced financial data for ${ticker}`);
      
      const response = await chrome.runtime.sendMessage({
        action: 'fetchAdvancedStockData',
        ticker: ticker
      });

      console.log(`📨 Advanced data response for ${ticker}:`, response);

      if (response && response.success && response.data) {
        this.showAdvancedData(response.data, ticker);
      } else {
        throw new Error(response.error || 'Failed to fetch advanced financial data');
      }

    } catch (error) {
      console.error(`❌ Error fetching advanced data for ${ticker}:`, error);
      this.showAdvancedError(`Failed to load financial data for ${ticker}. ${error.message}`);
    }
  }

  static formatFinancialValue(value, type = 'currency') {
    if (value === null || value === undefined) return '-';

    switch (type) {
      case 'currency':
        if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
        if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
        if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
        if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
        return `$${value.toFixed(0)}`;
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'ratio':
        return value.toFixed(2);
      case 'number':
        if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
        if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
        if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
        return value.toFixed(0);
      default:
        return value.toString();
    }
  }
}

// ===== TAB MANAGER =====
class TabManager {
  constructor() {
    this.currentTab = 'basic';
    this.setupTabEventListeners();
    console.log('🔄 Tab Manager initialized');
  }

  setupTabEventListeners() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
      const tabName = button.getAttribute('data-tab');
      
      button.addEventListener('click', (event) => {
        event.preventDefault();
        this.switchTab(tabName);
      });
    });
  }

  switchTab(tabName) {
    console.log(`🔄 Switching from ${this.currentTab} to ${tabName} tab`);

    if (this.currentTab === tabName) return;

    this.updateTabButtons(tabName);
    this.updateTabPanels(tabName);
    this.handleTabActivation(tabName);

    this.currentTab = tabName;
  }

  updateTabButtons(activeTab) {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
      const tabName = button.getAttribute('data-tab');
      button.classList.remove('active');
      
      if (tabName === activeTab) {
        button.classList.add('active');
      }
    });
  }

  updateTabPanels(activeTab) {
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabPanels.forEach(panel => {
      panel.classList.add('hidden');
      panel.classList.remove('active');
    });

    const activePanel = document.getElementById(`${activeTab}-tab`);
    if (activePanel) {
      activePanel.classList.remove('hidden');
      activePanel.classList.add('active');
    }
  }

  handleTabActivation(tabName) {
    switch (tabName) {
      case 'basic':
        console.log(`📈 Basic tab activated for ${currentTicker || 'no ticker'}`);
        break;

      case 'advanced':
        console.log(`📊 Advanced tab activated for ${currentTicker || 'no ticker'}`);
        AdvancedDisplayUI.onAdvancedTabActivated(currentTicker);
        break;
    }
  }

  getCurrentTab() {
    return this.currentTab;
  }

  isTabActive(tabName) {
    return this.currentTab === tabName;
  }

  refreshCurrentTab(newTicker) {
    console.log(`🔄 Refreshing ${this.currentTab} tab for new ticker: ${newTicker}`);
    
    if (this.currentTab === 'advanced' && newTicker) {
      AdvancedDisplayUI.onAdvancedTabActivated(newTicker);
    }
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
  
  periodButtons.forEach((btn, index) => {
    const period = btn.getAttribute('data-period');
    
    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      console.log(`📊 Period button clicked: ${period} for ${currentTicker || 'no ticker'}`);
      
      if (!currentTicker || isLoading) return;
      
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      await fetchStockData(currentTicker, period, false);
    });
  });

  // Clear data button
  const clearBtn = document.getElementById('clearDataBtn');
  if (clearBtn) {
    console.log('✅ Clear button found, setting up event listener');
    clearBtn.addEventListener('click', async () => {
      console.log('🧹 Clear & Start Fresh button clicked');
      try {
        console.log('📨 Sending clearStoredData message to background');
        const response = await chrome.runtime.sendMessage({ action: 'clearStoredData' });
        console.log('✅ Background responded to clearStoredData:', response);
        
        currentStockData = null;
        currentTicker = null;
        
        console.log('🔄 Resetting UI to manual input state');
        showManualInput();
        
        if (tabManager) {
          console.log('📋 Switching back to basic tab');
          tabManager.switchTab('basic');
        }
        
        // Clear the ticker input field
        const tickerInput = document.getElementById('tickerInput');
        if (tickerInput) {
          tickerInput.value = '';
        }
        
        console.log('✅ Clear & Start Fresh completed successfully');
      } catch (error) {
        console.error('❌ Error clearing data:', error);
        alert('Error clearing data: ' + error.message);
      }
    });
  } else {
    console.error('❌ Clear button not found in DOM');
  }
}

async function handleManualSearch() {
  const tickerInput = document.getElementById('tickerInput');
  const inputValue = tickerInput.value.trim();

  const validation = validateTickerInput(inputValue);
  if (!validation.valid) {
    console.error(`❌ Input validation failed: ${validation.error}`);
    return;
  }

  const ticker = validation.ticker;
  tickerInput.value = '';
  await fetchStockData(ticker, '1d', true);
}

// ===== INITIALIZATION =====
async function initializePopup() {
  try {
    // Initialize tab manager
    tabManager = new TabManager();
    
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
  console.log('✅ Tabbed popup initialization complete');
});
