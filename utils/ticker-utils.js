// Ticker Utilities Module
// Handles ticker symbol extraction and company name recognition

export class TickerUtils {
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
      'APPLE': 'AAPL',
      'APPLE INC': 'AAPL',
      'MICROSOFT': 'MSFT',
      'MICROSOFT CORP': 'MSFT',
      'MICROSOFT CORPORATION': 'MSFT',
      'AMAZON': 'AMZN',
      'AMAZON.COM': 'AMZN',
      'GOOGLE': 'GOOGL',
      'ALPHABET': 'GOOGL',
      'TESLA': 'TSLA',
      'TESLA INC': 'TSLA',
      'TESLA MOTORS': 'TSLA',
      'FACEBOOK': 'META',
      'META': 'META',
      'META PLATFORMS': 'META',
      'NVIDIA': 'NVDA',
      'NVIDIA CORP': 'NVDA',
      'NVIDIA CORPORATION': 'NVDA',
      'NETFLIX': 'NFLX',
      'NETFLIX INC': 'NFLX',
      'PAYPAL': 'PYPL',
      'PAYPAL HOLDINGS': 'PYPL',
      'ADOBE': 'ADBE',
      'ADOBE INC': 'ADBE',
      'INTEL': 'INTC',
      'INTEL CORP': 'INTC',
      'INTEL CORPORATION': 'INTC',
      'CISCO': 'CSCO',
      'CISCO SYSTEMS': 'CSCO',
      'ORACLE': 'ORCL',
      'ORACLE CORP': 'ORCL',
      'ORACLE CORPORATION': 'ORCL',
      'SALESFORCE': 'CRM',
      'SALESFORCE.COM': 'CRM',
      'IBM': 'IBM',
      'INTERNATIONAL BUSINESS MACHINES': 'IBM',
      'WALMART': 'WMT',
      'WAL-MART': 'WMT',
      'JOHNSON & JOHNSON': 'JNJ',
      'J&J': 'JNJ',
      'BERKSHIRE HATHAWAY': 'BRK.B',
      'BERKSHIRE': 'BRK.B',
      'JPMORGAN': 'JPM',
      'JP MORGAN': 'JPM',
      'JPMORGAN CHASE': 'JPM',
      'VISA': 'V',
      'MASTERCARD': 'MA',
      'PROCTER & GAMBLE': 'PG',
      'P&G': 'PG',
      'COCA-COLA': 'KO',
      'COCA COLA': 'KO',
      'PEPSI': 'PEP',
      'PEPSICO': 'PEP',
      'DISNEY': 'DIS',
      'WALT DISNEY': 'DIS',
      'MCDONALD\'S': 'MCD',
      'MCDONALDS': 'MCD',
      'NIKE': 'NKE',
      'HOME DEPOT': 'HD',
      'VERIZON': 'VZ',
      'AT&T': 'T',
      'CHEVRON': 'CVX',
      'EXXON': 'XOM',
      'EXXON MOBIL': 'XOM',
      'PALANTIR': 'PLTR',
      'PALANTIR TECHNOLOGIES': 'PLTR',
      'IONQ': 'IONQ',
      'CENTURYLINK': 'CENX'
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

  static isValidTicker(ticker) {
    if (!ticker) return false;
    
    // Basic ticker validation
    const cleanTicker = ticker.trim().toUpperCase();
    
    // Allow 1-6 letters, optionally followed by a dot and 2 letters (for exchanges like .TO)
    const tickerPattern = /^[A-Z]{1,6}(\.[A-Z]{2})?$/;
    
    return tickerPattern.test(cleanTicker);
  }

  static formatTicker(ticker) {
    if (!ticker) return null;
    return ticker.trim().toUpperCase();
  }
}
