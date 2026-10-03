import React, { useState } from 'react'
import { 
  Sparkles, 
  Play, 
  Pause, 
  Download, 
  RotateCw, 
  Eye, 
  UploadCloud, 
  AlertCircle, 
  CheckCircle2, 
  Sliders, 
  Layers, 
  Trash2,
  Cpu,
  Loader2
} from 'lucide-react'
import { PhotoItem, AppSettings, ProcessingStatus } from '../types/photo'
import { PhotoCard } from './PhotoCard'
import { formatBytes } from '../utils/formatters'
import { ExportProgress } from '../services/exportService'

interface BatchViewProps {
  photos: PhotoItem[]
  isProcessing: boolean
  isExporting: boolean
  exportProgress: ExportProgress | null
  currentProcessingPhoto: PhotoItem | null
  settings: AppSettings
  onStartProcessing: () => void
  onCancelProcessing: () => void
  onExportBatch: () => void
  onClearBatch: () => void
  onSelectPhoto: (photo: PhotoItem) => void
  onRetryPhoto: (photoId: string) => void
  onRetryFailedPhotos: () => void
  onRemovePhoto: (photoId: string) => void
  onAddMorePhotos: (files: File[]) => void
}

export const BatchView: React.FC<BatchViewProps> = ({
  photos,
  isProcessing,
  isExporting,
  exportProgress,
  currentProcessingPhoto,
  settings,
  onStartProcessing,
  onCancelProcessing,
  onExportBatch,
  onClearBatch,
  onSelectPhoto,
  onRetryPhoto,
  onRetryFailedPhotos,
  onRemovePhoto,
  onAddMorePhotos
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isComparingAfter, setIsComparingAfter] = useState(true)

  const totalPhotos = photos.length
  const completedPhotos = photos.filter((p) => p.status === 'completed').length
  const errorPhotos = photos.filter((p) => p.status === 'error').length
  const waitingPhotos = photos.filter((p) => p.status === 'waiting').length
  const inProgressPhotos = photos.filter((p) => p.status === 'analyzing' || p.status === 'editing').length
  const totalBytes = photos.reduce((acc, p) => acc + p.fileSize, 0)

  const progressPercent = totalPhotos > 0 ? Math.round((completedPhotos / totalPhotos) * 100) : 0

  const filteredPhotos = photos.filter((p) => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'completed') return p.status === 'completed'
    if (filterStatus === 'error') return p.status === 'error'
    if (filterStatus === 'waiting') return p.status === 'waiting'
    return true
  })

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddMorePhotos(Array.from(e.target.files))
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      {/* Hidden file input for adding more photos */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleAddFiles}
      />

      {/* Batch Control Card */}
      <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#FFC72C]">
                Lote de Edição
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--border-color)]"></span>
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                {settings.analysisOnlyMode ? 'Modo Somente Análise' : `Estilo: ${settings.styleProfile.toUpperCase()}`}
              </span>
            </div>
            <h2 className="text-2xl font-black text-[var(--text-primary)] mt-1">
              {totalPhotos} {totalPhotos === 1 ? 'fotografia selecionada' : 'fotografias selecionadas'}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Tamanho total: <span className="font-semibold text-[var(--text-primary)]">{formatBytes(totalBytes)}</span> • 
              Análise individual por IA para cada imagem
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--color-gray-border)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4 text-[#FFC72C]" />
              <span>Adicionar Mais Fotos</span>
            </button>

            {isProcessing ? (
              <button
                onClick={onCancelProcessing}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-rose-900/30"
              >
                <Pause className="w-4 h-4" />
                <span>Interromper Processamento</span>
              </button>
            ) : (
              <button
                onClick={onStartProcessing}
                disabled={waitingPhotos === 0 && errorPhotos === 0}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00509E] to-[#1A6DC2] hover:from-[#003F7E] hover:to-[#00509E] text-white text-xs font-bold shadow-xl shadow-[#00509E]/30 transition-all flex items-center gap-2 disabled:opacity-40"
              >
                <Sparkles className="w-4 h-4 text-[#FFC72C]" />
                <span>
                  {completedPhotos > 0 ? 'ANALISAR RESTANTES' : 'ANALISAR E EDITAR LOTE'}
                </span>
              </button>
            )}

            <button
              onClick={onExportBatch}
              disabled={completedPhotos === 0 || isProcessing || isExporting}
              className="px-4 py-2.5 rounded-xl bg-[#252A31] hover:bg-[#323842] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] transition-all flex items-center gap-2 disabled:opacity-40 shadow-sm"
              title="Exportar todas as fotos editadas em um arquivo ZIP"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#FFC72C]" />
                  <span>Gerando ZIP ({exportProgress?.percentage || 0}%)...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-[#FFC72C]" />
                  <span>Exportar Lote (ZIP)</span>
                </>
              )}
            </button>

            <button
              onClick={onClearBatch}
              disabled={isProcessing}
              className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 border border-[var(--border-color)] transition-colors"
              title="Descartar lote atual"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section 29: Processing Progress Dashboard */}
        {isProcessing && (
          <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] space-y-3 animate-fade-in">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FFC72C] animate-spin" />
                <span className="font-bold text-[var(--text-primary)]">
                  Processando suas fotos...
                </span>
                <span className="font-mono text-[var(--text-secondary)]">
                  {completedPhotos} / {totalPhotos} fotos processadas
                </span>
              </div>
              <span className="font-bold text-[#FFC72C] font-mono text-sm">
                {progressPercent}%
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-2.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden p-0.5 border border-[var(--border-color)]">
              <div
                className="h-full bg-gradient-to-r from-[#00509E] via-[#1A6DC2] to-[#FFC72C] rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Current Active Photo Details */}
            {currentProcessingPhoto && (
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-1">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-medium text-[var(--text-muted)]">Foto atual:</span>
                  <span className="font-bold text-[var(--text-primary)] truncate max-w-xs">
                    {currentProcessingPhoto.filename}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-[#00509E]/20 text-[#1A6DC2] font-semibold text-[11px] border border-[#00509E]/30 shrink-0">
                  {currentProcessingPhoto.statusMessage || 'Analisando iluminação com Gemini...'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error Notification Alert */}
        {errorPhotos > 0 && !isProcessing && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-rose-400 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorPhotos} {errorPhotos === 1 ? 'foto não pôde ser processada.' : 'fotos não puderam ser processadas.'}</span>
            </div>
            <button
              onClick={onRetryFailedPhotos}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Tentar novamente</span>
            </button>
          </div>
        )}

        {/* Filter and Compare Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-color)]/60 text-xs">
          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filterStatus === 'all'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-color)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Todas ({totalPhotos})
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filterStatus === 'completed'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-[var(--text-secondary)] hover:text-emerald-400'
              }`}
            >
              Concluídas ({completedPhotos})
            </button>
            {errorPhotos > 0 && (
              <button
                onClick={() => setFilterStatus('error')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  filterStatus === 'error'
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'text-[var(--text-secondary)] hover:text-rose-400'
                }`}
              >
                Erros ({errorPhotos})
              </button>
            )}
          </div>

          {/* Batch Compare Switch (Section 31) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              Comparação do Lote:
            </span>
            <button
              type="button"
              onClick={() => setIsComparingAfter(!isComparingAfter)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--color-gray-border)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] transition-all shadow-sm"
            >
              <Eye className="w-3.5 h-3.5 text-[#FFC72C]" />
              <span>{isComparingAfter ? 'Exibindo: EDITADA' : 'Exibindo: ORIGINAL'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Photos Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filteredPhotos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            isBatchComparingAfter={isComparingAfter}
            onSelect={onSelectPhoto}
            onRetry={onRetryPhoto}
            onRemove={onRemovePhoto}
          />
        ))}
      </div>
    </div>
  )
}
