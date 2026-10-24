import React from 'react'

export interface AlatusLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  showSubtitle?: boolean
  className?: string
  variant?: 'auto' | 'dark' | 'light'
}

export const AlatusLogo: React.FC<AlatusLogoProps> = ({
  size = 'md',
  showText = true,
  showSubtitle = true,
  className = '',
  variant = 'auto'
}) => {
  // Height configurations for full logo (Aspect ratio ~ 4.37:1)
  const fullLogoHeights = {
    sm: 'h-6 sm:h-7',
    md: 'h-7 sm:h-9',
    lg: 'h-10 sm:h-12',
    xl: 'h-14 sm:h-20'
  }

  // Dimension configurations for emblem icon (1:1 square)
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20 sm:w-24 sm:h-24'
  }

  // Full Logo Layout (Emblem + Typography)
  if (showText) {
    return (
      <div className={`flex flex-col select-none transition-all duration-300 ${className}`}>
        <div className="flex items-center gap-2">
          {/* Dark Mode Version */}
          {(variant === 'auto' || variant === 'dark') && (
            <img
              src="/alatus-logo.png"
              alt="ALATUS PHOTO"
              className={`${fullLogoHeights[size]} w-auto object-contain ${
                variant === 'auto' ? 'alatus-logo-dark' : 'block'
              } transition-transform duration-300 hover:scale-[1.02] filter drop-shadow-[0_2px_12px_rgba(0,80,158,0.35)]`}
              loading="eager"
              decoding="async"
            />
          )}

          {/* Light Mode Version */}
          {(variant === 'auto' || variant === 'light') && (
            <img
              src="/alatus-logo-light.png"
              alt="ALATUS PHOTO"
              className={`${fullLogoHeights[size]} w-auto object-contain ${
                variant === 'auto' ? 'alatus-logo-light' : 'block'
              } transition-transform duration-300 hover:scale-[1.02] filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.06)]`}
              loading="eager"
              decoding="async"
            />
          )}

          {/* AI Badge */}
          <span className="hidden sm:inline-flex items-center text-[9px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded bg-[#00509E]/20 text-[#1A6DC2] border border-[#00509E]/40 ml-0.5 shadow-sm">
            AI
          </span>
        </div>

        {/* Responsive Brand Tagline / Subtitle */}
        {showSubtitle && (
          <span className="hidden sm:block text-[11px] text-[var(--text-secondary)] font-medium mt-0.5 tracking-tight font-sans">
            Sua edição. Foto por foto. Inteligência artificial.
          </span>
        )}
      </div>
    )
  }

  // Emblem Only Layout (Hero, Dashboard, Avatar)
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 group ${className}`}>
      {/* Dynamic ambient backdrop glow */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#00509E]/40 via-[#1A6DC2]/20 to-[#FFC72C]/20 blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Styled glass container with 3D emblem */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#182330]/90 to-[#101820]/95 border border-[var(--border-color)] p-2 shadow-2xl shadow-[#00509E]/30 transition-all duration-300 group-hover:scale-105 group-hover:border-[#00509E]/50 group-hover:shadow-[#00509E]/50`}
      >
        <img
          src="/alatus-icon.png"
          alt="ALATUS PHOTO"
          className="w-full h-full object-contain filter drop-shadow-[0_4px_16px_rgba(0,80,158,0.55)] transition-transform duration-300 group-hover:rotate-1"
          loading="eager"
          decoding="async"
        />
      </div>
    </div>
  )
}
