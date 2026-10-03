import { AIAnalysisResult, PhotoAdjustments, StyleProfile } from '../types/photo'
import { validateAIAnalysis, analyzeImageLocally } from './imageAnalysisService'

export interface AnalyzeOptions {
  apiKey?: string
  styleProfile?: StyleProfile
  customInstruction?: string
  imgElement?: HTMLImageElement
}

/**
 * Converts a File or Blob into a base64 string without data prefix
 */
/**
 * Converts and optimizes an image file into a lightweight base64 string for Gemini analysis,
 * ensuring fast transmission and staying well within Vercel Serverless Function 4.5MB limits.
 */
export async function fileToBase64(file: File | Blob, maxDimension = 1400): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      URL.revokeObjectURL(url)
      let w = img.naturalWidth || 800
      let h = img.naturalHeight || 600

      // Downsample if larger than maxDimension
      if (w > maxDimension || h > maxDimension) {
        const ratio = Math.min(maxDimension / w, maxDimension / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        // Fallback to direct file reader
        directFileReader(file).then(resolve).catch(reject)
        return
      }

      ctx.drawImage(img, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
      if (match) {
        resolve({ mimeType: match[1], base64: match[2] })
      } else {
        directFileReader(file).then(resolve).catch(reject)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      directFileReader(file).then(resolve).catch(reject)
    }
    img.src = url
  })
}

function directFileReader(file: File | Blob): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const match = result.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
      if (match) {
        resolve({ mimeType: match[1], base64: match[2] })
      } else {
        const base64 = result.split(',')[1] || result
        resolve({ mimeType: file.type || 'image/jpeg', base64 })
      }
    }
    reader.onerror = (err) => reject(err)
    reader.readAsDataURL(file)
  })
}

/**
 * Service for communicating with Google Gemini API
 */
export class GeminiService {
  /**
   * Tests if an API key is active and functional
   */
  public static async testApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      })

      const data = await res.json()
      if (!res.ok) {
        return { success: false, message: data.error || 'Erro ao conectar à API do Gemini.' }
      }
      return { success: true, message: data.message || 'Conexão estabelecida com sucesso!' }
    } catch (err: any) {
      return { success: false, message: err.message || 'Falha de rede ao conectar à API.' }
    }
  }

  /**
   * Analyzes an individual photo using Gemini API.
   * If no API key is configured or offline, falls back to the intelligent heuristic engine
   * and flags simulated = true.
   */
  public static async analyzePhoto(
    file: File,
    options: AnalyzeOptions = {},
    retryCount: number = 0
  ): Promise<AIAnalysisResult> {
    const { apiKey, styleProfile = 'natural', customInstruction = '', imgElement } = options

    try {
      const { base64, mimeType } = await fileToBase64(file)

      const response = await fetch('/api/analyze-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-gemini-key': apiKey } : {})
        },
        body: JSON.stringify({
          apiKey,
          base64Image: base64,
          mimeType,
          styleProfile,
          customInstruction,
          filename: file.name
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // If no API key is configured, fallback to high-fidelity heuristic simulation
        if (data.error === 'NO_API_KEY') {
          if (imgElement) {
            const fallbackAnalysis = await analyzeImageLocally(imgElement, styleProfile, customInstruction)
            return fallbackAnalysis
          }
          throw new Error('Chave Gemini API não informada. Configure em Configurações.')
        }

        // Handle rate limits (429) with exponential backoff
        if ((response.status === 429 || data.error?.includes('RESOURCE_EXHAUSTED')) && retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1500
          await new Promise((r) => setTimeout(r, delay))
          return this.analyzePhoto(file, options, retryCount + 1)
        }

        throw new Error(data.error || 'Erro desconhecido na análise da imagem')
      }

      // Validate the structured JSON
      return validateAIAnalysis(data.analysis)
    } catch (err: any) {
      // If server error or offline and we have an image element, fallback gracefully
      if (imgElement && (err.message?.includes('Chave Gemini') || err.message?.includes('Failed to fetch') || err.message?.includes('NO_API_KEY'))) {
        const local = await analyzeImageLocally(imgElement, styleProfile, customInstruction)
        return local
      }

      if (retryCount < 2 && !err.message?.includes('Chave')) {
        await new Promise((r) => setTimeout(r, 1200))
        return this.analyzePhoto(file, options, retryCount + 1)
      }

      throw err
    }
  }

  /**
   * Reanalyzes a photo based on user feedback and existing adjustments
   */
  public static async reanalyzePhoto(
    file: File,
    currentAdjustments: PhotoAdjustments,
    userFeedback: string,
    apiKey?: string,
    imgElement?: HTMLImageElement
  ): Promise<AIAnalysisResult> {
    try {
      const { base64, mimeType } = await fileToBase64(file)

      const response = await fetch('/api/reanalyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          base64Image: base64,
          mimeType,
          currentAdjustments,
          userFeedback
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'NO_API_KEY' && imgElement) {
          // Adjust locally based on feedback
          const feedbackLower = userFeedback.toLowerCase()
          const updated = { ...currentAdjustments }

          if (feedbackLower.includes('cinemat') || feedbackLower.includes('filme')) {
            updated.contrast += 8
            updated.shadows += 6
            updated.temperature += 60
            updated.vibrance += 5
          } else if (feedbackLower.includes('natural') || feedbackLower.includes('menos')) {
            updated.contrast = Math.round(updated.contrast * 0.6)
            updated.saturation = Math.round(updated.saturation * 0.7)
            updated.vibrance = Math.round(updated.vibrance * 0.7)
            updated.sharpness = Math.round(updated.sharpness * 0.8)
          } else if (feedbackLower.includes('quente') || feedbackLower.includes('dourad')) {
            updated.temperature += 150
          } else if (feedbackLower.includes('fria') || feedbackLower.includes('azul')) {
            updated.temperature -= 150
          } else if (feedbackLower.includes('clara') || feedbackLower.includes('exposi')) {
            updated.exposure += 0.25
          }

          return {
            image_type: 'portrait',
            environment: 'indoor',
            lighting: { quality: 'soft', exposure: 0, temperature: 'neutral' },
            subject: { people: true, skin_visible: true },
            composition: { quality: 'good', crop_recommended: false, straighten_degrees: 0 },
            recommended_edit: updated,
            style: 'custom',
            confidence: 0.95,
            reasoning_summary: `Reanálise aplicada: "${userFeedback}" refinando balanço e contraste.`,
            simulated: true
          }
        }
        throw new Error(data.error || 'Erro ao reanalisar foto')
      }

      return validateAIAnalysis(data.analysis)
    } catch (err: any) {
      throw err
    }
  }
}
