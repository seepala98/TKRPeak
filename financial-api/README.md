# Stock Financial Data API with Agentic AI

A FastAPI service that provides comprehensive stock financial data using the [yfinance Python package](https://ranaroussi.github.io/yfinance/) **enhanced with agentic AI capabilities**. Features dynamic tool calling for intelligent stock analysis that adapts to each company's unique characteristics.

## Features

### 🤖 **Agentic AI Analysis**
- **Dynamic Tool Selection**: AI chooses from 7 specialized financial analysis tools
- **Multi-Step Intelligence**: 3-5 iterations of adaptive analysis per stock
- **Gemini 2.0 Flash Integration**: Function calling with structured tool schemas
- **Intelligent Decision Making**: AI determines next analysis steps based on discoveries
- **Comprehensive Peer Analysis**: Automated competitor selection and comparison
- **Professional Analyst Integration**: 31+ analyst consensus with ratings aggregation

### 📊 **7 Specialized Financial Tools**
1. **fetch_quarterly_data**: Historical financial performance with QoQ/YoY calculations
2. **assess_financial_health**: 0-100 health scoring with detailed breakdown  
3. **calculate_financial_ratios**: Valuation, profitability, and liquidity metrics
4. **compare_with_peers**: Intelligent competitor analysis and benchmarking
5. **get_analyst_consensus**: Professional analyst ratings and price targets
6. **fetch_market_context**: Broader market conditions and sector performance
7. **detect_financial_anomalies**: Red flag detection and risk assessment

### 🎯 **Comprehensive Financial Data**
- **Company Overview**: Market cap, enterprise value, shares outstanding, float shares
- **Financial Performance**: Revenue, EBITDA, net income, EPS (TTM & forward)
- **Balance Sheet**: Cash, debt, assets, equity, book value
- **Cash Flow**: Operating cash flow, free cash flow, capital expenditures
- **Valuation Ratios**: P/E, P/B, P/S, PEG, EV/Revenue, EV/EBITDA
- **Profitability Ratios**: ROE, ROA, gross/operating/net margins
- **Price Metrics**: Current price, 52-week high/low, YTD return
- **Quarterly Data**: Last 8 quarters of revenue, earnings, and cash flow

### 🔗 **API Endpoints**

**🤖 Agentic AI Endpoints**
- `POST /agentic-analysis` - Multi-step intelligent stock analysis with dynamic tool calling
- `GET /agentic-tools` - List all available financial analysis tools
- `POST /test-function-calling` - Debug endpoint to test Gemini function calling
- `POST /test-tools` - Test individual financial analysis tools directly

**📊 Financial Data Endpoints**  
- `GET /financial/{symbol}` - Complete financial data for a stock
- `GET /quarterly-trends/{symbol}` - Historical quarterly analysis with growth calculations
- `GET /basic/{symbol}` - Basic stock information (quick response)
- `GET /search/{query}` - Search for stock symbols (extensible)

**🔧 System Endpoints**
- `GET /health` - Health check endpoint with rate limiting and cache status
- `GET /cache/stats` - Detailed cache statistics and performance metrics
- `POST /cache/clear` - Clear all cached data
- `GET /docs` - Interactive API documentation (Swagger UI)
- `GET /debug/{symbol}` - Debug raw yfinance data for troubleshooting

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Chrome extension with stock symbol

### 1. Start the API Service
```bash
cd financial-api
./start-api.sh
```

This will:
- Build the Docker container
- Start the FastAPI service on port 8000
- Provide health checks and logging

### 2. Test the API
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health  
- **Test Financial Data**: http://localhost:8000/financial/AAPL

### 3. Stop the Service
```bash
./stop-api.sh
```

## API Usage Examples

### 🤖 **Agentic AI Analysis**
```bash
# Intelligent multi-step stock analysis
curl -X POST http://localhost:8000/agentic-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "AMZN",
    "analysis_type": "comprehensive", 
    "gemini_api_key": "your_gemini_api_key_here"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "ticker": "AMZN",
  "result": {
    "final_analysis": "Amazon demonstrates mixed financial signals with a health score of 60/100. While revenue growth remains positive at 11% QoQ, the current ratio of 1.06 indicates potential liquidity constraints. Debt-to-equity of 0.46 is manageable but requires monitoring. AWS continues driving growth while retail margins face pressure. RECOMMENDATION: HOLD - Solid growth trajectory balanced by liquidity management concerns.",
    "tools_used": ["fetch_quarterly_data", "assess_financial_health", "compare_with_peers"],
    "iterations": 3,
    "tool_calls_made": 5
  }
}
```

### 📊 **Get Complete Financial Data**
```bash
curl http://localhost:8000/financial/AAPL
```

Response includes:
```json
{
  "symbol": "AAPL",
  "company_name": "Apple Inc.",
  "currency": "USD",
  "market_cap": 3400000000000,
  "total_revenue": 394328000000,
  "net_income": 100913000000,
  "eps_ttm": 6.16,
  "pe_ratio": 29.5,
  "roe": 175.4,
  "quarterly_revenue": [
    {
      "period": "2024-Q1", 
      "revenue": 119575000000,
      "net_income": 33916000000
    }
  ],
  "api_status": {
    "yfinance": "success",
    "financial_statements": "success"
  }
}
```

### Get Basic Information (Fast)
```bash
curl http://localhost:8000/basic/TSLA
```

## Integration with Chrome Extension

The Chrome extension will make requests to this API instead of directly calling Yahoo Finance:

```javascript
// Replace direct Yahoo Finance calls with API calls
const response = await fetch('http://localhost:8000/financial/AAPL');
const financialData = await response.json();

// Use the rich financial data in the Advanced tab
populateAdvancedFinancialData(financialData);
```

## Development

### Manual Development Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Docker Development
```bash
# Build image
docker build -t stock-financial-api .

# Run container
docker run -p 8000:8000 stock-financial-api
```

### View Logs
```bash
docker-compose logs -f
```

## Key Advantages over Direct API Calls

1. **No CORS Issues**: Server-side requests bypass browser CORS restrictions
2. **Rich Data Access**: Full yfinance package capabilities including financial statements
3. **Better Error Handling**: Robust server-side error handling and retries
4. **Data Processing**: Server-side calculation of ratios and derived metrics  
5. **Caching Potential**: Can implement caching for better performance
6. **Rate Limit Management**: Centralized API rate limit handling

## 🏗 **Architecture**

### **🤖 Agentic AI Architecture**
```
Chrome Extension → FastAPI /agentic-analysis → Gemini 2.0 Flash
     ↓                    ↓                         ↓ (Function Calls)
Extension Options    Tool Registry            FinancialAnalysisTools
     ↓                    ↓                         ↓
Gemini API Key      Dynamic Tools              yfinance → Yahoo Finance
                         ↓                         ↓
                  Multi-Step Analysis      Intelligent Data Processing
                         ↓                         ↓  
              Comprehensive Report ← AI Synthesis ← Tool Results

🔧 Tool Execution Flow:
1. fetch_quarterly_data → Historical performance analysis
2. assess_financial_health → Risk scoring and evaluation  
3. calculate_financial_ratios → Valuation and profitability metrics
4. compare_with_peers → Competitive benchmarking
5. get_analyst_consensus → Professional market sentiment
6. fetch_market_context → Economic and sector conditions
7. detect_financial_anomalies → Red flag identification
```

### **📊 Traditional Data Flow**  
```
Chrome Extension (JavaScript)
           ↓ HTTP Request  
FastAPI Service (Python)
           ↓ yfinance
Yahoo Finance (Official)
```

## Supported Financial Metrics

Based on [yfinance documentation](https://ranaroussi.github.io/yfinance/reference/yfinance.financials.html):

- **Income Statement**: Revenue, gross profit, operating income, net income, EPS
- **Balance Sheet**: Assets, liabilities, equity, cash, debt
- **Cash Flow**: Operating CF, investing CF, financing CF, free cash flow
- **Key Statistics**: Market cap, P/E ratio, P/B ratio, beta, dividend yield
- **Quarterly Data**: Last 4 quarters of key metrics

## Production Considerations

For production deployment:
- Add API authentication/rate limiting
- Implement Redis caching for frequently requested stocks
- Add monitoring and alerting
- Configure proper CORS origins (remove wildcard)
- Add SSL/TLS termination
- Scale horizontally with load balancer

## Troubleshooting

### Service Not Starting
```bash
# Check Docker status
docker info

# View detailed logs
docker-compose logs

# Rebuild container
docker-compose build --no-cache
```

### API Errors
- Check service health: `curl http://localhost:8000/health`
- View logs: `docker-compose logs -f`
- Test with known good symbol: `curl http://localhost:8000/financial/AAPL`

## License

This project uses the yfinance package which provides access to Yahoo Finance data. Please ensure compliance with Yahoo Finance's terms of service for any commercial usage.
