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
      return res.status(401).json({ 
        error: 'NO_API_KEY', 
        message: 'API Key do Gemini não encontrada no servidor nem nas configurações.' 
      })
    }

    const { base64Image, mimeType, styleProfile, customInstruction } = data
    if (!base64Image) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada para análise.' })
    }

    const ai = new GoogleGenAI({ apiKey })

    const systemPrompt = `Você é um fotógrafo e editor profissional especializado em fotografia de estúdio, documental e tratamento não-destrutivo.
Sua missão é analisar CADA fotografia individualmente e determinar a MELHOR estratégia de ajuste fino para ela.
NÃO use presets genéricos. Avalie com precisão as características específicas da imagem (iluminação, sombras, exposição, balanço de branco, pele, nitidez).

DIRETRIZES FUNDAMENTAIS:
1. PRESERVAÇÃO DE PELE: Se houver pessoas, preserve os tons naturais de pele. NUNCA gere saturação excessiva ou alaranjada artificial, preserve a textura natural e não aumente a nitidez da pele excessivamente.
2. LIMITES SEGUROS:
   - exposure: entre -2.0 e +2.0 (ex: 0.35 para leve subexposição)
   - contrast: entre -50 e +50
   - highlights: entre -100 e +100 (recuperar altas luzes estouradas: valores negativos)
   - shadows: entre -100 e +100 (abrir sombras escuras: valores positivos)
   - whites: entre -100 e +100
   - blacks: entre -100 e +100
   - temperature: entre -1000 e +1000 (Kelvin offset; positivo aquece, negativo esfria)
   - tint: entre -50 e +50 (positivo puxa para magenta, negativo para verde)
   - saturation: entre -50 e +50
   - vibrance: entre -50 e +50
   - sharpness: entre 0 e 100
   - noise_reduction: entre 0 e 100
3. ESTILO SOLICITADO: "${styleProfile || 'natural'}"
4. INSTRUÇÃO DO USUÁRIO: "${customInstruction || 'Edição equilibrada, realista e refinada'}"

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "image_type": "portrait" | "landscape" | "indoor" | "street" | "event" | "macro" | "other",
  "environment": "indoor" | "outdoor_sunny" | "outdoor_cloudy" | "night" | "golden_hour" | "studio",
  "lighting": {
    "quality": "soft" | "harsh" | "diffused" | "backlit" | "dim",
    "exposure": number (-2.0 a 2.0),
    "temperature": "cool" | "neutral" | "warm"
  },
  "subject": {
    "people": boolean,
    "skin_visible": boolean
  },
  "composition": {
    "quality": "good" | "needs_crop" | "distracting_elements",
    "crop_recommended": boolean,
    "straighten_degrees": number (-45 a 45)
  },
  "recommended_edit": {
    "exposure": number,
    "contrast": number,
    "highlights": number,
    "shadows": number,
    "whites": number,
    "blacks": number,
    "temperature": number,
    "tint": number,
    "saturation": number,
    "vibrance": number,
    "sharpness": number,
    "noise_reduction": number
  },
  "style": string,
  "confidence": number (0 a 1),
  "reasoning_summary": string (máximo 2 frases objetivas em português para o usuário)
}`

    const response = await generateWithFallback(ai, {
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
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
      else throw new Error('Falha ao interpretar resposta estruturada da IA')
    }

    return res.status(200).json({ success: true, analysis: parsed })
  } catch (err) {
    console.error('Erro na análise Gemini Vercel:', err)
    return res.status(500).json({ 
      success: false, 
      error: err.message || 'Erro durante a análise com Gemini' 
    })
  }
}
