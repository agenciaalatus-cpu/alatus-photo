import { AIAnalysisResult, PhotoAdjustments, SAFE_BOUNDS, DEFAULT_ADJUSTMENTS } from '../types/photo'

/**
 * Clamps a numerical value within [min, max]
 */
function clamp(val: number, min: number, max: number): number {
  if (isNaN(val) || val === null || val === undefined) return 0
  return Math.max(min, Math.min(max, val))
}

/**
 * Validates and normalizes Gemini AI recommended edit parameters
 * strictly adhering to safe ranges specified in Section 7 of the specification.
 */
export function validateAndNormalizeAdjustments(raw: any, peoplePresent: boolean = false): PhotoAdjustments {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_ADJUSTMENTS }
  }

  const normalized: PhotoAdjustments = {
    exposure: clamp(Number(raw.exposure ?? 0), SAFE_BOUNDS.exposure.min, SAFE_BOUNDS.exposure.max),
    contrast: clamp(Number(raw.contrast ?? 0), SAFE_BOUNDS.contrast.min, SAFE_BOUNDS.contrast.max),
    highlights: clamp(Number(raw.highlights ?? 0), SAFE_BOUNDS.highlights.min, SAFE_BOUNDS.highlights.max),
    shadows: clamp(Number(raw.shadows ?? 0), SAFE_BOUNDS.shadows.min, SAFE_BOUNDS.shadows.max),
    whites: clamp(Number(raw.whites ?? 0), SAFE_BOUNDS.whites.min, SAFE_BOUNDS.whites.max),
    blacks: clamp(Number(raw.blacks ?? 0), SAFE_BOUNDS.blacks.min, SAFE_BOUNDS.blacks.max),
    temperature: clamp(Number(raw.temperature ?? 0), SAFE_BOUNDS.temperature.min, SAFE_BOUNDS.temperature.max),
    tint: clamp(Number(raw.tint ?? 0), SAFE_BOUNDS.tint.min, SAFE_BOUNDS.tint.max),
    saturation: clamp(Number(raw.saturation ?? 0), SAFE_BOUNDS.saturation.min, SAFE_BOUNDS.saturation.max),
    vibrance: clamp(Number(raw.vibrance ?? 0), SAFE_BOUNDS.vibrance.min, SAFE_BOUNDS.vibrance.max),
    sharpness: clamp(Number(raw.sharpness ?? 0), SAFE_BOUNDS.sharpness.min, SAFE_BOUNDS.sharpness.max),
    noise_reduction: clamp(Number(raw.noise_reduction ?? 0), SAFE_BOUNDS.noise_reduction.min, SAFE_BOUNDS.noise_reduction.max),
    rotation: clamp(Number(raw.rotation ?? raw.straighten_degrees ?? 0), SAFE_BOUNDS.rotation.min, SAFE_BOUNDS.rotation.max)
  }

  // Section 17: Skin preservation rules
  if (peoplePresent) {
    // Avoid artificial orange / hyper-saturated skin
    normalized.saturation = Math.min(normalized.saturation, 12)
    normalized.vibrance = Math.min(normalized.vibrance, 20)
    // Avoid excessive sharpness on human skin
    normalized.sharpness = Math.min(normalized.sharpness, 25)
    // Protect tint from pulling too magenta or green
    normalized.tint = clamp(normalized.tint, -15, 15)
  }

  return normalized
}

/**
 * Validates the full structured JSON response from Gemini
 */
export function validateAIAnalysis(data: any): AIAnalysisResult {
  if (!data || typeof data !== 'object') {
    throw new Error('Formato de resposta inválido recebido da IA.')
  }

  const peoplePresent = Boolean(data.subject?.people || data.subject?.skin_visible)
  const safeEdits = validateAndNormalizeAdjustments(data.recommended_edit, peoplePresent)

  return {
    image_type: String(data.image_type || 'other'),
    environment: String(data.environment || 'indoor'),
    lighting: {
      quality: data.lighting?.quality || 'balanced',
      exposure: clamp(Number(data.lighting?.exposure ?? 0), -2, 2),
      temperature: data.lighting?.temperature || 'neutral'
    },
    subject: {
      people: peoplePresent,
      skin_visible: Boolean(data.subject?.skin_visible)
    },
    composition: {
      quality: data.composition?.quality || 'good',
      crop_recommended: Boolean(data.composition?.crop_recommended),
      straighten_degrees: clamp(Number(data.composition?.straighten_degrees ?? 0), -45, 45)
    },
    recommended_edit: safeEdits,
    style: String(data.style || 'natural'),
    confidence: clamp(Number(data.confidence ?? 0.85), 0.1, 1.0),
    reasoning_summary: String(data.reasoning_summary || 'Análise visual concluída com ajustes otimizados para iluminação e cores.')
  }
}

/**
 * Generates an intelligent heuristic analysis from pixel data
 * Used for instant preview, offline testing, or fallback when API key is missing.
 */
export async function analyzeImageLocally(
  imgElement: HTMLImageElement,
  styleProfile: string = 'natural',
  customInstruction: string = ''
): Promise<AIAnalysisResult> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível inicializar canvas 2D')

  // Sample at 150x150 for ultra-fast metric extraction
  canvas.width = 150
  canvas.height = 150
  ctx.drawImage(imgElement, 0, 0, 150, 150)
  const imgData = ctx.getImageData(0, 0, 150, 150)
  const data = imgData.data

  let totalLum = 0
  let totalR = 0
  let totalG = 0
  let totalB = 0
  let lowLumCount = 0
  let highLumCount = 0
  let warmPixels = 0
  let skinCandidatePixels = 0
  const totalPixels = data.length / 4

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    
    // Perceived luminance formula (ITU-R BT.709)
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    totalLum += lum
    totalR += r
    totalG += g
    totalB += b

    if (lum < 50) lowLumCount++
    if (lum > 215) highLumCount++
    if (r > b + 15) warmPixels++

    // Simple heuristic for human skin color range in RGB
    if (r > 95 && g > 40 && b > 20 && r > g && r > b && (Math.max(r, g, b) - Math.min(r, g, b) > 15) && Math.abs(r - g) > 15) {
      skinCandidatePixels++
    }
  }

  const avgLum = totalLum / totalPixels
  const avgR = totalR / totalPixels
  const avgB = totalB / totalPixels
  const lowRatio = lowLumCount / totalPixels
  const highRatio = highLumCount / totalPixels
  const warmRatio = warmPixels / totalPixels
  const skinRatio = skinCandidatePixels / totalPixels

  // Determine characteristics
  const isDark = avgLum < 95
  const isBright = avgLum > 170
  const isWarm = (avgR - avgB) > 20
  const isCool = (avgB - avgR) > 15
  const hasPeople = skinRatio > 0.08

  // Calculate tailored adjustments
  let exposureAdj = 0
  if (isDark) exposureAdj = clamp((115 - avgLum) / 100 * 0.9, 0.15, 1.1)
  else if (isBright) exposureAdj = clamp((150 - avgLum) / 100 * 0.7, -0.9, -0.1)

  let highlightsAdj = 0
  if (highRatio > 0.15) highlightsAdj = -Math.round(highRatio * 100 * 0.7) // recover highlights

  let shadowsAdj = 0
  if (lowRatio > 0.18) shadowsAdj = Math.round(lowRatio * 100 * 0.6) // lift shadows

  let tempAdj = 0
  if (isCool) {
    // Gently warm cool photos, capped to avoid overshooting
    tempAdj = Math.round(clamp((avgB - avgR) * 6, 0, 140))
  } else if (isWarm) {
    // Neutralize warm / yellowish casts to restore clean whites and faithful skin
    const coolFactor = hasPeople ? 6 : 8
    tempAdj = -Math.round(clamp((avgR - avgB) * coolFactor, 0, 180))
  }

  let contrastAdj = 8
  let vibranceAdj = hasPeople ? 6 : 14
  let saturationAdj = hasPeople ? 2 : 8
  let sharpnessAdj = hasPeople ? 12 : 22
  let noiseReductionAdj = isDark ? 18 : 6

  // Adjust by style profile
  if (styleProfile === 'cinematic') {
    contrastAdj += 10
    highlightsAdj -= 10
    shadowsAdj += 8
    tempAdj += 25
  } else if (styleProfile === 'vibrant') {
    vibranceAdj += 12
    saturationAdj += 8
    contrastAdj += 6
  } else if (styleProfile === 'clean') {
    contrastAdj = 5
    highlightsAdj -= 8
    shadowsAdj += 12
    sharpnessAdj += 6
  }

  const recommended: PhotoAdjustments = {
    exposure: Number(exposureAdj.toFixed(2)),
    contrast: contrastAdj,
    highlights: highlightsAdj,
    shadows: shadowsAdj,
    whites: 4,
    blacks: isDark ? 3 : -4,
    temperature: tempAdj,
    tint: 0,
    saturation: saturationAdj,
    vibrance: vibranceAdj,
    sharpness: sharpnessAdj,
    noise_reduction: noiseReductionAdj,
    rotation: 0
  }

  let reasoning = ''
  if (isDark) reasoning += 'Detectada subexposição com sombras densas; compensado ganho de luz e realce de sombras. '
  else if (isBright) reasoning += 'Cena de alta luminosidade; realces foram preservados para evitar estouro de luz. '
  else reasoning += 'Exposição equilibrada; aplicação de contraste fino e nitidez natural. '

  if (hasPeople) reasoning += 'Preservados tons suaves e fiéis de pele.'

  return {
    image_type: hasPeople ? 'portrait' : (avgLum > 140 ? 'landscape' : 'indoor'),
    environment: isDark ? 'indoor' : (isWarm ? 'golden_hour' : 'outdoor_sunny'),
    lighting: {
      quality: isDark ? 'dim' : (highRatio > 0.25 ? 'harsh' : 'soft'),
      exposure: Number(((avgLum - 128) / 128).toFixed(2)),
      temperature: isWarm ? 'warm' : (isCool ? 'cool' : 'neutral')
    },
    subject: {
      people: hasPeople,
      skin_visible: hasPeople
    },
    composition: {
      quality: 'good',
      crop_recommended: false,
      straighten_degrees: 0
    },
    recommended_edit: validateAndNormalizeAdjustments(recommended, hasPeople),
    style: styleProfile,
    confidence: 0.91,
    reasoning_summary: reasoning.trim(),
    simulated: true
  }
}
