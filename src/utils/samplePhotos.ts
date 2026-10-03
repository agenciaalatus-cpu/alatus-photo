/**
 * Generates realistic canvas sample photos for demonstration and instant testing:
 * 1. Portrait Indoor: Sub-exposed with warm interior lighting and skin
 * 2. Landscape Outdoor: High-key sunny scene with bright sky
 * 3. Urban Evening: Cool-toned street photography
 * 4. Studio Close-up: Neutral portrait with balanced lighting
 */

export async function createSamplePhotoFiles(): Promise<File[]> {
  const samples = [
    {
      name: 'IMG_2026_Retrato_Indoor.jpg',
      width: 1200,
      height: 900,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // Sub-exposed warm indoor scene
        const grad = ctx.createLinearGradient(0, 0, w, h)
        grad.addColorStop(0, '#1c1512')
        grad.addColorStop(0.5, '#35241b')
        grad.addColorStop(1, '#18120e')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)

        // Warm ambient light from lamp
        const lightGrad = ctx.createRadialGradient(w * 0.75, h * 0.3, 20, w * 0.75, h * 0.3, 350)
        lightGrad.addColorStop(0, 'rgba(255, 185, 110, 0.45)')
        lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = lightGrad
        ctx.fillRect(0, 0, w, h)

        // Subject silhouette & skin tones
        ctx.fillStyle = '#b87d60' // skin base
        ctx.beginPath()
        ctx.ellipse(w * 0.45, h * 0.48, 120, 160, 0, 0, Math.PI * 2)
        ctx.fill()

        // Soft hair
        ctx.fillStyle = '#1a110a'
        ctx.beginPath()
        ctx.arc(w * 0.45, h * 0.42, 135, Math.PI * 0.8, Math.PI * 2.2)
        ctx.fill()

        // Clothing
        ctx.fillStyle = '#222d3b'
        ctx.beginPath()
        ctx.moveTo(w * 0.25, h)
        ctx.lineTo(w * 0.45, h * 0.65)
        ctx.lineTo(w * 0.65, h)
        ctx.fill()
      }
    },
    {
      name: 'IMG_2027_Paisagem_Externa_Sol.jpg',
      width: 1200,
      height: 800,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // High-key bright sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.65)
        skyGrad.addColorStop(0, '#eaf2ff')
        skyGrad.addColorStop(0.4, '#c8dcfa')
        skyGrad.addColorStop(1, '#ffffff') // blown highlight sun
        ctx.fillStyle = skyGrad
        ctx.fillRect(0, 0, w, h * 0.65)

        // Intense Sun Flare
        const sunGrad = ctx.createRadialGradient(w * 0.8, h * 0.2, 10, w * 0.8, h * 0.2, 280)
        sunGrad.addColorStop(0, 'rgba(255, 255, 240, 0.95)')
        sunGrad.addColorStop(0.3, 'rgba(255, 245, 200, 0.6)')
        sunGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.fillStyle = sunGrad
        ctx.fillRect(0, 0, w, h)

        // Rolling Mountains / Hills
        ctx.fillStyle = '#4a5b42'
        ctx.beginPath()
        ctx.moveTo(0, h * 0.65)
        ctx.quadraticCurveTo(w * 0.35, h * 0.52, w * 0.6, h * 0.68)
        ctx.quadraticCurveTo(w * 0.85, h * 0.6, w, h * 0.72)
        ctx.lineTo(w, h)
        ctx.lineTo(0, h)
        ctx.fill()

        // Foreground foliage
        ctx.fillStyle = '#2f3d28'
        ctx.beginPath()
        ctx.moveTo(0, h * 0.78)
        ctx.quadraticCurveTo(w * 0.5, h * 0.7, w, h * 0.85)
        ctx.lineTo(w, h)
        ctx.lineTo(0, h)
        ctx.fill()
      }
    },
    {
      name: 'IMG_2028_Urbano_Noite_Frio.jpg',
      width: 1200,
      height: 900,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // Deep blue dusk
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h)
        bgGrad.addColorStop(0, '#0a101d')
        bgGrad.addColorStop(0.7, '#152136')
        bgGrad.addColorStop(1, '#080c14')
        ctx.fillStyle = bgGrad
        ctx.fillRect(0, 0, w, h)

        // City buildings
        ctx.fillStyle = '#0f1724'
        for (let i = 0; i < 7; i++) {
          const bw = 140 + (i % 3) * 30
          const bh = 300 + (i % 4) * 80
          const bx = i * 170
          ctx.fillRect(bx, h - bh - 100, bw, bh + 100)

          // Window lights
          ctx.fillStyle = i % 2 === 0 ? '#ffea9f' : '#88c0ff'
          for (let wy = h - bh - 60; wy < h - 140; wy += 40) {
            for (let wx = bx + 20; wx < bx + bw - 20; wx += 35) {
              if (Math.random() > 0.4) {
                ctx.fillRect(wx, wy, 15, 20)
              }
            }
          }
          ctx.fillStyle = '#0f1724'
        }

        // Street reflection
        const roadGrad = ctx.createLinearGradient(0, h - 150, 0, h)
        roadGrad.addColorStop(0, '#101520')
        roadGrad.addColorStop(1, '#05070a')
        ctx.fillStyle = roadGrad
        ctx.fillRect(0, h - 150, w, 150)
      }
    },
    {
      name: 'IMG_2029_Retrato_Estudio_Neutro.jpg',
      width: 1200,
      height: 900,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // Clean neutral grey studio background
        const grad = ctx.createRadialGradient(w * 0.5, h * 0.45, 50, w * 0.5, h * 0.45, 550)
        grad.addColorStop(0, '#666b73')
        grad.addColorStop(1, '#33373d')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)

        // Portrait subject
        ctx.fillStyle = '#c79177' // skin tone
        ctx.beginPath()
        ctx.ellipse(w * 0.5, h * 0.45, 130, 175, 0, 0, Math.PI * 2)
        ctx.fill()

        // Clean dark blazer
        ctx.fillStyle = '#17191d'
        ctx.beginPath()
        ctx.moveTo(w * 0.28, h)
        ctx.lineTo(w * 0.5, h * 0.62)
        ctx.lineTo(w * 0.72, h)
        ctx.fill()
      }
    }
  ]

  const files: File[] = []

  for (const sample of samples) {
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
