import React from 'react'

interface AlatusLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  showSubtitle?: boolean
  className?: string
}

export const AlatusLogo: React.FC<AlatusLogoProps> = ({
  size = 'md',
  showText = true,
  showSubtitle = true,
  className = ''
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20'
  }

  const titleSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-4xl'
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Precision Geometric Vector Logo: Winged Aperture Icon */}
      <div 
        className={`${iconSizes[size]} relative flex items-center justify-center shrink-0 rounded-2xl bg-gradient-to-br from-[#15181D] to-[#0B0D10] border border-[var(--border-color)] p-1.5 shadow-lg shadow-[#00509E]/25 group transition-transform duration-300 hover:scale-105`}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full filter drop-shadow-[0_2px_8px_rgba(0,80,158,0.5)]"
        >
          <defs>
            {/* Primary Blue Gradient */}
            <linearGradient id="alatusBlueGrad" x1="10%" y1="10%" x2="90%" y2="90%">
              <stop offset="0%" stopColor="#1A6DC2" />
              <stop offset="50%" stopColor="#00509E" />
              <stop offset="100%" stopColor="#003566" />
            </linearGradient>

            {/* Golden Amber Gradient */}
            <linearGradient id="alatusGoldGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E5B224" />
              <stop offset="60%" stopColor="#FFC72C" />
              <stop offset="100%" stopColor="#FFE082" />
            </linearGradient>

            {/* Core Glow */}
            <radialGradient id="alatusCoreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFC72C" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#00509E" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0B0D10" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background Ambient Glow Circle */}
          <circle cx="50" cy="50" r="42" fill="url(#alatusCoreGlow)" />

          {/* Left Soaring Wing Blade (Letter A left arm & aperture blade) */}
          <path
            d="M 50 14 C 40 28, 22 45, 14 66 C 24 64, 38 60, 48 48 Z"
            fill="url(#alatusBlueGrad)"
            opacity="0.95"
          />

          {/* Right Soaring Wing Blade (Letter A right arm & aperture blade) */}
          <path
            d="M 50 14 C 60 28, 78 45, 86 66 C 76 64, 62 60, 52 48 Z"
            fill="url(#alatusBlueGrad)"
            opacity="0.95"
          />

          {/* Sweeping Lower Left Wing Accent (Secondary feather/shutter) */}
          <path
            d="M 22 72 C 32 68, 42 62, 49 52 C 45 64, 38 78, 26 84 Z"
            fill="#00509E"
            opacity="0.8"
          />

          {/* Sweeping Lower Right Wing Accent */}
          <path
            d="M 78 72 C 68 68, 58 62, 51 52 C 55 64, 62 78, 74 84 Z"
            fill="#00509E"
            opacity="0.8"
          />

          {/* Golden Aperture Chevron / Arch (The horizontal crossbar of the 'A') */}
          <path
            d="M 33 60 Q 50 48 67 60 Q 50 54 33 60 Z"
            fill="url(#alatusGoldGrad)"
          />

          {/* Central AI Aperture Core / Star Sparkle */}
          <path
            d="M 50 36 L 53 46 L 63 50 L 53 54 L 50 64 L 47 54 L 37 50 L 47 46 Z"
            fill="url(#alatusGoldGrad)"
            filter="drop-shadow(0 0 4px #FFC72C)"
          />

          {/* Center Light Nucleus */}
          <circle cx="50" cy="50" r="3.2" fill="#FFFFFF" />
        </svg>
      </div>

      {/* Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight text-[var(--text-primary)] ${titleSizes[size]} font-['Outfit',sans-serif]`}>
              ALATUS
            </span>
            <span className={`font-black tracking-wider text-[#FFC72C] ${titleSizes[size]} font-['Outfit',sans-serif]`}>
              PHOTO
            </span>
            <span className="text-[9px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded bg-[#00509E]/20 text-[#1A6DC2] border border-[#00509E]/40 ml-1">
              AI
            </span>
          </div>

          {showSubtitle && (
            <span className="text-[11px] text-[var(--text-secondary)] font-medium -mt-0.5 tracking-tight">
              Sua edição. Foto por foto. Inteligência artificial.
            </span>
          )}
        </div>
      )}
    </div>
  )
}
