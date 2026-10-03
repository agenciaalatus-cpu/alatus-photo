import { GoogleGenAI } from '@google/genai'

export const CANDIDATE_MODELS = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest']

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
