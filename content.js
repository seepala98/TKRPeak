// Content script for Stock Information Chrome Extension

// Global variables
let stockPopup = null;
let isPopupVisible = false;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showStockPopup") {
    showStockPopup(request.data, request.ticker);
    sendResponse({ success: true });
  } else if (request.action === "showError") {
    showErrorPopup(request.message);
    sendResponse({ success: true });
  }
});

// Create and show stock popup
function showStockPopup(stockData, ticker) {
  removeExistingPopup();
  
  const popup = createPopupElement(stockData, ticker);
  document.body.appendChild(popup);
  stockPopup = popup;
  isPopupVisible = true;
  
  // Position popup near the cursor or selection
  positionPopup(popup);
  
  // Show popup with animation
  setTimeout(() => {
    popup.style.opacity = '1';
    popup.style.transform = 'translateY(0)';
  }, 10);
  
  // Auto-hide after 10 seconds
  setTimeout(() => {
    if (isPopupVisible) {
      hidePopup();
    }
  }, 10000);
}

// Create popup element
function createPopupElement(stockData, ticker) {
  const popup = document.createElement('div');
  popup.className = 'stock-info-popup';
  popup.id = 'stockInfoPopup';
  
  // Create chart if data available
  const chartHtml = stockData.chartData ? createMiniChart(stockData.chartData) : '';
  
  // Format numbers
  const formatPrice = (price) => price?.toFixed(2) || 'N/A';
  const formatChange = (change) => change?.toFixed(2) || 'N/A';
  const formatPercent = (percent) => percent?.toFixed(2) || 'N/A';
  const formatMarketCap = (cap) => {
    if (!cap) return 'N/A';
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap.toFixed(0)}`;
  };
  
  // Determine change color
  const changeColor = stockData.dayChange >= 0 ? '#22c55e' : '#ef4444';
  const changeSymbol = stockData.dayChange >= 0 ? '+' : '';
  
  popup.innerHTML = `
    <div class="stock-popup-header">
      <div class="stock-symbol">${ticker}</div>
      <button class="close-btn" onclick="this.closest('.stock-info-popup').remove()">×</button>
    </div>
    
    <div class="stock-popup-content">
      <div class="price-section">
        <div class="current-price">${stockData.currency || 'USD'} ${formatPrice(stockData.currentPrice)}</div>
        <div class="price-change" style="color: ${changeColor}">
          ${changeSymbol}${formatChange(stockData.dayChange)} (${changeSymbol}${formatPercent(stockData.dayChangePercent)}%)
        </div>
      </div>
      
      <div class="stock-details">
        <div class="detail-row">
          <span class="label">Day High:</span>
          <span class="value">${formatPrice(stockData.dayHigh)}</span>
        </div>
        <div class="detail-row">
          <span class="label">Day Low:</span>
          <span class="value">${formatPrice(stockData.dayLow)}</span>
        </div>
        <div class="detail-row">
          <span class="label">Market Cap:</span>
          <span class="value">${formatMarketCap(stockData.marketCap)}</span>
        </div>
      </div>
      
      ${chartHtml}
      
      <div class="external-links">
        <a href="https://finance.yahoo.com/quote/${ticker}" target="_blank" class="link-btn yahoo-link">
          <span class="link-icon">📈</span>
          Yahoo Finance
        </a>
        <a href="https://www.google.com/finance/quote/${ticker}" target="_blank" class="link-btn google-link">
          <span class="link-icon">🔍</span>
          Google Finance
        </a>
      </div>
    </div>
  `;
  
  return popup;
}

// Create mini chart (simplified version)
function createMiniChart(chartData) {
  if (!chartData || !chartData.prices || chartData.prices.length === 0) {
    return '<div class="chart-placeholder">Chart data not available</div>';
  }
  
  // Take last 50 data points for mini chart
  const prices = chartData.prices.slice(-50).filter(p => p != null);
  if (prices.length === 0) return '<div class="chart-placeholder">No chart data</div>';
  
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;
  
  if (range === 0) return '<div class="chart-placeholder">Insufficient price variation</div>';
  
  // Create SVG points for a simple line chart
  const width = 280;
  const height = 80;
  const padding = 5;
  
  const points = prices.map((price, index) => {
    const x = padding + (index / (prices.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((price - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');
  
  // Determine chart color based on first vs last price
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const chartColor = lastPrice >= firstPrice ? '#22c55e' : '#ef4444';
  
  return `
    <div class="mini-chart">
      <div class="chart-title">Price Trend</div>
      <svg width="280" height="80" viewBox="0 0 280 80">
        <polyline
          fill="none"
          stroke="${chartColor}"
          stroke-width="2"
          points="${points}"
        />
        <circle cx="${points.split(' ').pop().split(',')[0]}" cy="${points.split(' ').pop().split(',')[1]}" r="3" fill="${chartColor}" />
      </svg>
    </div>
  `;
}

// Show error popup
function showErrorPopup(message) {
  removeExistingPopup();
  
  const popup = document.createElement('div');
  popup.className = 'stock-info-popup error-popup';
  popup.innerHTML = `
    <div class="stock-popup-header">
      <div class="error-title">Error</div>
      <button class="close-btn" onclick="this.closest('.stock-info-popup').remove()">×</button>
    </div>
    <div class="stock-popup-content">
      <div class="error-message">${message}</div>
    </div>
  `;
  
  document.body.appendChild(popup);
  stockPopup = popup;
  isPopupVisible = true;
  
  positionPopup(popup);
  
  // Show popup with animation
  setTimeout(() => {
    popup.style.opacity = '1';
    popup.style.transform = 'translateY(0)';
  }, 10);
  
  // Auto-hide error after 5 seconds
  setTimeout(() => {
    if (isPopupVisible && popup.classList.contains('error-popup')) {
      hidePopup();
    }
  }, 5000);
}

// Position popup near selection or mouse
function positionPopup(popup) {
  const selection = window.getSelection();
  let top = 100;
  let left = 100;
  
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    top = rect.bottom + window.scrollY + 10;
    left = rect.left + window.scrollX;
    
    // Ensure popup stays within viewport
    const popupRect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Adjust horizontal position
    if (left + popupRect.width > viewportWidth) {
      left = viewportWidth - popupRect.width - 20;
    }
    if (left < 10) left = 10;
    
    // Adjust vertical position
    if (top + popupRect.height > viewportHeight + window.scrollY) {
      top = rect.top + window.scrollY - popupRect.height - 10;
    }
  }
  
  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;
}

// Remove existing popup
function removeExistingPopup() {
  const existingPopup = document.getElementById('stockInfoPopup');
  if (existingPopup) {
    existingPopup.remove();
  }
  stockPopup = null;
  isPopupVisible = false;
}

// Hide popup with animation
function hidePopup() {
  if (stockPopup) {
    stockPopup.style.opacity = '0';
    stockPopup.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      if (stockPopup) {
        stockPopup.remove();
        stockPopup = null;
        isPopupVisible = false;
      }
    }, 300);
  }
}

// Close popup when clicking outside
document.addEventListener('click', (event) => {
  if (isPopupVisible && stockPopup && !stockPopup.contains(event.target)) {
    hidePopup();
  }
});

// Close popup with Escape key
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isPopupVisible) {
    hidePopup();
  }
});

console.log('Stock Information Extension content script loaded');
