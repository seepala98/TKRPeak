# 📊 Advanced Stock Analysis Chrome Extension

A comprehensive Chrome extension that provides **real-time stock analysis**, **quarterly trend insights**, and **AI-powered investment recommendations** with professional-grade financial data visualization.

## 🚀 **Key Features**

### 📈 **Multi-Tab Financial Analysis**
- **📊 Basic Info**: Real-time prices, interactive charts, period-aware data (1D-1Y)
- **💼 Advanced Metrics**: Comprehensive financial ratios, TTM performance, balance sheet analysis
- **📈 Quarterly Trends**: Historical quarterly analysis with growth calculations and AI insights

### 🤖 **Agentic AI-Powered Investment Analysis**
- **🧠 Intelligent Agent**: AI dynamically chooses from 7 specialized financial analysis tools
- **🔄 Multi-Step Analysis**: 3-5 iterations of intelligent decision-making per stock
- **🎯 Decisive Recommendations**: Enhanced STRONG BUY/BUY/HOLD/SELL/STRONG SELL with rationale
- **📊 Peer Comparisons**: AI intelligently selects and compares with relevant competitors
- **💡 Contextual Insights**: Real growth trend calculations with professional analyst data
- **⚙️ Dual Mode**: Agentic (function calling) and Static analysis with smart fallback

### ⚡ **Advanced Data Integration**
- **FastAPI Backend**: Self-hosted Python service for comprehensive financial data
- **Yahoo Finance Multi-API**: Fallback system across multiple Yahoo Finance endpoints
- **Rate Limiting & Caching**: Professional-grade API management with 5-minute cache
- **Real-time Processing**: Quarter-over-quarter and year-over-year calculations

### 🎯 **Smart User Experience**
- **Auto-Detection**: Right-click selected text → instant popup with stock data
- **Ticker Suggestions**: Smart recommendations when tickers aren't found
- **One-Click Access**: Extension icon provides instant stock lookup
- **Professional UI**: Modern tabbed interface with responsive design

---

## 🎮 **How to Use**

### **Method 1: Right-Click Magic ⚡**
1. **Select stock ticker** on any webpage (AAPL, MSFT, etc.)
2. **Right-click** → "Get Stock Information"
3. **Extension popup opens** with comprehensive data
4. **Navigate tabs**: Basic → Advanced → Quarterly Trends → AI Analysis

### **Method 2: Extension Icon Access**
1. **Click extension icon** 📊 in Chrome toolbar
2. **Enter ticker symbol** or select from suggestions
3. **Explore all tabs** for complete financial picture

### **Method 3: Auto-Detection**
1. **Select text** containing stock tickers
2. **Extension automatically detects** potential stocks
3. **One-click confirmation** to load data

---

## 📊 **Feature Breakdown**

### **🎯 Basic Stock Info Tab**
```
📈 Real-time Price Data
├── Current price with live updates
├── Period-aware high/low (adapts to selected timeframe)
├── Percentage change calculations
├── Market cap and volume
├── Interactive charts (1D, 5D, 1M, 6M, 1Y)
└── Direct links to Yahoo Finance & Google Finance
```

### **💼 Advanced Financial Tab**
```
📊 Professional Financial Analysis
├── Company Overview (market cap, enterprise value, shares outstanding)
├── TTM Performance (revenue, EBITDA, net income, FCF, EPS)
├── Balance Sheet (cash, debt, net debt, book value)
├── Valuation Ratios (P/E, P/B, EV/Revenue, EV/EBITDA, ROE, ROA)
├── API Limitations Handling (graceful fallback to available data)
└── FastAPI Integration (comprehensive data when available)
```

### **📈 Quarterly Trends Tab**
```
🔍 Historical Quarterly Analysis
├── 🤖 AI Analysis Section (Gemini 2.0 Flash recommendations)
├── 💡 Enhanced Financial Insights (real QoQ/YoY calculations)
├── 📈 Interactive Charts (Revenue, Cash Flow, Margins)
├── 📋 Detailed Tables (6+ quarters of financial evolution)
├── 📊 Growth Metrics (calculated trends, not just "stable")
└── 💰 Investment Recommendations (BUY/HOLD/SELL with rationale)
```

---

## 🤖 **Agentic AI Analysis Features**

### **🧠 Intelligent Financial Agent**
Revolutionary **agentic AI** that doesn't just analyze pre-formatted data—it **dynamically decides** which specialized tools to use for comprehensive stock analysis.

**How Agentic AI Works:**
```
1. 🎯 INITIAL ANALYSIS: AI calls fetch_quarterly_data + assess_financial_health
2. 🔍 INTELLIGENT DECISION: Based on findings, AI chooses next steps:
   • High P/E ratio detected → calls calculate_financial_ratios
   • Competitive analysis needed → calls compare_with_peers  
   • Market concerns found → calls detect_financial_anomalies
3. 📊 COMPREHENSIVE SYNTHESIS: AI combines all tool results for final recommendation
4. 🎯 DECISIVE OUTPUT: Clear STRONG BUY/BUY/HOLD/SELL/STRONG SELL conclusion
```

### **🔧 7 Specialized Financial Analysis Tools**

**1. 📊 fetch_quarterly_data**
- Retrieves 6+ quarters of historical financial performance
- Revenue, net income, cash flow, balance sheet evolution
- Calculates QoQ and YoY growth rates dynamically

**2. 🏥 assess_financial_health**  
- Comprehensive health score (0-100) with detailed breakdown
- Liquidity, leverage, profitability, and efficiency analysis
- Identifies strengths and risk areas automatically

**3. 🧮 calculate_financial_ratios**
- P/E, ROE, Current Ratio, Debt-to-Equity, margins
- Industry benchmarking and ratio interpretation
- Valuation and profitability assessments

**4. 🏢 compare_with_peers**
- AI intelligently selects relevant competitors 
- Side-by-side comparison of revenue, profitability, ratios
- Competitive positioning and market ranking

**5. 👨‍💼 get_analyst_consensus**
- Professional analyst ratings and price targets
- 31+ analyst opinions aggregation (Strong Buy to Strong Sell)
- Market sentiment and professional recommendations

**6. 🌍 fetch_market_context**
- Broader market conditions and sector performance
- Economic context and industry trends analysis
- Market timing and macroeconomic factors

**7. 🚨 detect_financial_anomalies**
- Red flag detection in financial statements
- Unusual patterns and concerning trends identification
- Risk assessment and warning signals

### **⚡ Multi-Step Intelligent Analysis**

**Example: AMZN Analysis Journey**
```
🤖 Iteration 1: Basic Assessment
   ✅ Called: fetch_quarterly_data, assess_financial_health
   📊 Found: Health score 60/100, liquidity concerns

🤖 Iteration 2: Ratio Deep-Dive  
   ✅ Called: calculate_financial_ratios
   📊 Found: Current ratio 1.06 (tight), ROE strong at 24.77%

🤖 Iteration 3: Competitive Context
   ✅ Called: compare_with_peers (WMT, BABA)  
   📊 Found: Revenue growth competitive, liquidity below peers

🤖 Iteration 4: Market Sentiment
   ✅ Called: get_analyst_consensus
   📊 Found: 15 Buy, 8 Hold, 2 Sell ratings

🎯 Final AI Recommendation: HOLD
   💡 Reasoning: "Strong growth trajectory balanced by liquidity 
      management concerns. Monitor Q4 cash flow closely."
```

### **🎛️ Dual Analysis Modes**

**🤖 Agentic Mode (Recommended)**
- AI dynamically calls tools based on what it discovers
- 3-5 iterations of intelligent analysis
- Comprehensive peer comparisons and market context  
- Professional-grade multi-faceted analysis

**📝 Static Mode (Fallback)**
- Traditional fixed-prompt analysis of quarterly data
- Single-iteration comprehensive report
- Reliable backup when agentic analysis unavailable

**⚙️ Configuration**
- Access via Extension Options (right-click extension icon → Options)
- Toggle between agentic and static analysis modes
- Built-in testing tools for debugging AI functionality

### **🎯 Enhanced Recommendation Intelligence**

**3-Tier Extraction System:**
1. **📌 Direct Format**: `RECOMMENDATION: STRONG BUY` (explicit AI formatting)
2. **🔍 Keyword Detection**: Standard phrases (`STRONG BUY`, `BUY`, `HOLD`, `SELL`, `STRONG SELL`)
3. **🧠 Contextual Analysis**: Natural language (`recommend buying`, `excellent investment`, `overvalued`, `concerning risks`)

**Decision Quality Improvements:**
- ✅ **More BUY/SELL decisions** (vs. default HOLD recommendations)
- ✅ **Context-aware reasoning** based on complete financial picture
- ✅ **Professional-grade analysis** combining quantitative and qualitative factors

### **📊 Visual Intelligence Dashboard**
- 🟢 **BUY recommendations**: Green background with growth indicators
- 🔵 **HOLD recommendations**: Blue background with stability signals  
- 🔴 **SELL recommendations**: Red background with risk warnings
- 🤖 **Agentic badge**: Shows tools used and analysis iterations
- ⚡ **Real-time updates**: Live analysis progression display

---

## 🛠 **Installation & Setup**

### **1. Chrome Extension Install**
```bash
# Method 1: Chrome Web Store (Coming Soon)
# Search for "Advanced Stock Analysis Extension"

# Method 2: Developer Install
1. Download/clone this repository
2. Open Chrome → chrome://extensions/
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" → Select extension folder
5. Look for 📊 icon in toolbar
```

### **2. FastAPI Service Setup (Optional but Recommended)**
```bash
# Navigate to financial-api directory
cd financial-api/

# Start the service (includes Docker setup)
./start-api.sh

# Verify service is running
curl http://localhost:8000/health
# Should return: {"status": "healthy", "rate_limiting": "active", "cache": "enabled"}
```

### **3. Agentic AI Configuration**
```bash
# Step 1: Get Gemini API Key
# Visit: https://aistudio.google.com/app/apikey
# Create new API key for Gemini 2.0 Flash

# Step 2: Configure Extension
# 1. Right-click extension icon → Options
# 2. Enter your Gemini API key in "Gemini API Configuration"
# 3. Choose analysis mode:
#    - ✅ Agentic AI Analysis (Recommended): Dynamic tool calling
#    - 📝 Static Analysis: Traditional prompt-based analysis
# 4. Save Settings

# Step 3: Test Configuration  
# - Click "🤖 Test Function Calling" to verify agentic AI works
# - Click "🔧 Test Tools Directly" to check individual financial tools
# - Test with a stock analysis to see multi-step intelligent analysis

# Step 4: Usage
# AI analysis now works in Quarterly Trends tab with:
# - 🤖 Agentic mode: 3-5 iterations of intelligent tool selection
# - 📊 Complete peer comparisons and analyst consensus
# - 🎯 Decisive STRONG BUY/BUY/HOLD/SELL/STRONG SELL recommendations
```

---

## 🏗 **Technical Architecture**

### **Chrome Extension Components**
```
stock_extension/
├── manifest.json              # Chrome extension configuration
├── background-compiled.js     # Service worker with API integration
├── popup-tabbed.js           # UI logic with tabbed interface
├── popup.html                # Main popup interface
├── content.js                # Web page text detection
└── styles/popup.css          # Professional UI styling
```

### **FastAPI Backend Service**
```
financial-api/
├── main.py                   # FastAPI application with agentic AI endpoints
├── tools.py                  # 7 specialized financial analysis tools
├── requirements.txt          # Python dependencies (includes yfinance, httpx)
├── Dockerfile               # Container configuration
├── start-api.sh            # Service startup script
└── README.md               # API documentation
```

### **Agentic AI Data Flow Architecture**
```
Web Page Text → Content Script → Background Script → Chrome Popup
                      ↓                    ↓
                Extension Options ← Gemini API Key Configuration
                      ↓
    🤖 AGENTIC AI ANALYSIS FLOW:
    
Quarterly Trends Tab → Background Script → FastAPI /agentic-analysis
                            ↓
    Gemini 2.0 Flash ← Initial Prompt: "Call fetch_quarterly_data & assess_financial_health"
         ↓ (Function Calling)
    Tool Execution → FinancialAnalysisTools.fetch_quarterly_data(AMZN)
         ↓ (Results)
    Gemini Analysis → "Found liquidity concerns, calling calculate_financial_ratios"
         ↓ (Next Function Call)
    Tool Execution → FinancialAnalysisTools.calculate_financial_ratios(AMZN, ["Current_Ratio"])
         ↓ (Multi-iteration Analysis)
    Smart Decision → "Need competitive context, calling compare_with_peers"
         ↓ (Final Analysis)
    AI Synthesis → "RECOMMENDATION: HOLD - Strong growth, monitor cash flow"
         ↓
Chrome Popup ← Comprehensive Analysis ← Background Script ← FastAPI Response

    📊 TOOL ECOSYSTEM:
    ├── fetch_quarterly_data     # Historical financial performance
    ├── assess_financial_health  # 0-100 health scoring system
    ├── calculate_financial_ratios # Valuation and profitability metrics
    ├── compare_with_peers       # Competitive benchmarking
    ├── get_analyst_consensus    # Professional analyst opinions
    ├── fetch_market_context     # Broader economic conditions
    └── detect_financial_anomalies # Red flag identification
```

---

## 📈 **Supported Stocks & Data**

### **Stock Coverage**
- **Major US Stocks**: AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, META, NFLX, etc.
- **International Stocks**: With proper ticker format (e.g., EQB.TO for Toronto)
- **Company Name Recognition**: Apple → AAPL, Microsoft → MSFT
- **Ticker Suggestions**: Smart recommendations for partial matches

### **Financial Data Available**
- **Real-time Pricing**: Current price, daily changes, volume
- **Historical Charts**: Up to 1-year interactive price visualization  
- **Financial Statements**: Income statement, balance sheet, cash flow (via FastAPI)
- **Quarterly Trends**: 6+ quarters of historical performance
- **Valuation Metrics**: P/E, P/B, EV ratios, ROE, ROA
- **Growth Calculations**: QoQ, YoY growth rates for all metrics

---

## 🔧 **Advanced Features**

### **Professional-Grade API Management**
- **Gemini Rate Limiting**: Proactive 1.0s intervals + exponential backoff for 429 errors
- **Multi-API Coordination**: Intelligent retry logic across Yahoo Finance, Gemini, and FastAPI
- **Multi-Tier Fallback**: Primary FastAPI → Yahoo Finance v8 → v7 → v6 endpoints  
- **In-Memory Caching**: 5-minute TTL with 1000-item capacity
- **Agentic Error Recovery**: Smart fallback from agentic to static analysis

### **Agentic AI Infrastructure**
- **Function Calling Architecture**: Gemini 2.0 Flash with structured tool schemas
- **Tool Registry**: Dynamic tool discovery and execution system
- **Iteration Management**: 5-iteration maximum with smart conversation history  
- **Context Preservation**: Multi-turn conversation state management
- **Fallback Mechanisms**: Static analysis backup when agentic calls fail
- **Performance Optimization**: Tool result caching and parallel execution

### **Enhanced Growth Calculations**
Traditional stock extensions show static "stable" insights. This extension calculates **real financial trends**:

```javascript
// Revenue Growth Analysis
📈 "accelerating" (QoQ > 5%)    📊 "growing" (QoQ 2-5%)    
📊 "stable" (QoQ ±2%)          📉 "slowing" (QoQ -2 to -5%)
📉 "declining" (QoQ < -5%)

// Profitability Trends  
💰 "improving" (margin expansion)  📊 "stable" (±0.3% margin change)
📉 "declining" (margin contraction)

// Cash Flow Analysis
💸 "strengthening" (FCF up 10%+)   📊 "growing" (FCF up 3-10%)
📊 "stable" (FCF ±3%)             📉 "weakening" (FCF down 10%+)

// Balance Sheet Health
🏦 "healthy" (strong cash/debt ratio)  📊 "adequate" (normal ratios)
⚠️ "concerning" (high debt, low cash)
```

### **Intelligent UI States**
- **Loading States**: Professional spinners and progress indicators
- **Error Handling**: Clear error messages with troubleshooting guidance
- **Data Availability**: Graceful handling of limited API data
- **Responsive Design**: Works perfectly across different screen sizes

---

## 🎨 **UI/UX Highlights**

### **Modern Visual Design**
- **Glassmorphism Effects**: Backdrop blur and transparency
- **Gradient Backgrounds**: Purple-to-blue professional gradients
- **Color-Coded Data**: Green (positive), red (negative), blue (neutral)
- **Interactive Elements**: Smooth hover effects and button transitions

### **Professional Layout**
- **Tabbed Navigation**: Clear separation of basic, advanced, and quarterly data
- **Responsive Tables**: Financial data presented in clean, readable formats
- **Chart Integration**: Canvas-based charts with interactive time period selection
- **Information Hierarchy**: Logical flow from basic price data to AI recommendations

### **Accessibility Features**
- **Clear Typography**: Readable fonts and appropriate sizing
- **Color Contrast**: High contrast for readability in various lighting
- **Keyboard Navigation**: Full keyboard accessibility support
- **Screen Reader Support**: Proper ARIA labels and semantic HTML

---

## 🔒 **Privacy & Security**

### **Data Privacy**
- ✅ **No Personal Data Collection**: Extension only processes publicly available stock data
- ✅ **Local Processing**: All calculations performed locally in browser
- ✅ **No Tracking**: Zero user behavior tracking or analytics
- ✅ **Minimal Permissions**: Only accesses active tab when explicitly requested

### **API Security**
- ✅ **Secure HTTPS Calls**: All API requests use encrypted connections
- ✅ **API Key Protection**: Gemini API key stored securely in Chrome storage
- ✅ **Rate Limiting**: Prevents abuse and ensures API compliance
- ✅ **Error Isolation**: API failures don't crash the extension

### **Extension Security**
- ✅ **Manifest V3**: Latest Chrome security standards
- ✅ **CSP Compliant**: Strict Content Security Policy implementation
- ✅ **Sandboxed Execution**: Isolated execution environment
- ✅ **No External Scripts**: All code bundled within extension

---

## 🚀 **Performance Optimizations**

### **Fast Loading**
- **Compiled Scripts**: Bundled JavaScript for faster execution
- **Lazy Loading**: UI components load only when needed
- **Efficient Caching**: Smart cache invalidation and memory management
- **Async Operations**: Non-blocking API calls and UI updates

### **Resource Management**
- **Memory Efficiency**: Automatic cleanup of unused data
- **CPU Optimization**: Efficient chart rendering and calculations
- **Network Optimization**: Batched API calls and response compression
- **Storage Management**: Minimal extension storage footprint

---

## 🐛 **Troubleshooting**

### **Extension Issues**
```bash
# Extension not appearing?
1. Check chrome://extensions/ - ensure it's enabled
2. Try reloading the extension
3. Refresh target webpage

# No data showing?
1. Check FastAPI service: curl http://localhost:8000/health
2. Verify internet connection
3. Try different stock tickers (AAPL, MSFT)

# AI analysis not working?
1. Verify Gemini API key in extension options
2. Check browser console for API errors
3. Ensure Gemini API quota isn't exceeded
```

### **FastAPI Service Issues**
```bash
# Service not starting?
cd financial-api/
./start-api.sh

# 429 Rate Limit Errors?
# The extension has automatic rate limiting - just wait a moment

# No financial data?
# Some tickers have limited data availability - try major stocks first
```

### **Performance Issues**
```bash
# Slow loading?
1. Clear extension cache (restart Chrome)
2. Check network connection
3. Verify FastAPI service is running locally

# Charts not rendering?
1. Try switching between time periods
2. Check browser console for JavaScript errors
3. Ensure popup window is large enough
```

---

## 🔄 **Recent Updates**

### **v4.0 - Agentic AI Revolution (Latest)**
- 🤖 **Agentic AI Intelligence**: AI dynamically chooses from 7 specialized financial tools
- 🔧 **Multi-Step Analysis**: 3-5 iterations of intelligent decision-making per stock
- 📊 **Complete Tool Ecosystem**: fetch_quarterly_data, assess_financial_health, calculate_financial_ratios, compare_with_peers, get_analyst_consensus, fetch_market_context, detect_financial_anomalies
- ⚙️ **Options Configuration**: Professional options page with agentic vs static mode selection
- 🎯 **Enhanced Recommendations**: 3-tier extraction system for more decisive BUY/SELL calls
- 🚀 **Rate Limiting Mastery**: Comprehensive Gemini API rate limiting with exponential backoff
- 💼 **Peer Analysis**: AI intelligently selects competitors and performs detailed comparisons
- 👨‍💼 **Analyst Integration**: 31+ professional analyst opinions with consensus ratings
- 🔧 **Debug Tools**: Built-in testing for function calling and individual tool verification

### **v3.0 - AI Analysis Integration**
- ✅ **Gemini 2.0 Flash AI**: Comprehensive quarterly data analysis
- ✅ **Investment Recommendations**: BUY/HOLD/SELL with detailed rationale
- ✅ **Enhanced Insights**: Real growth calculations (fixed "always stable" issue)
- ✅ **Professional UI**: Color-coded recommendations and loading states

### **v2.5 - Quarterly Trends & Advanced Analytics**
- ✅ **Quarterly Trends Tab**: Historical quarterly financial analysis
- ✅ **FastAPI Integration**: Self-hosted comprehensive financial data service
- ✅ **Interactive Charts**: Revenue, cash flow, and margin visualization
- ✅ **Growth Calculations**: QoQ and YoY calculations for all financial metrics

### **v2.0 - Advanced Financial Analysis**
- ✅ **Advanced Tab**: Professional financial ratios and TTM data
- ✅ **Multi-API Fallback**: Robust API failure handling
- ✅ **Enhanced Error Handling**: Graceful degradation for limited data
- ✅ **Rate Limiting**: Professional API management

### **v1.5 - Enhanced User Experience**
- ✅ **Tabbed Interface**: Organized data presentation
- ✅ **Ticker Suggestions**: Smart recommendations for failed searches
- ✅ **Auto-Detection**: Right-click context menu integration
- ✅ **Period-Aware Data**: Dynamic high/low/change calculations

---

## 📊 **Example Use Cases**

### **For Day Traders**
1. **Quick Price Check**: Right-click ticker → instant price and chart
2. **Period Analysis**: Switch between 1D, 5D charts for entry/exit timing
3. **Volume Analysis**: Check trading volume and price movements

### **For Long-Term Investors**
1. **Comprehensive Analysis**: Advanced tab → financial ratios and health metrics
2. **Quarterly Trends**: Historical performance and growth trajectory analysis  
3. **AI Recommendations**: Gemini analysis for investment decision support

### **For Financial Professionals**
1. **Client Research**: Quick comprehensive analysis for client meetings
2. **Comparative Analysis**: Fast switching between multiple tickers
3. **Professional Presentation**: Clean, professional-grade data visualization

---

## 🤝 **Contributing**

We welcome contributions! The extension is built with:
- **Frontend**: JavaScript ES6+, HTML5, CSS3
- **Backend**: Python FastAPI, yfinance, pandas, numpy
- **AI Integration**: Google Gemini 2.0 Flash API
- **Infrastructure**: Docker, Chrome Extension APIs

### **Development Setup**
```bash
# Clone repository
git clone [repository-url]
cd stock_extension

# Install FastAPI service
cd financial-api/
pip install -r requirements.txt

# Start development services
./start-api.sh

# Load extension in Chrome developer mode
# See installation instructions above
```

### **Contribution Areas**
- 🐛 Bug fixes and performance improvements
- ✨ New financial metrics and calculations  
- 🎨 UI/UX enhancements
- 🤖 AI analysis prompt improvements
- 📊 Additional chart types and visualizations
- 🔧 API optimizations and new data sources

---

## 📝 **License**

**MIT License** - Free to use, modify, and distribute!

---

## 🏆 **Summary**

This Chrome extension represents a **revolutionary agentic AI stock analysis platform** that combines:

🤖 **Agentic AI Intelligence** - Dynamic 7-tool ecosystem with 3-5 iteration multi-step analysis  
📊 **Institutional-Grade Data** - Real-time prices, financial ratios, analyst consensus, peer comparisons  
⚡ **Professional Performance** - FastAPI backend, Gemini rate limiting, intelligent caching  
🎨 **Modern UI** - Agentic badges, tool usage display, decisive recommendation systems  
🔒 **Enterprise Security** - Privacy-focused, secure API management, no data collection  
🎯 **Intelligent Decision-Making** - AI selects tools dynamically based on discovered insights

**The world's first agentic AI stock analysis Chrome extension - delivering institutional-quality analysis that adapts intelligently to each stock's unique characteristics.**

---

**📊 Made with ❤️ for the financial community - Empowering smarter investment decisions through intelligent data analysis** ✨