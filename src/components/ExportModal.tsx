import React, { useState } from 'react'
import { 
  X, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RotateCw, 
  FileArchive, 
  SlidersHorizontal,
  FolderDown,
  Layers
} from 'lucide-react'
import { PhotoItem, AppSettings } from '../types/photo'
import { ExportProgress, ExportResult, ExportService } from '../services/exportService'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  photos: PhotoItem[]
  settings: AppSettings
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void
  onRetryFailedPhotos?: (failedIds: string[]) => void
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  photos,
  settings,
  onUpdateSettings,
  onRetryFailedPhotos
}) => {
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [result, setResult] = useState<ExportResult | null>(null)
  const [selectedFormat, setSelectedFormat] = useState(settings.exportFormat || 'image/jpeg')
  const [selectedQuality, setSelectedQuality] = useState(settings.exportQuality || 90)
  const [selectedSuffix, setSelectedSuffix] = useState(settings.exportSuffix || '_AI')

  if (!isOpen) return null

  const eligiblePhotos = photos.filter((p) => p.status === 'completed')
  const pendingPhotos = photos.filter((p) => p.status !== 'completed')

  const handleStartExport = async () => {
    if (eligiblePhotos.length === 0) return

    // Save user preferences
    onUpdateSettings({
      exportFormat: selectedFormat,
      exportQuality: selectedQuality,
      exportSuffix: selectedSuffix
    })

    const runtimeSettings: AppSettings = {
      ...settings,
      exportFormat: selectedFormat,
      exportQuality: selectedQuality,
      exportSuffix: selectedSuffix
    }

    setIsExporting(true)
    setProgress({ current: 0, total: eligiblePhotos.length, currentFilename: '', percentage: 0 })
    setResult(null)

    try {
      const outcome = await ExportService.exportBatchToZip(
        eligiblePhotos,
        runtimeSettings,
        (p) => setProgress(p)
      )
      setResult(outcome)
    } catch (err: any) {
      console.error('Falha geral de exportação:', err)
      setResult({
        total: eligiblePhotos.length,
        successCount: 0,
        failureCount: eligiblePhotos.length,
        failedFiles: eligiblePhotos.map((p) => ({
          photoId: p.id,
          filename: p.filename,
          reason: err.message || 'Falha ao compactar pacote ZIP'
        }))
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleResetAndClose = () => {
    setProgress(null)
    setResult(null)
    setIsExporting(false)
    onClose()
  }

  const handleRetryFailed = () => {
    if (!result || result.failedFiles.length === 0) return
    const failedIds = result.failedFiles.map((f) => f.photoId).filter(Boolean)
    if (onRetryFailedPhotos && failedIds.length > 0) {
      onRetryFailedPhotos(failedIds)
    }
    handleResetAndClose()
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={handleResetAndClose}
    >
      <div 
        className="w-full max-w-xl bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#00509E]/20 text-[#00509E] border border-[#00509E]/30">
              <Download className="w-4 h-4 text-[#FFC72C]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Exportação em Lote (ZIP)</h2>
              <p className="text-xs text-[var(--text-secondary)]">Gere o arquivo consolidado de alta fidelidade</p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            disabled={isExporting}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* STATE 1: CONFIGURATION */}
          {!isExporting && !result && (
            <div className="space-y-5">
              {/* Scope Card */}
              <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#00509E]/20 border border-[#00509E]/30 flex items-center justify-center text-[#1A6DC2]">
                    <Layers className="w-5 h-5 text-[#FFC72C]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      {eligiblePhotos.length} {eligiblePhotos.length === 1 ? 'foto pronta para exportar' : 'fotos prontas para exportar'}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {pendingPhotos.length > 0 ? `${pendingPhotos.length} ainda pendentes de análise` : 'Todas as fotos do lote foram processadas'}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] text-[#FFC72C] border border-[var(--border-color)]">
                  ZIP Final
                </span>
              </div>

              {/* Format Options */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Formato da Imagem
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'image/jpeg', name: 'JPEG', desc: 'Compatibilidade universal e alta compactação' },
                    { id: 'image/png', name: 'PNG', desc: 'Sem perdas, máxima nitidez gráfica' },
                    { id: 'image/webp', name: 'WEBP', desc: 'Padrão web ultra-eficiente' }
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setSelectedFormat(fmt.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedFormat === fmt.id
                          ? 'border-[#00509E] bg-[#00509E]/15 text-[var(--text-primary)] shadow-sm'
                          : 'border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="text-xs font-bold block text-[var(--text-primary)]">{fmt.name}</span>
                      <span className="text-[10px] text-[var(--text-muted)] line-clamp-2 mt-0.5">{fmt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality Options */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Qualidade da Compressão
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { val: 100, label: '100% (Máxima)', desc: 'Arquivo bruto, qualidade original' },
                    { val: 90, label: '90% (Recomendada)', desc: 'Equilíbrio visual imperceptível' },
                    { val: 80, label: '80% (Compacta)', desc: 'Ideal para envio rápido e redes' }
                  ].map((q) => (
                    <button
                      key={q.val}
                      type="button"
                      onClick={() => setSelectedQuality(q.val as any)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedQuality === q.val
                          ? 'border-[#00509E] bg-[#00509E]/15 text-[var(--text-primary)] shadow-sm'
                          : 'border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="text-xs font-bold block text-[var(--text-primary)]">{q.label}</span>
                      <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">{q.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filename Suffix */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Sufixo no nome do arquivo
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={selectedSuffix}
                    onChange={(e) => setSelectedSuffix(e.target.value)}
                    placeholder="Ex: _AI ou _editada"
                    className="flex-1 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#00509E] font-mono"
                  />
                  <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-elevated)] px-3 py-2 rounded-xl border border-[var(--border-color)]">
                    foto{selectedSuffix || ''}.{selectedFormat === 'image/png' ? 'png' : selectedFormat === 'image/webp' ? 'webp' : 'jpg'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STATE 2: EXPORT IN PROGRESS */}
          {isExporting && progress && (
            <div className="py-6 space-y-4 text-center animate-fade-in">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#00509E]/20 border border-[#00509E]/30 flex items-center justify-center text-[#FFC72C] shadow-lg">
                <Loader2 className="w-8 h-8 animate-spin text-[#FFC72C]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Exportando e Compactando Lote...
                </h3>
                <p className="text-xs text-[var(--text-secondary)] truncate max-w-sm mx-auto font-mono">
                  {progress.currentFilename || 'Preparando renderização...'}
                </p>
              </div>

              {/* Visual Progress Bar */}
              <div className="max-w-md mx-auto space-y-1.5">
                <div className="w-full h-2.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden p-0.5 border border-[var(--border-color)]">
                  <div
                    className="h-full bg-gradient-to-r from-[#00509E] via-[#1A6DC2] to-[#FFC72C] rounded-full transition-all duration-150"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-[var(--text-muted)]">
                  <span>{progress.current} de {progress.total} imagens</span>
                  <span className="text-[#FFC72C] font-bold">{progress.percentage}%</span>
                </div>
              </div>
            </div>
          )}

          {/* STATE 3: POST-EXPORT SUMMARY REPORT (Requirement 6) */}
          {result && (
            <div className="space-y-4 animate-fade-in">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Total Processadas</span>
                  <span className="text-xl font-black text-[var(--text-primary)] font-mono mt-0.5 block">
                    {result.total}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold block">Sucesso</span>
                  <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {result.successCount}
                  </span>
                </div>

                <div className={`p-3.5 rounded-xl border ${result.failureCount > 0 ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-[var(--bg-elevated)] border-[var(--border-color)] text-[var(--text-muted)]'}`}>
                  <span className="text-[10px] uppercase font-bold block">Falhas</span>
                  <span className="text-xl font-black font-mono mt-0.5 block flex items-center justify-center gap-1">
                    {result.failureCount > 0 && <AlertCircle className="w-4 h-4" />}
                    {result.failureCount}
                  </span>
                </div>
              </div>

              {/* Success Message Banner */}
              {result.successCount > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2.5 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>
                    O arquivo ZIP com {result.successCount} fotos editadas foi gerado e baixado automaticamente pelo navegador.
                  </span>
                </div>
              )}

              {/* Failures Details Table (if any) */}
              {result.failureCount > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Arquivos com Problemas ({result.failureCount})
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">Revise e tente novamente</span>
                  </div>

                  <div className="p-2 rounded-xl bg-[var(--bg-app)] border border-rose-500/30 max-h-48 overflow-y-auto space-y-1.5 text-xs">
                    {result.failedFiles.map((f, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-between gap-2">
                        <span className="font-semibold text-[var(--text-primary)] truncate max-w-[240px]">
                          {f.filename}
                        </span>
                        <span className="text-[10px] text-rose-400 font-mono truncate">
                          {f.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-subtle)] flex items-center justify-between">
          {!result ? (
            <>
              <button
                type="button"
                onClick={handleResetAndClose}
                disabled={isExporting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleStartExport}
                disabled={isExporting || eligiblePhotos.length === 0}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00509E] to-[#1A6DC2] hover:from-[#003F7E] hover:to-[#00509E] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-40"
              >
                <Download className="w-4 h-4 text-[#FFC72C]" />
                <span>Exportar {eligiblePhotos.length} {eligiblePhotos.length === 1 ? 'Foto' : 'Fotos'} (ZIP)</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Concluir e Fechar
              </button>

              {result.failureCount > 0 && onRetryFailedPhotos && (
                <button
                  type="button"
                  onClick={handleRetryFailed}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Tentar Novamente Itens com Falha</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
