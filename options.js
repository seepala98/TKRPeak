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
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
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

// Add test buttons for debugging
document.addEventListener('DOMContentLoaded', () => {
    createTestButtons();
});

function createTestButtons() {
    const container = document.querySelector('.container');
    
    // Create test section
    const testSection = document.createElement('div');
    testSection.className = 'section';
    testSection.innerHTML = `
        <h2>🧪 Debugging & Testing</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
            <button id="testFunctionCalling" class="test-btn">🤖 Test Function Calling</button>
            <button id="testToolsDirectly" class="test-btn">🔧 Test Tools Directly</button>
        </div>
        <div id="testResults" class="test-results" style="margin-top: 15px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; font-family: monospace; font-size: 11px; line-height: 1.4; color: rgba(255,255,255,0.8); display: none;"></div>
    `;
    
    // Add CSS for test buttons
    const style = document.createElement('style');
    style.textContent = `
        .test-btn {
            background: rgba(79, 70, 229, 0.2);
            border: 1px solid rgba(79, 70, 229, 0.4);
            color: #6366f1;
            padding: 10px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.2s ease;
        }
        .test-btn:hover {
            background: rgba(79, 70, 229, 0.3);
            transform: translateY(-1px);
        }
        .test-results {
            white-space: pre-wrap;
            max-height: 200px;
            overflow-y: auto;
        }
    `;
    document.head.appendChild(style);
    
    container.appendChild(testSection);
    
    // Add event listeners
    document.getElementById('testFunctionCalling').addEventListener('click', testFunctionCalling);
    document.getElementById('testToolsDirectly').addEventListener('click', testToolsDirectly);
}

async function testFunctionCalling() {
    const resultsEl = document.getElementById('testResults');
    const btn = document.getElementById('testFunctionCalling');
    
    try {
        btn.disabled = true;
        btn.textContent = '🤖 Testing...';
        resultsEl.style.display = 'block';
        resultsEl.textContent = 'Testing Gemini function calling...\n';
        
        const settings = await new Promise(resolve => {
            chrome.storage.sync.get(['geminiApiKey'], resolve);
        });
        
        if (!settings.geminiApiKey) {
            resultsEl.textContent += 'ERROR: Gemini API key not configured\n';
            return;
        }
        
        const response = await fetch('http://localhost:8000/test-function-calling', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `ticker=AAPL&gemini_api_key=${settings.geminiApiKey}`
        });
        
        const result = await response.json();
        
        resultsEl.textContent += `Response: ${response.status}\n`;
        resultsEl.textContent += `Function calls detected: ${result.function_calls_detected || 0}\n`;
        
        if (result.function_calls && result.function_calls.length > 0) {
            resultsEl.textContent += `✅ SUCCESS: Function calling is working!\n`;
            resultsEl.textContent += `Functions called: ${result.function_calls.map(fc => fc.name).join(', ')}\n`;
        } else {
            resultsEl.textContent += `❌ ISSUE: No function calls detected\n`;
            resultsEl.textContent += `Text responses: ${result.text_responses?.length || 0}\n`;
            if (result.text_responses) {
                resultsEl.textContent += `AI said: ${result.text_responses.join(' ')}\n`;
            }
        }
        
        resultsEl.textContent += `\nFull result: ${JSON.stringify(result, null, 2)}\n`;
        
    } catch (error) {
        resultsEl.textContent += `ERROR: ${error.message}\n`;
        resultsEl.textContent += 'Make sure FastAPI service is running: cd financial-api && ./start-api.sh\n';
    } finally {
        btn.disabled = false;
        btn.textContent = '🤖 Test Function Calling';
    }
}

async function testToolsDirectly() {
    const resultsEl = document.getElementById('testResults');
    const btn = document.getElementById('testToolsDirectly');
    
    try {
        btn.disabled = true;
        btn.textContent = '🔧 Testing...';
        resultsEl.style.display = 'block';
        resultsEl.textContent = 'Testing financial analysis tools directly...\n';
        
        const response = await fetch('http://localhost:8000/test-tools', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'ticker=AAPL'
        });
        
        const result = await response.json();
        
        resultsEl.textContent += `Response: ${response.status}\n`;
        resultsEl.textContent += `Available tools: ${result.tool_registry_available?.join(', ') || 'None'}\n\n`;
        
        const toolResults = result.tool_test_results || {};
        
        for (const [toolName, toolResult] of Object.entries(toolResults)) {
            if (toolResult.error) {
                resultsEl.textContent += `❌ ${toolName}: ${toolResult.error}\n`;
            } else {
                resultsEl.textContent += `✅ ${toolName}: SUCCESS\n`;
                if (toolName === 'fetch_quarterly_data') {
                    resultsEl.textContent += `   - Quarters: ${toolResult.quarters}\n`;
                    resultsEl.textContent += `   - Has data: ${toolResult.has_data}\n`;
                }
                if (toolName === 'assess_financial_health') {
                    resultsEl.textContent += `   - Health score: ${toolResult.overall_score}\n`;
                }
            }
        }
        
        resultsEl.textContent += `\nFull result: ${JSON.stringify(result, null, 2)}\n`;
        
    } catch (error) {
        resultsEl.textContent += `ERROR: ${error.message}\n`;
        resultsEl.textContent += 'Make sure FastAPI service is running: cd financial-api && ./start-api.sh\n';
    } finally {
        btn.disabled = false;
        btn.textContent = '🔧 Test Tools Directly';
    }
}