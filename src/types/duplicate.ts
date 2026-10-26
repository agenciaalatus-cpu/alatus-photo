import { PhotoItem } from './photo'

export interface PhotoQualityScore {
  overallScore: number // 0 to 100
  sharpnessScore: number // 0 to 100 (Laplacian variance)
  exposureScore: number // 0 to 100 (absence of clipping & balanced midtones)
  contrastScore: number // 0 to 100 (standard deviation of luminance)
  resolutionScore: number // 0 to 100 (based on megapixels & size)
  sharpnessLabel: 'Excelente (Nítida)' | 'Boa' | 'Moderada' | 'Desfocada / Suave'
  exposureLabel: 'Perfeita' | 'Levemente Subexposta' | 'Levemente Superexposta' | 'Sombras Densas' | 'Realces Estourados'
  reasons: string[]
}

export interface PhotoFingerprint {
  photoId: string
  dHash: string
  histogram: number[]
  aspectRatio: number
  megapixels: number
  fileSizeBytes: number
  quality: PhotoQualityScore
}

export interface DuplicateGroupItem {
  photo: PhotoItem
  fingerprint: PhotoFingerprint
  isBest: boolean
  selectedForRemoval: boolean
  differenceSummary: string
}

export interface DuplicateGroup {
  groupId: string
  items: DuplicateGroupItem[]
  bestPhotoId: string
  similarityPercent: number
  savingsBytes: number
  type: 'exact' | 'near_duplicate' | 'burst'
}

export interface DuplicateScanResult {
  groups: DuplicateGroup[]
  totalDuplicatesCount: number
  totalSavingsBytes: number
  scannedCount: number
}
