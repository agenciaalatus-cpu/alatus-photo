export type ImageType = 'portrait' | 'landscape' | 'indoor' | 'street' | 'event' | 'macro' | 'product' | 'other'

export type EnvironmentType = 'indoor' | 'outdoor_sunny' | 'outdoor_cloudy' | 'night' | 'golden_hour' | 'studio' | 'mixed'

export type StyleProfile = 'natural' | 'cinematic' | 'vibrant' | 'clean' | 'portrait' | 'event' | 'neutral'

export interface ImageLighting {
  quality: 'soft' | 'harsh' | 'diffused' | 'backlit' | 'dim' | 'balanced'
  exposure: number // -2.0 to 2.0
  temperature: 'cool' | 'neutral' | 'warm'
}

export interface ImageSubject {
  people: boolean
  skin_visible: boolean
}

export interface ImageComposition {
  quality: 'good' | 'needs_crop' | 'distracting_elements' | 'slanted'
  crop_recommended: boolean
  straighten_degrees: number // -45 to 45
}

export interface PhotoAdjustments {
  // Light
  exposure: number       // -2.0 to +2.0
  contrast: number       // -50 to +50
  highlights: number     // -100 to +100
  shadows: number        // -100 to +100
  whites: number         // -100 to +100
  blacks: number         // -100 to +100

  // Color
  temperature: number    // -1000 to +1000 (Kelvin delta)
  tint: number           // -50 to +50
  saturation: number     // -50 to +50
  vibrance: number       // -50 to +50

  // Details
  sharpness: number      // 0 to 100
  noise_reduction: number// 0 to 100

  // Geometry
  rotation?: number      // -180 to 180
  crop?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface AIAnalysisResult {
  image_type: ImageType | string
  environment: EnvironmentType | string
  lighting: ImageLighting
  subject: ImageSubject
  composition: ImageComposition
  recommended_edit: PhotoAdjustments
  style: string
  confidence: number
  reasoning_summary: string
  simulated?: boolean
}

export type ProcessingStatus = 'waiting' | 'analyzing' | 'editing' | 'completed' | 'error'

export interface PhotoItem {
  id: string
  filename: string
  file: File
  originalUrl: string
  originalWidth: number
  originalHeight: number
  fileSize: number
  mimeType: string
  status: ProcessingStatus
  statusMessage?: string
  progress: number // 0 to 100
  analysis?: AIAnalysisResult
  userAdjustments: PhotoAdjustments
  editedUrl?: string
  isOnlyAnalyzed?: boolean
  errorMessage?: string
  lastUpdated?: number
}

export interface BatchSession {
  id: string
  name: string
  date: string
  timestamp: number
  photosCount: number
  totalBytes: number
  status: 'draft' | 'processing' | 'completed' | 'partial_error'
  photos: PhotoItem[]
}

export interface AppSettings {
  geminiApiKey: string
  styleProfile: StyleProfile
  customInstruction: string
  autoEditMode: boolean // Modo IA AUTO
  analysisOnlyMode: boolean // Modo Somente Analisar
  exportQuality: 100 | 90 | 80
  exportFormat: 'image/jpeg' | 'image/png' | 'image/webp'
  exportSuffix: string // e.g. '_AI'
  deleteAfterExport: boolean
  theme: 'dark' | 'light'
  maxConcurrency: number
}

export const DEFAULT_ADJUSTMENTS: PhotoAdjustments = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  saturation: 0,
  vibrance: 0,
  sharpness: 0,
  noise_reduction: 0,
  rotation: 0
}

export const SAFE_BOUNDS = {
  exposure: { min: -2.0, max: 2.0, step: 0.05, unit: 'EV' },
  contrast: { min: -50, max: 50, step: 1, unit: '' },
  highlights: { min: -100, max: 100, step: 1, unit: '' },
  shadows: { min: -100, max: 100, step: 1, unit: '' },
  whites: { min: -100, max: 100, step: 1, unit: '' },
  blacks: { min: -100, max: 100, step: 1, unit: '' },
  temperature: { min: -1000, max: 1000, step: 10, unit: 'K' },
  tint: { min: -50, max: 50, step: 1, unit: '' },
  saturation: { min: -50, max: 50, step: 1, unit: '' },
  vibrance: { min: -50, max: 50, step: 1, unit: '' },
  sharpness: { min: 0, max: 100, step: 1, unit: '' },
  noise_reduction: { min: 0, max: 100, step: 1, unit: '' },
  rotation: { min: -180, max: 180, step: 0.5, unit: '°' }
}
