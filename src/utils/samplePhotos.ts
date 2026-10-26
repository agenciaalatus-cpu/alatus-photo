/**
 * Generates realistic canvas sample photos for photographic testing and quality validation:
 * 1. Retrato Pele Clara - Luz de Janela Suave
 * 2. Retrato Pele Negra / Morena - Texturas Ricas & Preservação de Sombras
 * 3. Retrato em Contra-Luz / Pôr do Sol (Golden Hour & Silhueta a Recuperar)
 * 4. Foto Interna com Luz de Tungstênio (Amarelada & Subexposta para teste de neutralização)
 * 5. Paisagem Externa Sol a Pino (Luz dura, alto contraste e céu brilhante)
 * 6. Retrato Estúdio Comercial (Fundo neutro 18%, balanço de estúdio ideal)
 */

export interface SamplePhotoDef {
  name: string
  label: string
  description: string
  skinToneCategory?: 'light' | 'deep' | 'medium' | 'none'
  lightingType: string
  width: number
  height: number
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
}

export const SAMPLE_PHOTO_CATALOG: SamplePhotoDef[] = [
  {
    name: 'IMG_01_Retrato_Pele_Clara_Janela.jpg',
    label: 'Pele Clara • Janela Suave',
    description: 'Iluminação lateral difusa, realces suaves e tons pastéis.',
    skinToneCategory: 'light',
    lightingType: 'soft_window',
    width: 1200,
    height: 900,
    draw: (ctx, w, h) => {
      // Soft ambient room gradient
      const bgGrad = ctx.createLinearGradient(0, 0, w, 0)
      bgGrad.addColorStop(0, '#e8ebf0') // window light side
      bgGrad.addColorStop(0.5, '#c2c9d4')
      bgGrad.addColorStop(1, '#636c7a') // shadow side
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, w, h)

      // Window curtain light beam
      const windowLight = ctx.createLinearGradient(0, 0, w * 0.45, h)
      windowLight.addColorStop(0, 'rgba(255, 255, 255, 0.6)')
      windowLight.addColorStop(1, 'rgba(255, 255, 255, 0.05)')
      ctx.fillStyle = windowLight
      ctx.fillRect(0, 0, w * 0.55, h)

      // Light skin portrait subject (Caucasian / Pale Olive)
      // Base torso
      ctx.fillStyle = '#2c3540'
      ctx.beginPath()
      ctx.moveTo(w * 0.28, h)
      ctx.lineTo(w * 0.5, h * 0.62)
      ctx.lineTo(w * 0.72, h)
      ctx.fill()

      // Neck & Face
      const skinGrad = ctx.createLinearGradient(w * 0.4, h * 0.35, w * 0.6, h * 0.55)
      skinGrad.addColorStop(0, '#f9d8c2') // highlight skin
      skinGrad.addColorStop(0.7, '#e8b89e') // midtone
      skinGrad.addColorStop(1, '#c5947b') // shadow falloff
      ctx.fillStyle = skinGrad
      ctx.beginPath()
      ctx.ellipse(w * 0.5, h * 0.45, 125, 165, 0, 0, Math.PI * 2)
      ctx.fill()

      // Hair
      ctx.fillStyle = '#3a271d'
      ctx.beginPath()
      ctx.arc(w * 0.5, h * 0.38, 140, Math.PI * 0.85, Math.PI * 2.15)
      ctx.fill()
    }
  },
  {
    name: 'IMG_02_Retrato_Pele_Negra_Contraste.jpg',
    label: 'Pele Negra • Tons Ricos & Textura',
    description: 'Iluminação precisa para tons de pele escuros com brilho especular.',
    skinToneCategory: 'deep',
    lightingType: 'rich_specular',
    width: 1200,
    height: 900,
    draw: (ctx, w, h) => {
      // Atmospheric textured background
      const bgGrad = ctx.createLinearGradient(0, 0, w, h)
      bgGrad.addColorStop(0, '#1a1f2c')
      bgGrad.addColorStop(0.6, '#131722')
      bgGrad.addColorStop(1, '#0b0d14')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, w, h)

      // Subtle warm rim light
      const rimLight = ctx.createRadialGradient(w * 0.75, h * 0.35, 10, w * 0.75, h * 0.35, 400)
      rimLight.addColorStop(0, 'rgba(255, 190, 130, 0.35)')
      rimLight.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = rimLight
      ctx.fillRect(0, 0, w, h)

      // Deep rich skin tones (Deep melanin / Black complexion)
      const skinGrad = ctx.createLinearGradient(w * 0.42, h * 0.32, w * 0.62, h * 0.6)
      skinGrad.addColorStop(0, '#5a3825') // Specular high-light
      skinGrad.addColorStop(0.4, '#3f2415') // Rich midtone
      skinGrad.addColorStop(0.85, '#29150b') // Deep tone
      skinGrad.addColorStop(1, '#1b0d06') // Soft shadow
      ctx.fillStyle = skinGrad
      ctx.beginPath()
      ctx.ellipse(w * 0.5, h * 0.46, 130, 175, 0, 0, Math.PI * 2)
      ctx.fill()

      // Cheek & forehead specular catchlight (subtle golden sheen)
      const sheen = ctx.createRadialGradient(w * 0.46, h * 0.4, 5, w * 0.46, h * 0.4, 45)
      sheen.addColorStop(0, 'rgba(180, 125, 90, 0.45)')
      sheen.addColorStop(1, 'rgba(90, 56, 37, 0)')
      ctx.fillStyle = sheen
      ctx.beginPath()
      ctx.ellipse(w * 0.46, h * 0.4, 35, 50, -0.2, 0, Math.PI * 2)
      ctx.fill()

      // Clothing
      ctx.fillStyle = '#0f1724'
      ctx.beginPath()
      ctx.moveTo(w * 0.25, h)
      ctx.lineTo(w * 0.5, h * 0.64)
      ctx.lineTo(w * 0.75, h)
      ctx.fill()
    }
  },
  {
    name: 'IMG_03_Retrato_Contra_Luz_Golden_Hour.jpg',
    label: 'Contra-Luz • Golden Hour',
    description: 'Sol poente atrás do modelo, silhueta com sombras a abrir e altas luzes a salvar.',
    skinToneCategory: 'medium',
    lightingType: 'backlit_golden',
    width: 1200,
    height: 850,
    draw: (ctx, w, h) => {
      // Golden hour sunset sky
      const sunset = ctx.createLinearGradient(0, 0, 0, h)
      sunset.addColorStop(0, '#fca34d')
      sunset.addColorStop(0.3, '#f97316')
      sunset.addColorStop(0.65, '#ea580c')
      sunset.addColorStop(1, '#7c2d12')
      ctx.fillStyle = sunset
      ctx.fillRect(0, 0, w, h)

      // Intense Backlit Sun Halo
      const sunHalo = ctx.createRadialGradient(w * 0.5, h * 0.35, 20, w * 0.5, h * 0.35, 320)
      sunHalo.addColorStop(0, 'rgba(255, 255, 240, 0.95)')
      sunHalo.addColorStop(0.4, 'rgba(254, 215, 170, 0.65)')
      sunHalo.addColorStop(1, 'rgba(234, 88, 12, 0)')
      ctx.fillStyle = sunHalo
      ctx.fillRect(0, 0, w, h)

      // Backlit Silhouette Subject
      ctx.fillStyle = '#26140d'
      ctx.beginPath()
      ctx.ellipse(w * 0.5, h * 0.5, 120, 160, 0, 0, Math.PI * 2)
      ctx.fill()

      // Golden Rim Light on hair & shoulders
      ctx.strokeStyle = 'rgba(255, 237, 213, 0.85)'
      ctx.lineWidth = 9
      ctx.beginPath()
      ctx.arc(w * 0.5, h * 0.44, 126, Math.PI * 0.9, Math.PI * 2.1)
      ctx.stroke()

      // Subject Torso
      ctx.fillStyle = '#1c0f0a'
      ctx.beginPath()
      ctx.moveTo(w * 0.28, h)
      ctx.lineTo(w * 0.5, h * 0.66)
      ctx.lineTo(w * 0.72, h)
      ctx.fill()
    }
  },
  {
    name: 'IMG_04_Indoor_Tungstenio_Subexposto.jpg',
    label: 'Tungstênio • Amarelado & Subexposto',
    description: 'Iluminação amarelada de lâmpada incandescente com -1.2 EV de subexposição.',
    skinToneCategory: 'medium',
    lightingType: 'indoor_tungsten',
    width: 1200,
    height: 900,
    draw: (ctx, w, h) => {
      // Dark room with heavy yellowish cast
      const room = ctx.createLinearGradient(0, 0, w, h)
      room.addColorStop(0, '#241a0d')
      room.addColorStop(0.5, '#1e1408')
      room.addColorStop(1, '#110a04')
      ctx.fillStyle = room
      ctx.fillRect(0, 0, w, h)

      // Intense warm yellow lamp glow
      const lamp = ctx.createRadialGradient(w * 0.72, h * 0.28, 15, w * 0.72, h * 0.28, 380)
      lamp.addColorStop(0, 'rgba(255, 205, 80, 0.55)')
      lamp.addColorStop(0.5, 'rgba(217, 145, 30, 0.25)')
      lamp.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = lamp
      ctx.fillRect(0, 0, w, h)

      // Heavily yellow/orange tinted face
      const face = ctx.createLinearGradient(w * 0.4, h * 0.35, w * 0.65, h * 0.6)
      face.addColorStop(0, '#c98a3c') // warm yellow-orange skin
      face.addColorStop(1, '#7a4e1d')
      ctx.fillStyle = face
      ctx.beginPath()
      ctx.ellipse(w * 0.45, h * 0.5, 115, 155, 0, 0, Math.PI * 2)
      ctx.fill()

      // Dark jacket
      ctx.fillStyle = '#15120c'
      ctx.beginPath()
      ctx.moveTo(w * 0.24, h)
      ctx.lineTo(w * 0.45, h * 0.67)
      ctx.lineTo(w * 0.66, h)
      ctx.fill()
    }
  },
  {
    name: 'IMG_05_Paisagem_Sol_A_Pino_Alto_Contraste.jpg',
    label: 'Sol a Pino • Alto Contraste',
    description: 'Céu quase estourado, sombras duras e folhagem sob meio-dia ensolarado.',
    skinToneCategory: 'none',
    lightingType: 'harsh_midday',
    width: 1200,
    height: 800,
    draw: (ctx, w, h) => {
      // High-key midday sky
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6)
      sky.addColorStop(0, '#f0f5ff')
      sky.addColorStop(0.3, '#d8e7ff')
      sky.addColorStop(1, '#ffffff')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, w, h * 0.6)

      // Blown out overhead sun
      const sun = ctx.createRadialGradient(w * 0.5, h * 0.1, 10, w * 0.5, h * 0.1, 240)
      sun.addColorStop(0, 'rgba(255, 255, 255, 1)')
      sun.addColorStop(0.4, 'rgba(255, 255, 220, 0.7)')
      sun.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = sun
      ctx.fillRect(0, 0, w, h)

      // Harsh rocky mountain with deep pitch-black cast shadows
      ctx.fillStyle = '#414d3b'
      ctx.beginPath()
      ctx.moveTo(0, h * 0.62)
      ctx.lineTo(w * 0.3, h * 0.45)
      ctx.lineTo(w * 0.6, h * 0.6)
      ctx.lineTo(w * 0.85, h * 0.48)
      ctx.lineTo(w, h * 0.65)
      ctx.lineTo(w, h)
      ctx.lineTo(0, h)
      ctx.fill()

      // Deep shadow crevices
      ctx.fillStyle = '#171e14'
      ctx.beginPath()
      ctx.moveTo(w * 0.3, h * 0.45)
      ctx.lineTo(w * 0.45, h * 0.72)
      ctx.lineTo(w * 0.6, h * 0.6)
      ctx.fill()
    }
  },
  {
    name: 'IMG_06_Retrato_Estudio_Comercial_Neutro.jpg',
    label: 'Estúdio • Fundo Neutro 18%',
    description: 'Iluminação calibrada com softbox duplo e temperatura 5600K balanceada.',
    skinToneCategory: 'medium',
    lightingType: 'calibrated_studio',
    width: 1200,
    height: 900,
    draw: (ctx, w, h) => {
      // 18% Neutral Grey Studio backdrop
      const studioBg = ctx.createRadialGradient(w * 0.5, h * 0.42, 40, w * 0.5, h * 0.42, 600)
      studioBg.addColorStop(0, '#757980') // ~18% grey center
      studioBg.addColorStop(0.7, '#474b52')
      studioBg.addColorStop(1, '#2c2f35')
      ctx.fillStyle = studioBg
      ctx.fillRect(0, 0, w, h)

      // Neutral medium skin subject (Hispanic / Mediterranean / Light Tan)
      const skin = ctx.createLinearGradient(w * 0.42, h * 0.35, w * 0.58, h * 0.55)
      skin.addColorStop(0, '#dfab8c')
      skin.addColorStop(0.5, '#c89274')
      skin.addColorStop(1, '#a97357')
      ctx.fillStyle = skin
      ctx.beginPath()
      ctx.ellipse(w * 0.5, h * 0.46, 125, 170, 0, 0, Math.PI * 2)
      ctx.fill()

      // Clean dark navy blazer
      ctx.fillStyle = '#171e29'
      ctx.beginPath()
      ctx.moveTo(w * 0.28, h)
      ctx.lineTo(w * 0.5, h * 0.63)
      ctx.lineTo(w * 0.72, h)
      ctx.fill()
    }
  }
]

/**
 * Creates File instances from all or selected sample photo definitions.
 */
export async function createSamplePhotoFiles(selectedIndices?: number[]): Promise<File[]> {
  const items = selectedIndices 
    ? SAMPLE_PHOTO_CATALOG.filter((_, idx) => selectedIndices.includes(idx))
    : SAMPLE_PHOTO_CATALOG

  const files: File[] = []

  for (const sample of items) {
    const canvas = document.createElement('canvas')
    canvas.width = sample.width
    canvas.height = sample.height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      sample.draw(ctx, sample.width, sample.height)
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
      })
      if (blob) {
        const file = new File([blob], sample.name, { type: 'image/jpeg' })
        files.push(file)
      }
    }
  }

  return files
}

/**
 * Creates a specialized sample photo batch containing duplicate copies and burst shots with varying sharpness
 * Perfect for demonstrating and testing the duplicate detection and "keep best photo" algorithm.
 */
export async function createSampleDuplicatesBatch(): Promise<File[]> {
  const baseFiles = await createSamplePhotoFiles([0, 1, 4])
  const resultFiles: File[] = []

  if (baseFiles.length >= 3) {
    // 1. Group 1: Exact Duplicates (Photo 0)
    resultFiles.push(baseFiles[0])
    resultFiles.push(new File([baseFiles[0]], 'IMG_01_Retrato_Pele_Clara_COPIA_DUPLICADA.jpg', { type: 'image/jpeg' }))

    // 2. Group 2: Burst Shot with sharpness variation (Photo 1 sharp vs Photo 1 slightly blurred)
    resultFiles.push(baseFiles[1])

    // Generate a softer/blurred burst version of Photo 1
    const sampleDef = SAMPLE_PHOTO_CATALOG[1]
    const blurCanvas = document.createElement('canvas')
    blurCanvas.width = sampleDef.width
    blurCanvas.height = sampleDef.height
    const blurCtx = blurCanvas.getContext('2d')
    if (blurCtx) {
      // Draw base
      sampleDef.draw(blurCtx, sampleDef.width, sampleDef.height)
      // Apply slight blur filter simulation (slight motion blur)
      blurCtx.fillStyle = 'rgba(255, 255, 255, 0.04)'
      blurCtx.fillRect(0, 0, sampleDef.width, sampleDef.height)
      const blurBlob = await new Promise<Blob | null>((resolve) => {
        blurCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.82)
      })
      if (blurBlob) {
        resultFiles.push(new File([blurBlob], 'IMG_02_Retrato_Pele_Morena_RAJADA_DESFOQUE.jpg', { type: 'image/jpeg' }))
      }
    }

    // 3. Unique photo (no duplicate)
    resultFiles.push(baseFiles[2])
  }

  return resultFiles
}
