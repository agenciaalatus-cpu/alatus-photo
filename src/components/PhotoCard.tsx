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
  User,
  Download
} from 'lucide-react'
import { PhotoItem } from '../types/photo'
import { formatBytes, formatSigned } from '../utils/formatters'

interface PhotoCardProps {
  photo: PhotoItem
  isBatchComparingAfter: boolean // Global batch toggle
  onSelect: (photo: PhotoItem) => void
  onRetry: (photoId: string) => void
  onRemove: (photoId: string) => void
  onExportSingle?: (photo: PhotoItem) => void
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  isBatchComparingAfter,
  onSelect,
  onRetry,
  onRemove,
  onExportSingle
}) => {
  const [localShowOriginal, setLocalShowOriginal] = useState(false)
  const [isPressingHold, setIsPressingHold] = useState(false)

  // Determine what image URL to show:
  const shouldShowOriginal = localShowOriginal || isPressingHold || (!isBatchComparingAfter && Boolean(photo.editedUrl))
  const displayUrl = shouldShowOriginal ? photo.originalUrl : (photo.editedUrl || photo.originalUrl)
  const hasEdits = Boolean(photo.editedUrl && photo.status === 'completed')

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
      className="group relative glass-card hover:border-[#1A6DC2]/60 rounded-3xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-[0_12px_35px_rgba(0,0,0,0.45)] hover:-translate-y-1"
    >
      {/* Thumbnail Area */}
      <div 
        onClick={() => onSelect(photo)}
        className="relative aspect-[4/3] bg-black/50 overflow-hidden cursor-pointer flex items-center justify-center"
      >
        <img
          src={displayUrl}
          alt={photo.filename}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
        />

        {/* Status Overlay when processing */}
        {(photo.status === 'analyzing' || photo.status === 'editing') && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-[3px] flex flex-col items-center justify-center p-4 text-center space-y-3 z-10">
            <div className="w-11 h-11 rounded-2xl bg-[#00509E]/30 border border-[#00509E] flex items-center justify-center text-[#FFC72C] animate-ai-pulse shadow-[0_0_20px_rgba(0,80,158,0.5)]">
              <Sparkles className="w-5 h-5 animate-spin text-[#FFC72C]" />
            </div>
            <p className="text-xs font-bold text-white tracking-wide px-3 line-clamp-2 leading-relaxed">
              {photo.statusMessage || (photo.status === 'analyzing' ? 'Analisando iluminação...' : 'Aplicando ajustes finos...')}
            </p>
            <div className="w-4/5 flex items-center gap-2.5">
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
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
          {getStatusBadge()}

          {hasEdits && (
            <div className="flex items-center gap-1 pointer-events-auto">
              {/* Quick Hold to Compare Button */}
              <button
                type="button"
                onMouseDown={() => setIsPressingHold(true)}
                onMouseUp={() => setIsPressingHold(false)}
                onTouchStart={() => setIsPressingHold(true)}
                onTouchEnd={() => setIsPressingHold(false)}
                onClick={(e) => {
                  e.stopPropagation()
                  setLocalShowOriginal(!localShowOriginal)
                }}
                className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full backdrop-blur-md border transition-all flex items-center gap-1.5 shadow-md ${
                  shouldShowOriginal
                    ? 'bg-amber-500/90 text-black border-amber-400 font-black'
                    : 'bg-black/70 hover:bg-black/90 text-white border-white/20'
                }`}
                title="Segure para ver o Original ou clique para alternar"
              >
                <Eye className={`w-3 h-3 ${shouldShowOriginal ? 'text-black' : 'text-[#FFC72C]'}`} />
                <span>{shouldShowOriginal ? 'ORIGINAL' : 'EDITADA'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Error overlay with retry button */}
        {photo.status === 'error' && (
          <div className="absolute inset-0 bg-rose-950/85 backdrop-blur-[3px] flex flex-col items-center justify-center p-4 text-center space-y-2.5 z-10">
            <AlertCircle className="w-8 h-8 text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
            <p className="text-xs text-white font-medium max-w-[220px] line-clamp-2">
              {photo.errorMessage || 'Falha na análise da imagem'}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRetry(photo.id)
              }}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 hover:scale-105 active:scale-95"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Tentar novamente</span>
            </button>
          </div>
        )}

        {/* Hover Quick Edit prompt */}
        {photo.status === 'completed' && (
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
            <span className="px-2.5 py-1.5 rounded-xl bg-black/85 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1.5 border border-white/25 shadow-lg">
              <Sliders className="w-3 h-3 text-[#FFC72C]" />
              <span>Ajustar Foto</span>
            </span>
          </div>
        )}
      </div>

      {/* Info Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h4 
              className="text-xs font-bold text-[var(--text-primary)] truncate font-heading tracking-wide"
              title={photo.filename}
            >
              {photo.filename}
            </h4>
            <span className="text-[10px] text-[var(--text-muted)] shrink-0 font-mono">
              {formatBytes(photo.fileSize)}
            </span>
          </div>

          {/* AI Analysis Micro-tags */}
          {photo.analysis && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-secondary)] font-semibold">
                {photo.analysis.subject.people ? <User className="w-2.5 h-2.5 text-[#FFC72C]" /> : <Sun className="w-2.5 h-2.5 text-[#1A6DC2]" />}
                <span className="capitalize">{photo.analysis.image_type}</span>
              </span>

              {photo.userAdjustments.exposure !== 0 && (
                <span className="px-2 py-0.5 rounded-lg text-[10px] bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-secondary)] font-mono font-medium">
                  EV {formatSigned(photo.userAdjustments.exposure)}
                </span>
              )}

              {photo.userAdjustments.temperature !== 0 && (
                <span className="px-2 py-0.5 rounded-lg text-[10px] bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-secondary)] font-mono font-medium">
                  {formatSigned(photo.userAdjustments.temperature, 'K')}
                </span>
              )}

              {photo.userAdjustments.sharpness > 0 && (
                <span className="px-2 py-0.5 rounded-lg text-[10px] bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-secondary)] font-mono font-medium">
                  Nitidez {photo.userAdjustments.sharpness}
                </span>
              )}

              {photo.analysis.simulated && (
                <span className="px-2 py-0.5 rounded-lg text-[9px] bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/25">
                  Heurística
                </span>
              )}
            </div>
          )}

          {/* AI Reasoning Summary snippet */}
          {photo.analysis?.reasoning_summary && (
            <p className="mt-2.5 text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
              {photo.analysis.reasoning_summary}
            </p>
          )}
        </div>

        {/* Actions Bottom Bar */}
        <div className="pt-2.5 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <button
            onClick={() => onSelect(photo)}
            className="flex items-center gap-1.5 hover:text-[#FFC72C] font-semibold text-xs transition-colors py-1"
          >
            <Sliders className="w-3.5 h-3.5 text-[#FFC72C]" />
            <span>Editar Ajustes</span>
          </button>

          <div className="flex items-center gap-1">
            {photo.status === 'completed' && onExportSingle && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onExportSingle(photo)
                }}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#1A6DC2] hover:bg-[#00509E]/15 transition-all"
                title="Baixar esta foto individualmente"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => onRemove(photo.id)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/15 transition-all"
              title="Remover foto do lote"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
