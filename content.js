const searchUpBar = document.createElement('div')
searchUpBar.id = 'search-up-bar'
searchUpBar.innerHTML = `
  <div id="search-up-mode-selector">
    <button class="search-up-mode-btn active" data-mode="brief">Brief</button>
    <button class="search-up-mode-btn" data-mode="detailed">Detailed</button>
    <button class="search-up-mode-btn" data-mode="comprehensive">Full</button>
  </div>
  <div class="search-up-mode-indicator">Mode: Brief (1-2 sentences)</div>
  <input type="text" id="search-up-input" placeholder="Search...">
  <div id="search-up-answer"></div>
  <div id="search-up-actions">
    <button class="search-up-action-btn" id="copy-answer">📋 Copy</button>
    <button class="search-up-action-btn" id="share-answer">📧 Share</button>
    <button class="search-up-action-btn" id="open-tab">🔗 Open</button>
    <button class="search-up-action-btn" id="explain-more">🧠 Explain More</button>
  </div>
`
document.body.appendChild(searchUpBar)

const searchUpInput = document.getElementById('search-up-input')
const searchUpAnswer = document.getElementById('search-up-answer')
const searchUpActions = document.getElementById('search-up-actions')

let currentAnswer = ''
let currentQuery = ''
let selectedMode = 'brief'

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

function showTemporaryFeedback(message) {
  const originalText = document.getElementById('copy-answer').textContent
  document.getElementById('copy-answer').textContent = message
  setTimeout(() => {
    document.getElementById('copy-answer').textContent = originalText
  }, 1500)
}

searchUpInput.addEventListener('keydown', async (e) => {
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
    const query = e.target.value.trim()
    if (query) {
      currentQuery = query
      searchUpAnswer.innerText = 'Thinking...'
      hideActions()
      console.log('Sending query to background:', query, 'Mode:', selectedMode)

      try {
        chrome.runtime.sendMessage(
          { query, mode: selectedMode },
          (response) => {
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
          }
        )
      } catch (error) {
        console.error('Search Up error:', error)
        searchUpAnswer.innerText = 'Error: Could not get response.'
      }
    }
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
  console.log('Content script received message:', message) // Debug log
  if (message.action === 'toggle_search_bar') {
    if (
      searchUpBar.style.display === 'none' ||
      searchUpBar.style.display === ''
    ) {
      searchUpBar.style.display = 'block'
      // Increase delay and ensure proper focus
      setTimeout(() => {
        searchUpInput.focus()
        searchUpInput.select() // Select any existing text
      }, 50)
      console.log('Search bar shown') // Debug log
    } else {
      searchUpBar.style.display = 'none'
      searchUpInput.value = ''
      searchUpAnswer.innerText = ''
      hideActions()
      currentAnswer = ''
      currentQuery = ''
      console.log('Search bar hidden') // Debug log
    }
    sendResponse({ success: true }) // Respond to background script
  } else if (message.action === 'summarize_page') {
    summarizePage()
    sendResponse({ success: true })
  }
  return true
})

searchUpBar.style.display = 'none'

let searchBarVisible = false
let searchBarElement = null

function toggleSearchBar() {
  if (searchBarVisible) {
    hideSearchBar()
  } else {
    showSearchBar()
  }
}

function showSearchBar() {
  if (searchBarElement) {
    searchBarElement.style.display = 'block'
    searchBarElement.querySelector('input').focus()
    searchBarVisible = true
    return
  }

  // Create search bar element
  searchBarElement = createSearchBarElement()
  document.body.appendChild(searchBarElement)
  searchBarElement.querySelector('input').focus()
  searchBarVisible = true
}

function hideSearchBar() {
  if (searchBarElement) {
    searchBarElement.style.display = 'none'
    searchBarVisible = false
  }
}

function createSearchBarElement() {
  const container = document.createElement('div')
  container.className = 'search-up-container'
  container.innerHTML = `
    <div class="search-up-bar">
      <input type="text" placeholder="Ask anything..." class="search-up-input">
      <div class="search-up-result"></div>
    </div>
  `

  const input = container.querySelector('.search-up-input')
  const result = container.querySelector('.search-up-result')

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      handleSearch(input.value.trim(), result)
    } else if (e.key === 'Escape') {
      hideSearchBar()
    }
  })

  return container
}

function handleSearch(query, resultElement) {
  resultElement.textContent = 'Thinking...'
  resultElement.style.display = 'block'

  chrome.runtime.sendMessage({ query }, (response) => {
    if (response) {
      resultElement.textContent = response
    } else {
      resultElement.textContent = 'Sorry, no response received.'
    }
  })
}

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
      query: pageContent,
      isPageSummary: true,
      mode: 'detailed', // Always use detailed mode for summaries
    },
    (response) => {
      if (response) {
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
