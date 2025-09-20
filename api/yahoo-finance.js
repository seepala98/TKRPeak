// Yahoo Finance API Module
// Handles all Yahoo Finance API interactions and stock data fetching

export class YahooFinanceAPI {
  static getIntervalForPeriod(period) {
    const intervalMap = {
      '1d': '5m',    // 5-minute intervals for 1-day
      '5d': '15m',   // 15-minute intervals for 5-day
      '1mo': '1d',   // Daily intervals for 1-month
      '6mo': '1d',   // Daily intervals for 6-month  
      '1y': '1wk'    // Weekly intervals for 1-year
    };
    return intervalMap[period] || '1d';
  }

  static async fetchStockData(ticker, period = '1d') {
    console.log(`🔄 Yahoo Finance API: Starting fetch for ${ticker} (${period})`);
    
    try {
      const range = period;
      const interval = this.getIntervalForPeriod(period);
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=${interval}&includePrePost=true&events=div%7Csplit`;
      
      console.log(`🌐 Yahoo Finance API: Trying v8 API: ${url}`);
      console.log("⏰ Setting up 10-second timeout...");

      // Add timeout for API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log("Yahoo Finance API: Call timeout, aborting...");
        controller.abort();
      }, 10000); // 10 second timeout

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

      console.log("✅ Yahoo Finance API: Call completed successfully!");
      console.log(`📊 Yahoo v8 API status: ${response.status}`);
      console.log(`🔍 Yahoo v8 API headers:`, Object.fromEntries(response.headers));

      if (!response.ok) {
        throw new Error(`Yahoo v8 API HTTP error! status: ${response.status}`);
      }

      console.log("📥 Parsing JSON response...");
      const data = await response.json();
      console.log("✅ JSON parsed successfully!");

      const result = data.chart.result[0];
      const meta = result.meta;
      const currentPrice = meta.regularMarketPrice;
      
      console.log(`💰 Current price for ${ticker}: ${currentPrice}`);

      // Get chart data points
      const timestamps = result.timestamp;
      const prices = result.indicators.quote[0].close;
      const chartData = timestamps?.map((time, i) => ({
        time: time * 1000, // Convert to milliseconds
        price: prices[i]
      })).filter(point => point.price !== null) || [];

      // Calculate period-specific metrics from chart data
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

      const stockData = {
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
        // Period-specific metrics
        periodHigh: periodHigh,
        periodLow: periodLow,
        periodChange: periodChange,
        periodChangePercent: periodChangePercent
      };

      console.log(`📈 Yahoo Finance API: Successfully processed ${ticker} data - Price: ${currentPrice}, Change: ${periodChange}`);
      return stockData;

    } catch (error) {
      console.error('Yahoo Finance API: Fetch failed:', error);
      throw error;
    }
  }

  static async getTickerSuggestions(query) {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${query}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return [];
      }
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
