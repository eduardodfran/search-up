const searchUpBar = document.createElement('div')
searchUpBar.id = 'search-up-bar'
searchUpBar.innerHTML = `
  <input type="text" id="search-up-input" placeholder="Search...">
  <div id="search-up-answer"></div>
`
document.body.appendChild(searchUpBar)

const searchUpInput = document.getElementById('search-up-input')
const searchUpAnswer = document.getElementById('search-up-answer')

searchUpInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    const query = e.target.value.trim()
    if (query) {
      searchUpAnswer.innerText = 'Thinking...'
      console.log('Sending query to background:', query) // Debug log
      
      try {
        chrome.runtime.sendMessage({ query }, (response) => {
          console.log('Received response:', response) // Debug log
          if (chrome.runtime.lastError) {
            console.error('Runtime error:', chrome.runtime.lastError)
            searchUpAnswer.innerText = 'Error: Could not get response.'
          } else {
            searchUpAnswer.innerText = response || 'No response received.'
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
      searchUpInput.focus()
      console.log('Search bar shown') // Debug log
    } else {
      searchUpBar.style.display = 'none'
      searchUpInput.value = ''
      searchUpAnswer.innerText = ''
      console.log('Search bar hidden') // Debug log
    }
    sendResponse({ success: true }) // Respond to background script
  }
  return true
})

searchUpBar.style.display = 'none'
