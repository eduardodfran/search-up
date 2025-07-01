// Replace with your actual Vercel deployment URL
const BACKEND_URL = 'https://searchup.vercel.app/api/search'

async function callBackendAPI(query, isPageSummary = false, mode = 'brief') {
  try {
    console.log('Calling backend API with query:', query, 'mode:', mode)

    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query.trim(),
        isPageSummary: isPageSummary,
        mode: mode,
      }),
    })

    console.log('Backend response status:', response.status)

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: 'Unknown error' }))
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
      return "Sorry, I couldn't generate an answer for that question."
    }
  } catch (error) {
    console.error('Network error:', error)
    return 'Network error: Please check your internet connection and try again.'
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  console.log('Command received:', command)

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!tab || !tab.id) {
      console.error('No active tab found')
      return
    }

    if (command === 'toggle_search') {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'toggle_search_bar',
      })
      console.log('Toggle message sent successfully', response)
    } else if (command === 'summarize_page') {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'summarize_page',
      })
      console.log('Summarize message sent successfully', response)
    }
  } catch (error) {
    console.error('Error sending command message:', error)
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message)

  if (message.query) {
    // Handle async response properly
    ;(async () => {
      try {
        const answer = await callBackendAPI(
          message.query,
          message.isPageSummary,
          message.mode
        )
        console.log('Sending response back:', answer)
        sendResponse(answer)
      } catch (error) {
        console.error('API call failed:', error)
        sendResponse('Sorry, there was an error processing your request.')
      }
    })()

    return true // Keep the message channel open for async response
  }
})
