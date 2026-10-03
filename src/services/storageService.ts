import { AppSettings, BatchSession } from '../types/photo'

const SETTINGS_KEY = 'ai_photo_editor_settings_v1'
const HISTORY_KEY = 'ai_photo_editor_history_v1'

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  styleProfile: 'natural',
  customInstruction: 'Fotos com estética natural, pele realista e refinamento de altas luzes e sombras.',
  autoEditMode: true,
  analysisOnlyMode: false,
  exportQuality: 90,
  exportFormat: 'image/jpeg',
  exportSuffix: '_AI',
  deleteAfterExport: true,
  theme: 'dark',
  maxConcurrency: 2
}

export class StorageService {
  public static loadSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY)
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
      }
    } catch (e) {
      console.error('Erro ao carregar configurações do storage:', e)
    }
    return DEFAULT_SETTINGS
  }

  public static saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch (e) {
      console.error('Erro ao salvar configurações no storage:', e)
    }
  }

  public static loadHistory(): BatchSession[] {
    try {
      const stored = localStorage.getItem(HISTORY_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.error('Erro ao carregar histórico:', e)
    }
    return []
  }

  public static saveBatchToHistory(batch: BatchSession): void {
    try {
      const history = this.loadHistory()
      // Store lightweight version without full in-memory Blobs to prevent quota exceeded
      const lightweightBatch: BatchSession = {
        ...batch,
        photos: batch.photos.map((p) => ({
          ...p,
          file: undefined as any,
          originalUrl: p.editedUrl || p.originalUrl
        }))
      }

      const updated = [lightweightBatch, ...history.filter((b) => b.id !== batch.id)].slice(0, 20)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
    } catch (e) {
      console.error('Erro ao salvar histórico do lote:', e)
    }
  }

  public static clearHistory(): void {
    try {
      localStorage.removeItem(HISTORY_KEY)
    } catch (e) {
      console.error('Erro ao limpar histórico:', e)
    }
  }
}
