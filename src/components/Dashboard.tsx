import React, { useRef, useState } from 'react'
import { UploadCloud, ImagePlus, Sparkles, Layers, Sliders, ShieldCheck, Cpu } from 'lucide-react'
import { AppSettings } from '../types/photo'
import { AlatusLogo } from './AlatusLogo'

interface DashboardProps {
  onFilesSelected: (files: File[]) => void
  settings: AppSettings
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void
  onLoadSamples: () => void
}

export const Dashboard: React.FC<DashboardProps> = ({
  onFilesSelected,
  settings,
  onUpdateSettings,
  onLoadSamples
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.match(/^image\/(jpeg|jpg|png|webp)$/i) ||
        file.name.match(/\.(jpe?g|png|webp)$/i)
      )
      if (validFiles.length > 0) {
        onFilesSelected(validFiles)
      }
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      onFilesSelected(files)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10 animate-fade-in">
      {/* Hero Title Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto flex flex-col items-center">
        <AlatusLogo size="xl" showText={false} showSubtitle={false} className="justify-center" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00509E]/15 border border-[#00509E]/30 text-xs font-semibold text-[#1A6DC2]">
          <Sparkles className="w-3.5 h-3.5 text-[#FFC72C]" />
          <span>ALATUS PHOTO • Uma IA dedicada para cada foto • Nunca um preset genérico</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] font-['Outfit',sans-serif]">
          Eleve suas fotografias com a inteligência do <span className="text-[#00509E]">Google Gemini</span>
        </h2>
        <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
          Envie dezenas de fotografias. O <strong>ALATUS PHOTO</strong> analisa cada imagem individualmente, identifica contraste, balanço de branco, iluminação e pessoas, aplicando uma estratégia única de revelação digital.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => onUpdateSettings({ autoEditMode: true, analysisOnlyMode: false })}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shadow-sm ${
            !settings.analysisOnlyMode
              ? 'bg-[#00509E] text-white border-[#00509E] shadow-[#00509E]/25'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#FFC72C]" />
          <span>Modo IA AUTO (Análise + Edição)</span>
        </button>

        <button
          onClick={() => onUpdateSettings({ autoEditMode: false, analysisOnlyMode: true })}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
            settings.analysisOnlyMode
              ? 'bg-[#00509E] text-white border-[#00509E]'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Cpu className="w-4 h-4 text-[#1A6DC2]" />
          <span>Modo Somente Analisar</span>
        </button>

        <button
          onClick={onLoadSamples}
          className="px-4 py-2 rounded-xl text-xs font-bold border border-[#FFC72C]/40 bg-[#FFC72C]/10 hover:bg-[#FFC72C]/20 text-[var(--text-primary)] transition-all flex items-center gap-2 shadow-sm"
        >
          <Layers className="w-4 h-4 text-[#FFC72C]" />
          <span>Carregar Fotos de Demonstração</span>
        </button>
      </div>

      {/* Big Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-300 p-8 sm:p-14 text-center ${
          isDragOver
            ? 'border-[#FFC72C] bg-[#FFC72C]/5 scale-[1.01] shadow-2xl'
            : 'border-[var(--border-color)] bg-[var(--bg-surface)]/70 hover:border-[#00509E] hover:bg-[var(--bg-surface)]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-primary)] group-hover:scale-110 group-hover:border-[#00509E] transition-all shadow-xl">
            <UploadCloud className="w-10 h-10 text-[#00509E] group-hover:text-[#FFC72C] transition-colors" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              Arraste suas fotos aqui
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              ou clique para selecionar do computador
            </p>
          </div>

          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
            Você pode enviar dezenas de fotos de uma vez. A IA analisará cada imagem individualmente.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-[var(--text-muted)]">
            <span className="px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-color)]">JPG</span>
            <span className="px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-color)]">JPEG</span>
            <span className="px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-color)]">PNG</span>
            <span className="px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-color)]">WEBP</span>
            <span className="px-2.5 py-1 rounded-md bg-[var(--bg-elevated)]/50 border border-dashed border-[var(--border-color)] text-[var(--text-muted)]/70">
              RAW (Em breve)
            </span>
          </div>
        </div>
      </div>

      {/* Feature Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-2">
          <div className="w-9 h-9 rounded-xl bg-[#00509E]/15 border border-[#00509E]/30 flex items-center justify-center text-[#1A6DC2]">
            <Sparkles className="w-4 h-4 text-[#FFC72C]" />
          </div>
          <h4 className="text-sm font-bold text-[var(--text-primary)]">Análise Contextual Individual</h4>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Subexposição, contraluz, sombras fechadas ou retratos recebem tratamentos sob medida calculados pela inteligência visual do Gemini.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-2">
          <div className="w-9 h-9 rounded-xl bg-[#00509E]/15 border border-[#00509E]/30 flex items-center justify-center text-[#1A6DC2]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <h4 className="text-sm font-bold text-[var(--text-primary)]">Preservação Fiel de Pele</h4>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Regras de integridade biológica: nunca satura ou alaranjada artificialmente a pele humana, mantendo textura orgânica sem deformações.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-2">
          <div className="w-9 h-9 rounded-xl bg-[#00509E]/15 border border-[#00509E]/30 flex items-center justify-center text-[#1A6DC2]">
            <Sliders className="w-4 h-4 text-[#FFC72C]" />
          </div>
          <h4 className="text-sm font-bold text-[var(--text-primary)]">Motor Não-Destrutivo</h4>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Seus originais permanecem 100% intactos. Ajuste fino manual com slider Antes/Depois em tempo real e exportação em alta qualidade ZIP.
          </p>
        </div>
      </div>
    </div>
  )
}
