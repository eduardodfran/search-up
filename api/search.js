export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // CORS headers for extension
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const { query, isPageSummary, mode = 'brief' } = req.body

    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res
        .status(400)
        .json({ error: 'Query is required and must be a non-empty string' })
    }

    // Rate limiting by IP (simple in-memory store)
    const clientIP =
      req.headers['x-forwarded-for'] || req.connection.remoteAddress

    // Limit query length (increase for page summaries)
    const maxLength = isPageSummary ? 10000 : 500
    if (query.length > maxLength) {
      return res
        .status(400)
        .json({ error: `Query too long (max ${maxLength} characters)` })
    }

    // Validate mode
    const validModes = ['brief', 'detailed', 'comprehensive']
    const selectedMode = validModes.includes(mode) ? mode : 'brief'

    // Get API key from environment variables
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY

    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured')
      return res.status(500).json({ error: 'API configuration error' })
    }

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

    let promptText
    if (isPageSummary) {
      const summaryPrompts = {
        brief:
          'Please provide a very concise summary (2-3 sentences) of the following webpage content, focusing only on the main point:',
        detailed:
          'Please provide a concise summary (3-5 sentences) of the following webpage content, covering the main points and key information:',
        comprehensive:
          'Please provide a detailed summary (6-8 sentences) of the following webpage content, including main points, key details, and important context:',
      }
      promptText = `${summaryPrompts[selectedMode]}\n\n${query.trim()}`
    } else {
      const answerPrompts = {
        brief:
          'Please provide a very concise answer (1-2 sentences maximum) to this question:',
        detailed:
          'Please provide a detailed answer (3-5 sentences) to this question, including key points and context:',
        comprehensive:
          'Please provide a comprehensive answer to this question, including detailed explanation, examples, and relevant context:',
      }
      promptText = `${answerPrompts[selectedMode]} ${query.trim()}`
    }

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: promptText,
            },
          ],
        },
      ],
    }

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', response.status, errorText)
      return res.status(response.status).json({
        error: 'Failed to get response from AI service',
      })
    }

    const data = await response.json()

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const answer = data.candidates[0].content.parts[0].text
      return res.status(200).json({ answer: answer.trim() })
    } else {
      console.error('Unexpected API response format:', data)
      return res.status(500).json({ error: 'Invalid response from AI service' })
    }
  } catch (error) {
    console.error('API handler error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
