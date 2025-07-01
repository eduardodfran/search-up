// Replace with your actual Vercel deployment URL
const BACKEND_URL = 'https://your-app-name.vercel.app/api/search'

async function callBackendAPI(query) {
  try {
    console.log('Calling backend API with query:', query)

    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: query.trim() }),
    })

    console.log('Backend response status:', response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('Backend error:', errorData)
      
      if (response.status === 400) {
        return 'Invalid query. Please try a different question.'
      } else if (response.status === 429) {
        return 'Too many requests. Please wait a moment and try again.'
      } else if (response.status >= 500) {
        return 'Service temporarily unavailable. Please try again later.'
      } else {
        return `Error: ${errorData.error || 'Unknown error occurred'}`
      }
    }

    const data = await response.json()
    console.log('Backend response data:', data)

    if (data.answer) {
      return data.answer
    } else {
      return 'Sorry, I couldn\'t generate an answer for that question.'
    }
  } catch (error) {
    console.error('Network error:', error)
    return 'Network error: Please check your internet connection and try again.'
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
    callBackendAPI(message.query)
      .then((answer) => {
        sendResponse(answer)
      })
      .catch((error) => {
        console.error('API call failed:', error)
        sendResponse('Sorry, there was an error processing your request.')
      })
  }
  return true
})
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
