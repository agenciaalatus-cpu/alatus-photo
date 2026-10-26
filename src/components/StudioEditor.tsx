import React, { useState, useEffect, useRef } from 'react'
import { 
  Sparkles, 
  Play, 
  Pause, 
  Download, 
  RotateCw, 
  RotateCcw, 
  Sliders, 
  SlidersHorizontal,
  Sun, 
  Palette, 
  Eye, 
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  Check, 
  AlertCircle, 
  Clock, 
  Trash2, 
  UploadCloud, 
  Send, 
  Loader2, 
  LayoutGrid,
  Cpu,
  ChevronDown,
  ChevronUp,
  Flame,
  User,
  ShieldCheck,
  RefreshCw,
  Copy,
  X
} from 'lucide-react'
import { 
  PhotoItem, 
  PhotoAdjustments, 
  AppSettings, 
  SAFE_BOUNDS, 
  DEFAULT_ADJUSTMENTS 
} from '../types/photo'
import { ImageEditingService } from '../services/imageEditingService'
import { GeminiService } from '../services/geminiService'
import { ExportProgress, ExportService } from '../services/exportService'
import { formatBytes, formatSigned } from '../utils/formatters'

interface StudioEditorProps {
  photos: PhotoItem[]
  selectedPhoto: PhotoItem
  isProcessing: boolean
  currentProcessingPhoto: PhotoItem | null
  settings: AppSettings
  onSelectPhoto: (photo: PhotoItem) => void
  onUpdatePhotoAdjustments: (photoId: string, adjustments: PhotoAdjustments, newAnalysis?: any) => void
  onApplyAdjustmentsToBatch: (adjustments: PhotoAdjustments) => void
  onStartProcessing: () => void
  onCancelProcessing: () => void
  onOpenExportModal: () => void
  onExportSinglePhoto: (photo: PhotoItem) => void
  onSwitchToGridView: () => void
  onAddMorePhotos: (files: File[]) => void
  onRemovePhoto: (photoId: string) => void
  onRetryPhoto: (photoId: string) => void
  onClearBatch: () => void
  onOpenDuplicateModal?: () => void
}

export const StudioEditor: React.FC<StudioEditorProps> = ({
  photos,
  selectedPhoto,
  isProcessing,
  currentProcessingPhoto,
  settings,
  onSelectPhoto,
  onUpdatePhotoAdjustments,
  onApplyAdjustmentsToBatch,
  onStartProcessing,
  onCancelProcessing,
  onOpenExportModal,
  onExportSinglePhoto,
  onSwitchToGridView,
  onAddMorePhotos,
  onRemovePhoto,
  onRetryPhoto,
  onClearBatch,
  onOpenDuplicateModal
}) => {
  // Local active adjustments
  const [adjustments, setAdjustments] = useState<PhotoAdjustments>({ ...selectedPhoto.userAdjustments })
  const [splitPos, setSplitPos] = useState(50) // 0 to 100
  const [isDraggingSplit, setIsDraggingSplit] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1) // 1, 1.5, 2
  const [isHoldingOriginal, setIsHoldingOriginal] = useState(false)
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false)

  // AI Reanalysis state
  const [reanalyzePrompt, setReanalyzePrompt] = useState('')
  const [isReanalyzing, setIsReanalyzing] = useState(false)
  const [reanalyzeSuccess, setReanalyzeSuccess] = useState(false)
  const [showApplyBatchConfirm, setShowApplyBatchConfirm] = useState(false)

  // Group accordion toggle states for the 6 groups
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({
    exposure: true,
    contrast: true,
    wb: true,
    color: true,
    shadows: true,
    detail: true,
    ai: false
  })

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgElementRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const filmstripRef = useRef<HTMLDivElement>(null)

  // Photo indexing & navigation
  const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < photos.length - 1

  const handlePrevPhoto = () => {
    if (hasPrev) onSelectPhoto(photos[currentIndex - 1])
  }

  const handleNextPhoto = () => {
    if (hasNext) onSelectPhoto(photos[currentIndex + 1])
  }

  // Synchronize when selected photo changes
  useEffect(() => {
    setAdjustments({ ...selectedPhoto.userAdjustments })
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imgElementRef.current = img
      renderCanvas({ ...selectedPhoto.userAdjustments })
    }
    img.src = selectedPhoto.originalUrl
  }, [selectedPhoto.id])

  // Scroll active photo into view in filmstrip
  useEffect(() => {
    if (filmstripRef.current) {
      const activeEl = filmstripRef.current.querySelector(`[data-photo-id="${selectedPhoto.id}"]`)
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  }, [selectedPhoto.id])

  // Keyboard navigation & shortcuts (Lightroom style: ArrowLeft/Right, \, Space to hold original, Z to zoom)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === '\\') {
        setSplitPos((pos) => (pos > 50 ? 0 : 100))
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        setIsHoldingOriginal(true)
      } else if (e.key === 'z' || e.key === 'Z') {
        setZoomLevel((z) => (z > 1 ? 1 : 2))
      } else if (e.key === 'ArrowRight') {
        handleNextPhoto()
      } else if (e.key === 'ArrowLeft') {
        handlePrevPhoto()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        setIsHoldingOriginal(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [currentIndex, hasPrev, hasNext, photos])

  const renderCanvas = (currentAdj: PhotoAdjustments) => {
    if (!canvasRef.current || !imgElementRef.current) return
    ImageEditingService.renderToCanvas(
      imgElementRef.current,
      canvasRef.current,
      currentAdj,
      { maxDimension: 1600 }
    )
  }

  const handleAdjustmentChange = (key: keyof PhotoAdjustments, value: number) => {
    const updated = { ...adjustments, [key]: value }
    setAdjustments(updated)
    renderCanvas(updated)
    onUpdatePhotoAdjustments(selectedPhoto.id, updated)
  }

  const handleResetToOriginal = () => {
    const reset = { ...DEFAULT_ADJUSTMENTS }
    setAdjustments(reset)
    renderCanvas(reset)
    onUpdatePhotoAdjustments(selectedPhoto.id, reset)
  }

  const handleResetToAI = () => {
    if (selectedPhoto.analysis?.recommended_edit) {
      const aiEdits = { ...selectedPhoto.analysis.recommended_edit }
      setAdjustments(aiEdits)
      renderCanvas(aiEdits)
      onUpdatePhotoAdjustments(selectedPhoto.id, aiEdits)
    }
  }

  const handleApplyToBatchConfirm = () => {
    onApplyAdjustmentsToBatch(adjustments)
    setShowApplyBatchConfirm(false)
  }

  const handleReanalyzeWithAI = async (customText?: string) => {
    const textToUse = customText || reanalyzePrompt.trim()
    if (!textToUse) return
    setIsReanalyzing(true)
    setReanalyzeSuccess(false)
    try {
      const res = await GeminiService.reanalyzePhoto(
        selectedPhoto.file,
        adjustments,
        textToUse,
        settings.geminiApiKey,
        imgElementRef.current || undefined
      )
      setAdjustments(res.recommended_edit)
      renderCanvas(res.recommended_edit)
      onUpdatePhotoAdjustments(selectedPhoto.id, res.recommended_edit, res)
      setReanalyzeSuccess(true)
      setReanalyzePrompt('')
      setTimeout(() => setReanalyzeSuccess(false), 4000)
    } catch (err: any) {
      alert(`Erro na reanálise: ${err.message || 'Falha ao processar reanálise'}`)
    } finally {
      setIsReanalyzing(false)
    }
  }

  // Interactive Split Comparison Drag
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingSplit || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSplitPos(percent)
  }

  // Batch progress computation
  const totalPhotos = photos.length
  const completedPhotos = photos.filter((p) => p.status === 'completed').length
  const waitingPhotos = photos.filter((p) => p.status === 'waiting').length
  const errorPhotos = photos.filter((p) => p.status === 'error').length
  const totalProgressSum = photos.reduce((acc, p) => {
    if (p.status === 'completed' || p.status === 'error') return acc + 100
    return acc + (p.progress || 0)
  }, 0)
  const batchProgressPercent = totalPhotos > 0 ? Math.min(100, Math.round(totalProgressSum / totalPhotos)) : 0

  // Status badge helper
  const getStatusBadge = (status: PhotoItem['status']) => {
    switch (status) {
      case 'waiting':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-color)]">
            <Clock className="w-2.5 h-2.5" />
            <span>Na fila</span>
          </span>
        )
      case 'analyzing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00509E]/20 text-[#1A6DC2] border border-[#00509E]/40 animate-pulse">
            <Sparkles className="w-2.5 h-2.5 text-[#FFC72C] animate-spin" />
            <span>Analisando</span>
          </span>
        )
      case 'editing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFC72C]/20 text-[#FFC72C] border border-[#FFC72C]/40">
            <RotateCw className="w-2.5 h-2.5 animate-spin" />
            <span>Editando</span>
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Check className="w-2.5 h-2.5" />
            <span>Concluída</span>
          </span>
        )
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-2.5 h-2.5" />
            <span>Falhou</span>
          </span>
        )
    }
  }

  // Check if AI was from Gemini or Local Heuristic Engine (Requirement 8)
  const isSimulatedAI = Boolean(selectedPhoto.analysis?.simulated)
  const hasAnalysis = Boolean(selectedPhoto.analysis)

  return (
    <div 
      className="flex flex-col h-[calc(100vh-65px)] bg-[var(--bg-app)] text-[var(--text-primary)] select-none overflow-hidden"
      onMouseUp={() => setIsDraggingSplit(false)}
      onMouseLeave={() => setIsDraggingSplit(false)}
    >
      {/* File input for adding photos */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onAddMorePhotos(Array.from(e.target.files))
          }
        }}
      />

      {/* TOP STUDIO TOOLBAR (Barra de Ações e Navegação) */}
      <div className="h-13 px-4 sm:px-6 bg-[var(--bg-surface)] border-b border-[var(--border-color)] flex items-center justify-between shrink-0 gap-3">
        {/* Left: View Mode Toggle & Photo Selector navigation */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onSwitchToGridView}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[#00509E] hover:text-white border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] transition-all shadow-sm"
            title="Alternar para Visão em Grade (Lote Completo)"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Visão em Grade</span>
          </button>

          <div className="h-4 w-[1px] bg-[var(--border-color)] hidden sm:block" />

          {/* Prev / Next photo controls */}
          <div className="flex items-center gap-1 bg-[var(--bg-elevated)] p-0.5 rounded-xl border border-[var(--border-color)]">
            <button
              onClick={handlePrevPhoto}
              disabled={!hasPrev}
              className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-30 transition-all"
              title="Foto Anterior (Seta ←)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-2 font-bold text-[var(--text-primary)]">
              {currentIndex + 1} / {photos.length}
            </span>
            <button
              onClick={handleNextPhoto}
              disabled={!hasNext}
              className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-30 transition-all"
              title="Próxima Foto (Seta →)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Photo Title & Badge */}
          <div className="hidden md:flex items-center gap-2 truncate max-w-xs">
            <span className="text-xs font-bold text-[var(--text-primary)] truncate" title={selectedPhoto.filename}>
              {selectedPhoto.filename}
            </span>
            {getStatusBadge(selectedPhoto.status)}
          </div>
        </div>

        {/* Center: Live Batch Processing Status / Progress */}
        {isProcessing && (
          <div className="hidden xl:flex items-center gap-3 px-3.5 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)]">
            <Sparkles className="w-3.5 h-3.5 text-[#FFC72C] animate-spin" />
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Lote: {completedPhotos} / {totalPhotos}
            </span>
            <div className="w-24 h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#00509E] to-[#FFC72C] transition-all duration-200"
                style={{ width: `${batchProgressPercent}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-[#FFC72C]">
              {batchProgressPercent}%
            </span>
          </div>
        )}

        {/* Right: Studio Primary Actions */}
        <div className="flex items-center gap-2">
          {/* Apply to Batch Action (Requirement 3) */}
          <button
            onClick={() => setShowApplyBatchConfirm(true)}
            disabled={isProcessing || photos.length <= 1}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[#00509E] hover:text-white border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] transition-all shadow-sm disabled:opacity-40"
            title="Copiar os ajustes desta foto para todas as outras fotos do lote"
          >
            <Copy className="w-3.5 h-3.5 text-[#FFC72C]" />
            <span>Aplicar ao Lote</span>
          </button>

          {/* Remove Duplicates Action */}
          {onOpenDuplicateModal && (
            <button
              onClick={onOpenDuplicateModal}
              disabled={isProcessing || photos.length < 2}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[#00509E] hover:text-white border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] transition-all shadow-sm disabled:opacity-40"
              title="Detectar e remover fotos duplicadas mantendo automaticamente as melhores"
            >
              <Layers className="w-3.5 h-3.5 text-[#FFC72C]" />
              <span>Duplicadas</span>
            </button>
          )}

          {/* Start/Pause Processing Button */}
          {isProcessing ? (
            <button
              onClick={onCancelProcessing}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-rose-900/30"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pausar Lote</span>
            </button>
          ) : (
            <button
              onClick={onStartProcessing}
              disabled={waitingPhotos === 0 && errorPhotos === 0}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#00509E] to-[#1A6DC2] hover:from-[#003F7E] hover:to-[#00509E] text-white text-xs font-bold shadow-md shadow-[#00509E]/25 transition-all flex items-center gap-1.5 disabled:opacity-40"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FFC72C]" />
              <span className="hidden sm:inline">{completedPhotos > 0 ? 'Processar Restantes' : 'Analisar Lote'}</span>
              <span className="sm:hidden">Analisar</span>
            </button>
          )}

          {/* Export Actions */}
          <button
            onClick={() => onExportSinglePhoto(selectedPhoto)}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[#00509E] hover:text-white border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] transition-all shadow-sm"
            title="Baixar apenas esta foto com os ajustes atuais"
          >
            <Download className="w-3.5 h-3.5 text-[#FFC72C]" />
            <span className="hidden md:inline ml-1">Exportar Foto</span>
          </button>

          <button
            onClick={onOpenExportModal}
            disabled={completedPhotos === 0}
            className="px-3.5 py-1.5 rounded-xl bg-[#222D3A] hover:bg-[#2A3747] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] transition-all flex items-center gap-1.5 disabled:opacity-40 shadow-sm"
            title="Exportar todas as fotos concluídas em ZIP"
          >
            <Download className="w-3.5 h-3.5 text-[#FFC72C]" />
            <span className="hidden sm:inline">Exportar Lote (ZIP)</span>
          </button>

          {/* Mobile adjustment panel toggle */}
          <button
            onClick={() => setIsMobilePanelOpen(!isMobilePanelOpen)}
            className="lg:hidden p-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[#FFC72C]"
            title="Abrir painel de ajustes"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Confirmation Dialog: Apply Current Adjustments to All Batch Photos */}
      {showApplyBatchConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowApplyBatchConfirm(false)}
        >
          <div 
            className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00509E]/20 border border-[#00509E]/30 flex items-center justify-center text-[#1A6DC2]">
                <Copy className="w-5 h-5 text-[#FFC72C]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Aplicar Ajustes ao Lote Inteiro</h3>
                <p className="text-xs text-[var(--text-secondary)]">Replicação em massa de parâmetros</p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Deseja aplicar a calibração atual desta foto ({selectedPhoto.filename}) em todas as outras <strong className="text-[var(--text-primary)]">{photos.length - 1} fotografias</strong> do lote? Os ajustes manuais ou IA anteriores serão sincronizados com esta fórmula.
            </p>

            <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-xs font-mono space-y-1">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Exposição: {formatSigned(adjustments.exposure, ' EV')}</span>
                <span>Contraste: {formatSigned(adjustments.contrast)}</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Temperatura: {formatSigned(adjustments.temperature, ' K')}</span>
                <span>Nitidez: {adjustments.sharpness}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowApplyBatchConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyToBatchConfirm}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00509E] to-[#1A6DC2] hover:from-[#003F7E] text-white text-xs font-bold shadow-md"
              >
                Sim, Aplicar a Todas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN WORKSPACE BODY (Central Image Viewport + Right Studio Controls) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* CENTER: LARGE PHOTOGRAPHY VIEWPORT (Occupies maximum screen space) */}
        <div 
          ref={containerRef}
          onMouseMove={handleMouseMove}
          className="flex-1 relative bg-[#0D131A] overflow-hidden flex items-center justify-center select-none"
        >
          {/* Zoomable Container */}
          <div 
            className="relative transition-transform duration-150 ease-out flex items-center justify-center max-w-full max-h-full p-4"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* 1. Underlying Original Image (Left side of split) */}
            <img
              src={selectedPhoto.originalUrl}
              alt="Original"
              className="max-h-[72vh] max-w-[75vw] object-contain pointer-events-none rounded-lg shadow-2xl"
            />

            {/* 2. Top Canvas with Photographic Adjustments (Right side of split, clipped) */}
            {!isHoldingOriginal && (
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none p-4"
                style={{ clipPath: `inset(0 0 0 ${splitPos}%)` }}
              >
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-contain pointer-events-none rounded-lg"
                />
              </div>
            )}

            {/* Split Handle Line (Only when not holding original) */}
            {!isHoldingOriginal && (
              <div
                className="absolute top-4 bottom-4 w-[2px] bg-white shadow-[0_0_10px_rgba(0,0,0,0.8)] cursor-ew-resize pointer-events-auto z-20"
                style={{ left: `${splitPos}%` }}
                onMouseDown={() => setIsDraggingSplit(true)}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white text-[#101820] font-black text-[10px] flex items-center justify-center shadow-xl border border-black/20 cursor-ew-resize select-none">
                  ⇄
                </div>
              </div>
            )}
          </div>

          {/* Viewport Floating Controls: Zoom & Split Quick-Toggles */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-color)] shadow-lg z-20">
            <button
              onClick={() => setZoomLevel((z) => (z > 1 ? z - 0.5 : 1))}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              title="Reduzir Zoom (Z)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1.5 font-bold text-[var(--text-primary)]">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => (z < 2.5 ? z + 0.5 : 2.5))}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              title="Aumentar Zoom (Z)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-3.5 bg-[var(--border-color)] mx-0.5" />

            <button
              onClick={() => setSplitPos(50)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                splitPos === 50 ? 'bg-[#00509E] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              50/50
            </button>
            <button
              onClick={() => setSplitPos(100)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                splitPos === 100 ? 'bg-[#00509E] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Apenas Revelada
            </button>
          </div>

          {/* Floating Hold-to-Compare Button */}
          <div className="absolute top-4 right-4 z-20">
            <button
              type="button"
              onMouseDown={() => setIsHoldingOriginal(true)}
              onMouseUp={() => setIsHoldingOriginal(false)}
              onTouchStart={() => setIsHoldingOriginal(true)}
              onTouchEnd={() => setIsHoldingOriginal(false)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg backdrop-blur-md ${
                isHoldingOriginal
                  ? 'bg-[#FFC72C] text-black border-[#FFC72C] font-black'
                  : 'bg-[var(--bg-surface)]/90 border-[var(--border-color)] text-[var(--text-primary)] hover:border-[#1A6DC2]'
              }`}
              title="Segure o botão ou a barra de espaço para ver o original"
            >
              <Eye className="w-3.5 h-3.5 text-[#FFC72C]" />
              <span>{isHoldingOriginal ? 'Vendo Original' : 'Segure p/ Original'}</span>
            </button>
          </div>

          {/* Floating Badges: Original vs AI Diagnostic Origin (Requirement 8) */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
            <span className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white tracking-wider">
              ANTES (ORIGINAL)
            </span>
          </div>

          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 pointer-events-none">
            {hasAnalysis ? (
              <span className={`px-3 py-1 rounded-full backdrop-blur-md border text-[10px] font-bold tracking-wider flex items-center gap-1.5 ${
                isSimulatedAI
                  ? 'bg-amber-950/70 border-amber-500/40 text-amber-300'
                  : 'bg-[#00509E]/80 border-[#FFC72C]/40 text-white shadow-lg'
              }`}>
                {isSimulatedAI ? <Cpu className="w-3 h-3 text-amber-400" /> : <Sparkles className="w-3 h-3 text-[#FFC72C]" />}
                {isSimulatedAI ? 'DEPOIS: MOTOR LOCAL HEURÍSTICO' : 'DEPOIS: GOOGLE GEMINI (IA)'}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white tracking-wider">
                EDITADA (MANUAL)
              </span>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR: PROFESSIONAL ADJUSTMENTS PANEL (Organizado nos 6 grupos do Requirement 4) */}
        <div className={`
          w-80 sm:w-88 border-l border-[var(--border-color)] bg-[var(--bg-surface)] flex flex-col h-full shrink-0 z-30 transition-transform duration-300
          ${isMobilePanelOpen ? 'fixed inset-y-0 right-0 z-50 shadow-2xl' : 'hidden lg:flex'}
        `}>
          {/* Mobile Panel Header */}
          <div className="lg:hidden flex items-center justify-between p-3.5 border-b border-[var(--border-color)] bg-[var(--bg-subtle)]">
            <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#FFC72C]" />
              Ajustes Fotográficos
            </span>
            <button
              onClick={() => setIsMobilePanelOpen(false)}
              className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* AI Diagnostic Header Card */}
          {selectedPhoto.analysis && (
            <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-subtle)] space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFC72C]" />
                  Diagnóstico da IA
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                  isSimulatedAI
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    : 'bg-[#00509E]/20 border-[#00509E]/40 text-[#1A6DC2]'
                }`}>
                  {isSimulatedAI ? 'Motor Local' : `${Math.round((selectedPhoto.analysis.confidence || 0.9) * 100)}% Confiança`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">Tipo</span>
                  <span className="font-semibold capitalize text-[var(--text-primary)] truncate block">
                    {selectedPhoto.analysis.image_type}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">Iluminação</span>
                  <span className="font-semibold capitalize text-[var(--text-primary)] truncate block">
                    {selectedPhoto.analysis.lighting.quality}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[var(--text-secondary)] italic leading-relaxed pt-0.5 line-clamp-2">
                "{selectedPhoto.analysis.reasoning_summary}"
              </p>
            </div>
          )}

          {/* Scrollable Groups Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {/* GRUPO 1: Exposição e Iluminação (Requirement 4) */}
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup('exposure')}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sun className="w-3.5 h-3.5 text-[#FFC72C]" />
                  <span>Exposição e Iluminação</span>
                </div>
                {openGroups.exposure ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
              </button>

              {openGroups.exposure && (
                <div className="p-3.5 pt-1 space-y-3 border-t border-[var(--border-color)]/60 bg-[var(--bg-surface)]">
                  {/* Exposição */}
                  <div className="space-y-1">
                    <div 
                      className="flex justify-between text-[11px] font-semibold cursor-pointer group"
                      onDoubleClick={() => handleAdjustmentChange('exposure', 0)}
                      title="Duplo clique para zerar"
                    >
                      <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Exposição</span>
                      <span className="text-[#FFC72C] font-mono">{formatSigned(adjustments.exposure, ' EV')}</span>
                    </div>
                    <input
                      type="range"
                      min={SAFE_BOUNDS.exposure.min}
                      max={SAFE_BOUNDS.exposure.max}
                      step={SAFE_BOUNDS.exposure.step}
                      value={adjustments.exposure}
                      onChange={(e) => handleAdjustmentChange('exposure', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Altas Luzes (Highlights) */}
                  <div className="space-y-1">
                    <div 
                      className="flex justify-between text-[11px] font-semibold cursor-pointer group"
                      onDoubleClick={() => handleAdjustmentChange('highlights', 0)}
                      title="Duplo clique para zerar"
                    >
                      <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Altas Luzes</span>
                      <span className="text-[var(--text-secondary)] font-mono">{formatSigned(adjustments.highlights)}</span>
                    </div>
                    <input
                      type="range"
                      min={SAFE_BOUNDS.highlights.min}
                      max={SAFE_BOUNDS.highlights.max}
                      step={SAFE_BOUNDS.highlights.step}
                      value={adjustments.highlights}
                      onChange={(e) => handleAdjustmentChange('highlights', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Brancos (Whites) */}
                  <div className="space-y-1">
                    <div 
                      className="flex justify-between text-[11px] font-semibold cursor-pointer group"
                      onDoubleClick={() => handleAdjustmentChange('whites', 0)}
                      title="Duplo clique para zerar"
                    >
                      <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Brancos</span>
                      <span className="text-[var(--text-secondary)] font-mono">{formatSigned(adjustments.whites)}</span>
                    </div>
                    <input
                      type="range"
                      min={SAFE_BOUNDS.whites.min}
                      max={SAFE_BOUNDS.whites.max}
                      step={SAFE_BOUNDS.whites.step}
                      value={adjustments.whites}
                      onChange={(e) => handleAdjustmentChange('whites', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* GRUPO 2: Contraste (Requirement 4) */}
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup('contrast')}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-[#1A6DC2]" />
                  <span>Contraste & Tons Escuros</span>
                </div>
                {openGroups.contrast ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
              </button>

              {openGroups.contrast && (
                <div className="p-3.5 pt-1 space-y-3 border-t border-[var(--border-color)]/60 bg-[var(--bg-surface)]">
                  {/* Contraste */}
                  <div className="space-y-1">
                    <div 
                      className="flex justify-between text-[11px] font-semibold cursor-pointer group"
                      onDoubleClick={() => handleAdjustmentChange('contrast', 0)}
                      title="Duplo clique para zerar"
                    >
                      <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Contraste</span>
                      <span className="text-[var(--text-secondary)] font-mono">{formatSigned(adjustments.contrast)}</span>
                    </div>
                    <input
                      type="range"
                      min={SAFE_BOUNDS.contrast.min}
                      max={SAFE_BOUNDS.contrast.max}
                      step={SAFE_BOUNDS.contrast.step}
                      value={adjustments.contrast}
                      onChange={(e) => handleAdjustmentChange('contrast', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Pretos (Blacks) */}
                  <div className="space-y-1">
                    <div 
                      className="flex justify-between text-[11px] font-semibold cursor-pointer group"
                      onDoubleClick={() => handleAdjustmentChange('blacks', 0)}
                      title="Duplo clique para zerar"
                    >
                      <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Pretos</span>
                      <span className="text-[var(--text-secondary)] font-mono">{formatSigned(adjustments.blacks)}</span>
                    </div>
                    <input
                      type="range"
                      min={SAFE_BOUNDS.blacks.min}
                      max={SAFE_BOUNDS.blacks.max}
                      step={SAFE_BOUNDS.blacks.step}
                      value={adjustments.blacks}
                      onChange={(e) => handleAdjustmentChange('blacks', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* GRUPO 3: Temperatura e Balanço de Branco (Requirement 4) */}
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup('wb')}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5 text-[#FFC72C]" />
                  <span>Temperatura & Balanço de Branco</span>
                </div>
                {openGroups.wb ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
              </button>

              {openGroups.wb && (
                <div className="p-3.5 pt-1 space-y-3 border-t border-[var(--border-color)]/60 bg-[var(--bg-surface)]">
                  {/* Temperatura */}
                  <div className="space-y-1">
                    <div 
                      className="flex justify-between text-[11px] font-semibold cursor-pointer group"
                      onDoubleClick={() => handleAdjustmentChange('temperature', 0)}
                      title="Duplo clique para zerar"
                    >
                      <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Temperatura</span>
                      <span className="text-[#FFC72C] font-mono">{formatSigned(adjustments.temperature, ' K')}</span>
                    </div>
                    <input
                      type="range"
                      min={SAFE_BOUNDS.temperature.min}
                      max={SAFE_BOUNDS.temperature.max}
                      step={SAFE_BOUNDS.temperature.step}
                      value={adjustments.temperature}
                      onChange={(e) => handleAdjustmentChange('temperature', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Matiz (Tint) */}
                  <div className="space-y-1">
                    <div 
                      className="flex justify-between text-[11px] font-semibold cursor-pointer group"
                      onDoubleClick={() => handleAdjustmentChange('tint', 0)}
                      title="Duplo clique para zerar"
                    >
                      <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Matiz (Tint)</span>
                      <span className="text-[var(--text-secondary)] font-mono">{formatSigned(adjustments.tint)}</span>
                    </div>
                    <input
                      type="range"
                      min={SAFE_BOUNDS.tint.min}
                      max={SAFE_BOUNDS.tint.max}
                      step={SAFE_BOUNDS.tint.step}
                      value={adjustments.tint}
                      onChange={(e) => handleAdjustmentChange('tint', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* GRUPO 4: Saturação e Cores (Requirement 4) */}
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup('color')}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5 text-[#1A6DC2]" />
                  <span>Saturação & Vibração</span>
                </div>
                {openGroups.color ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
              </button>

              {openGroups.color && (
                <div className="p-3.5 pt-1 space-y-3 border-t border-[var(--border-color)]/60 bg-[var(--bg-surface)]">
                  {/* Saturação */}
                  <div className="space-y-1">
                    <div 
                      className="flex justify-between text-[11px] font-semibold cursor-pointer group"
                      onDoubleClick={() => handleAdjustmentChange('saturation', 0)}
                      title="Duplo clique para zerar"
                    >
                      <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Saturação</span>
                      <span className="text-[var(--text-secondary)] font-mono">{formatSigned(adjustments.saturation)}</span>
                    </div>
                    <input
                      type="range"
                      min={SAFE_BOUNDS.saturation.min}
                      max={SAFE_BOUNDS.saturation.max}
                      step={SAFE_BOUNDS.saturation.step}
                      value={adjustments.saturation}
                      onChange={(e) => handleAdjustmentChange('saturation', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Vibração (Vibrance) */}
                  <div className="space-y-1">
                    <div 
                      className="flex justify-between text-[11px] font-semibold cursor-pointer group"
                      onDoubleClick={() => handleAdjustmentChange('vibrance', 0)}
                      title="Duplo clique para zerar"
                    >
                      <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Vibração (Protege Pele)</span>
                      <span className="text-[var(--text-secondary)] font-mono">{formatSigned(adjustments.vibrance)}</span>
                    </div>
                    <input
                      type="range"
                      min={SAFE_BOUNDS.vibrance.min}
                      max={SAFE_BOUNDS.vibrance.max}
                      step={SAFE_BOUNDS.vibrance.step}
                      value={adjustments.vibrance}
                      onChange={(e) => handleAdjustmentChange('vibrance', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* GRUPO 5: Sombras e Realces (Requirement 4) */}
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup('shadows')}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sun className="w-3.5 h-3.5 text-[#FFC72C]" />
                  <span>Sombras & Realces</span>
                </div>
                {openGroups.shadows ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
              </button>

              {openGroups.shadows && (
                <div className="p-3.5 pt-1 space-y-3 border-t border-[var(--border-color)]/60 bg-[var(--bg-surface)]">
                  {/* Sombras */}
                  <div className="space-y-1">
                    <div 
                      className="flex justify-between text-[11px] font-semibold cursor-pointer group"
                      onDoubleClick={() => handleAdjustmentChange('shadows', 0)}
                      title="Duplo clique para zerar"
                    >
                      <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Recuperação de Sombras</span>
                      <span className="text-[var(--text-secondary)] font-mono">{formatSigned(adjustments.shadows)}</span>
                    </div>
                    <input
                      type="range"
                      min={SAFE_BOUNDS.shadows.min}
                      max={SAFE_BOUNDS.shadows.max}
                      step={SAFE_BOUNDS.shadows.step}
                      value={adjustments.shadows}
                      onChange={(e) => handleAdjustmentChange('shadows', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* GRUPO 6: Nitidez e Redução de Ruído (Requirement 4) */}
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup('detail')}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nitidez & Redução de Ruído</span>
                </div>
                {openGroups.detail ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
              </button>

              {openGroups.detail && (
                <div className="p-3.5 pt-1 space-y-3 border-t border-[var(--border-color)]/60 bg-[var(--bg-surface)]">
                  {/* Nitidez */}
                  <div className="space-y-1">
                    <div 
                      className="flex justify-between text-[11px] font-semibold cursor-pointer group"
                      onDoubleClick={() => handleAdjustmentChange('sharpness', 0)}
                      title="Duplo clique para zerar"
                    >
                      <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Nitidez</span>
                      <span className="text-[#FFC72C] font-mono">{adjustments.sharpness}</span>
                    </div>
                    <input
                      type="range"
                      min={SAFE_BOUNDS.sharpness.min}
                      max={SAFE_BOUNDS.sharpness.max}
                      step={SAFE_BOUNDS.sharpness.step}
                      value={adjustments.sharpness}
                      onChange={(e) => handleAdjustmentChange('sharpness', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Redução de Ruído */}
                  <div className="space-y-1">
                    <div 
                      className="flex justify-between text-[11px] font-semibold cursor-pointer group"
                      onDoubleClick={() => handleAdjustmentChange('noise_reduction', 0)}
                      title="Duplo clique para zerar"
                    >
                      <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Redução de Ruído</span>
                      <span className="text-[var(--text-secondary)] font-mono">{adjustments.noise_reduction}</span>
                    </div>
                    <input
                      type="range"
                      min={SAFE_BOUNDS.noise_reduction.min}
                      max={SAFE_BOUNDS.noise_reduction.max}
                      step={SAFE_BOUNDS.noise_reduction.step}
                      value={adjustments.noise_reduction}
                      onChange={(e) => handleAdjustmentChange('noise_reduction', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Alinhamento / Rotação */}
                  <div className="space-y-1">
                    <div 
                      className="flex justify-between text-[11px] font-semibold cursor-pointer group"
                      onDoubleClick={() => handleAdjustmentChange('rotation', 0)}
                      title="Duplo clique para zerar"
                    >
                      <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Alinhamento</span>
                      <span className="text-[var(--text-secondary)] font-mono">{formatSigned(adjustments.rotation || 0, '°')}</span>
                    </div>
                    <input
                      type="range"
                      min={-45}
                      max={45}
                      step={0.5}
                      value={adjustments.rotation || 0}
                      onChange={(e) => handleAdjustmentChange('rotation', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SEÇÃO IA: REANÁLISE E INSTRUÇÕES CUSTOMIZADAS */}
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup('ai')}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFC72C]" />
                  <span>Instrução & Reanálise com IA</span>
                </div>
                {openGroups.ai ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
              </button>

              {openGroups.ai && (
                <div className="p-3.5 pt-2 space-y-3 border-t border-[var(--border-color)]/60 bg-[var(--bg-surface)]">
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Instrua o Gemini a recalibrar os parâmetros para o clima desejado:
                  </p>
                  <textarea
                    rows={2}
                    value={reanalyzePrompt}
                    onChange={(e) => setReanalyzePrompt(e.target.value)}
                    placeholder="Ex: Deixe mais aquecido e com tons dourados naturais"
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#00509E] resize-none"
                  />
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: '❄️ Mais Neutro', text: 'Neutralize o tom amarelado preservando brancos puros.' },
                      { label: '☀️ Mais Aquecido', text: 'Aqueça a luz com tons dourados naturais.' },
                      { label: '🌓 Mais Contraste', text: 'Aprofunde as sombras com contraste elegante.' }
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setReanalyzePrompt(chip.text)
                          handleReanalyzeWithAI(chip.text)
                        }}
                        className="px-2 py-0.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[#00509E] hover:text-white border border-[var(--border-color)] text-[10px] text-[var(--text-secondary)] font-medium transition-all"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleReanalyzeWithAI()}
                    disabled={isReanalyzing || !reanalyzePrompt.trim()}
                    className="w-full py-2 rounded-xl bg-[#00509E] hover:bg-[#003F7E] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-sm"
                  >
                    {isReanalyzing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFC72C]" />
                        <span>Reanalisando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3 text-[#FFC72C]" />
                        <span>Recalcular Parâmetros</span>
                      </>
                    )}
                  </button>

                  {reanalyzeSuccess && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold flex items-center gap-1.5 animate-fade-in">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>Novos parâmetros aplicados com sucesso!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM RESTORE ACTIONS (Ações funcionais de restauração - Requirement 4) */}
          <div className="p-3.5 border-t border-[var(--border-color)] bg-[var(--bg-subtle)] flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetToOriginal}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-elevated)] transition-colors flex items-center gap-1.5"
              title="Restaurar imagem para valores originais de câmera"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Original</span>
            </button>

            {selectedPhoto.analysis?.recommended_edit && (
              <button
                type="button"
                onClick={handleResetToAI}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[#00509E] hover:text-white text-xs font-bold text-[var(--text-primary)] border border-[var(--border-color)] transition-all flex items-center gap-1.5 shadow-sm"
                title="Reaplicar a recomendação inicial calculada pela IA"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FFC72C]" />
                <span>Restaurar IA</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM FILMSTRIP (Fila de miniaturas com status claro - Requirements 3 & 5) */}
      <div className="h-24 bg-[var(--bg-surface)] border-t border-[var(--border-color)] px-4 py-2 flex items-center gap-3 shrink-0 overflow-hidden">
        <div 
          ref={filmstripRef}
          className="flex-1 flex items-center gap-2.5 overflow-x-auto overflow-y-hidden py-1 scroll-smooth"
        >
          {photos.map((photo, idx) => {
            const isSelected = photo.id === selectedPhoto.id
            const displayThumb = photo.editedUrl || photo.originalUrl
            return (
              <div
                key={photo.id}
                data-photo-id={photo.id}
                onClick={() => onSelectPhoto(photo)}
                className={`group relative h-18 w-24 shrink-0 rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-200 bg-black/60 ${
                  isSelected
                    ? 'border-[#FFC72C] ring-2 ring-[#00509E]/50 scale-[1.03] shadow-md'
                    : 'border-[var(--border-color)] hover:border-[#1A6DC2] opacity-80 hover:opacity-100'
                }`}
              >
                <img
                  src={displayThumb}
                  alt={photo.filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Status Dot / Overlay */}
                <div className="absolute top-1 left-1 z-10">
                  {photo.status === 'completed' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 block shadow-[0_0_6px_#34d399]" />
                  )}
                  {photo.status === 'analyzing' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1A6DC2] block animate-ping" />
                  )}
                  {photo.status === 'editing' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFC72C] block animate-pulse" />
                  )}
                  {photo.status === 'error' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block shadow-[0_0_6px_#f43f5e]" />
                  )}
                  {photo.status === 'waiting' && (
                    <span className="w-2 h-2 rounded-full bg-slate-500 block" />
                  )}
                </div>

                {/* Index tag */}
                <div className="absolute bottom-1 right-1 px-1 rounded bg-black/75 text-[9px] font-mono text-white/90">
                  #{idx + 1}
                </div>

                {/* Hover Delete Action */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemovePhoto(photo.id)
                  }}
                  className="absolute top-1 right-1 p-0.5 rounded bg-black/75 text-[var(--text-muted)] hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remover foto"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            )
          })}

          {/* Add Photos Tile */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-18 w-20 shrink-0 rounded-xl border border-dashed border-[var(--border-color)] hover:border-[#1A6DC2] bg-[var(--bg-elevated)]/60 hover:bg-[var(--bg-elevated)] flex flex-col items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
            title="Adicionar mais fotos ao lote"
          >
            <UploadCloud className="w-4 h-4 text-[#FFC72C] mb-0.5" />
            <span className="text-[10px] font-bold">Mais Fotos</span>
          </button>
        </div>

        {/* Clear Batch Quick Action */}
        <button
          type="button"
          onClick={onClearBatch}
          disabled={isProcessing}
          className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-rose-400 p-2 rounded-xl border border-transparent hover:border-[var(--border-color)] transition-colors shrink-0"
          title="Descartar todas as fotos do lote"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Limpar Lote</span>
        </button>
      </div>
    </div>
  )
}
