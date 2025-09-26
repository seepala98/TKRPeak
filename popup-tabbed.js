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
    // Keep existing quarterly data method for backward compatibility
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
          <p style="font-size: 11px;">Use the "Load Quarterly Trends" button above for detailed historical analysis.</p>
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

// ===== QUARTERLY CHARTS UI CLASS =====
class QuarterlyChartsUI {
  static currentChartType = 'revenue';
  static quarterlyTrendsData = null;
  
  static onQuarterlyTabActivated(ticker) {
    console.log(`📈 Quarterly tab activated for ticker: ${ticker}`);
    
    if (!ticker) {
      this.showQuarterlyInstructions();
      return;
    }
    
    // Initialize chart controls
    this.initializeChartControls();
    
    console.log(`🔄 Quarterly tab ready for ticker: ${ticker}`);
  }

  static initializeChartControls() {
    console.log('🎛️ Setting up quarterly chart controls');
    
    // Load quarterly button
    const loadBtn = document.getElementById('loadQuarterlyBtn');
    if (loadBtn) {
      // Remove existing listeners
      loadBtn.replaceWith(loadBtn.cloneNode(true));
      const newLoadBtn = document.getElementById('loadQuarterlyBtn');
      
      newLoadBtn.addEventListener('click', () => {
        if (currentTicker) {
          this.loadQuarterlyTrends(currentTicker);
        }
      });
    }
    
    // Chart selector buttons
    const chartBtns = document.querySelectorAll('.chart-btn');
    chartBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const chartType = btn.getAttribute('data-chart');
        this.switchChart(chartType);
      });
    });
  }

  static async loadQuarterlyTrends(ticker) {
    console.log(`📈 Loading quarterly trends for ${ticker}`);
    
    this.showQuarterlyLoadingState();
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'fetchQuarterlyTrends',
        ticker: ticker
      });
      
      if (response && response.success && response.data) {
        console.log(`✅ Quarterly trends data received for ${ticker}:`, response.data);
        this.quarterlyTrendsData = response.data;
        this.displayQuarterlyTrends(response.data, ticker);
      } else {
        throw new Error(response?.error || 'Failed to fetch quarterly trends');
      }
    } catch (error) {
      console.error(`❌ Error loading quarterly trends for ${ticker}:`, error);
      this.showQuarterlyError(`Unable to load quarterly trends for ${ticker}. ${error.message}`);
    } finally {
      this.hideQuarterlyLoadingState();
    }
  }

  static displayQuarterlyTrends(data, ticker) {
    console.log(`📊 Displaying quarterly trends for ${ticker}`);
    
    // Show data container
    document.getElementById('quarterlyContainer').classList.remove('hidden');
    document.getElementById('quarterlyInstructions').classList.add('hidden');
    
    // Calculate better insights from actual data
    const enhancedInsights = this.calculateEnhancedInsights(data.trends);
    
    // Start AI analysis
    this.performAIAnalysis(data, ticker);
    
    // Populate insights with enhanced calculations
    this.populateQuarterlyInsights(enhancedInsights);
    
    // Draw initial chart
    this.drawQuarterlyChart(this.currentChartType, data);
    
    // Populate tables
    if (data.trends) {
      this.populateRevenueTable(data.trends.revenue_trends || []);
      this.populateCashFlowTable(data.trends.cash_flow_trends || []);
      this.populateBalanceSheetTable(data.trends.balance_sheet_trends || []);
    }
    
    // Populate growth analysis with enhanced data
    this.populateGrowthAnalysis(enhancedInsights);
  }

  static drawQuarterlyChart(chartType, data) {
    const canvas = document.getElementById('quarterlyChart');
    if (!canvas || !data.trends) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Set up chart data based on type
    let chartData = [];
    let chartColors = [];
    let chartTitle = '';
    
    switch (chartType) {
      case 'revenue':
        chartData = this.prepareRevenueChartData(data.trends.revenue_trends);
        chartColors = ['#10b981', '#059669', '#047857', '#065f46'];
        chartTitle = 'Quarterly Revenue Trends';
        break;
      case 'cashflow':
        chartData = this.prepareCashFlowChartData(data.trends.cash_flow_trends);
        chartColors = ['#3b82f6', '#1d4ed8', '#1e40af', '#1e3a8a'];
        chartTitle = 'Quarterly Cash Flow Trends';
        break;
      case 'margins':
        chartData = this.prepareMarginsChartData(data.trends.revenue_trends);
        chartColors = ['#f59e0b', '#d97706', '#b45309', '#92400e'];
        chartTitle = 'Quarterly Margin Trends';
        break;
    }
    
    if (chartData.length === 0) return;
    
    // Draw the chart
    this.renderLineChart(ctx, width, height, chartData, chartColors, chartTitle);
    
    // Update legend
    this.updateChartLegend(chartData, chartColors);
  }

  static prepareRevenueChartData(revenueData) {
    if (!revenueData || revenueData.length === 0) return [];
    
    const last6Quarters = revenueData.slice(0, 6).reverse();
    
    return [
      {
        label: 'Revenue',
        data: last6Quarters.map(q => ({ 
          x: q.period, 
          y: (q.revenue || 0) / 1e9 // Convert to billions
        }))
      },
      {
        label: 'Net Income',
        data: last6Quarters.map(q => ({ 
          x: q.period, 
          y: (q.net_income || 0) / 1e9 
        }))
      }
    ];
  }

  static prepareCashFlowChartData(cashFlowData) {
    if (!cashFlowData || cashFlowData.length === 0) return [];
    
    const last6Quarters = cashFlowData.slice(0, 6).reverse();
    
    return [
      {
        label: 'Operating CF',
        data: last6Quarters.map(q => ({ 
          x: q.period, 
          y: (q.operating_cash_flow || 0) / 1e9 
        }))
      },
      {
        label: 'Free CF',
        data: last6Quarters.map(q => ({ 
          x: q.period, 
          y: (q.free_cash_flow || 0) / 1e9 
        }))
      }
    ];
  }

  static prepareMarginsChartData(revenueData) {
    if (!revenueData || revenueData.length === 0) return [];
    
    const last6Quarters = revenueData.slice(0, 6).reverse();
    
    return [
      {
        label: 'Gross Margin %',
        data: last6Quarters.map(q => ({ 
          x: q.period, 
          y: q.revenue && q.gross_profit ? (q.gross_profit / q.revenue * 100) : 0
        }))
      },
      {
        label: 'Net Margin %',
        data: last6Quarters.map(q => ({ 
          x: q.period, 
          y: q.revenue && q.net_income ? (q.net_income / q.revenue * 100) : 0
        }))
      }
    ];
  }

  static renderLineChart(ctx, width, height, chartData, colors, title) {
    const margin = { top: 40, right: 20, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Set up styling
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1;
    ctx.font = '10px sans-serif';
    
    // Draw title
    ctx.fillStyle = '#a7f3d0';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 20);
    
    if (!chartData || chartData.length === 0) return;
    
    // Find min/max values for scaling
    let minY = Infinity, maxY = -Infinity;
    chartData.forEach(series => {
      series.data.forEach(point => {
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      });
    });
    
    // Add padding to Y range
    const yPadding = (maxY - minY) * 0.1;
    minY -= yPadding;
    maxY += yPadding;
    
    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    
    // Y axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.stroke();
    
    // X axis
    ctx.beginPath();
    ctx.moveTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();
    
    // Draw grid lines and labels
    const numYTicks = 4;
    const numXTicks = Math.min(6, chartData[0]?.data.length || 0);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    
    // Y axis labels and grid
    for (let i = 0; i <= numYTicks; i++) {
      const y = margin.top + (chartHeight * i / numYTicks);
      const value = maxY - ((maxY - minY) * i / numYTicks);
      
      // Grid line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
      
      // Label
      ctx.fillText(value.toFixed(1), margin.left - 5, y + 3);
    }
    
    // X axis labels
    if (chartData[0] && chartData[0].data.length > 0) {
      ctx.textAlign = 'center';
      const xData = chartData[0].data;
      for (let i = 0; i < Math.min(numXTicks, xData.length); i++) {
        const x = margin.left + (chartWidth * i / (numXTicks - 1));
        const period = xData[i].x;
        const shortPeriod = period ? period.substring(0, 7) : '';
        ctx.fillText(shortPeriod, x, height - margin.bottom + 15);
      }
    }
    
    // Draw data lines
    chartData.forEach((series, seriesIndex) => {
      if (!series.data || series.data.length === 0) return;
      
      ctx.strokeStyle = colors[seriesIndex] || '#10b981';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      
      series.data.forEach((point, pointIndex) => {
        const x = margin.left + (chartWidth * pointIndex / (series.data.length - 1));
        const y = margin.top + (chartHeight * (1 - (point.y - minY) / (maxY - minY)));
        
        if (pointIndex === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
      
      // Draw points
      ctx.fillStyle = colors[seriesIndex] || '#10b981';
      series.data.forEach((point, pointIndex) => {
        const x = margin.left + (chartWidth * pointIndex / (series.data.length - 1));
        const y = margin.top + (chartHeight * (1 - (point.y - minY) / (maxY - minY)));
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    });
  }

  static updateChartLegend(chartData, colors) {
    const legendContainer = document.getElementById('chartLegend');
    if (!legendContainer || !chartData) return;
    
    const legendHtml = chartData.map((series, index) => `
      <div class="legend-item">
        <div class="legend-color" style="background-color: ${colors[index] || '#10b981'}"></div>
        <span>${series.label}</span>
      </div>
    `).join('');
    
    legendContainer.innerHTML = legendHtml;
  }

  static switchChart(chartType) {
    console.log(`📊 Switching to ${chartType} chart`);
    
    // Update button states
    document.querySelectorAll('.chart-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-chart') === chartType) {
        btn.classList.add('active');
      }
    });
    
    this.currentChartType = chartType;
    
    // Redraw chart if data is available
    if (this.quarterlyTrendsData) {
      this.drawQuarterlyChart(chartType, this.quarterlyTrendsData);
    }
  }

  // Calculate enhanced insights from actual quarterly data
  static calculateEnhancedInsights(trends) {
    if (!trends) return this.getDefaultInsights();

    try {
      const revenueData = trends.revenue_trends || [];
      const cashFlowData = trends.cash_flow_trends || [];
      const balanceData = trends.balance_sheet_trends || [];

      if (revenueData.length < 2) return this.getDefaultInsights();

      // Calculate revenue growth
      const revenueGrowth = this.calculateGrowthTrend(revenueData, 'revenue');
      
      // Calculate profitability trend
      const profitabilityTrend = this.calculateProfitabilityTrend(revenueData);
      
      // Calculate cash generation trend
      const cashTrend = this.calculateCashFlowTrend(cashFlowData);
      
      // Calculate balance sheet health
      const balanceTrend = this.calculateBalanceSheetTrend(balanceData);

      return {
        revenue_growth: {
          trend: revenueGrowth.trend,
          latest_qoq: revenueGrowth.qoq,
          latest_yoy: revenueGrowth.yoy,
          direction: revenueGrowth.direction
        },
        profitability: {
          trend: profitabilityTrend.trend,
          margin_direction: profitabilityTrend.marginDirection,
          latest_margin: profitabilityTrend.latestMargin
        },
        cash_generation: {
          trend: cashTrend.trend,
          fcf_trend: cashTrend.fcfTrend,
          latest_fcf: cashTrend.latestFCF
        },
        balance_sheet: {
          trend: balanceTrend.trend,
          debt_trend: balanceTrend.debtTrend,
          liquidity: balanceTrend.liquidity
        }
      };

    } catch (error) {
      console.error('Error calculating enhanced insights:', error);
      return this.getDefaultInsights();
    }
  }

  static calculateGrowthTrend(data, field) {
    if (!data || data.length < 2) return { trend: 'insufficient_data', qoq: null, yoy: null };

    const latest = data[0]?.[field] || 0;
    const previous = data[1]?.[field] || 0;
    const yearAgo = data.length >= 5 ? (data[4]?.[field] || 0) : 0;

    const qoq = previous !== 0 ? ((latest - previous) / previous * 100) : null;
    const yoy = yearAgo !== 0 ? ((latest - yearAgo) / yearAgo * 100) : null;

    let trend = 'stable';
    let direction = 'flat';

    if (qoq !== null) {
      if (qoq > 5) { trend = 'accelerating'; direction = 'up'; }
      else if (qoq < -5) { trend = 'declining'; direction = 'down'; }
      else if (qoq > 2) { trend = 'growing'; direction = 'up'; }
      else if (qoq < -2) { trend = 'slowing'; direction = 'down'; }
    }

    return { trend, qoq, yoy, direction };
  }

  static calculateProfitabilityTrend(revenueData) {
    if (!revenueData || revenueData.length < 2) return { trend: 'stable', marginDirection: 'stable' };

    const calculateMargin = (quarter) => {
      const revenue = quarter.revenue || 0;
      const netIncome = quarter.net_income || 0;
      return revenue > 0 ? (netIncome / revenue * 100) : 0;
    };

    const latestMargin = calculateMargin(revenueData[0]);
    const previousMargin = calculateMargin(revenueData[1]);

    const marginChange = latestMargin - previousMargin;
    
    let trend = 'stable';
    let marginDirection = 'stable';

    if (marginChange > 1) { trend = 'improving'; marginDirection = 'expanding'; }
    else if (marginChange < -1) { trend = 'declining'; marginDirection = 'contracting'; }
    else if (marginChange > 0.3) { marginDirection = 'improving'; }
    else if (marginChange < -0.3) { marginDirection = 'weakening'; }

    return { trend, marginDirection, latestMargin: latestMargin.toFixed(1) + '%' };
  }

  static calculateCashFlowTrend(cashFlowData) {
    if (!cashFlowData || cashFlowData.length < 2) return { trend: 'stable', fcfTrend: 'stable' };

    const latest = cashFlowData[0]?.free_cash_flow || 0;
    const previous = cashFlowData[1]?.free_cash_flow || 0;

    const change = previous !== 0 ? ((latest - previous) / previous * 100) : 0;

    let trend = 'stable';
    let fcfTrend = 'stable';

    if (change > 10) { trend = 'strengthening'; fcfTrend = 'improving'; }
    else if (change < -10) { trend = 'weakening'; fcfTrend = 'declining'; }
    else if (change > 3) { fcfTrend = 'growing'; }
    else if (change < -3) { fcfTrend = 'contracting'; }

    return { trend, fcfTrend, latestFCF: this.formatFinancialValue(latest, 'currency') };
  }

  static calculateBalanceSheetTrend(balanceData) {
    if (!balanceData || balanceData.length < 2) return { trend: 'stable', debtTrend: 'stable' };

    const latest = balanceData[0] || {};
    const previous = balanceData[1] || {};

    const latestDebt = latest.total_debt || 0;
    const previousDebt = previous.total_debt || 0;
    const latestCash = latest.total_cash || 0;

    const debtChange = previousDebt !== 0 ? ((latestDebt - previousDebt) / previousDebt * 100) : 0;
    const cashToDebt = latestDebt > 0 ? (latestCash / latestDebt) : 0;

    let trend = 'stable';
    let debtTrend = 'stable';
    let liquidity = 'adequate';

    if (debtChange > 5) { debtTrend = 'increasing'; }
    else if (debtChange < -5) { debtTrend = 'decreasing'; }

    if (cashToDebt > 1.5) { liquidity = 'strong'; trend = 'healthy'; }
    else if (cashToDebt < 0.3) { liquidity = 'tight'; trend = 'concerning'; }

    return { trend, debtTrend, liquidity };
  }

  static getDefaultInsights() {
    return {
      revenue_growth: { trend: 'stable', latest_qoq: null, latest_yoy: null },
      profitability: { trend: 'stable', margin_direction: 'stable' },
      cash_generation: { trend: 'stable', fcf_trend: 'stable' },
      balance_sheet: { trend: 'stable', debt_trend: 'stable' }
    };
  }

  // AI Analysis Integration
  static async performAIAnalysis(quarterlyData, ticker) {
    console.log(`🤖 Starting AI analysis for ${ticker}`);
    
    // Show AI loading state
    this.showAIAnalysisLoading();

    try {
      // Prepare comprehensive data for AI analysis
      const analysisData = this.prepareAIAnalysisData(quarterlyData, ticker);
      
      // Send to Gemini API via background script
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeQuarterlyData',
        ticker: ticker,
        data: analysisData
      });

      if (response && response.success) {
        const metadata = {
          isAgentic: response.isAgentic,
          toolsUsed: response.toolsUsed,
          iterations: response.iterations,
          fallback: response.fallback,
          fallback_reason: response.fallback_reason
        };
        this.displayAIAnalysis(response.analysis, response.recommendation, metadata);
      } else {
        throw new Error(response?.error || 'AI analysis failed');
      }

    } catch (error) {
      console.error(`❌ AI analysis error for ${ticker}:`, error);
      this.showAIAnalysisError();
    }
  }

  static prepareAIAnalysisData(quarterlyData, ticker) {
    const trends = quarterlyData.trends || {};
    const revenueData = trends.revenue_trends?.slice(0, 6) || [];
    const cashFlowData = trends.cash_flow_trends?.slice(0, 6) || [];
    const balanceData = trends.balance_sheet_trends?.slice(0, 6) || [];

    return {
      symbol: ticker,
      quarters_analyzed: quarterlyData.quarters_analyzed || 0,
      revenue_trends: revenueData.map(q => ({
        period: q.period,
        revenue: q.revenue,
        net_income: q.net_income,
        gross_profit: q.gross_profit,
        operating_income: q.operating_income,
        ebitda: q.ebitda
      })),
      cash_flow_trends: cashFlowData.map(q => ({
        period: q.period,
        operating_cash_flow: q.operating_cash_flow,
        free_cash_flow: q.free_cash_flow,
        capital_expenditures: q.capital_expenditures
      })),
      balance_sheet_trends: balanceData.map(q => ({
        period: q.period,
        total_assets: q.total_assets,
        total_cash: q.total_cash,
        total_debt: q.total_debt,
        stockholder_equity: q.stockholder_equity
      })),
      insights: quarterlyData.insights
    };
  }

  static showAIAnalysisLoading() {
    document.getElementById('aiAnalysisLoading').classList.remove('hidden');
    document.getElementById('aiAnalysisContent').classList.add('hidden');
    document.getElementById('aiAnalysisError').classList.add('hidden');
  }

  static displayAIAnalysis(analysis, recommendation, metadata = {}) {
    const container = document.getElementById('aiAnalysisContent');
    if (!container) return;

    // Determine recommendation class
    let recommendationClass = 'hold';
    let recommendationIcon = '⚖️';
    
    if (recommendation) {
      const rec = recommendation.toLowerCase();
      if (rec.includes('buy') || rec.includes('strong buy')) {
        recommendationClass = 'buy';
        recommendationIcon = '📈';
      } else if (rec.includes('sell') || rec.includes('strong sell')) {
        recommendationClass = 'sell';
        recommendationIcon = '📉';
      }
    }

    // Create agentic analysis badge if applicable
    let agenticBadge = '';
    if (metadata.isAgentic) {
      const toolsList = metadata.toolsUsed?.length > 0 ? metadata.toolsUsed.join(', ') : 'None';
      agenticBadge = `
        <div class="agentic-badge">
          🤖 Agentic AI Analysis 
          <span class="agentic-details">
            Tools Used: ${toolsList} | Iterations: ${metadata.iterations || 1}
          </span>
        </div>
      `;
    } else if (metadata.fallback) {
      agenticBadge = `
        <div class="fallback-badge">
          ⚠️ Fallback Analysis (${metadata.fallback_reason || 'Agentic AI unavailable'})
        </div>
      `;
    }

    container.innerHTML = `
      ${agenticBadge}
      <div class="ai-analysis-text">${analysis || 'AI analysis completed successfully.'}</div>
      <div class="ai-recommendation ${recommendationClass}">
        ${recommendationIcon} AI Recommendation: ${recommendation || 'HOLD - Maintain current position'}
      </div>
    `;

    document.getElementById('aiAnalysisLoading').classList.add('hidden');
    document.getElementById('aiAnalysisContent').classList.remove('hidden');
    document.getElementById('aiAnalysisError').classList.add('hidden');
  }

  static showAIAnalysisError() {
    document.getElementById('aiAnalysisLoading').classList.add('hidden');
    document.getElementById('aiAnalysisContent').classList.add('hidden');
    document.getElementById('aiAnalysisError').classList.remove('hidden');
  }

  // Implement quarterly data population methods directly
  static populateQuarterlyInsights(insights) {
    const container = document.getElementById('quarterlyInsights');
    if (!container || !insights) return;
    
    const insightsHtml = `
      <div class="insight-item">
        <span class="insight-label">Revenue Growth</span>
        <span class="insight-value insight-${insights.revenue_growth?.trend || 'neutral'}">${insights.revenue_growth?.trend || 'N/A'}</span>
      </div>
      <div class="insight-item">
        <span class="insight-label">Profitability</span>
        <span class="insight-value insight-${insights.profitability?.trend || 'neutral'}">${insights.profitability?.trend || 'N/A'}</span>
      </div>
      <div class="insight-item">
        <span class="insight-label">Cash Generation</span>
        <span class="insight-value insight-${insights.cash_generation?.trend || 'neutral'}">${insights.cash_generation?.trend || 'N/A'}</span>
      </div>
      <div class="insight-item">
        <span class="insight-label">Balance Sheet</span>
        <span class="insight-value insight-${insights.balance_sheet?.trend || 'neutral'}">${insights.balance_sheet?.trend || 'N/A'}</span>
      </div>
    `;
    
    container.innerHTML = insightsHtml;
  }

  static populateRevenueTable(revenueData) {
    const container = document.getElementById('revenueTable');
    if (!container || !revenueData || revenueData.length === 0) {
      container.innerHTML = '<p style="color: rgba(255,255,255,0.6); font-size: 10px;">No revenue data available</p>';
      return;
    }
    
    // Take first 4 quarters for display
    const quarters = revenueData.slice(0, 4);
    
    const tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            ${quarters.map(q => `<th>${this.formatPeriod(q.period)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="metric-name">Revenue</td>
            ${quarters.map(q => `<td class="quarter-data">${this.formatFinancialValue(q.revenue, 'currency')}</td>`).join('')}
          </tr>
          <tr>
            <td class="metric-name">Net Income</td>
            ${quarters.map(q => `<td class="quarter-data">${this.formatFinancialValue(q.net_income, 'currency')}</td>`).join('')}
          </tr>
          <tr>
            <td class="metric-name">EBITDA</td>
            ${quarters.map(q => `<td class="quarter-data">${this.formatFinancialValue(q.ebitda, 'currency')}</td>`).join('')}
          </tr>
          <tr>
            <td class="metric-name">Op. Income</td>
            ${quarters.map(q => `<td class="quarter-data">${this.formatFinancialValue(q.operating_income, 'currency')}</td>`).join('')}
          </tr>
        </tbody>
      </table>
    `;
    
    container.innerHTML = tableHtml;
  }

  static populateCashFlowTable(cashFlowData) {
    const container = document.getElementById('cashFlowTable');
    if (!container || !cashFlowData || cashFlowData.length === 0) {
      container.innerHTML = '<p style="color: rgba(255,255,255,0.6); font-size: 10px;">No cash flow data available</p>';
      return;
    }
    
    const quarters = cashFlowData.slice(0, 4);
    
    const tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            ${quarters.map(q => `<th>${this.formatPeriod(q.period)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="metric-name">Op. Cash Flow</td>
            ${quarters.map(q => `<td class="quarter-data">${this.formatFinancialValue(q.operating_cash_flow, 'currency')}</td>`).join('')}
          </tr>
          <tr>
            <td class="metric-name">Free Cash Flow</td>
            ${quarters.map(q => `<td class="quarter-data">${this.formatFinancialValue(q.free_cash_flow, 'currency')}</td>`).join('')}
          </tr>
          <tr>
            <td class="metric-name">CapEx</td>
            ${quarters.map(q => `<td class="quarter-data">${this.formatFinancialValue(q.capital_expenditures, 'currency')}</td>`).join('')}
          </tr>
        </tbody>
      </table>
    `;
    
    container.innerHTML = tableHtml;
  }

  static populateBalanceSheetTable(balanceSheetData) {
    const container = document.getElementById('balanceSheetTable');
    if (!container || !balanceSheetData || balanceSheetData.length === 0) {
      container.innerHTML = '<p style="color: rgba(255,255,255,0.6); font-size: 10px;">No balance sheet data available</p>';
      return;
    }
    
    const quarters = balanceSheetData.slice(0, 4);
    
    const tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            ${quarters.map(q => `<th>${this.formatPeriod(q.period)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="metric-name">Total Assets</td>
            ${quarters.map(q => `<td class="quarter-data">${this.formatFinancialValue(q.total_assets, 'currency')}</td>`).join('')}
          </tr>
          <tr>
            <td class="metric-name">Total Cash</td>
            ${quarters.map(q => `<td class="quarter-data">${this.formatFinancialValue(q.total_cash, 'currency')}</td>`).join('')}
          </tr>
          <tr>
            <td class="metric-name">Total Debt</td>
            ${quarters.map(q => `<td class="quarter-data">${this.formatFinancialValue(q.total_debt, 'currency')}</td>`).join('')}
          </tr>
          <tr>
            <td class="metric-name">Equity</td>
            ${quarters.map(q => `<td class="quarter-data">${this.formatFinancialValue(q.stockholder_equity, 'currency')}</td>`).join('')}
          </tr>
        </tbody>
      </table>
    `;
    
    container.innerHTML = tableHtml;
  }

  static populateGrowthAnalysis(insights) {
    const container = document.getElementById('growthMetrics');
    if (!container || !insights) return;
    
    const growthHtml = `
      <div class="growth-metric">
        <span class="growth-metric-label">Revenue Growth</span>
        <span class="growth-metric-value growth-${insights.revenue_growth?.trend || 'neutral'}">${insights.revenue_growth?.trend || 'N/A'}</span>
      </div>
      <div class="growth-metric">
        <span class="growth-metric-label">Margin Direction</span>
        <span class="growth-metric-value growth-${insights.profitability?.margin_direction || 'neutral'}">${insights.profitability?.margin_direction || 'N/A'}</span>
      </div>
      <div class="growth-metric">
        <span class="growth-metric-label">FCF Trend</span>
        <span class="growth-metric-value growth-${insights.cash_generation?.fcf_trend || 'neutral'}">${insights.cash_generation?.fcf_trend || 'N/A'}</span>
      </div>
      <div class="growth-metric">
        <span class="growth-metric-label">Debt Trend</span>
        <span class="growth-metric-value growth-${insights.balance_sheet?.debt_trend || 'neutral'}">${insights.balance_sheet?.debt_trend || 'N/A'}</span>
      </div>
    `;
    
    container.innerHTML = growthHtml;
  }

  // Helper methods for data formatting
  static formatPeriod(period) {
    if (!period) return 'N/A';
    const date = new Date(period);
    if (isNaN(date.getTime())) return period.substring(0, 7); // Return as-is if not a valid date
    return date.toISOString().substring(0, 7); // YYYY-MM format
  }

  static formatFinancialValue(value, type = 'currency') {
    if (value === null || value === undefined || isNaN(value)) {
      return '-';
    }

    const numValue = parseFloat(value);
    
    switch (type) {
      case 'currency':
        if (Math.abs(numValue) >= 1e12) {
          return `$${(numValue / 1e12).toFixed(1)}T`;
        } else if (Math.abs(numValue) >= 1e9) {
          return `$${(numValue / 1e9).toFixed(1)}B`;
        } else if (Math.abs(numValue) >= 1e6) {
          return `$${(numValue / 1e6).toFixed(1)}M`;
        } else if (Math.abs(numValue) >= 1e3) {
          return `$${(numValue / 1e3).toFixed(1)}K`;
        } else {
          return `$${numValue.toFixed(2)}`;
        }
      case 'percentage':
        return `${numValue.toFixed(2)}%`;
      case 'ratio':
        return numValue.toFixed(2);
      case 'number':
        if (Math.abs(numValue) >= 1e9) {
          return `${(numValue / 1e9).toFixed(1)}B`;
        } else if (Math.abs(numValue) >= 1e6) {
          return `${(numValue / 1e6).toFixed(1)}M`;
        } else if (Math.abs(numValue) >= 1e3) {
          return `${(numValue / 1e3).toFixed(1)}K`;
        }
        return value.toFixed(0);
      default:
        return value.toString();
    }
  }

  static showQuarterlyLoadingState() {
    document.getElementById('quarterlyLoading').classList.remove('hidden');
    document.getElementById('quarterlyContainer').classList.add('hidden');
    document.getElementById('quarterlyError').classList.add('hidden');
    document.getElementById('quarterlyInstructions').classList.add('hidden');
  }

  static hideQuarterlyLoadingState() {
    document.getElementById('quarterlyLoading').classList.add('hidden');
  }

  static showQuarterlyError(message) {
    document.getElementById('quarterlyError').classList.remove('hidden');
    document.getElementById('quarterlyContainer').classList.add('hidden');
    document.getElementById('quarterlyInstructions').classList.add('hidden');
    
    const errorElement = document.getElementById('quarterlyError').querySelector('p');
    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  static showQuarterlyInstructions() {
    console.log('ℹ️ Showing quarterly instructions');
    
    document.getElementById('quarterlyLoading').classList.add('hidden');
    document.getElementById('quarterlyContainer').classList.add('hidden');
    document.getElementById('quarterlyError').classList.add('hidden');
    document.getElementById('quarterlyInstructions').classList.remove('hidden');
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

      case 'quarterly':
        console.log(`📈 Quarterly trends tab activated for ${currentTicker || 'no ticker'}`);
        QuarterlyChartsUI.onQuarterlyTabActivated(currentTicker);
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
    } else if (this.currentTab === 'quarterly' && newTicker) {
      QuarterlyChartsUI.onQuarterlyTabActivated(newTicker);
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
