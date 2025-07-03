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

// Store custom API key in memory for fast access
let customGeminiApiKey = null

// Load custom API key on startup and when changed
function loadCustomApiKey() {
  chrome.storage.sync.get(['custom_gemini_api_key'], function (result) {
    customGeminiApiKey = result.custom_gemini_api_key || null
  })
}
loadCustomApiKey()
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.custom_gemini_api_key) {
    customGeminiApiKey = changes.custom_gemini_api_key.newValue || null
  }
})

// Store current shortcuts - start with empty/null values
let currentShortcuts = {
  toggle_search: null,
  summarize_page: null,
}

let shortcutsLoaded = false

// Enhanced shortcut loading with retry mechanism
function loadShortcuts(retryCount = 0) {
  chrome.storage.sync.get(
    ['toggle_search', 'summarize_page'],
    function (result) {
      if (chrome.runtime.lastError) {
        console.error('Error loading shortcuts:', chrome.runtime.lastError)
        if (retryCount < 3) {
          setTimeout(() => loadShortcuts(retryCount + 1), 1000)
        }
        return
      }

      currentShortcuts.toggle_search = result.toggle_search || null
      currentShortcuts.summarize_page = result.summarize_page || null
      shortcutsLoaded = true

      console.log('Shortcuts loaded successfully:', currentShortcuts)

      // Immediately apply to all existing tabs
      applyShortcutsToAllTabs()
    }
  )
}

// Apply shortcuts to all existing tabs
function applyShortcutsToAllTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (
        tab.url &&
        !tab.url.startsWith('chrome://') &&
        !tab.url.startsWith('chrome-extension://') &&
        !tab.url.startsWith('moz-extension://')
      ) {
        injectShortcuts(tab.id)
      }
    })
  })
}

// Load shortcuts on startup
loadShortcuts()

// Enhanced function to inject shortcuts into a tab
function injectShortcuts(tabId, retryCount = 0) {
  if (!shortcutsLoaded) {
    // Wait for shortcuts to load before injecting
    setTimeout(() => injectShortcuts(tabId, retryCount), 500)
    return
  }

  const hasShortcuts =
    currentShortcuts.toggle_search || currentShortcuts.summarize_page

  const shortcutCode = `
    (function() {
      // Always remove existing listener to prevent duplicates
      if (window.searchUpKeyHandler) {
        document.removeEventListener('keydown', window.searchUpKeyHandler, true);
        window.searchUpKeyHandler = null;
      }
      
      // Clear the listener flag
      window.searchUpKeyListener = false;
      
      // Clear previous shortcuts reference
      window.searchUpShortcuts = null;
      
      ${
        !hasShortcuts
          ? 'console.log("No SearchUP shortcuts configured"); return;'
          : ''
      }
      
      // Store current shortcuts for debugging
      window.searchUpShortcuts = {
        toggle_search: '${currentShortcuts.toggle_search || ''}',
        summarize_page: '${currentShortcuts.summarize_page || ''}'
      };
      
      // Define the key handler function - only for current shortcuts
      window.searchUpKeyHandler = function(event) {
        const pressedCombo = getKeyCombo(event);
        let handled = false;
        
        ${
          currentShortcuts.toggle_search
            ? `if (pressedCombo === '${currentShortcuts.toggle_search}') {
              event.preventDefault();
              event.stopPropagation();
              chrome.runtime.sendMessage({
                action: 'shortcut_pressed',
                shortcut: pressedCombo,
                command: 'toggle_search'
              });
              handled = true;
            }`
            : ''
        }
        ${
          currentShortcuts.summarize_page
            ? `if (pressedCombo === '${currentShortcuts.summarize_page}') {
              event.preventDefault();
              event.stopPropagation();
              chrome.runtime.sendMessage({
                action: 'shortcut_pressed',
                shortcut: pressedCombo,
                command: 'summarize_page'
              });
              handled = true;
            }`
            : ''
        }
        
        if (handled) {
          console.log('SearchUP shortcut handled:', pressedCombo);
        }
      };
      
      function getKeyCombo(event) {
        const parts = [];
        if (event.ctrlKey) parts.push('Ctrl');
        if (event.altKey) parts.push('Alt');
        if (event.shiftKey) parts.push('Shift');
        if (event.metaKey) parts.push('Meta');
        
        let mainKey = event.key;
        if (mainKey.length === 1) {
          mainKey = mainKey.toUpperCase();
        }
        
        const specialKeys = {
          ' ': 'Space',
          'Enter': 'Enter',
          'Tab': 'Tab',
          'Backspace': 'Backspace',
          'Delete': 'Delete',
          'ArrowUp': 'Up',
          'ArrowDown': 'Down',
          'ArrowLeft': 'Left',
          'ArrowRight': 'Right',
        };
        
        if (specialKeys[mainKey]) {
          mainKey = specialKeys[mainKey];
        }
        
        parts.push(mainKey);
        return parts.join('+');
      }
      
      // Add the new listener only if we have shortcuts
      if (window.searchUpShortcuts.toggle_search || window.searchUpShortcuts.summarize_page) {
        document.addEventListener('keydown', window.searchUpKeyHandler, true);
        window.searchUpKeyListener = true;
        console.log('SearchUP shortcuts activated:', window.searchUpShortcuts);
      }
    })();
  `

  chrome.tabs.executeScript(tabId, { code: shortcutCode }, (result) => {
    if (chrome.runtime.lastError) {
      console.log(
        'Could not inject shortcuts into tab:',
        chrome.runtime.lastError.message
      )

      // Retry for certain errors
      if (
        retryCount < 2 &&
        (chrome.runtime.lastError.message.includes('loading') ||
          chrome.runtime.lastError.message.includes('frame'))
      ) {
        setTimeout(() => injectShortcuts(tabId, retryCount + 1), 1000)
      }
    } else {
      console.log('Shortcuts successfully injected into tab:', tabId)
    }
  })
}

// Enhanced tab update listener
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && shortcutsLoaded) {
    // Small delay to ensure page is fully loaded
    setTimeout(() => injectShortcuts(tabId), 100)
  }
})

// Listen for tab activation to ensure shortcuts are present
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (shortcutsLoaded) {
    setTimeout(() => injectShortcuts(activeInfo.tabId), 100)
  }
})

// Handle shortcut key combinations from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'shortcut_pressed') {
    console.log('Shortcut pressed:', message.command || message.shortcut)

    const command =
      message.command ||
      (message.shortcut === currentShortcuts.toggle_search
        ? 'toggle_search'
        : message.shortcut === currentShortcuts.summarize_page
        ? 'summarize_page'
        : null)

    if (command) {
      executeCommand(command)
    }
    sendResponse({ success: true })
    return true
  }

  // Handle shortcut updates from popup
  if (message.action === 'updateShortcuts') {
    // Update shortcuts immediately
    if (message.shortcuts.toggle_search !== undefined) {
      currentShortcuts.toggle_search = message.shortcuts.toggle_search
    }
    if (message.shortcuts.summarize_page !== undefined) {
      currentShortcuts.summarize_page = message.shortcuts.summarize_page
    }

    console.log('Updated shortcuts:', currentShortcuts)

    // Force re-injection to all tabs to clear old shortcuts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (
          tab.url &&
          !tab.url.startsWith('chrome://') &&
          !tab.url.startsWith('chrome-extension://') &&
          !tab.url.startsWith('moz-extension://')
        ) {
          // Force re-injection with a small delay to ensure proper cleanup
          setTimeout(() => injectShortcuts(tab.id), 50)
        }
      })
    })

    sendResponse({ success: true })
    return true
  }

  if (message.query) {
    // Always use site mode when hasPageContext is true
    const effectiveMode = message.hasPageContext ? 'site' : message.mode

    // Pass custom API key if present
    const apiKeyToUse = customGeminiApiKey || undefined

    callBackendAPIWithApiKey(
      message.query,
      message.isPageSummary,
      effectiveMode,
      message.siteInfo,
      apiKeyToUse
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

// Execute command function
function executeCommand(command) {
  console.log('Executing command:', command)
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      const action =
        command === 'toggle_search' ? 'toggle_search_bar' : 'summarize_page'

      console.log('Sending message to tab:', tabs[0].id, 'action:', action)
      console.log('Tab URL:', tabs[0].url)

      // Check if we can send messages to this tab
      if (
        tabs[0].url.startsWith('chrome://') ||
        tabs[0].url.startsWith('chrome-extension://')
      ) {
        console.log('Cannot send message to chrome:// or extension pages')
        return
      }

      // Try to send the message, if it fails, inject content script and retry
      chrome.tabs.sendMessage(tabs[0].id, { action }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            'Error sending message:',
            chrome.runtime.lastError.message
          )
          // Try to inject content script and resend
          chrome.scripting
            ? chrome.scripting.executeScript(
                {
                  target: { tabId: tabs[0].id },
                  files: ['content.js'],
                },
                () => {
                  // Wait for content script to initialize before sending the message
                  setTimeout(() => {
                    chrome.tabs.sendMessage(tabs[0].id, { action }, (resp2) => {
                      if (chrome.runtime.lastError) {
                        console.error(
                          'Retry failed:',
                          chrome.runtime.lastError.message
                        )
                      } else {
                        console.log(
                          'Message sent after injecting content.js',
                          resp2
                        )
                      }
                    })
                  }, 200) // Wait 200ms before retrying
                }
              )
            : chrome.tabs.executeScript(
                tabs[0].id,
                { file: 'content.js' },
                () => {
                  // Wait for content script to initialize before sending the message
                  setTimeout(() => {
                    chrome.tabs.sendMessage(tabs[0].id, { action }, (resp2) => {
                      if (chrome.runtime.lastError) {
                        console.error(
                          'Retry failed:',
                          chrome.runtime.lastError.message
                        )
                      } else {
                        console.log(
                          'Message sent after injecting content.js',
                          resp2
                        )
                      }
                    })
                  }, 200) // Wait 200ms before retrying
                }
              )
        } else {
          console.log(`${action} message sent successfully`, response)
        }
      })
    } else {
      console.log('No active tab found')
    }
  })
}

// Wrapper to allow passing custom API key
async function callBackendAPIWithApiKey(
  query,
  isPageSummary = false,
  mode = 'brief',
  siteInfo = null,
  customApiKey = undefined
) {
  try {
    console.log(
      'API Key being used:',
      customApiKey ? 'Custom API Key' : 'Default Backend Key'
    )
    console.log('Custom API Key present:', !!customApiKey)

    const body = {
      query: query.trim(),
      isPageSummary: isPageSummary,
      mode: mode,
      siteInfo: siteInfo,
    }
    if (customApiKey) {
      body.customApiKey = customApiKey
    }
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: 'Unknown error' }))
      console.error('Backend error:', errorData)
      return (
        errorData.error ||
        `Server error (${response.status}): Please try again later.`
      )
    }
    const data = await response.json()
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
