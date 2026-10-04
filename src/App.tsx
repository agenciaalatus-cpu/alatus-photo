import React, { useState, useEffect, useRef } from 'react'
import { Header } from './components/Header'
import { Dashboard } from './components/Dashboard'
import { BatchView } from './components/BatchView'
import { DetailEditorModal } from './components/DetailEditorModal'
import { SettingsModal } from './components/SettingsModal'
import { HistoryModal } from './components/HistoryModal'
import { 
  PhotoItem, 
  AppSettings, 
  BatchSession, 
  PhotoAdjustments, 
  DEFAULT_ADJUSTMENTS 
} from './types/photo'
import { StorageService, DEFAULT_SETTINGS } from './services/storageService'
import { GeminiService } from './services/geminiService'
import { analyzeImageLocally } from './services/imageAnalysisService'
import { ImageEditingService } from './services/imageEditingService'
import { ExportService, ExportProgress } from './services/exportService'
import { createSamplePhotoFiles } from './utils/samplePhotos'

export function App() {
  const [settings, setSettings] = useState<AppSettings>(() => StorageService.loadSettings())
  const [history, setHistory] = useState<BatchSession[]>(() => StorageService.loadHistory())
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null)

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentProcessingPhoto, setCurrentProcessingPhoto] = useState<PhotoItem | null>(null)
  const isCancelledRef = useRef(false)

  // Export state
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)

  // Theme synchronization
  useEffect(() => {
    if (settings.theme === 'light') {
      document.documentElement.classList.add('light-theme')
    } else {
      document.documentElement.classList.remove('light-theme')
    }
  }, [settings.theme])

  // Save settings when changed
  const handleUpdateSettings = (updated: Partial<AppSettings>) => {
    const next = { ...settings, ...updated }
    setSettings(next)
    StorageService.saveSettings(next)
  }

  const handleToggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark'
    handleUpdateSettings({ theme: nextTheme })
  }

  // Load photos into current batch
  const handleFilesSelected = async (files: File[]) => {
    const newItems: PhotoItem[] = []

    for (const file of files) {
      const url = URL.createObjectURL(file)
      // Read image dimensions
      const img = new Image()
      img.src = url
      await new Promise((resolve) => {
        img.onload = () => resolve(true)
        img.onerror = () => resolve(false)
      })

      newItems.push({
        id: 'photo_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
        filename: file.name,
        file,
        originalUrl: url,
        originalWidth: img.naturalWidth || 1920,
        originalHeight: img.naturalHeight || 1080,
        fileSize: file.size,
        mimeType: file.type || 'image/jpeg',
        status: 'waiting',
        progress: 0,
        userAdjustments: { ...DEFAULT_ADJUSTMENTS }
      })
    }

    setPhotos((prev) => [...prev, ...newItems])
  }

  const handleLoadSamples = async () => {
    const sampleFiles = await createSamplePhotoFiles()
    await handleFilesSelected(sampleFiles)
  }

  // Helper to safely update a single photo's status and progress
  const updatePhoto = (id: string, updates: Partial<PhotoItem>) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    )
  }

  // Process a single photo item with continuous, realistic progress tracking
  const processSinglePhoto = async (photo: PhotoItem): Promise<PhotoItem> => {
    let currentProgress = 5
    updatePhoto(photo.id, {
      status: 'analyzing',
      statusMessage: 'Carregando e decodificando imagem...',
      progress: currentProgress
    })

    // 1. Load Image Element for analysis & canvas rendering
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = photo.originalUrl
    await new Promise((resolve) => {
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
    })

    currentProgress = 15
    updatePhoto(photo.id, {
      statusMessage: 'Iniciando análise com IA...',
      progress: currentProgress
    })

    // Continuous ticker that smoothly advances progress during Gemini's network latency
    let tickerInterval: any = null
    tickerInterval = setInterval(() => {
      if (isCancelledRef.current) {
        clearInterval(tickerInterval)
        return
      }
      if (currentProgress < 78) {
        const step = currentProgress < 35 ? 3 : currentProgress < 58 ? 2 : 1
        currentProgress = Math.min(78, currentProgress + step)

        let msg = 'Analisando iluminação e sombras com Gemini...'
        if (currentProgress >= 32 && currentProgress < 50) {
          msg = 'Avaliando contraste e balanço de branco...'
        } else if (currentProgress >= 50 && currentProgress < 68) {
          msg = 'Calculando tons de pele e saturação...'
        } else if (currentProgress >= 68) {
          msg = 'Finalizando diagnóstico fotográfico...'
        }

        updatePhoto(photo.id, {
          progress: currentProgress,
          statusMessage: msg
        })
      }
    }, 130)

    try {
      // 2. Call Gemini API
      const analysis = await GeminiService.analyzePhoto(photo.file, {
        apiKey: settings.geminiApiKey,
        styleProfile: settings.styleProfile,
        customInstruction: settings.customInstruction,
        imgElement: img
      })

      if (tickerInterval) clearInterval(tickerInterval)

      // Check if user cancelled while waiting
      if (isCancelledRef.current) {
        return { ...photo, status: 'waiting', progress: 0 }
      }

      // 3. Mark as editing (84%)
      currentProgress = 84
      updatePhoto(photo.id, {
        analysis,
        status: 'editing',
        statusMessage: 'Aplicando correções de balanço e exposição...',
        progress: currentProgress
      })

      // Small async yield to allow UI repaint
      await new Promise((r) => setTimeout(r, 50))

      // 4. If analysis-only mode, don't apply edits
      const adjustmentsToApply = settings.analysisOnlyMode
        ? { ...DEFAULT_ADJUSTMENTS }
        : analysis.recommended_edit

      // 5. Render preview URL non-destructively (94%)
      currentProgress = 94
      updatePhoto(photo.id, {
        status: 'editing',
        statusMessage: 'Renderizando nitidez e curvas fotográficas...',
        progress: currentProgress
      })

      const editedUrl = ImageEditingService.generatePreviewUrl(img, adjustmentsToApply, 800)

      await new Promise((r) => setTimeout(r, 40))

      const updatedItem: PhotoItem = {
        ...photo,
        analysis,
        userAdjustments: adjustmentsToApply,
        editedUrl,
        isOnlyAnalyzed: settings.analysisOnlyMode,
        status: 'completed',
        statusMessage: 'Concluído com sucesso',
        progress: 100
      }

      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? updatedItem : p)))
      return updatedItem
    } catch (err: any) {
      if (tickerInterval) clearInterval(tickerInterval)
      console.error(`Erro ao processar foto ${photo.filename}:`, err)
      try {
        currentProgress = 85
        updatePhoto(photo.id, {
          status: 'editing',
          statusMessage: 'Calculando ajustes otimizados locais...',
          progress: currentProgress
        })
        const fallbackAnalysis = await analyzeImageLocally(img, settings.styleProfile, settings.customInstruction)
        const adjustmentsToApply = settings.analysisOnlyMode ? { ...DEFAULT_ADJUSTMENTS } : fallbackAnalysis.recommended_edit
        const editedUrl = ImageEditingService.generatePreviewUrl(img, adjustmentsToApply, 800)
        const recoveredItem: PhotoItem = {
          ...photo,
          analysis: fallbackAnalysis,
          userAdjustments: adjustmentsToApply,
          editedUrl,
          isOnlyAnalyzed: settings.analysisOnlyMode,
          status: 'completed',
          statusMessage: 'Concluído com ajustes heurísticos',
          progress: 100
        }
        setPhotos((prev) => prev.map((p) => (p.id === photo.id ? recoveredItem : p)))
        return recoveredItem
      } catch (fallbackErr) {
        let msg = err.message || 'Erro durante a análise'
        if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
          msg = 'Limite temporário da cota da API Gemini.'
        }
        const errorItem: PhotoItem = {
          ...photo,
          status: 'error',
          errorMessage: msg,
          progress: 0
        }
        setPhotos((prev) => prev.map((p) => (p.id === photo.id ? errorItem : p)))
        return errorItem
      }
    }
  }

  // Batch Processing Queue with Concurrency
  const handleStartProcessing = async () => {
    if (photos.length === 0 || isProcessing) return

    setIsProcessing(true)
    isCancelledRef.current = false

    const pendingPhotos = photos.filter((p) => p.status === 'waiting' || p.status === 'error')
    const maxConcurrency = Math.max(1, Math.min(3, settings.maxConcurrency || 2))
    let currentIndex = 0

    const runWorker = async () => {
      while (currentIndex < pendingPhotos.length && !isCancelledRef.current) {
        const item = pendingPhotos[currentIndex++]
        if (!item) break
        setCurrentProcessingPhoto(item)
        await processSinglePhoto(item)
      }
    }

    const workers = []
    for (let i = 0; i < maxConcurrency; i++) {
      workers.push(runWorker())
    }

    await Promise.all(workers)

    setIsProcessing(false)
    setCurrentProcessingPhoto(null)

    // Save batch to history
    setPhotos((currentPhotos) => {
      const completed = currentPhotos.filter((p) => p.status === 'completed').length
      if (completed > 0) {
        const batchSession: BatchSession = {
          id: 'batch_' + Date.now(),
          name: `Lote ${new Date().toLocaleDateString('pt-BR')} (${completed} fotos)`,
          date: new Date().toLocaleDateString('pt-BR'),
          timestamp: Date.now(),
          photosCount: currentPhotos.length,
          totalBytes: currentPhotos.reduce((a, b) => a + b.fileSize, 0),
          status: 'completed',
          photos: currentPhotos
        }
        StorageService.saveBatchToHistory(batchSession)
        setHistory(StorageService.loadHistory())
      }
      return currentPhotos
    })
  }

  const handleCancelProcessing = () => {
    isCancelledRef.current = true
    setIsProcessing(false)
    setCurrentProcessingPhoto(null)
  }

  // Retry individual photo
  const handleRetryPhoto = async (photoId: string) => {
    const target = photos.find((p) => p.id === photoId)
    if (!target) return
    setCurrentProcessingPhoto(target)
    await processSinglePhoto(target)
    setCurrentProcessingPhoto(null)
  }

  const handleRetryFailedPhotos = () => {
    setPhotos((prev) =>
      prev.map((p) => (p.status === 'error' ? { ...p, status: 'waiting', errorMessage: undefined } : p))
    )
    setTimeout(() => handleStartProcessing(), 100)
  }

  const handleRemovePhoto = (photoId: string) => {
    setPhotos((prev) => {
      const removed = prev.find((p) => p.id === photoId)
      if (removed?.originalUrl) URL.revokeObjectURL(removed.originalUrl)
      return prev.filter((p) => p.id !== photoId)
    })
  }

  const handleClearBatch = () => {
    if (confirm('Deseja realmente remover todas as fotos deste lote?')) {
      photos.forEach((p) => URL.revokeObjectURL(p.originalUrl))
      setPhotos([])
    }
  }

  // Batch Export to ZIP
  const handleExportBatch = async () => {
    const completed = photos.filter((p) => p.status === 'completed')
    if (completed.length === 0) return

    setIsExporting(true)
    setExportProgress({ current: 0, total: completed.length, currentFilename: '', percentage: 0 })

    try {
      await ExportService.exportBatchToZip(completed, settings, (p) => {
        setExportProgress(p)
      })

      // Section 27: Privacy - cleanup if configured
      if (settings.deleteAfterExport) {
        // Clear object URLs and notify user
        setTimeout(() => {
          setExportProgress(null)
          setIsExporting(false)
        }, 1500)
      } else {
        setIsExporting(false)
        setExportProgress(null)
      }
    } catch (err: any) {
      alert(`Erro na exportação: ${err.message || 'Falha ao gerar ZIP'}`)
      setIsExporting(false)
      setExportProgress(null)
    }
  }

  // Update manual adjustments for a photo
  const handleUpdatePhotoAdjustments = (
    photoId: string,
    newAdjustments: PhotoAdjustments,
    newAnalysis?: any
  ) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== photoId) return p

        // Regenerate preview
        const img = new Image()
        img.src = p.originalUrl
        const updatedUrl = ImageEditingService.generatePreviewUrl(img, newAdjustments, 800)

        return {
          ...p,
          userAdjustments: newAdjustments,
          analysis: newAnalysis || p.analysis,
          editedUrl: updatedUrl,
          lastUpdated: Date.now()
        }
      })
    )

    if (selectedPhoto && selectedPhoto.id === photoId) {
      setSelectedPhoto((prev) =>
        prev
          ? {
              ...prev,
              userAdjustments: newAdjustments,
              analysis: newAnalysis || prev.analysis
            }
          : null
      )
    }
  }

  // Restore past batch from history
  const handleSelectHistoryBatch = (batch: BatchSession) => {
    setPhotos(batch.photos)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-app)] text-[var(--text-primary)] transition-colors duration-200">
      {/* Top Header */}
      <Header
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onToggleTheme={handleToggleTheme}
        historyCount={history.length}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {photos.length === 0 ? (
          <Dashboard
            onFilesSelected={handleFilesSelected}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onLoadSamples={handleLoadSamples}
          />
        ) : (
          <BatchView
            photos={photos}
            isProcessing={isProcessing}
            isExporting={isExporting}
            exportProgress={exportProgress}
            currentProcessingPhoto={photos.find((p) => p.id === currentProcessingPhoto?.id) || currentProcessingPhoto}
            settings={settings}
            onStartProcessing={handleStartProcessing}
            onCancelProcessing={handleCancelProcessing}
            onExportBatch={handleExportBatch}
            onClearBatch={handleClearBatch}
            onSelectPhoto={(photo) => {
              setSelectedPhoto(photo)
              setIsEditorOpen(true)
            }}
            onRetryPhoto={handleRetryPhoto}
            onRetryFailedPhotos={handleRetryFailedPhotos}
            onRemovePhoto={handleRemovePhoto}
            onAddMorePhotos={handleFilesSelected}
          />
        )}
      </main>

      {/* Detail Photo Inspector & Split Comparison Modal */}
      <DetailEditorModal
        photo={selectedPhoto}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false)
          setSelectedPhoto(null)
        }}
        settings={settings}
        onUpdatePhotoAdjustments={handleUpdatePhotoAdjustments}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={(updated) => handleUpdateSettings(updated)}
      />

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectBatch={handleSelectHistoryBatch}
        onClearHistory={() => {
          StorageService.clearHistory()
          setHistory([])
        }}
      />
    </div>
  )
}

export default App
