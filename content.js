// Content script for Stock Information Chrome Extension - SIMPLIFIED VERSION

console.log("📊 Stock Extension: Content script loaded on", window.location.href);

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("📨 Content script received message:", request);

  if (request.action === "ping") {
    console.log("📡 Content script ping received");
    sendResponse({ success: true, status: "content script loaded" });
    return true;
  }
  
  if (request.action === "getSelectedText") {
    // Get currently selected text on the page
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    console.log("📝 Selected text request - found:", selectedText);
    sendResponse({ 
      success: true, 
      selectedText: selectedText,
      hasSelection: selectedText.length > 0
    });
    return true;
  }

  // For any other actions, just acknowledge
  console.log("❓ Unknown action:", request.action);
  sendResponse({ success: true, message: "Action acknowledged" });
  return true;
});

console.log("✅ Stock Extension: Content script ready");
