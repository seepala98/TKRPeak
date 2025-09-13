# Stock Information Chrome Extension

A powerful Chrome extension that provides instant stock information when browsing financial news and websites. Simply select any stock ticker or company name, right-click, and get real-time stock data in a beautiful popup.

![Extension Demo](https://img.shields.io/badge/version-1.0-blue) ![Chrome Extension](https://img.shields.io/badge/chrome-extension-green) ![Manifest V3](https://img.shields.io/badge/manifest-v3-orange)

## ✨ Features

- 🚀 **Instant Stock Data**: Real-time stock prices and market information
- 📊 **Mini Charts**: Visual price trends for quick analysis
- 🎯 **Smart Detection**: Recognizes both ticker symbols (AAPL) and company names (Apple Inc.)
- 🌐 **Universal Compatibility**: Works on any website
- 💹 **Comprehensive Data**: Price, daily change, high/low, market cap
- 🔗 **External Links**: Direct links to Yahoo Finance and Google Finance
- 🎨 **Beautiful UI**: Modern, responsive popup design with dark mode support

## 📸 Screenshots

### Context Menu Integration
When you select a stock ticker or company name, right-click to see the extension option:
```
Selected: AAPL
Right-click menu:
├── Cut
├── Copy
├── Paste
└── 📊 Get Stock Information for 'AAPL'  ← Extension
```

### Stock Information Popup
The popup displays comprehensive stock data:
```
┌─ AAPL ──────────────────────────────┐
│                                     │
│            USD 150.23               │
│        +2.45 (+1.65%) ⬆️             │
│                                     │
│  Day High:     151.20               │
│  Day Low:      147.80               │
│  Market Cap:   $2.45T               │
│                                     │
│  [Mini Chart] ╱╲╱╲                  │
│                                     │
│  [📈 Yahoo Finance] [🔍 Google Finance] │
└─────────────────────────────────────┘
```

## 🚀 Quick Start

### Option 1: Load in Developer Mode (Recommended for Development)

1. **Clone or Download** this repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer mode** (toggle in top-right)
4. **Click "Load unpacked"** and select the extension directory
5. **Test the extension** on any website with stock tickers

### Option 2: Docker Testing Environment

For comprehensive testing across multiple financial websites:

```bash
# Start the testing environment
./test-extension.sh start

# Access the browser at http://localhost:6080
# VNC Password: testing

# Stop the testing environment
./test-extension.sh stop
```

## 📁 Project Structure

```
stock_extension/
├── manifest.json           # Extension configuration (Manifest V3)
├── background.js           # Service worker for API calls & context menu
├── content.js             # Content script for popup display
├── popup.css              # Styles for stock information popup
├── popup.html             # Extension popup (click on extension icon)
├── icons/                 # Extension icons (16px, 48px, 128px)
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── icon.svg
├── Dockerfile             # Docker testing environment
├── docker-compose.yml     # Docker Compose configuration
├── test-extension.sh      # Testing automation script
└── README.md             # This documentation
```

## 🔧 Development

### Prerequisites

- Google Chrome or Chromium browser
- Docker (optional, for testing environment)
- Basic knowledge of Chrome Extensions

### Local Development

1. **Load the extension** in Chrome (see Quick Start above)
2. **Make changes** to the code files
3. **Reload the extension** in Chrome Extensions page
4. **Test on financial websites** like:
   - [Yahoo Finance](https://finance.yahoo.com)
   - [MarketWatch](https://www.marketwatch.com)
   - [Bloomberg](https://www.bloomberg.com/markets)
   - [Reuters](https://www.reuters.com/markets)

### API Integration

The extension uses Yahoo Finance's unofficial API for stock data:
- **Primary API**: `https://query1.finance.yahoo.com/v8/finance/chart/{ticker}`
- **Fallback API**: `https://query1.finance.yahoo.com/v7/finance/quote?symbols={ticker}`
- **No API keys required** - works directly from browser

### Supported Stock Tickers

The extension recognizes:
- **Standard tickers**: AAPL, TSLA, MSFT, GOOGL, etc.
- **Company names**: Apple, Tesla, Microsoft, Google, etc.
- **Various formats**: $AAPL, AAPL.NASDAQ, etc.

## 🧪 Testing

### Automated Testing with Docker

```bash
# Start testing environment
./test-extension.sh start

# View logs
./test-extension.sh logs

# Restart environment
./test-extension.sh restart

# Stop environment
./test-extension.sh stop
```

### Manual Testing Checklist

- [ ] **Basic functionality**: Select ticker → Right-click → Extension appears
- [ ] **Stock data accuracy**: Compare with Yahoo Finance
- [ ] **Company name recognition**: Try "Apple Inc." → Should show AAPL data
- [ ] **Error handling**: Try invalid ticker "INVALID123"
- [ ] **Multiple websites**: Test on Yahoo Finance, MarketWatch, Bloomberg
- [ ] **Responsive design**: Test popup on different screen sizes
- [ ] **Performance**: Extension doesn't slow down page loading

### Test Cases

| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Valid ticker | Select "AAPL" | Stock popup with Apple data |
| Company name | Select "Tesla Inc." | Stock popup with TSLA data |
| Invalid ticker | Select "INVALID123" | Error popup |
| Mixed case | Select "aapl" | Stock popup (normalized to AAPL) |
| With $ symbol | Select "$MSFT" | Stock popup with Microsoft data |

## 🛠️ Technical Details

### Chrome Extension Manifest V3

The extension uses the latest Manifest V3 with:
- **Service Worker**: Background script for API calls
- **Content Scripts**: Injected into all pages for UI
- **Context Menus**: Right-click integration
- **Host Permissions**: Access to stock APIs

### Key Technologies

- **Vanilla JavaScript**: No external dependencies
- **CSS3**: Modern styling with animations
- **SVG**: Scalable mini charts
- **Chrome Extension APIs**: Context menus, tabs, storage

### Performance Optimizations

- ⚡ **Lazy loading**: API calls only when requested
- 🧠 **Smart caching**: Avoid duplicate requests
- 🎨 **CSS animations**: Smooth popup transitions
- 📱 **Responsive design**: Works on all screen sizes

## 🔒 Privacy & Security

- ✅ **No data collection**: Extension doesn't store user data
- ✅ **API calls only**: Connects only to Yahoo Finance APIs
- ✅ **Open source**: Full code transparency
- ✅ **Minimal permissions**: Only essential Chrome permissions

## 🐛 Troubleshooting

### Common Issues

**Extension not appearing in right-click menu:**
- Ensure text is selected before right-clicking
- Check if extension is enabled in Chrome Extensions page

**Stock data not loading:**
- Check browser console for API errors
- Verify internet connection
- Try a different, well-known ticker (e.g., AAPL)

**Popup not showing:**
- Disable other extensions temporarily
- Clear browser cache and reload
- Check if popup is hidden behind other elements

### Debug Mode

Enable Chrome DevTools console to see extension logs:
1. Right-click on any page → "Inspect"
2. Go to "Console" tab
3. Look for extension-related messages

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature-name`
3. **Make** your changes
4. **Test** thoroughly using the Docker environment
5. **Submit** a pull request

### Development Guidelines

- Follow existing code style
- Add comments for complex logic
- Test on multiple websites
- Ensure cross-browser compatibility
- Update documentation for new features

## 📋 Roadmap

- [ ] **International markets**: Support for non-US stocks
- [ ] **Crypto support**: Bitcoin, Ethereum, etc.
- [ ] **Portfolio tracking**: Save favorite stocks
- [ ] **Price alerts**: Notify when stocks hit targets
- [ ] **Advanced charts**: Candlestick, technical indicators
- [ ] **News integration**: Related news articles
- [ ] **Firefox support**: Port to Firefox Extension

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Yahoo Finance**: For providing stock data APIs
- **Chrome Extensions**: For excellent documentation
- **Financial news websites**: For testing opportunities

## 📞 Support

If you encounter any issues:

1. **Check** the troubleshooting section above
2. **Search** existing GitHub issues
3. **Create** a new issue with details:
   - Chrome version
   - Extension version
   - Steps to reproduce
   - Console error messages

---

**Made with ❤️ for financial enthusiasts and developers**

*Get instant stock data anywhere on the web!* 📊📈
# TKRPeak
