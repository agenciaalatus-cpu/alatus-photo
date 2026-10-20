import { BatchSession, PhotoItem } from '../types/photo'

const DB_NAME = 'alatus_photo_db'
const DB_VERSION = 1
const STORE_NAME = 'batch_history'

interface PersistedBatchRecord {
  id: string
  name: string
  date: string
  timestamp: number
  photosCount: number
  totalBytes: number
  status: 'draft' | 'processing' | 'completed' | 'partial_error'
  photos: Array<{
    id: string
    filename: string
    fileSize: number
    mimeType: string
    originalWidth: number
    originalHeight: number
    status: any
    progress: number
    userAdjustments: any
    analysis?: any
    errorMessage?: string
    imageBlob?: Blob
    originalBlob?: Blob
  }>
}

/**
 * Robust IndexedDB storage engine for persistent batch history and photo blobs.
 * Avoids browser 5MB localStorage quota limits and ensures blob URLs work seamlessly across reloads.
 */
export class IndexedDbService {
  private static dbPromise: Promise<IDBDatabase> | null = null

  private static getDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB não suportado neste navegador'))
        return
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    return this.dbPromise
  }

  /**
   * Saves a batch session with all photo metadata and thumbnail blobs into IndexedDB.
   */
  public static async saveBatch(batch: BatchSession): Promise<void> {
    try {
      const db = await this.getDb()

      // Convert photo items into serializable format with Blobs
      const persistedPhotos = await Promise.all(
        batch.photos.map(async (p) => {
          let imageBlob: Blob | undefined = undefined

          // If editedUrl or originalUrl is available, fetch the blob to store persistently
          const urlToPersist = p.editedUrl || p.originalUrl
          if (urlToPersist && urlToPersist.startsWith('blob:')) {
            try {
              const res = await fetch(urlToPersist)
              if (res.ok) {
                imageBlob = await res.blob()
              }
            } catch {
              // Ignore blob fetch failure
            }
          }

          return {
            id: p.id,
            filename: p.filename,
            fileSize: p.fileSize,
            mimeType: p.mimeType,
            originalWidth: p.originalWidth,
            originalHeight: p.originalHeight,
            status: p.status,
            progress: p.progress,
            userAdjustments: p.userAdjustments,
            analysis: p.analysis,
            errorMessage: p.errorMessage,
            imageBlob
          }
        })
      )

      const record: PersistedBatchRecord = {
        id: batch.id,
        name: batch.name,
        date: batch.date,
        timestamp: batch.timestamp,
        photosCount: batch.photosCount,
        totalBytes: batch.totalBytes,
        status: batch.status,
        photos: persistedPhotos
      }

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        store.put(record)

        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } catch (e) {
      console.warn('Erro ao salvar lote no IndexedDB:', e)
    }
  }

  /**
   * Loads all batch sessions from IndexedDB, reconstructing live Object URLs for images.
   */
  public static async loadHistory(): Promise<BatchSession[]> {
    try {
      const db = await this.getDb()

      const records = await new Promise<PersistedBatchRecord[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const request = store.getAll()

        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })

      // Sort descending by timestamp
      records.sort((a, b) => b.timestamp - a.timestamp)

      // Reconstruct PhotoItems with fresh valid Object URLs
      return records.map((rec) => {
        const photos: PhotoItem[] = rec.photos.map((p) => {
          let objectUrl = ''
          if (p.imageBlob) {
            objectUrl = URL.createObjectURL(p.imageBlob)
          }

          return {
            id: p.id,
            filename: p.filename,
            file: p.imageBlob ? new File([p.imageBlob], p.filename, { type: p.mimeType }) : (undefined as any),
            originalUrl: objectUrl,
            editedUrl: objectUrl,
            originalWidth: p.originalWidth,
            originalHeight: p.originalHeight,
            fileSize: p.fileSize,
            mimeType: p.mimeType,
            status: p.status,
            progress: p.progress,
            userAdjustments: p.userAdjustments,
            analysis: p.analysis,
            errorMessage: p.errorMessage
          }
        })

        return {
          id: rec.id,
          name: rec.name,
          date: rec.date,
          timestamp: rec.timestamp,
          photosCount: rec.photosCount,
          totalBytes: rec.totalBytes,
          status: rec.status,
          photos
        }
      })
    } catch (e) {
      console.warn('Erro ao carregar histórico do IndexedDB:', e)
      return []
    }
  }

  /**
   * Deletes a specific batch by ID.
   */
  public static async deleteBatch(id: string): Promise<void> {
    try {
      const db = await this.getDb()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        store.delete(id)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } catch (e) {
      console.warn('Erro ao deletar lote no IndexedDB:', e)
    }
  }

  /**
   * Clears all batch history from IndexedDB.
   */
  public static async clearAll(): Promise<void> {
    try {
      const db = await this.getDb()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        store.clear()
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } catch (e) {
      console.warn('Erro ao limpar histórico no IndexedDB:', e)
    }
  }
}
