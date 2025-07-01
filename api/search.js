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
    const { query } = req.body

    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res
        .status(400)
        .json({ error: 'Query is required and must be a non-empty string' })
    }

    // Rate limiting by IP (simple in-memory store)
    const clientIP =
      req.headers['x-forwarded-for'] || req.connection.remoteAddress

    // Limit query length
    if (query.length > 500) {
      return res
        .status(400)
        .json({ error: 'Query too long (max 500 characters)' })
    }

    // Get API key from environment variables
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY

    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured')
      return res.status(500).json({ error: 'API configuration error' })
    }

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `Please provide a concise answer (2-3 sentences max) to this question: ${query.trim()}`,
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
