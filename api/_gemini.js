import { GoogleGenAI } from '@google/genai'

export const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3-flash-preview',
  'gemini-2.5-pro'
]

export async function generateWithFallback(ai, requestConfig) {
  let lastErr = null
  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        ...requestConfig,
        model
      })
      return response
    } catch (err) {
      lastErr = err
      console.warn(`Tentativa com ${model} falhou:`, err.message?.substring(0, 100))
    }
  }
  throw lastErr
}
