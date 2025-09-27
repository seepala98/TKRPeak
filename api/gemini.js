// Gemini AI API Module
// Handles all Gemini AI interactions and content analysis

export class GeminiAPI {
  static async analyzeContent(prompt, url, webContent, apiKey) {
    console.log("🤖 Gemini API: Starting content analysis");
    
    if (!apiKey) {
      throw new Error("Gemini API Key not set. Please configure it in extension options.");
    }

    let fullPrompt = prompt;
    let fetchedWebContent = '';

    // Fetch content from URL if provided
    if (url) {
      try {
        console.log(`🌐 Gemini API: Fetching content from ${url}`);
        const webResponse = await fetch(url);
        if (!webResponse.ok) {
          throw new Error(`Failed to fetch content from ${url}: ${webResponse.statusText}`);
        }
        fetchedWebContent = await webResponse.text();
        console.log(`✅ Fetched content from ${url}. Length: ${fetchedWebContent.length}`);
        fullPrompt += `\n\nPlease analyze the content of the following URL: ${url}`;
        fullPrompt += `\n\nUsing the following webpage content, please analyze the cash flow growth over time, revenues, and EBITDA. Webpage Content: ${fetchedWebContent}`;
      } catch (fetchError) {
        console.error("🚨 Gemini API: Error fetching web content:", fetchError);
        fullPrompt += `\n\nCould not fetch content from ${url}. Please analyze based on general knowledge and the prompt:`;
      }
    } else if (webContent) {
      // Use directly provided web content
      fullPrompt += `\n\nUsing the following webpage content, please analyze the cash flow growth over time, revenues, and EBITDA. Webpage Content: ${webContent}`;
    }

    try {
      const geminiResponse = await this.retry(async () => {
        console.log("🎯 Gemini API: Making request to Gemini 2.0 Flash");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: fullPrompt }]
            }]
          })
        });
        
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error.message || 'Gemini API error');
        }
        return data;
      });

      console.log("✅ Gemini API: Successful response received");
      if (geminiResponse.candidates && geminiResponse.candidates.length > 0) {
        return {
          success: true, 
          response: geminiResponse.candidates[0].content.parts[0].text
        };
      } else {
        throw new Error("No response from Gemini API");
      }
    } catch (error) {
      console.error("❌ Gemini API: Error after retries:", error);
      throw error;
    }
  }

  // Helper function for exponential backoff retry
  static async retry(fn, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error; // Last attempt, re-throw
        
        // Check for specific Gemini quota error and extract retry-after time
        if (error.message && error.message.includes('RESOURCE_EXHAUSTED')) {
          const retryAfterMatch = error.message.match(/retry in (\d+\.?\d*)s/);
          if (retryAfterMatch && retryAfterMatch[1]) {
            const suggestedDelay = parseFloat(retryAfterMatch[1]) * 1000; // Convert to milliseconds
            delay = Math.max(delay, suggestedDelay + 500); // Use suggested delay, plus a buffer
            console.warn(`🔄 Gemini quota exceeded. Retrying after ${delay / 1000} seconds...`);
          } else {
            console.warn(`🔄 Gemini quota exceeded. Retrying after ${delay / 1000} seconds (default)...`);
          }
        } else {
          console.warn(`🔄 API call failed, retrying after ${delay / 1000} seconds...`, error.message);
        }
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
}
