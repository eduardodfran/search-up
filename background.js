// Replace with your actual Gemini API key
const GEMINI_API_KEY = 'AIzaSyDwlmwH5ZHcd_UcF1gcrnwFfZjmpu5FiZI' // Get this from https://aistudio.google.com/app/apikey
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

async function callGeminiAPI(query) {
  try {
    console.log('Calling Gemini API with query:', query)
    console.log('API URL:', GEMINI_API_URL)

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `Please provide a concise answer (2-3 sentences max) to this question: ${query}`,
            },
          ],
        },
      ],
    }

    console.log('Request body:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    console.log('API Response status:', response.status)
    console.log('API Response headers:', response.headers)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Error Response:', errorText)

      // Check for specific error types
      if (response.status === 400) {
        return 'Invalid API request. Please check the query format.'
      } else if (response.status === 403) {
        return "API key is invalid or doesn't have permission."
      } else if (response.status === 404) {
        return 'API endpoint not found. Check the API URL.'
      } else {
        return `API Error (${response.status}): ${errorText}`
      }
    }

    const data = await response.json()
    console.log('API Response data:', JSON.stringify(data, null, 2))

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text
    } else if (data.error) {
      console.error('API returned error:', data.error)
      return `API Error: ${data.error.message || 'Unknown error'}`
    } else {
      console.error('Unexpected response format:', data)
      return 'Received unexpected response format from API.'
    }
  } catch (error) {
    console.error('Network/Fetch error:', error)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return 'Network error: Cannot connect to Gemini API. Check your internet connection.'
    }
    return `Connection error: ${error.message}`
  }
}

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle_search') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'toggle_search_bar' },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                'Error sending message to tab:',
                chrome.runtime.lastError
              )
            }
          }
        )
      }
    })
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.query) {
    // Call the real Gemini API
    callGeminiAPI(message.query)
      .then((answer) => {
        sendResponse(answer)
      })
      .catch((error) => {
        sendResponse('Sorry, there was an error processing your request.')
      })
  }
  return true // Indicates that the response is sent asynchronously
})
