const searchUpBar = document.createElement('div')
searchUpBar.id = 'search-up-bar'
searchUpBar.innerHTML = `
  <div class="search-up-header">
    <div class="search-up-dots">
      <div class="search-up-dots-row">
        <div class="search-up-dot"></div>
        <div class="search-up-dot"></div>
        <div class="search-up-dot"></div>
      </div>
      <div class="search-up-dots-row">
        <div class="search-up-dot"></div>
        <div class="search-up-dot"></div>
      </div>
    </div>
    <div class="search-up-title">SearchUP</div>
  </div>
  <div id="search-up-mode-selector">
    <button class="search-up-mode-btn active" data-mode="brief">Brief</button>
    <button class="search-up-mode-btn" data-mode="detailed">Detailed</button>
    <button class="search-up-mode-btn" data-mode="comprehensive">Full</button>
  </div>
  <div class="search-up-mode-indicator">Mode: Brief (1-2 sentences)</div>
  <div id="search-up-input-container">
    <input type="text" id="search-up-input" placeholder="Search...">
    <button id="search-up-mic-btn" title="Voice search (Click and speak)">🎙️</button>
    <button id="search-up-search-btn" title="Search">🔍</button>
  </div>
  <div id="search-up-answer"></div>
  <div id="search-up-actions">
    <button class="search-up-action-btn" id="copy-answer">📋 Copy</button>
    <button class="search-up-action-btn" id="share-answer">📧 Share</button>
    <button class="search-up-action-btn" id="open-tab">🔗 Open</button>
    <button class="search-up-action-btn" id="explain-more">🧠 Explain More</button>
  </div>
`

// Remove the inline CSS styles to use the external style.css file
document.body.appendChild(searchUpBar)

const searchUpInput = document.getElementById('search-up-input')
const searchUpAnswer = document.getElementById('search-up-answer')
const searchUpActions = document.getElementById('search-up-actions')
const micButton = document.getElementById('search-up-mic-btn')
const searchButton = document.getElementById('search-up-search-btn')

let currentAnswer = ''
let currentQuery = ''
let selectedMode = 'brief'
let currentSiteInfo = null
let recognition = null
let isListening = false
let debounceTimer

// Site detection functionality
function detectCurrentSite() {
  const url = window.location.href
  const hostname = window.location.hostname
  const title = document.title
  const metaDescription =
    document.querySelector('meta[name="description"]')?.content || ''

  // Extract main content for context (limited)
  const mainContent = extractSiteContent()

  return {
    url,
    hostname,
    title,
    description: metaDescription,
    content: mainContent.substring(0, 2000), // Limit content for context
    type: detectSiteType(hostname, url),
  }
}

function detectSiteType(hostname, url) {
  const patterns = {
    'Social Media': [
      'twitter.com',
      'facebook.com',
      'instagram.com',
      'linkedin.com',
      'reddit.com',
    ],
    News: ['cnn.com', 'bbc.com', 'nytimes.com', 'reuters.com', 'npr.org'],
    Shopping: ['amazon.com', 'ebay.com', 'etsy.com', 'shopify.com'],
    Video: ['youtube.com', 'vimeo.com', 'twitch.tv'],
    Documentation: ['docs.', 'wiki', 'github.com'],
    Blog: ['/blog/', 'medium.com', 'wordpress.com', 'blogger.com'],
  }

  for (const [type, domains] of Object.entries(patterns)) {
    if (
      domains.some(
        (domain) => hostname.includes(domain) || url.includes(domain)
      )
    ) {
      return type
    }
  }

  return 'Website'
}

function extractSiteContent() {
  // Try to get main content area
  const mainSelectors = [
    'main',
    'article',
    '[role="main"]',
    '.content',
    '.main-content',
    '#content',
    '#main',
  ]

  for (const selector of mainSelectors) {
    const element = document.querySelector(selector)
    if (element) {
      return element.innerText.trim()
    }
  }

  // Fallback to body content, excluding common navigation/footer elements
  const excludeSelectors =
    'nav, header, footer, .navigation, .sidebar, .ads, .advertisement'
  const content = Array.from(document.body.children)
    .filter((el) => !el.matches(excludeSelectors))
    .map((el) => el.innerText)
    .join(' ')
    .trim()

  return content
}

// Initialize site info on load
currentSiteInfo = detectCurrentSite()

// Initialize speech recognition
function initSpeechRecognition() {
  if (
    !('webkitSpeechRecognition' in window) &&
    !('SpeechRecognition' in window)
  ) {
    micButton.style.display = 'none'
    return
  }

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition
  recognition = new SpeechRecognition()

  recognition.continuous = false
  recognition.interimResults = false
  recognition.lang = 'en-US'

  recognition.onstart = () => {
    isListening = true
    micButton.textContent = '🔴'
    micButton.title = 'Listening... Click to stop'
    searchUpInput.placeholder = 'Listening...'
  }

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript
    searchUpInput.value = transcript
    searchUpInput.focus()

    // Auto-submit if we got a result
    if (transcript.trim()) {
      setTimeout(() => {
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
        })
        searchUpInput.dispatchEvent(enterEvent)
      }, 500)
    }
  }

  recognition.onerror = (event) => {
    console.log('Speech recognition error:', event.error)
    resetMicButton()

    let errorMessage = 'Voice input error'
    switch (event.error) {
      case 'no-speech':
        errorMessage = 'No speech detected'
        break
      case 'network':
        errorMessage = 'Network error'
        break
      case 'not-allowed':
        errorMessage = 'Microphone access denied'
        break
    }

    showTemporaryFeedback(errorMessage, micButton)
  }

  recognition.onend = () => {
    resetMicButton()
  }
}

function resetMicButton() {
  isListening = false
  micButton.textContent = '🎙️'
  micButton.title = 'Voice search (Click and speak)'
  searchUpInput.placeholder = 'Search...'
}

function toggleVoiceInput() {
  if (!recognition) {
    showTemporaryFeedback('Voice input not supported', micButton)
    return
  }

  if (isListening) {
    recognition.stop()
  } else {
    recognition.start()
  }
}

// Initialize speech recognition when content loads
initSpeechRecognition()

// Add mic button event listener
micButton.addEventListener('click', toggleVoiceInput)

// Mode selector functionality
const modeButtons = document.querySelectorAll('.search-up-mode-btn')
const modeIndicator = document.querySelector('.search-up-mode-indicator')

const modeDescriptions = {
  brief: 'Brief (1-2 sentences)',
  detailed: 'Detailed (3-5 sentences)',
  comprehensive: 'Comprehensive (full explanation)',
}

modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const mode = button.dataset.mode
    setMode(mode)
  })
})

function setMode(mode) {
  selectedMode = mode

  // Update active button
  modeButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === mode)
  })

  // Update indicator
  modeIndicator.textContent = `Mode: ${modeDescriptions[mode]}`
}

// Action button event listeners
document.getElementById('copy-answer').addEventListener('click', () => {
  navigator.clipboard
    .writeText(currentAnswer)
    .then(() => {
      showTemporaryFeedback('📋 Copied!')
    })
    .catch(() => {
      showTemporaryFeedback('❌ Copy failed')
    })
})

document.getElementById('share-answer').addEventListener('click', () => {
  const subject = `Answer to: ${currentQuery}`
  const body = `Question: ${currentQuery}\n\nAnswer: ${currentAnswer}`
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`
  window.open(mailtoUrl)
})

document.getElementById('open-tab').addEventListener('click', () => {
  const content = `
    <html>
      <head><title>Search Up Answer</title></head>
      <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px;">
        <h2>Question: ${currentQuery}</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; white-space: pre-wrap;">${currentAnswer}</div>
      </body>
    </html>
  `
  const blob = new Blob([content], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
})

document.getElementById('explain-more').addEventListener('click', () => {
  const followUpQuery = `Please explain more about: ${currentQuery}`
  searchUpInput.value = followUpQuery
  searchUpInput.focus()
  hideActions()
})

function showActions() {
  searchUpActions.classList.add('show')
}

function hideActions() {
  searchUpActions.classList.remove('show')
}

function showTemporaryFeedback(message, targetElement = null) {
  const element = targetElement || document.getElementById('copy-answer')
  const originalText = element.textContent
  element.textContent = message
  setTimeout(() => {
    element.textContent = originalText
  }, 1500)
}

// Add search button event listener
searchButton.addEventListener('click', performSearch)

// Function to perform search
function performSearch() {
  const query = searchUpInput.value.trim()
  if (query) {
    currentQuery = query
    searchUpAnswer.innerText = 'Thinking...'
    hideActions()
    console.log('Sending query to background:', query, 'Mode:', selectedMode)

    try {
      // Always include current page context automatically
      const messageData = {
        query,
        mode: selectedMode,
        siteInfo: currentSiteInfo, // Always send site info for context
        hasPageContext: true, // Flag to indicate we're always including context
      }

      chrome.runtime.sendMessage(messageData, (response) => {
        console.log('Received response:', response)
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError)
          searchUpAnswer.innerText = 'Error: Could not get response.'
        } else {
          currentAnswer = response || 'No response received.'
          searchUpAnswer.innerText = currentAnswer
          // Clear the input and focus for follow-up queries
          searchUpInput.value = ''
          searchUpInput.focus()
          if (currentAnswer && !currentAnswer.startsWith('Error:')) {
            showActions()
          }
        }
      })
    } catch (error) {
      console.error('Search Up error:', error)
      searchUpAnswer.innerText = 'Error: Could not get response.'
    }
  }
}

searchUpInput.addEventListener('keydown', async (e) => {
  // Stop voice input if user starts typing
  if (isListening && e.key !== 'Enter') {
    recognition.stop()
  }

  // Handle mode shortcuts first
  if (e.key === '1' && e.ctrlKey) {
    e.preventDefault()
    setMode('brief')
    return
  }
  if (e.key === '2' && e.ctrlKey) {
    e.preventDefault()
    setMode('detailed')
    return
  }
  if (e.key === '3' && e.ctrlKey) {
    e.preventDefault()
    setMode('comprehensive')
    return
  }

  if (e.key === 'Enter') {
    e.preventDefault()
    performSearch()
  }
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && searchUpBar.style.display === 'block') {
    e.preventDefault()
    searchUpBar.style.display = 'none'
    searchUpInput.value = ''
    searchUpAnswer.innerText = ''
    hideActions()
    currentAnswer = ''
    currentQuery = ''
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message)

  if (message.action === 'toggle_search_bar') {
    const isCurrentlyVisible = searchUpBar.style.display === 'block'

    if (!isCurrentlyVisible) {
      searchUpBar.style.display = 'block'
      setTimeout(() => {
        searchUpInput.focus()
        searchUpInput.select()
      }, 100)
      console.log('Search bar shown')
    } else {
      searchUpBar.style.display = 'none'
      searchUpInput.value = ''
      searchUpAnswer.innerText = ''
      hideActions()
      currentAnswer = ''
      currentQuery = ''
      console.log('Search bar hidden')
    }

    sendResponse({ success: true, visible: !isCurrentlyVisible })
    return true
  }

  if (message.action === 'summarize_page') {
    summarizePage()
    sendResponse({ success: true })
    return true
  }

  return true
})

searchUpBar.style.display = 'none'

function summarizePage() {
  // Extract page content
  const pageContent = extractPageContent()

  if (!pageContent || pageContent.length < 100) {
    showSummaryResult('Not enough content on this page to summarize.')
    return
  }

  // Show loading state
  showSummaryResult('Summarizing page...', true)

  // Send to background script for API call
  chrome.runtime.sendMessage(
    {
      query: `Please provide a concise summary of this webpage content: ${pageContent}`,
      isPageSummary: true,
      mode: 'detailed', // Always use detailed mode for summaries
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError)
        showSummaryResult('Error: Could not generate summary.')
      } else if (response) {
        showSummaryResult(response)
      } else {
        showSummaryResult('Sorry, could not generate a summary.')
      }
    }
  )
}

function extractPageContent() {
  // Get main content, excluding navigation, ads, etc.
  const content = document.body.innerText
  // Limit content length for API
  return content.substring(0, 8000)
}

function showSummaryResult(text, isLoading = false) {
  // Create or update summary display
  let summaryElement = document.querySelector('.search-up-summary')

  if (!summaryElement) {
    summaryElement = document.createElement('div')
    summaryElement.className = 'search-up-summary'
    document.body.appendChild(summaryElement)
  }

  summaryElement.innerHTML = `
    <div class="search-up-summary-content">
      <div class="search-up-summary-header">
        <span>Page Summary</span>
        <button class="search-up-close">×</button>
      </div>
      <div class="search-up-summary-text">${text}</div>
    </div>
  `

  // Add event listener for close button
  const closeButton = summaryElement.querySelector('.search-up-close')
  closeButton.addEventListener('click', () => {
    summaryElement.remove()
  })

  summaryElement.style.display = 'block'

  // Auto-hide after 10 seconds if not loading
  if (!isLoading) {
    setTimeout(() => {
      if (summaryElement) {
        summaryElement.remove()
      }
    }, 10000)
  }
}

function extractPageContent() {
  // Get main content, excluding navigation, ads, etc.
  const content = document.body.innerText
  // Limit content length for API
  return content.substring(0, 8000)
}

function showSummaryResult(text, isLoading = false) {
  // Create or update summary display
  let summaryElement = document.querySelector('.search-up-summary')

  if (!summaryElement) {
    summaryElement = document.createElement('div')
    summaryElement.className = 'search-up-summary'
    document.body.appendChild(summaryElement)
  }

  summaryElement.innerHTML = `
    <div class="search-up-summary-content">
      <div class="search-up-summary-header">
        <span>Page Summary</span>
        <button class="search-up-close">×</button>
      </div>
      <div class="search-up-summary-text">${text}</div>
    </div>
  `

  // Add event listener for close button
  const closeButton = summaryElement.querySelector('.search-up-close')
  closeButton.addEventListener('click', () => {
    summaryElement.remove()
  })

  summaryElement.style.display = 'block'

  // Auto-hide after 10 seconds if not loading
  if (!isLoading) {
    setTimeout(() => {
      if (summaryElement) {
        summaryElement.remove()
      }
    }, 10000)
  }
}
