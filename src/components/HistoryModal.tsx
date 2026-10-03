import React from 'react'
import { X, History, Trash2, FolderOpen, Calendar, Image as ImageIcon } from 'lucide-react'
import { BatchSession } from '../types/photo'
import { formatBytes, formatDate } from '../utils/formatters'

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
  history: BatchSession[]
  onSelectBatch: (batch: BatchSession) => void
  onClearHistory: () => void
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onSelectBatch,
  onClearHistory
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-xl bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#00509E]/20 text-[#00509E] border border-[#00509E]/30">
              <History className="w-4 h-4 text-[#FFC72C]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Histórico de Lotes</h2>
              <p className="text-xs text-[var(--text-secondary)]">Sessões e conjuntos de fotos processados anteriormente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)] space-y-2">
              <History className="w-10 h-10 mx-auto opacity-30 text-[#00509E]" />
              <p className="text-sm font-semibold text-[var(--text-secondary)]">Nenhum lote salvo ainda</p>
              <p className="text-xs">Ao processar fotos, seus lotes aparecerão aqui para rápida consulta.</p>
            </div>
          ) : (
            history.map((batch) => (
              <div
                key={batch.id}
                className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] hover:border-[#00509E]/50 transition-all flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[var(--text-primary)]">{batch.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00509E]/15 text-[#1A6DC2] font-semibold border border-[#00509E]/30">
                      {batch.photosCount} fotos
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(batch.timestamp)}
                    </span>
                    <span className="flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5" />
                      {formatBytes(batch.totalBytes)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onSelectBatch(batch)
                      onClose()
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[#00509E] hover:text-white text-xs font-semibold text-[var(--text-primary)] border border-[var(--border-color)] transition-all flex items-center gap-1.5"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-[#FFC72C]" />
                    <span>Abrir Lote</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="px-6 py-3 border-t border-[var(--border-color)] bg-[var(--bg-subtle)] flex items-center justify-between">
            <button
              onClick={onClearHistory}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar histórico</span>
            </button>
            <span className="text-[11px] text-[var(--text-muted)]">
              {history.length} {history.length === 1 ? 'lote gravado' : 'lotes gravados'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
