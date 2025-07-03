document.addEventListener('DOMContentLoaded', function () {
  // Load current shortcuts
  loadCurrentShortcuts()

  // Setup double-click shortcut recording
  setupShortcutRecording()

  // Toggle search bar button
  document
    .getElementById('toggleSearch')
    .addEventListener('click', function () {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle_search_bar' })
          window.close()
        }
      })
    })

  // Summarize page button
  document
    .getElementById('summarizePage')
    .addEventListener('click', function () {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'summarize_page' })
          window.close()
        }
      })
    })

  // Reset settings button
  document
    .getElementById('resetSettings')
    .addEventListener('click', function () {
      if (confirm('Reset all settings to default?')) {
        chrome.storage.local.clear(function () {
          // Clear shortcuts completely instead of setting defaults
          chrome.storage.sync.remove(
            ['toggle_search', 'summarize_page'],
            function () {
              loadCurrentShortcuts()
              alert(
                'Settings reset successfully! Configure new shortcuts by double-clicking them.'
              )
            }
          )
        })
      }
    })

  // Track donation clicks
  document.querySelector('.paypal-btn').addEventListener('click', function () {
    console.log('Donation link clicked - Thank you for supporting SearchUP!')
  })

  // Load custom API key if present
  chrome.storage.sync.get(['custom_gemini_api_key'], function (result) {
    if (result.custom_gemini_api_key) {
      document.getElementById('custom-api-key').value =
        result.custom_gemini_api_key
    }
  })

  // Save API key button
  document.getElementById('saveApiKey').addEventListener('click', function () {
    const key = document.getElementById('custom-api-key').value.trim()
    chrome.storage.sync.set({ custom_gemini_api_key: key }, function () {
      const status = document.getElementById('api-key-status')
      status.textContent = key ? 'API key saved!' : 'API key cleared.'
      status.style.display = 'block'
      status.style.color = key ? '#4caf50' : '#ff4444'
      setTimeout(() => {
        status.style.display = 'none'
      }, 2000)
    })
  })
})

// Global variables for recording
let isRecording = false
let currentRecordingElement = null
let recordingCommand = null
let recordingTimeout = null

// Load and display current shortcuts
function loadCurrentShortcuts() {
  chrome.storage.sync.get(
    ['toggle_search', 'summarize_page'],
    function (result) {
      const toggleShortcut = result.toggle_search || 'Not configured'
      const summarizeShortcut = result.summarize_page || 'Not configured'

      document.getElementById('toggle-shortcut').textContent = toggleShortcut
      document.getElementById('summarize-shortcut').textContent =
        summarizeShortcut
    }
  )
}

// Setup shortcut recording functionality
function setupShortcutRecording() {
  const toggleElement = document.getElementById('toggle-shortcut')
  const summarizeElement = document.getElementById('summarize-shortcut')

  // Add double-click listeners
  toggleElement.addEventListener('dblclick', function () {
    startRecording(toggleElement, 'toggle_search')
  })

  summarizeElement.addEventListener('dblclick', function () {
    startRecording(summarizeElement, 'summarize_page')
  })

  // Add keydown listener to the document
  document.addEventListener('keydown', handleKeyRecord)
}

function startRecording(element, command) {
  if (isRecording) return

  isRecording = true
  currentRecordingElement = element
  recordingCommand = command

  // Update UI
  element.classList.add('recording')
  element.textContent = 'Recording...'
  document.getElementById('recording-indicator').classList.add('show')

  // Clear any existing timeout
  if (recordingTimeout) {
    clearTimeout(recordingTimeout)
  }

  // Auto-stop recording after 10 seconds
  recordingTimeout = setTimeout(() => {
    if (isRecording) {
      stopRecording(true)
    }
  }, 10000)
}

function stopRecording(cancelled = false) {
  if (!isRecording) return

  isRecording = false

  // Clear timeout
  if (recordingTimeout) {
    clearTimeout(recordingTimeout)
    recordingTimeout = null
  }

  if (currentRecordingElement) {
    currentRecordingElement.classList.remove('recording')

    if (cancelled) {
      // Restore original shortcut
      loadCurrentShortcuts()
    }
  }

  // Hide recording indicator
  document.getElementById('recording-indicator').classList.remove('show')

  currentRecordingElement = null
  recordingCommand = null
}

function handleKeyRecord(event) {
  if (!isRecording || !currentRecordingElement) return

  event.preventDefault()
  event.stopPropagation()

  // Ignore modifier keys by themselves
  const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta']
  if (modifierKeys.includes(event.key)) return

  // Escape cancels recording
  if (event.key === 'Escape') {
    stopRecording(true)
    return
  }

  // Build shortcut string
  const parts = []
  if (event.ctrlKey) parts.push('Ctrl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')
  if (event.metaKey) parts.push('Meta')

  // Add the main key
  let mainKey = event.key.toUpperCase()

  // Handle special keys
  const specialKeys = {
    ' ': 'Space',
    ENTER: 'Enter',
    TAB: 'Tab',
    BACKSPACE: 'Backspace',
    DELETE: 'Delete',
    ARROWUP: 'Up',
    ARROWDOWN: 'Down',
    ARROWLEFT: 'Left',
    ARROWRIGHT: 'Right',
  }

  if (specialKeys[mainKey]) {
    mainKey = specialKeys[mainKey]
  }

  parts.push(mainKey)

  // Require at least one modifier for safety
  if (!event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
    currentRecordingElement.textContent = 'Need modifier key!'
    setTimeout(() => {
      if (currentRecordingElement && isRecording) {
        currentRecordingElement.textContent = 'Recording...'
      }
    }, 1000)
    return
  }

  const shortcut = parts.join('+')
  currentRecordingElement.textContent = shortcut

  // Save the shortcut with proper error handling
  saveShortcut(recordingCommand, shortcut)
}

function saveShortcut(command, shortcut) {
  const updateData = {}
  updateData[command] = shortcut

  // Save to storage first
  chrome.storage.sync.set(updateData, function () {
    if (chrome.runtime.lastError) {
      console.error('Storage error:', chrome.runtime.lastError)
      if (currentRecordingElement) {
        currentRecordingElement.textContent = 'Save failed!'
        currentRecordingElement.style.color = '#ff4444'
      }
      setTimeout(() => stopRecording(true), 2000)
      return
    }

    // Then update background script
    chrome.runtime.sendMessage(
      {
        action: 'updateShortcuts',
        shortcuts: updateData,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Background update error:', chrome.runtime.lastError)
          // Even if background update fails, the shortcut is saved
          // Background will load it on next startup
        }

        if (currentRecordingElement) {
          if (response && response.success) {
            console.log(`Shortcut saved: ${command} = ${shortcut}`)
            currentRecordingElement.style.color = '#4CAF50'
          } else {
            console.log(`Shortcut saved to storage: ${command} = ${shortcut}`)
            currentRecordingElement.style.color = '#4CAF50'
          }

          // Reset color after delay
          setTimeout(() => {
            if (currentRecordingElement) {
              currentRecordingElement.style.color = ''
            }
          }, 2000)
        }

        // Stop recording after successful save
        setTimeout(() => stopRecording(), 1000)
      }
    )
  })
}

// Enhanced cleanup on window unload
window.addEventListener('beforeunload', () => {
  if (isRecording) {
    stopRecording(true)
  }
})

// Handle visibility change (when popup loses focus)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && isRecording) {
    // Don't cancel, just ensure state is preserved
    console.log('Popup hidden while recording, maintaining state')
  }
})
