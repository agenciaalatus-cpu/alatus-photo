import { GoogleGenAI } from '@google/genai'
import { generateWithFallback } from './_gemini.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const apiKey = data.apiKey || process.env.GEMINI_API_KEY

    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'Chave Gemini API não informada.' })
    }

    const ai = new GoogleGenAI({ apiKey })
    const response = await generateWithFallback(ai, {
      contents: 'Responda apenas: OK',
    })

    return res.status(200).json({ 
      success: true, 
      message: 'Chave API válida e conectada ao Gemini!', 
      responseText: response.text 
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Erro ao validar chave Gemini.' })
  }
}
