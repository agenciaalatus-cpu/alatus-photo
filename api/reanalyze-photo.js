import { GoogleGenAI } from '@google/genai'
import { generateWithFallback } from './_gemini.js'
import { checkRateLimit, validatePhotoPayload, sanitizeInternalError, applySecurityHeaders } from './_security.js'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
}

export default async function handler(req, res) {
  applySecurityHeaders(res)

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  // Rate Limiting Protection
  const rateLimitResult = checkRateLimit(req)
  if (!rateLimitResult.allowed) {
    res.setHeader('Retry-After', String(rateLimitResult.retryAfter))
    return res.status(429).json({
      success: false,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      error: `Muitas requisições simultâneas. Aguarde ${rateLimitResult.retryAfter}s para nova análise.`
    })
  }

  try {
    const rawData = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const validation = validatePhotoPayload(rawData)
    if (!validation.valid) {
      return res.status(validation.status || 400).json({
        success: false,
        error: validation.error
      })
    }

    const apiKey = rawData.apiKey || process.env.GEMINI_API_KEY

    if (!apiKey) {
      return res.status(401).json({ success: false, errorCode: 'NO_API_KEY', error: 'API Key não configurada.' })
    }

    const { base64Image, mimeType } = validation.data
    const currentAdjustments = rawData.currentAdjustments || {}
    const userFeedback = typeof rawData.userFeedback === 'string' ? rawData.userFeedback.slice(0, 500) : ''
    const ai = new GoogleGenAI({ apiKey })

    const prompt = `Você é um editor fotográfico profissional.
O usuário já aplicou os seguintes ajustes nesta foto:
${JSON.stringify(currentAdjustments, null, 2)}

O usuário solicitou uma REVISÃO/REANÁLISE com a seguinte instrução:
"${userFeedback || 'Refaça a análise com novo equilíbrio'}"

DIRETRIZES DE EQUILÍBRIO DE COR:
- Evite amarelamento excessivo. Se a foto parecer amarelada ou o usuário reclamar de tons quentes/amarelados, reduza a temperature (valores negativos como -50 a -200) e preserve brancos neutros e tons de pele naturais sem saturação excessiva.

Retorne o novo JSON no mesmo formato estrito com "recommended_edit", "reasoning_summary", "confidence", etc.`

    const response = await generateWithFallback(ai, {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
      }
    })

    const rawText = response.text || ''
    let parsed
    try {
      parsed = JSON.parse(rawText)
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
      else throw new Error('Falha ao decodificar JSON de reanálise')
    }

    return res.status(200).json({ success: true, analysis: parsed })
  } catch (err) {
    console.error('Erro na reanálise Gemini Vercel:', err)
    const sanitized = sanitizeInternalError(err)
    return res.status(sanitized.status).json({
      success: false,
      errorCode: sanitized.errorCode,
      error: sanitized.message
    })
  }
}
