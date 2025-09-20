// Compiled Background Script - All modules combined for compatibility
// This ensures the context menu and all functionality works

console.log('🚀 Background script starting...');

// ===== TICKER UTILITIES =====
class TickerUtils {
  static extractTicker(text) {
    // Clean the text
    const cleanText = text.trim().toUpperCase();
    
    // Allow for tickers with suffixes like .TO
    const tickerMatch = cleanText.match(/\b([A-Z]{1,6}(\.[A-Z]{2})?)\b/);
    if (tickerMatch) {
      return tickerMatch[0];
    }
    
    // Common company name to ticker mapping
    const companyMap = {
      'APPLE': 'AAPL', 'APPLE INC': 'AAPL',
      'MICROSOFT': 'MSFT', 'MICROSOFT CORP': 'MSFT', 'MICROSOFT CORPORATION': 'MSFT',
      'AMAZON': 'AMZN', 'AMAZON.COM': 'AMZN',
      'GOOGLE': 'GOOGL', 'ALPHABET': 'GOOGL',
      'TESLA': 'TSLA', 'TESLA INC': 'TSLA', 'TESLA MOTORS': 'TSLA',
      'FACEBOOK': 'META', 'META': 'META', 'META PLATFORMS': 'META',
      'NVIDIA': 'NVDA', 'NVIDIA CORP': 'NVDA', 'NVIDIA CORPORATION': 'NVDA',
      'NETFLIX': 'NFLX', 'NETFLIX INC': 'NFLX',
      'PAYPAL': 'PYPL', 'PAYPAL HOLDINGS': 'PYPL',
      'ADOBE': 'ADBE', 'ADOBE INC': 'ADBE',
      'INTEL': 'INTC', 'INTEL CORP': 'INTC', 'INTEL CORPORATION': 'INTC',
      'CISCO': 'CSCO', 'CISCO SYSTEMS': 'CSCO',
      'ORACLE': 'ORCL', 'ORACLE CORP': 'ORCL', 'ORACLE CORPORATION': 'ORCL',
      'SALESFORCE': 'CRM', 'SALESFORCE.COM': 'CRM',
      'IBM': 'IBM', 'INTERNATIONAL BUSINESS MACHINES': 'IBM',
      'WALMART': 'WMT', 'WAL-MART': 'WMT',
      'JOHNSON & JOHNSON': 'JNJ', 'J&J': 'JNJ',
      'BERKSHIRE HATHAWAY': 'BRK.B', 'BERKSHIRE': 'BRK.B',
      'JPMORGAN': 'JPM', 'JP MORGAN': 'JPM', 'JPMORGAN CHASE': 'JPM',
      'VISA': 'V', 'MASTERCARD': 'MA',
      'PROCTER & GAMBLE': 'PG', 'P&G': 'PG',
      'COCA-COLA': 'KO', 'COCA COLA': 'KO',
      'PEPSI': 'PEP', 'PEPSICO': 'PEP',
      'DISNEY': 'DIS', 'WALT DISNEY': 'DIS',
      'MCDONALD\'S': 'MCD', 'MCDONALDS': 'MCD',
      'NIKE': 'NKE', 'HOME DEPOT': 'HD',
      'VERIZON': 'VZ', 'AT&T': 'T',
      'CHEVRON': 'CVX', 'EXXON': 'XOM', 'EXXON MOBIL': 'XOM',
      'PALANTIR': 'PLTR', 'PALANTIR TECHNOLOGIES': 'PLTR',
      'IONQ': 'IONQ', 'CENTURYLINK': 'CENX'
    };
    
    // Try company name mapping
    const mappedTicker = companyMap[cleanText];
    if (mappedTicker) {
      return mappedTicker;
    }
    
    // If no exact match, try partial matching for company names
    for (const [company, ticker] of Object.entries(companyMap)) {
      if (cleanText.includes(company) || company.includes(cleanText)) {
        return ticker;
      }
    }
    
    return null;
  }
}

// ===== YAHOO FINANCE API =====
class YahooFinanceAPI {
  static getIntervalForPeriod(period) {
    const intervalMap = {
      '1d': '5m', '5d': '15m', '1mo': '1d', '6mo': '1d', '1y': '1wk'
    };
    return intervalMap[period] || '1d';
  }

  static async fetchStockData(ticker, period = '1d') {
    console.log(`🔄 Yahoo Finance API: Starting fetch for ${ticker} (${period})`);
    
    try {
      const range = period;
      const interval = this.getIntervalForPeriod(period);
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=${interval}&includePrePost=true&events=div%7Csplit`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Yahoo API HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const result = data.chart.result[0];
      const meta = result.meta;
      const currentPrice = meta.regularMarketPrice;
      
      // Get chart data points
      const timestamps = result.timestamp;
      const prices = result.indicators.quote[0].close;
      const chartData = timestamps?.map((time, i) => ({
        time: time * 1000,
        price: prices[i]
      })).filter(point => point.price !== null) || [];

      // Calculate period-specific metrics
      let periodHigh = currentPrice;
      let periodLow = currentPrice;
      let periodStart = currentPrice;
      let periodEnd = currentPrice;

      if (chartData.length > 0) {
        const validPrices = chartData.map(d => d.price).filter(p => p !== null && p !== undefined);
        if (validPrices.length > 0) {
          periodHigh = Math.max(...validPrices);
          periodLow = Math.min(...validPrices);
          periodStart = validPrices[0];
          periodEnd = validPrices[validPrices.length - 1];
        }
      }

      const periodChange = periodEnd - periodStart;
      const periodChangePercent = periodStart > 0 ? (periodChange / periodStart) * 100 : 0;

      return {
        symbol: ticker,
        currentPrice: currentPrice,
        previousClose: meta.previousClose || periodStart,
        dayChange: periodChange,
        dayChangePercent: periodChangePercent,
        dayHigh: periodHigh,
        dayLow: periodLow,
        marketCap: meta.marketCap,
        currency: meta.currency || 'USD',
        chartData: chartData,
        period: period,
        periodStart: periodStart,
        periodHigh: periodHigh,
        periodLow: periodLow,
        periodChange: periodChange,
        periodChangePercent: periodChangePercent
      };

    } catch (error) {
      console.error('Yahoo Finance API: Fetch failed:', error);
      throw error;
    }
  }

  static async getTickerSuggestions(query) {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${query}`;
    try {
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = await response.json();
      return data.quotes.slice(0, 3).map(q => ({ 
        symbol: q.symbol, 
        name: q.shortname || q.longname || q.symbol 
      }));
    } catch (error) {
      console.error("Yahoo Finance API: Failed to fetch ticker suggestions:", error);
      return [];
    }
  }
}

// ===== MAIN BACKGROUND SCRIPT =====
let selectedTicker = null;
let selectedStockData = null;

// Create context menu - remove first if it exists
chrome.contextMenus.removeAll(() => {
  chrome.contextMenus.create({
    id: "stockInfo",
    title: "📊 Get Stock Information",
    contexts: ["selection"]
  });
  console.log("✅ Context menu created");
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log("🖱️ Context menu clicked:", info);

  if (info.menuItemId === "stockInfo" && info.selectionText) {
    try {
      const ticker = TickerUtils.extractTicker(info.selectionText);
      console.log(`📝 Selected text: ${info.selectionText}`);
      console.log(`🎯 Extracted ticker: ${ticker}`);

      if (!ticker) {
        console.warn("❌ No valid ticker found in selected text");
        return;
      }

      selectedTicker = ticker;
      console.log(`💾 Stored ticker for extension popup: ${ticker}`);

      console.log("🔄 Fetching stock data for extension popup...");
      selectedStockData = await YahooFinanceAPI.fetchStockData(ticker, '1d');
      console.log(`✅ Stock data stored for extension popup:`, selectedStockData);

      // Update extension badge
      chrome.action.setBadgeText({ text: ticker, tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({color: '#4285f4'});

      // Try to open popup automatically
      try {
        await chrome.action.openPopup();
        console.log("✅ Extension popup opened automatically");
      } catch (popupError) {
        console.log("ℹ️ Could not open popup automatically:", popupError.message);
        
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
      selectedStockData = null;
    }
  }
});

// Handle messages - Fixed async handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("📨 Background script received message:", request);
  
  // Handle async operations properly
  const handleMessage = async () => {
    try {
      let result;
      
      switch (request.action) {
        case "ping":
          console.log("🏓 Background script ping received");
          result = { success: true, message: "Background script is alive", timestamp: Date.now() };
          break;

        case "getStoredStockData":
          console.log("🎯 Popup requesting stored stock data");
          console.log("📦 Current stored ticker:", selectedTicker);
          console.log("📦 Current stored data:", selectedStockData ? 'Available' : 'None');
          if (selectedTicker && selectedStockData) {
            result = { success: true, ticker: selectedTicker, data: selectedStockData };
            console.log("✅ Sending stored data to popup");
          } else {
            result = { success: false, message: "No stock data available. Select a ticker first." };
            console.log("ℹ️ No stored data available");
          }
          break;

        case "clearStoredData":
          console.log("🧹 Clearing stored stock data");
          selectedTicker = null;
          selectedStockData = null;
          chrome.action.setBadgeText({text: ''});
          result = { success: true, message: "Data cleared" };
          console.log("✅ Data cleared successfully");
          break;

        case "fetchStockDataBackground":
          console.log(`🎯 Background script received API request for: ${request.ticker} (${request.period || '1d'})`);
          
          try {
            console.log(`🔄 Starting API fetch for ${request.ticker}...`);
            const stockData = await YahooFinanceAPI.fetchStockData(request.ticker, request.period || '1d');
            console.log(`✅ API fetch successful for ${request.ticker}:`, {
              symbol: stockData.symbol,
              period: stockData.period,
              currentPrice: stockData.currentPrice,
              chartDataLength: stockData.chartData?.length
            });
            result = { success: true, data: stockData };
            
          } catch (error) {
            console.log(`📊 Primary API call failed for ${request.ticker}:`, error.message);
            console.log(`🔄 Trying suggestions for ${request.ticker}...`);
            
            try {
              const suggestions = await YahooFinanceAPI.getTickerSuggestions(request.ticker);
              if (suggestions.length > 0) {
                console.log(`💡 Found ${suggestions.length} suggestions for: ${request.ticker}`);
                result = { success: true, data: { suggestions: suggestions } };
              } else {
                console.log(`❌ No suggestions found for: ${request.ticker}`);
                result = { success: false, error: `No data found for "${request.ticker}". Try a different ticker symbol.`, errorType: 'TickerNotFound' };
              }
            } catch (suggestionError) {
              console.error(`❌ Suggestions also failed for ${request.ticker}:`, suggestionError);
              result = { success: false, error: error.message || 'Failed to fetch stock data', errorType: error.name };
            }
          }
          break;

        case "fetchQuarterlyTrends":
          console.log(`📈 Background script received quarterly trends request for: ${request.ticker}`);
          
          try {
            console.log(`🔄 Starting quarterly trends fetch for ${request.ticker}...`);
            
            const response = await fetch(`http://localhost:8000/quarterly-trends/${request.ticker}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              }
            });
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const quarterlyTrends = await response.json();
            console.log(`✅ Quarterly trends successful for ${request.ticker}:`, {
              symbol: quarterlyTrends.symbol,
              quartersAnalyzed: quarterlyTrends.quarters_analyzed || 0,
              hasRevenueTrends: !!quarterlyTrends.trends?.revenue_trends,
              hasCashFlowTrends: !!quarterlyTrends.trends?.cash_flow_trends,
              hasInsights: !!quarterlyTrends.insights
            });
            
            result = { success: true, data: quarterlyTrends };
          } catch (error) {
            console.error(`❌ Quarterly trends fetch failed for ${request.ticker}:`, error);
            result = { 
              success: false, 
              error: error.message || 'Failed to fetch quarterly trends',
              errorType: 'QuarterlyTrendsError'
            };
          }
          break;

        case "analyzeQuarterlyData":
          console.log(`🤖 Background script received AI analysis request for: ${request.ticker}`);
          
          try {
            // Get Gemini API key from storage
            const storageResult = await new Promise(resolve => {
              chrome.storage.sync.get(['geminiApiKey'], resolve);
            });
            
            if (!storageResult.geminiApiKey) {
              throw new Error("Gemini API Key not configured. Please set it in extension options.");
            }

            console.log(`🔄 Starting AI analysis for ${request.ticker}...`);
            
            // Create comprehensive prompt for Gemini
            const prompt = await createQuarterlyAnalysisPrompt(request.data, request.ticker);
            
            const analysisResult = await callGeminiAPI(prompt, storageResult.geminiApiKey);
            
            console.log(`✅ AI analysis successful for ${request.ticker}`);
            
            result = { 
              success: true, 
              analysis: analysisResult.analysis,
              recommendation: analysisResult.recommendation
            };
            
          } catch (error) {
            console.error(`❌ AI analysis failed for ${request.ticker}:`, error);
            result = { 
              success: false, 
              error: error.message || 'Failed to analyze quarterly data',
              errorType: 'AIAnalysisError'
            };
          }
          break;

        case "fetchAdvancedStockData":
          console.log(`🎯 Background script received advanced data request for: ${request.ticker}`);
          
          try {
            console.log(`🔄 Starting advanced API fetch for ${request.ticker}...`);
            
            // First try the FastAPI service
            try {
              console.log(`🐍 Trying FastAPI service for ${request.ticker}...`);
              const fastApiData = await FinancialAPIService.fetchAdvancedData(request.ticker);
              console.log(`✅ FastAPI service successful for ${request.ticker}:`, {
                symbol: fastApiData.symbol,
                hasFinancialData: !!fastApiData.total_revenue,
                hasRatios: !!fastApiData.pe_ratio,
                quarterlyCount: fastApiData.quarterly_revenue?.length || 0
              });
              result = { success: true, data: fastApiData };
            } catch (fastApiError) {
              console.log(`⚠️ FastAPI service failed for ${request.ticker}: ${fastApiError.message}`);
              console.log(`🔄 Falling back to limited Yahoo Finance API...`);
              
              // Fallback to limited Yahoo Finance API
              const advancedData = await YahooFinanceAdvancedAPI.fetchAdvancedData(request.ticker);
              console.log(`✅ Fallback API successful for ${request.ticker}:`, {
                symbol: advancedData.symbol,
                hasOverview: !!advancedData.overview,
                hasPerformance: !!advancedData.performance,
                hasRatios: !!advancedData.ratios,
                quarterlyCount: advancedData.quarterly?.length || 0
              });
              result = { success: true, data: advancedData };
            }
            
          } catch (error) {
            console.error(`❌ All advanced API attempts failed for ${request.ticker}:`, error);
            result = { success: false, error: error.message || 'Failed to fetch advanced financial data' };
          }
          break;

        default:
          console.log(`❓ Unknown action received: ${request.action}`);
          result = { success: false, error: "Unknown action: " + request.action };
      }
      
      console.log(`📤 Sending response for ${request.action}:`, result.success ? 'SUCCESS' : `ERROR: ${result.error}`);
      sendResponse(result);
      
    } catch (error) {
      console.error("❌ Error handling message:", error);
      console.error("❌ Error details:", { name: error.name, message: error.message, stack: error.stack });
      sendResponse({ success: false, error: error.message || 'Unknown error in background script' });
    }
  };
  
  // Execute async handler
  handleMessage();
  
  // Return true to indicate we will respond asynchronously
  return true;
});

// ===== FINANCIAL API SERVICE =====
class FinancialAPIService {
  static API_BASE_URL = 'http://localhost:8000';
  
  static async fetchAdvancedData(ticker) {
    console.log(`🐍 FastAPI: Starting comprehensive fetch for ${ticker}`);
    
    try {
      const url = `${this.API_BASE_URL}/financial/${ticker}?include_quarterly=true`;
      console.log(`🌐 FastAPI: Calling ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Stock symbol ${ticker} not found`);
        }
        throw new Error(`FastAPI HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ FastAPI: Successfully fetched data for ${ticker}`);
      
      // Transform FastAPI response to extension format
      return this.transformFastAPIData(data);
      
    } catch (error) {
      console.error(`❌ FastAPI: Error fetching data for ${ticker}:`, error);
      throw error;
    }
  }
  
  static transformFastAPIData(data) {
    // Transform FastAPI response format to match extension expectations
    const transformedData = {
      symbol: data.symbol,
      
      // Overview section
      overview: {
        marketCap: data.market_cap,
        enterpriseValue: data.enterprise_value,
        sharesOutstanding: data.shares_outstanding,
        ytdReturn: data.ytd_return
      },
      
      // Performance section  
      performance: {
        totalRevenue: data.total_revenue,
        ebitda: data.ebitda,
        netIncome: data.net_income,
        freeCashFlow: data.free_cash_flow,
        eps: data.eps_ttm,
        operatingExpenses: null // Not directly available
      },
      
      // Balance sheet section
      balanceSheet: {
        totalCash: data.total_cash,
        totalDebt: data.total_debt,
        netDebt: data.net_debt,
        bookValue: data.book_value
      },
      
      // Ratios section
      ratios: {
        peRatio: data.pe_ratio,
        pbRatio: data.pb_ratio,
        evRevenue: data.ev_revenue,
        evEbitda: data.ev_ebitda,
        roe: data.roe,
        roa: data.roa
      },
      
      // Quarterly data
      quarterly: this.transformQuarterlyData(data.quarterly_revenue, data.quarterly_cash_flow),
      
      // Company info
      companyInfo: {
        name: data.company_name,
        currency: data.currency,
        exchange: data.exchange
      },
      
      // API status
      apiStatus: {
        dataSource: 'fastapi',
        availableDataLevel: 'comprehensive',
        fastApiStatus: 'success',
        yfinanceStatus: data.api_status?.yfinance || 'success'
      },
      
      // Additional metrics available from FastAPI
      additionalMetrics: {
        forwardPE: data.forward_pe,
        psRatio: data.ps_ratio,
        pegRatio: data.peg_ratio,
        beta: data.beta,
        dividendYield: data.dividend_yield,
        grossMargin: data.gross_margin,
        operatingMargin: data.operating_margin,
        netMargin: data.net_margin,
        currentPrice: data.current_price,
        fiftyTwoWeekHigh: data.fifty_two_week_high,
        fiftyTwoWeekLow: data.fifty_two_week_low
      }
    };
    
    console.log(`🔄 FastAPI: Transformed data for ${data.symbol}`);
    return transformedData;
  }
  
  static transformQuarterlyData(revenueData, cashFlowData) {
    if (!revenueData || revenueData.length === 0) {
      return [];
    }
    
    const quarters = [];
    for (let i = 0; i < Math.min(4, revenueData.length); i++) {
      const revenueQ = revenueData[i];
      const cashFlowQ = cashFlowData && cashFlowData[i] || {};
      
      quarters.push({
        period: revenueQ.period || `Q${i + 1}`,
        revenue: revenueQ.revenue,
        netIncome: revenueQ.net_income,
        eps: null, // Would need additional data
        freeCashFlow: cashFlowQ.free_cash_flow || null,
        operatingCashFlow: cashFlowQ.operating_cash_flow || null
      });
    }
    
    return quarters;
  }
  
  static async testConnection() {
    try {
      const response = await fetch(`${this.API_BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      console.log(`⚠️ FastAPI service not available: ${error.message}`);
      return false;
    }
  }
}

// ===== YAHOO FINANCE ADVANCED API =====
class YahooFinanceAdvancedAPI {
  
  static async fetchAdvancedData(ticker) {
    console.log(`🔄 Advanced API: Starting comprehensive fetch for ${ticker}`);
    
    try {
      // Use the working v8 API for basic data and try v7 for additional metrics
      const [basicData, extendedData] = await Promise.all([
        this.fetchBasicFinancialData(ticker),
        this.fetchExtendedFinancialData(ticker)
      ]);

      console.log(`✅ Advanced API: Data fetched successfully for ${ticker}`);
      return this.combineFinancialData(ticker, basicData, extendedData);

    } catch (error) {
      console.error(`❌ Advanced API: Error fetching data for ${ticker}:`, error);
      throw error;
    }
  }

  static async fetchBasicFinancialData(ticker) {
    try {
      // Use the working v8 chart API to get basic financial info
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1y&interval=1d&includePrePost=true&events=div%2Csplit`;
      const response = await this.makeRequest(url);
      
      const result = response.chart?.result?.[0];
      if (!result) return {};
      
      const meta = result.meta || {};
      console.log(`📊 Basic financial data retrieved for ${ticker}`);
      console.log(`🔍 Available meta fields for ${ticker}:`, Object.keys(meta));
      console.log(`📋 Full meta object for ${ticker}:`, meta);
      
      return {
        symbol: meta.symbol,
        currency: meta.currency,
        exchangeName: meta.exchangeName,
        instrumentType: meta.instrumentType,
        firstTradeDate: meta.firstTradeDate,
        regularMarketTime: meta.regularMarketTime,
        gmtoffset: meta.gmtoffset,
        timezone: meta.timezone,
        exchangeTimezoneName: meta.exchangeTimezoneName,
        currentTradingPeriod: meta.currentTradingPeriod,
        dataGranularity: meta.dataGranularity,
        range: meta.range,
        validRanges: meta.validRanges,
        
        // Price data
        currentPrice: meta.regularMarketPrice,
        previousClose: meta.previousClose,
        dayHigh: meta.regularMarketDayHigh,
        dayLow: meta.regularMarketDayLow,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
        
        // Additional meta fields - extracted from available v8 data
        longName: meta.longName,
        shortName: meta.shortName,
        volume: meta.regularMarketVolume,
        
        // Chart data for additional calculations
        chartData: this.processChartData(result.timestamp, result.indicators?.quote?.[0])
      };
    } catch (error) {
      console.warn(`⚠️ Basic financial data fetch failed for ${ticker}:`, error.message);
      return {};
    }
  }

  static async fetchExtendedFinancialData(ticker) {
    // Try multiple endpoints as fallbacks
    const endpoints = [
      {
        name: 'v7 quote',
        url: `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`,
        extractor: (data) => data.quoteResponse?.result?.[0]
      },
      {
        name: 'v6 quote',
        url: `https://query1.finance.yahoo.com/v6/finance/quote?symbols=${ticker}`,
        extractor: (data) => data.quoteResponse?.result?.[0]
      },
      {
        name: 'v1 search',
        url: `https://query1.finance.yahoo.com/v1/finance/lookup?search=${ticker}`,
        extractor: (data) => data.finance?.result?.[0]
      }
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Trying ${endpoint.name} API for ${ticker}: ${endpoint.url}`);
        const response = await this.makeRequest(endpoint.url);
        const result = endpoint.extractor(response);
        
        if (result && Object.keys(result).length > 0) {
          console.log(`✅ ${endpoint.name} API succeeded for ${ticker}`);
          console.log(`📈 Available fields from ${endpoint.name}:`, Object.keys(result));
          console.log(`📋 Full ${endpoint.name} data for ${ticker}:`, result);
          return result;
        }
      } catch (error) {
        console.warn(`⚠️ ${endpoint.name} API failed for ${ticker}: ${error.message}`);
      }
    }

    console.warn(`❌ All extended financial data endpoints failed for ${ticker}`);
    return {};
  }

  static processChartData(timestamps, quoteData) {
    if (!timestamps || !quoteData) return [];
    
    const chartData = [];
    for (let i = 0; i < timestamps.length; i++) {
      const price = quoteData.close?.[i];
      if (price !== null && price !== undefined) {
        chartData.push({
          timestamp: timestamps[i],
          price: price,
          high: quoteData.high?.[i],
          low: quoteData.low?.[i],
          volume: quoteData.volume?.[i]
        });
      }
    }
    return chartData;
  }

  static async makeRequest(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  static combineFinancialData(ticker, basicData, extendedData) {
    try {
      console.log(`🔄 Combining financial data for ${ticker}`, { 
        hasBasicData: !!basicData, 
        hasExtendedData: !!extendedData,
        basicSymbol: basicData.symbol,
        extendedSymbol: extendedData.symbol
      });

      // Work with available v8 API data - calculate metrics from price data
      const yearlyPriceData = this.calculateYearlyMetrics(basicData.chartData);
      const priceMetrics = this.calculatePriceMetrics(basicData);
      
      // Since extended APIs are failing, work with v8 price data only
      const hasExtendedData = extendedData && Object.keys(extendedData).length > 0;

      return {
        symbol: ticker,
        overview: {
          // Only basic info available from v8 API
          marketCap: null, // Not available in v8 chart API
          enterpriseValue: null, // Not available in v8 chart API  
          sharesOutstanding: null, // Not available in v8 chart API
          ytdReturn: yearlyPriceData.ytdReturn
        },
        performance: {
          // Financial performance data not available from v8 chart API
          totalRevenue: hasExtendedData ? extendedData.totalRevenue : null,
          ebitda: hasExtendedData ? extendedData.ebitda : null,
          netIncome: hasExtendedData ? extendedData.netIncome : null,
          freeCashFlow: hasExtendedData ? extendedData.freeCashFlow : null,
          eps: hasExtendedData ? (extendedData.epsTrailingTwelveMonths || extendedData.trailingEps || extendedData.eps) : null,
          operatingExpenses: hasExtendedData ? extendedData.operatingExpenses : null
        },
        balanceSheet: {
          // Balance sheet data not available from v8 chart API
          totalCash: hasExtendedData ? extendedData.totalCash : null,
          totalDebt: hasExtendedData ? extendedData.totalDebt : null,
          netDebt: hasExtendedData ? this.calculateNetDebt(extendedData.totalDebt, extendedData.totalCash) : null,
          bookValue: hasExtendedData ? extendedData.bookValue : null
        },
        ratios: {
          // Ratio data not available from v8 chart API
          peRatio: hasExtendedData ? (extendedData.trailingPE || extendedData.peRatio) : null,
          pbRatio: hasExtendedData ? extendedData.priceToBook : null,
          evRevenue: hasExtendedData ? this.calculateRatio(extendedData.enterpriseValue, extendedData.totalRevenue) : null,
          evEbitda: hasExtendedData ? this.calculateRatio(extendedData.enterpriseValue, extendedData.ebitda) : null,
          roe: hasExtendedData ? extendedData.returnOnEquity : null,
          roa: hasExtendedData ? extendedData.returnOnAssets : null
        },
        quarterly: this.generateQuarterlyPlaceholder(),
        
        // Price analysis from available data
        priceAnalysis: {
          currentPrice: basicData.currentPrice,
          fiftyTwoWeekHigh: basicData.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: basicData.fiftyTwoWeekLow,
          priceNear52WeekHigh: priceMetrics.priceNear52WeekHigh,
          priceNear52WeekLow: priceMetrics.priceNear52WeekLow,
          volatility: yearlyPriceData.volatility,
          longName: basicData.longName,
          shortName: basicData.shortName,
          exchangeName: basicData.fullExchangeName || basicData.exchangeName,
          currency: basicData.currency,
          volume: basicData.volume,
          dayHigh: basicData.dayHigh,
          dayLow: basicData.dayLow
        },
        
        // API status for user information
        apiStatus: {
          v8ChartApi: 'working',
          extendedFinancialApis: hasExtendedData ? 'working' : 'blocked',
          availableDataLevel: hasExtendedData ? 'full' : 'limited'
        },
        
        // Debug info
        _debug: {
          hasBasicData: !!basicData && Object.keys(basicData).length > 0,
          hasExtendedData: hasExtendedData,
          basicDataKeys: basicData ? Object.keys(basicData) : [],
          extendedDataKeys: extendedData ? Object.keys(extendedData) : [],
          v8MetaFields: basicData ? Object.keys(basicData).filter(key => basicData[key] !== undefined) : []
        }
      };

    } catch (error) {
      console.error(`❌ Error combining financial data for ${ticker}:`, error);
      throw error;
    }
  }

  static calculateMarketCap(currentPrice, sharesOutstanding) {
    if (currentPrice && sharesOutstanding) {
      return currentPrice * sharesOutstanding;
    }
    return null;
  }

  static calculateYearlyMetrics(chartData) {
    if (!chartData || chartData.length === 0) {
      return { ytdReturn: null, volatility: null };
    }

    // Get the earliest and latest prices for YTD calculation
    const sortedData = chartData.sort((a, b) => a.timestamp - b.timestamp);
    const firstPrice = sortedData[0]?.price;
    const lastPrice = sortedData[sortedData.length - 1]?.price;

    const ytdReturn = (firstPrice && lastPrice) ? 
      ((lastPrice - firstPrice) / firstPrice) * 100 : null;

    // Calculate simple volatility (standard deviation of returns)
    let volatility = null;
    if (chartData.length > 1) {
      const prices = chartData.map(d => d.price).filter(p => p !== null);
      if (prices.length > 1) {
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
          if (prices[i-1] && prices[i]) {
            returns.push((prices[i] - prices[i-1]) / prices[i-1]);
          }
        }
        
        if (returns.length > 0) {
          const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
          const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - avgReturn, 2), 0) / returns.length;
          volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized volatility percentage
        }
      }
    }

    return { ytdReturn, volatility };
  }

  static calculatePriceMetrics(basicData) {
    const currentPrice = basicData.currentPrice;
    const fiftyTwoWeekHigh = basicData.fiftyTwoWeekHigh;
    const fiftyTwoWeekLow = basicData.fiftyTwoWeekLow;

    let priceNear52WeekHigh = null;
    let priceNear52WeekLow = null;

    if (currentPrice && fiftyTwoWeekHigh) {
      priceNear52WeekHigh = ((currentPrice / fiftyTwoWeekHigh) * 100);
    }

    if (currentPrice && fiftyTwoWeekLow) {
      priceNear52WeekLow = ((currentPrice / fiftyTwoWeekLow) * 100);
    }

    return {
      priceNear52WeekHigh,
      priceNear52WeekLow
    };
  }

  static generateQuarterlyPlaceholder() {
    // Since we can't get detailed quarterly data from v7/v8 APIs,
    // return a placeholder structure
    return [
      { period: 'Q1', revenue: null, netIncome: null, eps: null, freeCashFlow: null },
      { period: 'Q2', revenue: null, netIncome: null, eps: null, freeCashFlow: null },
      { period: 'Q3', revenue: null, netIncome: null, eps: null, freeCashFlow: null },
      { period: 'Q4', revenue: null, netIncome: null, eps: null, freeCashFlow: null }
    ];
  }


  static calculateNetDebt(totalDebt, totalCash) {
    if (totalDebt && totalCash) return totalDebt - totalCash;
    return null;
  }

  static calculateRatio(numerator, denominator) {
    if (numerator && denominator && denominator !== 0) return numerator / denominator;
    return null;
  }

  static formatFinancialValue(value, type = 'currency') {
    if (value === null || value === undefined) return '-';

    switch (type) {
      case 'currency':
        return this.formatCurrency(value);
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'ratio':
        return value.toFixed(2);
      case 'number':
        return this.formatNumber(value);
      default:
        return value.toString();
    }
  }

  static formatCurrency(value) {
    if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  }

  static formatNumber(value) {
    if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toFixed(0);
  }
}

// ===== GEMINI AI INTEGRATION =====
async function createQuarterlyAnalysisPrompt(data, ticker) {
  const { revenue_trends, cash_flow_trends, balance_sheet_trends } = data;
  
  // Extract key metrics for analysis
  const latestRevenue = revenue_trends?.[0]?.revenue || 0;
  const previousRevenue = revenue_trends?.[1]?.revenue || 0;
  const latestNetIncome = revenue_trends?.[0]?.net_income || 0;
  const latestFCF = cash_flow_trends?.[0]?.free_cash_flow || 0;
  const latestCash = balance_sheet_trends?.[0]?.total_cash || 0;
  const latestDebt = balance_sheet_trends?.[0]?.total_debt || 0;

  const revenueGrowth = previousRevenue > 0 ? ((latestRevenue - previousRevenue) / previousRevenue * 100).toFixed(1) : 'N/A';
  const netMargin = latestRevenue > 0 ? (latestNetIncome / latestRevenue * 100).toFixed(1) : 'N/A';

  return `You are a financial analyst with expertise in quarterly earnings analysis and stock recommendations. Analyze the following quarterly financial data for ${ticker} and provide insights:

QUARTERLY FINANCIAL DATA FOR ${ticker}:
==============================================

REVENUE TRENDS (Last ${revenue_trends?.length || 0} quarters):
${revenue_trends?.map(q => `• ${q.period}: Revenue $${(q.revenue/1e9).toFixed(1)}B, Net Income $${(q.net_income/1e9).toFixed(1)}B, EBITDA $${(q.ebitda/1e9).toFixed(1)}B`).join('\n') || 'No revenue data'}

CASH FLOW TRENDS (Last ${cash_flow_trends?.length || 0} quarters):
${cash_flow_trends?.map(q => `• ${q.period}: Operating CF $${(q.operating_cash_flow/1e9).toFixed(1)}B, Free CF $${(q.free_cash_flow/1e9).toFixed(1)}B`).join('\n') || 'No cash flow data'}

BALANCE SHEET EVOLUTION (Last ${balance_sheet_trends?.length || 0} quarters):
${balance_sheet_trends?.map(q => `• ${q.period}: Total Assets $${(q.total_assets/1e9).toFixed(1)}B, Cash $${(q.total_cash/1e9).toFixed(1)}B, Debt $${(q.total_debt/1e9).toFixed(1)}B`).join('\n') || 'No balance sheet data'}

KEY METRICS SUMMARY:
• Latest Quarter Revenue Growth: ${revenueGrowth}%
• Current Net Margin: ${netMargin}%
• Free Cash Flow: $${(latestFCF/1e9).toFixed(1)}B
• Cash Position: $${(latestCash/1e9).toFixed(1)}B
• Total Debt: $${(latestDebt/1e9).toFixed(1)}B

ANALYSIS REQUIREMENTS:
Please provide a comprehensive analysis covering:

1. FINANCIAL HEALTH ASSESSMENT:
   - Revenue growth trajectory and sustainability
   - Profitability trends and margin analysis
   - Cash generation and capital efficiency
   - Balance sheet strength and liquidity

2. KEY STRENGTHS & CONCERNS:
   - What is this company doing particularly well?
   - What are the main financial risks or concerns?
   - How does cash flow support business operations?

3. INVESTMENT RECOMMENDATION:
   Based on the quarterly trends, provide ONE of these recommendations:
   - STRONG BUY: Exceptional growth and financial health
   - BUY: Solid fundamentals with positive trends
   - HOLD: Stable but limited upside potential
   - SELL: Concerning trends or overvaluation
   - STRONG SELL: Significant deterioration in fundamentals

4. RATIONALE:
   Provide 2-3 key reasons supporting your recommendation.

Please keep your analysis concise (under 200 words) but comprehensive, focusing on the most important insights from the quarterly data trends.`;
}

async function callGeminiAPI(prompt, apiKey) {
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      console.log(`🤖 Calling Gemini API (attempt ${attempt + 1}/${maxRetries})`);
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid Gemini API response structure');
      }

      const fullText = data.candidates[0].content.parts[0].text;
      
      // Extract recommendation from the response
      const recommendationMatch = fullText.match(/(STRONG BUY|BUY|HOLD|SELL|STRONG SELL)/i);
      const recommendation = recommendationMatch ? recommendationMatch[0].toUpperCase() : 'HOLD';
      
      // Clean up the analysis text
      const analysis = fullText.replace(/\*\*/g, '').trim();
      
      console.log('✅ Gemini API call successful');
      
      return {
        analysis: analysis,
        recommendation: recommendation
      };

    } catch (error) {
      attempt++;
      console.error(`❌ Gemini API attempt ${attempt} failed:`, error);
      
      if (attempt >= maxRetries) {
        throw new Error(`Gemini API failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

console.log('✅ Background script initialized successfully');
