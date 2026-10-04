import { GoogleGenAI } from '@google/genai'
import { generateWithFallback } from './_gemini.js'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const apiKey = data.apiKey || process.env.GEMINI_API_KEY

    if (!apiKey) {
      return res.status(401).json({ error: 'NO_API_KEY', message: 'API Key não configurada.' })
    }

    const { base64Image, mimeType, currentAdjustments, userFeedback } = data
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
    return res.status(500).json({ success: false, error: err.message })
  }
}
