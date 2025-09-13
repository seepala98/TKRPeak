# Installation Guide - Stock Information Chrome Extension

## Quick Installation (2 minutes)

### Step 1: Download/Clone the Extension
If you have the extension code already, proceed to Step 2.

### Step 2: Load Extension in Chrome

1. **Open Chrome** and navigate to:
   ```
   chrome://extensions/
   ```

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to and select the `stock_extension` folder
   - Click "Select" or "Open"

4. **Verify Installation**
   - You should see the "Stock Information Display" extension in your extensions list
   - The extension icon should appear in your Chrome toolbar

### Step 3: Test the Extension

1. **Visit any website** (e.g., https://finance.yahoo.com)
2. **Select any stock ticker** like "AAPL" or "TSLA"  
3. **Right-click** on the selected text
4. **Click "Get Stock Information for [ticker]"**
5. **Stock popup should appear** with real-time data

## Docker Testing Environment (Optional)

For comprehensive testing across multiple financial websites:

```bash
# Make sure Docker is installed and running
docker --version

# Start the testing environment
./test-extension.sh start

# Access the browser
open http://localhost:6080
# VNC Password: testing
```

## Troubleshooting

### Extension Not Loading
- **Problem**: "Load unpacked" shows error
- **Solution**: Make sure you selected the correct folder containing `manifest.json`

### Context Menu Not Appearing  
- **Problem**: Right-click doesn't show extension option
- **Solution**: Make sure text is selected before right-clicking

### Stock Data Not Loading
- **Problem**: Popup shows "Failed to fetch stock data"
- **Solution**: Check internet connection and try a well-known ticker like "AAPL"

### Permission Issues
- **Problem**: Extension can't access websites
- **Solution**: Check if extension is enabled in chrome://extensions/

## Next Steps

After installation:
1. **Test on different websites** - works on all sites
2. **Try both ticker symbols and company names**
3. **Check the beautiful popup design**
4. **Use external links** to Yahoo Finance and Google Finance

## Need Help?

- Check the main [README.md](README.md) for detailed documentation
- Look at the troubleshooting section
- Create an issue if you find bugs

---

**🎉 Enjoy instant stock data on any website!**
