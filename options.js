// Stock Extension - Options Page Script
// Handles AI configuration settings

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📊 Stock Extension Options page loaded');
    
    // Load saved settings
    await loadSettings();
    
    // Set up event listeners
    setupEventListeners();
});

async function loadSettings() {
    try {
        const settings = await new Promise(resolve => {
            chrome.storage.sync.get(['geminiApiKey', 'useAgenticAnalysis'], resolve);
        });
        
        console.log('📄 Loaded settings:', {
            hasApiKey: !!settings.geminiApiKey,
            useAgentic: settings.useAgenticAnalysis || false
        });
        
        // Populate form fields
        if (settings.geminiApiKey) {
            document.getElementById('geminiApiKey').value = settings.geminiApiKey;
        }
        
        document.getElementById('useAgenticAnalysis').checked = settings.useAgenticAnalysis || false;
        
    } catch (error) {
        console.error('❌ Error loading settings:', error);
        showStatus('Error loading settings', 'error');
    }
}

function setupEventListeners() {
    // Save button
    document.getElementById('saveBtn').addEventListener('click', saveSettings);
    
    // Auto-save on API key change
    document.getElementById('geminiApiKey').addEventListener('input', debounce(saveSettings, 1000));
    
    // Auto-save on checkbox change
    document.getElementById('useAgenticAnalysis').addEventListener('change', saveSettings);
    
    // Check FastAPI connection when agentic analysis is enabled
    document.getElementById('useAgenticAnalysis').addEventListener('change', async (e) => {
        if (e.target.checked) {
            await checkFastAPIConnection();
        }
    });
}

async function saveSettings() {
    try {
        const geminiApiKey = document.getElementById('geminiApiKey').value.trim();
        const useAgenticAnalysis = document.getElementById('useAgenticAnalysis').checked;
        
        // Validate API key format (basic check)
        if (geminiApiKey && !geminiApiKey.startsWith('AIza')) {
            showStatus('⚠️ API key should start with "AIza"', 'error');
            return;
        }
        
        // Save to storage
        await new Promise(resolve => {
            chrome.storage.sync.set({
                geminiApiKey: geminiApiKey,
                useAgenticAnalysis: useAgenticAnalysis
            }, resolve);
        });
        
        console.log('✅ Settings saved:', {
            hasApiKey: !!geminiApiKey,
            useAgentic: useAgenticAnalysis
        });
        
        // Show success message
        const message = geminiApiKey ? 
            '✅ Configuration saved successfully!' : 
            '⚠️ Saved - API key required for AI analysis';
        
        showStatus(message, geminiApiKey ? 'success' : 'error');
        
        // Test API connection if key is provided
        if (geminiApiKey) {
            await testGeminiConnection(geminiApiKey);
        }
        
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        showStatus('❌ Error saving settings', 'error');
    }
}

async function testGeminiConnection(apiKey) {
    try {
        console.log('🧪 Testing Gemini API connection...');
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: "Test connection - respond with 'OK'"
                    }]
                }],
                generationConfig: {
                    maxOutputTokens: 10
                }
            })
        });
        
        if (response.ok) {
            console.log('✅ Gemini API connection successful');
            showStatus('✅ API key validated successfully!', 'success');
        } else if (response.status === 403) {
            console.warn('⚠️ Gemini API key invalid or quota exceeded');
            showStatus('⚠️ Invalid API key or quota exceeded', 'error');
        } else {
            console.warn('⚠️ Gemini API test failed:', response.status);
            showStatus('⚠️ API key saved but connection test failed', 'error');
        }
        
    } catch (error) {
        console.error('❌ Gemini API test error:', error);
        showStatus('⚠️ API key saved but unable to test connection', 'error');
    }
}

async function checkFastAPIConnection() {
    try {
        console.log('🧪 Testing FastAPI connection...');
        
        const response = await fetch('http://localhost:8000/health', {
            method: 'GET',
            timeout: 5000
        });
        
        if (response.ok) {
            const health = await response.json();
            console.log('✅ FastAPI connection successful:', health);
            showStatus('✅ FastAPI service detected - Agentic AI ready!', 'success');
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
        
    } catch (error) {
        console.warn('⚠️ FastAPI connection failed:', error);
        showStatus('⚠️ FastAPI service not detected - using fallback mode', 'error');
        
        // Show instructions for starting FastAPI
        setTimeout(() => {
            showStatus('💡 To enable agentic AI: cd financial-api && ./start-api.sh', 'error');
        }, 3000);
    }
}

function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    
    // Auto-hide success messages
    if (type === 'success') {
        setTimeout(() => {
            statusEl.style.opacity = '0';
        }, 3000);
    }
}

// Utility function to debounce input events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Test agentic analysis button (for debugging)
function createTestButton() {
    const testBtn = document.createElement('button');
    testBtn.textContent = '🧪 Test Agentic Analysis';
    testBtn.style.marginTop = '10px';
    testBtn.style.background = 'rgba(147, 51, 234, 0.2)';
    testBtn.style.border = '1px solid rgba(147, 51, 234, 0.4)';
    testBtn.style.color = '#a78bfa';
    testBtn.style.padding = '8px 16px';
    testBtn.style.borderRadius = '6px';
    testBtn.style.cursor = 'pointer';
    
    testBtn.addEventListener('click', async () => {
        const settings = await new Promise(resolve => {
            chrome.storage.sync.get(['geminiApiKey', 'useAgenticAnalysis'], resolve);
        });
        
        if (!settings.geminiApiKey) {
            showStatus('❌ Gemini API key required', 'error');
            return;
        }
        
        if (!settings.useAgenticAnalysis) {
            showStatus('❌ Agentic analysis not enabled', 'error');
            return;
        }
        
        try {
            showStatus('🤖 Testing agentic analysis...', 'success');
            
            const response = await fetch('http://localhost:8000/agentic-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ticker: 'AAPL',
                    analysis_type: 'quick',
                    focus_areas: ['financial_health'],
                    gemini_api_key: settings.geminiApiKey
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Agentic test result:', result);
                showStatus('✅ Agentic analysis working perfectly!', 'success');
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
            
        } catch (error) {
            console.error('❌ Agentic test failed:', error);
            showStatus('❌ Agentic analysis test failed', 'error');
        }
    });
    
    document.querySelector('.container').appendChild(testBtn);
}

// Add test button in development mode
if (chrome.runtime.getManifest().version.includes('dev')) {
    document.addEventListener('DOMContentLoaded', createTestButton);
}