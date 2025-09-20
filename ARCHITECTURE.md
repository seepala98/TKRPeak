# Stock Extension - Modular Architecture

## 📁 File Structure

The extension has been refactored into a clean, modular architecture for better maintainability and debugging:

```
├── api/                        # API Integration Modules
│   ├── yahoo-finance.js       # Yahoo Finance API calls & data processing
│   └── gemini.js              # Gemini AI API integration & content analysis
│
├── ui/                         # User Interface Modules  
│   ├── chart.js               # Chart rendering & visualization
│   ├── gemini-chat.js         # AI chat interface management
│   ├── stock-display.js       # Stock data display & UI states
│   └── event-handlers.js      # Event listener management
│
├── utils/                      # Utility Modules
│   ├── ticker-utils.js        # Ticker extraction & company name mapping
│   └── popup-utils.js         # Popup helper functions & data formatting
│
├── handlers/                   # Event Handler Modules
│   ├── context-menu.js        # Context menu creation & handling  
│   └── message-handler.js     # Inter-script message routing
│
├── styles/                     # Styling
│   └── popup.css              # All popup styles (extracted from HTML)
│
├── background.js              # Main background coordinator
├── popup.js                   # Main popup coordinator  
├── popup.html                 # Simplified HTML structure
├── content.js                 # Content script (unchanged)
└── manifest.json              # Extension configuration
```

## 🧩 Module Responsibilities

### **API Modules (`/api/`)**
- **`yahoo-finance.js`**: Handles all Yahoo Finance API interactions, stock data fetching, period calculations, and ticker suggestions
- **`gemini.js`**: Manages Gemini AI API calls, content analysis, retry logic, and error handling

### **UI Modules (`/ui/`)**
- **`chart.js`**: Canvas-based chart rendering, time period formatting, grid lines, and price visualization
- **`gemini-chat.js`**: Chat interface management, message display, and AI interaction handling
- **`stock-display.js`**: UI state management, stock data presentation, and section visibility control
- **`event-handlers.js`**: Centralized event listener setup and user interaction handling

### **Utility Modules (`/utils/`)**
- **`ticker-utils.js`**: Ticker symbol extraction, company name mapping, and validation logic
- **`popup-utils.js`**: Helper functions for data formatting, API communication, and input validation

### **Handler Modules (`/handlers/`)**
- **`context-menu.js`**: Context menu creation, right-click handling, and data storage for popup
- **`message-handler.js`**: Message routing between extension components and API call coordination

### **Coordinator Scripts**
- **`background.js`**: Imports and coordinates all background modules (context menu + message handler)
- **`popup.js`**: Imports and coordinates all popup modules (UI + events + data fetching)

## ✅ Benefits of Modular Architecture

1. **🔧 Better Debugging**: Each module has a specific responsibility, making it easier to isolate and fix issues
2. **📖 Improved Readability**: Smaller, focused files are easier to understand and maintain
3. **🔄 Easier Testing**: Individual modules can be tested in isolation
4. **🚀 Better Performance**: Only relevant modules are loaded when needed
5. **👥 Team Development**: Multiple developers can work on different modules simultaneously
6. **📦 Reusability**: Modules can be reused across different parts of the extension
7. **🛠️ Maintainability**: Changes to one feature don't affect unrelated functionality

## 🚀 Development Workflow

1. **API Changes**: Modify files in `/api/` directory
2. **UI Changes**: Update modules in `/ui/` directory  
3. **Utility Functions**: Add/modify helpers in `/utils/`
4. **Event Handling**: Update event logic in `/ui/event-handlers.js`
5. **Styling**: All styles are centralized in `/styles/popup.css`
6. **Background Logic**: Modify handlers in `/handlers/` directory

## 📋 Import/Export Pattern

All modules use ES6 imports/exports:

```javascript
// Export (in module file)
export class YahooFinanceAPI { ... }

// Import (in coordinator file)
import { YahooFinanceAPI } from './api/yahoo-finance.js';
```

This modular architecture makes the extension much more maintainable and debuggable! 🎉
