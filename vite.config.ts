import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { GoogleGenAI } from '@google/genai'

const CANDIDATE_MODELS = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest']

async function generateWithFallback(ai: GoogleGenAI, requestConfig: any) {
  let lastErr = null
  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        ...requestConfig,
        model
      })
      return response
    } catch (err: any) {
      lastErr = err
      console.warn(`Tentativa com ${model} falhou:`, err.message?.substring(0, 100))
    }
  }
  throw lastErr
}

// Backend proxy plugin to securely handle Gemini API calls
function geminiApiPlugin() {
  return {
    name: 'gemini-api-server',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url === '/api/config' && req.method === 'GET') {
          const env = loadEnv('', process.cwd(), '')
          const hasEnvKey = Boolean(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ hasEnvKey }))
          return
        }

        if (req.url === '/api/test-key' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: any) => { body += chunk })
          req.on('end', async () => {
            try {
              const data = body ? JSON.parse(body) : {}
              const env = loadEnv('', process.cwd(), '')
              const apiKey = data.apiKey || env.GEMINI_API_KEY || process.env.GEMINI_API_KEY

              if (!apiKey) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: false, error: 'Chave Gemini API não informada.' }))
                return
              }

              const ai = new GoogleGenAI({ apiKey })
              const response = await generateWithFallback(ai, {
                contents: 'Responda apenas: OK',
              })

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, message: 'Chave API válida e conectada ao Gemini!', responseText: response.text }))
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: err.message || 'Erro ao validar chave Gemini.' }))
            }
          })
          return
        }

        if (req.url === '/api/analyze-photo' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: any) => { body += chunk })
          req.on('end', async () => {
            try {
              const data = JSON.parse(body)
              const env = loadEnv('', process.cwd(), '')
              const apiKey = data.apiKey || env.GEMINI_API_KEY || process.env.GEMINI_API_KEY

              if (!apiKey) {
                res.statusCode = 401
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ 
                  error: 'NO_API_KEY', 
                  message: 'API Key do Gemini não encontrada no servidor nem nas configurações.' 
                }))
                return
              }

              const { base64Image, mimeType, styleProfile, customInstruction } = data
              if (!base64Image) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Nenhuma imagem enviada para análise.' }))
                return
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
              let parsed: any
              try {
                parsed = JSON.parse(rawText)
              } catch (parseErr) {
                const jsonMatch = rawText.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                  parsed = JSON.parse(jsonMatch[0])
                } else {
                  throw new Error('Falha ao interpretar resposta estruturada da IA')
                }
              }

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, analysis: parsed }))
            } catch (err: any) {
              console.error('Erro na análise Gemini:', err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ 
                success: false, 
                error: err.message || 'Erro durante a análise com Gemini' 
              }))
            }
          })
          return
        }

        if (req.url === '/api/reanalyze-photo' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: any) => { body += chunk })
          req.on('end', async () => {
            try {
              const data = JSON.parse(body)
              const env = loadEnv('', process.cwd(), '')
              const apiKey = data.apiKey || env.GEMINI_API_KEY || process.env.GEMINI_API_KEY

              if (!apiKey) {
                res.statusCode = 401
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'NO_API_KEY', message: 'API Key não configurada.' }))
                return
              }

              const { base64Image, mimeType, currentAdjustments, userFeedback } = data
              const ai = new GoogleGenAI({ apiKey })

              const prompt = `Você é um editor fotográfico profissional.
O usuário já aplicou os seguintes ajustes nesta foto:
${JSON.stringify(currentAdjustments, null, 2)}

O usuário solicitou uma REVISÃO/REANÁLISE com a seguinte instrução:
"${userFeedback || 'Refaça a análise com novo equilíbrio'}"

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
              let parsed: any
              try {
                parsed = JSON.parse(rawText)
              } catch (parseErr) {
                const jsonMatch = rawText.match(/\{[\s\S]*\}/)
                if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
                else throw new Error('Falha ao decodificar JSON de reanálise')
              }

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, analysis: parsed }))
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
          return
        }

        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    geminiApiPlugin()
  ],
})
