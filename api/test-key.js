import { GoogleGenAI } from '@google/genai'
import { generateWithFallback } from './_gemini.js'
import { checkRateLimit, sanitizeInternalError, applySecurityHeaders } from './_security.js'

export default async function handler(req, res) {
  applySecurityHeaders(res)

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  // Rate Limiting Protection (max 10 test attempts per minute)
  const rateLimitResult = checkRateLimit(req)
  if (!rateLimitResult.allowed) {
    res.setHeader('Retry-After', String(rateLimitResult.retryAfter))
    return res.status(429).json({
      success: false,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      error: `Muitas tentativas simultâneas. Aguarde ${rateLimitResult.retryAfter}s.`
    })
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
    console.error('Erro na validação de chave:', err)
    const sanitized = sanitizeInternalError(err)
    return res.status(sanitized.status).json({ 
      success: false, 
      errorCode: sanitized.errorCode,
      error: sanitized.message 
    })
  }
}

