# Stock Extension with FastAPI Financial Service - Complete Setup Guide

This guide shows how to set up the comprehensive stock extension with FastAPI backend service for advanced financial data.

## Architecture Overview

```
Chrome Extension (JavaScript) 
           ↓ HTTP Request
FastAPI Service (Python + Docker)
           ↓ yfinance Python package  
Yahoo Finance (Comprehensive Data)
```

## Benefits of FastAPI Solution

### ✅ Comprehensive Financial Data
- **Full Financial Statements**: Income statement, balance sheet, cash flow
- **Advanced Ratios**: P/E, P/B, ROE, ROA, EV/EBITDA, margins, etc.
- **Quarterly Data**: Real quarterly revenue, earnings, and cash flow data
- **Company Fundamentals**: Market cap, enterprise value, shares outstanding

### ✅ Reliable Data Access  
- **No CORS Issues**: Server-side requests bypass browser restrictions
- **No Rate Limits**: Centralized API management
- **Rich yfinance Package**: Access to [comprehensive yfinance capabilities](https://ranaroussi.github.io/yfinance/reference/yfinance.financials.html)
- **Fallback System**: Falls back to limited direct API if FastAPI unavailable

## Quick Start

### 1. Start the FastAPI Service

```bash
# Navigate to the financial API directory
cd stock_extension/financial-api

# Start the Docker service (builds container automatically)
./start-api.sh
```

**Expected Output:**
```
🚀 Starting Stock Financial API Service...
🔨 Building Docker container...
🏃 Starting FastAPI service...
⏳ Waiting for service to be ready...
✅ FastAPI service is running!
📖 API Documentation: http://localhost:8000/docs
🔍 Health Check: http://localhost:8000/health
📊 Test Endpoint: http://localhost:8000/financial/AAPL
```

### 2. Load the Chrome Extension

```bash
# Navigate back to extension directory
cd ..

# Reload the extension in Chrome
# Go to chrome://extensions/
# Click reload on "Stock Information Display" extension
```

### 3. Test the Complete Solution

1. **Test FastAPI Service:**
   ```bash
   curl http://localhost:8000/financial/AAPL
   curl http://localhost:8000/health
   ```

2. **Test Chrome Extension:**
   - Select "AAPL" text on any webpage
   - Right-click → "Get Stock Information"
   - Extension opens → Click "📊 Advanced" tab
   - Should see comprehensive financial data!

## What You'll See

### FastAPI Success - Advanced Tab Shows:
```
📋 Company Overview
├── Market Cap: $3.4T ✅
├── Enterprise Value: $3.5T ✅  
├── Shares Outstanding: 15.7B ✅
└── YTD Return: +25.4% ✅

💰 Financial Performance (TTM)
├── Revenue: $394.3B ✅
├── EBITDA: $125.8B ✅
├── Net Income: $100.9B ✅
├── Free Cash Flow: $84.7B ✅
├── EPS (TTM): $6.16 ✅
└── Operating Expenses: $55.0B ✅

🏦 Balance Sheet
├── Total Cash: $165.0B ✅
├── Total Debt: $123.0B ✅
├── Net Debt: -$42.0B ✅ (negative = net cash)
└── Book Value: $4.84 ✅

📊 Valuation Ratios
├── P/E Ratio: 29.5 ✅
├── P/B Ratio: 43.2 ✅
├── EV/Revenue: 8.9 ✅
├── EV/EBITDA: 27.8 ✅
├── ROE: 175.4% ✅
└── ROA: 28.3% ✅

📅 Quarterly Financials
├── Q1 2024: $119.6B revenue, $33.9B net income ✅
├── Q4 2023: $89.5B revenue, $20.7B net income ✅
├── Q3 2023: $116.0B revenue, $32.0B net income ✅
└── Q2 2023: $81.8B revenue, $19.4B net income ✅

✅ Comprehensive Financial Data
Data provided by FastAPI service using yfinance package
API Status: FastAPI ✅ | yfinance ✅ | Data Level: Comprehensive
```

### FastAPI Unavailable - Fallback Shows:
```
📊 Price Analysis for AAPL

📈 Price Metrics
├── Current Price: $190.64
├── 52W High: $199.62
├── 52W Low: $164.08
└── YTD Return: +15.4%

⚠️ Limited Financial Data
Advanced financial metrics are not available due to API restrictions.
Only price and trading data can be displayed.
API Status: Chart data ✅ | Financial data ❌ | FastAPI ❌
```

## API Endpoints

The FastAPI service provides these endpoints:

### Financial Data
- `GET /financial/{symbol}` - Complete financial data
  ```bash
  curl http://localhost:8000/financial/AAPL?include_quarterly=true
  ```

### Quick Basic Data  
- `GET /basic/{symbol}` - Basic info only (fast response)
  ```bash  
  curl http://localhost:8000/basic/TSLA
  ```

### Health & Documentation
- `GET /health` - Service health check
- `GET /docs` - Interactive API documentation (Swagger UI)
- `GET /` - Service info

## Console Logs to Watch

### Successful FastAPI Flow:
```javascript
🐍 Trying FastAPI service for AAPL...
🌐 FastAPI: Calling http://localhost:8000/financial/AAPL?include_quarterly=true
✅ FastAPI: Successfully fetched data for AAPL
🔄 FastAPI: Transformed data for AAPL
✅ FastAPI service successful for AAPL: {hasFinancialData: true, hasRatios: true, quarterlyCount: 4}
🐍 FastAPI comprehensive data available for AAPL - showing full financial view
✅ Setting marketCapAdvanced: 3400000000000 (type: currency)  
✅ Setting totalRevenue: 394328000000 (type: currency)
```

### Fallback Flow:
```javascript
🐍 Trying FastAPI service for AAPL...
⚠️ FastAPI service failed for AAPL: Failed to fetch
🔄 Falling back to limited Yahoo Finance API...
🔄 Advanced API: Starting comprehensive fetch for AAPL
ℹ️ Limited financial data available for AAPL - showing price analysis instead
```

## Managing the FastAPI Service

### Service Control
```bash
# Start service
./start-api.sh

# Stop service  
./stop-api.sh

# View logs
docker-compose logs -f

# Check service health
curl http://localhost:8000/health
```

### Development
```bash
# Manual development (without Docker)
cd financial-api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Rebuild Docker container
docker-compose build --no-cache
docker-compose up -d
```

## Troubleshooting

### FastAPI Service Issues

**Service Not Starting:**
```bash
# Check Docker is running
docker info

# View detailed logs
docker-compose logs

# Check port availability
lsof -i :8000
```

**Service Running but Extension Can't Connect:**
```bash
# Test service directly
curl http://localhost:8000/health

# Check manifest permissions include localhost
# Reload extension after manifest changes

# Check CORS is enabled in service
# (Already configured in main.py)
```

### Extension Issues

**Advanced Tab Shows Limited Data:**
```bash
# Check console for FastAPI connection attempts
# Look for "🐍 Trying FastAPI service" logs

# Verify service is accessible
curl http://localhost:8000/financial/AAPL

# Check Chrome extension console for errors
```

**No Data at All:**
```bash
# Check both FastAPI and fallback are working
# Test basic functionality first with Basic tab
# Check Yahoo Finance API status
```

## Example API Response

From `http://localhost:8000/financial/AAPL`:

```json
{
  "symbol": "AAPL",
  "company_name": "Apple Inc.",
  "currency": "USD",
  "exchange": "NMS",
  "market_cap": 3400000000000,
  "enterprise_value": 3500000000000,
  "shares_outstanding": 15728700000,
  "total_revenue": 394328000000,
  "ebitda": 125820000000,
  "net_income": 100913000000,
  "free_cash_flow": 84726000000,
  "eps_ttm": 6.16,
  "pe_ratio": 29.5,
  "pb_ratio": 43.2,
  "roe": 175.4,
  "roa": 28.3,
  "quarterly_revenue": [
    {
      "period": "2024-Q1",
      "revenue": 119575000000,
      "net_income": 33916000000,
      "operating_cash_flow": 28111000000
    }
  ],
  "api_status": {
    "yfinance": "success",
    "financial_statements": "success",
    "quarterly_data": "success"
  },
  "last_updated": "2025-01-20T10:30:45"
}
```

## Next Steps

1. **Production Deployment**: Deploy FastAPI service to cloud (AWS, GCP, etc.)
2. **Caching**: Add Redis caching for frequently requested stocks
3. **Authentication**: Add API keys for production use
4. **Monitoring**: Add logging and alerting
5. **Performance**: Horizontal scaling with load balancer

The FastAPI service provides the comprehensive financial data that was impossible to get reliably from direct Yahoo Finance API calls. The extension now has access to the full [yfinance package capabilities](https://ranaroussi.github.io/yfinance/reference/yfinance.financials.html) including income statements, balance sheets, cash flow statements, and quarterly data.
