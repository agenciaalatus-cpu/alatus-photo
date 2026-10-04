import React, { useState } from 'react'
import { 
  Sparkles, 
  RotateCw, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Sliders, 
  Trash2, 
  Eye, 
  Layers,
  Sun,
  User
} from 'lucide-react'
import { PhotoItem } from '../types/photo'
import { formatBytes, formatSigned } from '../utils/formatters'

interface PhotoCardProps {
  photo: PhotoItem
  isBatchComparingAfter: boolean // Global batch toggle
  onSelect: (photo: PhotoItem) => void
  onRetry: (photoId: string) => void
  onRemove: (photoId: string) => void
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  isBatchComparingAfter,
  onSelect,
  onRetry,
  onRemove
}) => {
  const [localShowOriginal, setLocalShowOriginal] = useState(false)

  // Determine what image URL to show:
  // If user is holding or toggling local preview, or if not completed yet, or if global compare is set to original
  const hasEdits = Boolean(photo.editedUrl && photo.status === 'completed')
  const displayUrl = hasEdits && (isBatchComparingAfter && !localShowOriginal)
    ? photo.editedUrl!
    : photo.originalUrl

  const getStatusBadge = () => {
    switch (photo.status) {
      case 'waiting':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-color)]">
            <Clock className="w-3 h-3" />
            <span>Aguardando</span>
          </span>
        )
      case 'analyzing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00509E]/20 text-[#1A6DC2] border border-[#00509E]/40 animate-pulse">
            <Sparkles className="w-3 h-3 text-[#FFC72C] animate-spin" />
            <span>Analisando...</span>
          </span>
        )
      case 'editing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFC72C]/20 text-[#FFC72C] border border-[#FFC72C]/40">
            <RotateCw className="w-3 h-3 animate-spin" />
            <span>Editando...</span>
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Concluído</span>
          </span>
        )
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3 h-3" />
            <span>Erro</span>
          </span>
        )
    }
  }

  return (
    <div 
      className="group relative bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#00509E] rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:shadow-xl"
    >
      {/* Thumbnail Area */}
      <div 
        onClick={() => onSelect(photo)}
        className="relative aspect-[4/3] bg-black/40 overflow-hidden cursor-pointer flex items-center justify-center"
      >
        <img
          src={displayUrl}
          alt={photo.filename}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Status Overlay when processing */}
        {(photo.status === 'analyzing' || photo.status === 'editing') && (
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-[#00509E]/40 border border-[#00509E] flex items-center justify-center text-[#FFC72C] animate-ai-pulse">
              <Sparkles className="w-5 h-5 animate-spin" />
            </div>
            <p className="text-xs font-bold text-white tracking-wide px-2 line-clamp-2">
              {photo.statusMessage || (photo.status === 'analyzing' ? 'Analisando iluminação...' : 'Aplicando ajustes finos...')}
            </p>
            <div className="w-4/5 flex items-center gap-2">
              <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div 
                  className="h-full bg-gradient-to-r from-[#00509E] via-[#1A6DC2] to-[#FFC72C] rounded-full transition-all duration-150"
                  style={{ width: `${photo.progress}%` }}
                />
              </div>
              <span className="text-[11px] font-mono font-bold text-[#FFC72C] shrink-0">
                {photo.progress}%
              </span>
            </div>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          {getStatusBadge()}

          {hasEdits && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setLocalShowOriginal(!localShowOriginal)
              }}
              className="pointer-events-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/20 hover:bg-black transition-all flex items-center gap-1 shadow-sm"
              title="Alternar Antes / Depois"
            >
              <Eye className="w-3 h-3 text-[#FFC72C]" />
              <span>{localShowOriginal ? 'ANTES' : 'DEPOIS'}</span>
            </button>
          )}
        </div>

        {/* Error overlay with retry button */}
        {photo.status === 'error' && (
          <div className="absolute inset-0 bg-rose-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-rose-400" />
            <p className="text-xs text-white font-medium max-w-[200px] line-clamp-2">
              {photo.errorMessage || 'Falha na análise da imagem'}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRetry(photo.id)
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Tentar novamente</span>
            </button>
          </div>
        )}

        {/* Hover Quick Edit prompt */}
        {photo.status === 'completed' && (
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span className="px-2 py-1 rounded-lg bg-black/80 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1 border border-white/20">
              <Sliders className="w-3 h-3 text-[#FFC72C]" />
              <span>Editar Ajustes</span>
            </span>
          </div>
        )}
      </div>

      {/* Info Card Content */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h4 
              className="text-xs font-bold text-[var(--text-primary)] truncate"
              title={photo.filename}
            >
              {photo.filename}
            </h4>
            <span className="text-[10px] text-[var(--text-muted)] shrink-0 font-medium">
              {formatBytes(photo.fileSize)}
            </span>
          </div>

          {/* AI Analysis Micro-tags */}
          {photo.analysis && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-medium">
                {photo.analysis.subject.people ? <User className="w-2.5 h-2.5 text-[#FFC72C]" /> : <Sun className="w-2.5 h-2.5 text-[#1A6DC2]" />}
                <span className="capitalize">{photo.analysis.image_type}</span>
              </span>

              {photo.userAdjustments.exposure !== 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-mono">
                  EV {formatSigned(photo.userAdjustments.exposure)}
                </span>
              )}

              {photo.userAdjustments.temperature !== 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-mono">
                  {formatSigned(photo.userAdjustments.temperature, 'K')}
                </span>
              )}

              {photo.analysis.simulated && (
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                  Heurística
                </span>
              )}
            </div>
          )}

          {/* AI Reasoning Summary snippet */}
          {photo.analysis?.reasoning_summary && (
            <p className="mt-2 text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
              {photo.analysis.reasoning_summary}
            </p>
          )}
        </div>

        {/* Actions Bottom Bar */}
        <div className="pt-2 border-t border-[var(--border-color)]/60 flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <button
            onClick={() => onSelect(photo)}
            className="flex items-center gap-1 hover:text-[#00509E] font-semibold text-[11px] transition-colors"
          >
            <Sliders className="w-3 h-3 text-[#FFC72C]" />
            <span>Ver detalhes</span>
          </button>

          <button
            onClick={() => onRemove(photo.id)}
            className="p-1 rounded text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Remover foto do lote"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
