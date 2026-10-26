import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ZoomIn,
  Sliders,
  Check,
  X,
  Loader2,
  Maximize2,
  ShieldCheck,
  ArrowRight,
  Info
} from 'lucide-react'
import { PhotoItem } from '../types/photo'
import {
  DuplicateGroup,
  DuplicateScanResult,
  DuplicateGroupItem
} from '../types/duplicate'
import { DuplicateDetectionService } from '../services/duplicateDetectionService'
import { formatBytes } from '../utils/formatters'

interface DuplicateDetectionModalProps {
  isOpen: boolean
  onClose: () => void
  photos: PhotoItem[]
  onRemoveDuplicates: (photoIdsToRemove: string[]) => void
}

export const DuplicateDetectionModal: React.FC<DuplicateDetectionModalProps> = ({
  isOpen,
  onClose,
  photos,
  onRemoveDuplicates
}) => {
  const [sensitivity, setSensitivity] = useState<number>(88) // 88% default
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number; stage: string }>({
    current: 0,
    total: 0,
    stage: ''
  })
  const [scanResult, setScanResult] = useState<DuplicateScanResult | null>(null)
  const [groups, setGroups] = useState<DuplicateGroup[]>([])
  const [previewPhoto, setPreviewPhoto] = useState<PhotoItem | null>(null)

  // Run scan when modal opens or sensitivity changes
  const runScan = async (threshold: number) => {
    setIsScanning(true)
    setScanResult(null)

    try {
      const result = await DuplicateDetectionService.detectDuplicateGroups(
        photos,
        threshold,
        (progress) => setScanProgress(progress)
      )

      setScanResult(result)
      setGroups(result.groups)
    } catch (err) {
      console.error('Erro ao detectar duplicadas:', err)
    } finally {
      setIsScanning(false)
    }
  }

  useEffect(() => {
    if (isOpen && photos.length > 0) {
      runScan(sensitivity)
    }
  }, [isOpen, sensitivity, photos.length])

  if (!isOpen) return null

  // Calculate current dynamic removal selection
  const selectedForRemovalIds: string[] = []
  let calculatedSavings = 0

  groups.forEach((g) => {
    g.items.forEach((item) => {
      if (item.selectedForRemoval) {
        selectedForRemovalIds.push(item.photo.id)
        calculatedSavings += item.fingerprint.fileSizeBytes || item.photo.fileSize || 0
      }
    })
  })

  // Toggle item removal selection
  const handleToggleRemoval = (groupId: string, photoId: string) => {
    setGroups((prevGroups) =>
      prevGroups.map((g) => {
        if (g.groupId !== groupId) return g

        const updatedItems = g.items.map((item) => {
          if (item.photo.id === photoId) {
            // Can only toggle if it's not the designated best photo
            return { ...item, selectedForRemoval: !item.selectedForRemoval }
          }
          return item
        })

        return { ...g, items: updatedItems }
      })
    )
  }

  // Set user-selected photo as the Best Photo for this group
  const handleSetAsBest = (groupId: string, photoId: string) => {
    setGroups((prevGroups) =>
      prevGroups.map((g) => {
        if (g.groupId !== groupId) return g

        const updatedItems = g.items.map((item) => {
          const isNowBest = item.photo.id === photoId
          return {
            ...item,
            isBest: isNowBest,
            // If it is best, don't remove it; if it was previously best, mark it for removal
            selectedForRemoval: !isNowBest,
            differenceSummary: isNowBest
              ? `⭐ Escolhida pelo Usuário como Melhor Foto (${item.fingerprint.quality.overallScore}/100)`
              : `Variação de rajada (${item.fingerprint.quality.overallScore}/100)`
          }
        })

        return {
          ...g,
          bestPhotoId: photoId,
          items: updatedItems
        }
      })
    )
  }

  // Execute removal
  const handleConfirmRemoval = () => {
    if (selectedForRemovalIds.length === 0) {
      onClose()
      return
    }

    onRemoveDuplicates(selectedForRemovalIds)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-6 py-5 border-b border-[var(--border-color)] bg-[var(--bg-subtle)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00509E] to-[#1A6DC2] flex items-center justify-center shadow-lg shadow-[#00509E]/30 text-[#FFC72C]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-[var(--text-primary)]">
                  Detector de Fotos Duplicadas & Rajadas
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FFC72C]/15 text-[#FFC72C] border border-[#FFC72C]/30">
                  IA & Análise de Nitidez
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Identifica fotos idênticas e sequências em rajada, preservando automaticamente a de melhor foco e iluminação.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-transparent hover:border-[var(--border-color)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sensitivity & Overview Toolbar */}
        <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-app)] flex flex-wrap items-center justify-between gap-4">
          {/* Sensitivity Filters */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5 mr-1">
              <Sliders className="w-3.5 h-3.5 text-[#FFC72C]" />
              Sensibilidade:
            </span>
            <div className="inline-flex rounded-xl bg-[var(--bg-elevated)] p-1 border border-[var(--border-color)] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSensitivity(95)}
                disabled={isScanning}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  sensitivity === 95
                    ? 'bg-[#00509E] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Apenas fotos quase idênticas (95%+)"
              >
                Idênticas (95%)
              </button>
              <button
                type="button"
                onClick={() => setSensitivity(88)}
                disabled={isScanning}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  sensitivity === 88
                    ? 'bg-[#00509E] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Recomendado: detecta duplicadas e rajadas do mesmo momento (88%+)"
              >
                Recomendado (88%)
              </button>
              <button
                type="button"
                onClick={() => setSensitivity(80)}
                disabled={isScanning}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  sensitivity === 80
                    ? 'bg-[#00509E] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Detecta variações maiores da mesma cena ou pose (80%+)"
              >
                Amplo / Rajadas (80%)
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          {!isScanning && scanResult && (
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--text-muted)]">Grupos:</span>
                <span className="font-extrabold text-[var(--text-primary)] px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                  {groups.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--text-muted)]">Duplicadas a remover:</span>
                <span className="font-extrabold text-rose-400 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20">
                  {selectedForRemovalIds.length}
                </span>
              </div>
              {calculatedSavings > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--text-muted)]">Economia:</span>
                  <span className="font-extrabold text-[#FFC72C] px-2 py-0.5 rounded-md bg-[#FFC72C]/10 border border-[#FFC72C]/20">
                    {formatBytes(calculatedSavings)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Body / Groups List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Scanning State */}
          {isScanning && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-[var(--border-color)] border-t-[#FFC72C] animate-spin flex items-center justify-center"></div>
                <Sparkles className="w-6 h-6 text-[#FFC72C] absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-[var(--text-primary)]">
                  Examinando nitidez e similaridade visual...
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {scanProgress.stage || 'Calculando matriz de foco laplaciano e impressões digitais...'}
                </p>
              </div>
              {scanProgress.total > 0 && (
                <div className="w-64 max-w-full bg-[var(--bg-subtle)] rounded-full h-2 overflow-hidden border border-[var(--border-color)]">
                  <div
                    className="bg-gradient-to-r from-[#00509E] to-[#FFC72C] h-full transition-all duration-200"
                    style={{ width: `${Math.round((scanProgress.current / scanProgress.total) * 100)}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}

          {/* No Duplicates Found */}
          {!isScanning && groups.length === 0 && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-900/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-lg font-black text-[var(--text-primary)]">
                  Nenhuma foto duplicada encontrada!
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Todas as {photos.length} fotos do seu lote são únicas e possuem boa diferenciação de enquadramento, ângulo ou iluminação. Nenhuma ação necessária.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] transition-all"
              >
                Voltar ao Lote
              </button>
            </div>
          )}

          {/* Duplicates Groups List */}
          {!isScanning && groups.length > 0 && (
            <div className="space-y-6">
              {/* Informative Guidance Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#00509E]/20 via-[#182330] to-[#FFC72C]/10 border border-[#00509E]/30 flex items-start gap-3 text-xs text-[var(--text-secondary)]">
                <Sparkles className="w-5 h-5 text-[#FFC72C] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-[var(--text-primary)]">
                    Seleção Inteligente Automática:
                  </p>
                  <p>
                    A IA analisou a nitidez do foco (gradiente Laplaciano), ausência de estouro de luz e resolução nativa. 
                    A foto com maior pontuação foi marcada como <span className="font-extrabold text-[#FFC72C]">⭐ MELHOR FOTO (MANTER)</span>. 
                    As demais cópias inferiores foram pré-selecionadas para remoção. Você pode clicar em <span className="font-semibold text-white">"Definir como Principal"</span> se preferir outra expressão facial ou pose.
                  </p>
                </div>
              </div>

              {/* Group Cards */}
              {groups.map((group, groupIdx) => (
                <div
                  key={group.groupId}
                  className="rounded-3xl bg-[var(--bg-subtle)] border border-[var(--border-color)] p-5 space-y-4 shadow-lg transition-all"
                >
                  {/* Group Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-xs font-black text-[var(--text-primary)]">
                        {groupIdx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-[var(--text-primary)]">
                            {group.type === 'exact'
                              ? 'Fotos Idênticas'
                              : group.type === 'burst'
                              ? 'Sequência em Rajada'
                              : 'Fotos Muito Semelhantes'}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00509E]/20 text-[#38BDF8] border border-[#00509E]/30">
                            {group.similarityPercent}% Similaridade
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {group.items.length} fotos neste grupo • Economia ao manter apenas a melhor:{' '}
                          <span className="font-bold text-[#FFC72C]">{formatBytes(group.savingsBytes)}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Photo Comparison Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {group.items.map((item) => {
                      const isBest = item.isBest
                      const isSelectedToRemove = item.selectedForRemoval

                      return (
                        <div
                          key={item.photo.id}
                          className={`relative rounded-2xl overflow-hidden transition-all duration-200 border flex flex-col ${
                            isBest
                              ? 'bg-[var(--bg-elevated)] border-[#FFC72C] shadow-lg shadow-[#FFC72C]/10 ring-2 ring-[#FFC72C]/40'
                              : isSelectedToRemove
                              ? 'bg-[var(--bg-app)] border-rose-500/40 opacity-80 hover:opacity-100'
                              : 'bg-[var(--bg-elevated)] border-[var(--border-color)]'
                          }`}
                        >
                          {/* Image Thumbnail Container */}
                          <div className="relative aspect-[4/3] bg-black/40 overflow-hidden group">
                            <img
                              src={item.photo.editedUrl || item.photo.originalUrl}
                              alt={item.photo.filename}
                              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                                isSelectedToRemove && !isBest ? 'filter grayscale-[30%]' : ''
                              }`}
                            />

                            {/* Top Badge Overlay */}
                            <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
                              {isBest ? (
                                <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-[#FFC72C] to-[#E5B224] text-black shadow-lg flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 fill-black" />
                                  MELHOR FOTO
                                </span>
                              ) : isSelectedToRemove ? (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-rose-600 text-white shadow-md flex items-center gap-1">
                                  <Trash2 className="w-3 h-3" />
                                  REMOVER
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-zinc-700/80 text-white backdrop-blur-sm">
                                  MANTER
                                </span>
                              )}

                              {/* Quality Score Badge */}
                              <span
                                className={`px-2 py-0.5 rounded-lg text-[11px] font-black backdrop-blur-md shadow-md ${
                                  item.fingerprint.quality.overallScore >= 80
                                    ? 'bg-emerald-500/90 text-white'
                                    : item.fingerprint.quality.overallScore >= 60
                                    ? 'bg-amber-500/90 text-white'
                                    : 'bg-rose-500/90 text-white'
                                }`}
                                title="Nota de qualidade baseada em nitidez de foco, faixa tonal e iluminação"
                              >
                                {item.fingerprint.quality.overallScore}/100
                              </span>
                            </div>

                            {/* Hover Quick Zoom Button */}
                            <button
                              type="button"
                              onClick={() => setPreviewPhoto(item.photo)}
                              className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                              title="Ampliar visualização"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Card Details & Diagnostics */}
                          <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                            <div className="space-y-2">
                              {/* Filename & size */}
                              <div>
                                <h5
                                  className="text-xs font-bold text-[var(--text-primary)] truncate"
                                  title={item.photo.filename}
                                >
                                  {item.photo.filename}
                                </h5>
                                <p className="text-[10px] text-[var(--text-muted)]">
                                  {item.fingerprint.megapixels} MP • {formatBytes(item.fingerprint.fileSizeBytes)}
                                </p>
                              </div>

                              {/* Diagnostic Metrics Pills */}
                              <div className="flex flex-wrap gap-1 text-[10px]">
                                <span
                                  className={`px-1.5 py-0.5 rounded font-semibold ${
                                    item.fingerprint.quality.sharpnessScore >= 75
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-zinc-800 text-zinc-400'
                                  }`}
                                >
                                  Foco: {item.fingerprint.quality.sharpnessLabel}
                                </span>
                                <span className="px-1.5 py-0.5 rounded font-semibold bg-zinc-800 text-zinc-400">
                                  Luz: {item.fingerprint.quality.exposureLabel}
                                </span>
                              </div>

                              {/* Reason Summary */}
                              <p className="text-[11px] font-medium text-[var(--text-secondary)] line-clamp-2 leading-snug">
                                {item.differenceSummary}
                              </p>
                            </div>

                            {/* Card Footer Actions */}
                            <div className="pt-2 border-t border-[var(--border-color)]">
                              {isBest ? (
                                <div className="py-1 px-2 rounded-xl bg-[#FFC72C]/10 border border-[#FFC72C]/30 text-center">
                                  <span className="text-[11px] font-extrabold text-[#FFC72C] flex items-center justify-center gap-1">
                                    <Check className="w-3.5 h-3.5" />
                                    Preservada no Lote
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={isSelectedToRemove}
                                      onChange={() => handleToggleRemoval(group.groupId, item.photo.id)}
                                      className="rounded border-[var(--border-color)] text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                                    />
                                    <span className="text-[11px] font-semibold text-rose-300">
                                      Descartar esta duplicada
                                    </span>
                                  </label>

                                  <button
                                    type="button"
                                    onClick={() => handleSetAsBest(group.groupId, item.photo.id)}
                                    className="w-full py-1 px-2 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--border-color)] border border-[var(--border-color)] text-[10px] font-bold text-[var(--text-secondary)] hover:text-white transition-all flex items-center justify-center gap-1"
                                    title="Definir esta foto como a melhor do grupo"
                                  >
                                    <Sparkles className="w-3 h-3 text-[#FFC72C]" />
                                    <span>Definir como Principal</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Apenas as fotos deste lote são limpas. Seus arquivos locais no computador permanecem intocados.
            </span>
          </div>

          <div className="flex items-center gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--border-color)] text-xs font-bold text-[var(--text-secondary)] hover:text-white border border-[var(--border-color)] transition-all"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmRemoval}
              disabled={isScanning || selectedForRemovalIds.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-black shadow-xl shadow-rose-900/30 transition-all flex items-center gap-2 disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" />
              <span>
                REMOVER {selectedForRemovalIds.length} {selectedForRemovalIds.length === 1 ? 'DUPLICADA' : 'DUPLICADAS'} (MANTER AS MELHORES)
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Single Photo Zoom Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-5xl max-h-[85vh] overflow-hidden rounded-2xl border border-zinc-700 shadow-2xl">
            <img
              src={previewPhoto.editedUrl || previewPhoto.originalUrl}
              alt={previewPhoto.filename}
              className="max-w-full max-h-[80vh] object-contain"
            />
            <div className="p-3 bg-zinc-900/90 text-center text-xs font-bold text-white flex items-center justify-between px-4">
              <span>{previewPhoto.filename}</span>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="px-2 py-1 bg-zinc-800 rounded text-zinc-300 hover:text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
