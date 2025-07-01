const searchUpBar = document.createElement('div')
searchUpBar.id = 'search-up-bar'
searchUpBar.innerHTML = `
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
  if (e.key === 'Enter') {
    const query = e.target.value.trim()
    if (query) {
      currentQuery = query
      searchUpAnswer.innerText = 'Thinking...'
      hideActions()
      console.log('Sending query to background:', query) // Debug log

      try {
        chrome.runtime.sendMessage({ query }, (response) => {
          console.log('Received response:', response) // Debug log
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
  }
  return true
})

searchUpBar.style.display = 'none'
