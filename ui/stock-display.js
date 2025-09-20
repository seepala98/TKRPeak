// Stock Display UI Module
// Handles displaying stock data and managing different UI states

export class StockDisplayUI {
  static showLoadingState() {
    console.log('⏳ Showing loading state');
    
    // Hide all sections
    this.hideAllSections();
    
    // Show loading section
    document.getElementById('loading').classList.remove('hidden');
  }

  static showAutoDetection(ticker) {
    console.log(`🎯 Showing auto-detection for ticker: ${ticker}`);
    
    // Hide all sections
    this.hideAllSections();
    
    // Show auto-detection section
    const autoSection = document.getElementById('autoDetection');
    autoSection.classList.remove('hidden');
    
    // Update the detected ticker display
    document.getElementById('detectedTicker').textContent = ticker;
  }

  static showManualInput() {
    console.log('✏️ Showing manual input');
    
    // Hide all sections
    this.hideAllSections();
    
    // Show manual input and instructions
    document.getElementById('manualInput').classList.remove('hidden');
    document.getElementById('instructions').classList.remove('hidden');
  }

  static showInstructions() {
    console.log('ℹ️ Showing instructions');
    
    // Hide all sections
    this.hideAllSections();
    
    // Show instructions section
    document.getElementById('instructions').classList.remove('hidden');
  }

  static showStockData(data, ticker) {
    console.log(`📊 Displaying stock data for ${ticker}`);
    
    // Hide all sections
    this.hideAllSections();
    
    // Show stock data sections
    document.getElementById('stockData').classList.remove('hidden');
    document.getElementById('geminiAiAnalysis').classList.remove('hidden');
    
    // Populate data
    this.populateStockData(data, ticker);
  }

  static showTickerSuggestions(suggestions) {
    const suggestionsDiv = document.getElementById('tickerSuggestions');
    const suggestionButtons = document.getElementById('suggestionButtons');
    suggestionButtons.innerHTML = ''; // Clear previous suggestions

    if (suggestions && suggestions.length > 0) {
      suggestions.forEach(suggestion => {
        const btn = document.createElement('button');
        btn.className = 'ticker-btn';
        btn.textContent = `${suggestion.symbol} (${suggestion.name})`;
        btn.onclick = () => {
          // Trigger stock data fetch for suggested ticker
          document.dispatchEvent(new CustomEvent('fetchStock', { 
            detail: { ticker: suggestion.symbol } 
          }));
        };
        suggestionButtons.appendChild(btn);
      });
      suggestionsDiv.classList.remove('hidden');
      
      // Hide other sections
      document.getElementById('stockData').classList.add('hidden');
      document.getElementById('geminiAiAnalysis').classList.add('hidden');
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('autoDetection').classList.add('hidden');
      document.getElementById('manualInput').classList.add('hidden');
      document.getElementById('instructions').classList.add('hidden');
    } else {
      suggestionsDiv.classList.add('hidden');
    }
  }

  static showError(message) {
    console.error(`❌ Showing error: ${message}`);
    
    // Hide all sections
    this.hideAllSections();
    
    // Show manual input with error
    this.showManualInput();
    
    // You could add a specific error display element here if needed
    console.log('Error displayed in console, manual input shown as fallback');
  }

  static hideAllSections() {
    const sections = [
      'loading', 
      'stockData', 
      'autoDetection', 
      'manualInput', 
      'instructions',
      'geminiAiAnalysis',
      'tickerSuggestions'
    ];
    
    sections.forEach(sectionId => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.classList.add('hidden');
      }
    });
  }

  static populateStockData(data, ticker) {
    console.log(`📈 Populating stock data for ${ticker}:`, data);

    // Update basic info
    document.getElementById('stockSymbol').textContent = data.symbol || ticker;
    document.getElementById('stockPrice').textContent = `$${(data.currentPrice || 0).toFixed(2)}`;
    
    // Determine which metrics to show based on period
    const period = data.period || '1d';
    const isIntraday = period === '1d';
    
    // Update subtitle to show period
    const subtitleMap = {
      '1d': '1-Day View',
      '5d': '5-Day View', 
      '1mo': '1-Month View',
      '6mo': '6-Month View',
      '1y': '1-Year View'
    };
    document.getElementById('subtitle').textContent = subtitleMap[period] || 'Stock Overview';

    // Use period-specific data if available, fall back to day data
    const changeValue = data.periodChange !== undefined ? data.periodChange : data.dayChange;
    const changePercent = data.periodChangePercent !== undefined ? data.periodChangePercent : data.dayChangePercent;
    const highValue = data.periodHigh !== undefined ? data.periodHigh : data.dayHigh;
    const lowValue = data.periodLow !== undefined ? data.periodLow : data.dayLow;

    // Update change with color
    const changeElement = document.getElementById('stockChange');
    const changeColor = changeValue >= 0 ? '#4caf50' : '#f44336';
    const changeSign = changeValue >= 0 ? '+' : '';
    changeElement.textContent = `${changeSign}$${(changeValue || 0).toFixed(2)} (${changeSign}${(changePercent || 0).toFixed(2)}%)`;
    changeElement.style.color = changeColor;

    // Update labels based on period
    const highLabel = document.querySelector('.detail-row:nth-child(1) .label');
    const lowLabel = document.querySelector('.detail-row:nth-child(2) .label');
    
    if (isIntraday) {
      highLabel.textContent = 'Day High:';
      lowLabel.textContent = 'Day Low:';
    } else {
      highLabel.textContent = 'Period High:';
      lowLabel.textContent = 'Period Low:';
    }

    // Update high/low values
    document.querySelector('.detail-row:nth-child(1) .value').textContent = `$${(highValue || 0).toFixed(2)}`;
    document.querySelector('.detail-row:nth-child(2) .value').textContent = `$${(lowValue || 0).toFixed(2)}`;

    // Update market cap
    const marketCapElement = document.querySelector('.detail-row:nth-child(3) .value');
    if (data.marketCap) {
      const marketCapInB = data.marketCap / 1000000000;
      marketCapElement.textContent = `$${marketCapInB.toFixed(1)}B`;
    } else {
      marketCapElement.textContent = 'N/A';
    }

    // Update links
    document.getElementById('yahooLink').href = `https://finance.yahoo.com/quote/${ticker}`;
    document.getElementById('googleLink').href = `https://www.google.com/finance/quote/${ticker}`;
  }
}
