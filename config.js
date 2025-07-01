// Replace with your actual Gemini API key from https://aistudio.google.com/app/apikey
const GEMINI_API_KEY = 'YOUR_ACTUAL_API_KEY_HERE'

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GEMINI_API_KEY }
}
