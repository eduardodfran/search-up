// Replace with your actual Vercel deployment URL
const BACKEND_URL = 'https://searchup.vercel.app/api/search'

async function callBackendAPI(
  query,
  isPageSummary = false,
  mode = 'brief',
  siteInfo = null
) {
  try {
    console.log(
      'Calling backend API with query:',
      query,
      'mode:',
      mode,
      'siteInfo:',
      siteInfo
    )

    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query.trim(),
        isPageSummary: isPageSummary,
        mode: mode,
        siteInfo: siteInfo,
      }),
    })

    console.log('Backend response status:', response.status)

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: 'Unknown error' }))
      console.error('Backend error:', errorData)

      // Return the specific error message from the API
      return (
        errorData.error ||
        `Server error (${response.status}): Please try again later.`
      )
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

chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command)

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      if (command === 'toggle_search') {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'toggle_search_bar' },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                'Error sending toggle message:',
                chrome.runtime.lastError.message
              )
            } else {
              console.log('Toggle message sent successfully', response)
            }
          }
        )
      } else if (command === 'summarize_page') {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'summarize_page' },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                'Error sending summarize message:',
                chrome.runtime.lastError.message
              )
            } else {
              console.log('Summarize message sent successfully', response)
            }
          }
        )
      }
    } else {
      console.error('No active tab found')
    }
  })
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.query) {
    // Always use site mode when hasPageContext is true
    const effectiveMode = message.hasPageContext ? 'site' : message.mode

    callBackendAPI(
      message.query,
      message.isPageSummary,
      effectiveMode,
      message.siteInfo
    )
      .then((answer) => {
        sendResponse(answer)
      })
      .catch((error) => {
        console.error('API call failed:', error)
        sendResponse('Sorry, there was an error processing your request.')
      })
    return true // Keep the message channel open for async response
  }
})
