import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  showTagline = true,
  className = '',
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  }[size];

  const textSize = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Leaf with Binary Hex Matrix Icon */}
      <div className={`relative ${iconDimensions} flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] p-1 overflow-hidden group`}>
        {/* Background Hex Pattern */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Hexagonal Background Matrix */}
          <polygon
            points="50,5 85,25 85,75 50,95 15,75 15,25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeOpacity="0.25"
            strokeDasharray="4 2"
          />
          <polygon
            points="50,18 76,33 76,67 50,82 24,67 24,33"
            stroke="currentColor"
            strokeWidth="1"
            strokeOpacity="0.2"
          />

          {/* Leaf Contour */}
          <path
            d="M 50 12 C 78 24, 88 56, 68 84 C 58 76, 52 68, 50 54 C 48 68, 42 76, 32 84 C 12 56, 22 24, 50 12 Z"
            fill="url(#leafGradient)"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Hex Impressions inside the Leaf */}
          {/* Hex 1 Top Right */}
          <polygon
            points="62,34 70,39 70,47 62,52 54,47 54,39"
            stroke="#10b981"
            strokeWidth="1"
            strokeOpacity="0.6"
            fill="none"
          />
          {/* Hex 2 Left */}
          <polygon
            points="38,42 46,47 46,55 38,60 30,55 30,47"
            stroke="#10b981"
            strokeWidth="1"
            strokeOpacity="0.6"
            fill="none"
          />

          {/* Central Stem Vein (Binary Stream Channel) */}
          <path
            d="M 50 16 L 50 86"
            stroke="#34d399"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Lateral Veins */}
          <path d="M 50 35 L 66 28" stroke="#34d399" strokeWidth="1.5" strokeOpacity="0.7" />
          <path d="M 50 48 L 32 42" stroke="#34d399" strokeWidth="1.5" strokeOpacity="0.7" />
          <path d="M 50 62 L 64 58" stroke="#34d399" strokeWidth="1.5" strokeOpacity="0.7" />

          {/* Binary Digits 0 and 1 Etched into the leaf */}
          <text x="44" y="28" fill="#a7f3d0" fontSize="7" fontFamily="monospace" fontWeight="bold">0</text>
          <text x="53" y="38" fill="#6ee7b7" fontSize="7" fontFamily="monospace" fontWeight="bold">1</text>
          <text x="43" y="47" fill="#34d399" fontSize="7" fontFamily="monospace" fontWeight="bold">1</text>
          <text x="53" y="58" fill="#10b981" fontSize="7" fontFamily="monospace" fontWeight="bold">0</text>
          <text x="43" y="68" fill="#059669" fontSize="7" fontFamily="monospace" fontWeight="bold">1</text>
          <text x="53" y="78" fill="#047857" fontSize="7" fontFamily="monospace" fontWeight="bold">0</text>

          <defs>
            <linearGradient id="leafGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#064e3b" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#065f46" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#022c22" stopOpacity="0.95" />
            </linearGradient>
          </defs>
        </svg>

        {/* Ambient subtle glow */}
        <div className="absolute inset-0 bg-emerald-500/10 rounded-xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-300" />
      </div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-wider text-white font-mono ${textSize}`}>
              SOKOS
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 tracking-wider">
              POS
            </span>
          </div>
          {showTagline && (
            <span className="text-[10px] text-emerald-400/80 font-mono tracking-tight">
              data-conscious · delta sync
            </span>
          )}
        </div>
      )}
    </div>
  );
};
