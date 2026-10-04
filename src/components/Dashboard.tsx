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
    <div className="relative max-w-5xl mx-auto px-4 py-10 space-y-12 animate-fade-in">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[650px] h-[320px] bg-gradient-to-b from-[#00509E]/25 via-[#1A6DC2]/10 to-transparent blur-[90px] rounded-full" />

      {/* Hero Title Section */}
      <div className="relative text-center space-y-5 max-w-3xl mx-auto flex flex-col items-center">
        <AlatusLogo size="xl" showText={false} showSubtitle={false} className="justify-center drop-shadow-[0_10px_25px_rgba(0,80,158,0.35)]" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00509E]/15 border border-[#00509E]/30 text-xs font-semibold text-[#1A6DC2] shadow-[0_0_15px_rgba(0,80,158,0.2)]">
          <Sparkles className="w-3.5 h-3.5 text-[#FFC72C] animate-spin" />
          <span className="tracking-wide">ALATUS PHOTO • IA Dedicada para Cada Fotografia</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-primary)] font-heading leading-tight">
          Revelação digital inteligente com a precisão do <span className="bg-gradient-to-r from-[#1A6DC2] via-[#60A5FA] to-[#FFC72C] bg-clip-text text-transparent">Google Gemini</span>
        </h2>

        <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-2xl font-normal">
          Carregue suas fotos em lote. O ALATUS PHOTO avalia a iluminação, contraste, curvas e tons de pele de cada imagem de forma individual e não-destrutiva.
        </p>
      </div>

      {/* Mode Switcher & Quick Actions */}
      <div className="relative flex flex-wrap items-center justify-center gap-3">
        <div className="p-1 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center gap-1 shadow-inner">
          <button
            onClick={() => onUpdateSettings({ autoEditMode: true, analysisOnlyMode: false })}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              !settings.analysisOnlyMode
                ? 'bg-gradient-to-r from-[#00509E] to-[#1A6DC2] text-white shadow-[0_2px_12px_rgba(0,80,158,0.4)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FFC72C]" />
            <span>Modo IA AUTO (Análise + Edição)</span>
          </button>

          <button
            onClick={() => onUpdateSettings({ autoEditMode: false, analysisOnlyMode: true })}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              settings.analysisOnlyMode
                ? 'bg-gradient-to-r from-[#00509E] to-[#1A6DC2] text-white shadow-[0_2px_12px_rgba(0,80,158,0.4)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-[#1A6DC2]" />
            <span>Modo Somente Diagnóstico</span>
          </button>
        </div>

        <button
          onClick={onLoadSamples}
          className="px-4 py-2.5 rounded-2xl text-xs font-bold border border-[#FFC72C]/40 bg-[#FFC72C]/10 hover:bg-[#FFC72C]/20 text-[var(--text-primary)] transition-all flex items-center gap-2 shadow-sm hover:scale-[1.02] active:scale-95"
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
            ? 'border-[#FFC72C] bg-[#FFC72C]/10 scale-[1.01] shadow-[0_0_40px_rgba(255,199,44,0.25)]'
            : 'border-[var(--border-color)] bg-[var(--bg-surface)]/60 hover:border-[#1A6DC2] hover:bg-[var(--bg-surface)]/90 backdrop-blur-xl shadow-lg hover:shadow-[0_10px_35px_rgba(0,80,158,0.15)]'
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
          <div className="w-20 h-20 mx-auto rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-primary)] group-hover:scale-110 group-hover:border-[#1A6DC2] group-hover:shadow-[0_0_25px_rgba(0,80,158,0.35)] transition-all duration-300 shadow-xl">
            <UploadCloud className="w-10 h-10 text-[#00509E] group-hover:text-[#FFC72C] transition-colors duration-300" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-bold text-[var(--text-primary)] font-heading">
              Arraste suas fotos aqui
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-medium">
              ou clique para selecionar do computador
            </p>
          </div>

          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
            Suporte para dezenas de fotografias simultâneas. A IA processará cada imagem com fidelidade cromática.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-[var(--text-muted)]">
            <span className="px-3 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-secondary)]">JPG</span>
            <span className="px-3 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-secondary)]">JPEG</span>
            <span className="px-3 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-secondary)]">PNG</span>
            <span className="px-3 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-secondary)]">WEBP</span>
            <span className="px-3 py-1 rounded-lg bg-[var(--bg-elevated)]/40 border border-dashed border-[var(--border-color)] text-[var(--text-muted)]/60">
              RAW (Em breve)
            </span>
          </div>
        </div>
      </div>

      {/* Feature Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
        <div className="p-6 rounded-3xl glass-card space-y-3 transition-all duration-300 hover:border-[#1A6DC2]/40 hover:-translate-y-1">
          <div className="w-10 h-10 rounded-2xl bg-[#00509E]/20 border border-[#00509E]/30 flex items-center justify-center text-[#1A6DC2]">
            <Sparkles className="w-5 h-5 text-[#FFC72C]" />
          </div>
          <h4 className="text-sm font-bold text-[var(--text-primary)] font-heading">Análise Contextual Única</h4>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            A IA avalia sombras, subexposição, contraluz e temperatura individualmente para aplicar o tratamento ideal.
          </p>
        </div>

        <div className="p-6 rounded-3xl glass-card space-y-3 transition-all duration-300 hover:border-emerald-500/40 hover:-translate-y-1">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-[var(--text-primary)] font-heading">Preservação Fiel de Pele</h4>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Garantia de tons naturais: trava anti-saturação em rostos humanos, conservando texturas biológicas e brancos limpos.
          </p>
        </div>

        <div className="p-6 rounded-3xl glass-card space-y-3 transition-all duration-300 hover:border-[#FFC72C]/40 hover:-translate-y-1">
          <div className="w-10 h-10 rounded-2xl bg-[#FFC72C]/15 border border-[#FFC72C]/30 flex items-center justify-center text-[#FFC72C]">
            <Sliders className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-[var(--text-primary)] font-heading">Tratamento Não-Destrutivo</h4>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Originais preservados. Comparador Antes/Depois com zoom, ajuste fino manual e download individual ou pacote ZIP.
          </p>
        </div>
      </div>
    </div>
  )
}
