import React from 'react'
import { Settings, History, Sun, Moon, CheckCircle2, AlertCircle } from 'lucide-react'
import { AppSettings } from '../types/photo'
import { AlatusLogo } from './AlatusLogo'

interface HeaderProps {
  settings: AppSettings
  onOpenSettings: () => void
  onOpenHistory: () => void
  onToggleTheme: () => void
  historyCount: number
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onOpenSettings,
  onOpenHistory,
  onToggleTheme,
  historyCount
}) => {
  const isDark = settings.theme === 'dark'
  const hasKey = Boolean(settings.geminiApiKey?.trim())

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border-color)] bg-[var(--bg-app)]/80 backdrop-blur-xl px-5 sm:px-8 py-3.5 transition-all shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <AlatusLogo size="md" showText={true} showSubtitle={true} />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* API Status Pill with live glowing dot */}
          <button
            onClick={onOpenSettings}
            className={`hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
              hasKey
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
            }`}
            title={hasKey ? 'Chave Gemini conectada e ativa' : 'Clique para configurar sua chave Gemini'}
          >
            <span className={`w-2 h-2 rounded-full ${hasKey ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]' : 'bg-amber-400'}`} />
            <span>{hasKey ? 'IA Gemini Ativa' : 'Configurar API Key'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] transition-all hover:scale-105 active:scale-95 shadow-sm"
            title={isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
          >
            {isDark ? <Sun className="w-4 h-4 text-[#FFC72C] transition-transform duration-300 hover:rotate-45" /> : <Moon className="w-4 h-4 text-[#1A6DC2] transition-transform duration-300 hover:-rotate-12" />}
          </button>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="relative flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
            title="Histórico de lotes"
          >
            <History className="w-4 h-4 text-[#1A6DC2]" />
            <span className="hidden md:inline font-medium">Histórico</span>
            {historyCount > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-[#00509E] text-white text-[10px] flex items-center justify-center font-bold shadow-[0_0_8px_rgba(0,80,158,0.5)]">
                {historyCount}
              </span>
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--color-primary)] hover:text-white text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--color-primary-light)] transition-all shadow-sm group hover:scale-[1.02] active:scale-95"
          >
            <Settings className="w-4 h-4 text-[#FFC72C] group-hover:rotate-90 transition-transform duration-300" />
            <span className="hidden md:inline font-medium">Configurações</span>
          </button>
        </div>
      </div>
    </header>
  )
}
