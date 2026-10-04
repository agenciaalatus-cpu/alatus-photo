import React, { useState, useEffect, useRef } from 'react'
import { 
  X, 
  Sparkles, 
  RotateCw, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Sliders, 
  Sun, 
  Palette, 
  Flame, 
  RotateCcw, 
  User, 
  Layers, 
  Send, 
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { PhotoItem, PhotoAdjustments, SAFE_BOUNDS, DEFAULT_ADJUSTMENTS, AppSettings } from '../types/photo'
import { ImageEditingService } from '../services/imageEditingService'
import { GeminiService } from '../services/geminiService'
import { ExportService } from '../services/exportService'
import { formatSigned } from '../utils/formatters'

interface DetailEditorModalProps {
  photo: PhotoItem | null
  photos?: PhotoItem[]
  isOpen: boolean
  onClose: () => void
  settings: AppSettings
  onUpdatePhotoAdjustments: (photoId: string, newAdjustments: PhotoAdjustments, newAnalysis?: any) => void
  onNavigatePhoto?: (photo: PhotoItem) => void
}

export const DetailEditorModal: React.FC<DetailEditorModalProps> = ({
  photo,
  photos,
  isOpen,
  onClose,
  settings,
  onUpdatePhotoAdjustments,
  onNavigatePhoto
}) => {
  if (!isOpen || !photo) return null

  // Local adjustments state
  const [adjustments, setAdjustments] = useState<PhotoAdjustments>({ ...photo.userAdjustments })
  const [splitPos, setSplitPos] = useState(50) // Percentage 0 to 100
  const [isDraggingSplit, setIsDraggingSplit] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1) // 1, 1.5, 2
  const [activeTab, setActiveTab] = useState<'light' | 'color' | 'detail' | 'geometry' | 'ai'>('light')
  const [reanalyzePrompt, setReanalyzePrompt] = useState('')
  const [isReanalyzing, setIsReanalyzing] = useState(false)
  const [reanalyzeSuccess, setReanalyzeSuccess] = useState(false)

  // Photos indexing for navigation
  const currentIndex = photos && photo ? photos.findIndex((p) => p.id === photo.id) : -1
  const hasPrev = currentIndex > 0
  const hasNext = Boolean(photos && currentIndex >= 0 && currentIndex < photos.length - 1)

  const handlePrevPhoto = () => {
    if (hasPrev && photos && onNavigatePhoto) {
      onNavigatePhoto(photos[currentIndex - 1])
    }
  }

  const handleNextPhoto = () => {
    if (hasNext && photos && onNavigatePhoto) {
      onNavigatePhoto(photos[currentIndex + 1])
    }
  }

  // Keyboard navigation & shortcuts (Lightroom style)
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === '\\') {
        setSplitPos((pos) => (pos > 50 ? 0 : 100))
      } else if (e.key === 'z' || e.key === 'Z') {
        setZoomLevel((z) => (z > 1 ? 1 : 2))
      } else if (e.key === 'ArrowRight') {
        handleNextPhoto()
      } else if (e.key === 'ArrowLeft') {
        handlePrevPhoto()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, photo, photos, currentIndex, hasPrev, hasNext, onClose])

  // Canvas refs
  const editedCanvasRef = useRef<HTMLCanvasElement>(null)
  const imgElementRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load image element and render
  useEffect(() => {
    setAdjustments({ ...photo.userAdjustments })
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imgElementRef.current = img
      renderCanvas({ ...photo.userAdjustments })
    }
    img.src = photo.originalUrl
  }, [photo.id])

  const renderCanvas = (currentAdj: PhotoAdjustments) => {
    if (!editedCanvasRef.current || !imgElementRef.current) return
    ImageEditingService.renderToCanvas(
      imgElementRef.current,
      editedCanvasRef.current,
      currentAdj,
      { maxDimension: 1400 }
    )
  }

  const handleAdjustmentChange = (key: keyof PhotoAdjustments, value: number) => {
    const updated = { ...adjustments, [key]: value }
    setAdjustments(updated)
    renderCanvas(updated)
    onUpdatePhotoAdjustments(photo.id, updated)
  }

  const handleResetToAI = () => {
    if (photo.analysis?.recommended_edit) {
      const aiEdits = { ...photo.analysis.recommended_edit }
      setAdjustments(aiEdits)
      renderCanvas(aiEdits)
      onUpdatePhotoAdjustments(photo.id, aiEdits)
    }
  }

  const handleResetToOriginal = () => {
    const reset = { ...DEFAULT_ADJUSTMENTS }
    setAdjustments(reset)
    renderCanvas(reset)
    onUpdatePhotoAdjustments(photo.id, reset)
  }

  const handleReanalyze = async (customText?: string) => {
    const textToUse = customText || reanalyzePrompt.trim()
    if (!textToUse) return
    setIsReanalyzing(true)
    setReanalyzeSuccess(false)
    try {
      const res = await GeminiService.reanalyzePhoto(
        photo.file,
        adjustments,
        textToUse,
        settings.geminiApiKey,
        imgElementRef.current || undefined
      )
      setAdjustments(res.recommended_edit)
      renderCanvas(res.recommended_edit)
      onUpdatePhotoAdjustments(photo.id, res.recommended_edit, res)
      setReanalyzeSuccess(true)
      setReanalyzePrompt('')
      setTimeout(() => setReanalyzeSuccess(false), 4000)
    } catch (err: any) {
      alert(`Erro na reanálise: ${err.message || 'Falha ao processar'}`)
    } finally {
      setIsReanalyzing(false)
    }
  }

  // Handle Split comparison drag
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingSplit || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = Math.max(5, Math.min(95, (x / rect.width) * 100))
    setSplitPos(percent)
  }

  const handleDownloadSingle = async () => {
    await ExportService.exportSinglePhoto(
      { ...photo, userAdjustments: adjustments },
      settings
    )
  }

  // Tab indicator dots
  const hasLightChanges = adjustments.exposure !== 0 || adjustments.contrast !== 0 || adjustments.highlights !== 0 || adjustments.shadows !== 0 || adjustments.whites !== 0 || adjustments.blacks !== 0
  const hasColorChanges = adjustments.temperature !== 0 || adjustments.tint !== 0 || adjustments.saturation !== 0 || adjustments.vibrance !== 0
  const hasDetailChanges = adjustments.sharpness > 0 || adjustments.noise_reduction > 0

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col overflow-hidden animate-fade-in"
      onMouseUp={() => setIsDraggingSplit(false)}
      onMouseLeave={() => setIsDraggingSplit(false)}
    >
      {/* Top Header */}
      <div className="h-14 border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#00509E]/20 text-[#00509E] border border-[#00509E]/30">
            <Sparkles className="w-4 h-4 text-[#FFC72C]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] truncate max-w-[200px] sm:max-w-xs font-heading">
              {photo.filename}
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] font-mono">
              <span>{photo.originalWidth} × {photo.originalHeight}</span>
              <span>•</span>
              <span className="capitalize">{photo.analysis?.image_type || 'Fotografia'}</span>
            </div>
          </div>

          {/* Photo Navigation (Prev / Next) */}
          {photos && photos.length > 1 && (
            <div className="hidden sm:flex items-center gap-1 ml-4 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)]">
              <button
                onClick={handlePrevPhoto}
                disabled={!hasPrev}
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-30 transition-all"
                title="Foto anterior (Seta ←)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono px-2 font-bold text-[var(--text-primary)]">
                {currentIndex + 1} de {photos.length}
              </span>
              <button
                onClick={handleNextPhoto}
                disabled={!hasNext}
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-30 transition-all"
                title="Próxima foto (Seta →)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Center Comparison & Zoom Tools */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[var(--bg-elevated)] p-1 rounded-xl border border-[var(--border-color)]">
            <button
              onClick={() => setZoomLevel((z) => (z > 1 ? z - 0.5 : 1))}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              title="Reduzir zoom (Z)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1 font-bold text-[var(--text-primary)]">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => (z < 2.5 ? z + 0.5 : 2.5))}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              title="Aumentar zoom (Z)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-4 bg-[var(--border-color)] mx-1" />
            <button
              onClick={() => setSplitPos(50)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${splitPos === 50 ? 'bg-[#00509E] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              50/50 Split
            </button>
            <button
              onClick={() => setSplitPos(100)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${splitPos === 100 ? 'bg-[#00509E] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              title="Exibir apenas foto revelada"
            >
              Apenas Revelada
            </button>
          </div>

          <div className="text-[10px] text-[var(--text-muted)] font-mono bg-[var(--bg-subtle)] px-2.5 py-1 rounded-lg border border-[var(--border-color)]">
            Atalho: <kbd className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold">\</kbd> Antes/Depois
          </div>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadSingle}
            className="px-3.5 py-1.5 rounded-xl bg-[#00509E] hover:bg-[#1A6DC2] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 hover:scale-105 active:scale-95"
            title="Exportar esta foto com ajustes atuais"
          >
            <Download className="w-3.5 h-3.5 text-[#FFC72C]" />
            <span className="hidden sm:inline">Exportar Foto</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors hover:scale-105 active:scale-95"
            title="Fechar (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Workspace (Preview + Sidebar) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Interactive Split Comparison Viewport */}
        <div 
          ref={containerRef}
          onMouseMove={handleMouseMove}
          className="flex-1 relative bg-[#0B0D10] overflow-hidden flex items-center justify-center select-none"
        >
          <div 
            className="relative transition-transform duration-150 ease-out flex items-center justify-center max-w-full max-h-full"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* 1. Underlying Original Image (Left side of split) */}
            <img
              src={photo.originalUrl}
              alt="Original"
              className="max-h-[82vh] max-w-[82vw] object-contain pointer-events-none rounded-lg shadow-2xl"
            />

            {/* 2. Top Edited Canvas (Right side of split, clipped) */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ clipPath: `inset(0 0 0 ${splitPos}%)` }}
            >
              <canvas
                ref={editedCanvasRef}
                className="w-full h-full object-contain pointer-events-none rounded-lg"
              />
            </div>

            {/* Split Handle Line */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_12px_rgba(0,0,0,0.8)] cursor-ew-resize pointer-events-auto z-20"
              style={{ left: `${splitPos}%` }}
              onMouseDown={() => setIsDraggingSplit(true)}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-[#0B0D10] font-black text-[10px] flex items-center justify-center shadow-2xl border border-black/20 cursor-ew-resize select-none">
                ⇄
              </div>
            </div>
          </div>

          {/* Badges: ANTES / DEPOIS Floating indicators */}
          <div className="absolute bottom-5 left-6 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-bold text-white tracking-widest pointer-events-none">
            ANTES (ORIGINAL)
          </div>
          <div className="absolute bottom-5 right-6 px-3 py-1 rounded-full bg-[#00509E]/80 backdrop-blur-md border border-[#FFC72C]/40 text-[11px] font-bold text-white tracking-widest pointer-events-none flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#FFC72C]" />
            DEPOIS (IA GEMINI)
          </div>
        </div>

        {/* Right: Professional Tuning Sidebar */}
        <div className="w-80 sm:w-96 border-l border-[var(--border-color)] bg-[var(--bg-surface)] flex flex-col h-full shrink-0">
          {/* AI Analysis Summary Pill Card */}
          {photo.analysis && (
            <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-subtle)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFC72C]" />
                  Diagnóstico da IA
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00509E]/20 text-[#1A6DC2] font-semibold border border-[#00509E]/30">
                  {Math.round((photo.analysis.confidence || 0.9) * 100)}% confiança
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--text-secondary)]">
                <div className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">Tipo</span>
                  <span className="font-semibold capitalize text-[var(--text-primary)]">{photo.analysis.image_type}</span>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">Iluminação</span>
                  <span className="font-semibold capitalize text-[var(--text-primary)]">{photo.analysis.lighting.quality}</span>
                </div>
              </div>

              <p className="text-xs text-[var(--text-muted)] italic leading-relaxed pt-1">
                "{photo.analysis.reasoning_summary}"
              </p>
            </div>
          )}

          {/* Adjustment Tabs */}
          <div className="flex border-b border-[var(--border-color)] px-1.5 bg-[var(--bg-subtle)]/70 text-xs font-bold">
            <button
              onClick={() => setActiveTab('light')}
              className={`flex-1 py-3 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'light'
                  ? 'border-[#00509E] text-[var(--text-primary)] font-bold'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>Luz</span>
              {hasLightChanges && <span className="w-1.5 h-1.5 rounded-full bg-[#FFC72C] shadow-[0_0_6px_#FFC72C]" />}
            </button>
            <button
              onClick={() => setActiveTab('color')}
              className={`flex-1 py-3 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'color'
                  ? 'border-[#00509E] text-[var(--text-primary)] font-bold'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>Cor</span>
              {hasColorChanges && <span className="w-1.5 h-1.5 rounded-full bg-[#FFC72C] shadow-[0_0_6px_#FFC72C]" />}
            </button>
            <button
              onClick={() => setActiveTab('detail')}
              className={`flex-1 py-3 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'detail'
                  ? 'border-[#00509E] text-[var(--text-primary)] font-bold'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>Detalhes</span>
              {hasDetailChanges && <span className="w-1.5 h-1.5 rounded-full bg-[#FFC72C] shadow-[0_0_6px_#FFC72C]" />}
            </button>
            <button
              onClick={() => setActiveTab('geometry')}
              className={`flex-1 py-3 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'geometry'
                  ? 'border-[#00509E] text-[var(--text-primary)] font-bold'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>Geometria</span>
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-3 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'ai'
                  ? 'border-[#00509E] text-[#FFC72C] font-bold'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[#FFC72C]'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#FFC72C]" />
              <span>IA</span>
            </button>
          </div>

          {/* Sliders Container */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {activeTab === 'light' && (
              <div className="space-y-4">
                {/* Exposure */}
                <div className="space-y-1.5">
                  <div
                    className="flex justify-between text-xs font-semibold cursor-pointer select-none group"
                    onDoubleClick={() => handleAdjustmentChange('exposure', 0)}
                    title="Duplo clique para zerar"
                  >
                    <span className="text-[var(--text-primary)] group-hover:text-[#FFC72C] transition-colors">Exposição</span>
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

                {/* Contrast */}
                <div className="space-y-1.5">
                  <div
                    className="flex justify-between text-xs font-semibold cursor-pointer select-none group"
                    onDoubleClick={() => handleAdjustmentChange('contrast', 0)}
                    title="Duplo clique para zerar"
                  >
                    <span className="text-[var(--text-primary)] group-hover:text-[#FFC72C] transition-colors">Contraste</span>
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

                {/* Highlights */}
                <div className="space-y-1.5">
                  <div
                    className="flex justify-between text-xs font-semibold cursor-pointer select-none group"
                    onDoubleClick={() => handleAdjustmentChange('highlights', 0)}
                    title="Duplo clique para zerar"
                  >
                    <span className="text-[var(--text-primary)] group-hover:text-[#FFC72C] transition-colors">Altas Luzes (Highlights)</span>
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

                {/* Shadows */}
                <div className="space-y-1.5">
                  <div
                    className="flex justify-between text-xs font-semibold cursor-pointer select-none group"
                    onDoubleClick={() => handleAdjustmentChange('shadows', 0)}
                    title="Duplo clique para zerar"
                  >
                    <span className="text-[var(--text-primary)] group-hover:text-[#FFC72C] transition-colors">Sombras (Shadows)</span>
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

                {/* Whites */}
                <div className="space-y-1.5">
                  <div
                    className="flex justify-between text-xs font-semibold cursor-pointer select-none group"
                    onDoubleClick={() => handleAdjustmentChange('whites', 0)}
                    title="Duplo clique para zerar"
                  >
                    <span className="text-[var(--text-primary)] group-hover:text-[#FFC72C] transition-colors">Brancos (Whites)</span>
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

                {/* Blacks */}
                <div className="space-y-1.5">
                  <div
                    className="flex justify-between text-xs font-semibold cursor-pointer select-none group"
                    onDoubleClick={() => handleAdjustmentChange('blacks', 0)}
                    title="Duplo clique para zerar"
                  >
                    <span className="text-[var(--text-primary)] group-hover:text-[#FFC72C] transition-colors">Pretos (Blacks)</span>
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

            {activeTab === 'color' && (
              <div className="space-y-4">
                {/* Temperature */}
                <div className="space-y-1.5">
                  <div
                    className="flex justify-between text-xs font-semibold cursor-pointer select-none group"
                    onDoubleClick={() => handleAdjustmentChange('temperature', 0)}
                    title="Duplo clique para zerar"
                  >
                    <span className="text-[var(--text-primary)] group-hover:text-[#FFC72C] transition-colors">Temperatura</span>
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

                {/* Tint */}
                <div className="space-y-1.5">
                  <div
                    className="flex justify-between text-xs font-semibold cursor-pointer select-none group"
                    onDoubleClick={() => handleAdjustmentChange('tint', 0)}
                    title="Duplo clique para zerar"
                  >
                    <span className="text-[var(--text-primary)] group-hover:text-[#FFC72C] transition-colors">Matiz (Tint)</span>
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

                {/* Vibrance */}
                <div className="space-y-1.5">
                  <div
                    className="flex justify-between text-xs font-semibold cursor-pointer select-none group"
                    onDoubleClick={() => handleAdjustmentChange('vibrance', 0)}
                    title="Duplo clique para zerar"
                  >
                    <span className="text-[var(--text-primary)] group-hover:text-[#FFC72C] transition-colors">Vibração (Vibrance)</span>
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

                {/* Saturation */}
                <div className="space-y-1.5">
                  <div
                    className="flex justify-between text-xs font-semibold cursor-pointer select-none group"
                    onDoubleClick={() => handleAdjustmentChange('saturation', 0)}
                    title="Duplo clique para zerar"
                  >
                    <span className="text-[var(--text-primary)] group-hover:text-[#FFC72C] transition-colors">Saturação</span>
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
              </div>
            )}

            {activeTab === 'detail' && (
              <div className="space-y-4">
                {/* Sharpness */}
                <div className="space-y-1.5">
                  <div
                    className="flex justify-between text-xs font-semibold cursor-pointer select-none group"
                    onDoubleClick={() => handleAdjustmentChange('sharpness', 0)}
                    title="Duplo clique para zerar"
                  >
                    <span className="text-[var(--text-primary)] group-hover:text-[#FFC72C] transition-colors">Nitidez (Sharpness)</span>
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

                {/* Noise Reduction */}
                <div className="space-y-1.5">
                  <div
                    className="flex justify-between text-xs font-semibold cursor-pointer select-none group"
                    onDoubleClick={() => handleAdjustmentChange('noise_reduction', 0)}
                    title="Duplo clique para zerar"
                  >
                    <span className="text-[var(--text-primary)] group-hover:text-[#FFC72C] transition-colors">Redução de Ruído</span>
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
              </div>
            )}

            {activeTab === 'geometry' && (
              <div className="space-y-4">
                {/* Rotation */}
                <div className="space-y-1.5">
                  <div
                    className="flex justify-between text-xs font-semibold cursor-pointer select-none group"
                    onDoubleClick={() => handleAdjustmentChange('rotation', 0)}
                    title="Duplo clique para zerar"
                  >
                    <span className="text-[var(--text-primary)] group-hover:text-[#FFC72C] transition-colors">Alinhamento / Rotação</span>
                    <span className="text-[#FFC72C] font-mono">{formatSigned(adjustments.rotation || 0, '°')}</span>
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

            {activeTab === 'ai' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-2">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FFC72C]" />
                    Reanalisar com IA
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Diga ao Gemini o que você deseja mudar nesta fotografia específica. A IA recalculará novos parâmetros mantendo a essência da imagem.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Instrução de correção para esta foto
                  </label>
                  <textarea
                    rows={3}
                    value={reanalyzePrompt}
                    onChange={(e) => setReanalyzePrompt(e.target.value)}
                    placeholder="Ex: Deixe mais natural e menos contrastada, ou quero uma aparência mais cinematográfica com sombras quentes."
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl p-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#00509E] transition-all resize-none"
                  />

                  {/* Quick Suggestion Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
                      Sugestões Rápidas:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: '❄️ Mais neutro / Menos amarelo', text: 'Neutralize o tom amarelado mantendo brancos limpos e pele natural.' },
                        { label: '☀️ Mais aquecido', text: 'Aqueça suavemente a iluminação com tons dourados naturais.' },
                        { label: '🌗 Mais contraste & sombras', text: 'Aumente o contraste dramático e aprofunde as sombras.' },
                        { label: '👁️ Mais nitidez', text: 'Realce arestas e nitidez preservando suavidade da pele.' },
                        { label: '✨ Revelação natural', text: 'Equilíbrio limpo, natural e sem exageros.' }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setReanalyzePrompt(item.text)
                            handleReanalyze(item.text)
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] hover:bg-[#00509E] hover:text-white border border-[var(--border-color)] text-[11px] text-[var(--text-secondary)] font-medium transition-all text-left"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleReanalyze()}
                    disabled={isReanalyzing || !reanalyzePrompt.trim()}
                    className="w-full py-2.5 rounded-xl bg-[#00509E] hover:bg-[#003F7E] text-white text-xs font-bold shadow-md shadow-[#00509E]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isReanalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#FFC72C]" />
                        <span>O Gemini está reanalisando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-[#FFC72C]" />
                        <span>Gerar Novos Parâmetros com IA</span>
                      </>
                    )}
                  </button>
                </div>

                {reanalyzeSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2 animate-fade-in">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Novos parâmetros calculados e aplicados com sucesso!</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Reset Actions */}
          <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-subtle)] flex items-center justify-between gap-2 text-xs">
            <button
              onClick={handleResetToOriginal}
              className="text-[var(--text-secondary)] hover:text-white flex items-center gap-1 font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Original</span>
            </button>
            <button
              onClick={handleResetToAI}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[#00509E] hover:text-white text-[var(--text-primary)] font-semibold border border-[var(--border-color)] transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FFC72C]" />
              <span>Restaurar IA</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
