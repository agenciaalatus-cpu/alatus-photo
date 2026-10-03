import JSZip from 'jszip'
import { PhotoItem, AppSettings } from '../types/photo'
import { ImageEditingService } from './imageEditingService'

export interface ExportProgress {
  current: number
  total: number
  currentFilename: string
  percentage: number
}

export class ExportService {
  /**
   * Helper to load an image element from an Object URL
   */
  private static async loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Falha ao carregar imagem para exportação'))
      img.src = url
    })
  }

  /**
   * Generates formatted output filename based on original and user suffix setting
   */
  public static getExportFilename(originalName: string, suffix: string, format: string): string {
    const lastDot = originalName.lastIndexOf('.')
    const base = lastDot > 0 ? originalName.substring(0, lastDot) : originalName
    let ext = 'jpg'
    if (format === 'image/png') ext = 'png'
    else if (format === 'image/webp') ext = 'webp'

    const cleanSuffix = suffix ? suffix.trim() : ''
    return `${base}${cleanSuffix}.${ext}`
  }

  /**
   * Exports a single photo and triggers browser download
   */
  public static async exportSinglePhoto(
    photo: PhotoItem,
    settings: AppSettings
  ): Promise<void> {
    const img = await this.loadImage(photo.originalUrl)
    const quality = settings.exportQuality / 100
    const blob = await ImageEditingService.exportProcessedImage(
      img,
      photo.userAdjustments,
      settings.exportFormat,
      quality
    )

    const filename = this.getExportFilename(photo.filename, settings.exportSuffix, settings.exportFormat)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  /**
   * Exports an entire batch into a ZIP archive with progress reporting
   */
  public static async exportBatchToZip(
    photos: PhotoItem[],
    settings: AppSettings,
    onProgress?: (p: ExportProgress) => void
  ): Promise<void> {
    if (!photos || photos.length === 0) return

    const zip = new JSZip()
    const folder = zip.folder('fotos_editadas_ai') || zip
    const total = photos.length
    const quality = settings.exportQuality / 100

    for (let i = 0; i < total; i++) {
      const photo = photos[i]
      if (onProgress) {
        onProgress({
          current: i + 1,
          total,
          currentFilename: photo.filename,
          percentage: Math.round(((i + 1) / total) * 100)
        })
      }

      try {
        const img = await this.loadImage(photo.originalUrl)
        // If image was only analyzed without edits, apply original; otherwise apply adjustments
        const adjustmentsToApply = photo.isOnlyAnalyzed
          ? { ...photo.userAdjustments, exposure: 0, contrast: 0, highlights: 0, shadows: 0, saturation: 0, vibrance: 0, temperature: 0, tint: 0, whites: 0, blacks: 0, sharpness: 0, noise_reduction: 0 }
          : photo.userAdjustments

        const blob = await ImageEditingService.exportProcessedImage(
          img,
          adjustmentsToApply,
          settings.exportFormat,
          quality
        )

        const exportName = this.getExportFilename(photo.filename, settings.exportSuffix, settings.exportFormat)
        folder.file(exportName, blob)
      } catch (err) {
        console.error(`Erro ao exportar foto ${photo.filename}:`, err)
      }
    }

    const zipContent = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    })

    const zipName = `lote_ai_batch_${new Date().toISOString().slice(0, 10)}.zip`
    const url = URL.createObjectURL(zipContent)
    const link = document.createElement('a')
    link.href = url
    link.download = zipName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }
}
