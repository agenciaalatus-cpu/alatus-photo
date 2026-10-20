import { AppSettings, BatchSession, UsageStats } from '../types/photo'
import { IndexedDbService } from './indexedDbService'

const SETTINGS_KEY = 'ai_photo_editor_settings_v1'
const HISTORY_KEY = 'ai_photo_editor_history_v1'
const USAGE_KEY = 'ai_photo_editor_usage_v1'

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
  maxConcurrency: 2,
  dailyLimit: 100,
  adminPin: ''
}

export const DEFAULT_USAGE: UsageStats = {
  totalPhotosProcessed: 0,
  totalAiAnalyses: 0,
  estimatedCostUsd: 0,
  dailyCount: 0,
  lastActiveDate: new Date().toISOString().split('T')[0]
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

  /**
   * Loads batch history asynchronously from IndexedDB (with localStorage fallback).
   */
  public static async loadHistoryAsync(): Promise<BatchSession[]> {
    try {
      const idbHistory = await IndexedDbService.loadHistory()
      if (idbHistory && idbHistory.length > 0) {
        return idbHistory
      }
    } catch (e) {
      console.warn('Fallback para histórico do localStorage:', e)
    }
    return this.loadHistorySync()
  }

  /**
   * Sync loader from localStorage for initial synchronous render
   */
  public static loadHistorySync(): BatchSession[] {
    try {
      const stored = localStorage.getItem(HISTORY_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.error('Erro ao carregar histórico síncrono:', e)
    }
    return []
  }

  /**
   * Backwards-compatible loadHistory
   */
  public static loadHistory(): BatchSession[] {
    return this.loadHistorySync()
  }

  /**
   * Saves batch session to IndexedDB with full blob fidelity and updates lightweight metadata in localStorage.
   */
  public static async saveBatchToHistory(batch: BatchSession): Promise<void> {
    try {
      // 1. Save full data with Blobs in IndexedDB
      await IndexedDbService.saveBatch(batch)

      // 2. Keep lightweight version in localStorage (no heavy base64 strings)
      const current = this.loadHistorySync()
      const lightweightBatch: BatchSession = {
        ...batch,
        photos: batch.photos.map((p) => ({
          ...p,
          file: undefined as any,
          originalUrl: '',
          editedUrl: ''
        }))
      }

      const updated = [lightweightBatch, ...current.filter((b) => b.id !== batch.id)].slice(0, 15)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
    } catch (e) {
      console.error('Erro ao salvar histórico do lote:', e)
    }
  }

  public static async clearHistory(): Promise<void> {
    try {
      localStorage.removeItem(HISTORY_KEY)
      await IndexedDbService.clearAll()
    } catch (e) {
      console.error('Erro ao limpar histórico:', e)
    }
  }

  /**
   * Usage and Cost Tracking
   */
  public static loadUsage(): UsageStats {
    try {
      const stored = localStorage.getItem(USAGE_KEY)
      const today = new Date().toISOString().split('T')[0]
      if (stored) {
        const parsed = JSON.parse(stored) as UsageStats
        // Reset daily count if date has changed
        if (parsed.lastActiveDate !== today) {
          parsed.dailyCount = 0
          parsed.lastActiveDate = today
          this.saveUsage(parsed)
        }
        return parsed
      }
    } catch (e) {
      console.error('Erro ao carregar métricas de uso:', e)
    }
    return { ...DEFAULT_USAGE }
  }

  public static saveUsage(usage: UsageStats): void {
    try {
      localStorage.setItem(USAGE_KEY, JSON.stringify(usage))
    } catch (e) {
      console.error('Erro ao salvar métricas de uso:', e)
    }
  }

  /**
   * Records processing of a photo, updating total counters and estimating cost.
   * Gemini 2.5 Flash costs approx $0.00012 per analyzed photo.
   */
  public static recordPhotoProcessed(isAiAnalysis: boolean): UsageStats {
    const current = this.loadUsage()
    const COST_PER_ANALYSIS = 0.00012 // USD

    current.totalPhotosProcessed += 1
    current.dailyCount += 1
    if (isAiAnalysis) {
      current.totalAiAnalyses += 1
      current.estimatedCostUsd += COST_PER_ANALYSIS
    }

    this.saveUsage(current)
    return current
  }
}
