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

// Store current shortcuts
let currentShortcuts = {
  toggle_search: 'Alt+S',
  summarize_page: 'Alt+Shift+S',
}

// Load saved shortcuts on startup
chrome.storage.sync.get(
  ['toggleShortcut', 'summarizeShortcut'],
  function (result) {
    if (result.toggleShortcut) {
      currentShortcuts.toggle_search = result.toggleShortcut
    }
    if (result.summarizeShortcut) {
      currentShortcuts.summarize_page = result.summarizeShortcut
    }
  }
)

// Listen for shortcut key combinations
document.addEventListener('keydown', function (event) {
  const pressedCombo = getKeyCombo(event)

  if (pressedCombo === currentShortcuts.toggle_search) {
    event.preventDefault()
    executeCommand('toggle_search')
  } else if (pressedCombo === currentShortcuts.summarize_page) {
    event.preventDefault()
    executeCommand('summarize_page')
  }
})

// Get key combination string from event
function getKeyCombo(event) {
  const parts = []

  if (event.ctrlKey) parts.push('Ctrl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')

  if (event.key && event.key.length === 1) {
    parts.push(event.key.toUpperCase())
  } else if (event.key && event.key.startsWith('F')) {
    parts.push(event.key.toUpperCase())
  }

  return parts.join('+')
}

// Execute command function
function executeCommand(command) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      const action =
        command === 'toggle_search' ? 'toggle_search_bar' : 'summarize_page'

      chrome.tabs.sendMessage(tabs[0].id, { action }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            'Error sending message:',
            chrome.runtime.lastError.message
          )
        } else {
          console.log(`${action} message sent successfully`, response)
        }
      })
    }
  })
}

chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command)
  executeCommand(command)
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle shortcut updates
  if (message.action === 'updateShortcuts') {
    currentShortcuts.toggle_search = message.shortcuts.toggle_search
    currentShortcuts.summarize_page = message.shortcuts.summarize_page
    sendResponse({ success: true })
    return true
  }

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
