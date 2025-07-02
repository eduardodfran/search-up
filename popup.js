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
          // Reset shortcuts to default
          const defaultShortcuts = {
            toggle_search: 'Alt+S',
            summarize_page: 'Alt+Shift+S',
          }

          chrome.storage.sync.set(defaultShortcuts, function () {
            loadCurrentShortcuts()
            alert('Settings reset successfully!')
          })
        })
      }
    })

  // Track donation clicks
  document.querySelector('.paypal-btn').addEventListener('click', function () {
    console.log('Donation link clicked - Thank you for supporting SearchUP!')
  })
})

// Global variables for recording
let isRecording = false
let currentRecordingElement = null
let recordingCommand = null

// Load and display current shortcuts
function loadCurrentShortcuts() {
  chrome.storage.sync.get(
    ['toggle_search', 'summarize_page'],
    function (result) {
      const toggleShortcut = result.toggle_search || 'Alt+S'
      const summarizeShortcut = result.summarize_page || 'Alt+Shift+S'

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

  // Auto-stop recording after 10 seconds
  setTimeout(() => {
    if (isRecording) {
      stopRecording(true)
    }
  }, 10000)
}

function stopRecording(cancelled = false) {
  if (!isRecording) return

  isRecording = false

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
      if (currentRecordingElement) {
        currentRecordingElement.textContent = 'Recording...'
      }
    }, 1000)
    return
  }

  const shortcut = parts.join('+')
  currentRecordingElement.textContent = shortcut

  // Save the shortcut
  const updateData = {}
  updateData[recordingCommand] = shortcut

  chrome.storage.sync.set(updateData, function () {
    // Update background script
    chrome.runtime.sendMessage({
      action: 'updateShortcuts',
      shortcuts: updateData,
    })

    console.log(`Shortcut saved: ${recordingCommand} = ${shortcut}`)
  })

  // Stop recording after a short delay
  setTimeout(() => stopRecording(), 1000)
}
