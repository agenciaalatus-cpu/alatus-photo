import { PhotoItem } from '../types/photo'
import {
  PhotoQualityScore,
  PhotoFingerprint,
  DuplicateGroup,
  DuplicateGroupItem,
  DuplicateScanResult
} from '../types/duplicate'

/**
 * Calculates discrete Laplacian variance on a grayscale image buffer.
 * Blurry photos have low edge variance; sharp, in-focus photos have high edge variance.
 */
function calculateLaplacianVariance(grayscale: Uint8Array, width: number, height: number): number {
  if (width < 3 || height < 3) return 0

  let sum = 0
  let sumSq = 0
  let count = 0

  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width
    const prevRow = (y - 1) * width
    const nextRow = (y + 1) * width

    for (let x = 1; x < width - 1; x++) {
      const center = grayscale[rowOffset + x]
      const up = grayscale[prevRow + x]
      const down = grayscale[nextRow + x]
      const left = grayscale[rowOffset + x - 1]
      const right = grayscale[rowOffset + x + 1]

      // Laplacian kernel: [0, 1, 0; 1, -4, 1; 0, 1, 0]
      const lap = up + down + left + right - (center * 4)

      sum += lap
      sumSq += lap * lap
      count++
    }
  }

  if (count === 0) return 0
  const mean = sum / count
  const variance = (sumSq / count) - (mean * mean)
  return Math.max(0, variance)
}

/**
 * Computes difference hash (dHash) for an image.
 * Resizes down to 9x8 grayscale and compares adjacent horizontal pixels.
 * Produces a 64-bit fingerprint string.
 */
function computeDHashFromGrayscale(grayscale: Uint8Array, width: number, height: number): string {
  let hash = ''
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width - 1; x++) {
      const left = grayscale[y * width + x]
      const right = grayscale[y * width + (x + 1)]
      hash += left > right ? '1' : '0'
    }
  }
  return hash
}

/**
 * Computes normalized luminance and color histogram vector (32 bins)
 */
function computeHistogram(data: Uint8ClampedArray): number[] {
  const bins = new Array(32).fill(0)
  const total = data.length / 4

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b

    // 16 bins for luminance
    const lumBin = Math.min(15, Math.floor(lum / 16))
    bins[lumBin]++

    // 8 bins for color temperature balance (r vs b)
    const colorDiff = Math.max(0, Math.min(255, (r - b) + 128))
    const colorBin = 16 + Math.min(7, Math.floor(colorDiff / 32))
    bins[colorBin]++

    // 8 bins for green cast
    const greenDiff = Math.max(0, Math.min(255, (g - (r + b) / 2) + 128))
    const greenBin = 24 + Math.min(7, Math.floor(greenDiff / 32))
    bins[greenBin]++
  }

  // Normalize
  return bins.map((val) => val / total)
}

/**
 * Helper to calculate cosine similarity between two histograms
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Calculates Hamming distance between two bitstrings of equal length
 */
function hammingDistance(a: string, b: string): number {
  let dist = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) dist++
  }
  return dist + Math.abs(a.length - b.length)
}

export class DuplicateDetectionService {
  private static fingerprintCache = new Map<string, PhotoFingerprint>()

  /**
   * Computes a full fingerprint and quality score for a PhotoItem
   */
  public static async computeFingerprint(
    photo: PhotoItem,
    providedImg?: HTMLImageElement
  ): Promise<PhotoFingerprint> {
    const cached = this.fingerprintCache.get(photo.id)
    if (cached) return cached

    // Load image into memory
    let img: HTMLImageElement
    if (providedImg && providedImg.complete && providedImg.naturalWidth > 0) {
      img = providedImg
    } else {
      img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = photo.originalUrl
      await new Promise((resolve) => {
        img.onload = () => resolve(true)
        img.onerror = () => resolve(false)
      })
    }

    const width = img.naturalWidth || photo.originalWidth || 1920
    const height = img.naturalHeight || photo.originalHeight || 1080
    const aspectRatio = Number((width / height).toFixed(3))
    const megapixels = Number(((width * height) / 1_000_000).toFixed(2))

    // 1. Off-screen canvas for structural dHash (9x8)
    const hashCanvas = document.createElement('canvas')
    hashCanvas.width = 9
    hashCanvas.height = 8
    const hashCtx = hashCanvas.getContext('2d')

    let dHash = ''
    if (hashCtx) {
      hashCtx.drawImage(img, 0, 0, 9, 8)
      const imgData = hashCtx.getImageData(0, 0, 9, 8)
      const gray = new Uint8Array(9 * 8)
      for (let i = 0; i < imgData.data.length; i += 4) {
        gray[i / 4] = Math.round(
          0.2126 * imgData.data[i] +
          0.7152 * imgData.data[i + 1] +
          0.0722 * imgData.data[i + 2]
        )
      }
      dHash = computeDHashFromGrayscale(gray, 9, 8)
    }

    // 2. Off-screen canvas for Quality & Sharpness analysis (120x120 for fast responsive computation)
    const analysisCanvas = document.createElement('canvas')
    const sampleDim = 120
    analysisCanvas.width = sampleDim
    analysisCanvas.height = sampleDim
    const analysisCtx = analysisCanvas.getContext('2d')

    let qualityScore: PhotoQualityScore = {
      overallScore: 70,
      sharpnessScore: 70,
      exposureScore: 70,
      contrastScore: 70,
      resolutionScore: 70,
      sharpnessLabel: 'Boa',
      exposureLabel: 'Perfeita',
      reasons: []
    }
    let histogram: number[] = new Array(32).fill(0)

    if (analysisCtx) {
      analysisCtx.drawImage(img, 0, 0, sampleDim, sampleDim)
      const sampleData = analysisCtx.getImageData(0, 0, sampleDim, sampleDim)
      const data = sampleData.data

      // Grayscale buffer for Laplacian edge variance
      const grayscale = new Uint8Array(sampleDim * sampleDim)
      let totalLum = 0
      let clippedHighlights = 0
      let crushedShadows = 0

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
        grayscale[i / 4] = Math.round(lum)
        totalLum += lum

        if (lum > 248) clippedHighlights++
        if (lum < 8) crushedShadows++
      }

      const totalPixels = sampleDim * sampleDim
      const meanLum = totalLum / totalPixels
      const highClipRatio = clippedHighlights / totalPixels
      const shadowClipRatio = crushedShadows / totalPixels

      // Laplacian variance for sharpness
      const lapVariance = calculateLaplacianVariance(grayscale, sampleDim, sampleDim)
      
      // Standard deviation of luminance for tonal dynamic range
      let lumVarianceSum = 0
      for (let i = 0; i < grayscale.length; i++) {
        const diff = grayscale[i] - meanLum
        lumVarianceSum += diff * diff
      }
      const lumStdDev = Math.sqrt(lumVarianceSum / totalPixels)

      // Normalize Sharpness Score (0 to 100)
      // Natural photos typically have Laplacian variance between 40 (soft/blurry) and 500+ (pin-sharp)
      let sharpnessScore = Math.min(100, Math.max(10, Math.round((lapVariance / 320) * 100)))
      if (lapVariance > 320) {
        sharpnessScore = Math.min(100, 100)
      }

      let sharpnessLabel: PhotoQualityScore['sharpnessLabel'] = 'Boa'
      if (sharpnessScore >= 85) sharpnessLabel = 'Excelente (Nítida)'
      else if (sharpnessScore >= 65) sharpnessLabel = 'Boa'
      else if (sharpnessScore >= 45) sharpnessLabel = 'Moderada'
      else sharpnessLabel = 'Desfocada / Suave'

      // Normalize Exposure Score (0 to 100)
      // Penalize heavily for blown highlights or crushed blacks, reward midtone balance (100 - 150)
      let exposureScore = 95
      if (highClipRatio > 0.08) exposureScore -= Math.min(40, Math.round(highClipRatio * 200))
      if (shadowClipRatio > 0.12) exposureScore -= Math.min(30, Math.round(shadowClipRatio * 150))
      
      const lumDeviation = Math.abs(meanLum - 128)
      if (lumDeviation > 50) {
        exposureScore -= Math.min(25, Math.round((lumDeviation - 50) * 0.5))
      }
      exposureScore = Math.max(20, Math.min(100, Math.round(exposureScore)))

      let exposureLabel: PhotoQualityScore['exposureLabel'] = 'Perfeita'
      if (highClipRatio > 0.15) exposureLabel = 'Realces Estourados'
      else if (shadowClipRatio > 0.2) exposureLabel = 'Sombras Densas'
      else if (meanLum < 75) exposureLabel = 'Levemente Subexposta'
      else if (meanLum > 180) exposureLabel = 'Levemente Superexposta'

      // Contrast Score
      const contrastScore = Math.max(20, Math.min(100, Math.round((lumStdDev / 64) * 100)))

      // Resolution & File size score
      // Higher MP & size = better uncompressed fidelity
      let resScore = 70
      if (megapixels >= 8) resScore = 95
      else if (megapixels >= 3) resScore = 85
      else if (megapixels >= 1.5) resScore = 75
      else resScore = 55

      // Check if AI analysis provides additional quality signal
      let aiBonus = 0
      if (photo.analysis) {
        if (photo.analysis.composition?.quality === 'good') aiBonus += 4
        if (photo.analysis.lighting?.quality === 'balanced' || photo.analysis.lighting?.quality === 'soft') aiBonus += 4
      }

      // Composite overall score:
      // Nitidez (45%) + Exposição (25%) + Contraste (15%) + Resolução (15%) + AI Bonus
      const weightedScore = (
        sharpnessScore * 0.45 +
        exposureScore * 0.25 +
        contrastScore * 0.15 +
        resScore * 0.15 +
        aiBonus
      )
      const overallScore = Math.min(100, Math.max(10, Math.round(weightedScore)))

      // Formulate clear, readable reasons
      const reasons: string[] = []
      if (sharpnessScore >= 80) reasons.push('Foco cravado e alta nitidez de detalhes')
      else if (sharpnessScore < 50) reasons.push('Leve perda de foco ou tremor de câmera')

      if (exposureScore >= 85) reasons.push('Exposição bem equilibrada sem perda de realces')
      else if (highClipRatio > 0.1) reasons.push('Áreas de luz com estouro de brancos')
      else if (shadowClipRatio > 0.15) reasons.push('Sombras excessivamente densas')

      if (megapixels >= 6) reasons.push(`Resolução nativa completa (${megapixels} MP)`)

      qualityScore = {
        overallScore,
        sharpnessScore,
        exposureScore,
        contrastScore,
        resolutionScore: resScore,
        sharpnessLabel,
        exposureLabel,
        reasons
      }

      histogram = computeHistogram(data)
    }

    const fingerprint: PhotoFingerprint = {
      photoId: photo.id,
      dHash,
      histogram,
      aspectRatio,
      megapixels,
      fileSizeBytes: photo.fileSize || photo.file?.size || 0,
      quality: qualityScore
    }

    this.fingerprintCache.set(photo.id, fingerprint)
    return fingerprint
  }

  /**
   * Calculates similarity percentage (0 to 100%) between two photo fingerprints
   */
  public static calculateSimilarity(fpA: PhotoFingerprint, fpB: PhotoFingerprint): number {
    // 1. Exact match check
    if (fpA.photoId === fpB.photoId) return 100

    // Strict aspect ratio compatibility: if aspect ratio differs by > 10%, not a duplicate
    const ratioDiff = Math.abs(fpA.aspectRatio - fpB.aspectRatio) / Math.max(fpA.aspectRatio, fpB.aspectRatio)
    if (ratioDiff > 0.12) {
      return 0
    }

    // 2. Structural dHash Hamming similarity (64 bits)
    const hashDist = hammingDistance(fpA.dHash, fpB.dHash)
    const maxBits = Math.max(64, fpA.dHash.length)
    const hashSim = Math.max(0, (1 - (hashDist / maxBits)) * 100)

    // 3. Color & Tone histogram cosine similarity
    const histSim = Math.max(0, cosineSimilarity(fpA.histogram, fpB.histogram) * 100)

    // 4. Exact file-level match check (same byte size + same dHash + same resolution)
    if (
      fpA.fileSizeBytes === fpB.fileSizeBytes &&
      fpA.fileSizeBytes > 0 &&
      hashDist <= 1
    ) {
      return 100
    }

    // Weighted composite similarity
    // Structural perception (75%) + Color balance (25%)
    let similarity = (hashSim * 0.75) + (histSim * 0.25)

    // Penalize if dHash difference is significant (> 12 bits out of 64)
    if (hashDist > 12) {
      similarity = Math.min(similarity, 65)
    }

    return Number(Math.max(0, Math.min(100, similarity)).toFixed(1))
  }

  /**
   * Scans a batch of photos, groups duplicates / burst shots, and identifies the best photo in each group.
   * @param photos List of photo items to scan
   * @param sensitivityThreshold Minimum similarity percentage (default: 88%)
   * @param onProgress Optional progress callback
   */
  public static async detectDuplicateGroups(
    photos: PhotoItem[],
    sensitivityThreshold: number = 88,
    onProgress?: (progress: { current: number; total: number; stage: string }) => void
  ): Promise<DuplicateScanResult> {
    if (photos.length < 2) {
      return {
        groups: [],
        totalDuplicatesCount: 0,
        totalSavingsBytes: 0,
        scannedCount: photos.length
      }
    }

    // Step 1: Compute fingerprints for all photos
    const fingerprints: PhotoFingerprint[] = []
    for (let i = 0; i < photos.length; i++) {
      onProgress?.({
        current: i + 1,
        total: photos.length,
        stage: `Analisando nitidez e estrutura da foto ${i + 1} de ${photos.length}...`
      })
      const fp = await this.computeFingerprint(photos[i])
      fingerprints.push(fp)
    }

    onProgress?.({
      current: photos.length,
      total: photos.length,
      stage: 'Comparando similaridade e agrupando duplicadas...'
    })

    // Step 2: Clustering with Connected Components (Union-Find)
    const parent = new Array(photos.length).fill(0).map((_, i) => i)

    const find = (i: number): number => {
      if (parent[i] === i) return i
      parent[i] = find(parent[i])
      return parent[i]
    }

    const union = (i: number, j: number) => {
      const rootI = find(i)
      const rootJ = find(j)
      if (rootI !== rootJ) {
        parent[rootI] = rootJ
      }
    }

    // Compare all pairs
    const pairwiseSimilarity = new Map<string, number>()

    for (let i = 0; i < photos.length; i++) {
      for (let j = i + 1; j < photos.length; j++) {
        const sim = this.calculateSimilarity(fingerprints[i], fingerprints[j])
        pairwiseSimilarity.set(`${i}_${j}`, sim)
        pairwiseSimilarity.set(`${j}_${i}`, sim)

        if (sim >= sensitivityThreshold) {
          union(i, j)
        }
      }
    }

    // Step 3: Group photos by root component
    const clusterMap = new Map<number, number[]>()
    for (let i = 0; i < photos.length; i++) {
      const root = find(i)
      if (!clusterMap.has(root)) {
        clusterMap.set(root, [])
      }
      clusterMap.get(root)!.push(i)
    }

    // Step 4: Process clusters with 2 or more photos
    const groups: DuplicateGroup[] = []
    let totalDuplicatesCount = 0
    let totalSavingsBytes = 0

    let groupCounter = 1

    for (const [, memberIndices] of clusterMap.entries()) {
      if (memberIndices.length < 2) continue

      // Calculate max/avg similarity in cluster
      let maxSim = 0
      for (let i = 0; i < memberIndices.length; i++) {
        for (let j = i + 1; j < memberIndices.length; j++) {
          const sim = pairwiseSimilarity.get(`${memberIndices[i]}_${memberIndices[j]}`) || 0
          if (sim > maxSim) maxSim = sim
        }
      }

      // Sort items by quality score descending (best photo first)
      const groupPhotos = memberIndices.map((idx) => ({
        photo: photos[idx],
        fingerprint: fingerprints[idx]
      }))

      groupPhotos.sort((a, b) => {
        // Compare overall score
        const scoreDiff = b.fingerprint.quality.overallScore - a.fingerprint.quality.overallScore
        if (scoreDiff !== 0) return scoreDiff

        // If score is tied, favor higher sharpness score
        const sharpDiff = b.fingerprint.quality.sharpnessScore - a.fingerprint.quality.sharpnessScore
        if (sharpDiff !== 0) return sharpDiff

        // If still tied, favor higher resolution or file size
        return b.fingerprint.fileSizeBytes - a.fingerprint.fileSizeBytes
      })

      const bestItem = groupPhotos[0]
      const bestScore = bestItem.fingerprint.quality.overallScore

      // Determine group category
      let groupType: DuplicateGroup['type'] = 'near_duplicate'
      if (maxSim >= 99) {
        groupType = 'exact'
      } else if (maxSim >= 88) {
        groupType = 'burst'
      }

      let groupSavings = 0

      const items: DuplicateGroupItem[] = groupPhotos.map((item, index) => {
        const isBest = index === 0
        const selectedForRemoval = !isBest // By default, mark all non-best duplicates for removal

        if (!isBest) {
          groupSavings += item.fingerprint.fileSizeBytes
          totalDuplicatesCount++
        }

        // Formulate clear comparative summary
        let diffSummary = ''
        if (isBest) {
          diffSummary = `⭐ Melhor foto do grupo (${bestScore}/100) • Maior nitidez e fidelidade`
        } else {
          const sharpLoss = bestItem.fingerprint.quality.sharpnessScore - item.fingerprint.quality.sharpnessScore
          if (groupType === 'exact') {
            diffSummary = 'Cópia idêntica redundante'
          } else if (sharpLoss > 15) {
            diffSummary = `Menor nitidez que a principal (-${sharpLoss}% foco)`
          } else if (item.fingerprint.quality.exposureLabel !== 'Perfeita') {
            diffSummary = `Iluminação inferior (${item.fingerprint.quality.exposureLabel.toLowerCase()})`
          } else {
            diffSummary = `Variação de rajada similar (${item.fingerprint.quality.overallScore}/100)`
          }
        }

        return {
          photo: item.photo,
          fingerprint: item.fingerprint,
          isBest,
          selectedForRemoval,
          differenceSummary: diffSummary
        }
      })

      totalSavingsBytes += groupSavings

      groups.push({
        groupId: `dup_group_${groupCounter++}`,
        items,
        bestPhotoId: bestItem.photo.id,
        similarityPercent: maxSim,
        savingsBytes: groupSavings,
        type: groupType
      })
    }

    return {
      groups,
      totalDuplicatesCount,
      totalSavingsBytes,
      scannedCount: photos.length
    }
  }

  /**
   * Clear cached fingerprints
   */
  public static clearCache(): void {
    this.fingerprintCache.clear()
  }
}
