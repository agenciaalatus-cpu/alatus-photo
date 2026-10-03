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
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border-color)] bg-[var(--bg-app)]/90 backdrop-blur-md px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="cursor-pointer">
          <AlatusLogo size="md" showText={true} showSubtitle={true} />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* API Status Pill */}
          <button
            onClick={onOpenSettings}
            className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
              hasKey
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            }`}
            title={hasKey ? 'Chave Gemini conectada' : 'Clique para configurar sua chave Gemini'}
          >
            {hasKey ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Gemini Ativo</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Configurar API Key</span>
              </>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] transition-all"
            title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {isDark ? <Sun className="w-4 h-4 text-[#FFC72C]" /> : <Moon className="w-4 h-4 text-[#00509E]" />}
          </button>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="relative flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] transition-all"
            title="Histórico de lotes"
          >
            <History className="w-4 h-4" />
            <span className="hidden md:inline">Histórico</span>
            {historyCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#00509E] text-white text-[10px] flex items-center justify-center font-bold">
                {historyCount}
              </span>
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--color-gray-border)] text-[var(--text-primary)] border border-[var(--border-color)] transition-all shadow-sm"
          >
            <Settings className="w-4 h-4 text-[#FFC72C]" />
            <span className="hidden md:inline">Configurações</span>
          </button>
        </div>
      </div>
    </header>
  )
}
