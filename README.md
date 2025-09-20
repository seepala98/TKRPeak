# Stock Information Chrome Extension

A simple, elegant Chrome extension that provides instant stock information with beautiful charts and auto-detection of selected text.

## ✨ Features

- **⚡ Auto-Opening Popup**: Right-click selected text → popup opens instantly!
- **🎯 Smart Auto-Detection**: Automatically detects stock tickers when you select text on any webpage
- **📊 Dynamic Period Charts**: Interactive price charts with multiple time periods (1D, 5D, 1M, 6M, 1Y)
- **🔄 Period-Aware Data**: High/low/change values adapt to selected timeframe
- **🚀 One-Click Access**: Click the extension icon for instant stock data
- **💰 Real-time Data**: Current price, period change, high/low, market cap from Yahoo Finance
- **🧹 Auto-Clear**: Close popup to automatically clear data for fresh selections
- **🔗 Quick Links**: Direct links to Yahoo Finance and Google Finance
- **📱 Clean Interface**: Modern, responsive design with gradient backgrounds

## 🎮 How to Use

### Method 1: One-Click Right-Click (Fastest!)
1. **Select stock text** on any webpage (AAPL, Tesla, etc.)
2. **Right-click** → "Get Stock Information"  
3. **Popup opens automatically** with stock data and charts!
4. **Close popup** to clear data and start fresh

### Method 2: Auto-Detection
1. **Select stock text** on any webpage
2. **Click the extension icon** 📊
3. **Click "Get Stock Info"** to fetch data instantly
4. **View charts** and switch between time periods

### Method 3: Manual Search  
1. **Click the extension icon** 📊
2. **Type a stock ticker** in the input field
3. **Press Enter** or click Search
4. **Or choose** from popular stocks (AAPL, MSFT, etc.)

## 📈 Chart Features

- **Interactive Time Periods**: 1D, 5D, 1M, 6M, 1Y
- **Price Visualization**: Clean line charts showing price movements
- **Color Coding**: Green for gains, red for losses
- **Real-time Updates**: Charts update with fresh data

## 🧩 Modular Architecture

The extension is built with a clean, modular architecture for easy maintenance and debugging:

- **📁 `/api/`** - API integration modules (Yahoo Finance, Gemini AI)
- **📁 `/ui/`** - User interface components (charts, displays, events)
- **📁 `/utils/`** - Utility functions (ticker parsing, data formatting)
- **📁 `/handlers/`** - Event handlers (context menu, messages)
- **📁 `/styles/`** - CSS styling (extracted from HTML)

See `ARCHITECTURE.md` for detailed module documentation.

## 🛠 Installation

### Quick Install (Chrome Web Store)
*Coming Soon - Currently in development*

### Developer Install
1. Download or clone this repository
2. Open Chrome → `chrome://extensions/`
3. Enable **"Developer mode"** (top right)
4. Click **"Load unpacked"**
5. Select the extension folder
6. Look for the 📊 icon in your toolbar!

## 🏗 Project Structure

```
stock_extension/
├── manifest.json          # Extension configuration
├── background.js          # API handling & data storage  
├── content.js             # Page text detection
├── popup.html             # Main interface
├── popup.js               # UI logic & charts
├── icons/                 # Extension icons
└── README.md              # Documentation
```

## 📊 Supported Assets

- **Major Stocks**: AAPL, MSFT, GOOGL, TSLA, NVDA, AMZN, META, NFLX, etc.
- **Company Names**: Apple → AAPL, Tesla → TSLA, Microsoft → MSFT
- **Popular Tickers**: Built-in buttons for quick access
- **Auto-Recognition**: Smart extraction from selected text

## 🔧 Technical Details

- **Manifest V3**: Latest Chrome extension standards
- **Yahoo Finance API**: Reliable real-time stock data
- **Canvas Charts**: Lightweight, fast chart rendering  
- **CSP Compliant**: Secure content security policies
- **Cross-Origin Handling**: Background script manages API calls

## 🎨 Design Highlights

- **Modern Gradient UI**: Beautiful purple-to-blue gradients
- **Glassmorphism Effects**: Backdrop blur and transparency
- **Responsive Layout**: Works perfectly in popup window
- **Smooth Animations**: Subtle hover and transition effects
- **Accessible Controls**: Clear buttons and readable text

## 🔒 Privacy

- ✅ **No data collection** - all processing is local
- ✅ **No tracking** - extension only fetches public stock data  
- ✅ **Secure API calls** - handled through background script
- ✅ **Minimal permissions** - only accesses active tab when needed

## 🚀 Performance

- **Fast Loading**: Optimized code and minimal dependencies
- **Low Memory**: Efficient background script with cleanup
- **Quick Response**: Instant text detection and data fetching
- **Cached Data**: Smart caching to reduce API calls

## 🐛 Troubleshooting

### Extension Not Working?
1. Check if it's enabled in `chrome://extensions/`
2. Try reloading the extension
3. Refresh the webpage you're testing on

### No Chart Showing?
- Charts appear after data is loaded
- Try switching between time periods
- Check browser console for errors

### Auto-Detection Not Working?
- Make sure text is properly selected
- Try selecting ticker symbols (AAPL) vs company names (Apple)
- Click the extension icon after selecting text

## 📝 License

MIT License - Feel free to use, modify, and distribute!

## 🤝 Contributing

We welcome contributions! Please feel free to:
- Report bugs and issues
- Suggest new features  
- Submit pull requests
- Improve documentation

---

**Made with ❤️ for traders and investors everywhere** 📊✨